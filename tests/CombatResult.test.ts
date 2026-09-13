import { describe, expect, it } from 'vitest';
import {
  type CombatState,
  createInitialPlayerSpellDeck,
  createInitialEnemySpellDeck,
  getCombatResult,
  applyCombatResultToRunState,
  resolveActiveSideAttack,
  endTurn,
} from '../src/game/combat/CombatState';
import { orchestrateAutomaticPhases } from '../src/game/combat/EnemyTurnAI';
import { createInitialRunState } from '../src/game/core/RunState';

describe('combat-result evaluation and orchestration tests', () => {
  function createCleanCombat(): CombatState {
    return {
      playerSquads: [],
      enemySquads: [],
      playerHeroHp: 100,
      enemyHeroHp: 100,
      activeSide: 'player',
      turn: 1,
      phase: 'RESOLUTION',
      playerMana: { current: 3, max: 3 },
      enemyMana: { current: 0, max: 3 },
      playerDeck: createInitialPlayerSpellDeck(),
      enemyDeck: createInitialEnemySpellDeck(),
      selectedPlayerAbilities: {},
      selectedEnemyAbilities: {},
      playerPlayedSpells: [],
      enemyPlayedSpells: [],
      playerHeroShield: 0,
      enemyHeroShield: 0,
    };
  }

  it('detects victory, defeat, or ongoing based on hero HP only', () => {
    const state = createCleanCombat();

    // Both heroes > 0
    expect(getCombatResult(state)).toBe('ONGOING');

    // Enemy hero <= 0
    state.enemyHeroHp = 0;
    expect(getCombatResult(state)).toBe('VICTORY');

    // Player hero <= 0
    state.enemyHeroHp = 10;
    state.playerHeroHp = 0;
    expect(getCombatResult(state)).toBe('DEFEAT');

    // Both <= 0: choose victory (deterministic fallback)
    state.playerHeroHp = 0;
    state.enemyHeroHp = 0;
    expect(getCombatResult(state)).toBe('VICTORY');
  });

  it('ignores squad presence / counts for combat victory/defeat results', () => {
    const state = createCleanCombat();
    state.playerHeroHp = 10;
    state.enemyHeroHp = 10;

    // No player squads and no enemy squads, but heroes are alive
    state.playerSquads = [];
    state.enemySquads = [];
    expect(getCombatResult(state)).toBe('ONGOING');
  });

  it('stops resolution immediately (short-circuits) when a spell kills the hero', () => {
    const state = createCleanCombat();
    state.enemyHeroHp = 5;

    // Firebolt deals 6 damage, killing the hero immediately
    state.playerPlayedSpells = ['firebolt'];

    // We have an archer ready to attack
    state.playerSquads = [
      {
        unitTypeId: 'archer',
        count: 1,
        damagedUnitHp: null,
        position: { column: 0, row: 3 },
      },
    ];
    state.enemySquads = [
      {
        unitTypeId: 'duskborn-brute',
        count: 1,
        damagedUnitHp: null,
        position: { column: 0, row: 1 },
      },
    ];

    expect(resolveActiveSideAttack(state)).toBe(true);

    // Phase becomes VICTORY
    expect(state.phase).toBe('VICTORY');

    // Brute is completely untouched because squad attacks were skipped!
    const brute = state.enemySquads[0];
    expect(brute.count).toBe(1);
    expect(brute.damagedUnitHp).toBeNull();
  });

  it('stops resolution immediately (short-circuits) during sequential squad attacks', () => {
    const state = createCleanCombat();
    state.enemyHeroHp = 3;

    // We have two attackers: Guardian (FRONT) and Archer (BACK)
    state.playerSquads = [
      {
        unitTypeId: 'guardian',
        count: 1,
        damagedUnitHp: null,
        position: { column: 1, row: 2 }, // FRONT, deals 4 damage to hero (col 1 is empty)
      },
      {
        unitTypeId: 'archer',
        count: 1,
        damagedUnitHp: null,
        position: { column: 2, row: 3 }, // BACK, deals 5 damage to hero (col 2 is empty)
      },
    ];
    // Enemy has a Brute in col 2 which we want to see remains untouched
    state.enemySquads = [
      {
        unitTypeId: 'duskborn-brute',
        count: 1,
        damagedUnitHp: null,
        position: { column: 2, row: 1 },
      },
    ];

    expect(resolveActiveSideAttack(state)).toBe(true);

    // Phase becomes VICTORY
    expect(state.phase).toBe('VICTORY');

    // Guardian dealt 4 damage to enemy hero, killing it.
    // Archer attack is completely skipped, meaning the Enemy Brute in column 2 is untouched!
    const brute = state.enemySquads[0];
    expect(brute.count).toBe(1);
    expect(brute.position).not.toBeNull();
  });

  it('rejects further combat turn transitions or actions once victory/defeat is reached', () => {
    const state = createCleanCombat();
    state.phase = 'VICTORY';

    // Verify turn transitions return false
    expect(endTurn(state)).toBe(false);

    // Verify other transitions/actions return false or do nothing
    expect(resolveActiveSideAttack(state)).toBe(false);
  });

  it('preserves surviving squads, partial HP, and generic army count to RunState on victory', () => {
    const state = createCleanCombat();
    const runState = createInitialRunState();

    state.playerSquads = [
      {
        unitTypeId: 'guardian',
        count: 5,
        damagedUnitHp: 7,
        position: { column: 1, row: 2 },
      },
      {
        unitTypeId: 'archer',
        count: 2,
        damagedUnitHp: null,
        position: { column: 2, row: 3 },
      },
    ];

    applyCombatResultToRunState(state, runState);

    // Expect runState phase goes back to exploration
    expect(runState.phase).toBe('exploration');

    // Expect generic army resource count is sum of survivors (5 + 2 = 7)
    expect(runState.resources.army).toBe(7);

    // Expect runState.playerSquads stores survivors cleanly with null positions
    expect(runState.playerSquads).toEqual([
      {
        unitTypeId: 'guardian',
        count: 5,
        damagedUnitHp: 7,
        position: null,
      },
      {
        unitTypeId: 'archer',
        count: 2,
        damagedUnitHp: null,
        position: null,
      },
    ]);
  });

  it('verifies automatic Duskborn turn orchestration loop', () => {
    const state = createCleanCombat();
    state.phase = 'TURN_END';
    state.activeSide = 'player';

    // Enemy has a brute with 1 unit
    state.enemySquads = [
      {
        unitTypeId: 'duskborn-brute',
        count: 1,
        damagedUnitHp: null,
        position: null, // starts undeployed
      },
    ];
    // Force enemy spell hand empty to avoid spell plays
    state.enemyDeck.hand = [];

    // Player ends turn -> should trigger entire enemy turn and return back to Player Deployment automatically!
    const transitioned = orchestrateAutomaticPhases(state);
    expect(transitioned).toBe(true);

    // Control is back to Player
    expect(state.activeSide).toBe('player');
    expect(state.phase).toBe('DEPLOYMENT');
    expect(state.turn).toBe(3);

    // Enemy should have deployed during their automatic turn
    const brute = state.enemySquads[0];
    expect(brute.position).not.toBeNull();
  });
});

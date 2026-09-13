import { describe, expect, it } from 'vitest';
import {
  type CombatState,
  createInitialPlayerSpellDeck,
  createInitialEnemySpellDeck,
  endTurn,
} from '../src/game/combat/CombatState';
import { runEnemyTurn } from '../src/game/combat/EnemyTurnAI';
import { ABILITY_REGISTRY } from '../src/game/content/abilities';

describe('EnemyTurnAI logical turn execution loop', () => {
  // Helper to create clean baseline player->enemy combat state in player TURN_END phase
  function createPlayerTurnEndCombat(): CombatState {
    return {
      playerSquads: [
        {
          unitTypeId: 'guardian',
          count: 5,
          damagedUnitHp: null,
          position: { column: 2, row: 2 }, // Occupies column 2 FRONT
        },
      ],
      enemySquads: [
        {
          unitTypeId: 'duskborn-brute',
          count: 4,
          damagedUnitHp: null,
          position: null, // starts undeployed
        },
        {
          unitTypeId: 'duskborn-archer',
          count: 2,
          damagedUnitHp: null,
          position: null, // starts undeployed
        },
      ],
      playerHeroHp: 100,
      enemyHeroHp: 100,
      activeSide: 'player',
      turn: 1,
      phase: 'TURN_END', // Player turn is concluding
      playerMana: { current: 1, max: 3 },
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

  it('verifies player -> enemy handoff (endTurn / beginTurn mechanics)', () => {
    const state = createPlayerTurnEndCombat();

    // Call endTurn() on player TURN_END
    const success = endTurn(state);
    expect(success).toBe(true);

    // Active side is now enemy, turn incremented, phase transitions to DEPLOYMENT (since beginTurn is called automatically in endTurn)
    expect(state.activeSide).toBe('enemy');
    expect(state.turn).toBe(2);
    expect(state.phase).toBe('DEPLOYMENT');

    // Enemy Mana restored to max (3), and enemy draws exactly 1 card
    expect(state.enemyMana.current).toBe(3);
    expect(state.enemyDeck.hand.length).toBe(1);
    expect(state.enemyDeck.drawPile.length).toBe(1);
  });

  it('repositions enemy squads following valid deployment and lane engagement rules', () => {
    const state = createPlayerTurnEndCombat();
    endTurn(state); // Go to enemy turn in DEPLOYMENT

    // Run Enemy AI turn
    // Player has a Guardian in column 2. Under the new coverage rules:
    // 1. Brute must cover column 2 (since no other enemy squad does).
    // 2. Once column 2 is covered, Archer is free to deploy anywhere (and chooses col 0 FRONT).
    const success = runEnemyTurn(state);
    expect(success).toBe(true);

    const brute = state.enemySquads.find((s) => s.unitTypeId === 'duskborn-brute')!;
    const archer = state.enemySquads.find((s) => s.unitTypeId === 'duskborn-archer')!;

    expect(brute.position).not.toBeNull();
    expect(brute.position!.column).toBe(2);
    expect(brute.position!.row).toBe(1); // Brute (index 0) gets column 2 FRONT

    expect(archer.position).not.toBeNull();
    expect(archer.position!.column).toBe(0);
    expect(archer.position!.row).toBe(1); // Archer gets column 0 FRONT (free column choice)
  });

  it('deploys to any legal column when no opponent squads are positioned', () => {
    const state = createPlayerTurnEndCombat();
    state.playerSquads = []; // No player squads
    endTurn(state);

    const success = runEnemyTurn(state);
    expect(success).toBe(true);

    // No lane engagement, so lowest legal columns are preferred (column 0, FRONT first, then column 1 FRONT because FRONT is preferred over BACK)
    const brute = state.enemySquads.find((s) => s.unitTypeId === 'duskborn-brute')!;
    const archer = state.enemySquads.find((s) => s.unitTypeId === 'duskborn-archer')!;

    expect(brute.position).toEqual({ column: 0, row: 1 }); // col 0 FRONT
    expect(archer.position).toEqual({ column: 1, row: 1 }); // col 1 FRONT (FRONT preferred over BACK)
  });

  it('selects valid squad abilities with Mana-aware fallback priority', () => {
    const state = createPlayerTurnEndCombat();
    state.playerSquads = []; // No lane engagement
    endTurn(state);

    // Simulate Duskborn Brute with a hypothetical expensive ability + basic ability
    // Currently Brute only has basic 0-Mana 'duskborn-brute-strike'
    // Let's verify that the AI successfully selects 'duskborn-brute-strike'
    const success = runEnemyTurn(state);
    expect(success).toBe(true);

    expect(state.selectedEnemyAbilities['duskborn-brute']).toBe('duskborn-brute-strike');
    expect(state.selectedEnemyAbilities['duskborn-archer']).toBe('duskborn-archer-shot');
  });

  it('plays affordable enemy spells from hand during ACTION and ignores unaffordable ones', () => {
    const state = createPlayerTurnEndCombat();
    state.playerSquads = [];
    endTurn(state);

    // Enemy starts with 3 Mana.
    // Force enemy hand to contain 'dusk-strike' (cost 2) and 'dark-ward' (cost 1).
    state.enemyDeck.hand = ['dusk-strike', 'dark-ward'];

    // Stage 1: Abilities. Brute strike (cost 0), Dusk Shot (cost 0). Remaining Mana = 3.
    // Stage 2: Spells.
    // Hand order is dusk-strike, dark-ward.
    // Plays dusk-strike (cost 2) -> Mana = 1.
    // Plays dark-ward (cost 1) -> Mana = 0.
    // Both spells should be played.
    const success = runEnemyTurn(state);
    expect(success).toBe(true);

    expect(state.enemyMana.current).toBe(0);
    expect(state.enemyDeck.hand).toEqual([]); // both played
    expect(state.enemyDeck.discardPile).toContain('dusk-strike');
    expect(state.enemyDeck.discardPile).toContain('dark-ward');
    expect(state.enemyPlayedSpells).toEqual(['dusk-strike', 'dark-ward']);
  });

  it('skips unaffordable spells while playing other affordable spells later in the hand', () => {
    const state = createPlayerTurnEndCombat();
    state.playerSquads = [];
    endTurn(state);

    // Enemy starts with 3 Mana.
    // Give enemy 1 Mana.
    state.enemyMana.current = 1;

    // Force hand: dusk-strike (cost 2) then dark-ward (cost 1)
    state.enemyDeck.hand = ['dusk-strike', 'dark-ward'];

    // 1 Mana is too low for dusk-strike (cost 2), so it should be skipped.
    // But dark-ward (cost 1) is affordable and should be played!
    const success = runEnemyTurn(state);
    expect(success).toBe(true);

    expect(state.enemyMana.current).toBe(0); // dark-ward played
    expect(state.enemyDeck.hand).toEqual(['dusk-strike']); // dusk-strike remains in hand
    expect(state.enemyDeck.discardPile).toEqual(['dark-ward']);
    expect(state.enemyPlayedSpells).toEqual(['dark-ward']);
  });

  it('prioritizes squad abilities over spells in shared Mana spending pool', () => {
    const state = createPlayerTurnEndCombat();
    state.playerSquads = [];
    endTurn(state);

    // Let's modify the Brute's abilities temporarily to cost 3 Mana in ABILITY_REGISTRY
    const strikeDef = ABILITY_REGISTRY.get('duskborn-brute-strike')!;
    const originalCost = strikeDef.manaCost;

    try {
      strikeDef.manaCost = 3; // make brute strike cost 3 Mana
      state.enemyMana.current = 3;
      state.enemyDeck.hand = ['dark-ward']; // costs 1 Mana

      // AI should select Brute Strike first (spending all 3 Mana), leaving 0 Mana.
      // Then it will skip the spell dark-ward (requires 1) because Mana is 0.
      const success = runEnemyTurn(state);
      expect(success).toBe(true);

      expect(state.enemyMana.current).toBe(0); // Brute Strike took all 3 Mana
      expect(state.enemyDeck.hand).toEqual(['dark-ward']); // skipped
    } finally {
      // Restore cost
      strikeDef.manaCost = originalCost;
    }
  });

  it('runs the full turn cycle and hands back to player cleanly', () => {
    const state = createPlayerTurnEndCombat();

    // 1. Player turn ends -> hand off to Enemy
    expect(endTurn(state)).toBe(true);
    expect(state.activeSide).toBe('enemy');
    expect(state.phase).toBe('DEPLOYMENT');

    // 2. Run Enemy turn AI
    expect(runEnemyTurn(state)).toBe(true);
    expect(state.phase).toBe('TURN_END');

    // 3. Enemy turn ends -> hand off back to Player
    expect(endTurn(state)).toBe(true);

    // 4. Verify player starts turn cleanly
    expect(state.activeSide).toBe('player');
    expect(state.phase).toBe('DEPLOYMENT');
    expect(state.playerMana.current).toBe(state.playerMana.max); // Refreshed
    expect(state.playerDeck.hand.length).toBe(1); // Drawn exactly one
  });

  it('guarantees identical deterministic execution across equivalent states', () => {
    const stateA = createPlayerTurnEndCombat();
    endTurn(stateA);
    stateA.enemyDeck.hand = ['dusk-strike', 'dark-ward'];

    const stateB = createPlayerTurnEndCombat();
    endTurn(stateB);
    stateB.enemyDeck.hand = ['dusk-strike', 'dark-ward'];

    // Run Enemy AI turn on State A
    expect(runEnemyTurn(stateA)).toBe(true);

    // Run Enemy AI turn on State B
    expect(runEnemyTurn(stateB)).toBe(true);

    // Assert absolute identical state across both runs
    expect(stateA.enemySquads).toEqual(stateB.enemySquads);
    expect(stateA.selectedEnemyAbilities).toEqual(stateB.selectedEnemyAbilities);
    expect(stateA.enemyPlayedSpells).toEqual(stateB.enemyPlayedSpells);
    expect(stateA.enemyMana).toEqual(stateB.enemyMana);
    expect(stateA.playerHeroHp).toEqual(stateB.playerHeroHp);
    expect(stateA.playerHeroShield).toEqual(stateB.playerHeroShield);
    expect(stateA.phase).toEqual(stateB.phase);
  });
});

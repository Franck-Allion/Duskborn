import { describe, expect, it } from 'vitest';
import {
  type CombatState,
  createInitialPlayerSpellDeck,
  createInitialEnemySpellDeck,
  applyCombatVictoryToRunState,
  getXpRequiredForLevel,
  calculateLevelFromXp,
} from '../src/game/combat/CombatState';
import { createInitialRunState } from '../src/game/core/RunState';

describe('0.6.17 Unit-Type Progression Foundation', () => {
  function createCleanCombat(): CombatState {
    return {
      playerSquads: [],
      enemySquads: [],
      playerHeroHp: 100,
      enemyHeroHp: 100,
      activeSide: 'player',
      turn: 1,
      phase: 'VICTORY',
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
      participatingPlayerUnitTypeIds: ['guardian', 'archer'],
    };
  }

  it('verifies initial progression on a fresh RunState', () => {
    const runState = createInitialRunState();

    expect(runState.unitTypeProgression).toBeDefined();
    expect(runState.unitTypeProgression['guardian']).toEqual({
      unitTypeId: 'guardian',
      level: 1,
      xp: 0,
      unlockedAbilities: [],
    });
    expect(runState.unitTypeProgression['archer']).toEqual({
      unitTypeId: 'archer',
      level: 1,
      xp: 0,
      unlockedAbilities: [],
    });
  });

  it('awards fixed XP on victory only to participating player unit types', () => {
    const state = createCleanCombat();
    state.playerSquads = [
      { unitTypeId: 'guardian', count: 5, damagedUnitHp: null, position: null },
      { unitTypeId: 'archer', count: 3, damagedUnitHp: null, position: null },
    ];
    state.participatingPlayerUnitTypeIds = ['guardian']; // only guardian participated!

    const runState = createInitialRunState();

    const success = applyCombatVictoryToRunState(state, runState);
    expect(success).toBe(true);

    // Guardian should have received 50 XP
    expect(runState.unitTypeProgression['guardian'].xp).toBe(50);
    expect(runState.unitTypeProgression['guardian'].level).toBe(1);

    // Archer should be untouched
    expect(runState.unitTypeProgression['archer'].xp).toBe(0);
    expect(runState.unitTypeProgression['archer'].level).toBe(1);
  });

  it('awards XP to a participating type whose squad reaches count 0 during victory', () => {
    const state = createCleanCombat();
    state.playerSquads = [
      { unitTypeId: 'guardian', count: 0, damagedUnitHp: null, position: null }, // died in battle
    ];
    state.participatingPlayerUnitTypeIds = ['guardian']; // but participated at start!

    const runState = createInitialRunState();

    const success = applyCombatVictoryToRunState(state, runState);
    expect(success).toBe(true);

    // Guardian still receives XP
    expect(runState.unitTypeProgression['guardian'].xp).toBe(50);
  });

  it('guards against double finalization XP award (idempotency)', () => {
    const state = createCleanCombat();
    state.playerSquads = [
      { unitTypeId: 'guardian', count: 5, damagedUnitHp: null, position: null },
    ];
    state.participatingPlayerUnitTypeIds = ['guardian'];

    const runState = createInitialRunState();

    // First finalization
    expect(applyCombatVictoryToRunState(state, runState)).toBe(true);
    expect(runState.unitTypeProgression['guardian'].xp).toBe(50);

    // Second finalization should be rejected
    expect(applyCombatVictoryToRunState(state, runState)).toBe(false);
    expect(runState.unitTypeProgression['guardian'].xp).toBe(50); // remains 50
  });

  it('respects level thresholds and calculates level from cumulative XP correctly', () => {
    // Thresholds: Level 2 at 100 cumulative XP, Level 3 at 250 cumulative XP, Level 4 at 450 cumulative XP
    expect(getXpRequiredForLevel(1)).toBe(0);
    expect(getXpRequiredForLevel(2)).toBe(100);
    expect(getXpRequiredForLevel(3)).toBe(250);
    expect(getXpRequiredForLevel(4)).toBe(450);

    // calculate level
    expect(calculateLevelFromXp(50)).toBe(1);
    expect(calculateLevelFromXp(100)).toBe(2);
    expect(calculateLevelFromXp(249)).toBe(2);
    expect(calculateLevelFromXp(250)).toBe(3);
    expect(calculateLevelFromXp(449)).toBe(3);
    expect(calculateLevelFromXp(450)).toBe(4);
  });

  it('handles multiple level thresholds in a single XP award correctly', () => {
    // If a unit is level 1 (0 XP) and receives 300 XP (enough for Level 3 which is 250 cumulative XP)
    expect(calculateLevelFromXp(300)).toBe(3);
  });

  it('prevents XP awards on defeat and keeps defeat terminal', () => {
    const state = createCleanCombat();
    state.phase = 'DEFEAT';
    state.playerSquads = [
      { unitTypeId: 'guardian', count: 5, damagedUnitHp: null, position: null },
    ];
    state.participatingPlayerUnitTypeIds = ['guardian'];

    const runState = createInitialRunState();

    // Defeat finalization should be rejected by applyCombatVictoryToRunState
    expect(applyCombatVictoryToRunState(state, runState)).toBe(false);

    // No XP awarded
    expect(runState.unitTypeProgression['guardian'].xp).toBe(0);
  });

  it('is completely deterministic and identical inputs produce identical state', () => {
    const stateA = createCleanCombat();
    stateA.playerSquads = [
      { unitTypeId: 'guardian', count: 5, damagedUnitHp: null, position: null },
    ];
    stateA.participatingPlayerUnitTypeIds = ['guardian'];
    const runStateA = createInitialRunState();
    applyCombatVictoryToRunState(stateA, runStateA);

    const stateB = createCleanCombat();
    stateB.playerSquads = [
      { unitTypeId: 'guardian', count: 5, damagedUnitHp: null, position: null },
    ];
    stateB.participatingPlayerUnitTypeIds = ['guardian'];
    const runStateB = createInitialRunState();
    applyCombatVictoryToRunState(stateB, runStateB);

    expect(runStateA.unitTypeProgression).toEqual(runStateB.unitTypeProgression);
  });
});

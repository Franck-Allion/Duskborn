import { describe, expect, it } from 'vitest';
import {
  canSwapSquads,
  swapSquads,
  repositionSquad,
  confirmDeployment,
  type CombatState,
  createInitialPlayerSpellDeck,
  createInitialEnemySpellDeck,
} from '../src/game/combat/CombatState';

function createSwapCombatState(): CombatState {
  return {
    playerSquads: [
      { unitTypeId: 'guardian', count: 8, damagedUnitHp: 4, position: { column: 2, row: 2 } }, // col 2 FRONT
      { unitTypeId: 'archer', count: 6, damagedUnitHp: null, position: { column: 5, row: 3 } }, // col 5 BACK
      { unitTypeId: 'scout', count: 0, damagedUnitHp: null, position: { column: 3, row: 2 } },  // Dead squad
      { unitTypeId: 'mage', count: 0, damagedUnitHp: null, position: null },                    // Count 0 to keep initial board valid
    ],
    enemySquads: [
      { unitTypeId: 'duskborn-brute', count: 4, damagedUnitHp: 5, position: { column: 2, row: 1 } },
      { unitTypeId: 'duskborn-archer', count: 4, damagedUnitHp: null, position: { column: 5, row: 0 } },
    ],
    playerHeroHp: 100,
    enemyHeroHp: 100,
    activeSide: 'player',
    turn: 1,
    phase: 'DEPLOYMENT',
    playerMana: { current: 3, max: 3 },
    enemyMana: { current: 3, max: 3 },
    playerDeck: createInitialPlayerSpellDeck(),
    enemyDeck: createInitialEnemySpellDeck(),
    selectedPlayerAbilities: {},
    selectedEnemyAbilities: {},
  };
}

describe('Combat Squad Swapping', () => {
  it.each(['player', 'enemy'] as const)('allows %s reserve replacement but keeps final confirmation strict', (side) => {
    const state = createSwapCombatState();
    state.activeSide = side;
    const squads = side === 'player' ? state.playerSquads : state.enemySquads;
    const [first, second] = squads;
    first.position = null;
    const destination = structuredClone(second.position);
    expect(canSwapSquads(state, side, first.unitTypeId, second.unitTypeId)).toBe(true);
    expect(swapSquads(state, side, first.unitTypeId, second.unitTypeId)).toBe(true);
    expect(first.position).toEqual(destination);
    expect(second.position).toBeNull();
    expect(confirmDeployment(state)).toBe(false);
    expect(repositionSquad(state, side, second.unitTypeId, { column: 2, row: side === 'player' ? 2 : 1 })).toBe(true);
    expect(confirmDeployment(state)).toBe(true);
  });

  it('validates fully deployed enemy coverage even if a player squad is unpositioned', () => {
    const state = createSwapCombatState();
    state.activeSide = 'enemy';
    state.playerSquads[1].position = null;
    state.enemySquads[0].position = { column: 4, row: 1 };
    const before = structuredClone(state);
    expect(canSwapSquads(state, 'enemy', 'duskborn-brute', 'duskborn-archer')).toBe(false);
    expect(swapSquads(state, 'enemy', 'duskborn-brute', 'duskborn-archer')).toBe(false);
    expect(state).toEqual(before);
  });

  it('Basic swap: exchanges positions correctly', () => {
    const state = createSwapCombatState();
    expect(canSwapSquads(state, 'player', 'guardian', 'archer')).toBe(true);

    const success = swapSquads(state, 'player', 'guardian', 'archer');
    expect(success).toBe(true);

    const guardian = state.playerSquads.find((s) => s.unitTypeId === 'guardian')!;
    const archer = state.playerSquads.find((s) => s.unitTypeId === 'archer')!;

    expect(guardian.position).toEqual({ column: 5, row: 3 });
    expect(archer.position).toEqual({ column: 2, row: 2 });
  });

  it('Same-lane depth swap: exchanges positions correctly', () => {
    const state = createSwapCombatState();
    // Only occupy column 2 for the opponent, so required coverage is 1 (column 2)
    state.enemySquads = [
      { unitTypeId: 'duskborn-brute', count: 4, damagedUnitHp: null, position: { column: 2, row: 1 } },
    ];
    // Move archer to col 2 BACK (row 3) to start
    const archer = state.playerSquads.find((s) => s.unitTypeId === 'archer')!;
    archer.position = { column: 2, row: 3 };

    expect(canSwapSquads(state, 'player', 'guardian', 'archer')).toBe(true);

    const success = swapSquads(state, 'player', 'guardian', 'archer');
    expect(success).toBe(true);

    const guardian = state.playerSquads.find((s) => s.unitTypeId === 'guardian')!;
    expect(guardian.position).toEqual({ column: 2, row: 3 });
    expect(archer.position).toEqual({ column: 2, row: 2 });
  });

  it('Coverage preserved: allows swap if lanes remain covered', () => {
    const state = createSwapCombatState();
    // Surviving player squads: guardian and archer (2 total).
    // Opponent occupied lanes: 2 and 5 (2 total).
    // Both are currently covered (guardian covers 2, archer covers 5).
    // Swap swaps guardian (col 2) and archer (col 5).
    // After swap, archer covers col 2, guardian covers col 5.
    // Total covered lanes remains 2. This is valid.
    expect(canSwapSquads(state, 'player', 'guardian', 'archer')).toBe(true);
    expect(swapSquads(state, 'player', 'guardian', 'archer')).toBe(true);
  });

  it('Same squad: rejected', () => {
    const state = createSwapCombatState();
    expect(canSwapSquads(state, 'player', 'guardian', 'guardian')).toBe(false);
    expect(swapSquads(state, 'player', 'guardian', 'guardian')).toBe(false);
  });

  it('Dead squad: rejected', () => {
    const state = createSwapCombatState();
    // 'scout' is dead (count = 0)
    expect(canSwapSquads(state, 'player', 'guardian', 'scout')).toBe(false);
    expect(swapSquads(state, 'player', 'guardian', 'scout')).toBe(false);
  });

  it('Null-position squad: rejected', () => {
    const state = createSwapCombatState();
    // 'mage' has position null
    expect(canSwapSquads(state, 'player', 'guardian', 'mage')).toBe(false);
    expect(swapSquads(state, 'player', 'guardian', 'mage')).toBe(false);
  });

  it('Wrong phase: rejected', () => {
    const state = createSwapCombatState();
    state.phase = 'ACTION';
    expect(canSwapSquads(state, 'player', 'guardian', 'archer')).toBe(false);
    expect(swapSquads(state, 'player', 'guardian', 'archer')).toBe(false);
  });

  it('Wrong side: rejected', () => {
    const state = createSwapCombatState();
    // Player cannot swap enemy squads
    expect(canSwapSquads(state, 'player', 'duskborn-brute', 'duskborn-archer')).toBe(false);
    expect(swapSquads(state, 'player', 'duskborn-brute', 'duskborn-archer')).toBe(false);

    // Active side is player, so enemy cannot swap squads either
    expect(canSwapSquads(state, 'enemy', 'duskborn-brute', 'duskborn-archer')).toBe(false);
    expect(swapSquads(state, 'enemy', 'duskborn-brute', 'duskborn-archer')).toBe(false);
  });

  it('Atomic failure: if validation fails, positions remain completely unchanged', () => {
    const state = createSwapCombatState();
    
    // Let's create an invalid swap situation by adding an extra opponent column
    // so that swapping causes lane coverage to drop below required count.
    // Wait, let's just make isSideDeploymentValid fail. For example, if we modify the
    // temporary swap such that one position is outside the player deployment zone,
    // but canSwapSquads checks positions beforehand anyway.
    // What if the final board violates lane coverage?
    // Let's set up a scenario:
    // Enemy in cols 1, 2, 5 (3 lanes).
    // Friendly surviving squads: 3 squads (guardian, archer, mage - we give mage a position).
    // Friendly positions: guardian on col 1, archer on col 2, mage on col 5. All lanes covered!
    // If we swap guardian (col 1) and archer (col 2), then the columns covered are still 1, 2, 5. Valid.
    // But if we swap guardian (col 1) with archer (on col 2) when we actually had guardian on col 1, archer on col 2,
    // and mage is dead/unpositioned. Then there are 2 covered columns (1 and 2), opponent has 1, 2, 5.
    // Wait, what if we have:
    // Enemy in col 1, col 2. (2 lanes)
    // Friendlies: Guardian on col 1, Archer on col 2.
    // If we swap them: Guardian col 2, Archer col 1. Both lanes covered. Valid!
    // Wait, let's make a state where swapping is invalid due to lane coverage:
    // Actually, lane coverage requires covering as many distinct opponent columns as possible.
    // Since both squads have non-null positions and we only swap their positions,
    // the set of columns occupied by our friendly squads is EXACTLY the same before and after the swap,
    // UNLESS the two squads were in different columns, in which case the set of occupied columns is still the same!
    // Wait! Is there any scenario where swapping two squads' positions changes the set of occupied columns?
    // No, because A and B just exchange columns. The set of occupied columns {colA, colB} becomes {colB, colA}, which is identical!
    // So the total covered columns will ALWAYS be identical after a swap!
    // Wait, is there any other rule?
    // What if one of the squads is swapped to an invalid deployment zone?
    // But the starting positions of both squads are already in the valid player deployment zone.
    // Since they exchange positions, the final positions are also both in the valid player deployment zone.
    // Wait, let's think: what is a scenario where a swap fails validation?
    // Let's look at `isSideDeploymentValid`. If we start in an invalid state, can we swap?
    // "The prospective swapped board must still satisfy all current deployment invariants."
    // If the original board is ALREADY invalid (e.g. some lane coverage is missing, or we started invalid),
    // then the final board will also be invalid, so `canSwapSquads` should return false!
    // Let's test this!
    // Suppose opponent occupies cols 1 and 2.
    // Friendlies are: Guardian in col 4, Archer in col 5. (Lanes 1 and 2 are uncovered).
    // The required coverage is min(2, 2) = 2. But we cover 0 lanes.
    // Thus `isSideDeploymentValid` is false for the starting board.
    // If we try to swap Guardian (col 4) and Archer (col 5), the swapped board also covers 0 lanes and is invalid.
    // So `canSwapSquads` should return false!
    // Let's verify this atomic rejection and ensure positions remain unchanged.
    
    state.enemySquads.push({
      unitTypeId: 'duskborn-scout',
      count: 2,
      damagedUnitHp: null,
      position: { column: 1, row: 1 }
    });
    // Now enemy occupies cols: 1, 2, 5. (Required coverage = min(2, 3) = 2).
    // Friendlies occupy cols: 2 and 5. Covered opponent cols: 2 and 5. Total = 2.
    // So the current deployment IS valid!
    // Let's move archer to column 4 (which is not an enemy column).
    // Friendlies occupy: 2 and 4. Covered opponent cols: 2. Total = 1.
    // But required coverage is min(2, 3) = 2. Since 1 < 2, the board is INVALID!
    const archer = state.playerSquads.find((s) => s.unitTypeId === 'archer')!;
    archer.position = { column: 4, row: 3 };
    
    // Now, if we try to swap guardian (col 2, row 2) and archer (col 4, row 3),
    // the prospective swapped board will still only cover 1 opponent column (col 2), which is invalid.
    // So the swap must fail and leave the state completely unchanged.
    const originalGuardianPos = { ...state.playerSquads[0].position! };
    const originalArcherPos = { ...archer.position! };
    
    expect(canSwapSquads(state, 'player', 'guardian', 'archer')).toBe(false);
    expect(swapSquads(state, 'player', 'guardian', 'archer')).toBe(false);
    
    expect(state.playerSquads[0].position).toEqual(originalGuardianPos);
    expect(archer.position).toEqual(originalArcherPos);
  });

  it('No other state mutation: preserves count, damagedUnitHp, Mana, and selected abilities', () => {
    const state = createSwapCombatState();
    state.selectedPlayerAbilities['guardian'] = 'guardian-strike';
    
    const beforeClone = structuredClone(state);
    
    const success = swapSquads(state, 'player', 'guardian', 'archer');
    expect(success).toBe(true);
    
    const guardian = state.playerSquads.find((s) => s.unitTypeId === 'guardian')!;
    const archer = state.playerSquads.find((s) => s.unitTypeId === 'archer')!;
    
    // Positions must be swapped
    expect(guardian.position).toEqual(beforeClone.playerSquads[1].position);
    expect(archer.position).toEqual(beforeClone.playerSquads[0].position);
    
    // Other values must be preserved exactly
    expect(guardian.count).toBe(beforeClone.playerSquads[0].count);
    expect(guardian.damagedUnitHp).toBe(beforeClone.playerSquads[0].damagedUnitHp);
    
    expect(archer.count).toBe(beforeClone.playerSquads[1].count);
    expect(archer.damagedUnitHp).toBe(beforeClone.playerSquads[1].damagedUnitHp);
    
    expect(state.playerMana).toEqual(beforeClone.playerMana);
    expect(state.selectedPlayerAbilities).toEqual(beforeClone.selectedPlayerAbilities);
    expect(state.playerDeck).toEqual(beforeClone.playerDeck);
  });
});

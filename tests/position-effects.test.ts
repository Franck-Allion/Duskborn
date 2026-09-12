import { describe, expect, it } from 'vitest';
import {
  evaluateAbilityPositionEffect,
} from '../src/game/combat/CombatGrid';
import {
  repositionSquad,
  type CombatState,
  createInitialPlayerSpellDeck,
  createInitialEnemySpellDeck,
} from '../src/game/combat/CombatState';
import type { CombatPosition } from '../src/game/combat/CombatPosition';

describe('position-based ability effects evaluation', () => {
  it('correctly evaluates FRONT depth-based effects (Guardian Shield Wall)', () => {
    // FRONT-based Shield Wall on player side
    const frontPos: CombatPosition = { column: 2, row: 2 }; // Player FRONT
    const backPos: CombatPosition = { column: 2, row: 3 }; // Player BACK

    // FRONT is active
    const activeResult = evaluateAbilityPositionEffect('guardian-shield-wall', 'player', frontPos);
    expect(activeResult).toEqual({
      active: true,
      modifierType: 'defense',
      modifierValue: 2,
    });

    // BACK is inactive
    const inactiveResult = evaluateAbilityPositionEffect('guardian-shield-wall', 'player', backPos);
    expect(inactiveResult).toEqual({ active: false });

    // Symmetrical enemy side FRONT evaluation
    const enemyFrontPos: CombatPosition = { column: 2, row: 1 }; // Enemy FRONT
    const enemyBackPos: CombatPosition = { column: 2, row: 0 }; // Enemy BACK

    const enemyActiveResult = evaluateAbilityPositionEffect('guardian-shield-wall', 'enemy', enemyFrontPos);
    expect(enemyActiveResult).toEqual({
      active: true,
      modifierType: 'defense',
      modifierValue: 2,
    });

    const enemyInactiveResult = evaluateAbilityPositionEffect('guardian-shield-wall', 'enemy', enemyBackPos);
    expect(enemyInactiveResult).toEqual({ active: false });
  });

  it('correctly evaluates BACK depth-based effects (Archer Shot)', () => {
    // BACK-based Shot on player side
    const frontPos: CombatPosition = { column: 2, row: 2 }; // Player FRONT
    const backPos: CombatPosition = { column: 2, row: 3 }; // Player BACK

    // BACK is active
    const activeResult = evaluateAbilityPositionEffect('archer-shot', 'player', backPos);
    expect(activeResult).toEqual({
      active: true,
      modifierType: 'damage',
      modifierValue: 1,
    });

    // FRONT is inactive
    const inactiveResult = evaluateAbilityPositionEffect('archer-shot', 'player', frontPos);
    expect(inactiveResult).toEqual({ active: false });
  });

  it('correctly evaluates EDGE or CENTER horizontal-based effects (Archer Power Shot)', () => {
    // EDGE-based Power Shot
    const edgePos1: CombatPosition = { column: 0, row: 3 }; // Left edge
    const edgePos2: CombatPosition = { column: 5, row: 3 }; // Right edge
    const centerPos: CombatPosition = { column: 2, row: 3 }; // Center column

    // Left EDGE is active
    expect(evaluateAbilityPositionEffect('archer-power-shot', 'player', edgePos1)).toEqual({
      active: true,
      modifierType: 'damage',
      modifierValue: 2,
    });

    // Right EDGE is active
    expect(evaluateAbilityPositionEffect('archer-power-shot', 'player', edgePos2)).toEqual({
      active: true,
      modifierType: 'damage',
      modifierValue: 2,
    });

    // CENTER is inactive
    expect(evaluateAbilityPositionEffect('archer-power-shot', 'player', centerPos)).toEqual({
      active: false,
    });
  });

  it('returns active = false if position is null (unpositioned squad)', () => {
    expect(evaluateAbilityPositionEffect('guardian-shield-wall', 'player', null)).toEqual({
      active: false,
    });
  });

  it('re-evaluates position effects dynamically after legal squad repositioning without stale cached state', () => {
    // Initial CombatState in DEPLOYMENT phase with Guardian at (2, 2) (FRONT)
    const state: CombatState = {
      playerSquads: [
        {
          unitTypeId: 'guardian',
          count: 8,
          damagedUnitHp: null,
          position: { column: 2, row: 2 }, // FRONT
        },
      ],
      enemySquads: [],
      playerHeroHp: 100,
      enemyHeroHp: 100,
      activeSide: 'player',
      turn: 1,
      phase: 'DEPLOYMENT',
      playerMana: { current: 3, max: 3 },
      enemyMana: { current: 0, max: 3 },
      playerDeck: createInitialPlayerSpellDeck(),
      enemyDeck: createInitialEnemySpellDeck(),
      selectedPlayerAbilities: {},
      selectedEnemyAbilities: {},
    };

    const guardian = state.playerSquads[0];

    // 1. Initial Evaluation (FRONT) -> active
    let evalResult = evaluateAbilityPositionEffect('guardian-shield-wall', 'player', guardian.position);
    expect(evalResult.active).toBe(true);

    // 2. Reposition Guardian legally to (2, 3) (BACK)
    const success = repositionSquad(state, 'player', 'guardian', { column: 2, row: 3 });
    expect(success).toBe(true);
    expect(guardian.position).toEqual({ column: 2, row: 3 });

    // 3. Dynamic Re-evaluation (now BACK) -> inactive (not FRONT anymore!)
    evalResult = evaluateAbilityPositionEffect('guardian-shield-wall', 'player', guardian.position);
    expect(evalResult.active).toBe(false);

    // 4. Reposition back to FRONT (2, 2)
    const successBack = repositionSquad(state, 'player', 'guardian', { column: 2, row: 2 });
    expect(successBack).toBe(true);

    // 5. Dynamic Re-evaluation -> active again! No cached state remains.
    evalResult = evaluateAbilityPositionEffect('guardian-shield-wall', 'player', guardian.position);
    expect(evalResult.active).toBe(true);
  });
});

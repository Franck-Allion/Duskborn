import {
  isPlayerDeploymentPosition,
  isEnemyDeploymentPosition,
  type CombatSide,
} from './CombatGrid';
import type { Squad } from './Squad';

export type CombatPhase =
  | 'TURN_START'
  | 'DEPLOYMENT'
  | 'ACTION'
  | 'RESOLUTION'
  | 'TURN_END'
  | 'VICTORY'
  | 'DEFEAT';

/** Mutable aggregate representing the current logical state of one combat. */
export interface CombatState {
  playerSquads: Squad[];
  enemySquads: Squad[];
  playerHeroHp: number;
  enemyHeroHp: number;
  deploymentConfirmed: boolean;
  activeSide: CombatSide;
  turn: number;
  phase: CombatPhase;
}

/**
 * Checks if a collection of squads contains any duplicate unit types.
 */
export function hasDuplicateUnitTypes(squads: readonly Squad[]): boolean {
  const seen = new Set<string>();
  for (const squad of squads) {
    if (seen.has(squad.unitTypeId)) {
      return true;
    }
    seen.add(squad.unitTypeId);
  }
  return false;
}

/**
 * Validates that a CombatState conforms to core invariants,
 * including that each side contains only one squad per unit type.
 */
export function isValidCombatState(state: CombatState): boolean {
  return (
    !hasDuplicateUnitTypes(state.playerSquads) &&
    !hasDuplicateUnitTypes(state.enemySquads)
  );
}

/**
 * Checks if the combat deployment state is currently valid.
 * Validation conditions:
 * 1. Each player squad with count > 0 must have a valid position in the player deployment zone.
 * 2. Each enemy squad with count > 0 must have a valid position in the enemy deployment zone.
 * 3. No two active squads (player or enemy) may occupy the same logical cell.
 * 4. Faction uniqueness invariants must hold.
 */
export function isDeploymentValid(state: CombatState): boolean {
  const activePlayerSquads = state.playerSquads.filter((s) => s.count > 0);
  const activeEnemySquads = state.enemySquads.filter((s) => s.count > 0);

  // 1. Verify player squads are positioned in the player deployment zone
  for (const squad of activePlayerSquads) {
    if (
      squad.position === null ||
      !isPlayerDeploymentPosition(squad.position)
    ) {
      return false;
    }
  }

  // 2. Verify enemy squads are positioned in the enemy deployment zone
  for (const squad of activeEnemySquads) {
    if (squad.position === null || !isEnemyDeploymentPosition(squad.position)) {
      return false;
    }
  }

  // 3. Verify no duplicate occupancy across all active squads
  const allActiveSquads = [...activePlayerSquads, ...activeEnemySquads];
  const occupied = new Set<string>();
  for (const squad of allActiveSquads) {
    if (squad.position === null) {
      return false;
    }
    const key = `${squad.position.column},${squad.position.row}`;
    if (occupied.has(key)) {
      return false;
    }
    occupied.add(key);
  }

  // 4. Verify no duplicate unit types on either side
  if (
    hasDuplicateUnitTypes(activePlayerSquads) ||
    hasDuplicateUnitTypes(activeEnemySquads)
  ) {
    return false;
  }

  return true;
}

/**
 * Begins the turn for the active side.
 * Transition rules:
 * - Only valid when phase is 'TURN_START'.
 * - Transitions state.phase to 'DEPLOYMENT'.
 * - Returns true if successful, or false if the phase was invalid (leaving state unchanged).
 */
export function beginTurn(state: CombatState): boolean {
  if (state.phase !== 'TURN_START') {
    return false;
  }

  state.phase = 'DEPLOYMENT';
  return true;
}

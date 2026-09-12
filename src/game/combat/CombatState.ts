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

export interface CombatMana {
  current: number;
  max: number;
}

export const DEFAULT_COMBAT_MAX_MANA = 3;

export interface SpellDeckState {
  drawPile: string[];
  hand: string[];
  discardPile: string[];
}

/** Creates a fresh, deterministic initial spell deck for the player. */
export function createInitialPlayerSpellDeck(): SpellDeckState {
  return {
    drawPile: ['firebolt', 'barrier', 'battle-cry'],
    hand: [],
    discardPile: [],
  };
}

/** Creates a fresh, deterministic initial spell deck for the enemy/Duskborn. */
export function createInitialEnemySpellDeck(): SpellDeckState {
  return {
    drawPile: ['dusk-strike', 'dark-ward'],
    hand: [],
    discardPile: [],
  };
}

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
  playerMana: CombatMana;
  enemyMana: CombatMana;
  playerDeck: SpellDeckState;
  enemyDeck: SpellDeckState;
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
 * - Restores the active side's Mana to maximum.
 * - Returns true if successful, or false if the phase was invalid (leaving state unchanged).
 */
export function beginTurn(state: CombatState): boolean {
  if (state.phase !== 'TURN_START') {
    return false;
  }

  // Restore active side's Mana to maximum
  if (state.activeSide === 'player') {
    state.playerMana.current = state.playerMana.max;
  } else {
    state.enemyMana.current = state.enemyMana.max;
  }

  state.phase = 'DEPLOYMENT';
  return true;
}

/**
 * Spends a specified amount of combat Mana for the given side.
 * Rules:
 * - Cost must be non-negative (amount >= 0).
 * - Side must have sufficient current Mana to pay the cost.
 * - Current Mana must never drop below 0.
 * - Atomic: if payment fails, current Mana remains unchanged.
 * - Zero cost succeeds without changing Mana.
 * Returns true if the cost was successfully paid, or false otherwise.
 */
export function spendMana(
  state: CombatState,
  side: CombatSide,
  amount: number,
): boolean {
  if (amount < 0) {
    return false;
  }

  const mana = side === 'player' ? state.playerMana : state.enemyMana;

  if (mana.current < amount) {
    return false;
  }

  mana.current -= amount;
  return true;
}

/**
 * Confirms deployment for the active side and transitions to ACTION phase.
 * Transition rules:
 * - Only valid when phase is 'DEPLOYMENT'.
 * - Transitions state.phase to 'ACTION'.
 * - Returns true if successful, or false if the phase was invalid (leaving state unchanged).
 */
export function confirmDeployment(state: CombatState): boolean {
  if (state.phase !== 'DEPLOYMENT') {
    return false;
  }

  state.phase = 'ACTION';
  return true;
}

/**
 * Confirms attack for the active side and transitions to RESOLUTION phase.
 * Transition rules:
 * - Only valid when phase is 'ACTION'.
 * - Transitions state.phase to 'RESOLUTION'.
 * - Returns true if successful, or false if the phase was invalid (leaving state unchanged).
 */
export function confirmAttack(state: CombatState): boolean {
  if (state.phase !== 'ACTION') {
    return false;
  }

  state.phase = 'RESOLUTION';
  return true;
}

/**
 * Concludes attack resolution for the active side and transitions to TURN_END phase.
 * Transition rules:
 * - Only valid when phase is 'RESOLUTION'.
 * - Transitions state.phase to 'TURN_END'.
 * - Returns true if successful, or false if the phase was invalid (leaving state unchanged).
 */
export function endResolution(state: CombatState): boolean {
  if (state.phase !== 'RESOLUTION') {
    return false;
  }

  state.phase = 'TURN_END';
  return true;
}

/**
 * Performs the side handoff during TURN_END.
 * Transition rules:
 * - Only valid when phase is 'TURN_END'.
 * - Switches the activeSide (player -> enemy or enemy -> player).
 * - Increments the turn count.
 * - Triggers the TURN_START state, and immediately runs beginTurn() to land in DEPLOYMENT.
 * - Returns true if successful, or false if the phase was invalid (leaving state unchanged).
 */
export function endTurn(state: CombatState): boolean {
  if (state.phase !== 'TURN_END') {
    return false;
  }

  // Handoff activeSide
  state.activeSide = state.activeSide === 'player' ? 'enemy' : 'player';

  // Increment turn
  state.turn += 1;

  // Transition to TURN_START
  state.phase = 'TURN_START';

  // Immediately begin the next turn to arrive in DEPLOYMENT
  return beginTurn(state);
}

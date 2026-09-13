import {
  isPlayerDeploymentPosition,
  isEnemyDeploymentPosition,
  isCombatPositionOccupied,
  selectLaneTarget,
  evaluateAbilityPositionEffect,
  getDepthPosition,
  type CombatSide,
} from './CombatGrid';
import type { CombatPosition } from './CombatPosition';
import type { Squad } from './Squad';
import type { UnitType } from '../content/UnitType';
import type { RunState } from '../core/RunState';
import {
  type CombatCardState,
  type RandomSource,
  initializeOpeningCombatCards,
  type SpellCard,
  drawCombatCard,
  type CombatCardDrawResult,
} from './CombatCard';
import { drawSpell, discardSpell } from './SpellDeck';
import { SPELL_REGISTRY } from '../content/spells';
import { ABILITY_REGISTRY } from '../content/abilities';
import { UNIT_REGISTRY, UNIT_PROGRESSION_UNLOCKS } from '../content/unitTypes';

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
  activeSide: CombatSide;
  turn: number;
  phase: CombatPhase;
  playerMana: CombatMana;
  enemyMana: CombatMana;
  playerDeck: SpellDeckState;
  enemyDeck: SpellDeckState;
  playerCombatDeck?: CombatCardState;
  enemyCombatDeck?: CombatCardState;
  openingDrawCompleted?: boolean;
  lastCardDrawTurn?: number;
  lastCardDrawSide?: CombatSide;
  lastCardDrawResult?: CombatCardDrawResult;
  selectedPlayerAbilities: Record<string, string>;
  selectedEnemyAbilities: Record<string, string>;
  playerPlayedSpells?: string[];
  enemyPlayedSpells?: string[];
  playerHeroShield?: number;
  enemyHeroShield?: number;
  participatingPlayerUnitTypeIds?: string[];
  hasVictoryBeenFinalized?: boolean;
  playerAvailableAbilities?: Record<string, string[]>;
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
 * Retrieves the effective available abilities for a unit type.
 * Symmetrically falls back to the static unit definition (baseline abilities) if no run snapshot is present.
 */
export function getEffectiveAbilitiesForUnitType(
  state: CombatState,
  side: CombatSide,
  unitTypeId: string,
): readonly string[] {
  if (side === 'player' && state.playerAvailableAbilities && state.playerAvailableAbilities[unitTypeId]) {
    return state.playerAvailableAbilities[unitTypeId];
  }
  const unit = UNIT_REGISTRY.get(unitTypeId);
  return unit?.abilities ?? [];
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
  if (!isDeploymentStructureValid(state)) {
    return false;
  }

  // Legacy isDeploymentValid requires ALL surviving squads on both sides to be positioned
  const allPlayerPositioned = state.playerSquads.filter((s) => s.count > 0).every((s) => s.position !== null);
  const allEnemyPositioned = state.enemySquads.filter((s) => s.count > 0).every((s) => s.position !== null);

  return allPlayerPositioned && allEnemyPositioned;
}

/**
 * Begins the turn for the active side.
 * Transition rules:
 * - Only valid when phase is 'TURN_START'.
 * - Transitions state.phase to 'DEPLOYMENT'.
 * - Restores the active side's Mana to maximum.
 * - Draws one spell for the active side, if available, before deployment.
 * - Returns true if successful, or false if the phase was invalid (leaving state unchanged).
 */
export function beginTurn(state: CombatState): boolean {
  if (state.phase !== 'TURN_START') {
    return false;
  }

  // Restore active side's Mana to maximum and clear played-spells list
  if (state.activeSide === 'player') {
    state.playerMana.current = state.playerMana.max;
    state.selectedPlayerAbilities = {};
    state.playerPlayedSpells = [];
  } else {
    state.enemyMana.current = state.enemyMana.max;
    state.selectedEnemyAbilities = {};
    state.enemyPlayedSpells = [];
  }

  const legacyDeck = state.activeSide === 'player' ? state.playerDeck : state.enemyDeck;
  const unifiedDeck = state.activeSide === 'player' ? state.playerCombatDeck : state.enemyCombatDeck;

  if (unifiedDeck) {
    // Check if we already drew for this turn and side to prevent double/idempotent drawing
    const alreadyDrawn = state.lastCardDrawTurn === state.turn && state.lastCardDrawSide === state.activeSide;

    if (!alreadyDrawn) {
      const result = drawCombatCard(unifiedDeck);
      state.lastCardDrawResult = result;
      state.lastCardDrawTurn = state.turn;
      state.lastCardDrawSide = state.activeSide;
    }

    // Mirror to legacy spell hand
    syncLegacySpellDeckFromUnified(unifiedDeck, legacyDeck);
  } else {
    // Legacy fallback draw (used in pure legacy tests)
    drawSpell(legacyDeck);
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
 * Helper to check if a specific squad/unit type is available for deployment.
 *
 * Rules:
 * - Matching squad must exist and have count > 0.
 * - If unified card state exists, the corresponding CreatureCard must be in creatureBench.
 * - Fallback: if no unified card state is present, we assume any surviving squad is available.
 */
export function isCreatureAvailableForDeployment(
  state: CombatState,
  side: CombatSide,
  unitTypeId: string,
): boolean {
  const squads = side === 'player' ? state.playerSquads : state.enemySquads;
  const squad = squads.find((s) => s.unitTypeId === unitTypeId);
  if (!squad || squad.count <= 0) {
    return false;
  }

  const unifiedDeck = side === 'player' ? state.playerCombatDeck : state.enemyCombatDeck;
  if (!unifiedDeck) {
    // Transitional fallback for legacy tests
    return true;
  }

  return unifiedDeck.creatureBench.some((c) => c.unitTypeId === unitTypeId);
}

/**
 * Checks if the combat deployment structure is currently valid.
 * This is an intermediate editing structural check. It does NOT enforce final
 * confirmation rules (like minimum deployed squads or lane coverage), allowing
 * players to temporarily have zero or partial deployments while editing.
 *
 * Validation conditions:
 * 1. Any positioned friendly squad must be surviving, have an available Creature card,
 *    and be in their correct deployment zone.
 * 2. No two positioned squads may occupy the same cell.
 * 3. Dead squads (count === 0) must have position === null.
 * 4. Faction uniqueness invariants (no duplicate unit types on either side).
 */
export function isDeploymentStructureValid(state: CombatState): boolean {
  const activePlayerSquads = state.playerSquads.filter((s) => s.count > 0);
  const activeEnemySquads = state.enemySquads.filter((s) => s.count > 0);

  // 1. Verify placed friendly squads are in their correct zones and available
  for (const squad of activePlayerSquads) {
    if (squad.position !== null) {
      if (!isPlayerDeploymentPosition(squad.position)) {
        return false;
      }
      if (!isCreatureAvailableForDeployment(state, 'player', squad.unitTypeId)) {
        return false;
      }
    }
  }

  for (const squad of activeEnemySquads) {
    if (squad.position !== null) {
      if (!isEnemyDeploymentPosition(squad.position)) {
        return false;
      }
      if (!isCreatureAvailableForDeployment(state, 'enemy', squad.unitTypeId)) {
        return false;
      }
    }
  }

  // 2. Verify no duplicate occupancy across all positioned active squads
  const positionedSquads = [...activePlayerSquads, ...activeEnemySquads].filter((s) => s.position !== null);
  const occupied = new Set<string>();
  for (const squad of positionedSquads) {
    const key = `${squad.position!.column},${squad.position!.row}`;
    if (occupied.has(key)) {
      return false;
    }
    occupied.add(key);
  }

  // 3. Verify no duplicate unit types on either side
  if (
    hasDuplicateUnitTypes(activePlayerSquads) ||
    hasDuplicateUnitTypes(activeEnemySquads)
  ) {
    return false;
  }

  return true;
}

/**
 * Checks if the combat deployment state is currently valid for a specific side's final confirmation.
 * Validation conditions:
 * 1. The overall deployment structures must satisfy isDeploymentStructureValid.
 * 2. Minimum Deployed Rule: If at least one surviving available Creature card exists,
 *    at least one must be deployed (deployed count >= 1). If none exist, 0 is allowed.
 * 3. Lane coverage: The side must cover as many distinct surviving opponent-occupied lanes as its
 *    number of surviving DEPLOYED friendly squads permits: covered opponent lanes >= min(surviving deployed friendly squads, opponent occupied columns).
 */
export function isSideDeploymentValid(
  state: CombatState,
  side: CombatSide,
): boolean {
  if (!isDeploymentStructureValid(state)) {
    return false;
  }

  // Minimum deployment check
  const squads = side === 'player' ? state.playerSquads : state.enemySquads;
  const unifiedDeck = side === 'player' ? state.playerCombatDeck : state.enemyCombatDeck;

  if (!unifiedDeck) {
    // Legacy fallback: every surviving friendly squad must have a non-null position
    const allPositioned = squads.filter((s) => s.count > 0).every((s) => s.position !== null);
    if (!allPositioned) {
      return false;
    }
  }

  const survivingAvailable = squads.filter((s) => isCreatureAvailableForDeployment(state, side, s.unitTypeId));
  const deployed = squads.filter((s) => s.count > 0 && s.position !== null);

  if (survivingAvailable.length > 0 && deployed.length === 0) {
    return false;
  }

  const required = getRequiredCoverageCount(state, side);
  const covered = getCoveredOpponentColumns(state, side);

  return covered.length >= required;
}

/**
 * Checks if a deployed squad can be returned to the bench.
 */
export function canUndeploySquad(
  state: CombatState,
  side: CombatSide,
  unitTypeId: string,
): boolean {
  if (state.phase !== 'DEPLOYMENT' || side !== state.activeSide) {
    return false;
  }

  const squads = side === 'player' ? state.playerSquads : state.enemySquads;
  const squad = squads.find((s) => s.unitTypeId === unitTypeId);
  if (!squad) {
    return false;
  }

  if (squad.count <= 0) {
    return false;
  }

  if (!isCreatureAvailableForDeployment(state, side, unitTypeId)) {
    return false;
  }

  if (squad.position === null) {
    return false;
  }

  return true;
}

/**
 * Returns a currently deployed squad back to the bench.
 */
export function undeploySquad(
  state: CombatState,
  side: CombatSide,
  unitTypeId: string,
): boolean {
  if (!canUndeploySquad(state, side, unitTypeId)) {
    return false;
  }

  const squads = side === 'player' ? state.playerSquads : state.enemySquads;
  const squad = squads.find((s) => s.unitTypeId === unitTypeId)!;
  squad.position = null;

  return true;
}

/**
 * Confirms deployment for the active side and transitions to ACTION phase.
 * Transition rules:
 * - Only valid when phase is 'DEPLOYMENT'.
 * - Transitions state.phase to 'ACTION'.
 * - Requires all opponent lanes to be fully covered by the active side's positioned surviving squads.
 * - Returns true if successful, or false if the phase was invalid or lane coverage was incomplete (leaving state unchanged).
 */
export function confirmDeployment(state: CombatState): boolean {
  if (state.phase !== 'DEPLOYMENT') {
    return false;
  }

  if (!isSideDeploymentValid(state, state.activeSide)) {
    return false;
  }

  state.phase = 'ACTION';
  return true;
}

/**
 * Validates the active side's prepared attack without spending Mana or changing state.
 * Every surviving squad must be positioned and have a registered, owned selection.
 * Unused Mana, unplayed spells, and dead squads do not block confirmation.
 */
export function canConfirmAttack(state: CombatState): boolean {
  if (state.phase !== 'ACTION') return false;
  const player = state.activeSide === 'player';
  const squads = player ? state.playerSquads : state.enemySquads;
  const selections = player ? state.selectedPlayerAbilities : state.selectedEnemyAbilities;

  const unifiedDeck = player ? state.playerCombatDeck : state.enemyCombatDeck;
  if (!unifiedDeck) {
    // Legacy fallback: every surviving friendly squad must have a non-null position
    const hasUnpositioned = squads.filter((s) => s.count > 0).some((s) => s.position === null);
    if (hasUnpositioned) {
      return false;
    }
  }

  return squads.filter((squad) => squad.count > 0 && squad.position !== null).every((squad) => {
    const abilityId = selections[squad.unitTypeId];
    const validPosition = player
      ? isPlayerDeploymentPosition(squad.position!)
      : isEnemyDeploymentPosition(squad.position!);
    const allowedAbilities = getEffectiveAbilitiesForUnitType(state, player ? 'player' : 'enemy', squad.unitTypeId);
    return validPosition && abilityId !== undefined &&
      ABILITY_REGISTRY.has(abilityId) && allowedAbilities.includes(abilityId);
  });
}

/**
 * Confirms attack for the active side and transitions to RESOLUTION phase.
 * Transition rules:
 * - Only valid when phase is 'ACTION'.
 * - Transitions state.phase to 'RESOLUTION'.
 * - Requires valid prepared abilities for every surviving active squad.
 * - Preserves selections for resolution; rejection leaves all state unchanged.
 */
export function confirmAttack(state: CombatState): boolean {
  if (!canConfirmAttack(state)) {
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

/**
 * Retrieves the columns currently occupied by at least one opposing surviving positioned squad.
 * If side is 'player', looks at enemy squads.
 * If side is 'enemy', looks at player squads.
 * For the purposes of lane engagement, opposing squads must have count > 0 and position !== null.
 */
export function getEngagedColumns(
  state: CombatState,
  side: CombatSide,
): number[] {
  const opponents = side === 'player' ? state.enemySquads : state.playerSquads;
  const activeOpponents = opponents.filter(
    (s) => s.count > 0 && s.position !== null,
  );

  const columns = activeOpponents.map((s) => s.position!.column);
  return Array.from(new Set(columns));
}

/**
 * Finds all column indices containing at least one surviving positioned opposing squad.
 */
export function getOpponentOccupiedColumns(
  state: CombatState,
  side: CombatSide,
): number[] {
  const opponents = side === 'player' ? state.enemySquads : state.playerSquads;
  const columns = opponents
    .filter((s) => s.count > 0 && s.position !== null)
    .map((s) => s.position!.column);
  return Array.from(new Set(columns));
}

/**
 * Returns the list of opponent-occupied columns that also contain at least one
 * surviving positioned friendly squad (excluding the specified one if any).
 */
export function getCoveredOpponentColumns(
  state: CombatState,
  side: CombatSide,
  excludedUnitTypeId?: string,
): number[] {
  const squads = side === 'player' ? state.playerSquads : state.enemySquads;
  const opponentCols = getOpponentOccupiedColumns(state, side);

  const friendlyCols = new Set(
    squads
      .filter((s) => s.count > 0 && s.position !== null && s.unitTypeId !== excludedUnitTypeId)
      .map((s) => s.position!.column)
  );

  return opponentCols.filter((col) => friendlyCols.has(col));
}

/**
 * Finds the minimum required covered columns count based on maximum achievable coverage:
 * Math.min(surviving friendly squads, distinct opposing occupied columns).
 */
export function getRequiredCoverageCount(
  state: CombatState,
  side: CombatSide,
): number {
  const squads = side === 'player' ? state.playerSquads : state.enemySquads;
  const survivingDeployedFriendlies = squads.filter((s) => s.count > 0 && s.position !== null);
  const opponentCols = getOpponentOccupiedColumns(state, side);

  return Math.min(survivingDeployedFriendlies.length, opponentCols.length);
}

/**
 * Finds all columns containing at least one surviving positioned opposing squad
 * that are currently NOT covered by at least one surviving positioned friendly squad of the given side.
 * Symmetrically ignores dead squads and unpositioned squads.
 * 
 * If excludedUnitTypeId is provided, that unit's current position is conceptually ignored.
 */
export function getUncoveredOpponentColumns(
  state: CombatState,
  side: CombatSide,
  excludedUnitTypeId?: string,
): number[] {
  const opponentCols = getOpponentOccupiedColumns(state, side);
  const coveredCols = new Set(getCoveredOpponentColumns(state, side, excludedUnitTypeId));
  return opponentCols.filter((col) => !coveredCols.has(col));
}

/**
 * Checks a potential reposition without mutating state, for previews and commits.
 * Rules:
 * - Only legal when state.phase is 'DEPLOYMENT'.
 * - Only legal when side matches state.activeSide.
 * - Only legal for surviving squads (squad.count > 0).
 * - Target position must belong to the side's respective deployment zone.
 * - Target position must not be occupied by any other active squad.
 * - Target position must respect the lane engagement restriction (if the opponent has surviving positioned squads, target column must be occupied by at least one opposing surviving positioned squad).
 * - Leaves state completely unchanged whether the target is valid or invalid.
 */
export function canRepositionSquad(
  state: CombatState,
  side: CombatSide,
  unitTypeId: string,
  targetPosition: CombatPosition,
): boolean {
  // 1. Phase and active side validation
  if (state.phase !== 'DEPLOYMENT' || side !== state.activeSide) {
    return false;
  }

  // 1.5 Creature availability validation
  if (!isCreatureAvailableForDeployment(state, side, unitTypeId)) {
    return false;
  }

  // 2. Deployment zone check
  if (side === 'player') {
    if (!isPlayerDeploymentPosition(targetPosition)) {
      return false;
    }
  } else {
    if (!isEnemyDeploymentPosition(targetPosition)) {
      return false;
    }
  }

  // 3. Find the squad belonging to the requesting side
  const squads = side === 'player' ? state.playerSquads : state.enemySquads;
  const squad = squads.find((s) => s.unitTypeId === unitTypeId);
  if (!squad) {
    return false;
  }

  // 4. Validate squad is surviving (count > 0)
  if (squad.count <= 0) {
    return false;
  }

  // 5. Occupancy check, filtering out the moving squad itself
  const allSquads = [...state.playerSquads, ...state.enemySquads];
  const otherSquads = allSquads.filter(
    (s) =>
      !(
        s.unitTypeId === unitTypeId &&
        (side === 'player'
          ? state.playerSquads.includes(s)
          : state.enemySquads.includes(s))
      ),
  );

  if (isCombatPositionOccupied(targetPosition, otherSquads)) {
    return false;
  }

  // 5.5 Lane engagement validation using maximum achievable coverage (using prospective deployed count)
  const otherCovered = getCoveredOpponentColumns(state, side, unitTypeId);
  const activeSquads = side === 'player' ? state.playerSquads : state.enemySquads;
  const currentSquad = activeSquads.find((s) => s.unitTypeId === unitTypeId)!;
  const currentlyDeployedCount = activeSquads.filter((s) => s.count > 0 && s.position !== null).length;
  const prospectiveDeployedCount = currentlyDeployedCount + (currentSquad.position === null ? 1 : 0);
  const opponentCols = getOpponentOccupiedColumns(state, side);
  const required = Math.min(prospectiveDeployedCount, opponentCols.length);

  if (otherCovered.length < required) {
    const uncoveredByOthers = getUncoveredOpponentColumns(state, side, unitTypeId);
    if (!uncoveredByOthers.includes(targetPosition.column)) {
      return false;
    }
  }

  return true;
}

/** Applies the same rules used by placement previews, mutating only position. */
export function repositionSquad(
  state: CombatState,
  side: CombatSide,
  unitTypeId: string,
  targetPosition: CombatPosition,
): boolean {
  if (!canRepositionSquad(state, side, unitTypeId, targetPosition)) {
    return false;
  }
  const squads = side === 'player' ? state.playerSquads : state.enemySquads;
  const squad = squads.find((candidate) => candidate.unitTypeId === unitTypeId)!;
  squad.position = targetPosition;
  return true;
}

/**
 * Checks if swapping the positions of two squads is legal.
 * Rules:
 * - Only legal when state.phase is 'DEPLOYMENT'.
 * - Only legal when side matches state.activeSide.
 * - Both squads must exist and belong to the active side.
 * - Both squads must be surviving (count > 0).
 * - At least one squad must have a non-null position (replacement is allowed).
 * - Unit type IDs must be different.
 * - Prospective final board must be valid under all current deployment invariants.
 */
export function canSwapSquads(
  state: CombatState,
  side: CombatSide,
  firstUnitTypeId: string,
  secondUnitTypeId: string,
): boolean {
  if (state.phase !== 'DEPLOYMENT' || side !== state.activeSide) {
    return false;
  }

  if (firstUnitTypeId === secondUnitTypeId) {
    return false;
  }

  const squads = side === 'player' ? state.playerSquads : state.enemySquads;
  const squadA = squads.find((s) => s.unitTypeId === firstUnitTypeId);
  const squadB = squads.find((s) => s.unitTypeId === secondUnitTypeId);

  if (!squadA || !squadB) {
    return false;
  }

  if (squadA.count <= 0 || squadB.count <= 0) {
    return false;
  }

  if (squadA.position === null && squadB.position === null) {
    return false;
  }

  // Verify both participants are available for deployment
  if (!isCreatureAvailableForDeployment(state, side, firstUnitTypeId) ||
      !isCreatureAvailableForDeployment(state, side, secondUnitTypeId)) {
    return false;
  }

  // Construct a prospective swapped state
  const tempState = structuredClone(state);
  const tempSquads = side === 'player' ? tempState.playerSquads : tempState.enemySquads;
  const tempSquadA = tempSquads.find((s) => s.unitTypeId === firstUnitTypeId)!;
  const tempSquadB = tempSquads.find((s) => s.unitTypeId === secondUnitTypeId)!;

  const posA = tempSquadA.position;
  const posB = tempSquadB.position;

  tempSquadA.position = posB;
  tempSquadB.position = posA;

  // Validate the final prospective swapped board:
  // 1. Verify positioned squads are in the correct deployment zone
  const activePlayerSquads = tempState.playerSquads.filter((s) => s.count > 0);
  const activeEnemySquads = tempState.enemySquads.filter((s) => s.count > 0);

  for (const squad of activePlayerSquads) {
    if (squad.position !== null && !isPlayerDeploymentPosition(squad.position)) {
      return false;
    }
  }
  for (const squad of activeEnemySquads) {
    if (squad.position !== null && !isEnemyDeploymentPosition(squad.position)) {
      return false;
    }
  }

  // 2.5 Verify positioned squads are available for deployment
  for (const squad of activePlayerSquads) {
    if (squad.position !== null && !isCreatureAvailableForDeployment(state, 'player', squad.unitTypeId)) {
      return false;
    }
  }
  for (const squad of activeEnemySquads) {
    if (squad.position !== null && !isCreatureAvailableForDeployment(state, 'enemy', squad.unitTypeId)) {
      return false;
    }
  }

  // 3. Verify no duplicate occupancy across all positioned active squads
  const occupied = new Set<string>();
  for (const squad of [...activePlayerSquads, ...activeEnemySquads]) {
    if (squad.position !== null) {
      const key = `${squad.position.column},${squad.position.row}`;
      if (occupied.has(key)) {
        return false;
      }
      occupied.add(key);
    }
  }

  // 4. Verify no duplicate unit types on either side
  if (
    hasDuplicateUnitTypes(activePlayerSquads) ||
    hasDuplicateUnitTypes(activeEnemySquads)
  ) {
    return false;
  }

  // 5. Validate lane coverage if the board is fully deployed
  const activeSideSquads = side === 'player' ? tempState.playerSquads : tempState.enemySquads;
  const allActiveDeployed = activeSideSquads
    .filter((s) => s.count > 0)
    .every((s) => s.position !== null);

  if (allActiveDeployed) {
    if (!isSideDeploymentValid(tempState, side)) {
      return false;
    }
  }

  return true;
}

/**
 * Swaps the positions of two surviving friendly squads during DEPLOYMENT.
 * This is an atomic operation: only mutates state if the prospective final board is legal.
 */
export function swapSquads(
  state: CombatState,
  side: CombatSide,
  firstUnitTypeId: string,
  secondUnitTypeId: string,
): boolean {
  if (!canSwapSquads(state, side, firstUnitTypeId, secondUnitTypeId)) {
    return false;
  }

  const squads = side === 'player' ? state.playerSquads : state.enemySquads;
  const squadA = squads.find((s) => s.unitTypeId === firstUnitTypeId)!;
  const squadB = squads.find((s) => s.unitTypeId === secondUnitTypeId)!;

  const posA = squadA.position;
  const posB = squadB.position;

  squadA.position = posB;
  squadB.position = posA;

  return true;
}

/**
 * Plays a spell from the hand for the specified side.
 * Rules:
 * - Only legal when state.phase is 'ACTION'.
 * - Only legal when side matches state.activeSide.
 * - Spell ID must exist in the spelling registry.
 * - Spell must be in the side's hand.
 * - Side must have enough Mana to pay the spell's cost.
 * - Atomically spends the Mana and discards the spell from hand.
 * Returns true if successful, or false otherwise.
 */
export function playSpell(
  state: CombatState,
  side: CombatSide,
  spellId: string,
): boolean {
  // 1. Phase and active side validation
  if (state.phase !== 'ACTION' || side !== state.activeSide) {
    return false;
  }

  // 2. Spell existence validation
  const spell = SPELL_REGISTRY.get(spellId);
  if (!spell) {
    return false;
  }

  // 3. Hand presence check (check unified deck if exists, fallback/sync to legacy)
  const unifiedDeck = side === 'player' ? state.playerCombatDeck : state.enemyCombatDeck;
  const deck = side === 'player' ? state.playerDeck : state.enemyDeck;

  let unifiedCardIndex = -1;
  if (unifiedDeck) {
    unifiedCardIndex = unifiedDeck.spellHand.findIndex((c) => c.spellId === spellId);
    if (unifiedCardIndex === -1) {
      return false;
    }
  } else {
    // Legacy fallback check
    if (!deck.hand.includes(spellId)) {
      return false;
    }
  }

  // 4. Mana cost validation
  const mana = side === 'player' ? state.playerMana : state.enemyMana;
  if (mana.current < spell.manaCost) {
    return false;
  }

  // 5. Spend Mana atomically
  const spent = spendMana(state, side, spell.manaCost);
  if (!spent) {
    return false;
  }

  // 6. Discard card atomically
  if (unifiedDeck && unifiedCardIndex !== -1) {
    // Move exact instance from unified spellHand to unified discardPile
    const [card] = unifiedDeck.spellHand.splice(unifiedCardIndex, 1);
    unifiedDeck.discardPile.push(card);

    // Mirror to legacy spell hand
    syncLegacySpellDeckFromUnified(unifiedDeck, deck);
  } else {
    // Legacy fallback discard
    const discarded = discardSpell(deck, spellId);
    if (!discarded) {
      // Rollback Mana in case discard fails
      mana.current += spell.manaCost;
      return false;
    }
  }

  // 7. Record successfully played spell in the per-turn list
  if (side === 'player') {
    state.playerPlayedSpells ??= [];
    state.playerPlayedSpells.push(spellId);
  } else {
    state.enemyPlayedSpells ??= [];
    state.enemyPlayedSpells.push(spellId);
  }

  return true;
}

/**
 * Attempts to use an ability for a squad of the specified unit type.
 * Rules:
 * - Only legal when state.phase is 'ACTION'.
 * - Only legal when side matches state.activeSide.
 * - Unit type must be registered and actually own the ability.
 * - Squad of that unit type must exist and be surviving (count > 0).
 * - Ability must exist in the ability registry.
 * - Side must have enough Mana to pay the ability's cost.
 * - Atomically spends the Mana.
 * Returns true if successful, or false otherwise.
 */
export function tryUseAbility(
  state: CombatState,
  side: CombatSide,
  unitTypeId: string,
  abilityId: string,
): boolean {
  // 1. Phase and active side validation
  if (state.phase !== 'ACTION' || side !== state.activeSide) {
    return false;
  }

  // 2. Validate unit type exists and owns the ability
  const unitDef = UNIT_REGISTRY.get(unitTypeId);
  const allowedAbilities = getEffectiveAbilitiesForUnitType(state, side, unitTypeId);
  if (!unitDef || !allowedAbilities.includes(abilityId)) {
    return false;
  }

  // 3. Find the squad of that unit type on the given side
  const squads = side === 'player' ? state.playerSquads : state.enemySquads;
  const squad = squads.find((s) => s.unitTypeId === unitTypeId);
  if (!squad || squad.count <= 0) {
    return false;
  }

  // 4. Validate ability exists in the registry
  const abilityDef = ABILITY_REGISTRY.get(abilityId);
  if (!abilityDef) {
    return false;
  }

  // 4.5. Validate no previous selection has occurred for this squad during this turn
  const selections = side === 'player' ? state.selectedPlayerAbilities : state.selectedEnemyAbilities;
  if (selections[unitTypeId] !== undefined) {
    return false;
  }

  // 5. Validate sufficient Mana
  const mana = side === 'player' ? state.playerMana : state.enemyMana;
  if (mana.current < abilityDef.manaCost) {
    return false;
  }

  // 6. Spend Mana atomically
  const spent = spendMana(state, side, abilityDef.manaCost);
  if (!spent) {
    return false;
  }

  // 7. Record the selected ability
  selections[unitTypeId] = abilityId;
  return true;
}

/**
 * Reusable helper that applies damage to a squad using the HP stack model.
 * - Respects squad count and partial HP (damagedUnitHp).
 * - If count reaches 0, squad is disabled (count = 0, damagedUnitHp = null, position = null).
 */
export function applyDamageToSquad(
  squad: Squad,
  unitDefinition: UnitType,
  damage: number,
): void {
  if (damage <= 0 || squad.count <= 0) {
    return;
  }

  const hpPerUnit = unitDefinition.hpPerUnit;

  // Let's determine how much HP the current damaged unit has.
  // If damagedUnitHp is null, then the current unit is at full HP (hpPerUnit).
  let currentUnitHp = squad.damagedUnitHp !== null ? squad.damagedUnitHp : hpPerUnit;

  let remainingDamage = damage;

  while (remainingDamage > 0 && squad.count > 0) {
    if (remainingDamage >= currentUnitHp) {
      // The current unit dies!
      remainingDamage -= currentUnitHp;
      squad.count -= 1;
      currentUnitHp = hpPerUnit; // next unit starts at full HP
      squad.damagedUnitHp = null;
    } else {
      // The current unit survives but takes some damage!
      currentUnitHp -= remainingDamage;
      squad.damagedUnitHp = currentUnitHp;
      remainingDamage = 0;
    }
  }

  // If squad count reaches 0, ensure fields are cleared.
  if (squad.count <= 0) {
    squad.count = 0;
    squad.damagedUnitHp = null;
    squad.position = null; // Also clear position so it no longer blocks lanes!
  }
}

/**
 * Reusable helper that applies damage to a hero.
 * - Symmetrically supports hero shields if present.
 * - Direct spell damage and empty-lane squad damage utilize this same shield/HP rules helper.
 * - Clamps final hero HP at minimum 0.
 */
export function applyDamageToHero(
  state: CombatState,
  side: CombatSide,
  amount: number,
): void {
  if (amount <= 0) {
    return;
  }

  const shieldField = side === 'player' ? 'playerHeroShield' : 'enemyHeroShield';
  const hpField = side === 'player' ? 'playerHeroHp' : 'enemyHeroHp';

  const currentShield = state[shieldField] ?? 0;

  if (currentShield >= amount) {
    state[shieldField] = currentShield - amount;
  } else {
    const remainingDamage = amount - currentShield;
    state[shieldField] = 0;
    state[hpField] = Math.max(0, state[hpField] - remainingDamage);
  }
}

/**
 * Resolves all successfully played spell effects for the active side in their play order.
 * - Spell IDs must exist in the SPELL_REGISTRY.
 * - Firebolt / Dusk Strike deal direct damage to the opposing hero.
 * - Barrier / Dark Ward add a fixed amount of hero shield.
 * - Battle Cry adds temporary attack buffs that are handled in the attack resolution loop.
 */
export function resolvePlayedSpells(state: CombatState, side: CombatSide): void {
  const playedSpells = side === 'player' ? (state.playerPlayedSpells ?? []) : (state.enemyPlayedSpells ?? []);
  const opponentSide = side === 'player' ? 'enemy' : 'player';

  for (const spellId of playedSpells) {
    const spell = SPELL_REGISTRY.get(spellId);
    if (!spell) {
      // Ignore/reject invalid queued ID safely without crashing
      continue;
    }

    if (spell.effectId === 'damage' || spell.effectId === 'enemy-damage') {
      const damage = spell.effectValue ?? 0;
      applyDamageToHero(state, opponentSide, damage);
    } else if (spell.effectId === 'defense' || spell.effectId === 'enemy-defense') {
      const shieldAmount = spell.effectValue ?? 0;
      if (side === 'player') {
        state.playerHeroShield = (state.playerHeroShield ?? 0) + shieldAmount;
      } else {
        state.enemyHeroShield = (state.enemyHeroShield ?? 0) + shieldAmount;
      }
    }
  }
}

export type CombatResult = 'ONGOING' | 'VICTORY' | 'DEFEAT';

/**
 * Pure TypeScript combat-result evaluator.
 * Decided ONLY by hero HP. Squad count must NOT determine the result.
 */
export function getCombatResult(state: CombatState): CombatResult {
  if (state.enemyHeroHp <= 0) {
    return 'VICTORY';
  }
  if (state.playerHeroHp <= 0) {
    return 'DEFEAT';
  }
  return 'ONGOING';
}

/**
 * Evaluates getCombatResult and updates state.phase to VICTORY or DEFEAT if ended.
 * Returns true if combat ended, or false if ongoing.
 */
export function updateCombatResultPhase(state: CombatState): boolean {
  const result = getCombatResult(state);
  if (result === 'VICTORY') {
    state.phase = 'VICTORY';
    return true;
  }
  if (result === 'DEFEAT') {
    state.phase = 'DEFEAT';
    return true;
  }
  return false;
}

export const COMBAT_VICTORY_XP_PER_UNIT_TYPE = 50;

/**
 * Retrieves the cumulative XP required to reach a specific level.
 * Level 1 -> 2: 100 total XP
 * Level 2 -> 3: 250 total XP
 * Level 3 -> 4: 450 total XP
 */
export function getXpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level === 2) return 100;
  if (level === 3) return 250;
  if (level === 4) return 450;
  return 450 + (level - 4) * 300;
}

/**
 * Calculates the level from a cumulative XP amount.
 * Correctly handles crossing multiple thresholds in one award.
 */
export function calculateLevelFromXp(xp: number): number {
  let level = 1;
  while (true) {
    const required = getXpRequiredForLevel(level + 1);
    if (xp >= required) {
      level++;
    } else {
      break;
    }
  }
  return level;
}

/**
 * Preserves the surviving player squad counts and partially damaged units
 * in the RunState roster on victory, and awards unit-type XP & calculates levels.
 * Returns true if victory was successfully finalized, or false if not in VICTORY phase
 * or if already finalized (idempotency/double-finalization protection).
 */
export function applyCombatVictoryToRunState(
  state: CombatState,
  runState: RunState,
): boolean {
  // Reject non-VICTORY states
  if (state.phase !== 'VICTORY') {
    return false;
  }

  // Idempotency / Double finalization guard
  if (state.hasVictoryBeenFinalized) {
    return false;
  }
  state.hasVictoryBeenFinalized = true;

  // Map surviving squads back to runState, resetting positions to null
  runState.playerSquads = state.playerSquads.map((s) => ({
    unitTypeId: s.unitTypeId,
    count: s.count,
    damagedUnitHp: s.damagedUnitHp,
    position: null,
  }));

  // Update generic army count resource based on survivors
  const totalArmy = state.playerSquads.reduce((sum, s) => sum + s.count, 0);
  runState.resources.army = totalArmy;

  // Award unit-type XP to participating player unit types on victory
  if (state.participatingPlayerUnitTypeIds) {
    runState.unitTypeProgression ??= {};
    for (const typeId of state.participatingPlayerUnitTypeIds) {
      // Ensure progression record exists in RunState
      runState.unitTypeProgression[typeId] ??= {
        unitTypeId: typeId,
        level: 1,
        xp: 0,
        unlockedAbilities: [],
      };

      const prog = runState.unitTypeProgression[typeId];
      const oldLevel = prog.level;

      prog.xp += COMBAT_VICTORY_XP_PER_UNIT_TYPE;
      const newLevel = calculateLevelFromXp(prog.xp);
      prog.level = newLevel;

      // If the level has increased, check if we should create a pending unlock choice
      if (newLevel > oldLevel) {
        const unlockDef = UNIT_PROGRESSION_UNLOCKS[typeId];
        if (unlockDef) {
          const currentlyUnlocked = new Set(prog.unlockedAbilities);
          const availableOptions = unlockDef.abilityUnlocks.filter((abi) => !currentlyUnlocked.has(abi));

          if (availableOptions.length > 0) {
            // Symmetrically create a choice for each crossed level >= 2
            for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
              if (lvl >= 2) {
                // Ensure we don't offer options already pending in another choice for this type
                const alreadyChosenOptions = new Set(
                  (runState.pendingAbilityUnlockChoices ?? [])
                    .filter((c) => c.unitTypeId === typeId)
                    .flatMap((c) => c.options)
                );
                const optionsForThisChoice = availableOptions.filter((abi) => !alreadyChosenOptions.has(abi));

                if (optionsForThisChoice.length > 0) {
                  runState.pendingAbilityUnlockChoices ??= [];
                  runState.pendingAbilityUnlockChoices.push({
                    unitTypeId: typeId,
                    options: optionsForThisChoice,
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  // Change run phase back to exploration
  runState.phase = 'exploration';
  return true;
}

/**
 * Pure helper to compute the player's effective abilities for a unit type.
 * Returns baseline UnitType abilities + progression unlocked abilities.
 * Preferred order: baseline abilities first, then unlocks in acquisition order, with duplicates removed.
 */
export function getAvailableAbilitiesForUnitType(
  runState: RunState,
  unitTypeId: string,
): string[] {
  const unit = UNIT_REGISTRY.get(unitTypeId);
  const baseline = unit?.abilities ?? [];

  const progression = runState.unitTypeProgression?.[unitTypeId];
  const unlocked = progression?.unlockedAbilities ?? [];

  const set = new Set([...baseline, ...unlocked]);
  return Array.from(set);
}

/**
 * Resolves a pending ability unlock choice for a unit type.
 * Rule:
 * - pending choice must exist
 * - abilityId must be one of its options
 * - ability must exist in ABILITY_REGISTRY
 * - ability must belong to that unit type's progression unlock pool
 * - ability must not already be unlocked
 * Returns true if choice resolved successfully, or false otherwise.
 */
export function chooseUnitTypeAbilityUnlock(
  runState: RunState,
  unitTypeId: string,
  abilityId: string,
): boolean {
  // 1. Validate ability exists in registry
  if (!ABILITY_REGISTRY.has(abilityId)) {
    return false;
  }

  // 2. Validate unit type progression config exists
  const unlockDef = UNIT_PROGRESSION_UNLOCKS[unitTypeId];
  if (!unlockDef || !unlockDef.abilityUnlocks.includes(abilityId)) {
    return false;
  }

  // 3. Find the pending choice record
  const choices = runState.pendingAbilityUnlockChoices ?? [];
  const choiceIndex = choices.findIndex(
    (c) => c.unitTypeId === unitTypeId && c.options.includes(abilityId)
  );
  if (choiceIndex === -1) {
    return false;
  }

  // 4. Validate not already unlocked
  const progression = runState.unitTypeProgression?.[unitTypeId];
  if (!progression) {
    return false;
  }
  if (progression.unlockedAbilities.includes(abilityId)) {
    return false;
  }

  // 5. Success: append to unlockedAbilities and remove the choice
  progression.unlockedAbilities.push(abilityId);
  choices.splice(choiceIndex, 1);

  return true;
}

/**
 * Resolves all attacks for the active side's surviving positioned squads.
 * Rules:
 * - Only legal when state.phase is 'RESOLUTION'.
 * - Attackers must have count > 0 and position !== null.
 * - Deterministic attack order: column ascending (0 -> 5), and FRONT before BACK inside same column.
 * - Targets are selected dynamically per attacker from the current mutated state (using selectLaneTarget).
 * - Dead opposing squads stop blocking immediately, allowing subsequent attackers in the same column to target hero.
 * - Direct hero damage is applied and clamped at minimum 0.
 * - Concludes by transitioning phase to 'TURN_END' using endResolution().
 * Returns true if successfully resolved, or false if phase was invalid.
 */
export function resolveActiveSideAttack(state: CombatState): boolean {
  // 1. Phase validation
  if (state.phase !== 'RESOLUTION') {
    return false;
  }

  const side = state.activeSide;
  const opponents = side === 'player' ? state.enemySquads : state.playerSquads;

  // 2. Collect surviving and positioned active-side squads
  const attackers = side === 'player' ? state.playerSquads : state.enemySquads;
  const activeAttackers = attackers.filter((s) => s.count > 0 && s.position !== null);

  // Optional preflight hardening: validate each selected ability is valid
  const preflightSelections = side === 'player' ? state.selectedPlayerAbilities : state.selectedEnemyAbilities;
  for (const attacker of activeAttackers) {
    const abilityId = preflightSelections[attacker.unitTypeId];
    if (abilityId !== undefined) {
      const allowedAbilities = getEffectiveAbilitiesForUnitType(state, side, attacker.unitTypeId);
      if (!ABILITY_REGISTRY.has(abilityId) || !allowedAbilities.includes(abilityId)) {
        return false;
      }
    }
  }

  // Resolve active side's played spells first
  resolvePlayedSpells(state, side);

  // Check if spell damage ended combat
  if (updateCombatResultPhase(state)) {
    return true;
  }

  // Calculate total Battle Cry bonus
  let battleCryBonus = 0;
  const activePlayedSpells = side === 'player' ? (state.playerPlayedSpells ?? []) : (state.enemyPlayedSpells ?? []);
  for (const spellId of activePlayedSpells) {
    const spell = SPELL_REGISTRY.get(spellId);
    if (spell && spell.effectId === 'attack-buff') {
      battleCryBonus += spell.effectValue ?? 0;
    }
  }

  // 3. Deterministic order: column ascending (0 -> 5), FRONT before BACK
  const sortedAttackers = [...activeAttackers].sort((a, b) => {
    const posA = a.position!;
    const posB = b.position!;
    if (posA.column !== posB.column) {
      return posA.column - posB.column;
    }
    // Sibling order: FRONT before BACK
    const depthA = getDepthPosition(posA, side);
    const depthB = getDepthPosition(posB, side);
    if (depthA === 'FRONT' && depthB === 'BACK') {
      return -1;
    }
    if (depthA === 'BACK' && depthB === 'FRONT') {
      return 1;
    }
    return 0;
  });

  // 4. Resolve attacks sequentially
  for (const attacker of sortedAttackers) {
    // Verify attacker has not somehow died during resolution (no counter-attacks currently, but safe practice)
    if (attacker.count <= 0) {
      continue;
    }

    // Determine current target using existing lane-targeting logic from current mutated state
    const target = selectLaneTarget(attacker, side, opponents);
    if (!target) {
      continue;
    }

    // Determine attacker unit definition and base damage
    const attackerDef = UNIT_REGISTRY.get(attacker.unitTypeId)!;
    const baseDamage = attackerDef.baseDamage;

    // Resolve selected ability and its damage modifiers
    const selectedAbilities = side === 'player' ? state.selectedPlayerAbilities : state.selectedEnemyAbilities;
    const abilityId = selectedAbilities[attacker.unitTypeId];

    let abilityAttackMod = 0;
    let positionAttackMod = 0;

    if (abilityId !== undefined) {
      const abilityDef = ABILITY_REGISTRY.get(abilityId);
      if (abilityDef) {
        if (abilityDef.attackModifier !== undefined) {
          abilityAttackMod = abilityDef.attackModifier;
        }
        // Evaluate active positional modifiers
        const posEval = evaluateAbilityPositionEffect(abilityId, side, attacker.position);
        if (posEval.active && posEval.modifierType === 'damage' && posEval.modifierValue !== undefined) {
          positionAttackMod = posEval.modifierValue;
        }
      }
    }

    // Calculate total squad attack damage using per-unit scaling: count * (baseDamage + mods + battleCryBonus)
    const effectiveDamagePerUnit = baseDamage + abilityAttackMod + positionAttackMod + battleCryBonus;
    const totalDamage = attacker.count * effectiveDamagePerUnit;

    // Apply damage to target
    if (target.type === 'hero') {
      applyDamageToHero(state, target.side, totalDamage);
    } else {
      const targetSquad = target.squad;
      const targetDef = UNIT_REGISTRY.get(targetSquad.unitTypeId)!;
      applyDamageToSquad(targetSquad, targetDef, totalDamage);
    }

    // Check if this attack ended combat
    if (updateCombatResultPhase(state)) {
      return true;
    }
  }

  // 5. Conclude RESOLUTION and transition to TURN_END
  endResolution(state);
  return true;
}

/**
 * Synchronizes the legacy spell deck state to match the authoritative unified deck state.
 * This is part of the legacy compatibility bridge and ensures full stability for visual hands.
 */
export function syncLegacySpellDeckFromUnified(
  unified: CombatCardState,
  legacy: SpellDeckState,
): void {
  legacy.hand = unified.spellHand.map((card) => card.spellId);
  legacy.drawPile = unified.drawPile
    .filter((card): card is SpellCard => card.cardType === 'SPELL')
    .map((card) => card.spellId);
  legacy.discardPile = unified.discardPile
    .filter((card): card is SpellCard => card.cardType === 'SPELL')
    .map((card) => card.spellId);
}

/**
 * Performs the category-constrained opening card draws for both player and enemy decks.
 * Also synchronizes the legacy spell deck state to mirror the new unified authoritative spell hand.
 *
 * Prevents repeated initialization.
 */
export function executeOpeningDraw(
  state: CombatState,
  random: RandomSource = Math.random,
): boolean {
  if (state.openingDrawCompleted) {
    return false;
  }

  // 1. Player opening draw
  if (state.playerCombatDeck) {
    state.playerCombatDeck = initializeOpeningCombatCards(state.playerCombatDeck, random);
    syncLegacySpellDeckFromUnified(state.playerCombatDeck, state.playerDeck);
  }

  // 2. Enemy opening draw
  if (state.enemyCombatDeck) {
    state.enemyCombatDeck = initializeOpeningCombatCards(state.enemyCombatDeck, random);
    syncLegacySpellDeckFromUnified(state.enemyCombatDeck, state.enemyDeck);
  }

  state.openingDrawCompleted = true;

  // Set the draw tracking so that the current active side skips their per-turn mixed card draw on this opening turn
  state.lastCardDrawTurn = state.turn;
  state.lastCardDrawSide = state.activeSide;

  return true;
}

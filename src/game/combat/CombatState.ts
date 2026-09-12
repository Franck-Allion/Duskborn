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
import { drawSpell, discardSpell } from './SpellDeck';
import { SPELL_REGISTRY } from '../content/spells';
import { ABILITY_REGISTRY } from '../content/abilities';
import { UNIT_REGISTRY } from '../content/unitTypes';

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
  selectedPlayerAbilities: Record<string, string>;
  selectedEnemyAbilities: Record<string, string>;
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
 * - Draws one spell for the active side, if available, before deployment.
 * - Returns true if successful, or false if the phase was invalid (leaving state unchanged).
 */
export function beginTurn(state: CombatState): boolean {
  if (state.phase !== 'TURN_START') {
    return false;
  }

  // Restore active side's Mana to maximum
  if (state.activeSide === 'player') {
    state.playerMana.current = state.playerMana.max;
    state.selectedPlayerAbilities = {};
  } else {
    state.enemyMana.current = state.enemyMana.max;
    state.selectedEnemyAbilities = {};
  }

  drawSpell(state.activeSide === 'player' ? state.playerDeck : state.enemyDeck);

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
 * Validates the active side's prepared attack without spending Mana or changing state.
 * Every surviving squad must be positioned and have a registered, owned selection.
 * Unused Mana, unplayed spells, and dead squads do not block confirmation.
 */
export function canConfirmAttack(state: CombatState): boolean {
  if (state.phase !== 'ACTION') return false;
  const player = state.activeSide === 'player';
  const squads = player ? state.playerSquads : state.enemySquads;
  const selections = player ? state.selectedPlayerAbilities : state.selectedEnemyAbilities;
  return squads.filter((squad) => squad.count > 0).every((squad) => {
    const abilityId = selections[squad.unitTypeId];
    const unit = UNIT_REGISTRY.get(squad.unitTypeId);
    const validPosition = squad.position !== null && (player
      ? isPlayerDeploymentPosition(squad.position)
      : isEnemyDeploymentPosition(squad.position));
    return validPosition && abilityId !== undefined &&
      ABILITY_REGISTRY.has(abilityId) && !!unit?.abilities.includes(abilityId);
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

  // 5.5 Lane engagement validation
  const engagedColumns = getEngagedColumns(state, side);
  if (engagedColumns.length > 0) {
    if (!engagedColumns.includes(targetPosition.column)) {
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

  // 3. Hand presence check
  const deck = side === 'player' ? state.playerDeck : state.enemyDeck;
  if (!deck.hand.includes(spellId)) {
    return false;
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
  const discarded = discardSpell(deck, spellId);
  if (!discarded) {
    // Rollback Mana in case discard fails
    mana.current += spell.manaCost;
    return false;
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
  if (!unitDef || !unitDef.abilities.includes(abilityId)) {
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

    // Calculate total squad attack damage using per-unit scaling: count * (baseDamage + mods)
    const effectiveDamagePerUnit = baseDamage + abilityAttackMod + positionAttackMod;
    const totalDamage = attacker.count * effectiveDamagePerUnit;

    // Apply damage to target
    if (target.type === 'hero') {
      if (target.side === 'player') {
        state.playerHeroHp = Math.max(0, state.playerHeroHp - totalDamage);
      } else {
        state.enemyHeroHp = Math.max(0, state.enemyHeroHp - totalDamage);
      }
    } else {
      const targetSquad = target.squad;
      const targetDef = UNIT_REGISTRY.get(targetSquad.unitTypeId)!;
      applyDamageToSquad(targetSquad, targetDef, totalDamage);
    }
  }

  // 5. Conclude RESOLUTION and transition to TURN_END
  endResolution(state);
  return true;
}

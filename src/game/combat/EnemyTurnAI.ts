import {
  type CombatState,
  repositionSquad,
  canRepositionSquad,
  tryUseAbility,
  playSpell,
  confirmDeployment,
  confirmAttack,
  resolveActiveSideAttack,
} from './CombatState';
import {
  GRID_COLUMNS,
  ROW_ENEMY_FRONT,
  ROW_ENEMY_BACK,
} from './CombatGrid';
import type { CombatPosition } from './CombatPosition';
import { UNIT_REGISTRY } from '../content/unitTypes';
import { ABILITY_REGISTRY } from '../content/abilities';
import { SPELL_REGISTRY } from '../content/spells';

/**
 * Executes a single, completely deterministic, legal turn for the enemy/Duskborn AI side.
 * Coordinates transitions through DEPLOYMENT -> ACTION -> RESOLUTION -> TURN_END.
 * Does not automatically trigger the final endTurn() handoff.
 * 
 * Returns true if the turn resolved successfully, or false if any step was illegal or failed.
 */
export function runEnemyTurn(state: CombatState): boolean {
  // 1. Precondition: activeSide must be 'enemy' and phase must be 'DEPLOYMENT'
  if (state.activeSide !== 'enemy' || state.phase !== 'DEPLOYMENT') {
    return false;
  }

  // --- STAGE 1: DEPLOYMENT ---
  // Reposition surviving enemy squads deterministically.
  const survivingEnemySquads = state.enemySquads.filter((s) => s.count > 0);

  // Preference order of positions: all FRONT (row 1) by ascending column (0 to 5), then BACK (row 0)
  const candidatePositions: CombatPosition[] = [];
  // FRONT
  for (let col = 0; col < GRID_COLUMNS; col++) {
    candidatePositions.push({ column: col, row: ROW_ENEMY_FRONT });
  }
  // BACK
  for (let col = 0; col < GRID_COLUMNS; col++) {
    candidatePositions.push({ column: col, row: ROW_ENEMY_BACK });
  }

  for (const squad of survivingEnemySquads) {
    // Find the first candidate position that is currently legal
    let preferredPos: CombatPosition | null = null;
    for (const pos of candidatePositions) {
      if (canRepositionSquad(state, 'enemy', squad.unitTypeId, pos)) {
        preferredPos = pos;
        break;
      }
    }

    if (!preferredPos) {
      // If we cannot find any legal position for a surviving squad, fail safely
      return false;
    }

    // Move squad only if it is not already in the preferred position
    const current = squad.position;
    if (current === null || current.column !== preferredPos.column || current.row !== preferredPos.row) {
      if (!repositionSquad(state, 'enemy', squad.unitTypeId, preferredPos)) {
        return false;
      }
    }
  }

  // Confirm enemy deployment and transition to ACTION phase
  if (!confirmDeployment(state)) {
    return false;
  }

  // --- STAGE 2: ACTION ---
  // A. Ability Selection (spend Mana first)
  for (const squad of survivingEnemySquads) {
    const unitDef = UNIT_REGISTRY.get(squad.unitTypeId);
    if (!unitDef) {
      return false;
    }

    // Filter and map valid abilities
    const candidateAbilities = unitDef.abilities
      .map((id, index) => ({ id, def: ABILITY_REGISTRY.get(id), originalIndex: index }))
      .filter((item) => item.def !== undefined);

    // Filter to currently affordable abilities
    const affordable = candidateAbilities.filter((item) => item.def!.manaCost <= state.enemyMana.current);

    // Sort priority: highest mana cost first, break ties by definition order
    affordable.sort((a, b) => {
      if (b.def!.manaCost !== a.def!.manaCost) {
        return b.def!.manaCost - a.def!.manaCost;
      }
      return a.originalIndex - b.originalIndex;
    });

    let selected = false;
    for (const item of affordable) {
      if (tryUseAbility(state, 'enemy', squad.unitTypeId, item.id)) {
        selected = true;
        break;
      }
    }

    if (!selected) {
      // Every surviving squad must have a selected ability
      return false;
    }
  }

  // B. Spell Play (use remaining Mana)
  const currentHand = [...state.enemyDeck.hand]; // copy to safely iterate
  for (const spellId of currentHand) {
    const spellDef = SPELL_REGISTRY.get(spellId);
    if (spellDef && spellDef.manaCost <= state.enemyMana.current) {
      // playSpell discards the card and subtracts Mana atomically
      playSpell(state, 'enemy', spellId);
    }
  }

  // Confirm attack and transition to RESOLUTION phase
  if (!confirmAttack(state)) {
    return false;
  }

  // --- STAGE 3: RESOLUTION ---
  // Resolve enemy active-side attacks and transition to TURN_END phase
  if (!resolveActiveSideAttack(state)) {
    return false;
  }

  return true;
}

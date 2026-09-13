import {
  type CombatState,
  repositionSquad,
  canRepositionSquad,
  tryUseAbility,
  playSpell,
  confirmDeployment,
  confirmAttack,
  resolveActiveSideAttack,
  endTurn,
  getCombatResult,
  getUncoveredOpponentColumns,
  isSideDeploymentValid,
} from './CombatState';
import {
  GRID_COLUMNS,
  ROW_ENEMY_FRONT,
  ROW_ENEMY_BACK,
} from './CombatGrid';
import type { CombatPosition } from './CombatPosition';
import type { Squad } from './Squad';
import { UNIT_REGISTRY } from '../content/unitTypes';
import { ABILITY_REGISTRY } from '../content/abilities';
import { SPELL_REGISTRY } from '../content/spells';

/**
 * Deterministically repositions surviving enemy squads for deployment,
 * keeping existing valid layouts if possible, and performing minimal corrections otherwise.
 * Stops repositioning as soon as isSideDeploymentValid(state, 'enemy') becomes true.
 */
export function repositionEnemySquadsForDeployment(state: CombatState): boolean {
  // 1. If current deployment is already valid for enemy, do absolutely nothing!
  if (isSideDeploymentValid(state, 'enemy')) {
    return true;
  }

  const survivingEnemySquads = state.enemySquads.filter((s) => s.count > 0);

  // 2. Identify candidate squads to move, prioritized by:
  //    1) squad currently in a column with no surviving player squad (empty column)
  //    2) squad redundant in a player-occupied column already covered by another enemy squad
  //    3) uniquely covering squad (should preserve if possible)
  //    - stable tie-break by enemySquads definition/array order
  const playerColumns = new Set(
    state.playerSquads
      .filter((s) => s.count > 0 && s.position !== null)
      .map((s) => s.position!.column)
  );

  function getSquadPriority(squad: Squad): number {
    if (squad.position === null) {
      return 0; // unpositioned squads get highest priority to move
    }
    const col = squad.position.column;
    if (!playerColumns.has(col)) {
      return 1; // empty column (covers no opponent lane)
    }

    // Check if redundant: is there another enemy squad in the same column?
    const othersInSameCol = survivingEnemySquads.filter(
      (s) => s.unitTypeId !== squad.unitTypeId && s.position !== null && s.position.column === col
    );
    if (othersInSameCol.length > 0) {
      return 2; // redundant squad in covered player lane
    }

    return 3; // uniquely covering squad (preserve)
  }

  // Sort squads to move: priority ascending (lowest number first, so unpositioned first, then empty, then redundant, then uniquely covering)
  const sortedSquads = [...survivingEnemySquads].sort((a, b) => {
    const prioA = getSquadPriority(a);
    const prioB = getSquadPriority(b);
    if (prioA !== prioB) {
      return prioA - prioB;
    }
    // Stable array order tie-breaker
    const indexA = state.enemySquads.indexOf(a);
    const indexB = state.enemySquads.indexOf(b);
    return indexA - indexB;
  });

  // 3. Move squads one-by-one until deployment becomes valid
  for (const squad of sortedSquads) {
    if (isSideDeploymentValid(state, 'enemy')) {
      break;
    }

    // Prioritize candidates: uncovered opponent-occupied columns first (ensures maximum coverage count is reached first)
    const uncoveredCols = getUncoveredOpponentColumns(state, 'enemy');
    const uncoveredColsSet = new Set(uncoveredCols);

    const coveragePositions: CombatPosition[] = [];
    const otherPositions: CombatPosition[] = [];

    // FRONT
    for (let col = 0; col < GRID_COLUMNS; col++) {
      const pos = { column: col, row: ROW_ENEMY_FRONT };
      if (uncoveredColsSet.has(col)) {
        coveragePositions.push(pos);
      } else {
        otherPositions.push(pos);
      }
    }
    // BACK
    for (let col = 0; col < GRID_COLUMNS; col++) {
      const pos = { column: col, row: ROW_ENEMY_BACK };
      if (uncoveredColsSet.has(col)) {
        coveragePositions.push(pos);
      } else {
        otherPositions.push(pos);
      }
    }

    const candidatePositions = [...coveragePositions, ...otherPositions];

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

  return isSideDeploymentValid(state, 'enemy');
}

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

  const survivingEnemySquads = state.enemySquads.filter((s) => s.count > 0);

  // --- STAGE 1: DEPLOYMENT ---
  // Reposition surviving enemy squads deterministically, keeping existing valid deployment if possible.
  if (!repositionEnemySquadsForDeployment(state)) {
    return false;
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

/**
 * Examines the current combat state and automatically advances non-interactive phases.
 * - If activeSide is 'enemy' and phase is 'DEPLOYMENT': automatically runs runEnemyTurn(state).
 * - If activeSide is 'enemy' and phase is 'TURN_END': automatically runs endTurn(state) to hand back to the player.
 * - If activeSide is 'player' and phase is 'TURN_END': automatically runs endTurn(state) to hand off to the enemy.
 * 
 * Returns true if any state modification occurred, or false if no automatic phase was applicable.
 */
export function advanceAutomaticCombatPhases(state: CombatState): boolean {
  const result = getCombatResult(state);
  if (result !== 'ONGOING') {
    // If combat has ended, no automatic transitions are allowed!
    // Make sure we update the phase to match the result
    if (result === 'VICTORY' && state.phase !== 'VICTORY') {
      state.phase = 'VICTORY';
      return true;
    }
    if (result === 'DEFEAT' && state.phase !== 'DEFEAT') {
      state.phase = 'DEFEAT';
      return true;
    }
    return false;
  }

  if (state.activeSide === 'enemy') {
    if (state.phase === 'DEPLOYMENT') {
      return runEnemyTurn(state);
    }
    if (state.phase === 'TURN_END') {
      return endTurn(state);
    }
  } else if (state.activeSide === 'player') {
    if (state.phase === 'TURN_END') {
      return endTurn(state);
    }
  }

  return false;
}

/**
 * Runs a continuous loop advancing all consecutive automatic non-interactive phases
 * in a single synchronous call.
 * 
 * Returns true if any transition was executed.
 */
export function orchestrateAutomaticPhases(state: CombatState): boolean {
  let changed = false;
  while (advanceAutomaticCombatPhases(state)) {
    changed = true;
  }
  return changed;
}

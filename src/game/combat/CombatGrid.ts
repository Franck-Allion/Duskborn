import type { CombatPosition } from './CombatPosition';
import type { Squad } from './Squad';

export const GRID_COLUMNS = 6;
export const GRID_ROWS = 4;

export const ROW_ENEMY_BACK = 0;
export const ROW_ENEMY_FRONT = 1;
export const ROW_PLAYER_FRONT = 2;
export const ROW_PLAYER_BACK = 3;

/**
 * Checks if a given logical position is valid: within 6x4 bounds and has discrete integer coordinates.
 */
export function isValidCombatPosition(position: CombatPosition): boolean {
  return (
    Number.isInteger(position.column) &&
    Number.isInteger(position.row) &&
    position.column >= 0 &&
    position.column < GRID_COLUMNS &&
    position.row >= 0 &&
    position.row < GRID_ROWS
  );
}

/**
 * Checks if a given logical position lies inside the grid boundaries.
 */
export function isInsideGrid(position: CombatPosition): boolean {
  return isValidCombatPosition(position);
}

/**
 * Checks if a given logical position belongs to the player's deployment zone.
 */
export function isPlayerDeploymentPosition(position: CombatPosition): boolean {
  return (
    isValidCombatPosition(position) &&
    (position.row === ROW_PLAYER_FRONT || position.row === ROW_PLAYER_BACK)
  );
}

/**
 * Checks if a given logical position belongs to the enemy's deployment zone.
 */
export function isEnemyDeploymentPosition(position: CombatPosition): boolean {
  return (
    isValidCombatPosition(position) &&
    (position.row === ROW_ENEMY_BACK || position.row === ROW_ENEMY_FRONT)
  );
}

/**
 * Retrieves the squad occupying a logical cell on the grid, if any.
 * Operates on a list of active squads, maintaining the squad itself as the single source of truth.
 */
export function getSquadAt(
  position: CombatPosition,
  squads: Squad[],
): Squad | undefined {
  return squads.find(
    (s) =>
      s.position !== null &&
      s.position.column === position.column &&
      s.position.row === position.row,
  );
}

/**
 * Checks if a given logical position is occupied by any squad.
 * Only valid combat positions can be occupied. Invalid positions return false.
 */
export function isCombatPositionOccupied(
  position: CombatPosition,
  squads: readonly Squad[],
): boolean {
  if (!isValidCombatPosition(position)) {
    return false;
  }

  return squads.some(
    (s) =>
      s.position !== null &&
      s.position.column === position.column &&
      s.position.row === position.row,
  );
}

/**
 * Checks if a squad can be placed at the given logical position.
 * It is only allowed if the position is a valid combat position AND not currently occupied.
 */
export function canPlaceSquadAtPosition(
  position: CombatPosition,
  squads: readonly Squad[],
): boolean {
  return (
    isValidCombatPosition(position) &&
    !isCombatPositionOccupied(position, squads)
  );
}

/**
 * Checks if a given logical position is occupied by any squad.
 */
export function isCellOccupied(
  position: CombatPosition,
  squads: Squad[],
): boolean {
  return isCombatPositionOccupied(position, squads);
}

/**
 * Checks if a player squad can be placed at a logical position.
 * Returns true if the position is a valid player deployment cell AND not occupied by another squad.
 */
export function isValidPlayerPlacement(
  position: CombatPosition,
  playerSquads: readonly Squad[],
  squadIndexToPlace: number,
): boolean {
  if (!isPlayerDeploymentPosition(position)) {
    return false;
  }

  const otherSquads = playerSquads.filter(
    (_, idx) => idx !== squadIndexToPlace,
  );
  return !isCombatPositionOccupied(position, otherSquads);
}

/**
 * Deterministically deploys a list of enemy squads onto the grid.
 * Processes them in array order, filling the Front row (row 1) from left to right (col 0 to 5),
 * and then the Back row (row 0) from left to right (col 0 to 5).
 * Squads that already have valid enemy-zone positions are left unchanged.
 */
export function deployEnemySquads(enemySquads: readonly Squad[]): Squad[] {
  // Candidate positions in order of priority:
  // Front row (row 1, cols 0..5) first, then Back row (row 0, cols 0..5)
  const candidates: CombatPosition[] = [];
  for (let col = 0; col < GRID_COLUMNS; col += 1) {
    candidates.push({ column: col, row: ROW_ENEMY_FRONT });
  }
  for (let col = 0; col < GRID_COLUMNS; col += 1) {
    candidates.push({ column: col, row: ROW_ENEMY_BACK });
  }

  // Identify which candidate positions are already occupied by squads that already have a valid position.
  const activePositions = enemySquads
    .filter((s) => s.position !== null && isEnemyDeploymentPosition(s.position))
    .map((s) => s.position as CombatPosition);

  const occupiedPositions = new Set<string>(
    activePositions.map((p) => `${p.column},${p.row}`),
  );

  // Available candidates are those not already occupied
  const availableCandidates = candidates.filter(
    (c) => !occupiedPositions.has(`${c.column},${c.row}`),
  );

  let nextCandidateIdx = 0;

  return enemySquads.map((squad) => {
    // If the squad already has a valid position, keep it
    if (squad.position !== null && isEnemyDeploymentPosition(squad.position)) {
      return { ...squad };
    }

    // Otherwise, assign the next available deterministic candidate
    if (nextCandidateIdx < availableCandidates.length) {
      const position = availableCandidates[nextCandidateIdx];
      nextCandidateIdx += 1;
      return { ...squad, position };
    }

    // If we exceed capacity (more than 12 squads), leave position as null
    return { ...squad };
  });
}

export type DepthPosition = 'FRONT' | 'BACK';
export type CombatSide = 'player' | 'enemy';

/**
 * Determines whether a logical position is in the FRONT or BACK row for its side.
 * Returns null if the position is invalid, out of bounds, or does not belong to the side's zone.
 */
export function getDepthPosition(
  position: CombatPosition,
  side: CombatSide,
): DepthPosition | null {
  if (!isValidCombatPosition(position)) {
    return null;
  }

  if (side === 'player') {
    if (!isPlayerDeploymentPosition(position)) {
      return null;
    }
    return position.row === ROW_PLAYER_FRONT ? 'FRONT' : 'BACK';
  } else {
    if (!isEnemyDeploymentPosition(position)) {
      return null;
    }
    return position.row === ROW_ENEMY_FRONT ? 'FRONT' : 'BACK';
  }
}

/**
 * Determines the depth category of a squad based on its position and side.
 * Returns null if the squad is unplaced (position is null).
 */
export function getSquadDepthCategory(
  squad: Squad,
  side: CombatSide,
): DepthPosition | null {
  if (squad.position === null) {
    return null;
  }
  return getDepthPosition(squad.position, side);
}

export type HorizontalPosition = 'EDGE' | 'CENTER';

/**
 * Determines whether a logical position is on an EDGE column or in the CENTER area.
 * Returns null if the position is invalid or out of bounds.
 */
export function getHorizontalPosition(
  position: CombatPosition,
): HorizontalPosition | null {
  if (!isValidCombatPosition(position)) {
    return null;
  }

  const isEdge = position.column === 0 || position.column === GRID_COLUMNS - 1;
  return isEdge ? 'EDGE' : 'CENTER';
}

/**
 * Determines the horizontal category of a squad based on its position.
 * Returns null if the squad is unplaced (position is null).
 */
export function getSquadHorizontalCategory(
  squad: Squad,
): HorizontalPosition | null {
  if (squad.position === null) {
    return null;
  }
  return getHorizontalPosition(squad.position);
}

export type CombatLane = number;

/**
 * Identifies the logical combat lane (column index) for a given logical position.
 * Returns null if the position is invalid or out of bounds.
 */
export function getLaneForPosition(
  position: CombatPosition,
): CombatLane | null {
  if (!isValidCombatPosition(position)) {
    return null;
  }
  return position.column;
}

/**
 * Identifies the logical combat lane of a squad based on its position.
 * Returns null if the squad is unplaced (position is null).
 */
export function getSquadLane(squad: Squad): CombatLane | null {
  if (squad.position === null) {
    return null;
  }
  return getLaneForPosition(squad.position);
}

/**
 * Retrieves all opposing squads occupying the same logical combat lane (column) as the attacker.
 * Returns an empty array if the attacker is unplaced (position is null).
 * Excludes unplaced, dead, or invalidly positioned opposing squads.
 */
export function getOpposingSquadsInLane(
  attacker: Squad,
  opponents: readonly Squad[],
): Squad[] {
  const attackerLane = getSquadLane(attacker);
  if (attackerLane === null) {
    return [];
  }

  // Filter opposing squads that are active (count > 0), placed, and share the same lane
  return opponents.filter((squad) => {
    if (squad.count <= 0 || squad.position === null) {
      return false;
    }
    const squadLane = getSquadLane(squad);
    return squadLane === attackerLane;
  });
}

/**
 * Selects a single deterministic target squad from the same combat lane (column) as the attacker.
 * If 0 candidates exist, returns null.
 * If 1 candidate exists, returns that candidate (FRONT or BACK).
 * If 2 candidates exist (both rows occupied in that column), targets the FRONT squad first,
 * regardless of collection order.
 */
export function selectLaneTarget(
  attacker: Squad,
  attackerSide: CombatSide,
  opponents: readonly Squad[],
): Squad | null {
  const candidates = getOpposingSquadsInLane(attacker, opponents);
  if (candidates.length === 0) {
    return null;
  }
  if (candidates.length === 1) {
    return candidates[0];
  }

  const opponentSide: CombatSide = attackerSide === 'player' ? 'enemy' : 'player';

  // Find the candidate that is FRONT.
  const frontCandidate = candidates.find(
    (squad) => getSquadDepthCategory(squad, opponentSide) === 'FRONT',
  );

  return frontCandidate || candidates[0];
}

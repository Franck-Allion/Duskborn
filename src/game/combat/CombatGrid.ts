import type { CombatPosition } from './CombatPosition';
import type { Squad } from './Squad';

export const GRID_COLUMNS = 6;
export const GRID_ROWS = 4;

export const ROW_ENEMY_BACK = 0;
export const ROW_ENEMY_FRONT = 1;
export const ROW_PLAYER_FRONT = 2;
export const ROW_PLAYER_BACK = 3;

/**
 * Checks if a given logical position lies inside the grid boundaries.
 */
export function isInsideGrid(position: CombatPosition): boolean {
  return (
    position.column >= 0 &&
    position.column < GRID_COLUMNS &&
    position.row >= 0 &&
    position.row < GRID_ROWS
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
 */
export function isCellOccupied(
  position: CombatPosition,
  squads: Squad[],
): boolean {
  return getSquadAt(position, squads) !== undefined;
}

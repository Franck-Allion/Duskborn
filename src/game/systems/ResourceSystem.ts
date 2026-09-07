import type { Tile } from '../map/GameMap';
import type { RunState } from '../core/RunState';

export const REWARDS = {
  gold: 10,
  mana: 3,
  army: 2,
} as const;

/**
 * Applies the resource reward of a tile to the current run state.
 */
export function collectResource(tile: Tile, runState: RunState): void {
  switch (tile.type) {
    case 'gold':
      runState.resources.gold += REWARDS.gold;
      break;
    case 'mana':
      runState.resources.mana += REWARDS.mana;
      break;
    case 'army':
      runState.resources.army += REWARDS.army;
      break;
    default:
      // empty or unsupported tile types grant nothing
      break;
  }
}

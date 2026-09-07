import type { RunState } from '../core/RunState';

export type TileType = 'empty' | 'gold' | 'mana';

export interface Tile {
  type: TileType;
}

export interface Position {
  x: number;
  y: number;
}

export class GameMap {
  readonly width: number;
  readonly height: number;

  private readonly tiles: Tile[][];
  private playerPosition: Position;

  constructor(width = 6, height = 6) {
    this.width = width;
    this.height = height;
    this.tiles = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => ({ type: 'empty' as const })),
    );
    this.playerPosition = {
      x: Math.floor(width / 2),
      y: Math.floor(height / 2),
    };
    // Fixed prototype layout; custom-sized maps keep their empty layout.
    if (width === 6 && height === 6) {
      this.tiles[1][1] = { type: 'gold' };
      this.tiles[3][4] = { type: 'gold' };
      this.tiles[4][1] = { type: 'mana' };
      this.tiles[1][4] = { type: 'mana' };
    }
  }

  getPlayerPosition(): Position {
    return { ...this.playerPosition };
  }

  isInside(position: Position): boolean {
    return (
      position.x >= 0 &&
      position.x < this.width &&
      position.y >= 0 &&
      position.y < this.height
    );
  }

  getTile(position: Position): Tile | undefined {
    if (!this.isInside(position)) {
      return undefined;
    }

    return this.tiles[position.y][position.x];
  }

  canMove(target: Position, runState: RunState): boolean {
    if (runState.phase !== 'exploration' || runState.actionPoints <= 0) {
      return false;
    }

    if (!this.isInside(target)) {
      return false;
    }

    const dx = Math.abs(target.x - this.playerPosition.x);
    const dy = Math.abs(target.y - this.playerPosition.y);

    // Orthogonal movement of exactly 1 tile
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
  }

  movePlayer(target: Position, runState: RunState): boolean {
    if (!this.canMove(target, runState)) {
      return false;
    }

    this.playerPosition = { ...target };
    runState.actionPoints -= 1;
    return true;
  }
}

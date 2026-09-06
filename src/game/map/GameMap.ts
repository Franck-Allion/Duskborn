export type TileType = 'empty';

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
  private readonly playerPosition: Position;

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
}

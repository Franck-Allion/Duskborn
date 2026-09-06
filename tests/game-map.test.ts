import { describe, expect, it } from 'vitest';

import { GameMap } from '../src/game/map/GameMap';

describe('GameMap', () => {
  it('creates a 6x6 map by default', () => {
    const map = new GameMap();

    expect(map.width).toBe(6);
    expect(map.height).toBe(6);

    const tiles = Array.from({ length: map.height }, (_, y) =>
      Array.from({ length: map.width }, (_, x) => map.getTile({ x, y })),
    ).flat();

    expect(tiles).toHaveLength(36);
    expect(tiles.every((tile) => tile !== undefined)).toBe(true);
  });

  it('validates coordinates inside the map', () => {
    const map = new GameMap();

    expect(map.isInside({ x: 0, y: 0 })).toBe(true);
    expect(map.isInside({ x: 5, y: 5 })).toBe(true);
    expect(map.isInside({ x: -1, y: 0 })).toBe(false);
    expect(map.isInside({ x: 6, y: 5 })).toBe(false);
  });

  it('accesses empty tiles by coordinates', () => {
    const map = new GameMap();

    expect(map.getTile({ x: 2, y: 4 })).toEqual({ type: 'empty' });
  });

  it('returns no tile for coordinates outside the map', () => {
    const map = new GameMap();

    expect(map.getTile({ x: 6, y: 0 })).toBeUndefined();
  });

  describe('Player Position', () => {
    it('starts the player at a near-central position by default (3,3)', () => {
      const map = new GameMap();
      const playerPos = map.getPlayerPosition();

      expect(playerPos).toEqual({ x: 3, y: 3 });
      expect(map.isInside(playerPos)).toBe(true);
    });

    it('starts the player at a valid near-central position for custom map sizes', () => {
      const map = new GameMap(10, 10);
      const playerPos = map.getPlayerPosition();

      expect(playerPos).toEqual({ x: 5, y: 5 });
      expect(map.isInside(playerPos)).toBe(true);
    });
  });

  describe('Movement Rules', () => {
    it('allows valid orthogonal moves of exactly one tile', () => {
      const map = new GameMap(); // Starts at (3,3)

      expect(map.canMove({ x: 3, y: 2 })).toBe(true); // Up
      expect(map.canMove({ x: 3, y: 4 })).toBe(true); // Down
      expect(map.canMove({ x: 2, y: 3 })).toBe(true); // Left
      expect(map.canMove({ x: 4, y: 3 })).toBe(true); // Right
    });

    it('rejects diagonal movement', () => {
      const map = new GameMap(); // Starts at (3,3)

      expect(map.canMove({ x: 2, y: 2 })).toBe(false); // Up-Left
      expect(map.canMove({ x: 4, y: 2 })).toBe(false); // Up-Right
      expect(map.canMove({ x: 2, y: 4 })).toBe(false); // Down-Left
      expect(map.canMove({ x: 4, y: 4 })).toBe(false); // Down-Right
    });

    it('rejects movements of more than one tile', () => {
      const map = new GameMap(); // Starts at (3,3)

      expect(map.canMove({ x: 3, y: 1 })).toBe(false); // 2 tiles Up
      expect(map.canMove({ x: 3, y: 5 })).toBe(false); // 2 tiles Down
      expect(map.canMove({ x: 1, y: 3 })).toBe(false); // 2 tiles Left
      expect(map.canMove({ x: 5, y: 3 })).toBe(false); // 2 tiles Right
    });

    it('rejects staying in the same tile (distance of 0)', () => {
      const map = new GameMap(); // Starts at (3,3)

      expect(map.canMove({ x: 3, y: 3 })).toBe(false);
    });

    it('rejects movement outside the map boundaries', () => {
      const map = new GameMap(); // Starts at (3,3)
      // Manually set player position near boundary for edge-case check
      // Move to (0,0) first, then check out-of-bounds
      map.movePlayer({ x: 2, y: 3 });
      map.movePlayer({ x: 1, y: 3 });
      map.movePlayer({ x: 0, y: 3 });
      map.movePlayer({ x: 0, y: 2 });
      map.movePlayer({ x: 0, y: 1 });
      map.movePlayer({ x: 0, y: 0 });

      expect(map.getPlayerPosition()).toEqual({ x: 0, y: 0 });
      expect(map.canMove({ x: -1, y: 0 })).toBe(false); // Left out of bounds
      expect(map.canMove({ x: 0, y: -1 })).toBe(false); // Up out of bounds
    });

    it('applies valid moves and updates player position', () => {
      const map = new GameMap(); // Starts at (3,3)

      const moved = map.movePlayer({ x: 3, y: 4 });
      expect(moved).toBe(true);
      expect(map.getPlayerPosition()).toEqual({ x: 3, y: 4 });
    });

    it('does not apply invalid moves and keeps player position unchanged', () => {
      const map = new GameMap(); // Starts at (3,3)

      const moved = map.movePlayer({ x: 5, y: 5 }); // Invalid move
      expect(moved).toBe(false);
      expect(map.getPlayerPosition()).toEqual({ x: 3, y: 3 });
    });
  });
});

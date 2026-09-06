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
});

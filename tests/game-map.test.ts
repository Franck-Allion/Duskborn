import { describe, expect, it } from 'vitest';

import { GameMap } from '../src/game/map/GameMap';

describe('GameMap', () => {
  it('creates a 6x6 map by default', () => {
    const map = new GameMap();

    expect(map.width).toBe(6);
    expect(map.height).toBe(6);
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
});

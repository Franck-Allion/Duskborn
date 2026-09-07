import { describe, expect, it } from 'vitest';

import { createInitialRunState } from '../src/game/core/RunState';
import { GameMap, type Tile } from '../src/game/map/GameMap';

describe('GameMap', () => {
  it('places exactly two Gold tiles, two Mana tiles, and two Army tiles in the fixed 6x6 layout', () => {
    const map = new GameMap();
    const goldTile: Tile = { type: 'gold' };
    const manaTile: Tile = { type: 'mana' };
    const armyTile: Tile = { type: 'army' };

    // Gold tiles
    expect(map.getTile({ x: 1, y: 1 })).toEqual(goldTile);
    expect(map.getTile({ x: 4, y: 3 })).toEqual(goldTile);

    // Mana tiles
    expect(map.getTile({ x: 1, y: 4 })).toEqual(manaTile);
    expect(map.getTile({ x: 4, y: 1 })).toEqual(manaTile);

    // Army tiles
    expect(map.getTile({ x: 2, y: 2 })).toEqual(armyTile);
    expect(map.getTile({ x: 3, y: 4 })).toEqual(armyTile);

    expect(map.getTile(map.getPlayerPosition())).toEqual({ type: 'empty' });

    const tiles = Array.from({ length: map.height }, (_, y) =>
      Array.from({ length: map.width }, (_, x) => map.getTile({ x, y })),
    ).flat();
    expect(tiles.filter((tile) => tile?.type === 'gold')).toHaveLength(2);
    expect(tiles.filter((tile) => tile?.type === 'mana')).toHaveLength(2);
    expect(tiles.filter((tile) => tile?.type === 'army')).toHaveLength(2);
    expect(tiles.filter((tile) => tile?.type === 'empty')).toHaveLength(30);
  });

  it('keeps custom-sized maps empty', () => {
    const map = new GameMap(2, 2);
    expect(map.getTile({ x: 1, y: 1 })).toEqual({ type: 'empty' });
    expect(map.width).toBe(2);
    expect(map.height).toBe(2);
  });

  it('allows movement onto Gold, grants the expected Gold resource, and leaves the tile unchanged', () => {
    const map = new GameMap();
    const runState = createInitialRunState();
    const resources = { ...runState.resources };
    const target = { x: 4, y: 3 };

    expect(map.canMove(target, runState)).toBe(true);
    expect(map.movePlayer(target, runState)).toBe(true);
    expect(map.getPlayerPosition()).toEqual(target);
    expect(runState.actionPoints).toBe(2);
    expect(runState.resources.gold).toBe(resources.gold + 10);
    expect(runState.resources.mana).toBe(resources.mana);
    expect(runState.resources.army).toBe(resources.army);
    expect(map.getTile(target)).toEqual({ type: 'gold' });
  });

  it('allows movement onto Mana, grants the expected Mana resource, and leaves the tile unchanged', () => {
    const map = new GameMap();
    const runState = createInitialRunState();
    const resources = { ...runState.resources };

    // Move step-by-step from starting position (3, 3) to Mana tile (1, 4):
    // 1. Move to (2, 3) (empty tile)
    expect(map.movePlayer({ x: 2, y: 3 }, runState)).toBe(true);
    expect(runState.resources).toEqual(resources); // no change yet

    // 2. Move to (1, 3) (empty tile)
    expect(map.movePlayer({ x: 1, y: 3 }, runState)).toBe(true);
    expect(runState.resources).toEqual(resources); // no change yet

    // 3. Move to (1, 4) (Mana tile)
    const target = { x: 1, y: 4 };
    expect(map.canMove(target, runState)).toBe(true);
    expect(map.movePlayer(target, runState)).toBe(true);

    expect(map.getPlayerPosition()).toEqual(target);
    expect(runState.actionPoints).toBe(0);
    expect(runState.resources.gold).toBe(resources.gold);
    expect(runState.resources.mana).toBe(resources.mana + 3);
    expect(runState.resources.army).toBe(resources.army);
    expect(map.getTile(target)).toEqual({ type: 'mana' });
  });

  it('allows movement onto Army, grants the expected Army resource, and leaves the tile unchanged', () => {
    const map = new GameMap();
    const runState = createInitialRunState();
    const resources = { ...runState.resources };

    // Move step-by-step from starting position (3, 3) to Army tile (2, 2):
    // 1. Move to (2, 3) (empty tile)
    expect(map.movePlayer({ x: 2, y: 3 }, runState)).toBe(true);
    expect(runState.resources).toEqual(resources); // no change yet

    // 2. Move to (2, 2) (Army tile)
    const target = { x: 2, y: 2 };
    expect(map.canMove(target, runState)).toBe(true);
    expect(map.movePlayer(target, runState)).toBe(true);

    expect(map.getPlayerPosition()).toEqual(target);
    expect(runState.actionPoints).toBe(1);
    expect(runState.resources.gold).toBe(resources.gold);
    expect(runState.resources.mana).toBe(resources.mana);
    expect(runState.resources.army).toBe(resources.army + 2);
    expect(map.getTile(target)).toEqual({ type: 'army' });
  });

  it('entering an empty tile grants nothing', () => {
    const map = new GameMap();
    const runState = createInitialRunState();
    const initialResources = { ...runState.resources };

    // Move to adjacent empty tile (2, 3)
    const success = map.movePlayer({ x: 2, y: 3 }, runState);
    expect(success).toBe(true);
    expect(runState.resources).toEqual(initialResources);
  });

  it('invalid movement grants nothing', () => {
    const map = new GameMap();
    const runState = createInitialRunState();
    const initialResources = { ...runState.resources };

    // Attempt to move to non-adjacent Gold tile (1, 1) or out of bounds
    const success1 = map.movePlayer({ x: 1, y: 1 }, runState);
    const success2 = map.movePlayer({ x: -1, y: 3 }, runState);

    expect(success1).toBe(false);
    expect(success2).toBe(false);
    expect(runState.resources).toEqual(initialResources);
  });

  it('resource collection happens only after a successful move and position update', () => {
    const map = new GameMap();
    const runState = createInitialRunState();
    const initialResources = { ...runState.resources };
    const target = { x: 4, y: 3 }; // Gold tile

    // Before move
    expect(map.getPlayerPosition()).toEqual({ x: 3, y: 3 });
    expect(runState.resources).toEqual(initialResources);

    // Perform successful move
    const success = map.movePlayer(target, runState);
    expect(success).toBe(true);

    // After move
    expect(map.getPlayerPosition()).toEqual(target);
    expect(runState.resources.gold).toBe(initialResources.gold + 10);
  });

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
      const runState = createInitialRunState();

      expect(map.canMove({ x: 3, y: 2 }, runState)).toBe(true); // Up
      expect(map.canMove({ x: 3, y: 4 }, runState)).toBe(true); // Down
      expect(map.canMove({ x: 2, y: 3 }, runState)).toBe(true); // Left
      expect(map.canMove({ x: 4, y: 3 }, runState)).toBe(true); // Right
    });

    it('rejects diagonal movement', () => {
      const map = new GameMap(); // Starts at (3,3)
      const runState = createInitialRunState();

      expect(map.canMove({ x: 2, y: 2 }, runState)).toBe(false); // Up-Left
      expect(map.canMove({ x: 4, y: 2 }, runState)).toBe(false); // Up-Right
      expect(map.canMove({ x: 2, y: 4 }, runState)).toBe(false); // Down-Left
      expect(map.canMove({ x: 4, y: 4 }, runState)).toBe(false); // Down-Right
    });

    it('rejects movements of more than one tile', () => {
      const map = new GameMap(); // Starts at (3,3)
      const runState = createInitialRunState();

      expect(map.canMove({ x: 3, y: 1 }, runState)).toBe(false); // 2 tiles Up
      expect(map.canMove({ x: 3, y: 5 }, runState)).toBe(false); // 2 tiles Down
      expect(map.canMove({ x: 1, y: 3 }, runState)).toBe(false); // 2 tiles Left
      expect(map.canMove({ x: 5, y: 3 }, runState)).toBe(false); // 2 tiles Right
    });

    it('rejects staying in the same tile (distance of 0)', () => {
      const map = new GameMap(); // Starts at (3,3)
      const runState = createInitialRunState();

      expect(map.canMove({ x: 3, y: 3 }, runState)).toBe(false);
    });

    it('rejects movement outside the map boundaries', () => {
      const map = new GameMap(); // Starts at (3,3)
      const runState = createInitialRunState();
      // Manually set player position near boundary for edge-case check
      // Move to (0,0) first, then check out-of-bounds
      map.movePlayer({ x: 2, y: 3 }, runState);
      map.movePlayer({ x: 1, y: 3 }, runState);
      map.movePlayer({ x: 0, y: 3 }, runState);

      // Reset action points so we can keep moving in tests without running out
      runState.actionPoints = 3;
      map.movePlayer({ x: 0, y: 2 }, runState);
      map.movePlayer({ x: 0, y: 1 }, runState);
      map.movePlayer({ x: 0, y: 0 }, runState);

      expect(map.getPlayerPosition()).toEqual({ x: 0, y: 0 });
      expect(map.canMove({ x: -1, y: 0 }, runState)).toBe(false); // Left out of bounds
      expect(map.canMove({ x: 0, y: -1 }, runState)).toBe(false); // Up out of bounds
    });

    it('applies valid moves and updates player position', () => {
      const map = new GameMap(); // Starts at (3,3)
      const runState = createInitialRunState();

      const moved = map.movePlayer({ x: 3, y: 4 }, runState);
      expect(moved).toBe(true);
      expect(map.getPlayerPosition()).toEqual({ x: 3, y: 4 });
    });

    it('does not apply invalid moves and keeps player position unchanged', () => {
      const map = new GameMap(); // Starts at (3,3)
      const runState = createInitialRunState();

      const moved = map.movePlayer({ x: 5, y: 5 }, runState); // Invalid move
      expect(moved).toBe(false);
      expect(map.getPlayerPosition()).toEqual({ x: 3, y: 3 });
    });

    it('valid move consumes exactly 1 action point', () => {
      const map = new GameMap();
      const runState = createInitialRunState();

      const moved = map.movePlayer({ x: 3, y: 4 }, runState);
      expect(moved).toBe(true);
      expect(runState.actionPoints).toBe(2);
    });

    it('invalid move consumes 0 action points', () => {
      const map = new GameMap();
      const runState = createInitialRunState();

      const moved = map.movePlayer({ x: 3, y: 5 }, runState);
      expect(moved).toBe(false);
      expect(runState.actionPoints).toBe(3);
    });

    it('diagonal move consumes 0 action points', () => {
      const map = new GameMap();
      const runState = createInitialRunState();

      const moved = map.movePlayer({ x: 2, y: 2 }, runState);
      expect(moved).toBe(false);
      expect(runState.actionPoints).toBe(3);
    });

    it('out-of-bounds move consumes 0 action points', () => {
      const map = new GameMap();
      const runState = createInitialRunState();

      // Consume all 3 action points to get to (0,3)
      map.movePlayer({ x: 2, y: 3 }, runState);
      map.movePlayer({ x: 1, y: 3 }, runState);
      map.movePlayer({ x: 0, y: 3 }, runState);
      expect(runState.actionPoints).toBe(0);

      // Attempt out-of-bounds left
      const moved = map.movePlayer({ x: -1, y: 3 }, runState);
      expect(moved).toBe(false);
      expect(runState.actionPoints).toBe(0);
    });

    it('movement at 0 action points is rejected and action points do not become negative', () => {
      const map = new GameMap();
      const runState = createInitialRunState();

      expect(map.movePlayer({ x: 3, y: 4 }, runState)).toBe(true);
      expect(map.movePlayer({ x: 3, y: 3 }, runState)).toBe(true);
      expect(map.movePlayer({ x: 3, y: 2 }, runState)).toBe(true);
      expect(runState.actionPoints).toBe(0);

      // Attempt 4th movement at 0 action points
      const moved = map.movePlayer({ x: 3, y: 1 }, runState);
      expect(moved).toBe(false);
      expect(map.getPlayerPosition()).toEqual({ x: 3, y: 2 });
      expect(runState.actionPoints).toBe(0);
    });

    it('two valid moves from 3 action points leave 1 action point', () => {
      const map = new GameMap();
      const runState = createInitialRunState();

      expect(map.movePlayer({ x: 3, y: 4 }, runState)).toBe(true);
      expect(map.movePlayer({ x: 3, y: 3 }, runState)).toBe(true);
      expect(runState.actionPoints).toBe(1);
    });
  });
});

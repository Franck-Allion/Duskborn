import { describe, expect, it } from 'vitest';

import { createInitialRunState } from '../src/game/core/RunState';
import { GameMap } from '../src/game/map/GameMap';
import { endDay } from '../src/game/systems/TurnSystem';

describe('End Day', () => {
  it.each([0, 1, 3, 5])(
    'ends exploration with %i actions remaining and preserves all other state',
    (actions) => {
      const runState = {
        ...createInitialRunState(),
        day: 4,
        baseActionPoints: 5,
        actionPoints: actions,
        resources: { gold: 27, mana: 8, army: 14 },
      };
      const before = structuredClone(runState);

      endDay(runState);

      expect(runState).toEqual({ ...before, phase: 'combat' });
    },
  );

  it('is safe to press twice', () => {
    const runState = createInitialRunState();
    runState.resources = { gold: 27, mana: 8, army: 14 };
    runState.actionPoints = 1;
    endDay(runState);
    const before = structuredClone(runState);

    endDay(runState);

    expect(runState).toEqual(before);
  });

  it('rejects movement during combat even with actions remaining', () => {
    const runState = createInitialRunState();
    const map = new GameMap();
    const position = map.getPlayerPosition();
    const target = { x: position.x + 1, y: position.y };
    expect(map.canMove(target, runState)).toBe(true);
    endDay(runState);

    expect(map.canMove(target, runState)).toBe(false);
    const resources = { ...runState.resources };
    const tile = { ...map.getTile(target)! };
    expect(map.movePlayer(target, runState)).toBe(false);
    expect(map.getPlayerPosition()).toEqual(position);
    expect(runState.actionPoints).toBe(3);
    expect(runState.resources).toEqual(resources);
    expect(map.getTile(target)).toEqual(tile);
  });

  it('waits for End Day after the last movement action', () => {
    const runState = createInitialRunState();
    runState.actionPoints = 1;
    const map = new GameMap();

    expect(map.movePlayer({ x: 4, y: 3 }, runState)).toBe(true);
    expect(runState.actionPoints).toBe(0);
    expect(runState.phase).toBe('exploration');
    expect(map.movePlayer({ x: 3, y: 3 }, runState)).toBe(false);
    endDay(runState);
    expect(runState.phase).toBe('combat');
    expect(runState.day).toBe(1);
    expect(runState.actionPoints).toBe(0);
  });
});

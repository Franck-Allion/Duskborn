import { describe, expect, it } from 'vitest';

import { createInitialRunState } from '../src/game/core/RunState';

describe('RunState Initialization', () => {
  it('starts a new run with 0 Gold', () => {
    expect(createInitialRunState().resources.gold).toBe(0);
  });

  it('starts a new run with 0 Mana', () => {
    expect(createInitialRunState().resources.mana).toBe(0);
  });

  it('starts a new run with 10 Army', () => {
    expect(createInitialRunState().resources.army).toBe(10);
  });

  it('creates separate resource state for each run', () => {
    const firstRun = createInitialRunState();
    const secondRun = createInitialRunState();

    expect(firstRun.resources).not.toBe(secondRun.resources);
  });

  it('starts a new run in exploration', () => {
    expect(createInitialRunState().phase).toBe('exploration');
  });

  it('starts a new run on Day 1', () => {
    const runState = createInitialRunState();
    expect(runState.day).toBe(1);
  });

  it('starts a new run with 3 base daily action points', () => {
    const runState = createInitialRunState();
    expect(runState.baseActionPoints).toBe(3);
  });

  it('starts a new run with remaining action points equal to 3', () => {
    const runState = createInitialRunState();
    expect(runState.actionPoints).toBe(3);
  });
});

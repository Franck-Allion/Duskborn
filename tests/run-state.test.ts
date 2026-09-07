import { describe, expect, it } from 'vitest';

import { createInitialRunState } from '../src/game/core/RunState';

describe('RunState Initialization', () => {
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

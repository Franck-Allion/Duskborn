export type RunPhase = 'exploration' | 'combat';

export interface RunState {
  phase: RunPhase;
  day: number;
  baseActionPoints: number;
  actionPoints: number;
}

/**
 * Creates a fresh, initial RunState for a new game run.
 */
export function createInitialRunState(): RunState {
  return {
    phase: 'exploration',
    day: 1,
    baseActionPoints: 3,
    actionPoints: 3,
  };
}

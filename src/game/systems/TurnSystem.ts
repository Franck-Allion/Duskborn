import type { RunState } from '../core/RunState';

export function endDay(runState: RunState): void {
  if (runState.phase !== 'exploration') {
    return;
  }

  runState.phase = 'combat';
}

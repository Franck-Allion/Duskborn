import type { Squad } from '../combat/Squad';

export interface UnitTypeProgression {
  unitTypeId: string;
  level: number;
  xp: number;
  unlockedAbilities: string[];
}

export type RunPhase = 'exploration' | 'combat';

export interface RunState {
  phase: RunPhase;
  day: number;
  baseActionPoints: number;
  actionPoints: number;
  resources: {
    gold: number;
    mana: number;
    army: number;
  };
  playerSquads?: Squad[];
  unitTypeProgression: Record<string, UnitTypeProgression>;
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
    resources: {
      gold: 0,
      mana: 0,
      army: 10,
    },
    unitTypeProgression: {
      guardian: {
        unitTypeId: 'guardian',
        level: 1,
        xp: 0,
        unlockedAbilities: [],
      },
      archer: {
        unitTypeId: 'archer',
        level: 1,
        xp: 0,
        unlockedAbilities: [],
      },
    },
  };
}

import type { CombatPosition } from './CombatPosition';

/** One indivisible combat entity containing all surviving soldiers of one unit type. */
export interface Squad {
  readonly unitTypeId: string;
  /** Surviving soldiers, including the partially damaged soldier if present. */
  count: number;
  /** HP remaining on the one partially damaged soldier; null when none is damaged. */
  damagedUnitHp: number | null;
  /** Logical combat cell; null until deployed. */
  position: CombatPosition | null;
}

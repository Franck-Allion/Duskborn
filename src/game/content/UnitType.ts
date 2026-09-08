export interface UnitType {
  readonly id: string;
  readonly name: string;
  readonly hpPerUnit: number;
  readonly baseDamage: number;
  readonly abilities: readonly string[];
}

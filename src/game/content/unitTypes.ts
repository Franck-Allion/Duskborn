import type { UnitType } from './UnitType';

/** Initial MVP balance; Strike is an ability ID, with behavior defined later. */
export const GUARDIAN: UnitType = {
  id: 'guardian',
  name: 'Guardian',
  hpPerUnit: 10,
  baseDamage: 4,
  abilities: ['guardian-strike', 'guardian-shield-wall'],
};

/** Initial MVP balance; Shot is an ability ID, with behavior defined later. */
export const ARCHER: UnitType = {
  id: 'archer',
  name: 'Archer',
  hpPerUnit: 6,
  baseDamage: 5,
  abilities: ['archer-shot', 'archer-power-shot'],
};

/** Initial MVP balance; Brute Strike is an ability ID, with behavior defined later. */
export const DUSKBORN_BRUTE: UnitType = {
  id: 'duskborn-brute',
  name: 'Duskborn Brute',
  hpPerUnit: 8,
  baseDamage: 6,
  abilities: ['duskborn-brute-strike'],
};

/** Initial MVP balance; Dusk Shot is an ability ID, with behavior defined later. */
export const DUSKBORN_ARCHER: UnitType = {
  id: 'duskborn-archer',
  name: 'Duskborn Archer',
  hpPerUnit: 5,
  baseDamage: 5,
  abilities: ['duskborn-archer-shot'],
};

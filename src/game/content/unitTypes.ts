import type { UnitType } from './UnitType';

/** Initial MVP balance; Strike is an ability ID only, with behavior defined later. */
export const GUARDIAN: UnitType = {
  id: 'guardian',
  name: 'Guardian',
  hpPerUnit: 10,
  baseDamage: 4,
  abilities: ['strike'],
};

/** Initial MVP balance; Shot is an ability ID only, with behavior defined later. */
export const ARCHER: UnitType = {
  id: 'archer',
  name: 'Archer',
  hpPerUnit: 6,
  baseDamage: 5,
  abilities: ['shot'],
};

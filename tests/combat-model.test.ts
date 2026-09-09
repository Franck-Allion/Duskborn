import { describe, expect, it } from 'vitest';

import {
  GRID_COLUMNS,
  GRID_ROWS,
  isInsideGrid,
  getSquadAt,
  isCellOccupied,
} from '../src/game/combat/CombatGrid';
import type { CombatPosition } from '../src/game/combat/CombatPosition';
import type { CombatState } from '../src/game/combat/CombatState';
import type { Squad } from '../src/game/combat/Squad';
import {
  ARCHER,
  DUSKBORN_ARCHER,
  DUSKBORN_BRUTE,
  GUARDIAN,
} from '../src/game/content/unitTypes';

describe('Combat Model Data structures', () => {
  it('defines Guardian with its initial content values', () => {
    expect(GUARDIAN).toEqual({
      id: 'guardian',
      name: 'Guardian',
      hpPerUnit: 10,
      baseDamage: 4,
      abilities: ['strike'],
    });
  });

  it('defines Archer with its initial content values', () => {
    expect(ARCHER).toEqual({
      id: 'archer',
      name: 'Archer',
      hpPerUnit: 6,
      baseDamage: 5,
      abilities: ['shot'],
    });
  });

  it('defines Duskborn Brute with its initial content values', () => {
    expect(DUSKBORN_BRUTE).toEqual({
      id: 'duskborn-brute',
      name: 'Duskborn Brute',
      hpPerUnit: 8,
      baseDamage: 6,
      abilities: ['strike'],
    });
  });

  it('defines Duskborn Archer with its initial content values', () => {
    expect(DUSKBORN_ARCHER).toEqual({
      id: 'duskborn-archer',
      name: 'Duskborn Archer',
      hpPerUnit: 5,
      baseDamage: 5,
      abilities: ['shot'],
    });
  });

  it('correctly models a Squad representation with count, health, and positions', () => {
    const position: CombatPosition = { column: 2, row: 1 };
    const squad: Squad = {
      unitTypeId: 'guardian',
      count: 6,
      damagedUnitHp: 7,
      position,
    };

    expect(squad.unitTypeId).toBe('guardian');
    expect(squad.count).toBe(6);
    expect(squad.damagedUnitHp).toBe(7);
    expect(squad.position).toEqual({ column: 2, row: 1 });
  });

  it('models CombatPosition with standard cell coordinates', () => {
    const pos: CombatPosition = { column: 0, row: 0 };
    expect(pos.column).toBe(0);
    expect(pos.row).toBe(0);
  });

  it('models CombatState simultaneously representing players, enemies, and hero HPs', () => {
    const playerSquad: Squad = {
      unitTypeId: 'guardian',
      count: 8,
      damagedUnitHp: null,
      position: { column: 0, row: 0 },
    };

    const enemySquad: Squad = {
      unitTypeId: 'duskborn_grunt',
      count: 5,
      damagedUnitHp: 3,
      position: { column: 5, row: 3 },
    };

    const combatState: CombatState = {
      playerSquads: [playerSquad],
      enemySquads: [enemySquad],
      playerHeroHp: 100,
      enemyHeroHp: 80,
    };

    expect(combatState.playerSquads).toHaveLength(1);
    expect(combatState.playerSquads[0].unitTypeId).toBe('guardian');
    expect(combatState.enemySquads).toHaveLength(1);
    expect(combatState.enemySquads[0].unitTypeId).toBe('duskborn_grunt');
    expect(combatState.playerHeroHp).toBe(100);
    expect(combatState.enemyHeroHp).toBe(80);
  });

  describe('CombatGrid helpers', () => {
    it('defines standard grid dimensions', () => {
      expect(GRID_COLUMNS).toBe(6);
      expect(GRID_ROWS).toBe(4);
    });

    it('checks boundaries with isInsideGrid', () => {
      expect(isInsideGrid({ column: 0, row: 0 })).toBe(true);
      expect(isInsideGrid({ column: 5, row: 3 })).toBe(true);
      expect(isInsideGrid({ column: -1, row: 0 })).toBe(false);
      expect(isInsideGrid({ column: 6, row: 0 })).toBe(false);
      expect(isInsideGrid({ column: 0, row: -1 })).toBe(false);
      expect(isInsideGrid({ column: 0, row: 4 })).toBe(false);
    });

    it('handles squad lookup and occupancy checks correctly', () => {
      const activeSquad: Squad = {
        unitTypeId: 'guardian',
        count: 8,
        damagedUnitHp: null,
        position: { column: 2, row: 2 },
      };
      const inactiveSquad: Squad = {
        unitTypeId: 'archer',
        count: 4,
        damagedUnitHp: null,
        position: null,
      };

      const squads = [activeSquad, inactiveSquad];

      expect(getSquadAt({ column: 2, row: 2 }, squads)).toBe(activeSquad);
      expect(isCellOccupied({ column: 2, row: 2 }, squads)).toBe(true);

      expect(getSquadAt({ column: 0, row: 0 }, squads)).toBeUndefined();
      expect(isCellOccupied({ column: 0, row: 0 }, squads)).toBe(false);
    });
  });
});

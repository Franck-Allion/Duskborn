import { describe, expect, it } from 'vitest';

import {
  GRID_COLUMNS,
  GRID_ROWS,
  isInsideGrid,
  getSquadAt,
  isCellOccupied,
  isPlayerDeploymentPosition,
  isEnemyDeploymentPosition,
  isValidCombatPosition,
  isCombatPositionOccupied,
  canPlaceSquadAtPosition,
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

    it('checks logical validity with isValidCombatPosition', () => {
      // Valid corners
      expect(isValidCombatPosition({ column: 0, row: 0 })).toBe(true);
      expect(isValidCombatPosition({ column: 5, row: 0 })).toBe(true);
      expect(isValidCombatPosition({ column: 0, row: 3 })).toBe(true);
      expect(isValidCombatPosition({ column: 5, row: 3 })).toBe(true);

      // Invalid columns
      expect(isValidCombatPosition({ column: -1, row: 0 })).toBe(false);
      expect(isValidCombatPosition({ column: 6, row: 0 })).toBe(false);

      // Invalid rows
      expect(isValidCombatPosition({ column: 0, row: -1 })).toBe(false);
      expect(isValidCombatPosition({ column: 0, row: 4 })).toBe(false);

      // Non-integer coordinates
      expect(isValidCombatPosition({ column: 1.5, row: 2 })).toBe(false);
      expect(isValidCombatPosition({ column: 1, row: 2.5 })).toBe(false);
    });

    it('defines player deployment zone with isPlayerDeploymentPosition', () => {
      expect(isPlayerDeploymentPosition({ column: 0, row: 2 })).toBe(true);
      expect(isPlayerDeploymentPosition({ column: 5, row: 2 })).toBe(true);
      expect(isPlayerDeploymentPosition({ column: 0, row: 3 })).toBe(true);
      expect(isPlayerDeploymentPosition({ column: 5, row: 3 })).toBe(true);

      expect(isPlayerDeploymentPosition({ column: 0, row: 0 })).toBe(false);
      expect(isPlayerDeploymentPosition({ column: 0, row: 1 })).toBe(false);
      expect(isPlayerDeploymentPosition({ column: -1, row: 2 })).toBe(false);
      expect(isPlayerDeploymentPosition({ column: 6, row: 2 })).toBe(false);
      expect(isPlayerDeploymentPosition({ column: 99, row: 2 })).toBe(false);
      expect(isPlayerDeploymentPosition({ column: 1.5, row: 2 })).toBe(false);
    });

    it('defines enemy deployment zone with isEnemyDeploymentPosition', () => {
      expect(isEnemyDeploymentPosition({ column: 0, row: 0 })).toBe(true);
      expect(isEnemyDeploymentPosition({ column: 5, row: 0 })).toBe(true);
      expect(isEnemyDeploymentPosition({ column: 0, row: 1 })).toBe(true);
      expect(isEnemyDeploymentPosition({ column: 5, row: 1 })).toBe(true);

      expect(isEnemyDeploymentPosition({ column: 0, row: 2 })).toBe(false);
      expect(isEnemyDeploymentPosition({ column: 0, row: 3 })).toBe(false);
      expect(isEnemyDeploymentPosition({ column: -1, row: 0 })).toBe(false);
      expect(isEnemyDeploymentPosition({ column: 6, row: 0 })).toBe(false);
      expect(isEnemyDeploymentPosition({ column: 99, row: 0 })).toBe(false);
      expect(isEnemyDeploymentPosition({ column: 1.5, row: 0 })).toBe(false);
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
      expect(isCombatPositionOccupied({ column: 2, row: 2 }, squads)).toBe(
        true,
      );
      expect(canPlaceSquadAtPosition({ column: 2, row: 2 }, squads)).toBe(
        false,
      );

      expect(getSquadAt({ column: 3, row: 2 }, squads)).toBeUndefined();
      expect(isCellOccupied({ column: 3, row: 2 }, squads)).toBe(false);
      expect(isCombatPositionOccupied({ column: 3, row: 2 }, squads)).toBe(
        false,
      );
      expect(canPlaceSquadAtPosition({ column: 3, row: 2 }, squads)).toBe(true);

      expect(getSquadAt({ column: 2, row: 3 }, squads)).toBeUndefined();
      expect(isCellOccupied({ column: 2, row: 3 }, squads)).toBe(false);
      expect(isCombatPositionOccupied({ column: 2, row: 3 }, squads)).toBe(
        false,
      );
      expect(canPlaceSquadAtPosition({ column: 2, row: 3 }, squads)).toBe(true);

      // Null position squad does not occupy any cell
      expect(
        isCombatPositionOccupied({ column: 0, row: 0 }, [inactiveSquad]),
      ).toBe(false);
      expect(
        canPlaceSquadAtPosition({ column: 0, row: 0 }, [inactiveSquad]),
      ).toBe(true);

      // Invalid positions are not valid placement destinations
      expect(isCombatPositionOccupied({ column: 99, row: 2 }, squads)).toBe(
        false,
      );
      expect(canPlaceSquadAtPosition({ column: 99, row: 2 }, squads)).toBe(
        false,
      );
    });

    it('enforces perfect zone partition (every valid cell belongs to exactly one side)', () => {
      for (let row = 0; row < GRID_ROWS; row += 1) {
        for (let col = 0; col < GRID_COLUMNS; col += 1) {
          const pos = { column: col, row };
          const isPlayer = isPlayerDeploymentPosition(pos);
          const isEnemy = isEnemyDeploymentPosition(pos);

          // XOR: must belong to exactly one side, never both, never none
          expect(isPlayer !== isEnemy).toBe(true);
        }
      }
    });

    it('preserves canonical orientation and row semantics', () => {
      // Row 0 = Enemy Back, Row 1 = Enemy Front
      // Row 2 = Player Front, Row 3 = Player Back
      const posRow0 = { column: 0, row: 0 };
      const posRow1 = { column: 0, row: 1 };
      const posRow2 = { column: 0, row: 2 };
      const posRow3 = { column: 0, row: 3 };

      expect(isEnemyDeploymentPosition(posRow0)).toBe(true);
      expect(isEnemyDeploymentPosition(posRow1)).toBe(true);
      expect(isPlayerDeploymentPosition(posRow2)).toBe(true);
      expect(isPlayerDeploymentPosition(posRow3)).toBe(true);

      expect(isPlayerDeploymentPosition(posRow0)).toBe(false);
      expect(isPlayerDeploymentPosition(posRow1)).toBe(false);
      expect(isEnemyDeploymentPosition(posRow2)).toBe(false);
      expect(isEnemyDeploymentPosition(posRow3)).toBe(false);
    });
  });
});

import { describe, expect, it } from 'vitest';

import type { CombatPosition } from '../src/game/combat/CombatPosition';
import type { CombatState } from '../src/game/combat/CombatState';
import type { Squad } from '../src/game/combat/Squad';
import type { UnitType } from '../src/game/content/UnitType';

describe('Combat Model Data structures', () => {
  it('correctly models a UnitType with base characteristics', () => {
    const guardianType: UnitType = {
      id: 'guardian',
      name: 'Guardian',
      hpPerUnit: 10,
      baseDamage: 4,
      abilities: ['shield_wall'],
    };

    expect(guardianType.id).toBe('guardian');
    expect(guardianType.name).toBe('Guardian');
    expect(guardianType.hpPerUnit).toBe(10);
    expect(guardianType.baseDamage).toBe(4);
    expect(guardianType.abilities).toEqual(['shield_wall']);
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
});

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
  isValidPlayerPlacement,
  deployEnemySquads,
} from '../src/game/combat/CombatGrid';
import type { CombatPosition } from '../src/game/combat/CombatPosition';
import {
  type CombatState,
  hasDuplicateUnitTypes,
  isValidCombatState,
  isDeploymentValid,
} from '../src/game/combat/CombatState';
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
      deploymentConfirmed: false,
    };

    expect(combatState.playerSquads).toHaveLength(1);
    expect(combatState.playerSquads[0].unitTypeId).toBe('guardian');
    expect(combatState.enemySquads).toHaveLength(1);
    expect(combatState.enemySquads[0].unitTypeId).toBe('duskborn_grunt');
    expect(combatState.playerHeroHp).toBe(100);
    expect(combatState.enemyHeroHp).toBe(80);
    expect(combatState.deploymentConfirmed).toBe(false);

    // Can transition deploymentConfirmed to true
    combatState.deploymentConfirmed = true;
    expect(combatState.deploymentConfirmed).toBe(true);
  });

  it('enforces one squad per unit type on each side using hasDuplicateUnitTypes', () => {
    const guardianSquad: Squad = {
      unitTypeId: 'guardian',
      count: 8,
      damagedUnitHp: null,
      position: { column: 0, row: 2 },
    };

    const archerSquad: Squad = {
      unitTypeId: 'archer',
      count: 3,
      damagedUnitHp: null,
      position: { column: 1, row: 2 },
    };

    // Valid: different unit types
    expect(hasDuplicateUnitTypes([guardianSquad, archerSquad])).toBe(false);

    // Invalid: duplicate unit types
    const secondGuardianSquad: Squad = {
      unitTypeId: 'guardian',
      count: 4,
      damagedUnitHp: 10,
      position: { column: 2, row: 3 },
    };
    expect(hasDuplicateUnitTypes([guardianSquad, secondGuardianSquad])).toBe(
      true,
    );

    // Symmetrical validation of CombatState
    const state: CombatState = {
      playerSquads: [guardianSquad, archerSquad],
      enemySquads: [
        {
          unitTypeId: 'duskborn-brute',
          count: 2,
          damagedUnitHp: null,
          position: null,
        },
      ],
      playerHeroHp: 100,
      enemyHeroHp: 100,
      deploymentConfirmed: false,
    };
    expect(isValidCombatState(state)).toBe(true);

    // Duplicate player side
    const invalidPlayerState: CombatState = {
      ...state,
      playerSquads: [guardianSquad, secondGuardianSquad],
    };
    expect(isValidCombatState(invalidPlayerState)).toBe(false);

    // Duplicate enemy side
    const invalidEnemyState: CombatState = {
      ...state,
      enemySquads: [
        {
          unitTypeId: 'duskborn-brute',
          count: 1,
          damagedUnitHp: null,
          position: null,
        },
        {
          unitTypeId: 'duskborn-brute',
          count: 3,
          damagedUnitHp: null,
          position: null,
        },
      ],
    };
    expect(isValidCombatState(invalidEnemyState)).toBe(false);
  });

  it('preserves squad integrity and prevents squad splitting during deployment', () => {
    // 1. Initial state: squad has count=8, position=null, damagedUnitHp=null
    const squad: Squad = {
      unitTypeId: 'guardian',
      count: 8,
      damagedUnitHp: null,
      position: null,
    };

    // 2. Deploy to cell: position becomes (2,2). count, unitTypeId and damagedUnitHp must be preserved.
    squad.position = { column: 2, row: 2 };
    expect(squad.count).toBe(8);
    expect(squad.unitTypeId).toBe('guardian');
    expect(squad.damagedUnitHp).toBeNull();
    expect(squad.position).toEqual({ column: 2, row: 2 });

    // 3. Reposition to another cell: position becomes (3,3). count, unitTypeId and damagedUnitHp are preserved.
    squad.position = { column: 3, row: 3 };
    expect(squad.count).toBe(8);
    expect(squad.unitTypeId).toBe('guardian');
    expect(squad.damagedUnitHp).toBeNull();
    expect(squad.position).toEqual({ column: 3, row: 3 });

    // 4. Reposition with partial HP: squad has count=6, damagedUnitHp=7
    const injuredSquad: Squad = {
      unitTypeId: 'archer',
      count: 6,
      damagedUnitHp: 7,
      position: { column: 1, row: 2 },
    };

    // Reposition to (5,3)
    injuredSquad.position = { column: 5, row: 3 };
    expect(injuredSquad.count).toBe(6);
    expect(injuredSquad.unitTypeId).toBe('archer');
    expect(injuredSquad.damagedUnitHp).toBe(7);
    expect(injuredSquad.position).toEqual({ column: 5, row: 3 });
  });

  it('validates entire deployment state with isDeploymentValid', () => {
    // Legally positioned player squad (row 2)
    const playerSquad: Squad = {
      unitTypeId: 'guardian',
      count: 8,
      damagedUnitHp: null,
      position: { column: 2, row: 2 },
    };

    // Legally positioned enemy squad (row 1)
    const enemySquad: Squad = {
      unitTypeId: 'brute',
      count: 5,
      damagedUnitHp: null,
      position: { column: 3, row: 1 },
    };

    const state: CombatState = {
      playerSquads: [playerSquad],
      enemySquads: [enemySquad],
      playerHeroHp: 100,
      enemyHeroHp: 100,
      deploymentConfirmed: false,
    };

    // 1. All positioned legally => valid
    expect(isDeploymentValid(state)).toBe(true);

    // 2. Unpositioned active player squad => invalid
    const unpositionedPlayer: Squad = {
      unitTypeId: 'archer',
      count: 3,
      damagedUnitHp: null,
      position: null,
    };
    const stateWithUnplaced = {
      ...state,
      playerSquads: [playerSquad, unpositionedPlayer],
    };
    expect(isDeploymentValid(stateWithUnplaced)).toBe(false);

    // 3. Unpositioned DEAD player squad (count <= 0) => does NOT block validation
    const deadPlayer: Squad = {
      unitTypeId: 'archer',
      count: 0,
      damagedUnitHp: null,
      position: null,
    };
    const stateWithDead = {
      ...state,
      playerSquads: [playerSquad, deadPlayer],
    };
    expect(isDeploymentValid(stateWithDead)).toBe(true);

    // 4. Player squad in enemy deployment zone (row 1) => invalid
    const playerInEnemyZone: Squad = {
      unitTypeId: 'guardian',
      count: 8,
      damagedUnitHp: null,
      position: { column: 2, row: 1 },
    };
    const statePlayerInEnemyZone = {
      ...state,
      playerSquads: [playerInEnemyZone],
    };
    expect(isDeploymentValid(statePlayerInEnemyZone)).toBe(false);

    // 5. Enemy squad in player deployment zone (row 2) => invalid
    const enemyInPlayerZone: Squad = {
      unitTypeId: 'brute',
      count: 5,
      damagedUnitHp: null,
      position: { column: 3, row: 2 },
    };
    const stateEnemyInPlayerZone = {
      ...state,
      enemySquads: [enemyInPlayerZone],
    };
    expect(isDeploymentValid(stateEnemyInPlayerZone)).toBe(false);

    // 6. Duplicate cell occupancy (e.g. player and enemy squad on same cell) => invalid
    const overlappingEnemy: Squad = {
      unitTypeId: 'brute',
      count: 5,
      damagedUnitHp: null,
      position: { column: 2, row: 2 }, // overlaps playerSquad
    };
    const stateOverlapping = {
      ...state,
      enemySquads: [overlappingEnemy],
    };
    expect(isDeploymentValid(stateOverlapping)).toBe(false);
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

    it('validates player placement correctly with isValidPlayerPlacement', () => {
      const squad0: Squad = {
        unitTypeId: 'guardian',
        count: 8,
        damagedUnitHp: null,
        position: { column: 2, row: 2 },
      };
      const squad1: Squad = {
        unitTypeId: 'archer',
        count: 4,
        damagedUnitHp: null,
        position: null,
      };

      const playerSquads = [squad0, squad1];

      // 1. Valid player deployment cells are accepted (rows 2 and 3)
      expect(
        isValidPlayerPlacement({ column: 0, row: 2 }, playerSquads, 1),
      ).toBe(true);
      expect(
        isValidPlayerPlacement({ column: 5, row: 3 }, playerSquads, 1),
      ).toBe(true);

      // 2. Reject placing on occupied cells by other squads
      expect(
        isValidPlayerPlacement({ column: 2, row: 2 }, playerSquads, 1),
      ).toBe(false);

      // 3. Allow placing currently moving squad on its own current cell (no self-collision)
      expect(
        isValidPlayerPlacement({ column: 2, row: 2 }, playerSquads, 0),
      ).toBe(true);

      // 4. Reject placing in enemy deployment zone (rows 0 and 1)
      expect(
        isValidPlayerPlacement({ column: 0, row: 1 }, playerSquads, 1),
      ).toBe(false);
      expect(
        isValidPlayerPlacement({ column: 5, row: 0 }, playerSquads, 1),
      ).toBe(false);

      // 5. Reject invalid coordinate bounds
      expect(
        isValidPlayerPlacement({ column: 99, row: 2 }, playerSquads, 1),
      ).toBe(false);
      expect(
        isValidPlayerPlacement({ column: 1.5, row: 2 }, playerSquads, 1),
      ).toBe(false);
    });

    it('deploys enemy squads deterministically, front-row first, left-to-right', () => {
      // 1. One squad: gets placed at (0, 1)
      const squads1: Squad[] = [
        { unitTypeId: 'brute', count: 1, damagedUnitHp: null, position: null },
      ];
      const res1 = deployEnemySquads(squads1);
      expect(res1[0].position).toEqual({ column: 0, row: 1 });

      // 2. Two squads: get placed at (0, 1) and (1, 1)
      const squads2: Squad[] = [
        { unitTypeId: 'brute', count: 1, damagedUnitHp: null, position: null },
        { unitTypeId: 'archer', count: 1, damagedUnitHp: null, position: null },
      ];
      const res2 = deployEnemySquads(squads2);
      expect(res2[0].position).toEqual({ column: 0, row: 1 });
      expect(res2[1].position).toEqual({ column: 1, row: 1 });

      // 3. Six squads: fill row 1 (Enemy Front) completely
      const squads6 = Array.from({ length: 6 }, (_, i) => ({
        unitTypeId: `enemy-${i}`,
        count: 1,
        damagedUnitHp: null,
        position: null,
      }));
      const res6 = deployEnemySquads(squads6);
      for (let i = 0; i < 6; i += 1) {
        expect(res6[i].position).toEqual({ column: i, row: 1 });
      }

      // 4. Seven squads: seventh squad wraps onto row 0 (Enemy Back)
      const squads7 = Array.from({ length: 7 }, (_, i) => ({
        unitTypeId: `enemy-${i}`,
        count: 1,
        damagedUnitHp: null,
        position: null,
      }));
      const res7 = deployEnemySquads(squads7);
      for (let i = 0; i < 6; i += 1) {
        expect(res7[i].position).toEqual({ column: i, row: 1 });
      }
      expect(res7[6].position).toEqual({ column: 0, row: 0 });

      // 5. Running twice produces the exact same deterministic output
      const res7_again = deployEnemySquads(squads7);
      expect(res7).toEqual(res7_again);

      // 6. Preserves existing valid positions
      const prePositioned: Squad[] = [
        {
          unitTypeId: 'pre',
          count: 1,
          damagedUnitHp: null,
          position: { column: 3, row: 1 },
        },
        {
          unitTypeId: 'unplaced',
          count: 1,
          damagedUnitHp: null,
          position: null,
        },
      ];
      const resPre = deployEnemySquads(prePositioned);
      expect(resPre[0].position).toEqual({ column: 3, row: 1 }); // unchanged
      expect(resPre[1].position).toEqual({ column: 0, row: 1 }); // first available empty slot
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

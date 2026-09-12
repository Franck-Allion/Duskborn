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
  getDepthPosition,
  getSquadDepthCategory,
  getHorizontalPosition,
  getSquadHorizontalCategory,
  getLaneForPosition,
  getSquadLane,
  getOpposingSquadsInLane,
  selectLaneTarget,
} from '../src/game/combat/CombatGrid';
import type { CombatPosition } from '../src/game/combat/CombatPosition';
import {
  type CombatState,
  hasDuplicateUnitTypes,
  isValidCombatState,
  isDeploymentValid,
  beginTurn,
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
      activeSide: 'player',
      turn: 1,
      phase: 'TURN_START',
    };

    expect(combatState.playerSquads).toHaveLength(1);
    expect(combatState.playerSquads[0].unitTypeId).toBe('guardian');
    expect(combatState.enemySquads).toHaveLength(1);
    expect(combatState.enemySquads[0].unitTypeId).toBe('duskborn_grunt');
    expect(combatState.playerHeroHp).toBe(100);
    expect(combatState.enemyHeroHp).toBe(80);
    expect(combatState.deploymentConfirmed).toBe(false);
    expect(combatState.activeSide).toBe('player');
    expect(combatState.turn).toBe(1);
    expect(combatState.phase).toBe('TURN_START');

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
      activeSide: 'player',
      turn: 1,
      phase: 'TURN_START',
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
      activeSide: 'player',
      turn: 1,
      phase: 'TURN_START',
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

  it('handles complete representative valid deployment, confirmation, and post-confirmation lock', () => {
    // 1. Initial State: Player has unplaced squads, Enemy has unplaced squads
    const playerSquad0: Squad = {
      unitTypeId: 'guardian',
      count: 8,
      damagedUnitHp: null,
      position: null,
    };
    const playerSquad1: Squad = {
      unitTypeId: 'archer',
      count: 3,
      damagedUnitHp: null,
      position: null,
    };

    const initialEnemySquads: Squad[] = [
      {
        unitTypeId: 'duskborn-brute',
        count: 4,
        damagedUnitHp: null,
        position: null,
      },
      {
        unitTypeId: 'duskborn-archer',
        count: 2,
        damagedUnitHp: null,
        position: null,
      },
    ];

    const state: CombatState = {
      playerSquads: [playerSquad0, playerSquad1],
      enemySquads: deployEnemySquads(initialEnemySquads), // deployed deterministically
      playerHeroHp: 100,
      enemyHeroHp: 100,
      deploymentConfirmed: false,
      activeSide: 'player',
      turn: 1,
      phase: 'TURN_START',
    };

    // Before placing player squads, deployment must be invalid
    expect(isDeploymentValid(state)).toBe(false);

    // 2. Player deploys squads legally
    // Place Squad 0 at (2, 2) and Squad 1 at (4, 3)
    const target0 = { column: 2, row: 2 };
    const target1 = { column: 4, row: 3 };

    expect(isValidPlayerPlacement(target0, state.playerSquads, 0)).toBe(true);
    state.playerSquads[0].position = target0;

    expect(isValidPlayerPlacement(target1, state.playerSquads, 1)).toBe(true);
    state.playerSquads[1].position = target1;

    // Now all squads are legally positioned: player rows 2-3, enemy rows 0-1, no overlaps
    expect(isDeploymentValid(state)).toBe(true);

    // 3. Confirm Deployment succeeds
    state.deploymentConfirmed = true;
    expect(state.deploymentConfirmed).toBe(true);

    // 4. Post-confirmation lock: any attempts to reposition squads must be ignored/locked
    const attemptReposition = { column: 0, row: 2 };
    if (!state.deploymentConfirmed) {
      state.playerSquads[0].position = attemptReposition;
    }
    // Logical position remains exactly target0, unchanged!
    expect(state.playerSquads[0].position).toEqual(target0);
  });

  describe('Combat turn state and transition rules', () => {
    it('initializes combat state deterministically with the player active, turn 1, and phase TURN_START', () => {
      const state: CombatState = {
        playerSquads: [],
        enemySquads: [],
        playerHeroHp: 100,
        enemyHeroHp: 100,
        deploymentConfirmed: false,
        activeSide: 'player',
        turn: 1,
        phase: 'TURN_START',
      };

      expect(state.activeSide).toBe('player');
      expect(state.turn).toBe(1);
      expect(state.phase).toBe('TURN_START');
    });

    it('transitions successfully from TURN_START to DEPLOYMENT on beginTurn', () => {
      const state: CombatState = {
        playerSquads: [],
        enemySquads: [],
        playerHeroHp: 100,
        enemyHeroHp: 100,
        deploymentConfirmed: false,
        activeSide: 'player',
        turn: 1,
        phase: 'TURN_START',
      };

      const success = beginTurn(state);
      expect(success).toBe(true);
      expect(state.phase).toBe('DEPLOYMENT');
      expect(state.turn).toBe(1); // turn does not increment yet
    });

    it('rejects beginTurn transition and leaves state unchanged if current phase is not TURN_START', () => {
      const state: CombatState = {
        playerSquads: [],
        enemySquads: [],
        playerHeroHp: 100,
        enemyHeroHp: 100,
        deploymentConfirmed: false,
        activeSide: 'player',
        turn: 1,
        phase: 'DEPLOYMENT', // Not TURN_START
      };

      const success = beginTurn(state);
      expect(success).toBe(false);
      expect(state.phase).toBe('DEPLOYMENT'); // unchanged
    });
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

    it('detects depth positions (FRONT vs BACK) symmetrically and rejects invalid or cross-side coordinates', () => {
      // 1. Symmetrical depth detection
      // Player
      expect(getDepthPosition({ column: 0, row: 2 }, 'player')).toBe('FRONT');
      expect(getDepthPosition({ column: 5, row: 2 }, 'player')).toBe('FRONT');
      expect(getDepthPosition({ column: 0, row: 3 }, 'player')).toBe('BACK');
      expect(getDepthPosition({ column: 5, row: 3 }, 'player')).toBe('BACK');

      // Enemy
      expect(getDepthPosition({ column: 0, row: 1 }, 'enemy')).toBe('FRONT');
      expect(getDepthPosition({ column: 5, row: 1 }, 'enemy')).toBe('FRONT');
      expect(getDepthPosition({ column: 0, row: 0 }, 'enemy')).toBe('BACK');
      expect(getDepthPosition({ column: 5, row: 0 }, 'enemy')).toBe('BACK');

      // 2. Reject invalid coordinates
      expect(getDepthPosition({ column: -1, row: 2 }, 'player')).toBeNull();
      expect(getDepthPosition({ column: 6, row: 2 }, 'player')).toBeNull();
      expect(getDepthPosition({ column: 0, row: -1 }, 'player')).toBeNull();
      expect(getDepthPosition({ column: 0, row: 4 }, 'player')).toBeNull();
      expect(getDepthPosition({ column: 1.5, row: 2 }, 'player')).toBeNull();

      // 3. Reject cross-side zone mismatches
      expect(getDepthPosition({ column: 0, row: 1 }, 'player')).toBeNull(); // player in enemy row
      expect(getDepthPosition({ column: 0, row: 2 }, 'enemy')).toBeNull(); // enemy in player row

      // 4. Squad-level helper checks
      const placedPlayer: Squad = {
        unitTypeId: 'guardian',
        count: 8,
        damagedUnitHp: null,
        position: { column: 3, row: 2 },
      };
      const unplacedPlayer: Squad = {
        unitTypeId: 'archer',
        count: 3,
        damagedUnitHp: null,
        position: null,
      };

      expect(getSquadDepthCategory(placedPlayer, 'player')).toBe('FRONT');
      expect(getSquadDepthCategory(unplacedPlayer, 'player')).toBeNull();
    });

    it('detects horizontal positions (EDGE vs CENTER) and rejects invalid or unpositioned states', () => {
      // 1. Table-driven check across all 6 columns (for row 2, player side)
      const expectedHorizontal = [
        'EDGE',
        'CENTER',
        'CENTER',
        'CENTER',
        'CENTER',
        'EDGE',
      ] as const;
      for (let col = 0; col < GRID_COLUMNS; col += 1) {
        expect(getHorizontalPosition({ column: col, row: 2 })).toBe(
          expectedHorizontal[col],
        );
      }

      // 2. Row does not affect horizontal categorization
      expect(getHorizontalPosition({ column: 0, row: 0 })).toBe('EDGE');
      expect(getHorizontalPosition({ column: 3, row: 0 })).toBe('CENTER');
      expect(getHorizontalPosition({ column: 5, row: 1 })).toBe('EDGE');
      expect(getHorizontalPosition({ column: 2, row: 3 })).toBe('CENTER');

      // 3. Reject invalid coordinates
      expect(getHorizontalPosition({ column: -1, row: 2 })).toBeNull();
      expect(getHorizontalPosition({ column: 6, row: 2 })).toBeNull();
      expect(getHorizontalPosition({ column: 0, row: -1 })).toBeNull();
      expect(getHorizontalPosition({ column: 0, row: 4 })).toBeNull();
      expect(getHorizontalPosition({ column: 1.5, row: 2 })).toBeNull();

      // 4. Squad-level helper checks
      const placedPlayer: Squad = {
        unitTypeId: 'guardian',
        count: 8,
        damagedUnitHp: null,
        position: { column: 5, row: 3 },
      };
      const unplacedPlayer: Squad = {
        unitTypeId: 'archer',
        count: 3,
        damagedUnitHp: null,
        position: null,
      };

      expect(getSquadHorizontalCategory(placedPlayer)).toBe('EDGE');
      expect(getSquadHorizontalCategory(unplacedPlayer)).toBeNull();
    });

    it('identifies logical combat lanes and rejects invalid or unpositioned states', () => {
      // 1. Table-driven check covering all six columns
      for (let col = 0; col < GRID_COLUMNS; col += 1) {
        expect(getLaneForPosition({ column: col, row: 2 })).toBe(col);
      }

      // 2. Row independence: Y row does not affect lane index
      expect(getLaneForPosition({ column: 3, row: 0 })).toBe(3);
      expect(getLaneForPosition({ column: 3, row: 1 })).toBe(3);
      expect(getLaneForPosition({ column: 3, row: 2 })).toBe(3);
      expect(getLaneForPosition({ column: 3, row: 3 })).toBe(3);

      // 3. Side/faction independence (player and enemy share identical lanes)
      const enemyPos = { column: 4, row: 0 }; // Enemy back
      const playerPos = { column: 4, row: 2 }; // Player front
      expect(getLaneForPosition(enemyPos)).toBe(4);
      expect(getLaneForPosition(playerPos)).toBe(4);

      // 4. Reject invalid coordinates
      expect(getLaneForPosition({ column: -1, row: 2 })).toBeNull();
      expect(getLaneForPosition({ column: 6, row: 2 })).toBeNull();
      expect(getLaneForPosition({ column: 0, row: -1 })).toBeNull();
      expect(getLaneForPosition({ column: 0, row: 4 })).toBeNull();
      expect(getLaneForPosition({ column: 1.5, row: 2 })).toBeNull();

      // 5. Squad-level helper checks
      const placedPlayer: Squad = {
        unitTypeId: 'guardian',
        count: 8,
        damagedUnitHp: null,
        position: { column: 4, row: 2 },
      };
      const unplacedPlayer: Squad = {
        unitTypeId: 'archer',
        count: 3,
        damagedUnitHp: null,
        position: null,
      };

      expect(getSquadLane(placedPlayer)).toBe(4);
      expect(getSquadLane(unplacedPlayer)).toBeNull();
    });

    it('discovers same-lane opponents symmetrically, ignores unplaced/dead/friendly squads, and exposes multiple same-lane candidates', () => {
      // Setup typical rosters
      const playerGuardian: Squad = {
        unitTypeId: 'guardian',
        count: 8,
        damagedUnitHp: null,
        position: { column: 2, row: 2 }, // Lane 2
      };
      const playerArcher: Squad = {
        unitTypeId: 'archer',
        count: 3,
        damagedUnitHp: null,
        position: { column: 3, row: 3 }, // Lane 3
      };
      const unplacedPlayer: Squad = {
        unitTypeId: 'recruit',
        count: 5,
        damagedUnitHp: null,
        position: null,
      };

      const enemyBrute1: Squad = {
        unitTypeId: 'duskborn-brute',
        count: 4,
        damagedUnitHp: null,
        position: { column: 2, row: 1 }, // Lane 2, Front
      };
      const enemyBrute2: Squad = {
        unitTypeId: 'duskborn-brute',
        count: 2,
        damagedUnitHp: null,
        position: { column: 2, row: 0 }, // Lane 2, Back (ambiguous lane case!)
      };
      const enemyArcher: Squad = {
        unitTypeId: 'duskborn-archer',
        count: 1,
        damagedUnitHp: null,
        position: { column: 1, row: 1 }, // Lane 1
      };
      const deadEnemy: Squad = {
        unitTypeId: 'duskborn-brute',
        count: 0, // DEAD
        damagedUnitHp: null,
        position: { column: 3, row: 1 }, // Lane 3
      };
      const unplacedEnemy: Squad = {
        unitTypeId: 'duskborn-grunt',
        count: 5,
        damagedUnitHp: null,
        position: null,
      };

      const playerSquads = [playerGuardian, playerArcher, unplacedPlayer];
      const enemySquads = [
        enemyBrute1,
        enemyBrute2,
        enemyArcher,
        deadEnemy,
        unplacedEnemy,
      ];

      // 1. Attacker is unpositioned => no candidates
      expect(getOpposingSquadsInLane(unplacedPlayer, enemySquads)).toEqual([]);

      // 2. Friendly squads are never targeted (the caller ensures we pass the opposing faction list, so friendly stays separate)
      // If we pass friendly squads list to itself, it only retrieves the same lane friendly squad
      expect(getOpposingSquadsInLane(playerGuardian, playerSquads)).toEqual([
        playerGuardian,
      ]);

      // 3. Attacker lane 2 (Player Guardian) -> finds both Enemy Brutes in lane 2, ignoring unplaced or dead enemies.
      // Exposes both same-lane candidates in stable order, without applying FRONT priority yet.
      const lane2Targets = getOpposingSquadsInLane(playerGuardian, enemySquads);
      expect(lane2Targets).toHaveLength(2);
      expect(lane2Targets[0]).toBe(enemyBrute1);
      expect(lane2Targets[1]).toBe(enemyBrute2);

      // 4. Attacker lane 3 (Player Archer) -> dead opponent at lane 3 is ignored => returns empty
      expect(getOpposingSquadsInLane(playerArcher, enemySquads)).toEqual([]);

      // 5. Enemy Attacker lane 2 (Enemy Brute 1) -> finds Player Guardian in lane 2
      const enemyLane2Targets = getOpposingSquadsInLane(
        enemyBrute1,
        playerSquads,
      );
      expect(enemyLane2Targets).toEqual([playerGuardian]);

      // 6. Enemy Attacker lane 1 (Enemy Archer) -> no Player squad in lane 1 => returns empty
      expect(getOpposingSquadsInLane(enemyArcher, playerSquads)).toEqual([]);
    });

    describe('selectLaneTarget FRONT-priority and hero fallback targeting', () => {
      // Setup squads
      const playerFront: Squad = {
        unitTypeId: 'guardian',
        count: 8,
        damagedUnitHp: null,
        position: { column: 2, row: 2 }, // Player Front
      };
      const playerBack: Squad = {
        unitTypeId: 'archer',
        count: 3,
        damagedUnitHp: null,
        position: { column: 2, row: 3 }, // Player Back
      };
      const enemyFront: Squad = {
        unitTypeId: 'duskborn-brute',
        count: 4,
        damagedUnitHp: null,
        position: { column: 2, row: 1 }, // Enemy Front
      };
      const enemyBack: Squad = {
        unitTypeId: 'duskborn-archer',
        count: 2,
        damagedUnitHp: null,
        position: { column: 2, row: 0 }, // Enemy Back
      };

      it('targets FRONT first when both rows are occupied in that column (Player Attacker)', () => {
        // Player attacker in lane 2 targeting enemy
        // Opponents array with [Back, Front] order
        const target1 = selectLaneTarget(playerFront, 'player', [enemyBack, enemyFront]);
        expect(target1).toEqual({ type: 'squad', squad: enemyFront });

        // Opponents array with [Front, Back] order to verify order independence
        const target2 = selectLaneTarget(playerFront, 'player', [enemyFront, enemyBack]);
        expect(target2).toEqual({ type: 'squad', squad: enemyFront });
      });

      it('targets FRONT first when both rows are occupied in that column (Enemy Attacker)', () => {
        // Enemy attacker in lane 2 targeting player
        // Opponents array with [Back, Front] order
        const target1 = selectLaneTarget(enemyFront, 'enemy', [playerBack, playerFront]);
        expect(target1).toEqual({ type: 'squad', squad: playerFront });

        // Opponents array with [Front, Back] order to verify order independence
        const target2 = selectLaneTarget(enemyFront, 'enemy', [playerFront, playerBack]);
        expect(target2).toEqual({ type: 'squad', squad: playerFront });
      });

      it('targets BACK when FRONT is empty/absent/dead (Player Attacker)', () => {
        // FRONT is not in opponents array
        const target1 = selectLaneTarget(playerFront, 'player', [enemyBack]);
        expect(target1).toEqual({ type: 'squad', squad: enemyBack });

        // FRONT is dead (count = 0)
        const deadEnemyFront: Squad = { ...enemyFront, count: 0 };
        const target2 = selectLaneTarget(playerFront, 'player', [enemyBack, deadEnemyFront]);
        expect(target2).toEqual({ type: 'squad', squad: enemyBack });
      });

      it('targets BACK when FRONT is empty/absent/dead (Enemy Attacker)', () => {
        // FRONT is not in opponents array
        const target1 = selectLaneTarget(enemyFront, 'enemy', [playerBack]);
        expect(target1).toEqual({ type: 'squad', squad: playerBack });

        // FRONT is dead (count = 0)
        const deadPlayerFront: Squad = { ...playerFront, count: 0 };
        const target2 = selectLaneTarget(enemyFront, 'enemy', [playerBack, deadPlayerFront]);
        expect(target2).toEqual({ type: 'squad', squad: playerBack });
      });

      it('targets FRONT when BACK is empty/absent/dead', () => {
        // BACK is not in opponents array
        const target = selectLaneTarget(playerFront, 'player', [enemyFront]);
        expect(target).toEqual({ type: 'squad', squad: enemyFront });

        // BACK is dead (count = 0)
        const deadEnemyBack: Squad = { ...enemyBack, count: 0 };
        const targetDeadBack = selectLaneTarget(playerFront, 'player', [enemyFront, deadEnemyBack]);
        expect(targetDeadBack).toEqual({ type: 'squad', squad: enemyFront });
      });

      it('ignores other lanes completely', () => {
        // Enemy Front squad in lane 4 (column 4)
        const otherLaneEnemy: Squad = {
          unitTypeId: 'duskborn-brute',
          count: 5,
          damagedUnitHp: null,
          position: { column: 4, row: 1 },
        };
        // Attacker is in lane 2 (column 2)
        // Opponents has enemyBack in lane 2, and otherLaneEnemy in lane 4
        // Result should be enemyBack in lane 2 (even though it is BACK and the other is FRONT but in another lane)
        const target = selectLaneTarget(playerFront, 'player', [otherLaneEnemy, enemyBack]);
        expect(target).toEqual({ type: 'squad', squad: enemyBack });
      });

      it('targets the opposing hero directly if the opposing lane is completely empty (Player Attacker)', () => {
        const target = selectLaneTarget(playerFront, 'player', []);
        expect(target).toEqual({ type: 'hero', side: 'enemy' });
      });

      it('targets the opposing hero directly if the opposing lane is completely empty (Enemy Attacker)', () => {
        const target = selectLaneTarget(enemyFront, 'enemy', []);
        expect(target).toEqual({ type: 'hero', side: 'player' });
      });

      it('targets the opposing hero directly if all same-lane opposing squads are dead (count = 0)', () => {
        const deadEnemyFront: Squad = { ...enemyFront, count: 0 };
        const deadEnemyBack: Squad = { ...enemyBack, count: 0 };
        const target = selectLaneTarget(playerFront, 'player', [deadEnemyFront, deadEnemyBack]);
        expect(target).toEqual({ type: 'hero', side: 'enemy' });
      });

      it('returns null if the attacker has an unplaced position', () => {
        const unplacedPlayer: Squad = {
          unitTypeId: 'guardian',
          count: 8,
          damagedUnitHp: null,
          position: null,
        };
        const target = selectLaneTarget(unplacedPlayer, 'player', [enemyFront]);
        expect(target).toBeNull();
      });

      it('returns null if the attacker has an invalid position', () => {
        const invalidPlayer: Squad = {
          unitTypeId: 'guardian',
          count: 8,
          damagedUnitHp: null,
          position: { column: -1, row: 2 },
        };
        const target = selectLaneTarget(invalidPlayer, 'player', [enemyFront]);
        expect(target).toBeNull();
      });
    });
  });
});

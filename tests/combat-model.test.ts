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
  confirmDeployment,
  confirmAttack,
  endResolution,
  endTurn,
  spendMana,
  DEFAULT_COMBAT_MAX_MANA,
  createInitialPlayerSpellDeck,
  createInitialEnemySpellDeck,
  repositionSquad,
  getEngagedColumns,
  playSpell,
  tryUseAbility,
} from '../src/game/combat/CombatState';
import type { Squad } from '../src/game/combat/Squad';
import {
  ARCHER,
  DUSKBORN_ARCHER,
  DUSKBORN_BRUTE,
  GUARDIAN,
} from '../src/game/content/unitTypes';
import { SPELLS, SPELL_REGISTRY } from '../src/game/content/spells';
import { ABILITIES, ABILITY_REGISTRY } from '../src/game/content/abilities';

describe('Combat Model Data structures', () => {
  it('defines Guardian with its initial content values', () => {
    expect(GUARDIAN).toEqual({
      id: 'guardian',
      name: 'Guardian',
      hpPerUnit: 10,
      baseDamage: 4,
      abilities: ['guardian-strike', 'guardian-shield-wall'],
    });
  });

  it('defines Archer with its initial content values', () => {
    expect(ARCHER).toEqual({
      id: 'archer',
      name: 'Archer',
      hpPerUnit: 6,
      baseDamage: 5,
      abilities: ['archer-shot', 'archer-power-shot'],
    });
  });

  it('defines Duskborn Brute with its initial content values', () => {
    expect(DUSKBORN_BRUTE).toEqual({
      id: 'duskborn-brute',
      name: 'Duskborn Brute',
      hpPerUnit: 8,
      baseDamage: 6,
      abilities: ['duskborn-brute-strike'],
    });
  });

  it('defines Duskborn Archer with its initial content values', () => {
    expect(DUSKBORN_ARCHER).toEqual({
      id: 'duskborn-archer',
      name: 'Duskborn Archer',
      hpPerUnit: 5,
      baseDamage: 5,
      abilities: ['duskborn-archer-shot'],
    });
  });

  it('defines deterministic combat abilities and registries according to section 0.6.11', () => {
    // 1. Ability IDs are unique
    const abilityIds = ABILITIES.map(a => a.id);
    const uniqueAbilityIds = new Set(abilityIds);
    expect(uniqueAbilityIds.size).toBe(abilityIds.length);

    // 2. All manaCost values >= 0 and required fields exist
    for (const ability of ABILITIES) {
      expect(ability.id).toBeDefined();
      expect(ability.name).toBeDefined();
      expect(ability.manaCost).toBeGreaterThanOrEqual(0);
      expect(ability.effectId).toBeDefined();
    }

    // 3. Every unit-referenced ability exists in the registry
    const units = [GUARDIAN, ARCHER, DUSKBORN_BRUTE, DUSKBORN_ARCHER];
    for (const unit of units) {
      for (const id of unit.abilities) {
        const ability = ABILITY_REGISTRY.get(id);
        expect(ability).toBeDefined();
        expect(ability!.id).toBe(id);
      }
    }

    // 4. Guardian resolves to >= 2 abilities
    expect(GUARDIAN.abilities.length).toBeGreaterThanOrEqual(2);

    // 5. Archer resolves to >= 2 abilities
    expect(ARCHER.abilities.length).toBeGreaterThanOrEqual(2);

    // 6. Each Duskborn type resolves to >= 1 ability
    expect(DUSKBORN_BRUTE.abilities.length).toBeGreaterThanOrEqual(1);
    expect(DUSKBORN_ARCHER.abilities.length).toBeGreaterThanOrEqual(1);

    // 7. Expected canonical costs
    const strike = ABILITY_REGISTRY.get('guardian-strike')!;
    expect(strike.name).toBe('Strike');
    expect(strike.manaCost).toBe(0);

    const shieldWall = ABILITY_REGISTRY.get('guardian-shield-wall')!;
    expect(shieldWall.name).toBe('Shield Wall');
    expect(shieldWall.manaCost).toBe(2);

    const shot = ABILITY_REGISTRY.get('archer-shot')!;
    expect(shot.name).toBe('Shot');
    expect(shot.manaCost).toBe(0);

    const powerShot = ABILITY_REGISTRY.get('archer-power-shot')!;
    expect(powerShot.name).toBe('Power Shot');
    expect(powerShot.manaCost).toBe(1);
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
      activeSide: 'player',
      turn: 1,
      phase: 'TURN_START',
      playerMana: { current: 0, max: DEFAULT_COMBAT_MAX_MANA },
      enemyMana: { current: 0, max: DEFAULT_COMBAT_MAX_MANA },
      playerDeck: createInitialPlayerSpellDeck(),
      enemyDeck: createInitialEnemySpellDeck(),
    };

    expect(combatState.playerSquads).toHaveLength(1);
    expect(combatState.playerSquads[0].unitTypeId).toBe('guardian');
    expect(combatState.enemySquads).toHaveLength(1);
    expect(combatState.enemySquads[0].unitTypeId).toBe('duskborn_grunt');
    expect(combatState.playerHeroHp).toBe(100);
    expect(combatState.enemyHeroHp).toBe(80);
    expect(combatState.activeSide).toBe('player');
    expect(combatState.turn).toBe(1);
    expect(combatState.phase).toBe('TURN_START');

    expect(beginTurn(combatState)).toBe(true);
    expect(confirmDeployment(combatState)).toBe(true);
    expect(combatState.phase).toBe('ACTION');
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
      activeSide: 'player',
      turn: 1,
      phase: 'TURN_START',
      playerMana: { current: 0, max: DEFAULT_COMBAT_MAX_MANA },
      enemyMana: { current: 0, max: DEFAULT_COMBAT_MAX_MANA },
      playerDeck: createInitialPlayerSpellDeck(),
      enemyDeck: createInitialEnemySpellDeck(),
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
      activeSide: 'player',
      turn: 1,
      phase: 'TURN_START',
      playerMana: { current: 0, max: DEFAULT_COMBAT_MAX_MANA },
      enemyMana: { current: 0, max: DEFAULT_COMBAT_MAX_MANA },
      playerDeck: createInitialPlayerSpellDeck(),
      enemyDeck: createInitialEnemySpellDeck(),
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
      activeSide: 'player',
      turn: 1,
      phase: 'TURN_START',
      playerMana: { current: 0, max: DEFAULT_COMBAT_MAX_MANA },
      enemyMana: { current: 0, max: DEFAULT_COMBAT_MAX_MANA },
      playerDeck: createInitialPlayerSpellDeck(),
      enemyDeck: createInitialEnemySpellDeck(),
    };

    // Before placing player squads, deployment must be invalid
    expect(isDeploymentValid(state)).toBe(false);

    // 2. Player deploys squads legally
    expect(beginTurn(state)).toBe(true);
    // Initial enemy deployment engages columns 0 and 1.
    const target0 = { column: 0, row: 2 };
    const target1 = { column: 1, row: 3 };

    expect(repositionSquad(state, 'player', 'guardian', target0)).toBe(true);

    expect(repositionSquad(state, 'player', 'archer', target1)).toBe(true);

    // Now all squads are legally positioned: player rows 2-3, enemy rows 0-1, no overlaps
    expect(isDeploymentValid(state)).toBe(true);

    // 3. Confirm Deployment succeeds
    expect(confirmDeployment(state)).toBe(true);
    expect(state.phase).toBe('ACTION');

    // 4. Post-confirmation lock: any attempts to reposition squads must be ignored/locked
    const attemptReposition = { column: 0, row: 3 };
    expect(repositionSquad(state, 'player', 'guardian', attemptReposition)).toBe(false);
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
        activeSide: 'player',
        turn: 1,
        phase: 'TURN_START',
        playerMana: { current: 0, max: DEFAULT_COMBAT_MAX_MANA },
        enemyMana: { current: 0, max: DEFAULT_COMBAT_MAX_MANA },
        playerDeck: createInitialPlayerSpellDeck(),
        enemyDeck: createInitialEnemySpellDeck(),
      };

      expect(state.activeSide).toBe('player');
      expect(state.turn).toBe(1);
      expect(state.phase).toBe('TURN_START');
    });

    it('transitions successfully through the full player and enemy alternating turn phases', () => {
      // 1. Initial State
      const state: CombatState = {
        playerSquads: [],
        enemySquads: [],
        playerHeroHp: 100,
        enemyHeroHp: 100,
        activeSide: 'player',
        turn: 1,
        phase: 'TURN_START',
        playerMana: { current: 0, max: DEFAULT_COMBAT_MAX_MANA },
        enemyMana: { current: 0, max: DEFAULT_COMBAT_MAX_MANA },
        playerDeck: createInitialPlayerSpellDeck(),
        enemyDeck: createInitialEnemySpellDeck(),
      };

      // 2. TURN_START -> DEPLOYMENT (Player)
      expect(beginTurn(state)).toBe(true);
      expect(state.phase).toBe('DEPLOYMENT');
      expect(state.activeSide).toBe('player');
      expect(state.turn).toBe(1);

      // 3. DEPLOYMENT -> ACTION (Player)
      expect(confirmDeployment(state)).toBe(true);
      expect(state.phase).toBe('ACTION');
      expect(state.activeSide).toBe('player');
      expect(state.turn).toBe(1);

      // 4. ACTION -> RESOLUTION (Player)
      expect(confirmAttack(state)).toBe(true);
      expect(state.phase).toBe('RESOLUTION');
      expect(state.activeSide).toBe('player');
      expect(state.turn).toBe(1);

      // 5. RESOLUTION -> TURN_END (Player)
      expect(endResolution(state)).toBe(true);
      expect(state.phase).toBe('TURN_END');
      expect(state.activeSide).toBe('player');
      expect(state.turn).toBe(1);

      // 6. TURN_END -> Hand-off (Player -> Enemy, turn becomes 2, automatically begins next turn and lands in DEPLOYMENT)
      expect(endTurn(state)).toBe(true);
      expect(state.phase).toBe('DEPLOYMENT');
      expect(state.activeSide).toBe('enemy');
      expect(state.turn).toBe(2);

      // 7. DEPLOYMENT -> ACTION (Enemy)
      expect(confirmDeployment(state)).toBe(true);
      expect(state.phase).toBe('ACTION');
      expect(state.activeSide).toBe('enemy');
      expect(state.turn).toBe(2);

      // 8. ACTION -> RESOLUTION (Enemy)
      expect(confirmAttack(state)).toBe(true);
      expect(state.phase).toBe('RESOLUTION');
      expect(state.activeSide).toBe('enemy');
      expect(state.turn).toBe(2);

      // 9. RESOLUTION -> TURN_END (Enemy)
      expect(endResolution(state)).toBe(true);
      expect(state.phase).toBe('TURN_END');
      expect(state.activeSide).toBe('enemy');
      expect(state.turn).toBe(2);

      // 10. TURN_END -> Hand-off (Enemy -> Player, turn becomes 3, automatically begins next turn and lands in DEPLOYMENT)
      expect(endTurn(state)).toBe(true);
      expect(state.phase).toBe('DEPLOYMENT');
      expect(state.activeSide).toBe('player');
      expect(state.turn).toBe(3);
    });

    it('rejects invalid phase transitions and guards state integrity', () => {
      const state: CombatState = {
        playerSquads: [],
        enemySquads: [],
        playerHeroHp: 100,
        enemyHeroHp: 100,
        activeSide: 'player',
        turn: 1,
        phase: 'TURN_START',
        playerMana: { current: 0, max: DEFAULT_COMBAT_MAX_MANA },
        enemyMana: { current: 0, max: DEFAULT_COMBAT_MAX_MANA },
        playerDeck: createInitialPlayerSpellDeck(),
        enemyDeck: createInitialEnemySpellDeck(),
      };

      // 1. From TURN_START, only beginTurn() is valid.
      expect(confirmDeployment(state)).toBe(false);
      expect(confirmAttack(state)).toBe(false);
      expect(endResolution(state)).toBe(false);
      expect(endTurn(state)).toBe(false);
      expect(state.phase).toBe('TURN_START'); // unchanged

      // Transition to DEPLOYMENT
      expect(beginTurn(state)).toBe(true);
      expect(state.phase).toBe('DEPLOYMENT');

      // 2. From DEPLOYMENT, only confirmDeployment() is valid.
      expect(beginTurn(state)).toBe(false);
      expect(confirmAttack(state)).toBe(false);
      expect(endResolution(state)).toBe(false);
      expect(endTurn(state)).toBe(false);
      expect(state.phase).toBe('DEPLOYMENT'); // unchanged

      // Transition to ACTION
      expect(confirmDeployment(state)).toBe(true);
      expect(state.phase).toBe('ACTION');

      // 3. From ACTION, only confirmAttack() is valid.
      expect(beginTurn(state)).toBe(false);
      expect(confirmDeployment(state)).toBe(false);
      expect(endResolution(state)).toBe(false);
      expect(endTurn(state)).toBe(false);
      expect(state.phase).toBe('ACTION'); // unchanged

      // Transition to RESOLUTION
      expect(confirmAttack(state)).toBe(true);
      expect(state.phase).toBe('RESOLUTION');

      // 4. From RESOLUTION, only endResolution() is valid.
      expect(beginTurn(state)).toBe(false);
      expect(confirmDeployment(state)).toBe(false);
      expect(confirmAttack(state)).toBe(false);
      expect(endTurn(state)).toBe(false);
      expect(state.phase).toBe('RESOLUTION'); // unchanged

      // Transition to TURN_END
      expect(endResolution(state)).toBe(true);
      expect(state.phase).toBe('TURN_END');

      // 5. From TURN_END, only endTurn() is valid.
      expect(beginTurn(state)).toBe(false);
      expect(confirmDeployment(state)).toBe(false);
      expect(confirmAttack(state)).toBe(false);
      expect(endResolution(state)).toBe(false);
      expect(state.phase).toBe('TURN_END'); // unchanged
    });

    it('models combat Mana refresh and spending operations according to section 0.6.8', () => {
      // 1. Initial Pools: player and enemy pools exist
      const state: CombatState = {
        playerSquads: [],
        enemySquads: [],
        playerHeroHp: 100,
        enemyHeroHp: 100,
        activeSide: 'player',
        turn: 1,
        phase: 'TURN_START',
        playerMana: { current: 1, max: DEFAULT_COMBAT_MAX_MANA },
        enemyMana: { current: 2, max: DEFAULT_COMBAT_MAX_MANA },
        playerDeck: createInitialPlayerSpellDeck(),
        enemyDeck: createInitialEnemySpellDeck(),
      };

      expect(state.playerMana.max).toBe(DEFAULT_COMBAT_MAX_MANA);
      expect(state.enemyMana.max).toBe(DEFAULT_COMBAT_MAX_MANA);

      // 2. TURN_START -> DEPLOYMENT (Player active)
      // Player Mana refreshes to max, Enemy Mana remains unchanged
      expect(beginTurn(state)).toBe(true);
      expect(state.playerMana.current).toBe(DEFAULT_COMBAT_MAX_MANA); // refreshed to max (3)
      expect(state.enemyMana.current).toBe(2); // unchanged

      // 3. Spend valid amount
      expect(spendMana(state, 'player', 2)).toBe(true);
      expect(state.playerMana.current).toBe(1); // 3 - 2 = 1

      // 4. Spend exact remaining amount
      expect(spendMana(state, 'player', 1)).toBe(true);
      expect(state.playerMana.current).toBe(0); // 1 - 1 = 0

      // 5. Spend zero succeeds without changing Mana
      expect(spendMana(state, 'player', 0)).toBe(true);
      expect(state.playerMana.current).toBe(0); // unchanged

      // 6. Insufficient Mana fails cleanly
      expect(spendMana(state, 'player', 2)).toBe(false);
      expect(state.playerMana.current).toBe(0); // unchanged

      // 7. Negative cost rejected without mutation
      expect(spendMana(state, 'player', -1)).toBe(false);
      expect(state.playerMana.current).toBe(0); // unchanged

      // 8. Side isolation: spending player Mana does not change enemy Mana
      expect(state.enemyMana.current).toBe(2);

      // Spending enemy Mana
      expect(spendMana(state, 'enemy', 1)).toBe(true);
      expect(state.enemyMana.current).toBe(1); // 2 - 1 = 1
      expect(state.playerMana.current).toBe(0); // player unchanged

      // 9. No overflow on refresh
      // Transition resolution and turn end
      state.phase = 'TURN_END';
      // endTurn triggers player -> enemy handoff, increments turn to 2, and runs beginTurn() which refreshes activeSide (enemy) Mana to max
      expect(endTurn(state)).toBe(true);
      expect(state.activeSide).toBe('enemy');
      expect(state.enemyMana.current).toBe(DEFAULT_COMBAT_MAX_MANA); // Refreshed to max (3)
      expect(state.playerMana.current).toBe(0); // Player unchanged (still 0)

      // Turn starts again back to player (turn 3)
      state.phase = 'TURN_END';
      expect(endTurn(state)).toBe(true);
      expect(state.activeSide).toBe('player');
      expect(state.playerMana.current).toBe(DEFAULT_COMBAT_MAX_MANA); // Player refreshed to max (3)
      expect(state.enemyMana.current).toBe(DEFAULT_COMBAT_MAX_MANA); // Enemy remains at 3 (its previous value)
    });

    it('models spell definitions and spell decks according to section 0.6.9', () => {
      // 1. Spell definitions: initial spell IDs are unique, manaCost >= 0, required fields exist
      const spellIds = SPELLS.map(s => s.id);
      const uniqueIds = new Set(spellIds);
      expect(uniqueIds.size).toBe(spellIds.length);

      for (const spell of SPELLS) {
        expect(spell.id).toBeDefined();
        expect(spell.name).toBeDefined();
        expect(spell.manaCost).toBeGreaterThanOrEqual(0);
        expect(spell.effectId).toBeDefined();
      }

      // 2. Player deck: drawPile has expected deterministic spell IDs, hand is empty, discardPile is empty
      const playerDeck = createInitialPlayerSpellDeck();
      expect(playerDeck.drawPile).toEqual(['firebolt', 'barrier', 'battle-cry']);
      expect(playerDeck.hand).toEqual([]);
      expect(playerDeck.discardPile).toEqual([]);

      // 3. Enemy deck: same structure
      const enemyDeck = createInitialEnemySpellDeck();
      expect(enemyDeck.drawPile).toEqual(['dusk-strike', 'dark-ward']);
      expect(enemyDeck.hand).toEqual([]);
      expect(enemyDeck.discardPile).toEqual([]);

      // 4. Known IDs: Every initial deck spell ID resolves to a valid SpellDefinition
      for (const id of playerDeck.drawPile) {
        const spell = SPELL_REGISTRY.get(id);
        expect(spell).toBeDefined();
        expect(spell!.id).toBe(id);
      }
      for (const id of enemyDeck.drawPile) {
        const spell = SPELL_REGISTRY.get(id);
        expect(spell).toBeDefined();
        expect(spell!.id).toBe(id);
      }

      // 5. Isolation: Mutating one newly created deck must not mutate another deck
      const playerDeck2 = createInitialPlayerSpellDeck();
      playerDeck2.drawPile.push('barrier');
      expect(playerDeck.drawPile).toEqual(['firebolt', 'barrier', 'battle-cry']); // original remains unaffected

      // Player and enemy deck state must also remain independent
      const combatState: CombatState = {
        playerSquads: [],
        enemySquads: [],
        playerHeroHp: 100,
        enemyHeroHp: 100,
        activeSide: 'player',
        turn: 1,
        phase: 'TURN_START',
        playerMana: { current: 0, max: DEFAULT_COMBAT_MAX_MANA },
        enemyMana: { current: 0, max: DEFAULT_COMBAT_MAX_MANA },
        playerDeck: createInitialPlayerSpellDeck(),
        enemyDeck: createInitialEnemySpellDeck(),
      };

      combatState.playerDeck.drawPile.push('firebolt');
      expect(combatState.enemyDeck.drawPile).not.toContain('firebolt'); // enemy deck remains isolated
    });
  });

  describe('Combat squad per-turn repositioning', () => {
    // Setup helper to create a clean, populated CombatState
    function createCleanCombatState(): CombatState {
      return {
        playerSquads: [
          {
            unitTypeId: 'guardian',
            count: 8,
            damagedUnitHp: 4,
            position: { column: 2, row: 2 }, // Player Front
          },
          {
            unitTypeId: 'archer',
            count: 3,
            damagedUnitHp: null,
            position: { column: 4, row: 3 }, // Player Back
          },
        ],
        enemySquads: [
          {
            unitTypeId: 'duskborn-brute',
            count: 4,
            damagedUnitHp: null,
            position: { column: 2, row: 1 }, // Enemy Front
          },
          {
            unitTypeId: 'duskborn-archer',
            count: 2,
            damagedUnitHp: 5,
            position: { column: 4, row: 0 }, // Enemy Back
          },
        ],
        playerHeroHp: 100,
        enemyHeroHp: 100,
        activeSide: 'player',
        turn: 1,
        phase: 'DEPLOYMENT', // Starts in DEPLOYMENT phase
        playerMana: { current: 3, max: DEFAULT_COMBAT_MAX_MANA },
        enemyMana: { current: 0, max: DEFAULT_COMBAT_MAX_MANA },
        playerDeck: createInitialPlayerSpellDeck(),
        enemyDeck: createInitialEnemySpellDeck(),
      };
    }

    it('allows player to reposition surviving player squads within the player deployment zone when no lane restrictions apply', () => {
      const state = createCleanCombatState();
      state.enemySquads = []; // No opposing squads -> no lane restrictions

      // Move Guardian from (2, 2) to (3, 3) (valid player deployment cell)
      const targetPos = { column: 3, row: 3 };
      const success = repositionSquad(state, 'player', 'guardian', targetPos);

      expect(success).toBe(true);
      const guardian = state.playerSquads.find(s => s.unitTypeId === 'guardian')!;
      expect(guardian.position).toEqual(targetPos);

      // Verify that count, damagedUnitHp, and identity are preserved perfectly
      expect(guardian.count).toBe(8);
      expect(guardian.damagedUnitHp).toBe(4);
    });

    it('allows enemy to reposition surviving enemy squads within the enemy deployment zone when no lane restrictions apply', () => {
      const state = createCleanCombatState();
      state.activeSide = 'enemy';
      state.playerSquads = []; // No opposing squads -> no lane restrictions

      // Move Duskborn Brute from (2, 1) to (3, 0) (valid enemy deployment cell)
      const targetPos = { column: 3, row: 0 };
      const success = repositionSquad(state, 'enemy', 'duskborn-brute', targetPos);

      expect(success).toBe(true);
      const brute = state.enemySquads.find(s => s.unitTypeId === 'duskborn-brute')!;
      expect(brute.position).toEqual(targetPos);

      // Verify that count, damagedUnitHp, and identity are preserved perfectly
      expect(brute.count).toBe(4);
      expect(brute.damagedUnitHp).toBeNull();
    });

    it('rejects repositioning if side does not match activeSide', () => {
      const state = createCleanCombatState();
      state.playerSquads = []; // Remove player squads to eliminate lane restrictions
      // activeSide is player, but attempting enemy move
      const targetPos = { column: 1, row: 0 };
      const success = repositionSquad(state, 'enemy', 'duskborn-brute', targetPos);

      expect(success).toBe(false);
      const brute = state.enemySquads.find(s => s.unitTypeId === 'duskborn-brute')!;
      expect(brute.position).toEqual({ column: 2, row: 1 }); // unchanged
    });

    it('rejects repositioning if phase is not DEPLOYMENT', () => {
      const state = createCleanCombatState();
      state.enemySquads = []; // Remove enemy squads to eliminate lane restrictions
      // Change phase to ACTION
      state.phase = 'ACTION';

      const targetPos = { column: 3, row: 3 };
      const success = repositionSquad(state, 'player', 'guardian', targetPos);

      expect(success).toBe(false);
      const guardian = state.playerSquads.find(s => s.unitTypeId === 'guardian')!;
      expect(guardian.position).toEqual({ column: 2, row: 2 }); // unchanged
    });

    it('rejects repositioning of dead squads (count = 0)', () => {
      const state = createCleanCombatState();
      state.enemySquads = []; // Remove enemy squads to eliminate lane restrictions
      const guardian = state.playerSquads.find(s => s.unitTypeId === 'guardian')!;
      guardian.count = 0; // Squad is dead

      const targetPos = { column: 3, row: 3 };
      const success = repositionSquad(state, 'player', 'guardian', targetPos);

      expect(success).toBe(false);
      expect(guardian.position).toEqual({ column: 2, row: 2 }); // unchanged
    });

    it('rejects player moves into enemy rows and enemy moves into player rows', () => {
      const state = createCleanCombatState();

      // Player attempts to move into Enemy row 1
      const playerToEnemyCell = { column: 2, row: 1 };
      const successPlayer = repositionSquad(state, 'player', 'guardian', playerToEnemyCell);
      expect(successPlayer).toBe(false);
      expect(state.playerSquads[0].position).toEqual({ column: 2, row: 2 }); // unchanged

      // Enemy attempts to move into Player row 2
      state.activeSide = 'enemy';
      const enemyToPlayerCell = { column: 2, row: 2 };
      const successEnemy = repositionSquad(state, 'enemy', 'duskborn-brute', enemyToPlayerCell);
      expect(successEnemy).toBe(false);
      expect(state.enemySquads[0].position).toEqual({ column: 2, row: 1 }); // unchanged
    });

    it('rejects moves into cells occupied by other squads', () => {
      const state = createCleanCombatState();
      state.enemySquads = []; // Remove enemy squads to eliminate lane restrictions

      // Player archer is at (4, 3). Guardian attempts to move there.
      const occupiedCell = { column: 4, row: 3 };
      const success = repositionSquad(state, 'player', 'guardian', occupiedCell);

      expect(success).toBe(false);
      expect(state.playerSquads[0].position).toEqual({ column: 2, row: 2 }); // unchanged
    });

    it('succeeds with no-op if moving a squad to its current cell', () => {
      const state = createCleanCombatState();

      // Guardian is currently at (2, 2)
      const currentCell = { column: 2, row: 2 };
      const success = repositionSquad(state, 'player', 'guardian', currentCell);

      expect(success).toBe(true);
      expect(state.playerSquads[0].position).toEqual(currentCell);
    });

    it('enforces the lane engagement restriction symmetrically according to section 0.6.10', () => {
      // Setup state where opponent (enemy) is positioned in columns 1 and 4
      const state = createCleanCombatState();
      state.enemySquads = [
        {
          unitTypeId: 'duskborn-brute',
          count: 4,
          damagedUnitHp: null,
          position: { column: 1, row: 1 }, // Column 1
        },
        {
          unitTypeId: 'duskborn-archer',
          count: 2,
          damagedUnitHp: null,
          position: { column: 4, row: 0 }, // Column 4
        },
      ];

      // Engaged columns for player side are [1, 4]
      expect(getEngagedColumns(state, 'player')).toEqual([1, 4]);

      // 1. Player reposition to Column 1 is allowed
      expect(repositionSquad(state, 'player', 'guardian', { column: 1, row: 2 })).toBe(true);

      // 2. Player reposition to Column 4 is allowed
      expect(repositionSquad(state, 'player', 'archer', { column: 4, row: 3 })).toBe(true);

      // 3. Player reposition to other columns (0, 2, 3, 5) is rejected
      expect(repositionSquad(state, 'player', 'guardian', { column: 0, row: 2 })).toBe(false);
      expect(repositionSquad(state, 'player', 'guardian', { column: 2, row: 2 })).toBe(false);
      expect(repositionSquad(state, 'player', 'guardian', { column: 3, row: 3 })).toBe(false);
      expect(repositionSquad(state, 'player', 'guardian', { column: 5, row: 3 })).toBe(false);

      // 4. Symmetrical: enemy deployment against player squads
      // Clear enemy squads and place player squads in columns 0 and 5
      state.activeSide = 'enemy';
      state.phase = 'DEPLOYMENT';
      state.playerSquads = [
        {
          unitTypeId: 'guardian',
          count: 8,
          damagedUnitHp: null,
          position: { column: 0, row: 2 }, // Column 0
        },
        {
          unitTypeId: 'archer',
          count: 3,
          damagedUnitHp: null,
          position: { column: 5, row: 3 }, // Column 5
        },
      ];
      state.enemySquads = [
        {
          unitTypeId: 'duskborn-brute',
          count: 4,
          damagedUnitHp: null,
          position: { column: 0, row: 1 },
        },
      ];

      expect(getEngagedColumns(state, 'enemy')).toEqual([0, 5]);

      // Enemy moves to Column 5 is allowed
      expect(repositionSquad(state, 'enemy', 'duskborn-brute', { column: 5, row: 0 })).toBe(true);
      // Enemy moves to Column 3 is rejected
      expect(repositionSquad(state, 'enemy', 'duskborn-brute', { column: 3, row: 1 })).toBe(false);
    });

    it('ignores dead opposing squads for lane engagement', () => {
      const state = createCleanCombatState();
      state.enemySquads = [
        {
          unitTypeId: 'duskborn-brute',
          count: 0, // DEAD
          damagedUnitHp: null,
          position: { column: 2, row: 1 },
        },
      ];

      // No engaged columns since the opponent squad is dead
      expect(getEngagedColumns(state, 'player')).toEqual([]);

      // Therefore, moving to column 3 is allowed
      expect(repositionSquad(state, 'player', 'guardian', { column: 3, row: 3 })).toBe(true);
    });

    it('ignores unpositioned opposing squads for lane engagement', () => {
      const state = createCleanCombatState();
      state.enemySquads = [
        {
          unitTypeId: 'duskborn-brute',
          count: 4,
          damagedUnitHp: null,
          position: null, // UNPOSITIONED
        },
      ];

      // No engaged columns since the opponent squad is unpositioned
      expect(getEngagedColumns(state, 'player')).toEqual([]);

      // Therefore, moving to column 3 is allowed
      expect(repositionSquad(state, 'player', 'guardian', { column: 3, row: 3 })).toBe(true);
    });

    it('allows a squad to remain in its current lane even if that lane becomes empty', () => {
      const state = createCleanCombatState();
      // Initially, player Guardian is in column 2.
      // Now, all enemy squads in column 2 are removed or dead.
      state.enemySquads = [
        {
          unitTypeId: 'duskborn-archer',
          count: 2,
          damagedUnitHp: null,
          position: { column: 4, row: 0 },
        },
      ];

      // Opponent only has squads in Column 4.
      expect(getEngagedColumns(state, 'player')).toEqual([4]);

      // Guardian is currently in column 2, which is now unengaged.
      // But we did not trigger repositionSquad, so its position remains legally (2, 2).
      const guardian = state.playerSquads.find(s => s.unitTypeId === 'guardian')!;
      expect(guardian.position).toEqual({ column: 2, row: 2 });
    });

    it('enforces lane engagement when moving a squad out of an empty lane', () => {
      const state = createCleanCombatState();
      // Guardian is in column 2.
      // Enemy squads only occupy columns 1 and 4.
      state.enemySquads = [
        {
          unitTypeId: 'duskborn-brute',
          count: 4,
          damagedUnitHp: null,
          position: { column: 1, row: 1 },
        },
        {
          unitTypeId: 'duskborn-archer',
          count: 2,
          damagedUnitHp: null,
          position: { column: 4, row: 0 },
        },
      ];

      // Attempting to move Guardian to Column 5 (unengaged) is rejected
      expect(repositionSquad(state, 'player', 'guardian', { column: 5, row: 2 })).toBe(false);
      // Attempting to move Guardian to Column 1 (engaged) is allowed
      expect(repositionSquad(state, 'player', 'guardian', { column: 1, row: 2 })).toBe(true);
    });

    it('allows FRONT/BACK switching within the same legally engaged column', () => {
      const state = createCleanCombatState();
      // Opponent is in Column 2.
      state.enemySquads = [
        {
          unitTypeId: 'duskborn-brute',
          count: 4,
          damagedUnitHp: null,
          position: { column: 2, row: 1 },
        },
      ];

      // Guardian is currently at (2, 2) (Front row). Target is (2, 3) (Back row).
      expect(repositionSquad(state, 'player', 'guardian', { column: 2, row: 3 })).toBe(true);
    });

    it('locks deployment repositioning completely after entering ACTION or later phases', () => {
      const state = createCleanCombatState();
      state.enemySquads = []; // No lane restrictions

      // Confirm Deployment -> advances phase to ACTION
      expect(confirmDeployment(state)).toBe(true);
      expect(state.phase).toBe('ACTION');

      // Reposition is rejected under ACTION phase
      expect(repositionSquad(state, 'player', 'guardian', { column: 3, row: 2 })).toBe(false);

      // Confirm Attack -> RESOLUTION phase
      expect(confirmAttack(state)).toBe(true);
      expect(state.phase).toBe('RESOLUTION');
      expect(repositionSquad(state, 'player', 'guardian', { column: 3, row: 2 })).toBe(false);

      // End Resolution -> TURN_END phase
      expect(endResolution(state)).toBe(true);
      expect(state.phase).toBe('TURN_END');
      expect(repositionSquad(state, 'player', 'guardian', { column: 3, row: 2 })).toBe(false);
    });
  });

  describe('Mana-backed combat actions', () => {
    // Setup helper to create a clean, populated CombatState in ACTION phase
    function createCleanActionState(): CombatState {
      return {
        playerSquads: [
          {
            unitTypeId: 'guardian',
            count: 8,
            damagedUnitHp: null,
            position: { column: 2, row: 2 },
          },
          {
            unitTypeId: 'archer',
            count: 3,
            damagedUnitHp: null,
            position: { column: 4, row: 3 },
          },
        ],
        enemySquads: [
          {
            unitTypeId: 'duskborn-brute',
            count: 4,
            damagedUnitHp: null,
            position: { column: 2, row: 1 },
          },
        ],
        playerHeroHp: 100,
        enemyHeroHp: 100,
        deploymentConfirmed: true,
        activeSide: 'player',
        turn: 1,
        phase: 'ACTION', // Starts in ACTION phase
        playerMana: { current: 3, max: DEFAULT_COMBAT_MAX_MANA },
        enemyMana: { current: 0, max: DEFAULT_COMBAT_MAX_MANA },
        playerDeck: {
          drawPile: [],
          hand: ['firebolt', 'barrier', 'battle-cry'], // Started with cards in hand
          discardPile: [],
        },
        enemyDeck: {
          drawPile: [],
          hand: ['dusk-strike', 'dark-ward'], // Started with cards in hand
          discardPile: [],
        },
      };
    }

    it('verifies player and enemy spell sets and costs are valid', () => {
      // Player spells
      const firebolt = SPELL_REGISTRY.get('firebolt')!;
      expect(firebolt).toBeDefined();
      expect(firebolt.manaCost).toBe(2);
      expect(firebolt.effectId).toBe('damage');

      const barrier = SPELL_REGISTRY.get('barrier')!;
      expect(barrier).toBeDefined();
      expect(barrier.manaCost).toBe(1);

      const battleCry = SPELL_REGISTRY.get('battle-cry')!;
      expect(battleCry).toBeDefined();
      expect(battleCry.manaCost).toBe(1);

      // Enemy spells
      const duskStrike = SPELL_REGISTRY.get('dusk-strike')!;
      expect(duskStrike).toBeDefined();
      expect(duskStrike.manaCost).toBe(2);

      const darkWard = SPELL_REGISTRY.get('dark-ward')!;
      expect(darkWard).toBeDefined();
      expect(darkWard.manaCost).toBe(1);

      // All spelling costs >= 0
      for (const spell of SPELLS) {
        expect(spell.manaCost).toBeGreaterThanOrEqual(0);
      }
    });

    it('allows active side to successfully play spells from hand under ACTION phase with correct Mana payment', () => {
      const state = createCleanActionState();

      // Play 'barrier' (cost 1)
      expect(playSpell(state, 'player', 'barrier')).toBe(true);
      expect(state.playerMana.current).toBe(2); // 3 - 1 = 2
      expect(state.playerDeck.hand).toEqual(['firebolt', 'battle-cry']);
      expect(state.playerDeck.discardPile).toEqual(['barrier']);
    });

    it('rejects playing a spell if current Mana is insufficient and leaves state completely unchanged', () => {
      const state = createCleanActionState();
      state.playerMana.current = 1; // Not enough for Firebolt (cost 2)

      // Try to play 'firebolt'
      expect(playSpell(state, 'player', 'firebolt')).toBe(false);

      // Verify no changes (atomic)
      expect(state.playerMana.current).toBe(1);
      expect(state.playerDeck.hand).toEqual(['firebolt', 'barrier', 'battle-cry']);
      expect(state.playerDeck.discardPile).toEqual([]);
    });

    it('rejects playing a spell if the card is not in hand and leaves state completely unchanged', () => {
      const state = createCleanActionState();

      // Try to play 'dark-ward' (which is in enemy's hand, not player's)
      expect(playSpell(state, 'player', 'dark-ward')).toBe(false);

      // Verify no changes (atomic)
      expect(state.playerMana.current).toBe(3);
      expect(state.playerDeck.hand).toEqual(['firebolt', 'barrier', 'battle-cry']);
      expect(state.playerDeck.discardPile).toEqual([]);
    });

    it('rejects playing a spell if side does not match activeSide', () => {
      const state = createCleanActionState();
      state.activeSide = 'player';
      state.enemyMana.current = 3;

      // Enemy tries to play dusk-strike during player's turn
      expect(playSpell(state, 'enemy', 'dusk-strike')).toBe(false);
      expect(state.enemyMana.current).toBe(3); // unchanged
    });

    it('rejects playing a spell if phase is not ACTION', () => {
      const state = createCleanActionState();
      state.phase = 'DEPLOYMENT';

      expect(playSpell(state, 'player', 'barrier')).toBe(false);
      expect(state.playerMana.current).toBe(3); // unchanged
    });

    it('allows playing multiple spells in a turn sequentially while Mana permits', () => {
      const state = createCleanActionState(); // starts with 3 Mana, and hand ['firebolt', 'barrier', 'battle-cry']

      // 1. Play Barrier (cost 1)
      expect(playSpell(state, 'player', 'barrier')).toBe(true);
      expect(state.playerMana.current).toBe(2);

      // 2. Play Battle Cry (cost 1)
      expect(playSpell(state, 'player', 'battle-cry')).toBe(true);
      expect(state.playerMana.current).toBe(1);

      // 3. Play Firebolt (cost 2) -> should fail (insufficient Mana)
      expect(playSpell(state, 'player', 'firebolt')).toBe(false);
      expect(state.playerMana.current).toBe(1); // remains 1

      expect(state.playerDeck.hand).toEqual(['firebolt']);
      expect(state.playerDeck.discardPile).toEqual(['barrier', 'battle-cry']);
    });

    it('allows using abilities with correct Mana payment under ACTION phase', () => {
      const state = createCleanActionState();

      // 1. Guardian Shield Wall (cost 2) -> succeeds
      expect(tryUseAbility(state, 'player', 'guardian', 'guardian-shield-wall')).toBe(true);
      expect(state.playerMana.current).toBe(1); // 3 - 2 = 1

      // 2. Archer Power Shot (cost 1) -> succeeds
      expect(tryUseAbility(state, 'player', 'archer', 'archer-power-shot')).toBe(true);
      expect(state.playerMana.current).toBe(0); // 1 - 1 = 0

      // 3. Guardian Strike (cost 0) -> succeeds even with 0 Mana
      expect(tryUseAbility(state, 'player', 'guardian', 'guardian-strike')).toBe(true);
      expect(state.playerMana.current).toBe(0); // unchanged
    });

    it('rejects using an ability if current Mana is insufficient', () => {
      const state = createCleanActionState();
      state.playerMana.current = 1; // Not enough for Shield Wall (cost 2)

      expect(tryUseAbility(state, 'player', 'guardian', 'guardian-shield-wall')).toBe(false);
      expect(state.playerMana.current).toBe(1); // unchanged (atomic)
    });

    it('rejects using an ability if the unit type does not own the ability', () => {
      const state = createCleanActionState();

      // Archer tries to use Guardian's Shield Wall
      expect(tryUseAbility(state, 'player', 'archer', 'guardian-shield-wall')).toBe(false);
      expect(state.playerMana.current).toBe(3); // unchanged
    });

    it('rejects using an ability if the squad is dead (count = 0)', () => {
      const state = createCleanActionState();
      const brute = state.enemySquads.find(s => s.unitTypeId === 'duskborn-brute')!;
      brute.count = 0; // DEAD

      state.activeSide = 'enemy';
      state.enemyMana.current = 1;

      expect(tryUseAbility(state, 'enemy', 'duskborn-brute', 'duskborn-brute-strike')).toBe(false);
      expect(state.enemyMana.current).toBe(1); // unchanged
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

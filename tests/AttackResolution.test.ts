import { describe, expect, it } from 'vitest';
import {
  resolveActiveSideAttack,
  applyDamageToSquad,
  type CombatState,
  createInitialPlayerSpellDeck,
  createInitialEnemySpellDeck,
} from '../src/game/combat/CombatState';
import { GUARDIAN } from '../src/game/content/unitTypes';
import type { Squad } from '../src/game/combat/Squad';

describe('combat core attack resolution', () => {
  // Helper to create clean baseline CombatState
  function createCleanCombat(): CombatState {
    return {
      playerSquads: [],
      enemySquads: [],
      playerHeroHp: 100,
      enemyHeroHp: 100,
      activeSide: 'player',
      turn: 1,
      phase: 'RESOLUTION', // Starts in RESOLUTION for attack testing
      playerMana: { current: 3, max: 3 },
      enemyMana: { current: 0, max: 3 },
      playerDeck: createInitialPlayerSpellDeck(),
      enemyDeck: createInitialEnemySpellDeck(),
      selectedPlayerAbilities: {},
      selectedEnemyAbilities: {},
    };
  }

  describe('applyDamageToSquad stack damage logic', () => {
    it('properly reduces unit count and sets partial HP (count 8 receive 23 damage)', () => {
      const squad: Squad = {
        unitTypeId: 'guardian',
        count: 8,
        damagedUnitHp: null,
        position: null,
      };

      applyDamageToSquad(squad, GUARDIAN, 23);

      expect(squad.count).toBe(6);
      expect(squad.damagedUnitHp).toBe(7); // 3 units taken damage (2 dead, 1 takes 3)
    });

    it('damages an already-partially-damaged unit first (count 6, damagedHp 7, receive 9 damage)', () => {
      const squad: Squad = {
        unitTypeId: 'guardian',
        count: 6,
        damagedUnitHp: 7,
        position: null,
      };

      applyDamageToSquad(squad, GUARDIAN, 9);

      expect(squad.count).toBe(5);
      expect(squad.damagedUnitHp).toBe(8); // 1st takes 7 and dies, 2nd takes 2 (10 - 2 = 8)
    });

    it('sets damagedUnitHp to null on exact lethal boundary (count 3, damagedHp 4, receive 4 damage)', () => {
      const squad: Squad = {
        unitTypeId: 'guardian',
        count: 3,
        damagedUnitHp: 4,
        position: null,
      };

      applyDamageToSquad(squad, GUARDIAN, 4);

      expect(squad.count).toBe(2);
      expect(squad.damagedUnitHp).toBeNull();
    });

    it('sets squad to dead and clears position when count reaches 0', () => {
      const squad: Squad = {
        unitTypeId: 'guardian',
        count: 2,
        damagedUnitHp: null,
        position: { column: 1, row: 2 },
      };

      applyDamageToSquad(squad, GUARDIAN, 20);

      expect(squad.count).toBe(0);
      expect(squad.damagedUnitHp).toBeNull();
      expect(squad.position).toBeNull();
    });
  });

  describe('resolveActiveSideAttack full integration flow', () => {
    it('rejects resolver execution outside RESOLUTION phase', () => {
      const state = createCleanCombat();
      state.phase = 'ACTION'; // Not RESOLUTION

      const success = resolveActiveSideAttack(state);
      expect(success).toBe(false);
      expect(state.phase).toBe('ACTION'); // unchanged
    });

    it('resolves attack only for active side symmetrically (no counter-attack)', () => {
      const state = createCleanCombat();
      state.playerSquads = [
        {
          unitTypeId: 'guardian',
          count: 5,
          damagedUnitHp: null,
          position: { column: 2, row: 2 },
        },
      ];
      state.enemySquads = [
        {
          unitTypeId: 'duskborn-brute',
          count: 5,
          damagedUnitHp: null,
          position: { column: 2, row: 1 },
        },
      ];

      // Player active side: Player attacks Enemy Brute. Enemy Brute does NOT retaliate.
      // Player Guardian deals 5 * 4 = 20 damage.
      // Enemy Brute HP is 5 * 8 = 40 HP. Takes 20 damage -> count becomes 2, damagedUnitHp null (2.5 units dead)
      // Actually Brute has hpPerUnit = 8.
      // 20 damage applied: 2 units die (16 HP), 3rd unit takes 4 HP.
      // Remaining: 3 units, damagedUnitHp = 4 HP.
      const success = resolveActiveSideAttack(state);
      expect(success).toBe(true);

      const brute = state.enemySquads[0];
      expect(brute.count).toBe(3);
      expect(brute.damagedUnitHp).toBe(4);

      // Symmetrically, Player Guardian has taken 0 damage (no counter-attack)
      const guardian = state.playerSquads[0];
      expect(guardian.count).toBe(5);
      expect(guardian.damagedUnitHp).toBeNull();

      // Transition to TURN_END phase on success
      expect(state.phase).toBe('TURN_END');
    });

    it('evalues attacks with abilities and positional modifiers correctly (Archer BACK bonus & Power Shot EDGE bonus)', () => {
      const state = createCleanCombat();
      state.playerSquads = [
        {
          unitTypeId: 'archer',
          count: 3,
          damagedUnitHp: null,
          position: { column: 0, row: 3 }, // EDGE & BACK!
        },
      ];
      state.enemySquads = [
        {
          unitTypeId: 'duskborn-brute',
          count: 5,
          damagedUnitHp: null,
          position: { column: 0, row: 1 },
        },
      ];

      // Select 'archer-power-shot'
      state.selectedPlayerAbilities['archer'] = 'archer-power-shot';

      // Power Shot has cost 1, baseDamage = 5.
      // attackModifier: +2 (defined in content for Power Shot)
      // positionRule horizontal: 'EDGE' -> active! modifierValue: +2 damage.
      // Effective damage per unit: 5 + 2 (ability) + 2 (edge) = 9.
      // Total damage: 3 * 9 = 27 damage applied to Brute.
      // Brute has hpPerUnit = 8, count = 5 (40 HP).
      // 27 damage applied: 3 units die (24 HP), 4th unit takes 3 HP (8 - 3 = 5).
      // Remaining: 2 units, damagedUnitHp = 5.
      expect(resolveActiveSideAttack(state)).toBe(true);

      const brute = state.enemySquads[0];
      expect(brute.count).toBe(2);
      expect(brute.damagedUnitHp).toBe(5);
    });

    it('applies direct hero damage when opposing lane is empty and clamps hero HP at minimum 0', () => {
      const state = createCleanCombat();
      state.playerSquads = [
        {
          unitTypeId: 'guardian',
          count: 8,
          damagedUnitHp: null,
          position: { column: 1, row: 2 }, // column 1 is empty on enemy side
        },
      ];
      state.enemyHeroHp = 15;

      // Player Guardian deals 8 * 4 = 32 damage directly to enemy hero.
      // Enemy Hero HP is 15. Clamps to 0.
      expect(resolveActiveSideAttack(state)).toBe(true);
      expect(state.enemyHeroHp).toBe(0);
    });

    it('ensures dead targets stop blocking immediately inside same resolution (sequential targeting updates)', () => {
      const state = createCleanCombat();
      state.playerSquads = [
        {
          unitTypeId: 'guardian',
          count: 4,
          damagedUnitHp: null,
          position: { column: 2, row: 2 }, // FRONT
        },
        {
          unitTypeId: 'archer',
          count: 2,
          damagedUnitHp: null,
          position: { column: 2, row: 3 }, // BACK
        },
      ];
      // Enemy Brute is at (2, 1) with count = 1, hpPerUnit = 8 (so total 8 HP)
      state.enemySquads = [
        {
          unitTypeId: 'duskborn-brute',
          count: 1,
          damagedUnitHp: null,
          position: { column: 2, row: 1 },
        },
      ];
      state.enemyHeroHp = 10;

      // 1. Guardian attacks first: deals 4 * 4 = 16 damage.
      // Enemy Brute takes 16 damage and dies (count = 0, position = null).
      // 2. Archer attacks next sequentially:
      // Because Brute is dead and no longer blocks the lane, targeting is updated.
      // Archer now targets the enemy hero!
      // Archer has baseDamage = 5. No abilities selected, but is at row 3 (BACK), which is NOT selected so no bonus.
      // Archer deals 2 * 5 = 10 damage to Enemy Hero.
      // Enemy Hero HP becomes 10 - 10 = 0.
      expect(resolveActiveSideAttack(state)).toBe(true);

      const brute = state.enemySquads[0];
      expect(brute.count).toBe(0);
      expect(brute.position).toBeNull();
      expect(state.enemyHeroHp).toBe(0);
    });

    it('resolves attacks in deterministic order (column ascending, FRONT before BACK)', () => {
      const state = createCleanCombat();
      state.playerSquads = [
        {
          unitTypeId: 'archer',
          count: 1,
          damagedUnitHp: null,
          position: { column: 3, row: 3 }, // col 3 BACK (Player Archer)
        },
        {
          unitTypeId: 'guardian',
          count: 1,
          damagedUnitHp: null,
          position: { column: 1, row: 2 }, // col 1 FRONT (Player Guardian)
        },
      ];
      state.enemyHeroHp = 10;

      // If resolved in deterministic order:
      // 1. Player Guardian at col 1 deals 1 * 4 = 4 damage to enemy hero first.
      // 2. Player Archer at col 3 deals 1 * 5 = 5 damage to enemy hero second.
      // Total hero HP should become 10 - 4 - 5 = 1.
      expect(resolveActiveSideAttack(state)).toBe(true);
      expect(state.enemyHeroHp).toBe(1);
    });

    it('ignores dead attackers and unpositioned squads (count = 0 or position = null does not attack)', () => {
      const state = createCleanCombat();
      state.playerSquads = [
        {
          unitTypeId: 'guardian',
          count: 0, // dead squad
          damagedUnitHp: null,
          position: { column: 1, row: 2 },
        },
        {
          unitTypeId: 'archer',
          count: 3,
          damagedUnitHp: null,
          position: null, // unpositioned squad
        },
      ];
      state.enemyHeroHp = 10;

      expect(resolveActiveSideAttack(state)).toBe(true);
      // No damage should be dealt because attackers are dead/unpositioned
      expect(state.enemyHeroHp).toBe(10);
    });

    it('ensures that selecting guardian-shield-wall still performs base attack (Shield Wall does not skip basic attack)', () => {
      const state = createCleanCombat();
      state.playerSquads = [
        {
          unitTypeId: 'guardian',
          count: 3,
          damagedUnitHp: null,
          position: { column: 1, row: 2 },
        },
      ];
      state.selectedPlayerAbilities['guardian'] = 'guardian-shield-wall';
      state.enemyHeroHp = 20;

      expect(resolveActiveSideAttack(state)).toBe(true);
      // Guardian baseDamage is 4. Total damage = 3 * 4 = 12.
      // Enemy Hero HP should become 20 - 12 = 8.
      expect(state.enemyHeroHp).toBe(8);
    });
  });
});

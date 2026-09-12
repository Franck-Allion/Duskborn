import { describe, expect, it } from 'vitest';
import {
  resolveActiveSideAttack,
  applyDamageToSquad,
  type CombatState,
  createInitialPlayerSpellDeck,
  createInitialEnemySpellDeck,
  applyDamageToHero,
  playSpell,
  confirmAttack,
  endTurn,
} from '../src/game/combat/CombatState';
import { GUARDIAN, DUSKBORN_BRUTE } from '../src/game/content/unitTypes';
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

    it('resolves attacks in deterministic order (FRONT before BACK is non-commutative)', () => {
      const state = createCleanCombat();
      state.playerSquads = [
        {
          unitTypeId: 'guardian',
          count: 1,
          damagedUnitHp: null,
          position: { column: 2, row: 2 }, // col 2 FRONT: baseDamage = 4
        },
        {
          unitTypeId: 'archer',
          count: 1,
          damagedUnitHp: null,
          position: { column: 2, row: 3 }, // col 2 BACK: baseDamage = 5
        },
      ];
      // Enemy Brute at col 2 FRONT starts with exactly 4 HP
      state.enemySquads = [
        {
          unitTypeId: 'duskborn-brute',
          count: 1,
          damagedUnitHp: 4,
          position: { column: 2, row: 1 }, // col 2 FRONT
        },
      ];
      state.enemyHeroHp = 10;

      // If FRONT attacks before BACK (correct deterministic order):
      // 1. Guardian (FRONT) attacks first, deals 4 damage to Brute. Brute dies exactly (HP 0).
      // 2. Archer (BACK) attacks second. Since Brute is dead, Archer targets enemy hero and deals 5 damage.
      // Final Enemy Hero HP: 10 - 5 = 5.
      //
      // (If BACK attacked before FRONT, Archer would deal 5 to Brute, killing it. Guardian would then deal 4 to Hero, leaving Hero at 6 HP.)
      expect(resolveActiveSideAttack(state)).toBe(true);
      expect(state.enemyHeroHp).toBe(5);

      const brute = state.enemySquads[0];
      expect(brute.count).toBe(0);
      expect(brute.position).toBeNull();
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

    it('resolves played spell effects in successful play order before squad attacks', () => {
      const state = createCleanCombat();
      state.playerSquads = [
        {
          unitTypeId: 'archer',
          count: 1,
          damagedUnitHp: null,
          position: { column: 0, row: 3 }, // BACK
        },
      ];
      state.enemyHeroHp = 20;

      // Simulate playing Firebolt (deals 6 direct damage) and Battle Cry (adds +1 per-unit damage)
      state.playerPlayedSpells = ['firebolt', 'battle-cry'];

      expect(resolveActiveSideAttack(state)).toBe(true);

      // Firebolt deals 6 direct damage -> Enemy Hero HP is 14.
      // Battle Cry adds +1 per-unit damage -> Archer deals 1 * (5 + 1) = 6 damage.
      // Final Enemy Hero HP: 20 - 6 (Firebolt) - 6 (Archer) = 8.
      expect(state.enemyHeroHp).toBe(8);
    });

    it('supports Barrier / Dark Ward hero shield defensive semantics', () => {
      const state = createCleanCombat();

      // Clear any initial shields
      state.playerHeroShield = 0;
      state.playerHeroHp = 100;

      // Simulate playing Barrier (adds 5 hero shield)
      state.playerPlayedSpells = ['barrier'];
      expect(resolveActiveSideAttack(state)).toBe(true);
      expect(state.playerHeroShield).toBe(5);

      // 1. Damage smaller than shield
      applyDamageToHero(state, 'player', 3);
      expect(state.playerHeroShield).toBe(2);
      expect(state.playerHeroHp).toBe(100);

      // 2. Damage larger than shield (removes shield and subtracts excess from HP)
      applyDamageToHero(state, 'player', 7);
      expect(state.playerHeroShield).toBe(0);
      expect(state.playerHeroHp).toBe(95);

      // 3. Shield does not affect squad damage
      state.enemyHeroShield = 5;
      state.enemySquads = [
        {
          unitTypeId: 'duskborn-brute',
          count: 2,
          damagedUnitHp: null,
          position: { column: 1, row: 1 },
        },
      ];
      // Deal squad damage directly to Brute (base HP 8 per unit, count 2 -> 16 HP)
      applyDamageToSquad(state.enemySquads[0], DUSKBORN_BRUTE, 10);

      // Brute should take full damage (1 unit dies, next takes 2 damage -> count 1, damagedHp 6)
      expect(state.enemySquads[0].count).toBe(1);
      expect(state.enemySquads[0].damagedUnitHp).toBe(6);
      // Enemy Hero shield is unaffected!
      expect(state.enemyHeroShield).toBe(5);
    });

    it('handles Mana spending semantics exactly once and does not charge again during resolution', () => {
      const state = createCleanCombat();
      state.phase = 'ACTION';
      state.playerMana = { current: 3, max: 3 };

      // Set up hand containing 'firebolt'
      state.playerDeck.hand = ['firebolt'];

      // Play spell during ACTION phase
      const castSuccess = playSpell(state, 'player', 'firebolt');
      expect(castSuccess).toBe(true);
      expect(state.playerMana.current).toBe(1); // Spent 2 Mana for Firebolt

      // Move phase to RESOLUTION via confirmAttack
      state.playerSquads = [
        {
          unitTypeId: 'guardian',
          count: 1,
          damagedUnitHp: null,
          position: { column: 1, row: 2 },
        },
      ];
      state.selectedPlayerAbilities['guardian'] = 'guardian-strike';

      expect(confirmAttack(state)).toBe(true);
      expect(state.phase).toBe('RESOLUTION');

      // Resolve attacks
      expect(resolveActiveSideAttack(state)).toBe(true);
      // Verify Mana is still 1 (no double payment or second charge during resolution)
      expect(state.playerMana.current).toBe(1);
    });

    it('handles insufficient Mana and unused Mana correctly', () => {
      const state = createCleanCombat();
      state.phase = 'ACTION';
      state.playerMana = { current: 1, max: 3 };
      state.playerDeck.hand = ['firebolt']; // costs 2 Mana

      const castSuccess = playSpell(state, 'player', 'firebolt');
      expect(castSuccess).toBe(false); // Insufficient Mana
      expect(state.playerMana.current).toBe(1); // Unchanged
      expect(state.playerDeck.hand).toContain('firebolt'); // Still in hand

      // Confirm with unused Mana remaining (Mana = 1)
      state.playerSquads = [
        {
          unitTypeId: 'guardian',
          count: 1,
          damagedUnitHp: null,
          position: { column: 1, row: 2 },
        },
      ];
      state.selectedPlayerAbilities['guardian'] = 'guardian-strike';

      expect(confirmAttack(state)).toBe(true);
      expect(resolveActiveSideAttack(state)).toBe(true);
      expect(state.playerMana.current).toBe(1); // Resolved with unused Mana remaining
    });

    it('clears played spells at TURN_START and refreshes Mana during turn handoff', () => {
      const state = createCleanCombat();
      // Ends in RESOLUTION phase
      state.playerPlayedSpells = ['firebolt'];

      expect(resolveActiveSideAttack(state)).toBe(true);
      expect(state.phase).toBe('TURN_END');

      // Hand off turn to enemy
      expect(endTurn(state)).toBe(true);

      // Now it is Enemy turn, in DEPLOYMENT phase
      expect(state.activeSide).toBe('enemy');
      expect(state.phase).toBe('DEPLOYMENT');
      // Enemy played spells should be initialized / cleared
      expect(state.enemyPlayedSpells).toEqual([]);

      // End enemy turn and return to player
      state.phase = 'RESOLUTION';
      state.enemyPlayedSpells = ['dusk-strike'];
      expect(resolveActiveSideAttack(state)).toBe(true);
      expect(endTurn(state)).toBe(true);

      // Active side is Player again
      expect(state.activeSide).toBe('player');
      expect(state.playerPlayedSpells).toEqual([]); // Cleared at start of turn!
      expect(state.playerMana.current).toBe(3); // Refreshed to max!
    });
  });
});

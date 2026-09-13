import { describe, expect, it } from 'vitest';
import {
  createInitialPlayerCombatDeck,
  createInitialEnemyCombatDeck,
  shuffleCards,
  type CombatCard,
  type CreatureCard,
  type SpellCard,
} from '../src/game/combat/CombatCard';
import type { Squad } from '../src/game/combat/Squad';
import { UNIT_REGISTRY } from '../src/game/content/unitTypes';
import { SPELL_REGISTRY } from '../src/game/content/spells';

describe('Unified Combat Card Model', () => {
  describe('CombatCard typing and discriminator', () => {
    it('verifies CreatureCard discriminated fields and types', () => {
      const card: CombatCard = {
        instanceId: 'creature:guardian:0',
        cardType: 'CREATURE',
        contentId: 'guardian',
        unitTypeId: 'guardian',
      };

      expect(card.cardType).toBe('CREATURE');
      expect(card.instanceId).toBe('creature:guardian:0');
      expect(card.contentId).toBe('guardian');
      if (card.cardType === 'CREATURE') {
        expect(card.unitTypeId).toBe('guardian');
      } else {
        throw new Error('Type guard failed');
      }
    });

    it('verifies SpellCard discriminated fields and types', () => {
      const card: CombatCard = {
        instanceId: 'spell:firebolt:0',
        cardType: 'SPELL',
        contentId: 'firebolt',
        spellId: 'firebolt',
      };

      expect(card.cardType).toBe('SPELL');
      expect(card.instanceId).toBe('spell:firebolt:0');
      expect(card.contentId).toBe('firebolt');
      if (card.cardType === 'SPELL') {
        expect(card.spellId).toBe('firebolt');
      } else {
        throw new Error('Type guard failed');
      }
    });
  });

  describe('Unique card instances and duplicate spells', () => {
    it('verifies that two spell cards for the same spell have different unique instanceIds', () => {
      const squads: Squad[] = [];
      const spells = ['firebolt', 'firebolt'];
      const deck = createInitialPlayerCombatDeck(squads, spells);

      expect(deck.drawPile.length).toBe(2);
      const card1 = deck.drawPile[0] as SpellCard;
      const card2 = deck.drawPile[1] as SpellCard;

      expect(card1.spellId).toBe('firebolt');
      expect(card2.spellId).toBe('firebolt');
      expect(card1.instanceId).not.toBe(card2.instanceId);
      expect(card1.instanceId).toBe('spell:firebolt:0');
      expect(card2.instanceId).toBe('spell:firebolt:1');
    });
  });

  describe('Player pool and invariant constraints', () => {
    it('creates correct Creature cards and Spell cards for the player', () => {
      const squads: Squad[] = [
        { unitTypeId: 'guardian', count: 8, damagedUnitHp: null, position: null },
        { unitTypeId: 'archer', count: 3, damagedUnitHp: null, position: null },
      ];
      const spells = ['firebolt', 'barrier', 'battle-cry'];
      const deck = createInitialPlayerCombatDeck(squads, spells);

      // Verify sizes
      expect(deck.drawPile.length).toBe(5);

      const creatures = deck.drawPile.filter((c) => c.cardType === 'CREATURE') as CreatureCard[];
      const spellCards = deck.drawPile.filter((c) => c.cardType === 'SPELL') as SpellCard[];

      expect(creatures.length).toBe(2);
      expect(spellCards.length).toBe(3);

      expect(creatures[0].unitTypeId).toBe('guardian');
      expect(creatures[1].unitTypeId).toBe('archer');

      expect(spellCards[0].spellId).toBe('firebolt');
      expect(spellCards[1].spellId).toBe('barrier');
      expect(spellCards[2].spellId).toBe('battle-cry');
    });

    it('preserves the one-squad-per-unit-type invariant even if soldier count is high', () => {
      const squads: Squad[] = [
        { unitTypeId: 'guardian', count: 8, damagedUnitHp: null, position: null },
      ];
      const deck = createInitialPlayerCombatDeck(squads, []);

      expect(deck.drawPile.length).toBe(1);
      expect(deck.drawPile[0].cardType).toBe('CREATURE');
      expect((deck.drawPile[0] as CreatureCard).unitTypeId).toBe('guardian');
    });

    it('does not create Creature cards for empty (count = 0) squads', () => {
      const squads: Squad[] = [
        { unitTypeId: 'guardian', count: 0, damagedUnitHp: null, position: null },
        { unitTypeId: 'archer', count: 3, damagedUnitHp: null, position: null },
      ];
      const deck = createInitialPlayerCombatDeck(squads, []);

      expect(deck.drawPile.length).toBe(1);
      expect((deck.drawPile[0] as CreatureCard).unitTypeId).toBe('archer');
    });
  });

  describe('Enemy / Duskborn pool', () => {
    it('creates correct initial enemy combat deck matching squads and spells', () => {
      const enemySquads: Squad[] = [
        { unitTypeId: 'duskborn-brute', count: 4, damagedUnitHp: null, position: null },
        { unitTypeId: 'duskborn-archer', count: 2, damagedUnitHp: null, position: null },
      ];
      const enemySpells = ['dusk-strike', 'dark-ward'];
      const deck = createInitialEnemyCombatDeck(enemySquads, enemySpells);

      expect(deck.drawPile.length).toBe(4);

      const creatures = deck.drawPile.filter((c) => c.cardType === 'CREATURE') as CreatureCard[];
      const spells = deck.drawPile.filter((c) => c.cardType === 'SPELL') as SpellCard[];

      expect(creatures.length).toBe(2);
      expect(creatures[0].unitTypeId).toBe('duskborn-brute');
      expect(creatures[1].unitTypeId).toBe('duskborn-archer');

      expect(spells.length).toBe(2);
      expect(spells[0].spellId).toBe('dusk-strike');
      expect(spells[1].spellId).toBe('dark-ward');
    });
  });

  describe('Registry references', () => {
    it('verifies all generated Creature cards point to valid UNIT_REGISTRY IDs', () => {
      const playerSquads: Squad[] = [
        { unitTypeId: 'guardian', count: 8, damagedUnitHp: null, position: null },
        { unitTypeId: 'archer', count: 3, damagedUnitHp: null, position: null },
      ];
      const deck = createInitialPlayerCombatDeck(playerSquads, []);

      for (const card of deck.drawPile) {
        if (card.cardType === 'CREATURE') {
          expect(UNIT_REGISTRY.has(card.contentId)).toBe(true);
          expect(UNIT_REGISTRY.has((card as CreatureCard).unitTypeId)).toBe(true);
        }
      }
    });

    it('verifies all generated Spell cards point to valid SPELL_REGISTRY IDs', () => {
      const deck = createInitialPlayerCombatDeck([], ['firebolt', 'barrier', 'battle-cry', 'dusk-strike', 'dark-ward']);

      for (const card of deck.drawPile) {
        if (card.cardType === 'SPELL') {
          expect(SPELL_REGISTRY.has(card.contentId)).toBe(true);
          expect(SPELL_REGISTRY.has((card as SpellCard).spellId)).toBe(true);
        }
      }
    });
  });

  describe('Shuffle helper', () => {
    const originalCards: CombatCard[] = [
      { instanceId: 'c1', cardType: 'CREATURE', contentId: 'guardian', unitTypeId: 'guardian' },
      { instanceId: 'c2', cardType: 'CREATURE', contentId: 'archer', unitTypeId: 'archer' },
      { instanceId: 's1', cardType: 'SPELL', contentId: 'firebolt', spellId: 'firebolt' },
      { instanceId: 's2', cardType: 'SPELL', contentId: 'barrier', spellId: 'barrier' },
    ];

    it('does not mutate the source input array', () => {
      const copy = [...originalCards];
      shuffleCards(originalCards);

      expect(originalCards).toEqual(copy);
    });

    it('contains the exact same set of cards after shuffling', () => {
      const shuffled = shuffleCards(originalCards);

      expect(shuffled.length).toBe(originalCards.length);
      for (const card of originalCards) {
        expect(shuffled.some((c) => c.instanceId === card.instanceId)).toBe(true);
      }
    });

    it('results in a deterministic shuffle order when given a seeded/deterministic RNG', () => {
      // Linear Congruential Generator (LCG) or predefined sequences for simple deterministic float sequences
      const sequence = [0.1, 0.4, 0.7, 0.9];
      let seqIndex = 0;
      const fakeRandom = () => sequence[seqIndex++ % sequence.length];

      const shuffled1 = shuffleCards(originalCards, fakeRandom);

      seqIndex = 0; // reset
      const shuffled2 = shuffleCards(originalCards, fakeRandom);

      expect(shuffled1).toEqual(shuffled2);

      // Verify it actually permuted from original
      expect(shuffled1).not.toEqual(originalCards);
    });
  });
});

import { describe, expect, it } from 'vitest';
import {
  createInitialPlayerCombatDeck,
  createInitialEnemyCombatDeck,
  shuffleCards,
  initializeOpeningCombatCards,
  discardSpellCard,
  hasDuplicateCardInstances,
  type CombatCard,
  type CreatureCard,
  type SpellCard,
} from '../src/game/combat/CombatCard';
import type { Squad } from '../src/game/combat/Squad';
import { UNIT_REGISTRY } from '../src/game/content/unitTypes';
import { SPELL_REGISTRY } from '../src/game/content/spells';
import {
  executeOpeningDraw,
  syncUnifiedSpellsFromLegacy,
  createInitialPlayerSpellDeck,
  createInitialEnemySpellDeck,
  type CombatState,
} from '../src/game/combat/CombatState';

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

  describe('Opening card draw initialization and hand/bench state', () => {
    it('performs a standard opening draw with 2 creatures + 3 spells', () => {
      const squads: Squad[] = [
        { unitTypeId: 'guardian', count: 8, damagedUnitHp: null, position: null },
        { unitTypeId: 'archer', count: 3, damagedUnitHp: null, position: null },
      ];
      const spells = ['firebolt', 'barrier', 'battle-cry'];
      const initialDeck = createInitialPlayerCombatDeck(squads, spells);

      // We'll use a fixed sequence of random numbers: always pick the first element (index 0)
      const mockRandom = () => 0;

      const openingState = initializeOpeningCombatCards(initialDeck, mockRandom);

      expect(openingState.creatureBench.length).toBe(2);
      expect(openingState.spellHand.length).toBe(1);
      expect(openingState.drawPile.length).toBe(2);
      expect(openingState.discardPile.length).toBe(0);

      // Categories are correct
      expect(openingState.creatureBench.every((c) => c.cardType === 'CREATURE')).toBe(true);
      expect(openingState.spellHand.every((s) => s.cardType === 'SPELL')).toBe(true);

      // No duplicates across any zones
      expect(hasDuplicateCardInstances(openingState)).toBe(false);
    });

    it('remains deterministic under specific random sequence and different sequence selects different cards', () => {
      const squads: Squad[] = [
        { unitTypeId: 'guardian', count: 8, damagedUnitHp: null, position: null },
        { unitTypeId: 'archer', count: 3, damagedUnitHp: null, position: null },
      ];
      const spells = ['firebolt', 'barrier', 'battle-cry'];
      const initialDeck = createInitialPlayerCombatDeck(squads, spells);

      // Random sequence 1: always picks first
      const seq1 = [0.0, 0.0, 0.0];
      let idx1 = 0;
      const rand1 = () => seq1[idx1++];

      // Random sequence 2: picks second (index 1) for creatures, second for spells
      const seq2 = [0.99, 0.99, 0.99]; // 0.99 * 2 = 1.98 -> index 1, etc.
      let idx2 = 0;
      const rand2 = () => seq2[idx2++];

      const state1 = initializeOpeningCombatCards(initialDeck, rand1);
      const state2 = initializeOpeningCombatCards(initialDeck, rand2);

      expect(state1.creatureBench[0].unitTypeId).toBe('guardian');
      expect(state1.creatureBench[1].unitTypeId).toBe('archer');
      expect(state1.spellHand[0].spellId).toBe('firebolt');

      expect(state2.creatureBench[0].unitTypeId).toBe('archer');
      expect(state2.creatureBench[1].unitTypeId).toBe('guardian');
      expect(state2.spellHand[0].spellId).toBe('battle-cry');
    });

    it('handles insufficient creatures or spells gracefully without inventing cards', () => {
      // 1. Only 1 Creature available
      const squads1: Squad[] = [
        { unitTypeId: 'guardian', count: 8, damagedUnitHp: null, position: null },
      ];
      const deck1 = createInitialPlayerCombatDeck(squads1, ['firebolt', 'barrier']);
      const state1 = initializeOpeningCombatCards(deck1);
      expect(state1.creatureBench.length).toBe(1);
      expect(state1.creatureBench[0].unitTypeId).toBe('guardian');

      // 2. No Creatures available
      const deck2 = createInitialPlayerCombatDeck([], ['firebolt', 'barrier']);
      const state2 = initializeOpeningCombatCards(deck2);
      expect(state2.creatureBench.length).toBe(0);
      expect(state2.spellHand.length).toBe(1);

      // 3. No Spells available
      const squads3: Squad[] = [
        { unitTypeId: 'guardian', count: 8, damagedUnitHp: null, position: null },
      ];
      const deck3 = createInitialPlayerCombatDeck(squads3, []);
      const state3 = initializeOpeningCombatCards(deck3);
      expect(state3.creatureBench.length).toBe(1);
      expect(state3.spellHand.length).toBe(0);

      // 4. Empty starting pool
      const deckEmpty = createInitialPlayerCombatDeck([], []);
      const stateEmpty = initializeOpeningCombatCards(deckEmpty);
      expect(stateEmpty.creatureBench.length).toBe(0);
      expect(stateEmpty.spellHand.length).toBe(0);
      expect(stateEmpty.drawPile.length).toBe(0);
      expect(stateEmpty.discardPile.length).toBe(0);
      expect(hasDuplicateCardInstances(stateEmpty)).toBe(false);
    });

    it('guarantees double initialization is a safe no-op or returns false', () => {
      const combat: CombatState = {
        playerSquads: [{ unitTypeId: 'guardian', count: 8, damagedUnitHp: null, position: null }],
        enemySquads: [],
        playerHeroHp: 100,
        enemyHeroHp: 100,
        activeSide: 'player',
        turn: 1,
        phase: 'TURN_START',
        playerMana: { current: 3, max: 3 },
        enemyMana: { current: 3, max: 3 },
        playerDeck: createInitialPlayerSpellDeck(),
        enemyDeck: createInitialEnemySpellDeck(),
        selectedPlayerAbilities: {},
        selectedEnemyAbilities: {},
      };

      combat.playerCombatDeck = createInitialPlayerCombatDeck(combat.playerSquads, combat.playerDeck.drawPile);

      const firstSuccess = executeOpeningDraw(combat);
      expect(firstSuccess).toBe(true);
      expect(combat.openingDrawCompleted).toBe(true);

      const beforeState = structuredClone(combat.playerCombatDeck);

      // Second call must return false and not modify the deck further
      const secondSuccess = executeOpeningDraw(combat);
      expect(secondSuccess).toBe(false);
      expect(combat.playerCombatDeck).toEqual(beforeState);
    });

    it('verifies move from spell hand to discard atomically via discardSpellCard helper', () => {
      const squads: Squad[] = [];
      const spells = ['firebolt', 'firebolt', 'barrier'];
      const cards = createInitialPlayerCombatDeck(squads, spells);

      // Draw all into hand for testing discard
      cards.spellHand = [...cards.drawPile] as SpellCard[];
      cards.drawPile = [];

      expect(cards.spellHand.length).toBe(3);

      const cardToDiscard = cards.spellHand[0]; // first firebolt ('spell:firebolt:0')
      const anotherDuplicate = cards.spellHand[1]; // second firebolt ('spell:firebolt:1')

      const success = discardSpellCard(cards, cardToDiscard.instanceId);
      expect(success).toBe(true);

      // Exact instance is in discard pile
      expect(cards.discardPile).toContain(cardToDiscard);
      expect(cards.spellHand).not.toContain(cardToDiscard);

      // The second duplicate card is unaffected
      expect(cards.spellHand).toContain(anotherDuplicate);
      expect(cards.discardPile).not.toContain(anotherDuplicate);
    });

    it('preserves legacy source integrity and builds starting pool from full starting spell collection', () => {
      // Create a legacy deck with cards already in hand and discard
      const legacyDeck = {
        drawPile: ['firebolt'],
        hand: ['barrier'],
        discardPile: ['battle-cry'],
      };

      const squads = [{ unitTypeId: 'guardian', count: 8, damagedUnitHp: null, position: null }];

      // Build pool from full collection as done in CombatScene.ts
      const fullSpells = [
        ...legacyDeck.drawPile,
        ...legacyDeck.hand,
        ...legacyDeck.discardPile,
      ];

      const pool = createInitialPlayerCombatDeck(squads, fullSpells);

      // Expect 3 spell cards in pool, none should be lost
      const spellCardsInPool = pool.drawPile.filter((c) => c.cardType === 'SPELL');
      expect(spellCardsInPool.length).toBe(3);
      expect(spellCardsInPool.some((c) => c.contentId === 'firebolt')).toBe(true);
      expect(spellCardsInPool.some((c) => c.contentId === 'barrier')).toBe(true);
      expect(spellCardsInPool.some((c) => c.contentId === 'battle-cry')).toBe(true);
    });

    it('synchronizes unified spells from the legacy deck', () => {
      const legacyDeck = {
        drawPile: ['firebolt'],
        hand: ['barrier'],
        discardPile: ['battle-cry'],
      };

      const unified = {
        drawPile: [
          { instanceId: 'spell:firebolt:0', cardType: 'SPELL', contentId: 'firebolt', spellId: 'firebolt' },
          { instanceId: 'creature:guardian:0', cardType: 'CREATURE', contentId: 'guardian', unitTypeId: 'guardian' },
        ] as CombatCard[],
        spellHand: [
          { instanceId: 'spell:barrier:0', cardType: 'SPELL', contentId: 'barrier', spellId: 'barrier' },
        ] as SpellCard[],
        creatureBench: [
          { instanceId: 'creature:archer:0', cardType: 'CREATURE', contentId: 'archer', unitTypeId: 'archer' },
        ] as CreatureCard[],
        discardPile: [
          { instanceId: 'spell:battle-cry:0', cardType: 'SPELL', contentId: 'battle-cry', spellId: 'battle-cry' },
        ] as CombatCard[],
      };

      syncUnifiedSpellsFromLegacy(unified, legacyDeck);

      // Verify spell Hand matches legacy hand
      expect(unified.spellHand.length).toBe(1);
      expect(unified.spellHand[0].spellId).toBe('barrier');
      expect(unified.spellHand[0].instanceId).toBe('spell:barrier:0');

      // Verify draw pile has correct spell and STILL has the Creature card
      expect(unified.drawPile.length).toBe(2);
      expect(unified.drawPile.some((c) => c.instanceId === 'creature:guardian:0')).toBe(true);
      expect(unified.drawPile.some((c) => c.instanceId === 'spell:firebolt:0')).toBe(true);

      // Verify creatureBench was untouched
      expect(unified.creatureBench.length).toBe(1);
      expect(unified.creatureBench[0].instanceId).toBe('creature:archer:0');

      // Verify discard pile has correct spell
      expect(unified.discardPile.length).toBe(1);
      expect(unified.discardPile[0].contentId).toBe('battle-cry');
      expect(unified.discardPile[0].instanceId).toBe('spell:battle-cry:0');
    });
  });
});

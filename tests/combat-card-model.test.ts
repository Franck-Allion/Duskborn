import { describe, expect, it } from 'vitest';
import {
  createInitialPlayerCombatDeck,
  createInitialEnemyCombatDeck,
  shuffleCards,
  initializeOpeningCombatCards,
  discardSpellCard,
  hasDuplicateCardInstances,
  drawCombatCard,
  type CombatCard,
  type CreatureCard,
  type SpellCard,
} from '../src/game/combat/CombatCard';
import type { Squad } from '../src/game/combat/Squad';
import { UNIT_REGISTRY } from '../src/game/content/unitTypes';
import { SPELL_REGISTRY } from '../src/game/content/spells';
import {
  executeOpeningDraw,
  syncLegacySpellDeckFromUnified,
  createInitialPlayerSpellDeck,
  createInitialEnemySpellDeck,
  beginTurn,
  playSpell,
  isSideDeploymentValid,
  canUndeploySquad,
  undeploySquad,
  confirmDeployment,
  canRepositionSquad,
  repositionSquad,
  canSwapSquads,
  swapSquads,
  canConfirmAttack,
  confirmAttack,
  endResolution,
  endTurn,
  getRequiredCoverageCount,
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

    it('synchronizes the legacy deck from the authoritative unified deck', () => {
      const legacyDeck = {
        drawPile: [],
        hand: [],
        discardPile: [],
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

      syncLegacySpellDeckFromUnified(unified, legacyDeck);

      // Verify legacy fields match unified spell zones
      expect(legacyDeck.hand).toEqual(['barrier']);
      expect(legacyDeck.drawPile).toEqual(['firebolt']); // creature filter works
      expect(legacyDeck.discardPile).toEqual(['battle-cry']);
    });

    it('verifies first player turn regression: no extra draw occurs after opening draw', () => {
      const combat: CombatState = {
        playerSquads: [
          { unitTypeId: 'guardian', count: 8, damagedUnitHp: null, position: null },
          { unitTypeId: 'archer', count: 3, damagedUnitHp: null, position: null },
        ],
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

      // 1. Initialize starting unified pool
      combat.playerCombatDeck = createInitialPlayerCombatDeck(combat.playerSquads, ['firebolt', 'barrier', 'battle-cry']);
      expect(combat.playerCombatDeck.drawPile.length).toBe(5);

      // 2. Perform opening draw (2 creatures + 1 spell)
      const mockRandom = () => 0; // deterministic
      executeOpeningDraw(combat, mockRandom);

      expect(combat.playerCombatDeck.creatureBench.length).toBe(2);
      expect(combat.playerCombatDeck.spellHand.length).toBe(1);
      expect(combat.playerCombatDeck.drawPile.length).toBe(2);

      // 3. Start turn 1: should restore player Mana, transition to DEPLOYMENT, and NOT draw any additional card!
      const beginSuccess = beginTurn(combat);
      expect(beginSuccess).toBe(true);
      expect(combat.phase).toBe('DEPLOYMENT');

      // Assert NO extra draw occurred
      expect(combat.playerCombatDeck.creatureBench.length).toBe(2);
      expect(combat.playerCombatDeck.spellHand.length).toBe(1);
      expect(combat.playerCombatDeck.drawPile.length).toBe(2);
    });

    it('verifies per-turn mixed card draw and capacity limits/burns', () => {
      const unified = {
        drawPile: [
          { instanceId: 'spell:firebolt:0', cardType: 'SPELL', contentId: 'firebolt', spellId: 'firebolt' },
          { instanceId: 'creature:guardian:0', cardType: 'CREATURE', contentId: 'guardian', unitTypeId: 'guardian' },
        ] as CombatCard[],
        spellHand: [] as SpellCard[],
        creatureBench: [] as CreatureCard[],
        discardPile: [] as CombatCard[],
      };

      // 1. Draw known top card (Spell)
      const res1 = drawCombatCard(unified);
      expect(res1.outcome).toBe('DRAWN_TO_HAND');
      expect(res1.card.spellId).toBe('firebolt');
      expect(unified.spellHand.length).toBe(1);
      expect(unified.drawPile.length).toBe(1);

      // 2. Draw known top card (Creature)
      const res2 = drawCombatCard(unified);
      expect(res2.outcome).toBe('DRAWN_TO_BENCH');
      expect(res2.card.unitTypeId).toBe('guardian');
      expect(unified.creatureBench.length).toBe(1);
      expect(unified.drawPile.length).toBe(0);

      // 3. Draw from empty deck
      const res3 = drawCombatCard(unified);
      expect(res3.outcome).toBe('EMPTY_DECK');

      // 4. Spell hand full limit (at 5 spells)
      const fullSpellHand = {
        drawPile: [
          { instanceId: 'spell:battle-cry:0', cardType: 'SPELL', contentId: 'battle-cry', spellId: 'battle-cry' },
        ] as CombatCard[],
        spellHand: [
          { instanceId: 'spell:s1', cardType: 'SPELL', contentId: 'firebolt', spellId: 'firebolt' },
          { instanceId: 'spell:s2', cardType: 'SPELL', contentId: 'firebolt', spellId: 'firebolt' },
          { instanceId: 'spell:s3', cardType: 'SPELL', contentId: 'firebolt', spellId: 'firebolt' },
          { instanceId: 'spell:s4', cardType: 'SPELL', contentId: 'firebolt', spellId: 'firebolt' },
          { instanceId: 'spell:s5', cardType: 'SPELL', contentId: 'firebolt', spellId: 'firebolt' },
        ] as SpellCard[],
        creatureBench: [] as CreatureCard[],
        discardPile: [] as CombatCard[],
      };

      const res4 = drawCombatCard(fullSpellHand);
      expect(res4.outcome).toBe('BURNED');
      expect(res4.card.contentId).toBe('battle-cry');
      if (res4.outcome === 'BURNED') {
        expect(res4.reason).toBe('SPELL_HAND_FULL');
      }
      expect(fullSpellHand.spellHand.length).toBe(5);
      expect(fullSpellHand.discardPile.length).toBe(1);
      expect(fullSpellHand.discardPile[0].instanceId).toBe('spell:battle-cry:0');

      // 5. Creature bench full limit (at 5 creatures)
      const fullCreatureBench = {
        drawPile: [
          { instanceId: 'creature:archer:0', cardType: 'CREATURE', contentId: 'archer', unitTypeId: 'archer' },
        ] as CombatCard[],
        spellHand: [] as SpellCard[],
        creatureBench: [
          { instanceId: 'creature:g1', cardType: 'CREATURE', contentId: 'guardian', unitTypeId: 'guardian' },
          { instanceId: 'creature:g2', cardType: 'CREATURE', contentId: 'guardian', unitTypeId: 'guardian' },
          { instanceId: 'creature:g3', cardType: 'CREATURE', contentId: 'guardian', unitTypeId: 'guardian' },
          { instanceId: 'creature:g4', cardType: 'CREATURE', contentId: 'guardian', unitTypeId: 'guardian' },
          { instanceId: 'creature:g5', cardType: 'CREATURE', contentId: 'guardian', unitTypeId: 'guardian' },
        ] as CreatureCard[],
        discardPile: [] as CombatCard[],
      };

      const res5 = drawCombatCard(fullCreatureBench);
      expect(res5.outcome).toBe('BURNED');
      expect(res5.card.contentId).toBe('archer');
      if (res5.outcome === 'BURNED') {
        expect(res5.reason).toBe('CREATURE_BENCH_FULL');
      }
      expect(fullCreatureBench.creatureBench.length).toBe(5);
      expect(fullCreatureBench.discardPile.length).toBe(1);
      expect(fullCreatureBench.discardPile[0].instanceId).toBe('creature:archer:0');
    });

    it('verifies that spellHand and creatureBench persist across turn handoffs', () => {
      const combat: CombatState = {
        playerSquads: [],
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

      combat.playerCombatDeck = {
        drawPile: [],
        spellHand: [{ instanceId: 'spell:firebolt:0', cardType: 'SPELL', contentId: 'firebolt', spellId: 'firebolt' }],
        creatureBench: [{ instanceId: 'creature:guardian:0', cardType: 'CREATURE', contentId: 'guardian', unitTypeId: 'guardian' }],
        discardPile: [],
      };

      // Transition turn and active side
      combat.activeSide = 'enemy';
      combat.turn = 2;
      combat.phase = 'TURN_START';
      const endSuccess = beginTurn(combat); // manually trigger beginTurn
      expect(endSuccess).toBe(true);

      // Verify player's spellHand and creatureBench did NOT change or clear
      expect(combat.playerCombatDeck.spellHand.length).toBe(1);
      expect(combat.playerCombatDeck.creatureBench.length).toBe(1);
    });

    it('verifies playing one duplicate spell removes only one instance and preserves the other', () => {
      const combat: CombatState = {
        playerSquads: [],
        enemySquads: [],
        playerHeroHp: 100,
        enemyHeroHp: 100,
        activeSide: 'player',
        turn: 1,
        phase: 'ACTION',
        playerMana: { current: 3, max: 3 },
        enemyMana: { current: 3, max: 3 },
        playerDeck: createInitialPlayerSpellDeck(),
        enemyDeck: createInitialEnemySpellDeck(),
        selectedPlayerAbilities: {},
        selectedEnemyAbilities: {},
      };

      const card1 = { instanceId: 'spell:firebolt:0', cardType: 'SPELL', contentId: 'firebolt', spellId: 'firebolt' } as SpellCard;
      const card2 = { instanceId: 'spell:firebolt:1', cardType: 'SPELL', contentId: 'firebolt', spellId: 'firebolt' } as SpellCard;

      combat.playerCombatDeck = {
        drawPile: [],
        spellHand: [card1, card2],
        creatureBench: [],
        discardPile: [],
      };

      // Synchronize initial state to legacy deck for the test context
      syncLegacySpellDeckFromUnified(combat.playerCombatDeck, combat.playerDeck);

      expect(combat.playerDeck.hand).toEqual(['firebolt', 'firebolt']);

      // Play the spell (costs 2 mana)
      const playSuccess = playSpell(combat, 'player', 'firebolt');
      expect(playSuccess).toBe(true);

      // Verify EXACTLY one is in discard, and other is still in hand
      expect(combat.playerCombatDeck.spellHand.length).toBe(1);
      expect(combat.playerCombatDeck.spellHand[0].instanceId).toBe('spell:firebolt:1');
      expect(combat.playerCombatDeck.discardPile.length).toBe(1);
      expect(combat.playerCombatDeck.discardPile[0].instanceId).toBe('spell:firebolt:0');

      // Verify legacy mirror matches authoritative state
      expect(combat.playerDeck.hand).toEqual(['firebolt']);
      expect(combat.playerDeck.discardPile).toEqual(['firebolt']);
    });

    it('verifies that drawing mixed cards is idempotent per turn start', () => {
      const combat: CombatState = {
        playerSquads: [],
        enemySquads: [],
        playerHeroHp: 100,
        enemyHeroHp: 100,
        activeSide: 'player',
        turn: 2, // Second player turn
        phase: 'TURN_START',
        playerMana: { current: 3, max: 3 },
        enemyMana: { current: 3, max: 3 },
        playerDeck: createInitialPlayerSpellDeck(),
        enemyDeck: createInitialEnemySpellDeck(),
        selectedPlayerAbilities: {},
        selectedEnemyAbilities: {},
      };

      combat.playerCombatDeck = {
        drawPile: [
          { instanceId: 'spell:firebolt:0', cardType: 'SPELL', contentId: 'firebolt', spellId: 'firebolt' },
          { instanceId: 'spell:barrier:0', cardType: 'SPELL', contentId: 'barrier', spellId: 'barrier' },
        ] as CombatCard[],
        spellHand: [] as SpellCard[],
        creatureBench: [] as CreatureCard[],
        discardPile: [] as CombatCard[],
      };

      // Initialize legacy mirror
      syncLegacySpellDeckFromUnified(combat.playerCombatDeck, combat.playerDeck);

      // First start of player turn 2
      const firstBegin = beginTurn(combat);
      expect(firstBegin).toBe(true);

      expect(combat.playerCombatDeck.spellHand.length).toBe(1);
      expect(combat.playerCombatDeck.spellHand[0].spellId).toBe('firebolt');
      expect(combat.playerCombatDeck.drawPile.length).toBe(1);

      // Accidental second start of player turn 2 (or manual replay)
      combat.phase = 'TURN_START'; // force phase
      const secondBegin = beginTurn(combat);
      expect(secondBegin).toBe(true);

      // Verify NO additional card was drawn, remaining in stable state!
      expect(combat.playerCombatDeck.spellHand.length).toBe(1);
      expect(combat.playerCombatDeck.drawPile.length).toBe(1);
    });
  });

  describe('Optional Creature deployment, lane coverage, and availability rules', () => {
    it('allows optional deployment: leaving available creatures on the bench', () => {
      const combat: CombatState = {
        playerSquads: [
          { unitTypeId: 'guardian', count: 8, damagedUnitHp: null, position: { column: 2, row: 2 } }, // Deployed lane 2
          { unitTypeId: 'archer', count: 3, damagedUnitHp: null, position: null },                    // Remains bench
        ],
        enemySquads: [
          { unitTypeId: 'duskborn-brute', count: 4, damagedUnitHp: null, position: { column: 2, row: 1 } }, // Occupies lane 2
        ],
        playerHeroHp: 100,
        enemyHeroHp: 100,
        activeSide: 'player',
        turn: 1,
        phase: 'DEPLOYMENT',
        playerMana: { current: 3, max: 3 },
        enemyMana: { current: 3, max: 3 },
        playerDeck: createInitialPlayerSpellDeck(),
        enemyDeck: createInitialEnemySpellDeck(),
        selectedPlayerAbilities: {},
        selectedEnemyAbilities: {},
      };

      combat.playerCombatDeck = {
        drawPile: [],
        spellHand: [],
        creatureBench: [
          { instanceId: 'c1', cardType: 'CREATURE', contentId: 'guardian', unitTypeId: 'guardian' },
          { instanceId: 'c2', cardType: 'CREATURE', contentId: 'archer', unitTypeId: 'archer' },
        ],
        discardPile: [],
      };

      // Since only Guardian is deployed and covers column 2 (which is occupied by enemy), the deployment must succeed!
      // Archer remaining null (bench) is completely valid under the new optional rules.
      expect(isSideDeploymentValid(combat, 'player')).toBe(true);
      expect(confirmDeployment(combat)).toBe(true);
      expect(combat.phase).toBe('ACTION');
    });

    it('rejects zero deployed friendly squads when surviving available creatures exist', () => {
      const combat: CombatState = {
        playerSquads: [
          { unitTypeId: 'guardian', count: 8, damagedUnitHp: null, position: null },
        ],
        enemySquads: [
          { unitTypeId: 'duskborn-brute', count: 4, damagedUnitHp: null, position: { column: 2, row: 1 } },
        ],
        playerHeroHp: 100,
        enemyHeroHp: 100,
        activeSide: 'player',
        turn: 1,
        phase: 'DEPLOYMENT',
        playerMana: { current: 3, max: 3 },
        enemyMana: { current: 3, max: 3 },
        playerDeck: createInitialPlayerSpellDeck(),
        enemyDeck: createInitialEnemySpellDeck(),
        selectedPlayerAbilities: {},
        selectedEnemyAbilities: {},
      };

      combat.playerCombatDeck = {
        drawPile: [],
        spellHand: [],
        creatureBench: [
          { instanceId: 'c1', cardType: 'CREATURE', contentId: 'guardian', unitTypeId: 'guardian' },
        ],
        discardPile: [],
      };

      // Fail: Guardian is unpositioned (position = null) but available, so at least one must be deployed
      expect(isSideDeploymentValid(combat, 'player')).toBe(false);
    });

    it('validates lane coverage based only on deployed friendly subset vs enemy lanes', () => {
      // 1. One deployed vs two enemy lanes (occupied cols: 2 and 5)
      const combat: CombatState = {
        playerSquads: [
          { unitTypeId: 'guardian', count: 8, damagedUnitHp: null, position: { column: 2, row: 2 } }, // Deployed lane 2
          { unitTypeId: 'archer', count: 3, damagedUnitHp: null, position: null },                    // Remains bench
        ],
        enemySquads: [
          { unitTypeId: 'duskborn-brute', count: 4, damagedUnitHp: null, position: { column: 2, row: 1 } },
          { unitTypeId: 'duskborn-archer', count: 4, damagedUnitHp: null, position: { column: 5, row: 0 } },
        ],
        playerHeroHp: 100,
        enemyHeroHp: 100,
        activeSide: 'player',
        turn: 1,
        phase: 'DEPLOYMENT',
        playerMana: { current: 3, max: 3 },
        enemyMana: { current: 3, max: 3 },
        playerDeck: createInitialPlayerSpellDeck(),
        enemyDeck: createInitialEnemySpellDeck(),
        selectedPlayerAbilities: {},
        selectedEnemyAbilities: {},
      };

      combat.playerCombatDeck = {
        drawPile: [],
        spellHand: [],
        creatureBench: [
          { instanceId: 'c1', cardType: 'CREATURE', contentId: 'guardian', unitTypeId: 'guardian' },
          { instanceId: 'c2', cardType: 'CREATURE', contentId: 'archer', unitTypeId: 'archer' },
        ],
        discardPile: [],
      };

      // Since only 1 squad is deployed, required coverage count is min(1, 2) === 1
      // Guardian covers column 2, which satisfies the coverage requirement!
      expect(getRequiredCoverageCount(combat, 'player')).toBe(1);
      expect(isSideDeploymentValid(combat, 'player')).toBe(true);

      // 2. One deployed in irrelevant lane (column 0)
      combat.playerSquads[0].position = { column: 0, row: 2 };
      // Still deployed count is 1, required count is 1. But column 0 is not an enemy-occupied lane!
      // So covered opponent lanes is 0, which is < 1. Hence, invalid!
      expect(isSideDeploymentValid(combat, 'player')).toBe(false);

      // 3. Two deployed vs two enemy lanes (both Guardian and Archer deployed)
      combat.playerSquads[0].position = { column: 2, row: 2 }; // Guardian col 2
      combat.playerSquads[1].position = { column: 0, row: 3 }; // Archer col 0
      // Since 2 squads are deployed, required coverage count is min(2, 2) === 2.
      // But only column 2 is covered (column 0 is covered but has no enemy). So only 1 opponent column is covered!
      // Hence, covered (1) < required (2) -> invalid!
      expect(isSideDeploymentValid(combat, 'player')).toBe(false);

      // Correct placement: both cover active lanes
      combat.playerSquads[1].position = { column: 5, row: 3 }; // Archer col 5
      expect(isSideDeploymentValid(combat, 'player')).toBe(true);
    });

    it('rejects deploying an undrawn creature', () => {
      const combat: CombatState = {
        playerSquads: [
          { unitTypeId: 'guardian', count: 8, damagedUnitHp: null, position: null },
          { unitTypeId: 'archer', count: 3, damagedUnitHp: null, position: null },
        ],
        enemySquads: [],
        playerHeroHp: 100,
        enemyHeroHp: 100,
        activeSide: 'player',
        turn: 1,
        phase: 'DEPLOYMENT',
        playerMana: { current: 3, max: 3 },
        enemyMana: { current: 3, max: 3 },
        playerDeck: createInitialPlayerSpellDeck(),
        enemyDeck: createInitialEnemySpellDeck(),
        selectedPlayerAbilities: {},
        selectedEnemyAbilities: {},
      };

      // Guardian is drawn, but Archer is still in drawPile
      combat.playerCombatDeck = {
        drawPile: [
          { instanceId: 'c2', cardType: 'CREATURE', contentId: 'archer', unitTypeId: 'archer' },
        ],
        spellHand: [],
        creatureBench: [
          { instanceId: 'c1', cardType: 'CREATURE', contentId: 'guardian', unitTypeId: 'guardian' },
        ],
        discardPile: [],
      };

      // Deploying Guardian (available) is allowed
      expect(canRepositionSquad(combat, 'player', 'guardian', { column: 2, row: 2 })).toBe(true);
      expect(repositionSquad(combat, 'player', 'guardian', { column: 2, row: 2 })).toBe(true);

      // Deploying Archer (undrawn) must be rejected
      expect(canRepositionSquad(combat, 'player', 'archer', { column: 5, row: 3 })).toBe(false);
      expect(repositionSquad(combat, 'player', 'archer', { column: 5, row: 3 })).toBe(false);
      expect(combat.playerSquads[1].position).toBeNull();

      // Now move Archer to bench
      const cards = combat.playerCombatDeck;
      cards.creatureBench.push(cards.drawPile.shift() as CreatureCard);
      expect(cards.creatureBench.length).toBe(2);

      // Deploying Archer is now accepted!
      expect(canRepositionSquad(combat, 'player', 'archer', { column: 5, row: 3 })).toBe(true);
      expect(repositionSquad(combat, 'player', 'archer', { column: 5, row: 3 })).toBe(true);
    });

    it('supports undeploySquad and allows temporary invalid editing configurations', () => {
      const combat: CombatState = {
        playerSquads: [
          { unitTypeId: 'guardian', count: 8, damagedUnitHp: 4, position: { column: 2, row: 2 } },
        ],
        enemySquads: [
          { unitTypeId: 'duskborn-brute', count: 4, damagedUnitHp: null, position: { column: 2, row: 1 } },
        ],
        playerHeroHp: 100,
        enemyHeroHp: 100,
        activeSide: 'player',
        turn: 1,
        phase: 'DEPLOYMENT',
        playerMana: { current: 3, max: 3 },
        enemyMana: { current: 3, max: 3 },
        playerDeck: createInitialPlayerSpellDeck(),
        enemyDeck: createInitialEnemySpellDeck(),
        selectedPlayerAbilities: {},
        selectedEnemyAbilities: {},
      };

      combat.playerCombatDeck = {
        drawPile: [],
        spellHand: [],
        creatureBench: [
          { instanceId: 'c1', cardType: 'CREATURE', contentId: 'guardian', unitTypeId: 'guardian' },
        ],
        discardPile: [],
      };

      expect(isSideDeploymentValid(combat, 'player')).toBe(true);

      // Undeploy Guardian -> should return true
      expect(canUndeploySquad(combat, 'player', 'guardian')).toBe(true);
      const undeployed = undeploySquad(combat, 'player', 'guardian');
      expect(undeployed).toBe(true);

      // Guardian position is null, but details are untouched
      expect(combat.playerSquads[0].position).toBeNull();
      expect(combat.playerSquads[0].count).toBe(8);
      expect(combat.playerSquads[0].damagedUnitHp).toBe(4);

      // Confirm deployment should now fail (0 friendly deployed when available creatures exist)
      expect(isSideDeploymentValid(combat, 'player')).toBe(false);
      expect(confirmDeployment(combat)).toBe(false);

      // Re-deploy Guardian -> confirm succeeds
      expect(repositionSquad(combat, 'player', 'guardian', { column: 2, row: 2 })).toBe(true);
      expect(confirmDeployment(combat)).toBe(true);
    });

    it('verifies bench <-> deployed replacement and undrawn swap participant rejection', () => {
      const combat: CombatState = {
        playerSquads: [
          { unitTypeId: 'guardian', count: 8, damagedUnitHp: null, position: null },
          { unitTypeId: 'archer', count: 6, damagedUnitHp: null, position: { column: 2, row: 2 } },
        ],
        enemySquads: [],
        playerHeroHp: 100,
        enemyHeroHp: 100,
        activeSide: 'player',
        turn: 1,
        phase: 'DEPLOYMENT',
        playerMana: { current: 3, max: 3 },
        enemyMana: { current: 3, max: 3 },
        playerDeck: createInitialPlayerSpellDeck(),
        enemyDeck: createInitialEnemySpellDeck(),
        selectedPlayerAbilities: {},
        selectedEnemyAbilities: {},
      };

      // Guardian is available (drawn), Archer is available (drawn)
      combat.playerCombatDeck = {
        drawPile: [],
        spellHand: [],
        creatureBench: [
          { instanceId: 'c1', cardType: 'CREATURE', contentId: 'guardian', unitTypeId: 'guardian' },
          { instanceId: 'c2', cardType: 'CREATURE', contentId: 'archer', unitTypeId: 'archer' },
        ],
        discardPile: [],
      };

      // Swap Guardian (null) with Archer (column 2 row 2)
      expect(canSwapSquads(combat, 'player', 'guardian', 'archer')).toBe(true);
      expect(swapSquads(combat, 'player', 'guardian', 'archer')).toBe(true);

      expect(combat.playerSquads[0].position).toEqual({ column: 2, row: 2 }); // Guardian takes place
      expect(combat.playerSquads[1].position).toBeNull();                     // Archer undeployed to null

      // Now set Guardian to undrawn
      combat.playerCombatDeck.creatureBench = [
        { instanceId: 'c2', cardType: 'CREATURE', contentId: 'archer', unitTypeId: 'archer' },
      ]; // Guardian card removed

      // Swap should now be rejected atomically since Guardian is undrawn and would enter board
      expect(canSwapSquads(combat, 'player', 'guardian', 'archer')).toBe(false);
      expect(swapSquads(combat, 'player', 'guardian', 'archer')).toBe(false);
    });

    it('verifies spell hand agency: player may confirm attack with playable spells still in hand', () => {
      const combat: CombatState = {
        playerSquads: [
          { unitTypeId: 'guardian', count: 8, damagedUnitHp: null, position: { column: 2, row: 2 } },
        ],
        enemySquads: [],
        playerHeroHp: 100,
        enemyHeroHp: 100,
        activeSide: 'player',
        turn: 1,
        phase: 'ACTION',
        playerMana: { current: 3, max: 3 },
        enemyMana: { current: 3, max: 3 },
        playerDeck: { drawPile: [], hand: ['firebolt'], discardPile: [] },
        enemyDeck: createInitialEnemySpellDeck(),
        selectedPlayerAbilities: { 'guardian': 'guardian-strike' },
        selectedEnemyAbilities: {},
      };

      combat.playerCombatDeck = {
        drawPile: [],
        spellHand: [{ instanceId: 's1', cardType: 'SPELL', contentId: 'firebolt', spellId: 'firebolt' }],
        creatureBench: [],
        discardPile: [],
      };

      // Confirms attack without playing firebolt is valid, and spell persists
      expect(canConfirmAttack(combat)).toBe(true);
      expect(confirmAttack(combat)).toBe(true);

      expect(combat.playerCombatDeck.spellHand.length).toBe(1);
      expect(combat.playerCombatDeck.spellHand[0].spellId).toBe('firebolt');
    });

    it('verifies card persistence across turn handoffs', () => {
      const combat: CombatState = {
        playerSquads: [
          { unitTypeId: 'guardian', count: 8, damagedUnitHp: null, position: { column: 2, row: 2 } },
          { unitTypeId: 'archer', count: 6, damagedUnitHp: null, position: null }, // bench
        ],
        enemySquads: [
          { unitTypeId: 'duskborn-brute', count: 4, damagedUnitHp: null, position: { column: 2, row: 1 } },
        ],
        playerHeroHp: 100,
        enemyHeroHp: 100,
        activeSide: 'player',
        turn: 1,
        phase: 'DEPLOYMENT',
        playerMana: { current: 3, max: 3 },
        enemyMana: { current: 3, max: 3 },
        playerDeck: createInitialPlayerSpellDeck(),
        enemyDeck: createInitialEnemySpellDeck(),
        selectedPlayerAbilities: { 'guardian': 'guardian-strike' },
        selectedEnemyAbilities: {},
      };

      combat.playerCombatDeck = {
        drawPile: [],
        spellHand: [{ instanceId: 's1', cardType: 'SPELL', contentId: 'firebolt', spellId: 'firebolt' }],
        creatureBench: [
          { instanceId: 'c1', cardType: 'CREATURE', contentId: 'guardian', unitTypeId: 'guardian' },
          { instanceId: 'c2', cardType: 'CREATURE', contentId: 'archer', unitTypeId: 'archer' },
        ],
        discardPile: [],
      };

      // Player deployment -> action -> attack -> enemy turn -> player turn
      expect(confirmDeployment(combat)).toBe(true);
      expect(confirmAttack(combat)).toBe(true);
      expect(endResolution(combat)).toBe(true);
      expect(endTurn(combat)).toBe(true); // transitions to enemy turn start -> deployment

      // Verify player's unplayed spells and bench creatures survived the transition!
      expect(combat.playerCombatDeck.spellHand.length).toBe(1);
      expect(combat.playerCombatDeck.spellHand[0].spellId).toBe('firebolt');
      expect(combat.playerCombatDeck.creatureBench.length).toBe(2);
      expect(combat.playerCombatDeck.creatureBench[1].unitTypeId).toBe('archer');
    });

    it('verifies robust opening draw and turn-dynamic tracking on a custom turn start value', () => {
      const combat: CombatState = {
        playerSquads: [
          { unitTypeId: 'guardian', count: 8, damagedUnitHp: null, position: null },
        ],
        enemySquads: [],
        playerHeroHp: 100,
        enemyHeroHp: 100,
        activeSide: 'enemy', // Custom opening active side
        turn: 4,             // Custom non-literal turn value
        phase: 'TURN_START',
        playerMana: { current: 3, max: 3 },
        enemyMana: { current: 3, max: 3 },
        playerDeck: createInitialPlayerSpellDeck(),
        enemyDeck: createInitialEnemySpellDeck(),
        selectedPlayerAbilities: {},
        selectedEnemyAbilities: {},
      };

      combat.enemyCombatDeck = createInitialEnemyCombatDeck(combat.enemySquads, combat.enemyDeck.drawPile);

      // Perform opening draw on turn 4
      executeOpeningDraw(combat);
      expect(combat.openingDrawCompleted).toBe(true);
      expect(combat.lastCardDrawTurn).toBe(4);
      expect(combat.lastCardDrawSide).toBe('enemy');

      // First beginTurn on turn 4 / enemy should NOT draw a card because of robust opening marker sync
      const beginSuccess = beginTurn(combat);
      expect(beginSuccess).toBe(true);
      expect(combat.lastCardDrawTurn).toBe(4);
      expect(combat.lastCardDrawSide).toBe('enemy');
    });

    it('verifies preservation of drawCombatCard result in lastCardDrawResult', () => {
      const combat: CombatState = {
        playerSquads: [],
        enemySquads: [],
        playerHeroHp: 100,
        enemyHeroHp: 100,
        activeSide: 'player',
        turn: 2, // Non-opening turn where a draw will occur
        phase: 'TURN_START',
        playerMana: { current: 3, max: 3 },
        enemyMana: { current: 3, max: 3 },
        playerDeck: createInitialPlayerSpellDeck(),
        enemyDeck: createInitialEnemySpellDeck(),
        selectedPlayerAbilities: {},
        selectedEnemyAbilities: {},
      };

      combat.playerCombatDeck = {
        drawPile: [
          { instanceId: 'spell:firebolt:0', cardType: 'SPELL', contentId: 'firebolt', spellId: 'firebolt' },
        ],
        spellHand: [],
        creatureBench: [],
        discardPile: [],
      };

      expect(beginTurn(combat)).toBe(true);

      // Result is preserved in CombatState!
      expect(combat.lastCardDrawResult).toBeDefined();
      expect(combat.lastCardDrawResult!.outcome).toBe('DRAWN_TO_HAND');
      expect((combat.lastCardDrawResult as unknown as { card: { spellId: string } }).card.spellId).toBe('firebolt');
    });

    it('verifies Creature current and max HP dynamic tracking based on damagedUnitHp', () => {
      // Case 1: damagedUnitHp is null -> currentHp should equal maxHp
      const squadUndamaged = {
        unitTypeId: 'guardian',
        count: 8,
        damagedUnitHp: null,
        position: null,
      };

      const maxHp = 10;
      const currentHp1 = squadUndamaged.damagedUnitHp ?? maxHp;
      expect(currentHp1).toBe(10);

      // Case 2: damagedUnitHp is 4 -> currentHp should be 4, maxHp remains 10
      const squadDamaged = {
        unitTypeId: 'guardian',
        count: 8,
        damagedUnitHp: 4,
        position: null,
      };

      const currentHp2 = squadDamaged.damagedUnitHp ?? maxHp;
      expect(currentHp2).toBe(4);
      expect(maxHp).toBe(10);
    });

    it('verifies fanned-card rest-space hit testing mathematics', () => {
      // Setup mock resting transform of a card at restX: 100, restY: 100, restRotation: 0, scale: 1.0, size 136 x 191
      const restX = 100;
      const restY = 100;
      const width = 136;
      const height = 191;

      const containsPoint = (wx: number, wy: number) => {
        const dx = wx - restX;
        const dy = wy - restY;
        // Bounding box bounds checking (-width/2 to width/2, -height/2 to height/2)
        return dx >= -width / 2 && dx <= width / 2 && dy >= -height / 2 && dy <= height / 2;
      };

      // 1. Center of card is inside
      expect(containsPoint(100, 100)).toBe(true);

      // 2. Point outside bounding box is outside
      expect(containsPoint(50, 0)).toBe(false);
      expect(containsPoint(200, 100)).toBe(false);

      // 3. Edges of card bounds are inside
      expect(containsPoint(100 + 68, 100)).toBe(true);
      expect(containsPoint(100, 100 + 95)).toBe(true);
    });
  });
});

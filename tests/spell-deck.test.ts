import { describe, expect, it } from 'vitest';
import {
  beginTurn,
  confirmAttack,
  confirmDeployment,
  createInitialEnemySpellDeck,
  createInitialPlayerSpellDeck,
  endResolution,
  endTurn,
  spendMana,
  type CombatState,
  type SpellDeckState,
} from '../src/game/combat/CombatState';
import { discardSpell, drawSpell } from '../src/game/combat/SpellDeck';

function createCombat(): CombatState {
  return {
    playerSquads: [],
    enemySquads: [],
    playerHeroHp: 100,
    enemyHeroHp: 100,
    activeSide: 'player',
    turn: 1,
    phase: 'TURN_START',
    playerMana: { current: 1, max: 3 },
    enemyMana: { current: 2, max: 4 },
    playerDeck: createInitialPlayerSpellDeck(),
    enemyDeck: createInitialEnemySpellDeck(),
    selectedPlayerAbilities: {},
    selectedEnemyAbilities: {},
  };
}

describe('spell deck operations', () => {
  it('draws the first ID and appends to hand without recycling a nonempty pile', () => {
    const deck: SpellDeckState = {
      drawPile: ['firebolt', 'barrier', 'battle-cry'],
      hand: ['barrier'],
      discardPile: ['firebolt'],
    };
    expect(drawSpell(deck)).toBe('firebolt');
    expect(deck).toEqual({
      drawPile: ['barrier', 'battle-cry'],
      hand: ['barrier', 'firebolt'],
      discardPile: ['firebolt'],
    });
  });

  it('moves a played spell from hand to the end of discard', () => {
    const deck: SpellDeckState = {
      drawPile: ['barrier'],
      hand: ['firebolt', 'barrier'],
      discardPile: ['battle-cry'],
    };
    expect(discardSpell(deck, 'firebolt')).toBe(true);
    expect(deck).toEqual({
      drawPile: ['barrier'],
      hand: ['barrier'],
      discardPile: ['battle-cry', 'firebolt'],
    });
  });

  it('rejects an ID outside hand without mutating any zone', () => {
    const deck: SpellDeckState = {
      drawPile: ['firebolt'],
      hand: ['barrier'],
      discardPile: ['firebolt'],
    };
    const before = structuredClone(deck);
    expect(discardSpell(deck, 'firebolt')).toBe(false);
    expect(deck).toEqual(before);
  });

  it('discards exactly one matching instance when IDs repeat', () => {
    const deck: SpellDeckState = {
      drawPile: [],
      hand: ['firebolt', 'firebolt'],
      discardPile: [],
    };
    expect(discardSpell(deck, 'firebolt')).toBe(true);
    expect(deck).toEqual({
      drawPile: [],
      hand: ['firebolt'],
      discardPile: ['firebolt'],
    });
  });

  it('recycles discard in order before drawing and keeps zones independent', () => {
    const deck: SpellDeckState = {
      drawPile: [],
      hand: ['barrier'],
      discardPile: ['firebolt', 'battle-cry'],
    };
    expect(drawSpell(deck)).toBe('firebolt');
    expect(deck).toEqual({
      drawPile: ['battle-cry'],
      hand: ['barrier', 'firebolt'],
      discardPile: [],
    });
    expect(discardSpell(deck, 'barrier')).toBe(true);
    expect(drawSpell(deck)).toBe('battle-cry');
    expect(deck.discardPile).toEqual(['barrier']);
  });

  it.each([{ hand: [] }, { hand: ['barrier'] }])(
    'returns null with no drawable cards and hand $hand',
    ({ hand }) => {
      const deck: SpellDeckState = { drawPile: [], hand, discardPile: [] };
      const before = structuredClone(deck);
      expect(drawSpell(deck)).toBeNull();
      expect(deck).toEqual(before);
    },
  );

  it('conserves every ID and duplicate through draw, discard, recycle and draw', () => {
    const deck: SpellDeckState = {
      drawPile: ['firebolt'],
      hand: ['barrier'],
      discardPile: ['firebolt', 'battle-cry'],
    };
    const cards = () =>
      [...deck.drawPile, ...deck.hand, ...deck.discardPile].sort();
    const original = cards();
    expect(drawSpell(deck)).toBe('firebolt');
    expect(cards()).toEqual(original);
    expect(discardSpell(deck, 'firebolt')).toBe(true);
    expect(cards()).toEqual(original);
    for (const id of ['firebolt', 'battle-cry', 'firebolt']) {
      expect(drawSpell(deck)).toBe(id);
      expect(cards()).toEqual(original);
    }
    expect(drawSpell(deck)).toBeNull();
    expect(cards()).toEqual(original);
  });
});

describe('spell draw at TURN_START', () => {
  it.each(['player', 'enemy'] as const)(
    'draws exactly once for %s and isolates the inactive side',
    (side) => {
      const state = createCombat();
      state.activeSide = side;
      const active = side === 'player' ? state.playerDeck : state.enemyDeck;
      const inactive = side === 'player' ? state.enemyDeck : state.playerDeck;
      active.drawPile = ['firebolt', 'barrier', 'battle-cry'];
      inactive.hand.push('barrier');
      inactive.discardPile.push('firebolt');
      const beforeInactive = structuredClone(inactive);

      expect(beginTurn(state)).toBe(true);
      expect(active).toEqual({
        drawPile: ['barrier', 'battle-cry'],
        hand: ['firebolt'],
        discardPile: [],
      });
      expect(inactive).toEqual(beforeInactive);
      expect(state.phase).toBe('DEPLOYMENT');
      const afterStart = structuredClone(state);
      expect(beginTurn(state)).toBe(false);
      expect(state).toEqual(afterStart);
    },
  );

  it.each(['player', 'enemy'] as const)(
    'starts %s turns and refreshes Mana with no drawable spells',
    (side) => {
      const state = createCombat();
      state.activeSide = side;
      const deck = side === 'player' ? state.playerDeck : state.enemyDeck;
      deck.drawPile = [];
      deck.hand = ['barrier'];
      const before = structuredClone(state);
      expect(beginTurn(state)).toBe(true);
      expect(state.phase).toBe('DEPLOYMENT');
      expect(state.playerDeck).toEqual(before.playerDeck);
      expect(state.enemyDeck).toEqual(before.enemyDeck);
      expect(state.playerMana.current).toBe(side === 'player' ? 3 : 1);
      expect(state.enemyMana.current).toBe(side === 'enemy' ? 4 : 2);
    },
  );

  it('draws and refreshes Mana across player, enemy, then player turns', () => {
    const state = createCombat();
    expect(beginTurn(state)).toBe(true);
    expect(state.playerDeck.hand).toEqual(['firebolt']);
    expect(state.playerMana.current).toBe(3);
    expect(state.enemyMana.current).toBe(2);

    for (const side of ['player', 'enemy'] as const) {
      expect(confirmDeployment(state)).toBe(true);
      expect(spendMana(state, side, 2)).toBe(true);
      expect(confirmAttack(state)).toBe(true);
      expect(endResolution(state)).toBe(true);
      expect(endTurn(state)).toBe(true);
      expect(state.phase).toBe('DEPLOYMENT');
      expect(state.activeSide).toBe(side === 'player' ? 'enemy' : 'player');
      expect(state.turn).toBe(side === 'player' ? 2 : 3);
      expect(state.enemyDeck.hand).toEqual(['dusk-strike']);
      expect(state.enemyDeck.drawPile).toEqual(['dark-ward']);
      expect(state.playerDeck.hand).toEqual(
        side === 'player' ? ['firebolt'] : ['firebolt', 'barrier'],
      );
      expect(state.playerMana.current).toBe(side === 'player' ? 1 : 3);
      expect(state.enemyMana.current).toBe(side === 'player' ? 4 : 2);
    }
    expect(state.playerDeck.drawPile).toEqual(['battle-cry']);
  });
});

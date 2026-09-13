import { describe, expect, it } from 'vitest';
import { isSpellCardPlayable } from '../src/ui/spellHandPresentation';
import { playSpell, type CombatState } from '../src/game/combat/CombatState';
import { SPELLS } from '../src/game/content/spells';

function createState(): CombatState {
  return {
    playerSquads: [],
    enemySquads: [],
    playerHeroHp: 100,
    enemyHeroHp: 100,
    activeSide: 'player',
    turn: 1,
    phase: 'ACTION',
    playerMana: { current: 3, max: 3 },
    enemyMana: { current: 0, max: 3 },
    playerDeck: {
      drawPile: [],
      hand: ['firebolt', 'firebolt', 'barrier'],
      discardPile: [],
    },
    enemyDeck: { drawPile: [], hand: [], discardPile: [] },
    selectedPlayerAbilities: {},
    selectedEnemyAbilities: {},
  };
}

describe('spell hand presentation', () => {
  it('queries affordability without changing hand order or duplicate instances', () => {
    const state = createState();
    const before = structuredClone(state);
    expect(
      state.playerDeck.hand.map((id) => isSpellCardPlayable(state, id)),
    ).toEqual([true, true, true]);
    expect(isSpellCardPlayable(state, 'battle-cry')).toBe(false);
    expect(isSpellCardPlayable(state, 'unknown')).toBe(false);
    expect(state).toEqual(before);
    expect(playSpell(state, 'player', 'firebolt')).toBe(true);
    expect(state.playerMana.current).toBe(1);
    expect(state.playerDeck.hand).toEqual(['firebolt', 'barrier']);
    expect(state.playerDeck.discardPile).toEqual(['firebolt']);
    expect(isSpellCardPlayable(state, 'firebolt')).toBe(false);
    expect(isSpellCardPlayable(state, 'barrier')).toBe(true);
    const after = structuredClone(state);
    expect(playSpell(state, 'player', 'firebolt')).toBe(false);
    expect(state).toEqual(after);
  });

  it.each([
    'TURN_START',
    'DEPLOYMENT',
    'RESOLUTION',
    'TURN_END',
    'VICTORY',
    'DEFEAT',
  ] as const)('disables cards during %s', (phase) => {
    const state = createState();
    state.phase = phase;
    const before = structuredClone(state);
    expect(isSpellCardPlayable(state, 'firebolt')).toBe(false);
    expect(playSpell(state, 'player', 'firebolt')).toBe(false);
    expect(state).toEqual(before);
  });

  it('disables cards during enemy ACTION', () => {
    const state = createState();
    state.activeSide = 'enemy';
    expect(isSpellCardPlayable(state, 'firebolt')).toBe(false);
  });

  it('supplies concise descriptions for all current spells without promising targeting', () => {
    for (const spell of SPELLS) {
      expect(spell.description.length).toBeGreaterThan(0);
      expect(spell.description).not.toMatch(/choose|target/i);
      expect(spell.description).toContain(String(spell.effectValue));
    }
  });
});

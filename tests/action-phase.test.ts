import { describe, expect, it } from 'vitest';
import {
  canConfirmAttack,
  confirmAttack,
  playSpell,
  repositionSquad,
  tryUseAbility,
  type CombatPhase,
  type CombatState,
} from '../src/game/combat/CombatState';

function createActionState(): CombatState {
  return {
    playerSquads: [
      {
        unitTypeId: 'guardian',
        count: 8,
        damagedUnitHp: 4,
        position: { column: 0, row: 2 },
      },
      {
        unitTypeId: 'archer',
        count: 3,
        damagedUnitHp: null,
        position: { column: 1, row: 3 },
      },
    ],
    enemySquads: [
      {
        unitTypeId: 'duskborn-brute',
        count: 4,
        damagedUnitHp: null,
        position: { column: 0, row: 1 },
      },
      {
        unitTypeId: 'duskborn-archer',
        count: 2,
        damagedUnitHp: null,
        position: { column: 1, row: 0 },
      },
    ],
    playerHeroHp: 100,
    enemyHeroHp: 100,
    activeSide: 'player',
    turn: 1,
    phase: 'ACTION',
    playerMana: { current: 3, max: 3 },
    enemyMana: { current: 3, max: 3 },
    playerDeck: {
      drawPile: [],
      hand: ['firebolt', 'barrier'],
      discardPile: [],
    },
    enemyDeck: {
      drawPile: [],
      hand: ['dusk-strike', 'dark-ward'],
      discardPile: [],
    },
    selectedPlayerAbilities: {},
    selectedEnemyAbilities: {},
  };
}

describe('ACTION preparation and confirmation', () => {
  it.each(['player', 'enemy'] as const)(
    'requires all surviving %s squads and preserves prepared actions into resolution',
    (side) => {
      const state = createActionState();
      state.activeSide = side;
      const player = side === 'player';
      const units = player
        ? ['guardian', 'archer']
        : ['duskborn-brute', 'duskborn-archer'];
      const abilities = player
        ? ['guardian-strike', 'archer-shot']
        : ['duskborn-brute-strike', 'duskborn-archer-shot'];
      expect(tryUseAbility(state, side, units[0], abilities[0])).toBe(true);
      const partial = structuredClone(state);
      expect(canConfirmAttack(state)).toBe(false);
      expect(confirmAttack(state)).toBe(false);
      expect(state).toEqual(partial);
      expect(tryUseAbility(state, side, units[1], abilities[1])).toBe(true);
      const prepared = structuredClone(state);
      expect(canConfirmAttack(state)).toBe(true);
      expect(state).toEqual(prepared);
      expect(confirmAttack(state)).toBe(true);
      expect(state).toEqual({ ...prepared, phase: 'RESOLUTION' });
      // Both Mana pools and both hands are untouched: spell use and spending are optional.
      expect(state.playerMana.current).toBe(3);
      expect(state.enemyMana.current).toBe(3);
      const locked = structuredClone(state);
      expect(tryUseAbility(state, side, units[0], abilities[0])).toBe(false);
      expect(playSpell(state, side, player ? 'firebolt' : 'dusk-strike')).toBe(
        false,
      );
      expect(
        repositionSquad(state, side, units[0], {
          column: 0,
          row: player ? 3 : 0,
        }),
      ).toBe(false);
      expect(confirmAttack(state)).toBe(false);
      expect(state).toEqual(locked);
    },
  );

  const lockedPhases: CombatPhase[] = [
    'TURN_START',
    'DEPLOYMENT',
    'RESOLUTION',
    'TURN_END',
    'VICTORY',
    'DEFEAT',
  ];
  it.each(lockedPhases)(
    'rejects abilities and spells for both sides in %s atomically',
    (phase) => {
      for (const side of ['player', 'enemy'] as const) {
        const state = createActionState();
        state.activeSide = side;
        state.phase = phase;
        const before = structuredClone(state);
        expect(
          tryUseAbility(
            state,
            side,
            side === 'player' ? 'guardian' : 'duskborn-brute',
            side === 'player' ? 'guardian-strike' : 'duskborn-brute-strike',
          ),
        ).toBe(false);
        expect(
          playSpell(
            state,
            side,
            side === 'player' ? 'firebolt' : 'dusk-strike',
          ),
        ).toBe(false);
        expect(canConfirmAttack(state)).toBe(false);
        expect(confirmAttack(state)).toBe(false);
        expect(state).toEqual(before);
      }
    },
  );

  it.each(['player', 'enemy'] as const)(
    'rejects opponent actions during the %s turn',
    (side) => {
      const state = createActionState();
      state.activeSide = side;
      const other = side === 'player' ? 'enemy' : 'player';
      const before = structuredClone(state);
      expect(
        tryUseAbility(
          state,
          other,
          other === 'player' ? 'guardian' : 'duskborn-brute',
          other === 'player' ? 'guardian-strike' : 'duskborn-brute-strike',
        ),
      ).toBe(false);
      expect(
        playSpell(
          state,
          other,
          other === 'player' ? 'firebolt' : 'dusk-strike',
        ),
      ).toBe(false);
      expect(state).toEqual(before);
    },
  );

  it.each([0, -1])(
    'does not require selections for squads with count %i',
    (count) => {
      const state = createActionState();
      state.playerSquads[1].count = count;
      state.playerSquads[1].position = null;
      expect(
        tryUseAbility(state, 'player', 'guardian', 'guardian-strike'),
      ).toBe(true);
      expect(confirmAttack(state)).toBe(true);
    },
  );

  it.each(['missing-ability', 'archer-shot', 'duskborn-brute-strike'])(
    'rejects invalid Guardian selection %s without mutation',
    (id) => {
      const state = createActionState();
      state.selectedPlayerAbilities = { guardian: id, archer: 'archer-shot' };
      const before = structuredClone(state);
      expect(canConfirmAttack(state)).toBe(false);
      expect(confirmAttack(state)).toBe(false);
      expect(state).toEqual(before);
    },
  );

  it('rejects unpositioned surviving squads despite valid abilities', () => {
    const state = createActionState();
    state.selectedPlayerAbilities = {
      guardian: 'guardian-strike',
      archer: 'archer-shot',
    };
    state.playerSquads[0].position = null;
    const before = structuredClone(state);
    expect(confirmAttack(state)).toBe(false);
    expect(state).toEqual(before);
  });

  it('tracks selections, rejects reselection, allows multiple spells, and locks deployment during ACTION', () => {
    const state = createActionState();
    expect(tryUseAbility(state, 'player', 'guardian', 'guardian-strike')).toBe(
      true,
    );
    expect(state.selectedPlayerAbilities).toEqual({
      guardian: 'guardian-strike',
    });
    const selected = structuredClone(state);
    expect(
      tryUseAbility(state, 'player', 'guardian', 'guardian-shield-wall'),
    ).toBe(false);
    expect(
      repositionSquad(state, 'player', 'guardian', { column: 0, row: 3 }),
    ).toBe(false);
    expect(state).toEqual(selected);
    expect(playSpell(state, 'player', 'firebolt')).toBe(true);
    expect(state.playerMana.current).toBe(1);
    expect(playSpell(state, 'player', 'barrier')).toBe(true);
    expect(state.playerMana.current).toBe(0);
    expect(state.playerDeck).toEqual({
      drawPile: [],
      hand: [],
      discardPile: ['firebolt', 'barrier'],
    });
    expect(tryUseAbility(state, 'player', 'archer', 'archer-shot')).toBe(true);
    expect(confirmAttack(state)).toBe(true);
  });
});

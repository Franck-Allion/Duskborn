import { describe, expect, it } from 'vitest';
import {
  beginTurn,
  canRepositionSquad,
  confirmAttack,
  confirmDeployment,
  createInitialEnemySpellDeck,
  createInitialPlayerSpellDeck,
  endResolution,
  endTurn,
  repositionSquad,
  type CombatPhase,
  type CombatState,
} from '../src/game/combat/CombatState';

function createCombat(): CombatState {
  return {
    playerSquads: [
      { unitTypeId: 'guardian', count: 8, damagedUnitHp: 4, position: null },
    ],
    enemySquads: [
      {
        unitTypeId: 'duskborn-brute',
        count: 4,
        damagedUnitHp: 5,
        position: { column: 1, row: 1 },
      },
    ],
    playerHeroHp: 100,
    enemyHeroHp: 100,
    activeSide: 'player',
    turn: 1,
    phase: 'TURN_START',
    playerMana: { current: 0, max: 3 },
    enemyMana: { current: 0, max: 3 },
    playerDeck: createInitialPlayerSpellDeck(),
    enemyDeck: createInitialEnemySpellDeck(),
  };
}

describe('per-turn deployment lifecycle and previews', () => {
  it('starts through Mana and draw, persists positions, and permits repositioning next player turn', () => {
    const state = createCombat();
    expect(beginTurn(state)).toBe(true);
    expect(state.phase).toBe('DEPLOYMENT');
    expect(state.playerMana.current).toBe(3);
    expect(state.playerDeck.hand).toEqual(['firebolt']);
    expect(beginTurn(state)).toBe(false);
    expect(state.playerDeck.hand).toEqual(['firebolt']);
    expect(
      repositionSquad(state, 'player', 'guardian', { column: 0, row: 2 }),
    ).toBe(false);
    expect(
      repositionSquad(state, 'player', 'guardian', { column: 1, row: 2 }),
    ).toBe(true);
    const deployed = structuredClone(state.playerSquads);
    for (const side of ['enemy', 'player'] as const) {
      expect(confirmDeployment(state)).toBe(true);
      expect(confirmAttack(state)).toBe(true);
      expect(endResolution(state)).toBe(true);
      expect(endTurn(state)).toBe(true);
      expect(state.activeSide).toBe(side);
      expect(state.phase).toBe('DEPLOYMENT');
      expect(state.playerSquads).toEqual(deployed);
      if (side === 'enemy') {
        expect(
          repositionSquad(state, 'player', 'guardian', { column: 1, row: 3 }),
        ).toBe(false);
        expect(
          repositionSquad(state, 'enemy', 'duskborn-brute', {
            column: 1,
            row: 0,
          }),
        ).toBe(true);
      }
    }
    expect(
      repositionSquad(state, 'player', 'guardian', { column: 1, row: 3 }),
    ).toBe(true);
    expect(state.playerSquads[0]).toEqual({
      ...deployed[0],
      position: { column: 1, row: 3 },
    });
    expect(state.enemySquads[0].damagedUnitHp).toBe(5);
  });

  it.each(['player', 'enemy'] as const)(
    'keeps %s previews non-mutating and identical to commit legality',
    (side) => {
      const state = createCombat();
      state.playerSquads[0].position = { column: 1, row: 2 };
      state.activeSide = side;
      expect(beginTurn(state)).toBe(true);
      const id = side === 'player' ? 'guardian' : 'duskborn-brute';
      const before = structuredClone(state);
      for (let row = -1; row <= 4; row++) {
        for (let column = -1; column <= 6; column++) {
          const target = { column, row };
          const allowed = canRepositionSquad(state, side, id, target);
          expect(state).toEqual(before);
          const copy = structuredClone(state);
          expect(repositionSquad(copy, side, id, target)).toBe(allowed);
          if (!allowed) expect(copy).toEqual(before);
        }
      }
    },
  );

  it.each<CombatPhase>([
    'TURN_START',
    'ACTION',
    'RESOLUTION',
    'TURN_END',
    'VICTORY',
    'DEFEAT',
  ])('rejects preview and commit in %s without mutation', (phase) => {
    const state = createCombat();
    state.phase = phase;
    const before = structuredClone(state);
    const target = { column: 1, row: 2 };
    expect(canRepositionSquad(state, 'player', 'guardian', target)).toBe(false);
    expect(repositionSquad(state, 'player', 'guardian', target)).toBe(false);
    expect(state).toEqual(before);
  });
});

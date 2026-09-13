import { describe, expect, it } from 'vitest';
import {
  type CombatState,
  canRepositionSquad,
  repositionSquad,
} from '../src/game/combat/CombatState';

describe('symmetric lane-coverage reposition rules', () => {
  function createBaseState(): CombatState {
    return {
      playerSquads: [
        { unitTypeId: 'guardian', count: 5, damagedUnitHp: null, position: null },
        { unitTypeId: 'archer', count: 3, damagedUnitHp: null, position: null },
      ],
      enemySquads: [
        { unitTypeId: 'duskborn-brute', count: 4, damagedUnitHp: null, position: null },
        { unitTypeId: 'duskborn-archer', count: 2, damagedUnitHp: null, position: null },
      ],
      playerHeroHp: 100,
      enemyHeroHp: 100,
      activeSide: 'player',
      turn: 1,
      phase: 'DEPLOYMENT',
      playerMana: { current: 3, max: 3 },
      enemyMana: { current: 3, max: 3 },
      playerDeck: { drawPile: [], hand: [], discardPile: [] },
      enemyDeck: { drawPile: [], hand: [], discardPile: [] },
      selectedPlayerAbilities: {},
      selectedEnemyAbilities: {},
    };
  }

  it('allows a redundant squad to move away from a covered lane', () => {
    const state = createBaseState();
    // Enemy in column 2
    state.enemySquads[0].position = { column: 2, row: 1 }; // Brute
    // Player has two squads in column 2 (redundant coverage)
    state.playerSquads[0].position = { column: 2, row: 2 }; // Guardian
    state.playerSquads[1].position = { column: 2, row: 3 }; // Archer

    // Archer (moving squad) wants to move to empty column 4 BACK
    const target = { column: 4, row: 3 };
    expect(canRepositionSquad(state, 'player', 'archer', target)).toBe(true);

    // Reposition actually succeeds
    expect(repositionSquad(state, 'player', 'archer', target)).toBe(true);
    expect(state.playerSquads[1].position).toEqual(target);
  });

  it('prevents the only covering squad from abandoning an opponent lane', () => {
    const state = createBaseState();
    // Enemy in column 2
    state.enemySquads[0].position = { column: 2, row: 1 };
    // Player has only Guardian covering column 2
    state.playerSquads[0].position = { column: 2, row: 2 }; // Guardian

    // Guardian wants to move to empty column 4 FRONT
    const target = { column: 4, row: 2 };
    expect(canRepositionSquad(state, 'player', 'guardian', target)).toBe(false);

    // Reposition fails and leaves position unchanged (atomic failure check)
    const originalPos = { column: 2, row: 2 };
    expect(repositionSquad(state, 'player', 'guardian', target)).toBe(false);
    expect(state.playerSquads[0].position).toEqual(originalPos);
  });

  it('requires repositioning to prioritize covering an uncovered opponent lane', () => {
    const state = createBaseState();
    // Enemy occupies columns 2 and 5
    state.enemySquads[0].position = { column: 2, row: 1 }; // Brute
    state.enemySquads[1].position = { column: 5, row: 1 }; // Archer

    // Player has both squads in column 2
    state.playerSquads[0].position = { column: 2, row: 2 }; // Guardian (covers col 2)
    state.playerSquads[1].position = { column: 2, row: 3 }; // Archer

    // Column 5 is uncovered. Archer wants to move to column 5 (uncovered) -> legal!
    const targetUncovered = { column: 5, row: 3 };
    expect(canRepositionSquad(state, 'player', 'archer', targetUncovered)).toBe(true);

    // Archer wants to move to empty column 4 (unrelated column) -> illegal (must cover column 5 first)!
    const targetUnrelated = { column: 4, row: 3 };
    expect(canRepositionSquad(state, 'player', 'archer', targetUnrelated)).toBe(false);
  });

  it('allows moving an extra squad to an empty lane when all opponent lanes are covered', () => {
    const state = createBaseState();
    // Enemy occupies columns 2 and 5
    state.enemySquads[0].position = { column: 2, row: 1 }; // Brute
    state.enemySquads[1].position = { column: 5, row: 1 }; // Archer

    // Player occupies columns 2 and 5 (completely covered!), plus has a same-lane redundant squad
    state.playerSquads[0].position = { column: 2, row: 2 }; // Guardian (covers col 2)
    state.playerSquads[1].position = { column: 5, row: 3 }; // Archer (covers col 5)

    // Let's mock a third squad representing an extra squad
    state.playerSquads.push({
      unitTypeId: 'scout',
      count: 1,
      damagedUnitHp: null,
      position: { column: 2, row: 3 }, // redundant in col 2
    });

    // Scout is in redundant lane. All opponent columns (2 and 5) are covered.
    // Scout wants to move to empty column 0 -> allowed!
    const targetEmpty = { column: 0, row: 2 };
    expect(canRepositionSquad(state, 'player', 'scout', targetEmpty)).toBe(true);
  });

  it('respects player/enemy symmetry in lane coverage', () => {
    const state = createBaseState();
    state.activeSide = 'enemy'; // Enemy is active side!

    // Player occupies column 3
    state.playerSquads[0].position = { column: 3, row: 2 };

    // Enemy has only Brute covering column 3
    state.enemySquads[0].position = { column: 3, row: 1 }; // Brute

    // Brute wants to move to empty column 1 -> illegal (cannot abandon the player's occupied column 3)!
    const target = { column: 1, row: 1 };
    expect(canRepositionSquad(state, 'enemy', 'duskborn-brute', target)).toBe(false);
  });

  it('ignores dead squads (count = 0) for coverage requirements', () => {
    const state = createBaseState();
    // Enemy is dead in column 2 (should not generate a coverage requirement)
    state.enemySquads[0].position = { column: 2, row: 1 };
    state.enemySquads[0].count = 0;

    // Player has Guardian at column 2 (can move away because the enemy squad is dead)
    state.playerSquads[0].position = { column: 2, row: 2 };

    const target = { column: 4, row: 2 };
    expect(canRepositionSquad(state, 'player', 'guardian', target)).toBe(true);
  });

  it('ignores unpositioned squads for coverage requirements', () => {
    const state = createBaseState();
    // Enemy is unpositioned in column 2 (should not generate a coverage requirement)
    state.enemySquads[0].position = null;

    // Player has Guardian at column 2
    state.playerSquads[0].position = { column: 2, row: 2 };

    const target = { column: 4, row: 2 };
    expect(canRepositionSquad(state, 'player', 'guardian', target)).toBe(true);
  });
});

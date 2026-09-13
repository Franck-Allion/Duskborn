import { describe, expect, it } from 'vitest';
import {
  applyCombatVictoryToRunState,
  chooseUnitTypeAbilityUnlock,
  createInitialEnemySpellDeck,
  createInitialPlayerSpellDeck,
  getAvailableAbilitiesForUnitType,
  getEffectiveAbilitiesForUnitType,
  tryUseAbility,
  playSpell,
  repositionSquad,
  type CombatState,
} from '../src/game/combat/CombatState';
import {
  commitPlayerAttack,
  canReturnToMap,
} from '../src/game/combat/CombatInteraction';
import { createInitialRunState } from '../src/game/core/RunState';
import {
  combatPhaseLabel,
  partialHpLabel,
  squadName,
  abilityEffectLabel,
} from '../src/ui/combatPresentation';
import { ABILITY_REGISTRY } from '../src/game/content/abilities';

function preparedCombat(): CombatState {
  return {
    playerSquads: [
      {
        unitTypeId: 'guardian',
        count: 1,
        damagedUnitHp: null,
        position: { column: 0, row: 2 },
      },
    ],
    enemySquads: [
      {
        unitTypeId: 'duskborn-brute',
        count: 1,
        damagedUnitHp: null,
        position: { column: 0, row: 1 },
      },
    ],
    playerHeroHp: 100,
    enemyHeroHp: 100,
    activeSide: 'player',
    turn: 1,
    phase: 'ACTION',
    playerMana: { current: 3, max: 3 },
    enemyMana: { current: 0, max: 3 },
    playerDeck: createInitialPlayerSpellDeck(),
    enemyDeck: createInitialEnemySpellDeck(),
    selectedPlayerAbilities: { guardian: 'guardian-strike' },
    selectedEnemyAbilities: {},
    participatingPlayerUnitTypeIds: ['guardian'],
  };
}

describe('combat interaction flow', () => {
  it('commits once and automatically resolves both sides before returning to player deployment', () => {
    const state = preparedCombat();
    expect(commitPlayerAttack(state)).toBe(true);
    expect(state.phase).toBe('DEPLOYMENT');
    expect(state.activeSide).toBe('player');
    expect(state.turn).toBe(3);
    expect(state.enemySquads[0].damagedUnitHp).toBe(4);
    expect(state.playerSquads[0].damagedUnitHp).toBe(4);
    expect(state.enemyDeck.discardPile).toEqual(['dusk-strike']);
    expect(state.playerDeck.hand).toEqual(['firebolt']);
    const before = structuredClone(state);
    expect(commitPlayerAttack(state)).toBe(false);
    expect(state).toEqual(before);
  });

  it('rejects incomplete preparation without mutation', () => {
    const state = preparedCombat();
    state.selectedPlayerAbilities = {};
    const before = structuredClone(state);
    expect(commitPlayerAttack(state)).toBe(false);
    expect(state).toEqual(before);
  });

  it('does not accept player input during resolution or enemy actions', () => {
    for (const phase of ['RESOLUTION', 'ACTION'] as const) {
      const state = preparedCombat();
      state.phase = phase;
      if (phase === 'ACTION') state.activeSide = 'enemy';
      state.playerDeck.hand = ['firebolt'];
      const before = structuredClone(state);
      expect(commitPlayerAttack(state)).toBe(false);
      expect(
        tryUseAbility(state, 'player', 'guardian', 'guardian-strike'),
      ).toBe(false);
      expect(playSpell(state, 'player', 'firebolt')).toBe(false);
      expect(
        repositionSquad(state, 'player', 'guardian', { column: 0, row: 3 }),
      ).toBe(false);
      expect(state).toEqual(before);
    }
  });

  it('stops on player victory without drawing or executing an enemy turn', () => {
    const state = preparedCombat();
    state.enemySquads = [];
    state.enemyHeroHp = 1;
    expect(commitPlayerAttack(state)).toBe(true);
    expect(state.phase).toBe('VICTORY');
    expect(state.enemyHeroHp).toBe(0);
    expect(state.turn).toBe(1);
    expect(state.enemyDeck).toEqual(createInitialEnemySpellDeck());
  });

  it('stops on enemy defeat without returning player control or awarding XP', () => {
    const state = preparedCombat();
    state.playerHeroHp = 1;
    expect(commitPlayerAttack(state)).toBe(true);
    expect(state.phase).toBe('DEFEAT');
    expect(state.turn).toBe(2);
    expect(state.playerDeck.hand).toEqual([]);
    const run = createInitialRunState();
    const before = structuredClone(run);
    expect(applyCombatVictoryToRunState(state, run)).toBe(false);
    expect(canReturnToMap(state, run)).toBe(false);
    expect(run).toEqual(before);
  });
});

describe('victory progression interaction', () => {
  it('finalizes once, resolves choices sequentially, and retains baseline and snapshot abilities', () => {
    const state = preparedCombat();
    state.phase = 'VICTORY';
    state.participatingPlayerUnitTypeIds = ['guardian', 'archer'];
    const run = createInitialRunState();
    run.unitTypeProgression.guardian.xp = 50;
    run.unitTypeProgression.archer.xp = 50;
    expect(canReturnToMap(state, run)).toBe(false);
    expect(applyCombatVictoryToRunState(state, run)).toBe(true);
    expect(run.pendingAbilityUnlockChoices).toHaveLength(2);
    expect(canReturnToMap(state, run)).toBe(false);
    const finalized = structuredClone(run);
    expect(applyCombatVictoryToRunState(state, run)).toBe(false);
    expect(run).toEqual(finalized);
    expect(chooseUnitTypeAbilityUnlock(run, 'guardian', 'archer-volley')).toBe(
      false,
    );
    expect(run).toEqual(finalized);
    expect(chooseUnitTypeAbilityUnlock(run, 'guardian', 'guardian-bash')).toBe(
      true,
    );
    expect(canReturnToMap(state, run)).toBe(false);
    expect(run.pendingAbilityUnlockChoices).toHaveLength(1);
    expect(chooseUnitTypeAbilityUnlock(run, 'guardian', 'guardian-bash')).toBe(
      false,
    );
    expect(chooseUnitTypeAbilityUnlock(run, 'archer', 'archer-volley')).toBe(
      true,
    );
    expect(canReturnToMap(state, run)).toBe(true);
    expect(run.unitTypeProgression.guardian.xp).toBe(100);
    expect(run.unitTypeProgression.guardian.unlockedAbilities).toEqual([
      'guardian-bash',
    ]);
    const next = preparedCombat();
    next.selectedPlayerAbilities = {};
    next.playerAvailableAbilities = {
      guardian: getAvailableAbilitiesForUnitType(run, 'guardian'),
    };
    expect(
      getEffectiveAbilitiesForUnitType(next, 'player', 'guardian'),
    ).toEqual(['guardian-strike', 'guardian-shield-wall', 'guardian-bash']);
    expect(tryUseAbility(next, 'player', 'guardian', 'guardian-bash')).toBe(
      true,
    );
  });

  it('allows map return after finalized victory without a level up', () => {
    const state = preparedCombat();
    state.phase = 'VICTORY';
    const run = createInitialRunState();
    expect(applyCombatVictoryToRunState(state, run)).toBe(true);
    expect(run.pendingAbilityUnlockChoices).toEqual([]);
    expect(canReturnToMap(state, run)).toBe(true);
  });
});

describe('combat presentation queries', () => {
  it('maps every phase to friendly wording for both sides without mutation', () => {
    const state = preparedCombat();
    const expected = {
      TURN_START: ['Your Turn', 'Duskborn Turn'],
      DEPLOYMENT: ['Deployment', 'Duskborn Deployment'],
      ACTION: ['Choose Actions', 'Duskborn Actions'],
      RESOLUTION: ['Resolving', 'Duskborn Attack'],
      TURN_END: ['Your Turn', 'Duskborn Turn'],
      VICTORY: ['Victory', 'Victory'],
      DEFEAT: ['Defeat', 'Defeat'],
    };
    for (const phase of Object.keys(expected) as Array<keyof typeof expected>) {
      state.phase = phase;
      for (const [index, side] of (['player', 'enemy'] as const).entries()) {
        state.activeSide = side;
        const before = structuredClone(state);
        expect(combatPhaseLabel(state)).toBe(expected[phase][index]);
        expect(state).toEqual(before);
      }
    }
  });

  it('shows level, partial HP only when damaged, and content-derived unlock effects', () => {
    const squad = preparedCombat().playerSquads[0];
    expect(partialHpLabel(squad)).toBe('');
    squad.damagedUnitHp = 7;
    expect(partialHpLabel(squad)).toBe('Damaged: 7/10 HP');
    expect(squadName(squad, createInitialRunState())).toBe('Guardian Lv.1');
    expect(
      abilityEffectLabel(ABILITY_REGISTRY.get('guardian-fortified-strike')!),
    ).toBe('FRONT: +2 damage per unit');
  });
});

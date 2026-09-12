import type { SpellDefinition } from './SpellDefinition';

export const FIREBOLT: SpellDefinition = {
  id: 'firebolt',
  name: 'Firebolt',
  manaCost: 2,
  effectId: 'damage',
  effectValue: 6,
};

export const BARRIER: SpellDefinition = {
  id: 'barrier',
  name: 'Barrier',
  manaCost: 1,
  effectId: 'defense',
  effectValue: 5,
};

export const BATTLE_CRY: SpellDefinition = {
  id: 'battle-cry',
  name: 'Battle Cry',
  manaCost: 1,
  effectId: 'attack-buff',
  effectValue: 1,
};

export const DUSK_STRIKE: SpellDefinition = {
  id: 'dusk-strike',
  name: 'Dusk Strike',
  manaCost: 2,
  effectId: 'enemy-damage',
  effectValue: 5,
};

export const DARK_WARD: SpellDefinition = {
  id: 'dark-ward',
  name: 'Dark Ward',
  manaCost: 1,
  effectId: 'enemy-defense',
  effectValue: 4,
};

export const SPELLS: readonly SpellDefinition[] = [
  FIREBOLT,
  BARRIER,
  BATTLE_CRY,
  DUSK_STRIKE,
  DARK_WARD,
];

/**
 * Registry mapping spell IDs to SpellDefinitions for lookup validation.
 */
export const SPELL_REGISTRY: ReadonlyMap<string, SpellDefinition> = new Map(
  SPELLS.map((spell) => [spell.id, spell]),
);

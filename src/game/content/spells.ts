import type { SpellDefinition } from './SpellDefinition';

export const FIREBOLT: SpellDefinition = {
  id: 'firebolt',
  name: 'Firebolt',
  description: 'Attack: 6 damage to enemy hero.',
  manaCost: 2,
  effectId: 'damage',
  effectValue: 6,
};

export const BARRIER: SpellDefinition = {
  id: 'barrier',
  name: 'Barrier',
  description: 'Attack: gain 5 hero shield.',
  manaCost: 1,
  effectId: 'defense',
  effectValue: 5,
};

export const BATTLE_CRY: SpellDefinition = {
  id: 'battle-cry',
  name: 'Battle Cry',
  description: '+1 damage per unit this attack.',
  manaCost: 1,
  effectId: 'attack-buff',
  effectValue: 1,
};

export const DUSK_STRIKE: SpellDefinition = {
  id: 'dusk-strike',
  name: 'Dusk Strike',
  description: 'Attack: 5 damage to enemy hero.',
  manaCost: 2,
  effectId: 'enemy-damage',
  effectValue: 5,
};

export const DARK_WARD: SpellDefinition = {
  id: 'dark-ward',
  name: 'Dark Ward',
  description: 'Attack: gain 4 hero shield.',
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

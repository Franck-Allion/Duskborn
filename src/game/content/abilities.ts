import type { AbilityDefinition } from './AbilityDefinition';

export const GUARDIAN_STRIKE: AbilityDefinition = {
  id: 'guardian-strike',
  name: 'Strike',
  manaCost: 0,
  effectId: 'strike',
};

export const GUARDIAN_SHIELD_WALL: AbilityDefinition = {
  id: 'guardian-shield-wall',
  name: 'Shield Wall',
  manaCost: 2,
  effectId: 'defense',
};

export const ARCHER_SHOT: AbilityDefinition = {
  id: 'archer-shot',
  name: 'Shot',
  manaCost: 0,
  effectId: 'shot',
};

export const ARCHER_POWER_SHOT: AbilityDefinition = {
  id: 'archer-power-shot',
  name: 'Power Shot',
  manaCost: 1,
  effectId: 'power-shot',
};

export const DUSKBORN_BRUTE_STRIKE: AbilityDefinition = {
  id: 'duskborn-brute-strike',
  name: 'Brute Strike',
  manaCost: 0,
  effectId: 'strike',
};

export const DUSKBORN_ARCHER_SHOT: AbilityDefinition = {
  id: 'duskborn-archer-shot',
  name: 'Dusk Shot',
  manaCost: 0,
  effectId: 'shot',
};

export const ABILITIES: readonly AbilityDefinition[] = [
  GUARDIAN_STRIKE,
  GUARDIAN_SHIELD_WALL,
  ARCHER_SHOT,
  ARCHER_POWER_SHOT,
  DUSKBORN_BRUTE_STRIKE,
  DUSKBORN_ARCHER_SHOT,
];

/**
 * Registry mapping ability IDs to AbilityDefinitions for lookup validation.
 */
export const ABILITY_REGISTRY: ReadonlyMap<string, AbilityDefinition> = new Map(
  ABILITIES.map((ability) => [ability.id, ability]),
);

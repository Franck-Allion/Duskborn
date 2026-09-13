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
  positionRule: { depth: 'FRONT' },
  positionModifier: { type: 'defense', value: 2 },
};

export const ARCHER_SHOT: AbilityDefinition = {
  id: 'archer-shot',
  name: 'Shot',
  manaCost: 0,
  effectId: 'shot',
  positionRule: { depth: 'BACK' },
  positionModifier: { type: 'damage', value: 1 },
};

export const ARCHER_POWER_SHOT: AbilityDefinition = {
  id: 'archer-power-shot',
  name: 'Power Shot',
  manaCost: 1,
  effectId: 'power-shot',
  positionRule: { horizontal: 'EDGE' },
  positionModifier: { type: 'damage', value: 2 },
  attackModifier: 2,
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

// --- Progression Unlocked Abilities ---
export const GUARDIAN_FORTIFIED_STRIKE: AbilityDefinition = {
  id: 'guardian-fortified-strike',
  name: 'Fortified Strike',
  manaCost: 1,
  effectId: 'strike',
  positionRule: { depth: 'FRONT' },
  positionModifier: { type: 'damage', value: 2 },
};

export const GUARDIAN_BASH: AbilityDefinition = {
  id: 'guardian-bash',
  name: 'Bash',
  manaCost: 1,
  effectId: 'strike',
  attackModifier: 1,
};

export const ARCHER_PIERCING_SHOT: AbilityDefinition = {
  id: 'archer-piercing-shot',
  name: 'Piercing Shot',
  manaCost: 1,
  effectId: 'shot',
  attackModifier: 3,
};

export const ARCHER_VOLLEY: AbilityDefinition = {
  id: 'archer-volley',
  name: 'Volley',
  manaCost: 2,
  effectId: 'shot',
  positionRule: { horizontal: 'EDGE' },
  positionModifier: { type: 'damage', value: 3 },
};

export const ABILITIES: readonly AbilityDefinition[] = [
  GUARDIAN_STRIKE,
  GUARDIAN_SHIELD_WALL,
  ARCHER_SHOT,
  ARCHER_POWER_SHOT,
  DUSKBORN_BRUTE_STRIKE,
  DUSKBORN_ARCHER_SHOT,
  GUARDIAN_FORTIFIED_STRIKE,
  GUARDIAN_BASH,
  ARCHER_PIERCING_SHOT,
  ARCHER_VOLLEY,
];

/**
 * Registry mapping ability IDs to AbilityDefinitions for lookup validation.
 */
export const ABILITY_REGISTRY: ReadonlyMap<string, AbilityDefinition> = new Map(
  ABILITIES.map((ability) => [ability.id, ability]),
);

import type { CombatState } from '../game/combat/CombatState';
import type { Squad } from '../game/combat/Squad';
import type { RunState } from '../game/core/RunState';
import type { AbilityDefinition } from '../game/content/AbilityDefinition';
import { UNIT_REGISTRY } from '../game/content/unitTypes';

export function combatPhaseLabel(state: CombatState): string {
  const player = state.activeSide === 'player';
  switch (state.phase) {
    case 'TURN_START':
    case 'TURN_END':
      return player ? 'Your Turn' : 'Duskborn Turn';
    case 'DEPLOYMENT':
      return player ? 'Deployment' : 'Duskborn Deployment';
    case 'ACTION':
      return player ? 'Choose Actions' : 'Duskborn Actions';
    case 'RESOLUTION':
      return player ? 'Resolving' : 'Duskborn Attack';
    case 'VICTORY':
      return 'Victory';
    case 'DEFEAT':
      return 'Defeat';
  }
}

export function squadName(squad: Squad, run?: RunState): string {
  const name = UNIT_REGISTRY.get(squad.unitTypeId)?.name ?? squad.unitTypeId;
  const level = run?.unitTypeProgression?.[squad.unitTypeId]?.level;
  return `${name}${level === undefined ? '' : ` Lv.${level}`}`;
}

export function partialHpLabel(squad: Squad): string {
  const unit = UNIT_REGISTRY.get(squad.unitTypeId);
  return squad.damagedUnitHp === null || !unit
    ? ''
    : `Damaged: ${squad.damagedUnitHp}/${unit.hpPerUnit} HP`;
}

export function abilityEffectLabel(ability: AbilityDefinition): string {
  const parts: string[] = [];
  if (ability.attackModifier)
    parts.push(`+${ability.attackModifier} attack damage per unit`);
  if (ability.positionRule && ability.positionModifier) {
    const position = [
      ability.positionRule.depth,
      ability.positionRule.horizontal,
    ]
      .filter(Boolean)
      .join(' + ');
    parts.push(
      `${position}: +${ability.positionModifier.value} ${ability.positionModifier.type} per unit`,
    );
  }
  return parts.join('\n') || 'Basic attack';
}

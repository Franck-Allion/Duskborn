import type { RunState } from '../core/RunState';
import {
  confirmAttack,
  resolveActiveSideAttack,
  type CombatState,
} from './CombatState';
import { orchestrateAutomaticPhases } from './EnemyTurnAI';

/** One player commitment; all rules and automatic handoffs remain domain-owned. */
export function commitPlayerAttack(state: CombatState): boolean {
  if (state.activeSide !== 'player' || !confirmAttack(state)) return false;
  return completeCommittedAttack(state);
}

/** Separate completion boundary for later asynchronous presentation. */
export function completeCommittedAttack(state: CombatState): boolean {
  if (state.activeSide !== 'player' || !resolveActiveSideAttack(state))
    return false;
  orchestrateAutomaticPhases(state);
  return true;
}

/** Finalized victory stays on screen until every pending choice is resolved. */
export function canReturnToMap(state: CombatState, run: RunState): boolean {
  return (
    state.phase === 'VICTORY' &&
    state.hasVictoryBeenFinalized === true &&
    (run.pendingAbilityUnlockChoices ?? []).length === 0
  );
}

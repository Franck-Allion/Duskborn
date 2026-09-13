import type { CombatState } from '../game/combat/CombatState';
import { SPELL_REGISTRY } from '../game/content/spells';

/** Presentation pre-check only; playSpell remains authoritative for commits. */
export function isSpellCardPlayable(
  state: CombatState,
  spellId: string,
): boolean {
  const spell = SPELL_REGISTRY.get(spellId);
  return (
    state.activeSide === 'player' &&
    state.phase === 'ACTION' &&
    !!spell &&
    state.playerDeck.hand.includes(spellId) &&
    state.playerMana.current >= spell.manaCost
  );
}

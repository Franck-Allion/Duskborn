import type { SpellDeckState } from './CombatState';

/**
 * Moves the first draw-pile ID (the top of the deck) into hand.
 * An empty draw pile recycles discard in order, without shuffling.
 * Returns null without changing the deck when neither pile has a card.
 */
export function drawSpell(deck: SpellDeckState): string | null {
  if (deck.drawPile.length === 0) {
    deck.drawPile.push(...deck.discardPile);
    deck.discardPile.length = 0;
  }

  const spellId = deck.drawPile.shift();
  if (spellId === undefined) {
    return null;
  }

  deck.hand.push(spellId);
  return spellId;
}

/** Moves one matching ID from hand to discard after successful spell play. */
export function discardSpell(deck: SpellDeckState, spellId: string): boolean {
  const index = deck.hand.indexOf(spellId);
  if (index === -1) {
    return false;
  }

  deck.hand.splice(index, 1);
  deck.discardPile.push(spellId);
  return true;
}

import type { Squad } from './Squad';

export type CombatCardType = 'CREATURE' | 'SPELL';

export interface CombatCardBase {
  /** A unique identifier for this specific card instance in the game. */
  readonly instanceId: string;
  /** Discriminated union type selector. */
  readonly cardType: CombatCardType;
  /** References the underlying static content's ID (spellId or unitTypeId). */
  readonly contentId: string;
}

/**
 * Represents access to an existing player or enemy squad for deployment.
 *
 * Lifecycle Semantics:
 * - A CreatureCard is NOT an individual soldier, and is NOT a separate squad object.
 * - It represents deployment eligibility/availability for the squad of that unit type.
 * - Drawing a CreatureCard makes that squad type available on the bench.
 * - It does not duplicate HP, base damage, abilities, level, or count.
 * - The original squad in CombatState remains the single authoritative source of truth.
 */
export interface CreatureCard extends CombatCardBase {
  readonly cardType: 'CREATURE';
  readonly unitTypeId: string;
}

/**
 * Represents a playable magic spell card.
 *
 * Lifecycle Semantics:
 * - When drawn, it eventually moves to the player's spell hand.
 * - When successfully played, it is moved to the discard pile.
 * - Unlike CreatureCards which represent persistent squad deployment access,
 *   SpellCards are consumable and recycle through the draw and discard piles.
 */
export interface SpellCard extends CombatCardBase {
  readonly cardType: 'SPELL';
  readonly spellId: string;
}

export type CombatCard = CreatureCard | SpellCard;

/** Pure TypeScript structure representing a unified combat-card deck. */
export interface CombatDeckState {
  drawPile: CombatCard[];
  discardPile: CombatCard[];
}

/** Simple injectable Random Source interface, returning a float between [0, 1). */
export type RandomSource = () => number;

/**
 * Creates a fresh initial player unified combat-card deck.
 *
 * Invariant - One squad per unit type:
 * - The squad count (e.g., Guardian count x8) does NOT determine the number of cards.
 * - Each eligible unit type (where squad count > 0) yields exactly one Creature card.
 */
export function createInitialPlayerCombatDeck(
  playerSquads: Squad[],
  spellIds: readonly string[],
): CombatDeckState {
  const drawPile: CombatCard[] = [];

  // Create one Creature card per unique, eligible unit type
  const seenUnitTypes = new Set<string>();
  let creatureCount = 0;
  for (const squad of playerSquads) {
    if (squad.count > 0 && !seenUnitTypes.has(squad.unitTypeId)) {
      seenUnitTypes.add(squad.unitTypeId);
      drawPile.push({
        instanceId: `creature:${squad.unitTypeId}:${creatureCount++}`,
        cardType: 'CREATURE',
        contentId: squad.unitTypeId,
        unitTypeId: squad.unitTypeId,
      });
    }
  }

  // Create Spell cards, supporting duplicate spells with unique instanceIds
  const spellCounters: Record<string, number> = {};
  for (const spellId of spellIds) {
    if (spellCounters[spellId] === undefined) {
      spellCounters[spellId] = 0;
    }
    const index = spellCounters[spellId]++;
    drawPile.push({
      instanceId: `spell:${spellId}:${index}`,
      cardType: 'SPELL',
      contentId: spellId,
      spellId,
    });
  }

  return {
    drawPile,
    discardPile: [],
  };
}

/**
 * Creates a fresh initial enemy/Duskborn unified combat-card deck.
 */
export function createInitialEnemyCombatDeck(
  enemySquads: Squad[],
  spellIds: readonly string[],
): CombatDeckState {
  return createInitialPlayerCombatDeck(enemySquads, spellIds);
}

/**
 * Shuffles a pool of CombatCards out-of-place using the Fisher-Yates algorithm.
 *
 * Requirements:
 * - Does not mutate the source array.
 * - Supports an injectable RandomSource (defaults to Math.random).
 * - Preserves every card exactly once.
 */
export function shuffleCards(
  cards: readonly CombatCard[],
  random: RandomSource = Math.random,
): CombatCard[] {
  const result = [...cards];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

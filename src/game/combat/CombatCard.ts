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
 * - A CreatureCard in creatureBench remains on the bench until later deployment integration.
 *   Do NOT discard a Creature card simply because the squad is deployed (completed in 0.6.24).
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

/** Pure TypeScript structure representing a unified combat-card deck and associated zones. */
export interface CombatCardState {
  drawPile: CombatCard[];
  spellHand: SpellCard[];
  creatureBench: CreatureCard[];
  discardPile: CombatCard[];
}

/** Tuning Constants */
export const MAX_SPELL_HAND = 5;
export const MAX_CREATURE_BENCH = 5;

/** Simple injectable Random Source interface, returning a float between [0, 1). */
export type RandomSource = () => number;

/**
 * Creates a fresh initial player unified combat-card deck state.
 *
 * Invariant - One squad per unit type:
 * - The squad count (e.g., Guardian count x8) does NOT determine the number of cards.
 * - Each eligible unit type (where squad count > 0) yields exactly one Creature card.
 */
export function createInitialPlayerCombatDeck(
  playerSquads: Squad[],
  spellIds: readonly string[],
): CombatCardState {
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
    spellHand: [],
    creatureBench: [],
    discardPile: [],
  };
}

/**
 * Creates a fresh initial enemy/Duskborn unified combat-card deck state.
 */
export function createInitialEnemyCombatDeck(
  enemySquads: Squad[],
  spellIds: readonly string[],
): CombatCardState {
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

/**
 * Performs category-constrained opening card selection.
 *
 * Correct conceptual flow:
 * 1. All Creature cards -> randomly choose up to 2
 * 2. All Spell cards -> randomly choose up to 1
 * 3. Remove chosen cards from total pool
 * 4. Remaining Creature + Spell cards -> shuffle together
 *
 * Requirements:
 * - Does not mutate the input deck state.
 * - Supports injected RNG.
 * - Handles insufficient cards gracefully without inventing new ones.
 * - Preserves instance identity of all cards.
 */
export function initializeOpeningCombatCards(
  deck: CombatCardState,
  random: RandomSource = Math.random,
): CombatCardState {
  const allCreatures = deck.drawPile.filter((c): c is CreatureCard => c.cardType === 'CREATURE');
  const allSpells = deck.drawPile.filter((c): c is SpellCard => c.cardType === 'SPELL');

  const chosenCreatures: CreatureCard[] = [];
  const chosenSpells: SpellCard[] = [];

  // Randomly select up to 2 Creature cards
  const creaturePool = [...allCreatures];
  const creaturesToDraw = Math.min(2, creaturePool.length);
  for (let i = 0; i < creaturesToDraw; i++) {
    const index = Math.floor(random() * creaturePool.length);
    chosenCreatures.push(creaturePool.splice(index, 1)[0]);
  }

  // Randomly select up to 1 Spell card
  const spellPool = [...allSpells];
  const spellsToDraw = Math.min(1, spellPool.length);
  for (let i = 0; i < spellsToDraw; i++) {
    const index = Math.floor(random() * spellPool.length);
    chosenSpells.push(spellPool.splice(index, 1)[0]);
  }

  // Filter out chosen cards from the total pool to get the remaining ones
  const chosenIds = new Set<string>([
    ...chosenCreatures.map((c) => c.instanceId),
    ...chosenSpells.map((s) => s.instanceId),
  ]);

  const remainingPool = deck.drawPile.filter((c) => !chosenIds.has(c.instanceId));
  const shuffledRemaining = shuffleCards(remainingPool, random);

  return {
    drawPile: shuffledRemaining,
    spellHand: chosenSpells,
    creatureBench: chosenCreatures,
    discardPile: [...deck.discardPile],
  };
}

/**
 * Moves a specific SpellCard instance from spellHand to discardPile atomically.
 *
 * Requirements:
 * - Removes exact instance from hand.
 * - Adds same instance to discard.
 * - Does not affect another duplicate spell card with a different instanceId.
 */
export function discardSpellCard(
  cards: CombatCardState,
  instanceId: string,
): boolean {
  const index = cards.spellHand.findIndex((c) => c.instanceId === instanceId);
  if (index === -1) {
    return false;
  }
  const [card] = cards.spellHand.splice(index, 1);
  cards.discardPile.push(card);
  return true;
}

/**
 * Invariant helper: Verifies if every card instance exists in exactly one zone.
 * Returns true if duplicate instances exist, and false otherwise.
 */
export function hasDuplicateCardInstances(state: CombatCardState): boolean {
  const seen = new Set<string>();
  const zones = [state.drawPile, state.spellHand, state.creatureBench, state.discardPile];
  for (const zone of zones) {
    for (const card of zone) {
      if (seen.has(card.instanceId)) {
        return true;
      }
      seen.add(card.instanceId);
    }
  }
  return false;
}

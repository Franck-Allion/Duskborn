# GAME_DESIGN.md

## 1. High-Level Vision

The game is a turn-based roguelite strategy game inspired by:

- Heroes of Might & Magic;
- Slay the Spire;
- Monster Train.

The intended core feeling is:

> "One more day."

A run is divided into days.

During each day, the player spends a limited number of actions to explore, collect resources, trigger events, improve their character, and prepare for the mandatory enemy attack at the end of the day.

After the daily combat, the player either:

- survives and starts a stronger but more dangerous new day;
- loses and ends the run;
- eventually reaches the final objective or boss and wins the run.

The game should create tension between:

- immediate survival;
- long-term investment;
- military power;
- magical power;
- economic development.

---

## 2. Core Loop

A typical day:

```text
START DAY
   ↓
Gain daily action points
   ↓
Explore / collect / interact
   ↓
Spend resources
   ↓
Improve current build
   ↓
END DAY
   ↓
Mandatory combat
   ↓
Survive?
  ↙   ↘
No     Yes
↓       ↓
Run    Next day
ends
```

The player should often think:

> "I only need one more day to complete this upgrade."

That feeling is a major design objective.

---

## 3. Day Structure

Each day begins with a fixed number of action points.

Initial MVP target:

```text
Base action points: 3
```

Possible actions:

- move to an adjacent tile;
- collect a resource;
- trigger an event;
- interact with a location;
- possibly purchase or activate something later.

Exact action costs can evolve.

For the MVP, movement should be simple and readable.

---

## 4. Map

Initial target:

- 6x6 grid;
- one player position;
- orthogonal movement;
- simple tile types;
- no complex fog of war initially.

Possible tile types:

```text
Empty
Gold
Mana
Army
Event
Special location
```

Enemy encounters during the exploration phase are optional for later iterations because a mandatory enemy already appears at the end of every day.

The map may become procedural later.

---

## 5. Main Resources

Initial core resources:

### Gold

Used for:

- purchases;
- recruiting;
- upgrades;
- economic investments.

### Mana

Used for:

- spells;
- magical interactions;
- magical upgrades.

### Army

Represents the player's military strength or available troops.

The exact combat representation may change later.

---

## 6. Character Development During a Run

The player should become significantly stronger between Day 1 and the final days of a run.

Main strategic axes:

### Might

Represents physical / military power.

Possible effects:

- stronger army;
- better physical damage;
- better combat efficiency;
- access to martial rewards.

### Magic

Represents magical power.

Possible effects:

- spell power;
- mana efficiency;
- access to stronger spells;
- magical interactions.

### Economy

Represents the ability to generate and exploit resources.

Possible effects:

- more gold;
- stronger resource income;
- cheaper upgrades;
- better long-term investments.

A run should encourage specialization or synergy rather than maximizing everything equally.

---

## 7. End-of-Day Combat

At the end of every day, combat is mandatory.

The recurring enemy family is currently called:

> Duskborn

The term may represent a faction rather than one unique creature.

Possible variants later:

```text
Duskborn Scout
Duskborn Brute
Duskborn Mage
Duskborn Champion
```

The enemy threat should generally become stronger each day.

Initial example:

```text
Day 1 → weak Duskborn
Day 2 → stronger Duskborn
Day 3 → stronger Duskborn
...
Final day → boss / elite enemy
```

The exact combat system is intentionally not finalized yet.

For the MVP, combat should be simple enough to answer one question:

> Did the player prepare well enough during the day to survive the night?

---

## 8. Threat Progression

The player must not be able to farm indefinitely without consequences.

Therefore, passing time increases danger.

Possible scaling inputs:

- enemy health;
- enemy damage;
- enemy abilities;
- elite modifiers;
- stronger enemy types;
- boss arrival.

The important design tension is:

```text
More days
=
More opportunities to grow
+
More dangerous enemies
```

---

## 9. Run Progression

Run progression is temporary.

It disappears when the run ends.

Examples:

```text
Might
Magic
Army
Gold
Mana
Artifacts found
Spells learned
Temporary bonuses
Map state
Current day
```

This progression should make the player feel dramatically stronger during a successful run.

---

## 10. Meta Progression

Meta progression persists between runs.

At the end of a run, the player earns XP.

Possible XP inputs:

- days survived;
- enemies defeated;
- boss reached;
- boss defeated;
- run score;
- optional objectives later.

When gaining levels or reaching progression milestones, the player unlocks new strategic content.

The intended meta-progression philosophy is:

> Unlock more possibilities rather than only granting permanent percentage bonuses.

---

## 11. Unlockable Content

Possible permanent unlock categories:

### Starting Artifacts

Before a run, the player chooses from unlocked starting artifacts.

Examples:

#### Traveler Boots

```text
+1 daily action point
```

#### Apprentice Crystal

```text
+1 starting Magic
```

#### Captain Banner

```text
+3 starting Army
```

Initial target:

- one starting artifact slot.

Later:

- additional slots may be unlocked.

---

### Loot Pool Unlocks

Some rewards are not available at the start of the game.

Meta progression can add them to the run loot pool.

Example:

```text
Unlock:
Thunder Hammer

Future runs:
Thunder Hammer can now appear as rare loot.
```

This should create anticipation without guaranteeing the item every run.

---

### Future Unlock Categories

Potential later additions:

- spells;
- heroes;
- units;
- events;
- starting loadouts;
- factions;
- difficulty modifiers.

These are not required for the MVP.

---

## 12. Artifact Philosophy

Artifacts should alter strategy.

Good examples:

- +1 action each day;
- gain mana after combat;
- earn more gold from resource tiles;
- start with additional Magic;
- sacrifice Army for spell power;
- improve one category while weakening another.

Avoid designing every artifact as a flat stat increase.

Artifacts should eventually create build synergies.

---

## 13. Loot Philosophy

Loot can include:

- artifacts;
- stat improvements;
- spells;
- economy upgrades;
- temporary bonuses;
- resource bundles.

Loot quality may use rarity later:

```text
Common
Uncommon
Rare
Legendary
```

Rarity is not necessary for the first playable prototype.

---

## 14. Build Philosophy

The long-term goal is to support several build archetypes.

Examples:

### Might Build

```text
Large army
Strong physical damage
Combat-focused artifacts
```

### Magic Build

```text
High Magic
High Mana
Powerful spells
Magical artifacts
```

### Economy Build

```text
Resource generation
Long-term investments
Later power spikes
```

Hybrid builds should remain possible.

The game should allow powerful combinations inspired by Monster Train / Slay the Spire without requiring deckbuilding in the MVP.

---

## 15. MVP Scope

The first playable version should remain deliberately small.

Target:

```text
1 map
1 hero
3 main resources
3 action points per day
simple exploration
simple end-of-day combat
1 Duskborn enemy type
basic Might / Magic progression
1 boss or final threat
simple defeat / victory flow
```

Meta progression comes after the core day loop is proven fun.

---

## 16. Non-Goals for the Early MVP

Do not prioritize yet:

- large procedural worlds;
- complex city building;
- many hero classes;
- dozens of spells;
- dozens of enemies;
- advanced animation;
- multiplayer;
- online backend;
- deckbuilding;
- complex tactical battlefields;
- extensive narrative systems.

The MVP exists to validate:

> Is preparing during the day and surviving the night fun enough to make the player want one more day?

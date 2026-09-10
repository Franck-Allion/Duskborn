# ROADMAP.md

## Working Rule

Implement one unchecked item at a time unless explicitly requested otherwise.

After each item:

```text
Run TypeScript validation
Run tests
Launch / manually verify when relevant
Update documentation if behavior changed
Commit the change
```

---

# 0.0 Project Setup

- [x] Initialize Git repository
- [x] Initialize Phaser + TypeScript + Vite project
- [x] Add Vitest
- [x] Add ESLint
- [x] Add Prettier
- [x] Confirm development server works
- [x] Confirm TypeScript validation works
- [x] Confirm one sample test works

Success condition:

> The project launches locally and the development workflow is stable.

---

# 0.1 Core Map

- [x] Create a pure TypeScript logical 6x6 map model
- [x] Add tests for map dimensions
- [x] Render the 6x6 map in Phaser
- [x] Add a player logical position
- [x] Render player position

Success condition:

> The player can see a grid and their position.

---

# 0.2 Movement

- [x] Implement orthogonal movement rules in pure TypeScript
- [x] Reject diagonal movement
- [x] Reject out-of-bounds movement
- [x] Add movement tests
- [x] Connect map clicks to movement
- [x] Visually update player position

Success condition:

> The player can click an adjacent tile and move exactly one tile.

---

# 0.3 Day and Actions

- [x] Add current day to RunState
- [x] Add daily action points to RunState
- [ ] Start each day with 3 base actions
- [x] Make movement spend 1 action
- [x] Prevent movement at 0 actions
- [x] Display day in HUD
- [x] Display remaining actions in HUD
- [x] Add End Day button
- [x] Add tests for action consumption

Success condition:

> Moving consumes actions and the player understands how many actions remain.

---

# 0.4 Basic Resources

- [x] Add Gold to RunState
- [x] Add Mana to RunState
- [x] Add Army to RunState
- [x] Display resources in HUD
- [x] Add Gold tile
- [ ] Add Mana tile
- [ ] Add Army tile
- [ ] Collect resource when entering tile
- [ ] Remove or mark collected tile
- [ ] Add resource tests

Success condition:

> Exploration provides meaningful rewards.

---

# 0.5 End-of-Day Flow

- [x] Create explicit exploration phase
- [x] End Day transitions out of exploration
- [x] Add end-of-day transition message
- [x] Display "The Duskborn approaches."
- [x] Introduce combat phase / CombatScene
- [x] Prevent map actions during combat

Implemented alongside the requested 0.3 End Day step using a pure RunState
phase and a message panel in MapScene. CONTINUE now opens a minimal CombatScene
with the same RunState and stops MapScene. No combat resolution yet.
End Day preserves the day and remaining actions. Zero actions does not end
exploration automatically; the player must press End Day.

Success condition:

> Every day clearly transitions into mandatory combat.

---

# 0.6 Tactical Duskborn Combat MVP

The combat system should validate tactical depth without becoming a full tactical RPG.

Core combat principles:

```text
Grid: 6 columns × 4 rows
Player zone: 6 × 2
Enemy zone: 6 × 2

No movement during combat.

Each unit type is represented by one indivisible squad.
Example:
- Guardians ×8
- Archers ×3
- Arcanists ×4

A squad cannot be split into multiple groups.
```

Combat should remain fast and readable.

Target for normal combat:

```text
3–5 rounds
A few minutes maximum
```

The combat system must remain pure TypeScript whenever practical.

Preferred architecture:

```text
CombatScene
    ↓
CombatSystem
    ↓
CombatState
    ↓
UnitType / Squad / Ability definitions
```

---

## 0.6.1 Combat Data Model

* [x] Create `UnitType` content definition structure
* [x] Create `Squad` model
* [x] Create `CombatPosition`
* [x] Create `CombatState`
* [x] Add player hero HP
* [x] Add enemy hero HP
* [x] Keep combat models independent from Phaser
* [x] Add initial combat model tests

### UnitType

A unit type defines permanent/base characteristics.

Example direction:

```ts
interface UnitTypeDefinition {
  id: string;
  name: string;
  hpPerUnit: number;
  baseDamage: number;
  abilities: string[];
}
```

Do not store one object per individual soldier.

### Squad

A squad represents all current units of one type.

Example:

```ts
interface Squad {
  unitTypeId: string;
  count: number;
  damagedUnitHp: number | null;
  position: CombatPosition | null;
}
```

Example:

```text
Guardians ×8
```

represents one indivisible combat entity.

If one Guardian has 10 HP:

```text
Guardians ×8
=
80 theoretical total HP
```

Damage should progressively kill units in the stack.

Example:

```text
Guardians ×8
Receive 23 damage
↓
2 Guardians die
1 Guardian remains partially damaged
↓
Guardians ×6
Current damaged Guardian: 7 / 10 HP
```

Success condition:

> Combat state can represent squads, positions, and hero HP without depending on Phaser.

---

## 0.6.2 First Unit Types

Create a deliberately small initial roster.

### Player

* [x] Create Guardian unit type
* [x] Create Archer unit type

### Duskborn

* [x] Create Duskborn Brute
* [x] Create Duskborn Archer or equivalent ranged enemy

Each unit type should initially have:

* [x] HP per unit
* [x] base damage
* [x] one basic ability
* [x] optional simple passive if needed

Avoid complex status effects at this stage.

Example direction:

```text
Guardian
- high HP
- moderate damage
- defensive identity

Archer
- lower HP
- ranged/offensive identity

Duskborn Brute
- high damage
- frontline pressure

Duskborn Archer
- lower HP
- ranged threat
```

Success condition:

> The first battle can be composed from 2 player squad types and 2 enemy squad types.

---

## 0.6.3 Combat Grid

* [x] Create pure TypeScript combat grid model
* [x] Grid size is 6 × 4
* [x] Define player deployment zone as 6 × 2
* [x] Define enemy deployment zone as 6 × 2
* [x] Prevent invalid positions
* [x] Prevent two squads occupying the same cell
* [x] Add grid tests
* [x] Render combat grid in CombatScene

Suggested orientation:

```text
DUSKBORN / ENEMY SIDE (TOP)

Enemy back row (row 0)
[ ][ ][ ][ ][ ][ ]

Enemy front row (row 1)
[ ][ ][ ][ ][ ][ ]

-------------------

Player front row (row 2)
[ ][ ][ ][ ][ ][ ]

Player back row (row 3)
[ ][ ][ ][ ][ ][ ]

PLAYER SIDE (BOTTOM)
```

Success condition:

> The combat screen clearly displays both 6×2 deployment zones.

---

## 0.6.4 Squad Deployment

* [x] Allow player squads to be positioned before combat
* [x] Allow only one squad per unit type
* [x] Prevent splitting a squad
* [x] Restrict player placement to player deployment zone
* [x] Place enemy squads using deterministic initial rules
* [x] Add Confirm Deployment action
* [x] Prevent combat from starting before valid deployment
* [x] Add deployment tests

Example:

```text
Guardians ×8
Archers ×3
```

Valid:

```text
[ Archers ×3 ][             ]
[             ][ Guardians ×8 ]
```

Invalid:

```text
Guardians ×4
Guardians ×4
```

The player owns one Guardian squad, not two independent Guardian squads.

Success condition:

> The player decides where each unit type begins the battle.

---

## 0.6.5 Position Categories

Introduce simple position tags.

Supported MVP categories:

```text
FRONT
BACK
EDGE
CENTER
```

* [ ] Detect whether a squad is FRONT or BACK
* [ ] Detect whether a squad is EDGE or CENTER
* [ ] Keep position rules independent from Phaser
* [ ] Add position tests

Avoid adding many exact-cell-specific bonuses.

Abilities may later depend on these categories.

Example:

```text
Guardian:
+Armor while FRONT

Archer:
+Damage while BACK

Assassin later:
special bonus while EDGE
```

Success condition:

> Unit abilities can react to readable positional categories without hard-coding specific coordinates.

---

## 0.6.6 Lane Targeting

Each column is a combat lane.

* [ ] Implement lane detection
* [ ] A squad normally targets the opposing squad in the same column
* [ ] If both enemy rows are occupied in that column, FRONT is targeted first
* [ ] If the opposing lane contains no squad, damage goes directly to enemy hero
* [ ] Add targeting tests

Example:

```text
Player Archer
      ↓
Enemy Guardian
Enemy Mage
```

The Guardian is targeted first.

Example:

```text
Player Archer
      ↓
empty
empty
```

Damage is dealt directly to the enemy hero.

Success condition:

> Placement creates meaningful offensive and defensive lanes.

---

## 0.6.7 Enemy Intentions

Enemy behavior should be predictable enough for tactical decisions.

* [ ] Create enemy intent model
* [ ] Generate one visible intent per enemy squad each round
* [ ] Display enemy intentions before player confirms the round
* [ ] Keep intent generation in pure TypeScript
* [ ] Add intent tests

Examples:

```text
Duskborn Brute
Intent:
Strike
6 damage
Same lane
```

```text
Duskborn Archer
Intent:
Volley
4 damage
Opposing lane
```

Avoid hidden random targeting when possible.

Success condition:

> The player knows what the enemy plans to do before choosing actions.

---

## 0.6.8 Squad Abilities

Each squad chooses one ability per round.

Do not use combat action points in the MVP.

Possible cost types:

```text
Free
Mana
Gold
```

* [ ] Create ability content definition structure
* [ ] Give Guardian at least 2 abilities
* [ ] Give Archer at least 2 abilities
* [ ] Give each Duskborn type at least 1 ability
* [ ] Support Free ability cost
* [ ] Support Mana ability cost
* [ ] Support Gold ability cost
* [ ] Prevent ability use when resources are insufficient
* [ ] Deduct resources only when the ability is successfully resolved
* [ ] Add ability tests

Example:

```text
Guardian

Strike
Cost: Free

Shield Wall
Cost: 2 Gold
Effect: defensive bonus this round
```

```text
Archer

Shot
Cost: Free

Power Shot
Cost: 1 Mana
Effect: increased damage
```

Mana and Gold are RunState resources and must remain persistent between combat and exploration.

Success condition:

> Combat decisions consume resources gathered during exploration.

---

## 0.6.9 Position-Based Abilities

Allow selected abilities/passives to react to position.

* [ ] Add at least one FRONT-based effect
* [ ] Add at least one BACK-based effect
* [ ] Add at least one EDGE or CENTER-based effect
* [ ] Keep these rules data-driven where practical
* [ ] Add tests

Example:

```text
Guardian
Bulwark:
+2 Armor while FRONT
```

```text
Archer
Marksman:
+2 Damage while BACK
```

Avoid excessive positional complexity.

Success condition:

> Squad placement changes combat effectiveness.

---

## 0.6.10 Round Selection

Combat rounds should be decision-based rather than initiative-based.

Round structure:

```text
Reveal enemy intentions
↓
Player chooses one ability per squad
↓
Player confirms round
↓
Resolve actions
↓
Apply damage / deaths / hero damage
↓
Generate next intentions
↓
Next round
```

* [ ] Add round number to CombatState
* [ ] Allow one selected ability per surviving player squad
* [ ] Display selected abilities
* [ ] Add Confirm Round action
* [ ] Prevent confirmation if required selections are missing
* [ ] Add round-selection tests

No movement occurs during combat.

Success condition:

> The player makes one compact tactical decision for each squad every round.

---

## 0.6.11 Round Resolution

* [ ] Resolve player chosen abilities
* [ ] Resolve enemy intentions
* [ ] Apply squad damage
* [ ] Remove dead units from squad counts
* [ ] Preserve partial HP on the currently damaged unit
* [ ] Remove squad when count reaches 0
* [ ] Apply direct hero damage when lane is empty
* [ ] Deduct Mana/Gold costs
* [ ] Increment combat round
* [ ] Generate next enemy intents
* [ ] Add resolution tests

Keep resolution deterministic for the first MVP.

Avoid:

* critical hits;
* dodge;
* random damage ranges;
* complex status effects.

These may be introduced later if useful.

Success condition:

> A complete round can be selected and resolved entirely through pure game logic.

---

## 0.6.12 Combat Result

Initial victory conditions:

```text
Enemy hero HP reaches 0
OR
all enemy squads are defeated
```

Initial defeat conditions:

```text
Player hero HP reaches 0
OR
all player squads are defeated
```

* [ ] Detect victory
* [ ] Detect defeat
* [ ] Display combat result
* [ ] Preserve surviving player squad counts
* [ ] Preserve partially damaged surviving units if appropriate
* [ ] Preserve Mana spent
* [ ] Preserve Gold spent
* [ ] Add result tests

Do not automatically restore dead units after combat.

Success condition:

> Losses and resource spending matter beyond the current battle.

---

## 0.6.13 Unit-Type Progression

Unit progression belongs to the unit type, not to individual soldiers.

Example:

```text
Guardians Lv.2
Archers Lv.3
```

All current and future units of that type use the same progression.

* [ ] Create `UnitTypeProgression`
* [ ] Track XP per unit type during the run
* [ ] Track level per unit type
* [ ] Award unit-type XP after combat
* [ ] Add simple level thresholds
* [ ] Add one ability unlock choice when a unit type levels up
* [ ] Store unlocked abilities per unit type
* [ ] Ensure newly recruited units inherit current type level/abilities
* [ ] Add progression tests

Example direction:

```ts
interface UnitTypeProgression {
  unitTypeId: string;
  level: number;
  xp: number;
  unlockedAbilities: string[];
}
```

Example:

```text
ARCHERS LEVEL 2

Choose one:

Piercing Shot
Ignore 2 Armor

OR

Backline Training
+2 Damage while BACK
```

This progression is temporary run progression.

It must remain distinct from account/meta XP earned after a run.

Success condition:

> Unit types become stronger and gain more tactical options during a run.

---

## 0.6.14 First Combat UI Pass

Keep UI simple but readable.

Display:

* [ ] 6×4 combat grid
* [ ] player squads with unit count
* [ ] enemy squads with unit count
* [ ] current HP state where useful
* [ ] player hero HP
* [ ] enemy hero HP
* [ ] current round
* [ ] Mana
* [ ] Gold
* [ ] enemy intentions
* [ ] available ability buttons
* [ ] selected ability per squad
* [ ] Confirm Round button
* [ ] victory / defeat panel

Example squad display:

```text
Guardians
×8
```

or:

```text
Guardians ×8
7/10 HP
```

for a partially damaged current unit.

Do not prioritize final art, animation, or sound yet.

Success condition:

> The player can understand the full combat state without reading logs or debugging output.

---

## 0.6.15 Combat MVP Tests

Add pure TypeScript tests covering at minimum:

* [ ] squad HP and casualties
* [ ] partial unit HP
* [ ] indivisible squad rules
* [ ] valid deployment
* [ ] invalid deployment
* [ ] FRONT / BACK detection
* [ ] EDGE / CENTER detection
* [ ] lane targeting
* [ ] frontline targeting priority
* [ ] empty lane hero damage
* [ ] ability resource costs
* [ ] insufficient resource rejection
* [ ] enemy intent generation
* [ ] round resolution
* [ ] victory detection
* [ ] defeat detection
* [ ] surviving squad persistence
* [ ] unit-type XP
* [ ] unit-type level-up
* [ ] ability unlock

Success condition:

> Core combat rules can be refactored without depending on Phaser rendering.

---

## 0.6.16 Combat MVP Review

Do not add more combat complexity before reviewing the prototype.

Review:

* [ ] Is placement tactically meaningful?
* [ ] Are FRONT/BACK/EDGE/CENTER easy to understand?
* [ ] Are enemy intentions useful?
* [ ] Does lane targeting create interesting decisions?
* [ ] Is direct hero damage threatening?
* [ ] Does spending Mana feel meaningful?
* [ ] Does spending Gold in combat compete meaningfully with economy?
* [ ] Do different unit types feel distinct?
* [ ] Are unit losses impactful without being frustrating?
* [ ] Is unit-type leveling satisfying?
* [ ] Are ability choices more interesting than flat stat upgrades?
* [ ] Do normal battles stay around 3–5 rounds?
* [ ] Does combat remain short enough to preserve the "One More Day" rhythm?

Success condition:

> Combat is tactical enough to influence exploration decisions while remaining fast enough to support repeated daily battles.

---

# 0.7 New Day Loop

- [ ] On victory, increment day
- [ ] Restore daily action points
- [ ] Return to exploration
- [ ] Increase Duskborn strength
- [ ] Preserve surviving squads, squad damage, unit-type progression, Mana, Gold and run stats
- [ ] Add day transition tests

Success condition:

> Day 1 → combat → Day 2 → combat → Day 3 works continuously.

This is the first major gameplay milestone.

Question to validate:

> Does the player want to play one more day?

---

# 0.8 Might and Magic

- [ ] Add Might stat
- [ ] Add Magic stat
- [ ] Display Might and Magic
- [ ] Add at least one way to gain Might during a run
- [ ] Add at least one way to gain Magic during a run
- [ ] Make Might influence combat
- [ ] Make Magic influence at least one gameplay outcome
- [ ] Add progression tests

Success condition:

> The player can begin forming different build directions.

---

# 0.9 Basic Events

- [ ] Add Event tile type
- [ ] Add event content definitions
- [ ] Add simple event modal
- [ ] Add one Might-oriented event
- [ ] Add one Magic-oriented event
- [ ] Add one Economy-oriented event
- [ ] Apply event results
- [ ] Add event tests

Success condition:

> Exploration includes strategic choices rather than only collecting resources.

---

# 0.10 First Run Objective

- [ ] Define temporary final day
- [ ] Create stronger Duskborn boss / elite
- [ ] Add victory condition
- [ ] Add defeat condition
- [ ] Add basic run summary

Success condition:

> A complete run can be won or lost.

---

# 0.11 Artifacts During a Run

- [ ] Create artifact content definition structure
- [ ] Add artifact IDs to RunState
- [ ] Add Traveler Boots
- [ ] Add Apprentice Crystal
- [ ] Add Captain Banner
- [ ] Add simple reusable effect handling where needed
- [ ] Add artifact reward choice
- [ ] Add artifact tests

Possible initial effects:

```text
Traveler Boots
+1 daily action

Apprentice Crystal
+1 Magic

Captain Banner
+3 Army
```

Success condition:

> Artifacts noticeably change how a run plays.

---

# 0.12 Meta State

- [ ] Create MetaState
- [ ] Separate MetaState from RunState
- [ ] Add XP
- [ ] Add player level
- [ ] Add unlocked artifact IDs
- [ ] Add unlocked loot IDs
- [ ] Add starting artifact slots
- [ ] Add tests

Success condition:

> Persistent progression exists independently from the current run.

---

# 0.13 XP After Run

- [ ] Calculate XP when a run ends
- [ ] Show XP in run summary
- [ ] Add XP to MetaState
- [ ] Detect level-up
- [ ] Add tests

Possible early XP formula:

```text
Base XP
+ days survived
+ combat victories
+ boss bonus
```

Keep balancing intentionally simple.

---

# 0.14 Permanent Unlock Choice

- [ ] Create unlock definitions
- [ ] Offer unlock choice after appropriate level-up
- [ ] Unlock a starting artifact
- [ ] Unlock a loot item
- [ ] Prevent duplicate unlocks
- [ ] Add unlock tests

Success condition:

> Finishing runs expands future strategic possibilities.

---

# 0.15 Starting Artifact Selection

- [ ] Add pre-run loadout screen
- [ ] Display unlocked starting artifacts
- [ ] Allow one artifact selection
- [ ] Apply artifact when creating RunState
- [ ] Verify Traveler Boots changes daily actions
- [ ] Verify Apprentice Crystal changes starting Magic
- [ ] Verify Captain Banner changes starting Army
- [ ] Add tests

Success condition:

> Previous runs can meaningfully influence how the next run begins.

---

# 0.16 Persistent Save

- [ ] Implement SaveManager
- [ ] Save MetaState locally
- [ ] Restore MetaState at startup
- [ ] Handle missing save safely
- [ ] Add save version field
- [ ] Add save tests

Success condition:

> XP and unlocks remain after restarting the game.

---

# 0.17 Loot Pool Unlocks

- [ ] Create locked loot definition
- [ ] Filter loot pool using MetaState
- [ ] Keep locked loot unavailable
- [ ] Make unlocked loot eligible
- [ ] Add tests

Success condition:

> Meta progression can change what may appear inside future runs.

---

# 0.18 Prototype Review

Do not automatically implement more content.

Review:

- [ ] Is exploration interesting?
- [ ] Are 3 actions per day enough?
- [ ] Does End Day create tension?
- [ ] Is mandatory Duskborn combat enjoyable?
- [ ] Does Might vs Magic create real choices?
- [ ] Is Economy worth investing in?
- [ ] Do artifacts change decisions?
- [ ] Does meta progression make another run attractive?
- [ ] Are runs too long?
- [ ] Is the UI understandable?

Only after this review should scope expand.

---

# Future Ideas — Not Yet Scheduled

These are intentionally not roadmap commitments.

Possible future systems:

```text
More Duskborn types
Bosses
More artifacts
More spells
Hero classes
Factions
Biomes
Procedural map generation
Rare events
Status effects
Unit types
Advanced combat
Buildings
Resource generation
Difficulty levels
Daily modifiers
Achievements
Run seeds
Deck / spell drafting
```

Implement only when the validated core loop justifies them.

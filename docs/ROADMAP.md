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

# 0.4 Exploration Resources

The exploration layer provides resources that later support recruitment, spell acquisition, events, and run progression.

Existing resource work remains valid.

- [x] Add Gold to RunState
- [x] Add Mana to RunState
- [x] Add Army to RunState
- [x] Display resources in HUD
- [x] Add Gold tile
- [ ] Add Mana tile
- [ ] Replace the planned generic Army tile with a Rally / Recruitment tile
- [ ] Collect resource when entering a collectible tile
- [ ] Remove or mark collected tile
- [ ] Keep exploration Mana distinct from automatically refreshed Combat Mana
- [ ] Define how the existing Army value coexists with typed combat squads
- [ ] Add resource tests

### Resource roles

For the MVP:

```text
Gold
→ shops
→ recruits
→ spells
→ economy choices

Exploration Mana
→ magical exploration rewards/events
→ spell-related economy where useful

Combat Mana
→ refreshed each combat turn
→ pays for spells and squad abilities

Army
→ existing run-level resource
→ must progressively integrate with typed squad recruitment
```

Do not use the exploration Mana value directly as the refreshed combat Mana pool.

The existing `Army` state must remain compatible while typed recruitment is introduced.

Prefer gradually making the actual player roster of typed squads the authoritative combat-army representation rather than creating a second unrelated army model.

Success condition:

> Exploration provides resources that feed directly into the player's evolving army, spell deck, and run economy.

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

The combat model is based on alternating turns inspired by a simplified card battler.

Core combat principles:

```text
Grid: 6 columns × 4 rows

Enemy zone: 6 × 2
Player zone: 6 × 2

Each unit type is represented by one indivisible squad.

Example:
- Guardians ×8
- Archers ×3
- Arcanists ×4

A squad cannot be split into multiple groups.
```

Combat alternates between the player and the Duskborn.

Each side follows the same high-level turn sequence:

```text
START TURN
↓
Restore Mana to maximum
↓
Draw 1 spell
↓
DEPLOYMENT PHASE
- deploy / reposition squads
- respect lane engagement restrictions
↓
ACTION PHASE
- cast spells
- select / activate squad abilities
- spend Mana
↓
CONFIRM ATTACK
↓
ATTACK RESOLUTION
- determine squad targets
- evaluate attacks
- resolve squad damage
- resolve direct hero damage through empty lanes
- remove casualties
↓
CHECK COMBAT RESULT
↓
END TURN
↓
Other side becomes active
```

There is no free movement during the action or resolution phases.

Squad repositioning happens only during the active side's deployment phase.

Combat continues until one hero reaches 0 HP.

The combat system must remain pure TypeScript whenever practical.

Preferred architecture:

```text
CombatScene
    ↓
CombatSystem
    ↓
CombatState
    ↓
Turn / Targeting / Ability / Spell systems
    ↓
UnitType / Squad / Ability / Spell definitions
```

Avoid importing the full complexity of games such as Magic: The Gathering.

The MVP should remain deterministic, readable, and fast.

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
* [x] Prevent two squads occupying same cell
* [x] Add grid tests
* [x] Render combat grid in CombatScene

Orientation:

```text
DUSKBORN / ENEMY SIDE

Enemy back row (row 0)
[ ][ ][ ][ ][ ][ ]

Enemy front row (row 1)
[ ][ ][ ][ ][ ][ ]

-------------------

Player front row (row 2)
[ ][ ][ ][ ][ ][ ]

Player back row (row 3)
[ ][ ][ ][ ][ ][ ]

PLAYER SIDE
```

Success condition:

> The combat screen clearly displays both 6×2 combat zones.

---

## 0.6.4 Squad Deployment Foundation

The original deployment implementation remains valid as the foundation for per-turn deployment.

* [x] Allow player squads to be positioned before combat
* [x] Allow only one squad per unit type
* [x] Prevent splitting a squad
* [x] Restrict player placement to player deployment zone
* [x] Place enemy squads using deterministic initial rules
* [x] Add Confirm Deployment action
* [x] Prevent combat from starting before valid deployment
* [x] Add drag-and-drop deployment interaction
* [x] Add deployment tests

Existing placement validation, drag-and-drop behavior, occupancy rules, and indivisible-squad rules should be reused by the per-turn deployment system.

Do not create a second placement rules engine.

Success condition:

> The existing deployment system provides a stable reusable foundation for placing and repositioning squads during combat turns.

---

## 0.6.5 Position Categories

Supported MVP categories:

```text
FRONT
BACK
EDGE
CENTER
```

* [x] Detect whether a squad is FRONT or BACK
* [x] Detect whether a squad is EDGE or CENTER
* [x] Keep position rules independent from Phaser
* [x] Add position tests

Canonical depth rules:

```text
Enemy:
row 0 = BACK
row 1 = FRONT

Player:
row 2 = FRONT
row 3 = BACK
```

Horizontal rules:

```text
columns 0 and 5 = EDGE
columns 1–4 = CENTER
```

Abilities may depend on these categories.

Success condition:

> Unit abilities can react to readable positional categories without hard-coding specific coordinates.

---

## 0.6.6 Lane Targeting

Each column is a combat lane.

* [x] Implement lane detection
* [x] A squad normally targets the opposing squad in the same column
* [x] If both enemy rows are occupied in that column, FRONT is targeted first
* [x] If the opposing lane contains no squad, damage goes directly to enemy hero
* [x] Add targeting tests

Targeting flow:

```text
Attacking squad
↓
Find surviving opposing squads in same lane

0 squads
=> opposing hero

1 squad
=> that squad

2 squads
=> FRONT squad
```

Targeting works symmetrically for both sides.

The existing targeting system determines targets.

Actual damage application belongs to attack resolution later.

Success condition:

> Placement creates meaningful offensive and defensive lanes.

---

## 0.6.7 Alternating Turn System

Replace the previous simultaneous round/intention model with explicit alternating turns.

Add a combat turn state such as:

```ts
type CombatSide = 'player' | 'enemy';

type CombatPhase =
  | 'TURN_START'
  | 'DEPLOYMENT'
  | 'ACTION'
  | 'RESOLUTION'
  | 'TURN_END'
  | 'VICTORY'
  | 'DEFEAT';
```

Exact naming may follow existing project conventions.

* [x] Add active side to `CombatState`
* [x] Add combat turn number to `CombatState`
* [x] Add explicit combat phase to `CombatState`
* [x] Start combat with the player as active side
* [x] Implement `TURN_START`
* [x] Transition `TURN_START → DEPLOYMENT`
* [x] Transition `DEPLOYMENT → ACTION`
* [x] Add Confirm Attack transition from `ACTION → RESOLUTION`
* [x] Transition `RESOLUTION → TURN_END`
* [x] Switch active side during `TURN_END`
* [x] Start the next side's turn
* [x] Prevent actions that are invalid for the current phase
* [x] Add turn-state tests

Do not implement enemy intentions.

The active side fully resolves its turn before the other side acts.

Success condition:

> Player turn → enemy turn → player turn can repeat deterministically through pure combat state.

---

## 0.6.8 Combat Mana

Combat Mana is refreshed each turn.

Represent Mana explicitly as:

```ts
interface CombatMana {
  current: number;
  max: number;
}
```

or equivalent.

Both sides use the same Mana rules.

* [x] Add player combat Mana
* [x] Add enemy combat Mana
* [x] Restore active side Mana to maximum at `TURN_START`
* [x] Allow actions to spend current Mana
* [x] Prevent Mana from dropping below 0
* [x] Prevent actions when Mana cost cannot be paid
* [x] Ensure unused current Mana does not accumulate beyond max
* [x] Clarify/separate combat Mana from existing persistent `RunState` Mana semantics
* [x] Add combat Mana tests

The existing exploration `Mana` resource must not accidentally become both a persistent currency and an automatically refreshed combat resource.

If both concepts remain useful, represent them separately.

Success condition:

> Every turn starts with a predictable Mana budget that must be allocated between spells and squad abilities.

---

## 0.6.9 Spell Deck and Draw

Introduce a deliberately small spell-card layer.

Each side may have:

```text
Draw pile
Hand
Discard pile
```

Keep the MVP minimal.

* [x] Create `SpellDefinition`
* [x] Create pure TypeScript spell deck state
* [x] Create initial player spell deck
* [x] Create initial Duskborn spell deck or deterministic equivalent
* [x] Draw 1 spell for the active side at `TURN_START`
* [x] Put played spells into discard
* [x] Define deterministic behavior when draw pile is empty
* [x] Keep spell/deck logic independent from Phaser
* [x] Add spell draw/deck tests

Avoid for the MVP:

* rarity systems;
* booster mechanics;
* interrupts;
* a Magic-style stack;
* reactions during the opponent turn;
* complex card timing rules.

Success condition:

> Each turn gives the active side one new tactical spell option without turning combat into a full collectible card game.

---

## 0.6.10 Per-Turn Squad Deployment

Adapt the completed deployment foundation so deployment happens during every active turn.

Existing squad positions persist between turns unless explicitly repositioned.

During `DEPLOYMENT`, the active side may reposition its surviving squads within its own 6×2 zone.

### Lane engagement restriction

Use this MVP rule:

> If the opposing side has at least one surviving positioned squad, a squad being deployed or repositioned may only be placed in a column currently occupied by at least one opposing squad.

Example:

```text
Enemy:
lane 1 = Brute
lane 4 = Archer

Player legal deployment columns:
lane 1
lane 4
```

The player may choose FRONT/BACK within those legal columns according to normal placement rules.

A squad already occupying a lane is not automatically moved when the opponent later leaves that lane.

Therefore a lane may become empty after an opponent repositions, exposing the opposing hero to direct damage.

* [x] Reuse existing deployment APIs for per-turn repositioning
* [x] Allow deployment only during the active side's `DEPLOYMENT` phase
* [x] Allow surviving player squads to be repositioned each player turn
* [x] Allow surviving enemy squads to be repositioned each enemy turn
* [x] Preserve squad count and partial HP while repositioning
* [x] Apply lane engagement restriction
* [x] Prevent deployment into an empty column while opposing squads occupy other columns
* [x] Preserve existing occupancy and deployment-zone validation
* [x] Prevent deployment changes after entering `ACTION`
* [x] Adapt drag-and-drop to player per-turn deployment
* [x] Replace/adapt one-time `deploymentConfirmed` semantics to the turn phase model
* [x] Add per-turn deployment tests

Do not duplicate the existing placement engine.

Success condition:

> Placement becomes a tactical decision every turn while squads remain constrained by the enemy battle line.

---

## 0.6.11 Squad Abilities and Spells

Spells and squad abilities share the active side's combat Mana budget.

### Squad abilities

Each surviving squad may select at most one attack ability for the turn.

Basic abilities should remain simple.

Example:

```text
Guardian

Strike
Cost: 0 Mana

Shield Wall
Cost: 2 Mana
```

```text
Archer

Shot
Cost: 0 Mana

Power Shot
Cost: 1 Mana
```

### Spells

Spells come from the active side's hand and may affect:

* squads;
* lanes;
* hero HP;
* Mana;
* attack values;
* positioning rules;

but keep first effects simple.

* [x] Create/extend ability content definition structure
* [x] Give Guardian at least 2 meaningful abilities
* [x] Give Archer at least 2 meaningful abilities
* [x] Give each Duskborn type at least 1 usable ability
* [x] Support Mana ability costs
* [x] Add at least 3 simple player spells
* [x] Add a minimal set of Duskborn spells or deterministic equivalents
* [x] Support Mana spell costs
* [x] Prevent ability/spell use when Mana is insufficient
* [x] Spend Mana only on successful legal actions
* [ ] Prevent more than one selected attack ability per squad per turn
* [x] Allow multiple spells in a turn while Mana permits
* [ ] Add ability/spell tests

Gold is not a combat action cost in this MVP.

Gold remains an exploration/economy resource unless a later design explicitly reintroduces combat spending.

Success condition:

> Mana creates a meaningful choice between squad abilities and spell effects.

---

## 0.6.12 Position-Based Abilities

Use the already completed position-category system.

* [ ] Add at least one FRONT-based effect
* [ ] Add at least one BACK-based effect
* [ ] Add at least one EDGE or CENTER-based effect
* [ ] Re-evaluate position effects after legal repositioning
* [ ] Keep these rules data-driven where practical
* [ ] Add position-effect tests

Example:

```text
Guardian
Bulwark:
bonus while FRONT
```

```text
Archer
Marksman:
bonus while BACK
```

Avoid excessive positional complexity.

Success condition:

> Per-turn squad repositioning changes the effectiveness of squad abilities.

---

## 0.6.13 Action Phase and Confirm Attack

During `ACTION`, the active side prepares its attack.

The active side may:

```text
select one ability per surviving squad
cast spells while Mana remains
inspect resulting combat state
confirm the attack
```

Basic squad attacks remain available even when no Mana is spent.

* [ ] Allow ability selection only during `ACTION`
* [ ] Allow spell play only during `ACTION`
* [ ] Display/track selected ability for each active squad
* [ ] Add Confirm Attack action
* [ ] Prevent opponent-side actions during the active turn
* [ ] Prevent deployment changes during `ACTION`
* [ ] Validate selected actions before confirmation
* [ ] Prevent further action changes once attack resolution starts
* [ ] Add action-phase tests

Do not require the player to spend all Mana.

Success condition:

> The active side can deliberately prepare a complete attack before committing to resolution.

---

## 0.6.14 Attack Resolution

When Confirm Attack is pressed, resolve only the active side's attack.

Use the existing lane-targeting system.

For each surviving attacking squad:

```text
same lane
↓
FRONT opposing squad if present
↓
BACK opposing squad if FRONT absent
↓
opposing hero if lane empty
```

Keep attack resolution deterministic.

* [ ] Resolve selected squad abilities
* [ ] Resolve spell effects required before attacks
* [ ] Evaluate attacks for every surviving active-side squad
* [ ] Use existing lane-targeting rules
* [ ] Apply squad damage
* [ ] Remove dead units from squad counts
* [ ] Preserve partial HP on the currently damaged unit
* [ ] Remove/disable squad when count reaches 0
* [ ] Apply direct hero damage when opposing lane is empty
* [ ] Ensure dead squads no longer block lanes
* [ ] Preserve deterministic resolution order
* [ ] Complete Mana spending semantics
* [ ] Add attack-resolution tests

Avoid:

* critical hits;
* dodge;
* random damage ranges;
* complex status effects;
* initiative inside a single side's attack.

Success condition:

> One complete active-side attack can be resolved entirely through pure TypeScript game logic.

---

## 0.6.15 Duskborn Turn AI

The Duskborn follows the same rules as the player.

Enemy turns must use:

```text
TURN_START
↓
Mana restore
↓
Draw
↓
DEPLOYMENT
↓
ACTION
↓
CONFIRM ATTACK
↓
RESOLUTION
↓
TURN_END
```

Use deterministic heuristics for the MVP.

* [ ] Reuse the same combat phase system for Duskborn turns
* [ ] Restore enemy Mana at enemy turn start
* [ ] Draw enemy spell
* [ ] Reposition enemy squads using legal deployment rules
* [ ] Respect lane engagement restrictions
* [ ] Choose legal squad abilities
* [ ] Choose legal spells within available Mana
* [ ] Confirm and resolve enemy attack
* [ ] Keep initial AI deterministic
* [ ] Keep AI decision logic independent from Phaser
* [ ] Add enemy-turn tests

Do not add hidden enemy intentions.

The enemy acts openly when its turn begins.

Success condition:

> The Duskborn can complete a legal turn using exactly the same combat rules as the player.

---

## 0.6.16 Combat Result

Combat is decided by hero HP.

Victory:

```text
Enemy hero HP <= 0
```

Defeat:

```text
Player hero HP <= 0
```

Losing all squads does not by itself end combat.

* [ ] Detect player victory from enemy hero HP
* [ ] Detect player defeat from player hero HP
* [ ] Check result after attack resolution
* [ ] Stop turn transitions when combat has ended
* [ ] Display combat result
* [ ] Preserve surviving player squad counts
* [ ] Preserve partially damaged surviving units
* [ ] Preserve relevant run resources
* [ ] Add combat-result tests

Do not automatically restore defeated units after combat.

Success condition:

> Combat continues through alternating turns until one hero reaches 0 HP.

---

## 0.6.17 Unit-Type Progression

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

This progression is temporary run progression.

It must remain distinct from account/meta XP earned after a run.

Success condition:

> Unit types become stronger and gain more tactical options during a run.

---

## 0.6.18 Combat UI and Replaceable Visual Assets

Keep UI simple but readable.

Already completed UI foundations should be reused:

```text
6×4 grid
squad rendering
deployment interaction
drag-and-drop
```

Add/display:

* [ ] active side
* [ ] current combat turn
* [ ] current combat phase
* [ ] player hero HP
* [ ] enemy hero HP
* [ ] player current/max Mana
* [ ] enemy current/max Mana where useful
* [ ] player spell hand
* [ ] spell Mana costs
* [ ] available squad abilities
* [ ] ability Mana costs
* [ ] selected ability per active squad
* [ ] legal deployment cells during DEPLOYMENT
* [ ] illegal empty lanes when lane engagement restriction applies
* [ ] Confirm Attack button
* [ ] attack/result feedback
* [ ] victory / defeat panel

### Replaceable unit and spell PNG assets

Units and spells must be represented visually, not only by text.

Use replaceable PNG assets so placeholder artwork can later be replaced without changing game logic.

Content definitions should reference their visual asset.

Example direction:

```ts
interface UnitTypeDefinition {
  id: string;
  name: string;
  hpPerUnit: number;
  baseDamage: number;
  abilities: string[];
  imageKey: string;
}
```

Example:

```ts
interface SpellDefinition {
  id: string;
  name: string;
  manaCost: number;
  imageKey: string;
}
```

Exact structure may follow existing content architecture.

The important direction is:

```text
game logic
    ↓
content definition
    ↓
imageKey / asset reference
    ↓
PNG loaded by Phaser
```

Do not hard-code unit-specific or spell-specific image paths throughout scenes.

* [ ] Add visual asset reference to unit-type content definitions
* [ ] Add visual asset reference to spell content definitions
* [ ] Create placeholder PNG asset for Guardian
* [ ] Create placeholder PNG asset for Archer
* [ ] Create placeholder PNG asset for Duskborn Brute
* [ ] Create placeholder PNG asset for Duskborn Archer
* [ ] Create placeholder PNG assets for initial spells
* [ ] Define consistent unit-image dimensions/aspect ratio
* [ ] Define consistent spell-card image dimensions/aspect ratio
* [ ] Load content images through Phaser preload flow
* [ ] Provide a safe placeholder/fallback image when an asset is missing
* [ ] Render unit images on combat squad representations
* [ ] Render spell images in the combat hand
* [ ] Keep names, counts, HP and Mana costs readable alongside imagery
* [ ] Verify replacing a PNG does not require TypeScript changes

Prefer an asset organization such as:

```text
public/
  assets/
    units/
      guardian.png
      archer.png
      duskborn-brute.png
      duskborn-archer.png

    spells/
      firebolt.png
      barrier.png
      battle-cry.png
```

Do not bake dynamic information into PNG files.

Keep these as UI:

* HP;
* unit count;
* level;
* Mana cost;
* temporary buffs/debuffs.

Success condition:

> The player can understand the complete combat state visually, and unit/spell artwork can be replaced without modifying game logic.

---

## 0.6.19 Combat MVP Integration Tests

Existing grid, deployment, position-category, and lane-targeting test suites remain valid.

Add pure TypeScript integration coverage for the new combat loop.

At minimum:

* [ ] player turn start
* [ ] enemy turn start
* [ ] active-side switching
* [ ] Mana refresh
* [ ] spell draw
* [ ] per-turn repositioning
* [ ] lane engagement deployment restriction
* [ ] phase restrictions
* [ ] ability Mana spending
* [ ] spell Mana spending
* [ ] insufficient Mana rejection
* [ ] Confirm Attack
* [ ] FRONT targeting during attack
* [ ] BACK targeting when FRONT is absent
* [ ] empty-lane hero damage
* [ ] squad casualties
* [ ] partial unit HP
* [ ] dead squad lane removal
* [ ] player attack resolution
* [ ] enemy attack resolution
* [ ] victory from enemy hero HP reaching 0
* [ ] defeat from player hero HP reaching 0
* [ ] combat stops after result
* [ ] surviving squad persistence
* [ ] unit-type XP
* [ ] unit-type level-up
* [ ] ability unlock

Success condition:

> A complete player turn and enemy turn can be simulated and tested without Phaser.

---

## 0.6.20 Combat MVP Review

Do not add more combat complexity before reviewing the prototype.

Review:

* [ ] Is per-turn placement tactically meaningful?
* [ ] Is the lane engagement restriction easy to understand?
* [ ] Does repositioning create meaningful attack/defense decisions?
* [ ] Are FRONT/BACK/EDGE/CENTER easy to understand?
* [ ] Does lane targeting remain predictable?
* [ ] Is leaving a lane open to hero damage strategically interesting?
* [ ] Does Mana create meaningful choices between spells and unit abilities?
* [ ] Does drawing one spell per turn create useful variety?
* [ ] Are spells understandable without introducing excessive card-game complexity?
* [ ] Do different unit types feel distinct?
* [ ] Is alternating player/enemy resolution easy to follow?
* [ ] Does first-player advantage need compensation?
* [ ] Are unit losses impactful without being frustrating?
* [ ] Is unit-type leveling satisfying?
* [ ] Are ability choices more interesting than flat stat upgrades?
* [ ] Does combat remain short enough to preserve the "One More Day" rhythm?

Success condition:

> Combat combines tactical lane placement, Mana allocation, squad abilities, and lightweight spell-card decisions while remaining fast enough for repeated daily battles.

---

# 0.7 New Day and Exploration Growth Loop

The post-combat loop must return the player to exploration while preserving meaningful consequences and newly acquired tactical options.

## 0.7.1 New Day Transition

- [ ] On victory, increment day
- [ ] Restore daily action points
- [ ] Return to exploration
- [ ] Increase Duskborn strength
- [ ] Preserve surviving squads
- [ ] Preserve squad damage
- [ ] Preserve unit-type progression
- [ ] Preserve acquired spells
- [ ] Preserve Gold and exploration resources
- [ ] Preserve run stats
- [ ] Add day transition tests

Do not preserve `currentCombatMana` across combat/exploration.

Combat Mana is reconstructed/refreshed from combat rules.

Success condition:

> Day 1 → combat → Day 2 → combat → Day 3 works continuously with persistent run progression.

This is the first major gameplay milestone.

Question to validate:

> Does the player want to play one more day?

---

## 0.7.2 Run Roster

The player owns a run-level roster of typed squads.

The combat rule remains:

> One indivisible squad per unit type.

Examples:

```text
Guardians ×8
Archers ×3
```

Recruiting additional units of an already-owned type increases that squad's count.

Example:

```text
Guardians ×8
Recruit 2 Guardians
↓
Guardians ×10
```

Recruiting a new unit type creates that type's single squad.

Example:

```text
Current roster:
Guardians ×8
Archers ×3

Recruit:
Arcanists ×2

Result:
Guardians ×8
Archers ×3
Arcanists ×2
```

- [ ] Create run-level typed player roster if not already represented appropriately
- [ ] Persist roster between exploration and combat
- [ ] Preserve surviving squad counts after combat
- [ ] Recruiting an existing unit type increases its squad count
- [ ] Recruiting a new unit type creates exactly one squad for that type
- [ ] Preserve the one-squad-per-unit-type invariant
- [ ] Ensure recruited units inherit current unit-type progression
- [ ] Integrate or migrate the existing generic `Army` RunState value without breaking existing behavior
- [ ] Display current roster during exploration
- [ ] Add roster tests

Success condition:

> The army used in combat is progressively built and reinforced through exploration during the run.

---

## 0.7.3 Rally and Recruitment Locations

Add exploration locations where units may join the player's army.

For the MVP, one `Rally` tile/location is enough.

Example:

```text
RALLY POINT

3 Guardians offer to join you.

Recruit
→ Guardians +3
```

Possible later variations:

```text
Mercenary Camp
Refugees
Barracks
Faction recruitment
```

- [ ] Add Rally / Recruitment exploration tile type
- [ ] Render Rally tile on exploration map
- [ ] Open simple recruitment interaction when entered
- [ ] Offer at least one unit type
- [ ] Add recruits to the run roster
- [ ] Support reinforcing an existing squad
- [ ] Support recruiting a unit type not currently owned
- [ ] Mark consumed one-use Rally locations as resolved
- [ ] Prevent collecting the same recruitment reward repeatedly
- [ ] Add recruitment tests

Keep the first implementation deterministic and simple.

Do not implement faction reputation or complex recruitment tables yet.

Success condition:

> Exploration can directly increase or diversify the player's combat army.

---

## 0.7.4 Shops

Add a simple exploration shop that turns Gold into meaningful run progression.

The first shop may sell:

```text
Recruits
Spells
```

Example:

```text
TRAVELLING MERCHANT

Guardian ×2
Cost: 4 Gold

Firebolt
Cost: 3 Gold

Frost Ward
Cost: 3 Gold
```

Keep initial inventories deliberately small.

- [ ] Add Shop exploration tile/location
- [ ] Create shop inventory model independent from Phaser
- [ ] Generate deterministic/fixed MVP shop inventory
- [ ] Support recruit offers
- [ ] Support spell offers
- [ ] Display Gold while shopping
- [ ] Prevent purchase when Gold is insufficient
- [ ] Deduct Gold only after successful purchase
- [ ] Add purchased recruits to roster
- [ ] Add purchased spells to run spell collection/deck
- [ ] Remove or mark one-time offers after purchase where appropriate
- [ ] Add shop tests

Do not add:
- rerolls;
- rarity systems;
- discounts;
- reputation;
- complex procedural pricing;

until the basic economy proves interesting.

Success condition:

> Gold collected during exploration can be converted into new tactical options before future battles.

---

## 0.7.5 Spell Collection During a Run

The player's combat spell deck evolves during exploration.

Spells may be obtained from:

```text
shops
magical locations
events
combat rewards later
```

For the MVP, Shops plus one exploration reward source are enough.

Example:

```text
Current deck:
Firebolt
Barrier
Battle Cry

Find:
Chain Lightning

New deck:
Firebolt
Barrier
Battle Cry
Chain Lightning
```

- [ ] Store acquired player spells in run state
- [ ] Connect run spell collection to the combat spell deck
- [ ] Add purchased spells to the run deck
- [ ] Add at least one non-shop exploration source of a spell
- [ ] Define whether duplicate spells are allowed in the MVP
- [ ] Preserve acquired spells between days
- [ ] Preserve acquired spells between exploration and combat
- [ ] Display owned spell collection during exploration
- [ ] Add spell-acquisition tests

Keep deck management minimal initially.

Do not add:
- deck size optimization screens;
- sideboards;
- card crafting;
- card upgrading;
- rarity;

until the basic draw/play loop is validated.

Success condition:

> Exploring the map changes the tactical spell options available in future combats.

---

## 0.7.6 Exploration Reward Choices

Introduce simple reward choices where useful.

Example:

```text
You discover survivors and an abandoned grimoire.

Choose one:

Guardians ×3

OR

Firebolt
```

This should remain a lightweight reusable system.

- [ ] Create simple exploration reward-choice model
- [ ] Support unit recruitment reward
- [ ] Support spell reward
- [ ] Support Gold reward
- [ ] Support exploration Mana reward
- [ ] Present 2 simple choices when appropriate
- [ ] Apply exactly one selected reward
- [ ] Prevent collecting both choices
- [ ] Add reward-choice tests

Use reward choices sparingly.

Not every map tile needs a modal.

Success condition:

> Exploration occasionally asks the player to choose between army growth, spell options, and economy.

---

## 0.7.7 Exploration Visual Content

Units and spells shown during exploration must reuse the same content definitions and PNG assets used by combat.

Do not build a second exploration-only image registry.

- [ ] Render unit PNGs in the exploration roster
- [ ] Render unit PNGs in Rally / Recruitment offers
- [ ] Render unit PNGs in Shop recruit offers
- [ ] Render spell PNGs in Shop spell offers
- [ ] Render spell PNGs in exploration reward choices
- [ ] Render spell PNGs in the owned spell collection
- [ ] Use fallback assets when content artwork is unavailable
- [ ] Keep dynamic information as UI text, not baked into PNGs
- [ ] Verify the same asset key can be used across combat and exploration

Success condition:

> Recruits and spells are visually recognizable everywhere they appear, using one replaceable content-asset system.

---

## 0.7.8 Exploration Collection Review

Before adding more exploration content, review the loop:

```text
Explore
↓
Collect Gold / resources
↓
Find recruits
↓
Find / buy spells
↓
Improve roster and deck
↓
End Day
↓
Fight Duskborn
↓
Survive
↓
Explore again
```

Review:

- [ ] Does finding recruits feel valuable?
- [ ] Does reinforcing an existing squad compete with gaining a new unit type?
- [ ] Are spell rewards exciting without overwhelming the player?
- [ ] Does Gold create interesting shop decisions?
- [ ] Are Rally locations meaningfully different from Shops?
- [ ] Does exploration materially change the next combat?
- [ ] Is the current roster easy to understand?
- [ ] Is the current spell collection easy to understand?
- [ ] Are there enough choices without turning exploration into menu management?

Success condition:

> The player explores because the map contains meaningful ways to build the army and spell deck needed to survive future nights.

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

Consider later whether Might influences:
- unit effectiveness;
- recruitment quality;
- squad progression;

and whether Magic influences:
- max Combat Mana;
- spell acquisition;
- spell effects;

but keep the first implementation simple.

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
- [ ] Add at least one event that can reward recruits
- [ ] Add at least one event that can reward a spell
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

As the typed roster becomes authoritative, re-evaluate generic `+Army` effects so artifacts can eventually reinforce typed squads or recruitment systems instead of maintaining duplicate army concepts.

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

Later unlock categories may include:
- new unit types;
- new spells;
- new shop/reward content;

but do not expand unlock scope until the core run loop is validated.

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
- [ ] Verify Captain Banner changes starting Army or its eventual typed-roster equivalent
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
- [ ] Support future unit/spell unlocks without duplicating loot filtering rules
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
- [ ] Does per-turn squad positioning create meaningful choices?
- [ ] Does spell draw and Mana allocation create meaningful choices?
- [ ] Does Might vs Magic create real build directions?
- [ ] Is Economy worth investing in?
- [ ] Are Shops useful without dominating exploration?
- [ ] Are Rally locations exciting?
- [ ] Does acquiring new spells change combat decisions?
- [ ] Does recruiting/reinforcing units change combat decisions?
- [ ] Are unit and spell images readable and easy to replace?
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
More unit types
Hero classes
Factions
Biomes
Procedural map generation
Rare events
Status effects
Advanced combat
Buildings
Resource generation
Difficulty levels
Daily modifiers
Achievements
Run seeds
Deck / spell drafting
Spell rarity
Card upgrades
Faction recruitment
Shop rerolls
Procedural shop inventories
Equipment
Animated unit portraits
VFX / SFX
```

Implement only when the validated core loop justifies them.
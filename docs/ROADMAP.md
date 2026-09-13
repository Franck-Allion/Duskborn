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

During deployment, a side must cover as many distinct surviving opponent-occupied lanes as its number of surviving squads permits.

Required covered lanes =
min(surviving friendly squads, distinct surviving opponent-occupied lanes).

Once that required coverage is reached, additional squads may occupy other legal lanes.

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
* [x] Prevent more than one selected attack ability per squad per turn
* [x] Allow multiple spells in a turn while Mana permits
* [x] Add ability/spell tests

Gold is not a combat action cost in this MVP.

Gold remains an exploration/economy resource unless a later design explicitly reintroduces combat spending.

Success condition:

> Mana creates a meaningful choice between squad abilities and spell effects.

---

## 0.6.12 Position-Based Abilities

Use the already completed position-category system.

* [x] Add at least one FRONT-based effect
* [x] Add at least one BACK-based effect
* [x] Add at least one EDGE or CENTER-based effect
* [x] Re-evaluate position effects after legal repositioning
* [x] Keep these rules data-driven where practical
* [x] Add position-effect tests

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

* [x] Allow ability selection only during `ACTION`
* [x] Allow spell play only during `ACTION`
* [x] Display/track selected ability for each active squad
* [x] Add Confirm Attack action
* [x] Prevent opponent-side actions during the active turn
* [x] Prevent deployment changes during `ACTION`
* [x] Validate selected actions before confirmation
* [x] Prevent further action changes once attack resolution starts
* [x] Add action-phase tests

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

* [x] Resolve selected squad abilities
* [x] Resolve spell effects required before attacks
* [x] Evaluate attacks for every surviving active-side squad
* [x] Use existing lane-targeting rules
* [x] Apply squad damage
* [x] Remove dead units from squad counts
* [x] Preserve partial HP on the currently damaged unit
* [x] Remove/disable squad when count reaches 0
* [x] Apply direct hero damage when opposing lane is empty
* [x] Ensure dead squads no longer block lanes
* [x] Preserve deterministic resolution order
* [x] Complete Mana spending semantics
* [x] Add attack-resolution tests

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

* [x] Reuse the same combat phase system for Duskborn turns
* [x] Restore enemy Mana at enemy turn start
* [x] Draw enemy spell
* [x] Reposition enemy squads using legal deployment rules
* [x] Respect lane engagement restrictions
* [x] Choose legal squad abilities
* [x] Choose legal spells within available Mana
* [x] Confirm and resolve enemy attack
* [x] Keep initial AI deterministic
* [x] Keep AI decision logic independent from Phaser
* [x] Add enemy-turn tests

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

* [x] Detect player victory from enemy hero HP
* [x] Detect player defeat from player hero HP
* [x] Check result after attack resolution
* [x] Stop turn transitions when combat has ended
* [x] Display combat result
* [x] Preserve surviving player squad counts
* [x] Preserve partially damaged surviving units
* [x] Preserve relevant run resources
* [x] Add combat-result tests

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

* [x] Create `UnitTypeProgression`
* [x] Track XP per unit type during the run
* [x] Track level per unit type
* [x] Award unit-type XP after combat
* [x] Add simple level thresholds
* [x] Add one ability unlock choice when a unit type levels up
* [x] Store unlocked abilities per unit type
* [x] Ensure newly recruited units inherit current type level/abilities
* [x] Add progression tests

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

## 0.6.18 Combat Interaction and Information Architecture

Before adding final visual polish, make combat interaction feel natural and make the current tactical state immediately understandable.

The player should never need to understand internal state-machine transitions in order to play.

### Combat HUD

Display permanently:

* [ ] active side
* [ ] current combat turn
* [ ] current combat phase using player-friendly wording
* [ ] player hero HP
* [ ] enemy hero HP
* [ ] hero shields when active
* [ ] player current / max Mana
* [ ] enemy Mana where useful
* [ ] squad count and current partial-unit HP
* [ ] unit-type level where relevant
* [ ] selected ability per player squad

Avoid presenting implementation terminology such as `RESOLUTION` as an action the player must manually advance.

### Context-sensitive controls

The combat UI must expose only actions meaningful in the current phase.

```text
DEPLOYMENT
→ reposition squads
→ Confirm Deployment

ACTION
→ inspect/select squad abilities
→ inspect/play spells
→ Confirm Attack

RESOLUTION
→ no gameplay confirmation
→ automatic presentation of resolved actions

ENEMY TURN
→ no player controls
→ observe enemy actions

VICTORY / DEFEAT
→ result panel
```

* [ ] Remove any player-facing "Resolve Attack" / "Continue Resolution" button
* [ ] Confirm Attack immediately commits the prepared attack
* [ ] Automatically begin visual resolution after confirmation
* [ ] Automatically transition after completed visual resolution when combat is still ongoing
* [ ] Keep domain phase transitions authoritative
* [ ] Prevent UI controls from exposing internal orchestration steps

Success condition:

> The player understands what they can do without needing to understand the combat state machine.

---

## 0.6.19 Visual Hand, Draw and Card Interaction

Spells should behave and read like actual cards rather than text commands.

The goal is not to reproduce a full collectible-card-game interface, but to make drawing and playing a spell satisfying and obvious.

### Hand

* [ ] Render the player's hand persistently during ACTION
* [ ] Give every spell a replaceable card image / artwork
* [ ] Display spell name
* [ ] Display Mana cost
* [ ] Display concise effect text
* [ ] Visually distinguish affordable and unaffordable cards
* [ ] Allow hover / pointer focus to enlarge or inspect a card
* [ ] Keep cards readable at supported resolutions
* [ ] Fan or arrange cards clearly when multiple cards are held

### Draw presentation

At `TURN_START`:

```text
deck
↓
draw card
↓
card visibly enters hand
```

* [ ] Display a draw pile / deck representation
* [ ] Animate or visually communicate one spell being drawn
* [ ] Update hand only once the draw presentation begins
* [ ] Keep draw animation short
* [ ] Allow animation skip / fast-forward if useful later

The player must understand:

```text
"I received this new spell because my turn started."
```

### Card interaction

Preferred interaction:

```text
select / drag card
↓
show valid targets
↓
select target if required
↓
commit play
↓
Mana paid
↓
card enters resolution queue
```

* [ ] Card interaction delegates legality to pure combat-domain APIs
* [ ] Invalid targets are visually rejected
* [ ] Cancelling target selection spends no Mana
* [ ] Successfully played card leaves the hand visibly
* [ ] Card enters discard after resolution according to current rules

Success condition:

> Drawing, inspecting and playing a spell feels like a meaningful game action rather than pressing a text button.

---

## 0.6.20 Spell Targeting Model

The current fixed automatic spell effects are sufficient for engine validation but too limited for the gameplay prototype.

Introduce a small explicit targeting model.

Do not build a Magic-style stack or arbitrary scripting system.

Example direction:

```ts
type SpellTargetType =
  | 'NONE'
  | 'ENEMY_HERO'
  | 'FRIENDLY_HERO'
  | 'ENEMY_SQUAD'
  | 'FRIENDLY_SQUAD'
  | 'ANY_SQUAD';
```

Exact structure may follow the existing architecture.

### Spell definition

A spell should declare:

```text
Mana cost
target rule
effect
effect value
visual asset
```

* [ ] Add target rule to spell content definitions
* [ ] Query legal spell targets through pure TypeScript
* [ ] Store selected spell target as part of the prepared action
* [ ] Validate target again when committing the spell
* [ ] Do not allow targeting dead squads
* [ ] Do not allow illegal friendly/enemy targets
* [ ] Ensure target selection and Mana spending are atomic

### Initial spell redesign

Give the first spell set distinct tactical purposes.

Recommended direction:

```text
Firebolt
→ target enemy squad OR enemy hero
→ direct damage

Barrier
→ target friendly squad or friendly hero
→ temporary protection / shield

Battle Cry
→ target friendly squad
→ improve its attack for this resolution

Dusk Strike
→ enemy equivalent offensive spell

Dark Ward
→ enemy defensive spell
```

Exact numbers can remain simple.

Do not require all spells to use the same target type.

### Gameplay requirement

Spells should answer different tactical questions:

```text
Do I finish a weakened squad?
Do I pressure the hero?
Do I protect a valuable squad?
Do I amplify the lane that matters this turn?
```

Success condition:

> A spell creates a deliberate tactical choice of effect and, where appropriate, target.

---

## 0.6.21 Attack Preview and Commitment

Before Confirm Attack, the player should understand what their prepared attack is expected to do.

Do not reveal hidden randomness because combat is deterministic.

### Target preview

For each surviving player squad during ACTION:

* [ ] Show its currently selected ability
* [ ] Show its predicted target
* [ ] Visually connect attacker and target
* [ ] Clearly indicate attacks that will hit the enemy hero
* [ ] Update previews immediately after ability selection
* [ ] Update previews after spell preparation when that spell changes attack outcome

Preferred presentation:

```text
squad
→ subtle arrow / lane highlight
→ target
```

### Damage preview

Recommended MVP:

* [ ] Display expected outgoing damage when deterministic
* [ ] Display expected lethal result where useful
* [ ] Avoid overwhelming the board with numbers
* [ ] Clearly distinguish preview from already-applied damage

Examples:

```text
Archer ×3
Power Shot
→ Duskborn Brute
15 damage
```

or:

```text
Guardian ×5
→ HERO
20 damage
```

### Confirm Attack

Confirm Attack should mean:

```text
"I commit these actions."
```

After pressing it:

```text
player input locks
↓
spell / ability / attack sequence begins automatically
```

No additional resolution confirmation.

Success condition:

> The player understands the likely consequence of committing the turn.

---

## 0.6.22 Combat Resolution Event Stream

Separate logical resolution from presentation timing.

Pure TypeScript remains authoritative.

Instead of Phaser trying to infer what happened by diffing states, expose a deterministic list of resolved combat events.

Example direction:

```ts
type CombatEvent =
  | SpellCastEvent
  | AbilityUsedEvent
  | SquadAttackEvent
  | DamageEvent
  | UnitDeathEvent
  | HeroDamageEvent
  | ShieldEvent
  | CombatResultEvent;
```

Exact architecture may differ.

Example sequence:

```text
SPELL_CAST Firebolt
DAMAGE Duskborn Archer 5
SQUAD_ATTACK Guardian -> Brute
DAMAGE Brute 16
UNIT_DEATH Brute ×2
SQUAD_ATTACK Archer -> Hero
HERO_DAMAGE 12
```

* [ ] Produce deterministic ordered resolution events
* [ ] Preserve final CombatState as source of truth
* [ ] Events contain enough information for presentation
* [ ] Phaser consumes events sequentially
* [ ] Presentation speed does not affect domain result
* [ ] Tests can assert both state and event ordering
* [ ] No Phaser types in combat-domain events

This layer is important because it allows gameplay animations without contaminating combat logic.

Success condition:

> A complete attack can be presented step-by-step while remaining fully deterministic and testable.

---

## 0.6.23 Attack, Damage and Death Presentation

Add a short readable presentation sequence for combat events.

Do not pursue expensive production animation yet.

Use simple Phaser tweens, flashes, particles and replaceable assets.

### Squad attack

Depending on unit identity:

```text
melee
→ short lunge / impact

ranged
→ projectile

spell
→ spell-specific projectile / VFX
```

* [ ] Attacker visibly activates
* [ ] Target visibly reacts
* [ ] Keep attacker in its logical grid position after presentation

### Damage

* [ ] Brief hit flash
* [ ] Floating damage number
* [ ] Update squad count / partial HP after impact
* [ ] Update hero HP after hero impact
* [ ] Show absorbed shield damage distinctly where practical

### Casualties

When damage kills units within a squad:

* [ ] Visually communicate unit loss
* [ ] Update displayed squad count after impact
* [ ] Provide stronger feedback when the whole squad dies

### Squad death

* [ ] Play a short death/fade/break animation
* [ ] Remove squad visual only after death feedback
* [ ] Ensure lane visibly becomes open afterwards

### Hero damage

* [ ] Stronger screen/hero feedback than ordinary squad damage
* [ ] Clearly show HP changing
* [ ] Keep effects brief enough for repeated combats

### Timing

Target initial pacing:

```text
ordinary hit:
~0.25–0.45 s

death:
~0.4–0.7 s

spell:
~0.4–0.8 s
```

Exact timings should be tuned through playtesting.

* [ ] No unnecessary multi-second pauses
* [ ] Allow sequence acceleration later if combat becomes slow

Success condition:

> The player can visually follow exactly what attacked, what was hit, how much damage occurred, and what died.

---

## 0.6.24 Spell Visual Effects

Every initial spell should have recognizable visual feedback.

Placeholder effects are sufficient.

Do not require final artwork.

Examples:

```text
Firebolt
→ projectile + fire impact

Barrier
→ shield pulse / temporary aura

Battle Cry
→ squad glow / burst

Dusk Strike
→ dark projectile / impact

Dark Ward
→ dark shield
```

* [ ] Define spell visual-effect key/reference in content
* [ ] Keep effect lookup data-driven
* [ ] Create placeholder VFX for every initial spell
* [ ] Show effect travelling to target when appropriate
* [ ] Play impact before applying visible HP/count update
* [ ] Do not encode combat effect rules inside VFX code
* [ ] Missing VFX safely falls back to generic feedback

Success condition:

> The player can identify what kind of spell just occurred without reading the combat log.

---

## 0.6.25 Enemy Turn Readability and Pacing

The enemy acts automatically, but its decisions must remain readable.

Do not reintroduce pre-turn hidden intentions.

During its active turn:

```text
deployment adjustment
↓
ability / spell choices
↓
attack resolution
```

* [ ] Visually show meaningful Duskborn repositioning
* [ ] Do not animate squads that stay in place
* [ ] Briefly show spell/ability chosen when relevant
* [ ] Present enemy spell cast before its effect
* [ ] Present attacks sequentially using the same event system
* [ ] Keep enemy turn fast
* [ ] Automatically return control after the sequence
* [ ] Clearly indicate when player control returns

Recommended:

```text
small banner:
DUSKBORN TURN

...

YOUR TURN
```

Avoid modal confirmations.

Success condition:

> The player can understand what the enemy did without having to control or confirm the enemy turn.

---

## 0.6.26 Replaceable Combat Visual Assets

Reuse the existing asset direction.

### Units

* [ ] Add visual asset reference to unit-type content definitions
* [ ] Create placeholder PNG for Guardian
* [ ] Create placeholder PNG for Archer
* [ ] Create placeholder PNG for Duskborn Brute
* [ ] Create placeholder PNG for Duskborn Archer
* [ ] Define consistent unit-image dimensions/aspect ratio
* [ ] Load through common Phaser preload flow
* [ ] Provide missing-asset fallback
* [ ] Render images on grid squad representations

### Spells

* [ ] Add image reference to spell definitions
* [ ] Create placeholder PNG assets for all initial spells
* [ ] Define consistent spell-card aspect ratio
* [ ] Render cards in hand
* [ ] Provide missing-asset fallback

### Dynamic information remains UI

Never bake into PNG:

```text
HP
count
level
Mana cost
selected ability
buff/debuff
```

* [ ] Replacing artwork requires no TypeScript logic change

Success condition:

> Prototype visuals can progressively be upgraded without refactoring gameplay code.

---

## 0.6.27 Tactical Content Vertical Slice

Before judging the combat, ensure there are enough meaningful options to actually test its potential.

The goal is NOT content volume.

The goal is to ensure each system creates decisions.

### Unit identities

Guardian should meaningfully reward:

```text
frontline
protection
survival
```

Archer should meaningfully reward:

```text
backline
damage
positioning
```

Duskborn Brute:

```text
pressure
high direct threat
```

Duskborn Archer:

```text
ranged pressure
different positional behavior
```

* [ ] Review baseline ability of each type
* [ ] Review progression ability choices
* [ ] Ensure at least two tactically distinct choices exist for progressed player unit types
* [ ] Avoid abilities that differ only by a small damage number

### Spell package

Target approximately 5–8 prototype player spells before final combat review.

Ensure the package includes at least:

* [ ] direct damage
* [ ] protection
* [ ] attack amplification
* [ ] positional / lane interaction
* [ ] one spell that creates an interesting target choice

Do not add cards just for quantity.

### Synergy

Include at least a few interactions such as:

```text
position
+
ability
+
spell
```

Example:

```text
Archer BACK bonus
+
Power Shot
+
Battle Cry
```

The player should be able to deliberately build a stronger turn through combined decisions.

Success condition:

> A player can experience several meaningfully different tactical turns within a single short combat.

---

## 0.6.28 Combat Game-Feel Playtest Pass

Run repeated manual prototype combats before moving deeper into the rest of the game.

Test for:

### Clarity

* [ ] Player always knows whose turn it is
* [ ] Player always knows what actions are currently available
* [ ] Targeting rules are understood without documentation
* [ ] Damage and deaths are visually understandable

### Agency

* [ ] Deployment decisions matter
* [ ] Ability choices matter
* [ ] Spell targets matter
* [ ] Mana creates meaningful trade-offs
* [ ] Player sometimes changes plan after drawing a card

### Feedback

* [ ] Draw feels rewarding
* [ ] Spell cast feels responsive
* [ ] Attack impact feels satisfying
* [ ] Squad death feels important
* [ ] Hero damage feels dangerous
* [ ] Victory feels conclusive

### Pacing

Measure approximately:

```text
time to make deployment decision
time to make ACTION decision
resolution animation duration
enemy turn duration
total combat duration
```

Recommended MVP targets, to tune rather than treat as hard requirements:

```text
normal player resolution:
~2–5 seconds

enemy turn presentation:
~3–7 seconds

ordinary combat:
roughly 3–8 minutes
```

* [ ] No unnecessary confirmation click
* [ ] No animation routinely blocks decision-making for too long
* [ ] Repeated animations remain tolerable after several combats

### Strategic interest

After multiple combats ask:

* [ ] Did lane placement create real dilemmas?
* [ ] Did I intentionally leave or attack an open lane?
* [ ] Did I choose between an ability and a spell because of Mana?
* [ ] Did card draw alter my intended turn?
* [ ] Did positioning change ability value?
* [ ] Did unit losses change later decisions?
* [ ] Did progression create a strategy I wanted to continue?

Success condition:

> A tester can play several combats for enjoyment rather than merely verifying that the systems function.

---

## 0.6.29 Combat MVP Integration Tests

Retain and extend the existing integration-test checklist.

In addition to current logical coverage, add:

* [ ] targeted spell validation
* [ ] invalid spell-target rejection
* [ ] prepared spell target persistence
* [ ] Confirm Attack starts resolution without extra domain confirmation
* [ ] deterministic CombatEvent ordering
* [ ] spell event before squad attack event
* [ ] damage event before death event
* [ ] lethal event stops later combat events when combat ends
* [ ] progression-unlocked abilities remain usable
* [ ] full player → enemy → player cycle after presentation-independent domain simulation

Animations themselves do not require fragile frame-by-frame tests.

Test domain events and state; manually verify presentation.

Success condition:

> The full gameplay loop remains deterministic even though its presentation is animated.

---

## 0.6.30 Combat MVP Review and Investment Gate

Do not treat this as only a rules review.

This is the decision point for whether the combat is compelling enough to justify expanding the rest of the game.

Review the existing questions plus:

### Core fun

* [ ] Would I voluntarily play another battle?
* [ ] Is there a satisfying decision at least once per turn?
* [ ] Does a strong turn feel earned?
* [ ] Is there enough uncertainty from hand/draw without losing tactical control?
* [ ] Can the player understand why they won or lost?

### Identity

* [ ] Does lane coverage distinguish Duskborn from a generic card battler?
* [ ] Do persistent squads create emotional/strategic value?
* [ ] Does combining placement + abilities + spells feel distinctive?
* [ ] Is the game borrowing strengths from its inspirations without becoming a weaker clone?

### Investment gate

Before expanding content significantly, explicitly decide:

```text
CONTINUE
→ core combat is already enjoyable
→ invest in exploration, roster, content and production

ITERATE
→ core idea works but specific systems need adjustment

RETHINK
→ combat is technically functional but not compelling
```

Success condition:

> The combat prototype is polished enough that its fun—not missing UI or feedback—determines whether development continues.

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
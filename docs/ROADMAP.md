# ROADMAP.md

## Working Rule

Implement coherent batches rather than blindly implementing one checkbox at a time.

For each batch:

```text
Inspect current working tree and latest pushed commit
Audit the previous batch for regressions
Implement only the current coherent slice
Run targeted tests
Run full tests when relevant
Run TypeScript validation
Run ESLint
Run build
Launch / manually verify gameplay when relevant
Update only roadmap items actually completed
Commit the change
```

Combat-domain rules should remain pure TypeScript whenever practical. Phaser owns presentation, input, animation, sound, camera effects, and visual sequencing; it must not become the authoritative source of gameplay rules.

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

---

# 0.1 Core Map

- [x] Create a pure TypeScript logical 6x6 map model
- [x] Add tests for map dimensions
- [x] Render the 6x6 map in Phaser
- [x] Add a player logical position
- [x] Render player position

---

# 0.2 Movement

- [x] Implement orthogonal movement rules in pure TypeScript
- [x] Reject diagonal movement
- [x] Reject out-of-bounds movement
- [x] Add movement tests
- [x] Connect map clicks to movement
- [x] Visually update player position

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

---

# 0.4 Exploration Resources

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

Resource roles:

```text
Gold -> shops / recruits / cards / economy choices
Exploration Mana -> magical exploration rewards/events
Combat Mana -> refreshed each combat turn, pays for spells and squad abilities
Army -> legacy run-level resource, progressively migrate toward typed squads
```

---

# 0.5 End-of-Day Flow

- [x] Create explicit exploration phase
- [x] End Day transitions out of exploration
- [x] Add end-of-day transition message
- [x] Display "The Duskborn approaches."
- [x] Introduce combat phase / CombatScene
- [x] Prevent map actions during combat

---

# 0.6 Tactical Duskborn Combat Vertical Slice

The combat milestone is no longer only a rules MVP. It is the vertical slice used to decide whether the core game is fun enough to justify deeper production.

Core identity:

```text
6 columns x 4 rows
2 rows per side
one indivisible squad per unit type
persistent squads
position-dependent abilities
Combat Mana shared by abilities and spells
unified Creature + Spell combat deck
visible card draw
player bench for undeployed Creature cards
persistent Spell hand
alternating turns
readable deterministic resolution
```

The visual target is a polished game interface, not a debug UI. Text is allowed only as part of designed game components: framed cards, badges, tooltips, counters, banners, buttons, and HUD panels. Avoid raw monospace/debug labels in the final vertical slice.

---

## 0.6.1 Combat Data Model

- [x] Create `UnitType` content definition structure
- [x] Create `Squad` model
- [x] Create `CombatPosition`
- [x] Create `CombatState`
- [x] Add player hero HP
- [x] Add enemy hero HP
- [x] Keep combat models independent from Phaser
- [x] Add initial combat model tests

---

## 0.6.2 First Unit Types

### Player
- [x] Create Guardian unit type
- [x] Create Archer unit type

### Duskborn
- [x] Create Duskborn Brute
- [x] Create Duskborn Archer or equivalent ranged enemy

- [x] HP per unit
- [x] base damage
- [x] one basic ability
- [x] optional simple passive if needed

---

## 0.6.3 Combat Grid

- [x] Create pure TypeScript combat grid model
- [x] Grid size is 6 x 4
- [x] Define player deployment zone as 6 x 2
- [x] Define enemy deployment zone as 6 x 2
- [x] Prevent invalid positions
- [x] Prevent two squads occupying same cell
- [x] Add grid tests
- [x] Render combat grid in CombatScene

Canonical rows:

```text
row 0 = Enemy Back
row 1 = Enemy Front
row 2 = Player Front
row 3 = Player Back
```

---

## 0.6.4 Squad Deployment Foundation

- [x] Allow player squads to be positioned before combat
- [x] Allow only one squad per unit type
- [x] Prevent splitting a squad
- [x] Restrict player placement to player deployment zone
- [x] Place enemy squads using deterministic initial rules
- [x] Add Confirm Deployment action
- [x] Prevent combat from starting before valid deployment
- [x] Add drag-and-drop deployment interaction
- [x] Add deployment tests

---

## 0.6.5 Position Categories

- [x] Detect FRONT / BACK
- [x] Detect EDGE / CENTER
- [x] Keep position rules independent from Phaser
- [x] Add position tests

---

## 0.6.6 Lane Targeting

- [x] Implement lane detection
- [x] Same-column targeting
- [x] FRONT priority when both enemy rows occupied
- [x] Empty opposing lane damages hero
- [x] Add targeting tests

---

## 0.6.7 Alternating Turn System

- [x] Add active side
- [x] Add combat turn number
- [x] Add explicit combat phase
- [x] Start with player active
- [x] Implement `TURN_START`
- [x] `TURN_START -> DEPLOYMENT`
- [x] `DEPLOYMENT -> ACTION`
- [x] Confirm Attack `ACTION -> RESOLUTION`
- [x] `RESOLUTION -> TURN_END`
- [x] Switch active side
- [x] Start next side turn
- [x] Prevent phase-invalid actions
- [x] Add turn-state tests

---

## 0.6.8 Combat Mana

- [x] Add player combat Mana
- [x] Add enemy combat Mana
- [x] Restore active side Mana at `TURN_START`
- [x] Spend current Mana
- [x] Prevent negative Mana
- [x] Reject actions with insufficient Mana
- [x] Prevent accumulation above max
- [x] Separate Combat Mana from RunState Mana
- [x] Add combat Mana tests

---

## 0.6.9 Legacy Spell Deck Foundation

This completed work remains valid as migration input for the unified card deck.

- [x] Create `SpellDefinition`
- [x] Create pure TypeScript spell deck state
- [x] Create initial player spell deck
- [x] Create initial Duskborn spell deck or deterministic equivalent
- [x] Draw 1 spell at `TURN_START`
- [x] Put played spells into discard
- [x] Define empty draw-pile behavior
- [x] Keep spell/deck logic independent from Phaser
- [x] Add spell draw/deck tests

> The spell-only deck is now legacy architecture. Preserve useful code and tests, but migrate the gameplay model to the unified Creature + Spell deck below.

---

## 0.6.10 Per-Turn Squad Deployment

- [x] Reuse deployment APIs for per-turn repositioning
- [x] Deployment only during active side `DEPLOYMENT`
- [x] Reposition surviving player squads each player turn
- [x] Reposition surviving enemy squads each enemy turn
- [x] Preserve count and partial HP while repositioning
- [x] Apply lane engagement restriction
- [x] Prevent illegal empty-lane placement while required lanes remain uncovered
- [x] Preserve occupancy and deployment-zone validation
- [x] Prevent deployment changes during `ACTION`
- [x] Adapt drag-and-drop to per-turn deployment
- [x] Replace one-time deployment confirmation semantics
- [x] Add per-turn deployment tests

### Deployment ergonomics already completed

- [x] Deployed <-> deployed swap
- [x] Atomic swap
- [x] Prospective validation
- [x] Reject invalid swap without partial mutation
- [x] Add swap tests
- [x] Allow undeployed squad to replace a deployed friendly squad
- [x] Replaced squad returns to `position = null`
- [x] Keep null/position exchange atomic
- [x] Keep final deployment confirmation strict

### Revised deployment rule for the new bench model

The player is no longer required to deploy every Creature card available on the bench.

- [x] Allow Confirm Deployment with creatures intentionally left on bench
- [x] Validate only actually deployed squads for board position/occupancy
- [x] Preserve maximum-achievable lane coverage using the subset chosen for deployment
- [x] Define MVP minimum deployment requirement (recommended: at least one deployed squad when one is available)
- [x] Ensure bench creatures do not attack, block lanes, or count as board casualties
- [x] Add tests for intentional bench retention

---

## 0.6.11 Squad Abilities and Spells

- [x] Create/extend ability content structure
- [x] Guardian has at least 2 meaningful abilities
- [x] Archer has at least 2 meaningful abilities
- [x] Each Duskborn type has at least 1 ability
- [x] Support Mana ability costs
- [x] Add at least 3 player spells
- [x] Add minimal Duskborn spells/equivalents
- [x] Support Mana spell costs
- [x] Reject unaffordable ability/spell use
- [x] Spend Mana only on successful legal actions
- [x] One selected attack ability per squad/turn
- [x] Multiple spells allowed while Mana permits
- [x] Add ability/spell tests

---

## 0.6.12 Position-Based Abilities

- [x] Add FRONT-based effect
- [x] Add BACK-based effect
- [x] Add EDGE/CENTER-based effect
- [x] Re-evaluate after repositioning
- [x] Keep rules data-driven
- [x] Add position-effect tests

---

## 0.6.13 Action Phase and Confirm Attack

- [x] Ability selection only during ACTION
- [x] Spell play only during ACTION
- [x] Display/track selected ability per active squad
- [x] Add Confirm Attack
- [x] Prevent opponent-side actions during active turn
- [x] Prevent deployment changes during ACTION
- [x] Validate selected actions before confirmation
- [x] Prevent action changes after resolution starts
- [x] Add action-phase tests

Existing rule remains: the player is not required to spend all Mana or play all cards.

---

## 0.6.14 Attack Resolution

- [x] Resolve selected squad abilities
- [x] Resolve spell effects required before attacks
- [x] Evaluate every surviving active-side squad
- [x] Use lane-targeting rules
- [x] Apply squad damage
- [x] Remove dead units from counts
- [x] Preserve partial HP
- [x] Disable squad at count 0
- [x] Apply direct hero damage through empty lane
- [x] Dead squads stop blocking lanes
- [x] Preserve deterministic resolution order
- [x] Complete Mana spending semantics
- [x] Add attack-resolution tests

---

## 0.6.15 Duskborn Turn AI

- [x] Reuse combat phase system
- [x] Restore enemy Mana
- [x] Draw enemy spell
- [x] Reposition legally
- [x] Respect lane engagement restrictions
- [x] Choose legal abilities
- [x] Choose legal spells
- [x] Confirm/resolve enemy attack
- [x] Keep AI deterministic
- [x] Keep AI independent from Phaser
- [x] Add enemy-turn tests
- [x] Preserve already-valid Duskborn deployment

Migration:

- [ ] Adapt enemy AI to unified Creature + Spell draw
- [ ] Add hidden enemy bench/hand behavior under same legality rules

---

## 0.6.16 Combat Result

- [x] Detect victory from enemy hero HP
- [x] Detect defeat from player hero HP
- [x] Check result after attack resolution
- [x] Stop transitions after combat ends
- [x] Display combat result
- [x] Preserve surviving squad counts
- [x] Preserve partial damage
- [x] Preserve relevant run resources
- [x] Add combat-result tests

---

## 0.6.17 Unit-Type Progression

- [x] Create `UnitTypeProgression`
- [x] Track XP per unit type
- [x] Track level per unit type
- [x] Award XP after combat
- [x] Add level thresholds
- [x] Add ability unlock choice on level-up
- [x] Store unlocked abilities per unit type
- [x] New recruits inherit type level/abilities
- [x] Add progression tests

---

## 0.6.18 Combat Interaction and Information Architecture

- [x] Active side
- [x] Current combat turn
- [x] Player-friendly phase wording
- [x] Player hero HP
- [x] Enemy hero HP
- [x] Hero shields
- [x] Player current/max Mana
- [x] Enemy Mana where useful
- [x] Squad count and partial-unit HP
- [x] Unit-type level
- [x] Selected ability per player squad
- [x] Remove Resolve Attack / Continue Resolution control
- [x] Confirm Attack immediately commits
- [x] Automatically begin resolution
- [x] Automatically transition after resolution
- [x] Domain phases remain authoritative
- [x] Hide internal orchestration from player

### Required premium presentation refactor

- [ ] Remove remaining raw/debug-looking text from final combat presentation
- [ ] Replace plain statuses with designed badges, banners, counters, icons and tooltips
- [ ] Replace monospace/debug typography in player-facing UI
- [ ] Establish final depth hierarchy for board, cards, bench, HUD, tooltips and VFX
- [ ] Make all controls feel like game UI rather than developer controls

---

## 0.6.19 Unified Combat Card Model

Replace the spell-only draw model with one unified combat-card deck.

```ts
type CombatCard = CreatureCard | SpellCard;
type CombatCardType = 'CREATURE' | 'SPELL';

interface CombatCardBase {
  instanceId: string;
  cardType: CombatCardType;
  contentId: string;
}

interface CreatureCard extends CombatCardBase {
  cardType: 'CREATURE';
  unitTypeId: string;
}

interface SpellCard extends CombatCardBase {
  cardType: 'SPELL';
  spellId: string;
}
```

For the MVP, each owned unit type contributes one Creature card to the combat deck. Recruiting more soldiers of an existing type increases that squad's count; it does not create a duplicate squad or duplicate Creature card unless explicitly redesigned later.

- [x] Create pure TypeScript `CombatCard` union
- [x] Create unified draw pile containing Creature + Spell cards
- [x] Preserve injectable/seeded RNG for tests while allowing random gameplay draw
- [x] Migrate current player spell deck into unified deck
- [x] Migrate Duskborn deck/equivalent
- [x] Preserve one-squad-per-unit-type invariant
- [x] Preserve useful spell discard semantics
- [x] Define Creature-card lifecycle separately from spell discard
- [x] Add unified-card model tests

---

## 0.6.20 Opening Draw, Turn Draw, Hand and Bench Rules

### Opening draw

Combat starts with:

```text
2 random Creature cards
+
1 random Spell card
```

These cards are selected from their respective eligible pools, removed from the future pool, then all remaining Creature + Spell cards are shuffled into one draw pile.

- [x] Draw up to 2 Creature cards at combat start
- [x] Draw up to 1 Spell card at combat start
- [x] Remove opening cards from remaining pool
- [x] Shuffle remaining Creature + Spell cards together
- [x] Random in gameplay, deterministic under injected/seeded RNG in tests
- [x] If a category has too few cards, draw as many as exist
- [x] Add opening-draw tests

### Per-turn draw

```text
TURN_START
-> restore Mana
-> draw exactly 1 card from unified pile
-> route by card type
```

- [x] Draw one mixed card per turn
- [x] Empty draw pile => no-op
- [x] No automatic reshuffle for MVP
- [x] Ensure one draw per turn only
- [x] Add empty-deck/idempotency tests

### Spell hand

Recommended MVP tuning constant:

```ts
MAX_SPELL_HAND = 5
```

- [x] Spell draw enters Spell hand
- [x] Spell hand persists between turns
- [x] Player is never forced to cast all spells
- [x] Hand cannot exceed configured limit
- [x] Full-hand draw burns/discards new Spell card with explicit domain feedback
- [x] Add hand-limit tests

### Creature bench

Recommended MVP tuning constant:

```ts
MAX_CREATURE_BENCH = 5
```

- [x] Creature draw enters Creature bench
- [x] Bench persists across player turns in combat
- [x] Player is never forced to deploy all bench creatures
- [x] Bench cannot exceed configured limit
- [x] Full-bench draw burns/discards new Creature card with explicit domain feedback
- [x] Bench Creature maps to exactly one unit type/squad identity
- [x] Add bench-limit tests

### Player agency

- [x] Player may end deployment with Creature cards left on bench
- [x] Player may Confirm Attack with playable spells still in hand
- [x] Unused cards remain available on later turns unless explicitly removed

---

## 0.6.21 Permanent Card Hand and Creature Bench Presentation

The card UI must be visible throughout the entire player turn, including DEPLOYMENT.

At 960x540 logical resolution:

```text
+------------------------------------------------------------+
|                    ENEMY HUD / HERO                        |
|                    ENEMY BOARD                             |
|                    PLAYER BOARD                            |
|                                                            |
| BENCH                    SPELL HAND              MANA/HERO |
| [C][C]              [S][S][S][S][S]                       |
+------------------------------------------------------------+
```

Preferred placement:

```text
Spell hand -> bottom center, slightly fanned, always visible during player turn
Creature bench -> lower-left/lower-side adjacent to board
```

- [x] Render Spell hand throughout full player turn
- [x] Render Creature bench throughout full player turn
- [x] Never hide Spell hand during deployment
- [x] Keep opponent card identities hidden
- [ ] Show opponent card counts only where useful
- [x] Keep Hearthstone-like bottom-center hand silhouette without copying assets
- [x] Keep board interaction unobstructed
- [x] Support 960x540 logical canvas and responsive fitting
- [x] Support high-DPI text/textures
- [x] Add `CombatHandView` / equivalent
- [x] Add `CreatureBenchView` / equivalent
- [x] Views rebuild from domain state, never own gameplay card state

---

---

## 0.6.22 AAA Card Visual System and Replaceable Assets

The current placeholder card UI is not the final target. Cards should evoke premium fantasy card games while remaining original to Duskborn.

### Visual principles

```text
large illustrated focal area
strong Creature vs Spell differentiation
integrated Mana badge
designed nameplate
rules panel inside the card frame
subtle shadow / glow / depth
hover lift and slight perspective
no raw debug text floating beside cards
```

### Source asset specifications

Use these source sizes so artwork can be replaced later without changing code or layout logic:

```text
Full card frame PNG
768 x 1080 px
RGBA / transparent
portrait orientation
24 px outer transparent safe padding

Card back PNG
768 x 1080 px

Card artwork master
1024 x 1024 px minimum
square source
Phaser crops/masks into artwork window
important subject inside central 80% safe area

Mana / type / status icons
256 x 256 px
transparent PNG

Board unit portrait/token
512 x 512 px
transparent PNG preferred
subject inside central 85%

Hero portrait
1024 x 1024 px
square master, masked by UI
```

Recommended render sizes at 960x540:

```text
normal hand card: 96-112 px wide x 135-158 px high
focused card: 130-150 px wide x 183-211 px high
bench Creature card: 82-96 px wide x 115-135 px high
```

### Layer architecture

Prefer layered composition:

```text
shadow
frame texture
masked artwork
Mana badge
card-type emblem
nameplate
rules panel
text/icons
playable/selected glow
```

Never bake dynamic gameplay values into art PNGs:

```text
Mana cost
unit count
HP
level
selected ability
buff/debuff values
hand state
```

- [ ] Add visual asset refs to Creature/unit content
- [ ] Add visual asset refs to Spell definitions
- [ ] Add Creature and Spell frame keys
- [ ] Add shared card-back key
- [ ] Add fallback artwork texture
- [ ] Add common Phaser preload manifest
- [ ] Replacing artwork requires no TypeScript gameplay change
- [ ] Creature and Spell cards have clearly different frames
- [ ] Affordable cards get subtle playable glow
- [ ] Unaffordable cards remain readable but muted
- [ ] Hover lifts/scales card and increases depth
- [ ] Selected/dragged card gets stronger focus glow
- [ ] Tween cards entering/leaving/reflowing instead of instant jumps
- [ ] Add slight fan/rotation when useful
- [ ] Avoid literal copies of Hearthstone or MTG frames

Success condition:

> A combat screenshot reads as a deliberate fantasy card/strategy game rather than a text-heavy prototype.

---

## 0.6.23 Draw Pile, Opening Deal and Draw Animation

The draw must be visible before deployment begins.

### Draw pile

- [ ] Render card-back draw pile near lower-right/lower-center player HUD
- [ ] Display remaining draw count in designed badge
- [ ] Display discard/burn count in secondary badge
- [ ] Never reveal future card identities

### Opening deal

```text
combat scene enters
-> deck appears
-> Creature #1 dealt to bench
-> Creature #2 dealt to bench
-> Spell dealt to hand
-> remaining deck visibly settles/shuffles
-> DEPLOYMENT becomes interactive
```

- [ ] Animate first Creature to bench
- [ ] Animate second Creature to bench
- [ ] Animate opening Spell to hand
- [ ] Reveal actual card after travel/flip timing
- [ ] Lock deployment only during short opening deal
- [ ] Keep total opening deal around 1.2-2.0 s

### Turn draw

```text
YOUR TURN banner
-> Mana refresh pulse
-> card back lifts from deck
-> card travels
-> card reveals
-> Spell -> hand
   Creature -> bench
-> DEPLOYMENT interactive
```

- [ ] Animate exactly one card draw per turn
- [ ] Route animation toward hand or bench by card type
- [ ] Reveal during travel or on arrival
- [ ] Use Phaser tweens/easing
- [ ] Keep normal draw around 0.45-0.8 s
- [ ] Empty deck produces no fake animation

### Overflow feedback

- [ ] Full hand/bench still reveals drawn card
- [ ] Play burn/overflow feedback
- [ ] Move burned card toward discard/burn indicator
- [ ] Never silently destroy overflow card

### Fast presentation

- [ ] Allow click/tap or configured fast mode to accelerate presentation without changing domain result

---

## 0.6.24 Creature Card Deployment from Bench

Creature cards represent unit types available to field.

### Bench interaction

- [ ] Creature hover raises/enlarges card
- [ ] Drag Creature from bench to legal player board cell
- [ ] Highlight legal cells during drag
- [ ] Highlight invalid cells distinctly
- [ ] Drop on empty legal cell deploys squad
- [ ] Drop on deployed friendly squad performs atomic null/position exchange
- [ ] Deployed <-> deployed drag still swaps positions
- [ ] Drag deployed squad back onto its bench card undeploys it when legal
- [ ] Cancelled drag returns cleanly without mutation

### Board representation

Once deployed, a creature becomes a combat unit/token rather than remaining a full hand card.

- [ ] Use unit portrait/standee/token on board
- [ ] Unit count uses designed badge
- [ ] Partial HP uses icon/bar treatment
- [ ] Level is unobtrusive
- [ ] Selected ability uses icon/badge instead of raw text
- [ ] Board unit remains recognizable from its Creature-card artwork

### Optional deployment

- [ ] Player may leave Creature cards on bench after Confirm Deployment
- [ ] Bench creatures do not attack
- [ ] Bench creatures cannot be targeted by normal lane attacks
- [ ] Bench creatures remain available on later turns unless explicitly removed

---

## 0.6.25 Spell Card Interaction and Targeting

Replace click-to-auto-resolve spell behavior with explicit tactical targeting.

Recommended target model:

```ts
type SpellTargetType =
  | 'NONE'
  | 'ENEMY_HERO'
  | 'FRIENDLY_HERO'
  | 'ENEMY_SQUAD'
  | 'FRIENDLY_SQUAD'
  | 'ANY_SQUAD';
```

- [ ] Add target rules to Spell definitions
- [ ] Query legal targets in pure TypeScript
- [ ] Store selected target as prepared action
- [ ] Validate target again on commit
- [ ] Prevent targeting dead squads
- [ ] Prevent illegal friendly/enemy targets
- [ ] Make target selection + Mana spending atomic

Preferred interaction:

```text
hover Spell card
-> card lifts
-> drag or click-select
-> board dims slightly
-> legal targets glow
-> target focus ring / aim line
-> release/click target
-> spell commits
```

- [ ] Pointer-driven spell targeting
- [ ] Legal target highlights
- [ ] Invalid target feedback
- [ ] ESC/right-click/outside drop cancels without Mana
- [ ] Cancelled card returns smoothly to hand
- [ ] Successful spell leaves hand and enters discard/resolution lifecycle

Initial spell direction:

```text
Firebolt -> enemy squad OR enemy hero -> direct damage
Barrier -> friendly squad OR hero -> shield
Battle Cry -> friendly deployed squad -> attack amplification
```

---

## 0.6.26 Attack Preview and Commitment

- [ ] Show selected ability for each deployed player squad with designed icon/badge
- [ ] Show predicted target
- [ ] Visually connect attacker and target
- [ ] Clearly indicate hero-directed attacks
- [ ] Update previews after deployment/ability/spell changes
- [ ] Display expected deterministic damage where useful
- [ ] Display likely lethal result without clutter
- [ ] Confirm Attack is final commitment click
- [ ] Lock player input immediately after commit

---

## 0.6.27 Combat Resolution Event Stream

```ts
type CombatEvent =
  | CardDrawEvent
  | CreatureDeployEvent
  | CreatureUndeployEvent
  | SpellCastEvent
  | AbilityUsedEvent
  | SquadAttackEvent
  | DamageEvent
  | UnitDeathEvent
  | HeroDamageEvent
  | ShieldEvent
  | CombatResultEvent;
```

- [ ] Produce deterministic ordered events
- [ ] Preserve final CombatState as source of truth
- [ ] Events contain sufficient presentation data
- [ ] No Phaser types in domain events
- [ ] Presentation speed does not change result
- [ ] Tests assert event ordering

---

## 0.6.28 Attack, Damage, Death and Spell VFX

Use Phaser as a presentation engine, not only a canvas for labels.

### Creature attacks

- [ ] Melee lunge / anticipation / impact tween
- [ ] Ranged projectile or tracer
- [ ] Attacker visibly activates
- [ ] Target reacts on impact
- [ ] Unit token returns to logical position after presentation

### Damage

- [ ] Hit flash / tint pulse
- [ ] Floating damage number in designed combat font treatment
- [ ] HP/count badge updates on impact
- [ ] Shield absorption has distinct response

### Death

- [ ] Casualty reduction visibly updates count
- [ ] Full squad death uses fade/dissolve/break animation
- [ ] Lane opens only after readable death presentation

### Hero feedback

- [ ] Hero portrait/frame reacts strongly to hit
- [ ] Hero HP animates to new value
- [ ] Optional short camera shake for major hits only

### Spell VFX

- [ ] Firebolt projectile + impact
- [ ] Barrier shield pulse/aura
- [ ] Battle Cry pulse/glow
- [ ] Duskborn effects use distinct visual language
- [ ] Missing VFX falls back safely
- [ ] VFX lookup is data-driven

Timing targets:

```text
normal hit: 0.25-0.45 s
death: 0.4-0.7 s
spell: 0.4-0.8 s
```

---

## 0.6.29 Premium Combat HUD and UX Pass

### Typography

- [ ] Choose readable display font + UI/body font
- [ ] Remove monospace/debug font from player-facing combat UI
- [ ] Define typography scale for card names, rules, counters, banners and tooltips

### Panels and controls

- [ ] Replace plain rectangles with textured/9-slice panels
- [ ] Mana uses icon/gem treatment rather than plain text
- [ ] Hero HP uses framed portrait + health treatment
- [ ] Turn/phase uses compact animated banner
- [ ] Confirm Deployment / Confirm Attack use proper hover/pressed/disabled states
- [ ] Add tooltips for icons and abilities
- [ ] Remove redundant text where iconography/animation communicates the state

### Camera and depth

- [ ] Stable depth layers: background, grid, units, cards, tooltips, VFX, results
- [ ] Use subtle camera/tween feedback, not constant shake
- [ ] Hovered card always above hand neighbors
- [ ] VFX render above units but below critical HUD/tooltips where appropriate

### Audio hooks

- [ ] card draw SFX hook
- [ ] card hover/select SFX hook
- [ ] deploy SFX hook
- [ ] spell cast SFX hook
- [ ] hit/death SFX hook
- [ ] turn banner SFX hook

---

## 0.6.30 Enemy Turn Readability and Card Pacing

- [ ] Adapt enemy to unified draw pile
- [ ] Enemy draws one mixed card per turn
- [ ] Enemy Creature draw enters hidden reserve/bench
- [ ] Enemy Spell draw enters hidden hand
- [ ] Enemy obeys hand/bench limits
- [ ] Enemy may leave units undeployed
- [ ] Preserve already-valid enemy deployment when no correction is needed
- [ ] Visually show meaningful deployment changes
- [ ] Do not animate units that stay in place
- [ ] Reveal enemy Spell card only when played
- [ ] Present enemy spell target before effect
- [ ] Present attacks sequentially through event stream
- [ ] Keep enemy turn concise
- [ ] Automatically return control to player
- [ ] Clearly indicate `YOUR TURN`

---

## 0.6.31 Tactical Content Vertical Slice

### Creature identities

- [ ] Review Guardian: frontline / protection / survival
- [ ] Review Archer: backline / damage / positioning
- [ ] Review Duskborn Brute: pressure / direct threat
- [ ] Review Duskborn Archer: ranged pressure / positional identity
- [ ] Ensure progression abilities create qualitatively different choices

### Spell package

Target approximately 5-8 player Spell cards:

- [ ] direct damage
- [ ] protection
- [ ] attack amplification
- [ ] lane/position interaction
- [ ] hero-vs-squad target choice

### Initial combat deck

- [ ] Define initial player deck composition
- [ ] Ensure opening draw can satisfy 2 Creature + 1 Spell with initial content
- [ ] Ensure remaining mixed deck can yield both types later
- [ ] Keep total content deliberately small until fun is validated

---

## 0.6.32 Combat Integration Tests

- [ ] Unified Creature + Spell deck construction
- [ ] Opening 2 Creature + 1 Spell draw
- [ ] Remaining-deck shuffle
- [ ] One mixed draw per turn
- [ ] Empty draw pile no-op
- [ ] Spell hand limit
- [ ] Creature bench limit
- [ ] Overflow/burn behavior
- [ ] Optional bench deployment
- [ ] Deployed <-> deployed swap
- [ ] Undeployed <-> deployed replacement
- [ ] Spell target legality
- [ ] Cancelled targeting spends no Mana
- [ ] Confirm Attack starts resolution without extra confirmation
- [ ] Deterministic CombatEvent ordering
- [ ] Damage before death event
- [ ] Lethal combat stops later events
- [ ] Progression-unlocked abilities remain usable
- [ ] Full player -> enemy -> player cycle

Avoid brittle frame-by-frame animation tests. Test domain state/events and manually verify presentation.

---

## 0.6.33 Combat Game-Feel Playtest Pass

### Clarity

- [ ] Player always knows whose turn it is
- [ ] Spell hand visible during deployment
- [ ] Creature bench visible during deployment
- [ ] Player understands what was drawn and where it went
- [ ] Targeting understood without documentation
- [ ] Damage and deaths readable visually

### Agency

- [ ] Player sometimes intentionally leaves Creature on bench
- [ ] Player sometimes saves Spell for later turn
- [ ] Draw changes intended deployment/action plan
- [ ] Mana creates real ability-vs-spell trade-offs
- [ ] Position changes ability value

### Feel

- [ ] Opening deal feels polished
- [ ] Card hover feels responsive
- [ ] Card draw feels rewarding
- [ ] Creature deployment feels tactile
- [ ] Spell targeting feels tactile
- [ ] Attack impact feels satisfying
- [ ] Squad death feels important
- [ ] Hero damage feels dangerous
- [ ] Victory feels conclusive

Pacing targets:

```text
opening deal: 1.2-2.0 s
normal turn draw: 0.45-0.8 s
normal player resolution: 2-5 s
enemy turn presentation: 3-7 s
ordinary combat: 3-8 min
```

- [ ] No unnecessary confirmation click
- [ ] Repeated animations remain tolerable
- [ ] Fast-forward/skip preserves correctness

---

## 0.6.34 Combat MVP Review and Investment Gate

### Core fun

- [ ] Would I voluntarily play another battle?
- [ ] Is there a satisfying decision at least once per turn?
- [ ] Does a strong turn feel earned?
- [ ] Does mixed Creature/Spell draw create interesting uncertainty?
- [ ] Can the player understand why they won or lost?

### Identity

- [ ] Does lane coverage distinguish Duskborn from a generic card battler?
- [ ] Do persistent squads create strategic/emotional value?
- [ ] Does Creature bench + Spell hand create distinctive tactical rhythm?
- [ ] Does placement + abilities + spells feel cohesive?
- [ ] Is the game borrowing strengths from inspirations without becoming a weaker clone?

### Investment gate

```text
CONTINUE -> core combat is enjoyable; invest deeper
ITERATE -> core idea works but needs targeted changes
RETHINK -> technically functional but not compelling
```

---

# 0.7 New Day and Exploration Growth Loop

## 0.7.1 New Day Transition

- [ ] On victory, increment day
- [ ] Restore daily action points
- [ ] Return to exploration
- [ ] Increase Duskborn strength
- [ ] Preserve surviving squads
- [ ] Preserve squad damage
- [ ] Preserve unit-type progression
- [ ] Preserve acquired Spell cards
- [ ] Preserve acquired Creature/unit types
- [ ] Preserve Gold and exploration resources
- [ ] Preserve run stats
- [ ] Add day transition tests

---

## 0.7.2 Run Roster and Creature-Card Ownership

- [ ] Create/preserve run-level typed roster
- [ ] Persist roster between exploration and combat
- [ ] Preserve surviving counts after combat
- [ ] Recruiting existing type increases squad count
- [ ] Recruiting new type creates exactly one squad
- [ ] Preserve one-squad-per-unit-type invariant
- [ ] New recruits inherit type progression
- [ ] One Creature card entry per owned unit type in combat deck construction
- [ ] Integrate/migrate legacy Army value
- [ ] Display roster during exploration
- [ ] Add roster tests

---

## 0.7.3 Rally and Recruitment Locations

- [ ] Add Rally / Recruitment tile
- [ ] Render Rally tile
- [ ] Open recruitment interaction
- [ ] Offer at least one unit type
- [ ] Add recruits to roster
- [ ] Reinforce existing squad
- [ ] Recruit new unit type
- [ ] New type becomes eligible Creature card in future combat deck
- [ ] Mark one-use Rally resolved
- [ ] Prevent repeated collection
- [ ] Add recruitment tests

---

## 0.7.4 Shops

First shop may sell Recruits and Spell cards.

- [ ] Add Shop tile/location
- [ ] Create shop inventory model independent from Phaser
- [ ] Deterministic/fixed MVP inventory
- [ ] Recruit offers
- [ ] Spell-card offers
- [ ] Display Gold
- [ ] Reject insufficient Gold
- [ ] Deduct Gold only after successful purchase
- [ ] Purchased recruits update roster
- [ ] Purchased Spells update run collection
- [ ] Remove/mark purchased one-time offers
- [ ] Add shop tests

---

## 0.7.5 Combat Card Collection During a Run

- [ ] Store acquired Spell cards in RunState
- [ ] Build combat deck from roster Creature cards + owned Spell cards
- [ ] Purchased spells affect future combat decks
- [ ] Add at least one non-shop Spell reward source
- [ ] Define duplicate Spell policy
- [ ] Preserve cards between days
- [ ] Display owned card collection during exploration
- [ ] Reuse same card art/content registry in combat and exploration
- [ ] Add acquisition tests

Do not add deck-building screens, rarity, crafting, upgrades or sideboards before the mixed-deck loop is validated.

---

## 0.7.6 Exploration Reward Choices

- [ ] Create reward-choice model
- [ ] Unit recruitment reward
- [ ] Spell-card reward
- [ ] Gold reward
- [ ] Exploration Mana reward
- [ ] Present 2 simple choices where appropriate
- [ ] Apply exactly one reward
- [ ] Prevent collecting both
- [ ] Add reward-choice tests

---

## 0.7.7 Exploration Visual Content

- [ ] Render Creature/unit artwork in roster
- [ ] Render unit artwork in Rally offers
- [ ] Render unit artwork in Shop recruit offers
- [ ] Render Spell artwork in Shop offers
- [ ] Render Spell artwork in rewards
- [ ] Render Spell artwork in owned collection
- [ ] Provide fallback assets
- [ ] Never bake dynamic stats into artwork
- [ ] Verify one asset key works across combat/exploration

---

## 0.7.8 Exploration Collection Review

- [ ] Does finding recruits feel valuable?
- [ ] Does reinforcing compete with gaining a new type?
- [ ] Are Spell rewards exciting without overwhelming player?
- [ ] Does Gold create interesting shop decisions?
- [ ] Are Rally locations different from Shops?
- [ ] Does exploration change next mixed combat deck?
- [ ] Is roster easy to understand?
- [ ] Is card collection easy to understand?
- [ ] Are there enough choices without menu overload?

---

# 0.8 Might and Magic

- [ ] Add Might stat
- [ ] Add Magic stat
- [ ] Display Might and Magic
- [ ] Add at least one way to gain Might during run
- [ ] Add at least one way to gain Magic during run
- [ ] Make Might influence combat
- [ ] Make Magic influence at least one gameplay outcome
- [ ] Add progression tests

---

# 0.9 Basic Events

- [ ] Add Event tile type
- [ ] Add event content definitions
- [ ] Add simple event modal
- [ ] Add one Might-oriented event
- [ ] Add one Magic-oriented event
- [ ] Add one Economy-oriented event
- [ ] Add at least one event rewarding recruits
- [ ] Add at least one event rewarding a Spell card
- [ ] Apply event results
- [ ] Add event tests

---

# 0.10 First Run Objective

- [ ] Define temporary final day
- [ ] Create stronger Duskborn boss / elite
- [ ] Add victory condition
- [ ] Add defeat condition
- [ ] Add basic run summary

---

# 0.11 Artifacts During a Run

- [ ] Create artifact content definition structure
- [ ] Add artifact IDs to RunState
- [ ] Add Traveler Boots
- [ ] Add Apprentice Crystal
- [ ] Add Captain Banner
- [ ] Add reusable effect handling where needed
- [ ] Add artifact reward choice
- [ ] Add artifact tests

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

---

# 0.13 XP After Run

- [ ] Calculate XP when a run ends
- [ ] Show XP in run summary
- [ ] Add XP to MetaState
- [ ] Detect level-up
- [ ] Add tests

---

# 0.14 Permanent Unlock Choice

- [ ] Create unlock definitions
- [ ] Offer unlock choice after appropriate level-up
- [ ] Unlock a starting artifact
- [ ] Unlock a loot item
- [ ] Prevent duplicate unlocks
- [ ] Add unlock tests

Later unlock categories may include new unit types and Spell cards.

---

# 0.15 Starting Artifact Selection

- [ ] Add pre-run loadout screen
- [ ] Display unlocked starting artifacts
- [ ] Allow one artifact selection
- [ ] Apply artifact when creating RunState
- [ ] Verify Traveler Boots changes daily actions
- [ ] Verify Apprentice Crystal changes starting Magic
- [ ] Verify Captain Banner changes starting Army or typed-roster equivalent
- [ ] Add tests

---

# 0.16 Persistent Save

- [ ] Implement SaveManager
- [ ] Save MetaState locally
- [ ] Restore MetaState at startup
- [ ] Handle missing save safely
- [ ] Add save version field
- [ ] Add save tests

---

# 0.17 Loot Pool Unlocks

- [ ] Create locked loot definition
- [ ] Filter loot pool using MetaState
- [ ] Keep locked loot unavailable
- [ ] Make unlocked loot eligible
- [ ] Support future Creature/Spell card unlocks without duplicated filtering rules
- [ ] Add tests

---

# 0.18 Prototype Review

Review only after the combat investment gate and exploration growth loop are playable.

- [ ] Is exploration interesting?
- [ ] Are 3 actions per day enough?
- [ ] Does End Day create tension?
- [ ] Is mandatory Duskborn combat enjoyable?
- [ ] Does per-turn squad positioning create meaningful choices?
- [ ] Does mixed Creature/Spell draw create meaningful choices?
- [ ] Does visible Spell hand improve anticipation/planning?
- [ ] Does Creature bench add agency rather than clutter?
- [ ] Does Might vs Magic create real build directions?
- [ ] Is Economy worth investing in?
- [ ] Are Shops useful without dominating exploration?
- [ ] Are Rally locations exciting?
- [ ] Does acquiring new Spell cards change decisions?
- [ ] Does recruiting/reinforcing units change decisions?
- [ ] Are card/unit images readable and easy to replace?
- [ ] Does combat look like a game rather than a debug prototype?
- [ ] Do artifacts change decisions?
- [ ] Does meta progression make another run attractive?
- [ ] Are runs too long?
- [ ] Is UI understandable without implementation terminology?

---

# Asset Production Reference

This section is the replacement contract for placeholder and production artwork.

## Card assets

```text
card frame: 768 x 1080 PNG, RGBA, transparent
card back: 768 x 1080 PNG
artwork master: 1024 x 1024 PNG, subject inside central 80%
Mana/type/status icons: 256 x 256 PNG transparent
```

Recommended paths:

```text
public/assets/cards/frames/creature-frame.png
public/assets/cards/frames/spell-frame.png
public/assets/cards/card-back.png
public/assets/cards/art/guardian.png
public/assets/cards/art/archer.png
public/assets/cards/art/firebolt.png
public/assets/cards/art/barrier.png
public/assets/cards/art/battle-cry.png
```

## Board assets

```text
unit portrait/token: 512 x 512 PNG transparent
hero portrait: 1024 x 1024 PNG
HUD icon: 256 x 256 PNG transparent
```

Recommended paths:

```text
public/assets/units/guardian.png
public/assets/units/archer.png
public/assets/units/duskborn-brute.png
public/assets/units/duskborn-archer.png
public/assets/ui/icons/
public/assets/ui/frames/
```

## UI panel assets

Prefer 9-slice-capable textures where practical.

```text
panel/button source: 512 x 256 or 512 x 512 PNG RGBA
keep corners/borders visually stable under scaling
```

## VFX assets

Prefer procedural Phaser particles/tweens first. When textures are useful:

```text
single effect texture: 256 x 256 or 512 x 512 PNG RGBA
spritesheet frame: 256 x 256 or 512 x 512
```

Never encode gameplay values into visual assets.

---

# Future Ideas — Not Yet Scheduled

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
Deck construction UI
Card rarity
Card upgrades
Faction recruitment
Shop rerolls
Procedural shop inventories
Equipment
Animated portraits
Full SFX/music production
```

Implement only when the validated core loop justifies them.
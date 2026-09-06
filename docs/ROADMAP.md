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

- [ ] Create a pure TypeScript logical 6x6 map model
- [x] Add tests for map dimensions
- [ ] Render the 6x6 map in Phaser
- [ ] Add a player logical position
- [ ] Render player position

Success condition:

> The player can see a grid and their position.

---

# 0.2 Movement

- [ ] Implement orthogonal movement rules in pure TypeScript
- [ ] Reject diagonal movement
- [ ] Reject out-of-bounds movement
- [ ] Add movement tests
- [ ] Connect map clicks to movement
- [ ] Visually update player position

Success condition:

> The player can click an adjacent tile and move exactly one tile.

---

# 0.3 Day and Actions

- [ ] Add current day to RunState
- [ ] Add daily action points to RunState
- [ ] Start each day with 3 base actions
- [ ] Make movement spend 1 action
- [ ] Prevent movement at 0 actions
- [ ] Display day in HUD
- [ ] Display remaining actions in HUD
- [ ] Add End Day button
- [ ] Add tests for action consumption

Success condition:

> Moving consumes actions and the player understands how many actions remain.

---

# 0.4 Basic Resources

- [ ] Add Gold to RunState
- [ ] Add Mana to RunState
- [ ] Add Army to RunState
- [ ] Display resources in HUD
- [ ] Add Gold tile
- [ ] Add Mana tile
- [ ] Add Army tile
- [ ] Collect resource when entering tile
- [ ] Remove or mark collected tile
- [ ] Add resource tests

Success condition:

> Exploration provides meaningful rewards.

---

# 0.5 End-of-Day Flow

- [ ] Create explicit exploration phase
- [ ] End Day transitions out of exploration
- [ ] Add end-of-day transition message
- [ ] Display "The Duskborn approaches."
- [ ] Introduce combat phase / CombatScene
- [ ] Prevent map actions during combat

Success condition:

> Every day clearly transitions into mandatory combat.

---

# 0.6 First Duskborn Combat

Keep the first combat intentionally simple.

- [ ] Create enemy content definition structure
- [ ] Create first Duskborn enemy
- [ ] Add simple enemy scaling by day
- [ ] Define simple player combat power
- [ ] Resolve basic combat
- [ ] Display combat result
- [ ] Victory continues run
- [ ] Defeat ends run
- [ ] Add combat tests

Success condition:

> The player must prepare during the day in order to survive the Duskborn.

---

# 0.7 New Day Loop

- [ ] On victory, increment day
- [ ] Restore daily action points
- [ ] Return to exploration
- [ ] Increase Duskborn strength
- [ ] Preserve run resources / stats
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

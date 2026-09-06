# ARCHITECTURE.md

## 1. Technical Direction

Recommended stack:

```text
Phaser
TypeScript
Vite
Vitest
ESLint
Prettier
Git
```

Keep the application client-only for the MVP.

Do not add:

- backend;
- database;
- Docker;
- React;
- Redux;
- ECS framework;
- online services;

unless a concrete need appears.

---

## 2. Core Principle

The most important architectural rule is:

> Game logic must be independent from Phaser whenever practical.

Phaser is responsible primarily for:

```text
Rendering
Input
Scenes
Animation
Audio
Transitions
```

Pure TypeScript should handle:

```text
Rules
State
Turns
Movement validation
Resources
Combat calculation
Progression
Unlocks
Map generation
```

---

## 3. Dependency Direction

Preferred:

```text
Phaser Scenes / UI
        ↓
Game Systems
        ↓
Game State / Models
        ↓
Content Data
```

Avoid:

```text
Game State
   ↓
Phaser Scene
```

Core game files should generally not import Phaser.

---

## 4. State Separation

Two major state lifetimes must remain separate.

### RunState

Exists only for the current run.

Possible model:

```ts
export interface RunState {
  day: number;
  actionPoints: number;

  resources: {
    gold: number;
    mana: number;
    army: number;
  };

  stats: {
    might: number;
    magic: number;
  };

  artifacts: string[];
  spells: string[];
}
```

The model will evolve.

A new run creates a fresh RunState.

---

### MetaState

Persists between runs.

Possible model:

```ts
export interface MetaState {
  experience: number;
  level: number;

  unlockedArtifacts: string[];
  unlockedLoot: string[];
  unlockedSpells: string[];

  startingArtifactSlots: number;
}
```

MetaState should not contain current map state, current Army, current Gold, current day, etc.

---

## 5. New Run Creation

A dedicated factory or service should eventually create a RunState from MetaState and selected starting options.

Conceptually:

```text
MetaState
+
Selected starting artifact
+
Base run configuration
↓
RunFactory
↓
New RunState
```

Example:

```text
Base action points: 3
Traveler Boots: +1
Final starting action points: 4
```

Do not hard-code artifact-specific logic in the scene.

---

## 6. Turn System

Turn / day logic should become a dedicated system.

Responsibilities may include:

- start a day;
- assign daily action points;
- consume actions;
- determine whether an action is allowed;
- end exploration phase;
- increment the day after successful combat.

Conceptual API:

```ts
startDay(runState);
canPerformAction(runState);
spendAction(runState, amount);
endDay(runState);
```

Do not over-engineer the API before implementation.

---

## 7. Movement System

Movement rules should be testable independently.

Initial rules:

- grid map;
- orthogonal movement;
- one tile per movement action;
- valid destination required;
- movement spends action points.

Later possibilities:

- movement bonuses;
- blocked tiles;
- terrain;
- teleportation;
- special movement artifacts.

Starting artifact modifiers should not require rewriting movement logic.

---

## 8. Map Model

The logical map should exist independently from rendering.

Possible concepts:

```ts
type Position = {
  x: number;
  y: number;
};

type TileType = 'empty' | 'gold' | 'mana' | 'army' | 'event';
```

Phaser renders this model.

The model itself should not contain Phaser sprites.

---

## 9. Content Definitions

Content should live separately from state.

Target direction:

```text
src/game/content/
  artifacts.ts
  enemies.ts
  events.ts
  loot.ts
  spells.ts
```

Example artifact:

```ts
export const artifacts = {
  traveler_boots: {
    id: 'traveler_boots',
    name: 'Traveler Boots',
    rarity: 'common',
    effects: [
      {
        type: 'modify_daily_actions',
        amount: 1,
      },
    ],
  },
};
```

RunState stores:

```ts
artifacts: ['traveler_boots'];
```

not a complete copy of the artifact definition.

---

## 10. Effect System Direction

Artifacts, spells, events, and upgrades will eventually need reusable effects.

Potential effect types:

```ts
type Effect =
  | {
      type: 'modify_stat';
      stat: 'might' | 'magic';
      amount: number;
    }
  | {
      type: 'modify_daily_actions';
      amount: number;
    }
  | {
      type: 'starting_resource';
      resource: 'gold' | 'mana' | 'army';
      amount: number;
    };
```

Important:

Do not build a large universal effect engine in the first milestone.

Add reusable effect handling only after duplication appears in real gameplay code.

---

## 11. Combat Architecture

Combat should not be implemented directly inside CombatScene.

Preferred:

```text
CombatScene
    ↓
CombatSystem
    ↓
CombatState / RunState / EnemyDefinition
```

The first implementation may be extremely simple.

Possible first version:

```text
Player combat power
vs
Enemy combat power
```

Later it can evolve toward:

- multiple turns;
- abilities;
- spells;
- targeting;
- units;
- status effects.

The UI should not constrain future combat evolution.

---

## 12. Enemy Content

Initial recurring enemy faction:

```text
Duskborn
```

Example content direction:

```ts
{
  id: "duskborn_scout",
  name: "Duskborn Scout",
  basePower: 5,
  scalingPerDay: 2
}
```

Threat scaling rules should belong to game logic rather than the rendering layer.

---

## 13. Progression System

Two distinct systems may exist later:

### Run Progression

Handles:

- Might increases;
- Magic increases;
- loot acquisition;
- artifacts;
- run upgrades.

### Meta Progression

Handles:

- XP;
- levels;
- permanent unlocks;
- starting artifact slots.

They should not be mixed into one giant progression class.

---

## 14. Save System

Initially, local browser storage is sufficient.

Possible storage:

```text
localStorage
```

Persist primarily:

- MetaState;
- settings.

Run save/resume is optional and can be added later.

Prefer storing IDs:

```json
{
  "unlockedArtifacts": ["traveler_boots", "apprentice_crystal"]
}
```

Do not persist duplicated content definitions.

---

## 15. Scene Direction

Initial scenes may become:

```text
BootScene
MenuScene
MapScene
CombatScene
RunSummaryScene
MetaProgressionScene
```

Do not create all scenes before they are needed.

Responsibilities:

### MapScene

Displays:

- map;
- HUD;
- movement;
- tile interactions;
- End Day.

### CombatScene

Displays:

- player combat information;
- enemy;
- combat actions / resolution;
- result.

### RunSummaryScene

Displays:

- run statistics;
- XP earned.

Scenes should coordinate UI and systems, not own every rule.

---

## 16. Testing Strategy

Use Vitest for pure TypeScript systems.

High-priority tests:

### Map

```text
correct dimensions
valid coordinates
tile access
```

### Movement

```text
orthogonal movement allowed
diagonal movement rejected
out-of-bounds movement rejected
movement spends action point
cannot move without action points
```

### Turns

```text
new day grants correct actions
artifact modifies daily actions
end day starts combat phase
successful combat increments day
```

### Meta progression

```text
XP added correctly
unlock added once
locked content excluded from loot pool
unlocked content eligible
```

### Save

```text
MetaState serializes
MetaState restores
unknown / old fields handled reasonably
```

---

## 17. Iterative Architecture Rule

Do not design for every future feature.

Instead:

```text
Build smallest correct version
↓
Observe duplication / friction
↓
Refactor only where useful
↓
Add next feature
```

The architecture should be evolvable, not speculative.

A small local refactor is acceptable when a new gameplay mechanic genuinely requires it.

Large rewrites should be rare and justified.

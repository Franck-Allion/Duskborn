# AGENTS.md

## Project Goal

Build a small, iterative, turn-based roguelite strategy game inspired by:

- Heroes of Might & Magic
- Slay the Spire
- Monster Train

The project must stay simple enough for a solo developer to understand, test, and evolve with the help of AI.

The core design feeling is:

> "One more day."

The player explores during the day, spends limited actions, gathers resources, improves their build, then must fight an enemy at the end of every day.

Runs restart from the beginning after defeat or victory, but persistent progression unlocks new strategic options for future runs.

---

## Mandatory Reading Before Coding

Before making changes, read:

1. `docs/GAME_DESIGN.md`
2. `docs/UI_SPEC.md`
3. `docs/ARCHITECTURE.md`
4. `docs/ROADMAP.md`

Then inspect the existing files related to the requested change.

Do not assume undocumented systems exist.

---

## Development Principles

- Keep changes small and incremental.
- Implement only what was requested.
- Do not implement future roadmap items unless explicitly asked.
- Do not rewrite unrelated files.
- Prefer extending existing systems over replacing them.
- Avoid speculative abstractions.
- Do not create complex systems before they are needed.
- Keep modules small and focused.
- Prefer clear code over clever code.
- Prefer composition and data-driven content over special cases.
- Avoid hidden global state.
- Follow best practices of AAA games

The game must remain playable after every milestone.

---

## Architecture Rules

- Use TypeScript.
- Use Phaser for rendering, input, scenes, animations, and audio.
- Core game rules must not depend directly on Phaser.
- Core logic should be testable without launching Phaser.
- Separate persistent progression from run progression.
- Content should be data-driven whenever practical.
- Saved games should store content IDs instead of full content definitions.
- Avoid putting large amounts of game logic directly inside Phaser scenes.

Bad:

```ts
class GameScene extends Phaser.Scene {
  // movement
  // combat
  // economy
  // progression
  // events
  // save system
}
```

Preferred:

```text
Phaser Scene
    ↓
Application / Game Systems
    ↓
Pure TypeScript State + Rules
```

---

## Expected Project Structure

The exact structure may evolve, but prefer this direction:

```text
src/
  game/
    core/
      GameState.ts
      RunState.ts
      MetaState.ts
      PlayerState.ts

    systems/
      TurnSystem.ts
      MovementSystem.ts
      ResourceSystem.ts
      CombatSystem.ts
      EventSystem.ts
      ProgressionSystem.ts

    map/
      GameMap.ts
      Tile.ts
      MapGenerator.ts

    combat/
      CombatState.ts

    content/
      artifacts.ts
      enemies.ts
      events.ts
      loot.ts
      spells.ts

  scenes/
    BootScene.ts
    MenuScene.ts
    MapScene.ts
    CombatScene.ts
    GameOverScene.ts

  ui/
    ResourceBar.ts
    ActionPanel.ts
    Tooltip.ts

  save/
    SaveManager.ts

tests/
docs/
```

Do not create every file immediately. Add modules only when they become necessary.

---

## Testing Rules

When changing pure game logic:

- add or update tests;
- run the test suite;
- run TypeScript validation;
- fix relevant failures before finishing.

Prefer testing:

- state transitions;
- movement rules;
- action point consumption;
- resource changes;
- day transitions;
- combat calculations;
- unlock logic;
- save/load transformations.

Do not prioritize automated visual tests during the MVP.

---

## Content Rules

Game content should progressively become data-driven.

Prefer:

```ts
{
  id: "traveler_boots",
  name: "Traveler Boots",
  effects: [
    {
      type: "modify_daily_actions",
      amount: 1
    }
  ]
}
```

over:

```ts
if (artifact === 'traveler_boots') {
  player.actionPoints += 1;
}
```

Do not create a universal effect engine before multiple gameplay systems actually need one.

---

## Save Compatibility

Persistent progression may survive many versions of the project.

Prefer saving identifiers:

```ts
unlockedArtifacts: ['traveler_boots'];
```

instead of saving complete artifact objects.

When changing persistent data structures, consider save compatibility.

During early MVP development, save migrations may remain simple.

---

## Git-Friendly Changes

Each requested task should ideally correspond to one small commit.

Examples:

```text
feat: add logical map
feat: add player movement
feat: add end day flow
feat: add duskborn combat
feat: add meta progression state
```

Avoid mixing:

- feature work;
- broad refactoring;
- formatting changes;
- unrelated cleanup.

---

## Before Implementing a Feature

Check:

1. Does the feature already fit the current architecture?
2. Can it be implemented without changing unrelated systems?
3. Does it require new persistent state?
4. Does it belong to the current run or meta progression?
5. Should it be data-driven?
6. Can its logic be tested independently from Phaser?

If a substantial architectural change is required, explain the smallest viable change before implementing it.

---

## After Coding

Always report:

1. what was implemented;
2. files created or modified;
3. tests added or modified;
4. validation commands run;
5. any architectural decision made;
6. any known limitation.
7. if needed, how to change the assets ans their requirements in terms of size (sprite, sfx, ...)
8. the commit message

Do not continue automatically to the next roadmap item.

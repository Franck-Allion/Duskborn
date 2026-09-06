# UI_SPEC.md

## 1. UI Goal

The MVP interface should be functional, readable, and inexpensive to build.

Art quality is not a priority yet.

Use:

- simple shapes;
- text labels;
- icons or emoji only if useful;
- clear panels;
- obvious interaction states.

The player must always understand:

- which day it is;
- how many actions remain;
- current resources;
- current Might / Magic;
- where the player is;
- what can be interacted with;
- what happens when the day ends.

---

## 2. Main Game Screen

Target layout:

```text
┌───────────────────────────────────────────────┐
│ DAY 4        ⚔ Army 18    🔮 Mana 9   🪙 35 │
│ Might 3      Magic 2        Actions ● ● ○    │
├───────────────────────────────────────────────┤
│                                               │
│             GAME MAP 6x6                      │
│                                               │
│       [ ] [G] [ ] [E] [ ] [ ]                 │
│       [M] [ ] [P] [ ] [G] [ ]                 │
│       [ ] [?] [A] [ ] [ ] [ ]                 │
│       [ ] [ ] [ ] [ ] [ ] [ ]                 │
│       [ ] [ ] [ ] [ ] [ ] [ ]                 │
│       [ ] [ ] [ ] [ ] [ ] [ ]                 │
│                                               │
├───────────────────────────────────────────────┤
│ Selected tile / contextual information        │
│                                               │
│                    [ END DAY ]                 │
└───────────────────────────────────────────────┘
```

Legend for prototype examples:

```text
P = Player
G = Gold
M = Mana
A = Army
? = Event
E = Special / future tile
```

---

## 3. Top HUD

Always visible during exploration.

Display:

```text
Current day
Army
Mana
Gold
Might
Magic
Remaining action points
```

The exact visual ordering can evolve.

Numbers must be easy to read without hovering.

---

## 4. Action Point Display

Initial base:

```text
3 action points per day
```

Display options:

```text
Actions: 3 / 3
```

or:

```text
Actions: ● ● ●
```

When an action is spent, update immediately.

Example:

```text
Actions: ● ● ○
```

Starting artifacts may later modify the daily action count.

Example:

```text
Traveler Boots
Base actions: 3
Artifact bonus: +1
Total: 4
```

The UI must not assume the maximum is always 3.

---

## 5. Map Interaction

For the MVP:

- clicking an adjacent valid tile moves the player;
- invalid movement should be visually rejected;
- valid target tiles may be highlighted;
- player position must be obvious;
- interaction feedback should be immediate.

Orthogonal movement only initially:

```text
up
down
left
right
```

No diagonal movement unless the design later changes.

---

## 6. Tile Feedback

A selected or hovered tile may show:

```text
Tile type
Expected reward
Action cost
Short description
```

Example:

```text
Mana Spring
Gain +3 Mana
Cost: 1 action
```

Do not build a complex tooltip system before necessary.

---

## 7. End Day Button

The player can end the day manually.

Button:

```text
END DAY
```

It should remain visible.

Possible later behavior:

- confirmation if actions remain;
- warnings;
- predicted enemy strength.

For the first MVP, keep the flow simple.

When pressed:

```text
Exploration phase ends
↓
Transition
↓
End-of-day combat begins
```

---

## 8. End-of-Day Transition

Suggested minimal presentation:

```text
DAY 4 ENDS

The Duskborn approaches.
```

Then transition to combat.

No complex cinematic is required.

---

## 9. Combat Screen

Initial simple layout:

```text
┌──────────────────────────────────────┐
│            DUSKBORN ATTACK           │
├──────────────────────────────────────┤
│ PLAYER                 ENEMY         │
│                                      │
│ Army: 18               Power: 15     │
│ Might: 3               HP: ...       │
│ Magic: 2                             │
│ Mana: 9                              │
│                                      │
├──────────────────────────────────────┤
│ Combat log / actions                 │
│                                      │
│       [ ATTACK / RESOLVE ]           │
└──────────────────────────────────────┘
```

Exact combat UI depends on the combat system selected later.

The MVP may initially use automatic or semi-automatic resolution.

---

## 10. Combat Result Screen

Victory example:

```text
VICTORY

Duskborn defeated.

Rewards:
+10 Gold
+1 Might

[ CONTINUE TO DAY 5 ]
```

Defeat example:

```text
DEFEAT

You survived 6 days.

XP earned: 120

[ RUN SUMMARY ]
```

---

## 11. Run Summary Screen

When a run ends, display:

```text
Days survived
Enemies defeated
Final Might
Final Magic
Final Army
Artifacts collected
XP earned
```

Later, include:

- score;
- boss progress;
- difficulty;
- achievements.

---

## 12. Meta Progression Screen

Initial target:

```text
LEVEL UP

Choose one unlock:

[ Traveler Boots ]
Starting artifact
+1 action point each day

[ Apprentice Crystal ]
Starting artifact
+1 starting Magic

[ Thunder Hammer ]
Loot unlock
Can now appear during runs
```

The player chooses one unlock when appropriate.

Unlock rules can evolve later.

---

## 13. Starting Loadout Screen

Before starting a run:

```text
CHOOSE YOUR STARTING ARTIFACT

[ Traveler Boots ]
+1 daily action

[ Apprentice Crystal ]
+1 starting Magic

[ Captain Banner ]
+3 starting Army

[ START RUN ]
```

Only unlocked artifacts should be selectable.

Initial artifact slots:

```text
1
```

---

## 14. UI Architecture Principle

UI should display game state.

UI should not own important game rules.

Example:

Bad:

```text
Button decides how many action points the player has.
```

Good:

```text
TurnSystem determines available actions.
UI displays the value.
```

Likewise:

```text
CombatSystem decides combat results.
CombatScene presents them.
```

This separation is important for testing and future iteration.

---

## 15. MVP Visual Style

For the first iterations:

- rectangles;
- flat backgrounds;
- readable typography;
- simple icons;
- no custom animation required;
- no polished asset pipeline required.

The goal is to validate interaction and game feel.

Art direction can be defined later without changing core logic.

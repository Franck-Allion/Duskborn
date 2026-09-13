# Card Presentation Asset Specifications & Contract

Duskborn uses a reusable, premium, high-DPI card-rendering system. This document serves as the official visual and technical contract for designers and developers when producing, exporting, or replacing visual card assets in the repository.

---

## 1. Master Frame Specifications

Every card frame (front and back) must adhere to a fixed production portrait aspect ratio.

* **Source Dimensions:** `768 × 1080 px`
* **Aspect Ratio:** `32:45` (width / height ≈ `0.711111`)
* **Format:** `32-bit PNG (with transparency where appropriate)`
* **Color Profile:** `sRGB`
* **Design Rule:** No gameplay text, Mana costs, names, level badges, or stats should be baked directly into the PNG asset. All gameplay text is dynamically rendered via Phaser high-DPI text overlays to support future language localization.

| Asset Asset Key | Filename / Path | Transparent Exterior | Usage |
| :--- | :--- | :---: | :--- |
| `card-frame-spell` | `public/assets/cards/frames/card-frame-spell.png` | Yes | Spell Card Front Frame |
| `card-frame-creature` | `public/assets/cards/frames/card-frame-creature.png` | Yes | Creature Card Front Frame |
| `card-back-player` | `public/assets/cards/card-back-player.png` | No | Player's Deck Card Back |
| `card-back-enemy` | `public/assets/cards/card-back-enemy.png` | No | Opponent's Deck Card Back |

---

## 2. Card Artwork Specifications

All unit and spell illustrations use a unified square source format. The card-rendering system automatically crops, scales, and masks the artwork into the card's visual window.

* **Source Dimensions:** `1024 × 1024 px` (Square)
* **Format:** `24-bit RGB or 32-bit RGBA PNG`
* **Safe Composition Area:** Keep all critical visual subjects (e.g., character faces, weapons, glowing magical focus) within the central **80% circle/box** of the square canvas. Avoid placing important details in the outer **10% edges** as they may be cropped out by the art frame's geometry mask.

### Target Art Window (inside 768×1080 coordinates):
* **x:** `96 px` (Offset from left edge)
* **y:** `150 px` (Offset from top edge)
* **width:** `576 px`
* **height:** `470 px`
* **Aspect Ratio:** `~1.225` (Landscape art window)

### Artwork Naming Mapping:

| Content ID | Content Type | Authoritative Asset Path |
| :--- | :--- | :--- |
| `guardian` | Player Creature | `public/assets/cards/art/creatures/guardian.png` |
| `archer` | Player Creature | `public/assets/cards/art/creatures/archer.png` |
| `duskborn-brute` | Enemy Creature | `public/assets/cards/art/creatures/duskborn-brute.png` |
| `duskborn-archer` | Enemy Creature | `public/assets/cards/art/creatures/duskborn-archer.png` |
| `firebolt` | Player Spell | `public/assets/cards/art/spells/firebolt.png` |
| `barrier` | Player Spell | `public/assets/cards/art/spells/barrier.png` |
| `battle-cry` | Player Spell | `public/assets/cards/art/spells/battle-cry.png` |
| `dusk-strike` | Enemy Spell | `public/assets/cards/art/spells/dusk-strike.png` |
| `dark-ward` | Enemy Spell | `public/assets/cards/art/spells/dark-ward.png` |

---

## 3. Fallback & Replaceability Rules

The card engine implements a **Zero-Asset-Blocker** rule:
* If a PNG file is not preloaded or does not exist in the Phaser texture registry, the rendering engine automatically generates a procedurally designed vector card with high-end dark fantasy gradients, matching color language (arcane blue/violet for spells, warm metallic/leather for creatures), and custom badges.
* Adding the correctly named PNG file to the asset folder and preloading it will immediately and automatically replace the procedural visual fallback with the premium PNG asset **without requiring any layout or code changes**.

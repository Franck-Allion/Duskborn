import Phaser from 'phaser';
import type { CombatState } from '../game/combat/CombatState';
import { SPELL_REGISTRY } from '../game/content/spells';
import { isSpellCardPlayable } from './spellHandPresentation';

/** Presentation instances follow hand order, including repeated spell IDs. */
export class SpellHandView {
  private visuals: Phaser.GameObjects.GameObject[] = [];
  private page = 0;

  constructor(
    private scene: Phaser.Scene,
    private play: (spellId: string) => void,
  ) {
    scene.input.on('gameout', this.resetHover, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.off('gameout', this.resetHover, this);
    });
  }

  private resetHover(): void {
    for (const visual of this.visuals) {
      if (visual instanceof Phaser.GameObjects.Container) {
        visual.setScale(1).setDepth(10 + (visual.getData('handIndex') % 3));
      }
    }
  }

  clear(): void {
    this.visuals.forEach((visual) => visual.destroy());
    this.visuals = [];
  }

  render(state: CombatState): void {
    this.clear();
    if (state.activeSide !== 'player' || state.phase !== 'ACTION') return;
    const hand = state.playerDeck.hand;
    const pages = Math.max(1, Math.ceil(hand.length / 3));
    this.page = Math.min(this.page, pages - 1);
    if (!hand.length) {
      this.visuals.push(this.label(604, 360, 'No spells in hand', 12));
      return;
    }
    const visible = hand.slice(this.page * 3, this.page * 3 + 3);
    visible.forEach((id, index) => {
      const spell = SPELL_REGISTRY.get(id);
      const playable = isSpellCardPlayable(state, id);
      const x = 634 + index * 116;
      const card = this.scene.add.container(x, 453).setDepth(10 + index);
      card.setData('spellId', id);
      card.setData('handIndex', this.page * 3 + index);
      const bg = this.scene.add
        .rectangle(0, -60, 100, 120, playable ? 0x1e3a5f : 0x263244)
        .setStrokeStyle(2, playable ? 0x60a5fa : 0x64748b);
      const art = this.scene.add
        .rectangle(0, -81, 88, 30, 0x111827)
        .setStrokeStyle(1, 0x475569);
      card.add([
        bg,
        art,
        this.label(-44, -115, `${spell?.manaCost ?? '?'} Mana`, 10),
      ]);
      if (spell?.imageKey && this.scene.textures.exists(spell.imageKey)) {
        const image = this.scene.add.image(0, -81, spell.imageKey);
        image.setScale(Math.min(88 / image.width, 30 / image.height));
        card.add(image);
      } else {
        // Simple replaceable art placeholder, not baked gameplay information.
        card.add(
          this.scene.add
            .rectangle(0, -81, 17, 17, 0x334155)
            .setStrokeStyle(2, 0x93c5fd)
            .setAngle(45),
        );
      }
      card.add(this.label(-44, -60, spell?.name ?? id, 11));
      card.add(this.label(-44, -37, spell?.description ?? 'Unknown spell', 10));
      card.setAlpha(playable ? 1 : 0.4);
      if (playable) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => {
          card.setScale(1.2).setDepth(30);
        });
        bg.on('pointerout', () => card.setScale(1).setDepth(10 + index));
        bg.on('pointerdown', () => {
          if (isSpellCardPlayable(state, id)) this.play(id);
        });
      }
      this.visuals.push(card);
    });
    if (pages > 1) {
      const next = this.label(
        584,
        470,
        `${this.page + 1}/${pages} Next cards`,
        10,
        110,
      );
      next.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        if (state.activeSide !== 'player' || state.phase !== 'ACTION') return;
        this.page = (this.page + 1) % pages;
        this.render(state);
      });
      this.visuals.push(next);
    }
  }

  private label(
    x: number,
    y: number,
    text: string,
    size: number,
    width = 88,
  ): Phaser.GameObjects.Text {
    return this.scene.add
      .text(x, y, text, {
        fontFamily: 'monospace',
        fontSize: `${size}px`,
        color: '#e2e8f0',
        wordWrap: { width },
      })
      .setResolution(Math.max(1, Math.ceil(this.scene.cameras.main.zoom)));
  }
}

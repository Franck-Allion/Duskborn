import Phaser from 'phaser';
import type { CombatState } from '../game/combat/CombatState';
import { SPELL_REGISTRY } from '../game/content/spells';
import { SpellCardView } from './cards/SpellCardView';
import { type CardVisualState } from './cards/CardView';
import { calculateHandLayout } from './cards/CardLayout';
import { isSpellCardPlayable } from './spellHandPresentation';

/**
 * Reusable premium Phaser 4 component representing the player's fanned Spell hand.
 * Manages rendering, interaction states, and smooth reflow animations.
 */
export class CombatHandView {
  private cardViews = new Map<string, SpellCardView>();
  private backgroundTray: Phaser.GameObjects.Graphics | null = null;
  private visible = true;
  private currentState: CombatState | null = null;

  constructor(
    private scene: Phaser.Scene,
    private play: (spellId: string) => void,
  ) {
    this.createBackgroundTray();
  }

  private createBackgroundTray(): void {
    // Beautiful curved/elliptical backdrop tray representing safe layout envelope x: ~265-695, y: ~395-540
    this.backgroundTray = this.scene.add.graphics();
    this.backgroundTray.fillStyle(0x0a0f1d, 0.45); // semi-transparent slate
    this.backgroundTray.lineStyle(1.5, 0x1e293b, 0.65);
    this.backgroundTray.fillEllipse(480, 520, 420, 160);
    this.backgroundTray.strokeEllipse(480, 520, 420, 160);
    this.backgroundTray.setDepth(35); // UI TRAY DEPTH
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.backgroundTray?.setVisible(visible);
    this.cardViews.forEach((view) => {
      view.setVisible(visible);
    });
  }

  public render(state: CombatState): void {
    this.refresh(state);
  }

  public refresh(state: CombatState): void {
    this.currentState = state;

    if (!this.visible) {
      this.setVisible(false);
      return;
    }

    const spellsInHand = state.playerCombatDeck?.spellHand ?? [];
    const isPlayerTurn = state.activeSide === 'player';
    const phase = state.phase;

    // Show hand only if not enemy turn, or dim/lock it
    const shouldDimHand = !isPlayerTurn;
    const isInteractive = isPlayerTurn && phase === 'ACTION';

    // 1. Reconcile and clean up removed cards
    const currentInstanceIds = new Set(spellsInHand.map((c) => c.instanceId));
    this.cardViews.forEach((view, instanceId) => {
      if (!currentInstanceIds.has(instanceId)) {
        // Play removal tween (brief scale-up, lift, fade out, then destroy)
        this.scene.tweens.add({
          targets: view,
          scaleX: 1.15,
          scaleY: 1.15,
          y: view.y - 25,
          alpha: 0,
          duration: 180,
          ease: 'Quad.Out',
          onComplete: () => {
            view.destroy();
          },
        });
        this.cardViews.delete(instanceId);
      }
    });

    if (spellsInHand.length === 0) {
      this.backgroundTray?.setVisible(true);
      return;
    }

    this.backgroundTray?.setVisible(true);

    // 2. Calculate transforms for fanning
    // Safe tray coordinates: x: 265 to 695 (width 430), centerY around 474-485, y bottom edge ~535
    const transforms = calculateHandLayout(
      spellsInHand.length,
      480,    // centerX
      474,    // baseY
      430,    // availableWidth
      false,  // isBench
    );

    spellsInHand.forEach((spellCard, index) => {
      const transform = transforms[index];
      const spellDef = SPELL_REGISTRY.get(spellCard.spellId);
      const playable = isSpellCardPlayable(state, spellCard.spellId);

      let view = this.cardViews.get(spellCard.instanceId);
      const isNew = !view;

      if (!view) {
        // Create new SpellCardView starting slightly below with alpha 0 and scale 0.9 (card entry tween)
        view = new SpellCardView(this.scene, transform.x, transform.y + 35, {
          instanceId: spellCard.instanceId,
          contentId: spellCard.spellId,
          name: spellDef?.name ?? spellCard.spellId,
          description: spellDef?.description ?? 'Unknown spell',
          manaCost: spellDef?.manaCost ?? 0,
        });
        view.setAlpha(0);
        view.setScale(0.9);
        this.cardViews.set(spellCard.instanceId, view);

        // Bind play trigger interaction dynamically to prevent stale state closures
        view.on('pointerdown', () => {
          const current = this.currentState;
          if (current) {
            const isCurrentPlayerTurn = current.activeSide === 'player';
            const isCurrentInteractive = isCurrentPlayerTurn && current.phase === 'ACTION';
            if (isCurrentInteractive && isSpellCardPlayable(current, spellCard.spellId)) {
              this.play(spellCard.spellId);
            }
          }
        });
      }

      // Determine visual state
      let targetVisualState: CardVisualState = 'IDLE';
      if (shouldDimHand) {
        targetVisualState = 'DISABLED';
      } else if (!isInteractive || !playable) {
        targetVisualState = 'DISABLED';
      } else if (playable) {
        targetVisualState = 'PLAYABLE';
      }

      view.setVisualState(targetVisualState);
      view.setDepth(transform.depth);

      // Stop any active movement tween first to avoid stacked tweens on pointer moves
      this.scene.tweens.killTweensOf(view);

      // Tween to the fanned transform (duration 180-260ms, ease Cubic.Out)
      this.scene.tweens.add({
        targets: view,
        x: transform.x,
        y: transform.y,
        angle: transform.rotation * (180 / Math.PI), // convert to degrees
        scaleX: transform.scale,
        scaleY: transform.scale,
        alpha: shouldDimHand ? 0.45 : 1.0,
        duration: isNew ? 220 : 200,
        ease: 'Cubic.Out',
        onUpdate: () => {
          view?.updateMaskGeometry();
        },
      });

      // Special hover interaction overlay lift:
      // Hover raises Y position, sets rotation 0, highest depth, art parallax
      if (isInteractive && playable) {
        // Re-enable interactivity
        view.setInteractive();

        view.removeAllListeners('pointerover');
        view.removeAllListeners('pointerout');

        const originalDepth = transform.depth;

        view.on('pointerover', () => {
          this.scene.tweens.killTweensOf(view!);
          view!.setVisualState('HOVER');
          view!.setDepth(80); // highest CARD_HOVER depth

          this.scene.tweens.add({
            targets: view,
            y: transform.y - 32, // Lift card up
            angle: 0,            // Straighten card
            scaleX: 1.22,        // Scale up
            scaleY: 1.22,
            duration: 130,
            ease: 'Cubic.Out',
            onUpdate: () => {
              view?.updateMaskGeometry();
            },
          });
        });

        view.on('pointerout', () => {
          this.scene.tweens.killTweensOf(view!);
          view!.setVisualState('PLAYABLE');
          view!.setDepth(originalDepth);

          this.scene.tweens.add({
            targets: view,
            x: transform.x,
            y: transform.y,
            angle: transform.rotation * (180 / Math.PI),
            scaleX: transform.scale,
            scaleY: transform.scale,
            duration: 160,
            ease: 'Cubic.Out',
            onUpdate: () => {
              view?.updateMaskGeometry();
            },
          });
        });
      } else {
        // Lock/disable interactivity
        view.disableInteractive();
      }
    });
  }

  public destroy(): void {
    this.backgroundTray?.destroy();
    this.cardViews.forEach((view) => view.destroy());
    this.cardViews.clear();
  }
}

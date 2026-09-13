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
  private hoveredCardId: string | null = null;

  constructor(
    private scene: Phaser.Scene,
    private play: (spellId: string) => void,
  ) {
    this.createBackgroundTray();
    this.setupCentralHoverArbitration();
  }

  private createBackgroundTray(): void {
    // Beautiful curved/elliptical backdrop tray representing safe layout envelope x: ~340-820, y: ~395-540
    this.backgroundTray = this.scene.add.graphics();
    this.backgroundTray.fillStyle(0x0a0f1d, 0.45); // semi-transparent slate
    this.backgroundTray.lineStyle(1.5, 0x1e293b, 0.65);
    this.backgroundTray.fillEllipse(580, 520, 360, 160); // Offset rightward slightly to fit nicely next to bench
    this.backgroundTray.strokeEllipse(580, 520, 360, 160);
    this.backgroundTray.setDepth(35); // UI TRAY DEPTH
  }

  private setupCentralHoverArbitration(): void {
    // Bind centralized hover arbitration and click handlers to input to avoid independent over/out races
    this.scene.input.on('pointermove', this.handlePointerMove, this);
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.visible || !this.currentState) return;

    const spellsInHand = this.currentState.playerCombatDeck?.spellHand ?? [];
    let candidateId: string | null = null;

    // Iterate cards in reverse (topmost depth / frontmost first) to resolve overlap priority
    for (let i = spellsInHand.length - 1; i >= 0; i--) {
      const spellCard = spellsInHand[i];
      const view = this.cardViews.get(spellCard.instanceId);
      if (view && view.containsWorldPoint(pointer.worldX, pointer.worldY)) {
        // Only hover if active and playable
        const isPlayerTurn = this.currentState.activeSide === 'player';
        const isInteractive = isPlayerTurn && this.currentState.phase === 'ACTION';
        const playable = isSpellCardPlayable(this.currentState, spellCard.spellId);
        
        if (isInteractive && playable) {
          candidateId = spellCard.instanceId;
          break;
        }
      }
    }

    if (candidateId !== this.hoveredCardId) {
      // Exit hover for the previously focused card
      if (this.hoveredCardId) {
        const oldView = this.cardViews.get(this.hoveredCardId);
        if (oldView) {
          this.playHoverExit(oldView);
        }
      }

      // Enter hover for the newly focused card
      if (candidateId) {
        const newView = this.cardViews.get(candidateId);
        if (newView) {
          this.playHoverEnter(newView);
        }
      }

      this.hoveredCardId = candidateId;
    }
  }

  private handlePointerDown(): void {
    if (!this.visible || !this.currentState) return;

    // Click targets the currently resolved hovered card exclusively
    if (this.hoveredCardId) {
      const view = this.cardViews.get(this.hoveredCardId);
      if (view && view.getVisualState() !== 'DISABLED') {
        const isPlayerTurn = this.currentState.activeSide === 'player';
        const isInteractive = isPlayerTurn && this.currentState.phase === 'ACTION';
        if (isInteractive && isSpellCardPlayable(this.currentState, view.config.contentId)) {
          this.play(view.config.contentId);
        }
      }
    }
  }

  private playHoverEnter(view: SpellCardView): void {
    this.scene.tweens.killTweensOf(view);
    view.setVisualState('HOVER');
    view.setDepth(80); // Bring to frontmost depth

    this.scene.tweens.add({
      targets: view,
      y: view.restY - 40,  // Lift up cleanly into safe gap
      angle: 0,            // Straighten rotation
      scaleX: 1.15,        // Moderate scaling (between 1.12-1.16)
      scaleY: 1.15,
      duration: 120,
      ease: 'Cubic.Out',
      onUpdate: () => {
        view.updateMaskGeometry();
      },
    });
  }

  private playHoverExit(view: SpellCardView): void {
    this.scene.tweens.killTweensOf(view);

    const isPlayerTurn = this.currentState?.activeSide === 'player';
    const isInteractive = isPlayerTurn && this.currentState?.phase === 'ACTION';
    const playable = this.currentState ? isSpellCardPlayable(this.currentState, view.config.contentId) : false;

    let targetVisualState: CardVisualState = 'IDLE';
    if (!isPlayerTurn || !isInteractive || !playable) {
      targetVisualState = 'DISABLED';
    } else if (playable) {
      targetVisualState = 'PLAYABLE';
    }

    view.setVisualState(targetVisualState);
    view.setDepth(view.restX); // Depth corresponds to x coordinate ordering

    this.scene.tweens.add({
      targets: view,
      x: view.restX,
      y: view.restY,
      angle: view.restRotation * (180 / Math.PI),
      scaleX: view.restScale,
      scaleY: view.restScale,
      duration: 150,
      ease: 'Cubic.Out',
      onUpdate: () => {
        view.updateMaskGeometry();
      },
    });
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.backgroundTray?.setVisible(visible);
    this.cardViews.forEach((view) => {
      view.setVisible(visible);
    });

    if (!visible && this.hoveredCardId) {
      const oldView = this.cardViews.get(this.hoveredCardId);
      if (oldView) this.playHoverExit(oldView);
      this.hoveredCardId = null;
    }
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
        
        if (this.hoveredCardId === instanceId) {
          this.hoveredCardId = null;
        }
        this.cardViews.delete(instanceId);
      }
    });

    if (spellsInHand.length === 0) {
      this.backgroundTray?.setVisible(true);
      return;
    }

    this.backgroundTray?.setVisible(true);

    // 2. Calculate transforms for fanning
    // Sized larger Spell hand coordinates: x: 340 to 820 (width 480), centerY around 475, y bottom edge ~570
    const transforms = calculateHandLayout(
      spellsInHand.length,
      580,    // centerX
      475,    // baseY
      440,    // availableWidth
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
      }

      // Track explicit rest transform
      view.setRestTransform(transform.x, transform.y, transform.rotation, transform.scale);

      // Disable default interactive mouse-events on CardView itself to avoid races
      view.disableInteractive();

      // If we are currently hovering this card, keep its hovered presentation
      if (this.hoveredCardId === spellCard.instanceId) {
        view.setVisualState('HOVER');
        view.setDepth(80);
      } else {
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
      }
    });
  }

  public destroy(): void {
    // Unbind centralized hover arbitration and click handlers cleanly on destruction
    this.scene.input.off('pointermove', this.handlePointerMove, this);
    this.scene.input.off('pointerdown', this.handlePointerDown, this);

    this.backgroundTray?.destroy();
    this.cardViews.forEach((view) => view.destroy());
    this.cardViews.clear();
    this.hoveredCardId = null;
  }
}

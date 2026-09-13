import Phaser from 'phaser';
import type { CombatState } from '../game/combat/CombatState';
import type { RunState } from '../game/core/RunState';
import { UNIT_REGISTRY } from '../game/content/unitTypes';
import { CreatureCardView } from './cards/CreatureCardView';
import { type CardVisualState } from './cards/CardView';
import { calculateHandLayout } from './cards/CardLayout';

/**
 * Reusable premium Phaser 4 component representing the player's Creature bench.
 * Positions bench cards on the lower-left tray and manages selection & deployed state.
 */
export class CreatureBenchView {
  private cardViews = new Map<string, CreatureCardView>();
  private backgroundTray: Phaser.GameObjects.Graphics | null = null;
  private visible = true;
  private currentState: CombatState | null = null;
  private hoveredCardId: string | null = null;

  constructor(
    private scene: Phaser.Scene,
    private onSelect: (squadIndex: number | null) => void,
    private selectedSquadIndex: number | null = null,
  ) {
    this.createBackgroundTray();
    this.setupCentralHoverArbitration();
  }

  private createBackgroundTray(): void {
    // Beautiful rectangular plate backdrop tray representing safe layout envelope x: ~20-330 (wider), y: ~405-535
    this.backgroundTray = this.scene.add.graphics();
    this.backgroundTray.fillStyle(0x0a0f1d, 0.45); // semi-transparent slate
    this.backgroundTray.lineStyle(1.5, 0x1e293b, 0.65);
    this.backgroundTray.fillRoundedRect(20, 410, 310, 120, 8); // Extended width to 310 to prevent cramped cards
    this.backgroundTray.strokeRoundedRect(20, 410, 310, 120, 8);
    this.backgroundTray.setDepth(35); // UI TRAY DEPTH
  }

  private setupCentralHoverArbitration(): void {
    // Bind centralized hover arbitration and click handlers to input to avoid independent over/out races
    this.scene.input.on('pointermove', this.handlePointerMove, this);
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.visible || !this.currentState) return;

    const creaturesInBench = (this.currentState.playerCombatDeck?.creatureBench ?? []).filter((card) => {
      const squad = this.currentState!.playerSquads.find((s) => s.unitTypeId === card.unitTypeId);
      return squad ? squad.count > 0 && squad.position === null : true;
    });

    let candidateId: string | null = null;

    // Iterate cards in reverse (topmost depth / frontmost first) to resolve overlap priority
    for (let i = creaturesInBench.length - 1; i >= 0; i--) {
      const creatureCard = creaturesInBench[i];
      const view = this.cardViews.get(creatureCard.instanceId);
      if (view && view.containsWorldPoint(pointer.worldX, pointer.worldY)) {
        const isPlayerTurn = this.currentState.activeSide === 'player';
        const isInteractive = isPlayerTurn && this.currentState.phase === 'DEPLOYMENT';
        
        if (isInteractive) {
          candidateId = creatureCard.instanceId;
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
        const isInteractive = isPlayerTurn && this.currentState.phase === 'DEPLOYMENT';
        if (isInteractive) {
          const currentSquadIndex = this.currentState.playerSquads.findIndex((s) => s.unitTypeId === view.config.contentId);
          if (currentSquadIndex !== -1) {
            if (this.selectedSquadIndex === currentSquadIndex) {
              this.onSelect(null); // deselect
            } else {
              this.onSelect(currentSquadIndex); // select
            }
          }
        }
      }
    }
  }

  private playHoverEnter(view: CreatureCardView): void {
    this.scene.tweens.killTweensOf(view);
    view.setVisualState('HOVER');
    view.setDepth(80); // Bring to frontmost depth

    this.scene.tweens.add({
      targets: view,
      y: view.restY - 26,  // Lift up cleanly into safe gap
      angle: 0,            // Straighten rotation
      scaleX: 1.12,        // Moderate scaling (between 1.12-1.16)
      scaleY: 1.12,
      duration: 120,
      ease: 'Cubic.Out',
      onUpdate: () => {
        view.updateMaskGeometry();
      },
    });
  }

  private playHoverExit(view: CreatureCardView): void {
    this.scene.tweens.killTweensOf(view);

    const isPlayerTurn = this.currentState?.activeSide === 'player';
    const isInteractive = isPlayerTurn && this.currentState?.phase === 'DEPLOYMENT';
    
    const squadIndex = this.currentState ? this.currentState.playerSquads.findIndex((s) => s.unitTypeId === view.config.contentId) : -1;
    const isSelected = this.selectedSquadIndex === squadIndex;

    let targetVisualState: CardVisualState = 'IDLE';
    if (!isPlayerTurn) {
      targetVisualState = 'DISABLED';
    } else if (isSelected) {
      targetVisualState = 'SELECTED';
    } else if (isInteractive) {
      targetVisualState = 'PLAYABLE';
    }

    view.setVisualState(targetVisualState);
    view.setDepth(isSelected ? 90 : view.restX); // Selected stays highest, rest ordered by position

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

  public setSelectedSquadIndex(index: number | null): void {
    this.selectedSquadIndex = index;
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.backgroundTray?.setVisible(visible);
    this.cardViews.forEach((view) => view.setVisible(visible));

    if (!visible && this.hoveredCardId) {
      const oldView = this.cardViews.get(this.hoveredCardId);
      if (oldView) this.playHoverExit(oldView);
      this.hoveredCardId = null;
    }
  }

  public render(state: CombatState, runState: RunState | null = null): void {
    this.refresh(state, runState);
  }

  public refresh(state: CombatState, runState: RunState | null = null): void {
    this.currentState = state;

    if (!this.visible) {
      this.setVisible(false);
      return;
    }

    // Hide deployed Creature cards from the visual bench to resolve board duplication.
    // Filter the creature bench so that we only display available creatures whose corresponding
    // living squad has position === null (undeployed).
    const creaturesInBench = (state.playerCombatDeck?.creatureBench ?? []).filter((card) => {
      const squad = state.playerSquads.find((s) => s.unitTypeId === card.unitTypeId);
      return squad ? squad.count > 0 && squad.position === null : true;
    });

    const isPlayerTurn = state.activeSide === 'player';
    const phase = state.phase;

    const shouldDimBench = !isPlayerTurn;
    const isInteractive = isPlayerTurn && phase === 'DEPLOYMENT';

    // 1. Reconcile and clean up removed cards (e.g. when card is deployed on grid)
    const currentInstanceIds = new Set(creaturesInBench.map((c) => c.instanceId));
    this.cardViews.forEach((view, instanceId) => {
      if (!currentInstanceIds.has(instanceId)) {
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

    if (creaturesInBench.length === 0) {
      this.backgroundTray?.setVisible(true);
      return;
    }

    this.backgroundTray?.setVisible(true);

    // 2. Calculate transforms for bench (fanned slightly at bottom left)
    // Safe bench coordinates: x: 20 to 330 (width 310), centerY around 465, y bottom edge ~535
    const transforms = calculateHandLayout(
      creaturesInBench.length,
      175,    // centerX of bench tray (310 / 2 + 20 = 175)
      465,    // baseY of bench tray
      290,    // availableWidth
      true,   // isBench = true (smaller width 104 after card resizing)
    );

    creaturesInBench.forEach((creatureCard, index) => {
      const transform = transforms[index];
      const unitDef = UNIT_REGISTRY.get(creatureCard.unitTypeId);
      
      // Look up squad status in CombatState
      const squadIndex = state.playerSquads.findIndex((s) => s.unitTypeId === creatureCard.unitTypeId);
      const squad = squadIndex !== -1 ? state.playerSquads[squadIndex] : null;
      
      const isDeployed = squad ? squad.position !== null : false;
      const count = squad ? squad.count : 1;
      const isSelected = this.selectedSquadIndex === squadIndex;

      // Resolve combat stats from authoritative domain/content
      const attack = unitDef?.baseDamage ?? 0;
      const maxHp = unitDef?.hpPerUnit ?? 0;
      const currentHp = squad?.damagedUnitHp ?? maxHp;
      const level = runState?.unitTypeProgression?.[creatureCard.unitTypeId]?.level ?? 1;

      // Cleaned description text showing active abilities instead of redundant deployment statuses
      const abilitiesList = unitDef
        ? unitDef.abilities
            .map((a) =>
              a
                .split('-')
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ')
            )
            .join('\n')
        : '';

      let view = this.cardViews.get(creatureCard.instanceId);
      const isNew = !view;

      if (!view) {
        // Create new CreatureCardView starting slightly below with alpha 0 and scale 0.9 (card entry tween)
        view = new CreatureCardView(this.scene, transform.x, transform.y + 35, {
          instanceId: creatureCard.instanceId,
          contentId: creatureCard.unitTypeId,
          name: unitDef?.name ?? creatureCard.unitTypeId,
          description: abilitiesList,
          count,
          attack,
          currentHp,
          maxHp,
          level,
          isDeployed,
        });
        view.setAlpha(0);
        view.setScale(0.9);
        this.cardViews.set(creatureCard.instanceId, view);
      } else {
        // Correctly update dynamic count text, rules description, and deployed status of existing CardViews on reflow
        view.updateDynamicContent({
          count,
          description: abilitiesList,
          isDeployed,
          attack,
          currentHp,
          maxHp,
          level,
        });
      }

      // Track explicit rest transform
      view.setRestTransform(transform.x, transform.y, transform.rotation, transform.scale);

      // Disable default interactive mouse-events on CardView itself to avoid races
      view.disableInteractive();

      // If we are currently hovering this card, keep its hovered presentation
      if (this.hoveredCardId === creatureCard.instanceId) {
        view.setVisualState('HOVER');
        view.setDepth(80);
      } else {
        // Determine visual state
        let targetVisualState: CardVisualState = 'IDLE';
        if (shouldDimBench) {
          targetVisualState = 'DISABLED';
        } else if (isDeployed) {
          targetVisualState = 'DEPLOYED';
        } else if (isSelected) {
          targetVisualState = 'SELECTED';
        } else if (isInteractive) {
          targetVisualState = 'PLAYABLE'; // Deployable glow
        }

        view.setVisualState(targetVisualState);
        view.setDepth(isSelected ? 90 : transform.depth);

        // Stop any active movement tween first to avoid stacked tweens
        this.scene.tweens.killTweensOf(view);

        // Tween to transform
        this.scene.tweens.add({
          targets: view,
          x: transform.x,
          y: transform.y,
          angle: transform.rotation * (180 / Math.PI),
          scaleX: transform.scale,
          scaleY: transform.scale,
          alpha: shouldDimBench ? 0.45 : 1.0,
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

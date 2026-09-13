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

  constructor(
    private scene: Phaser.Scene,
    private onSelect: (squadIndex: number | null) => void,
    private selectedSquadIndex: number | null = null,
  ) {
    this.createBackgroundTray();
  }

  private createBackgroundTray(): void {
    // Beautiful rectangular plate backdrop tray representing safe layout envelope x: ~20-260, y: ~405-535
    this.backgroundTray = this.scene.add.graphics();
    this.backgroundTray.fillStyle(0x0a0f1d, 0.45); // semi-transparent slate
    this.backgroundTray.lineStyle(1.5, 0x1e293b, 0.65);
    this.backgroundTray.fillRoundedRect(20, 410, 240, 120, 8);
    this.backgroundTray.strokeRoundedRect(20, 410, 240, 120, 8);
    this.backgroundTray.setDepth(35); // UI TRAY DEPTH
  }

  public setSelectedSquadIndex(index: number | null): void {
    this.selectedSquadIndex = index;
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.backgroundTray?.setVisible(visible);
    this.cardViews.forEach((view) => view.setVisible(visible));
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
        this.cardViews.delete(instanceId);
      }
    });

    if (creaturesInBench.length === 0) {
      this.backgroundTray?.setVisible(true);
      return;
    }

    this.backgroundTray?.setVisible(true);

    // 2. Calculate transforms for bench (fanned slightly at bottom left)
    // Safe bench coordinates: x: 20 to 260 (width 240), centerY around 465, y bottom edge ~525
    const transforms = calculateHandLayout(
      creaturesInBench.length,
      140,    // centerX of bench tray
      465,    // baseY of bench tray
      230,    // availableWidth
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

        // Bind click trigger selection dynamically to prevent stale state closures
        view.on('pointerdown', () => {
          const current = this.currentState;
          if (current) {
            const isCurrentPlayerTurn = current.activeSide === 'player';
            const isCurrentInteractive = isCurrentPlayerTurn && current.phase === 'DEPLOYMENT';
            if (isCurrentInteractive) {
              const currentSquadIndex = current.playerSquads.findIndex((s) => s.unitTypeId === creatureCard.unitTypeId);
              if (currentSquadIndex !== -1) {
                if (this.selectedSquadIndex === currentSquadIndex) {
                  this.onSelect(null); // deselect
                } else {
                  this.onSelect(currentSquadIndex); // select
                }
              }
            }
          }
        });
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
      view.setDepth(isSelected ? 90 : transform.depth); // Lift selected card above everything

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

      // Hover lifts card up slightly during DEPLOYMENT phase
      if (isInteractive && !isDeployed) {
        view.setInteractive();

        view.removeAllListeners('pointerover');
        view.removeAllListeners('pointerout');

        const originalDepth = transform.depth;

        view.on('pointerover', () => {
          this.scene.tweens.killTweensOf(view!);
          view!.setVisualState('HOVER');
          view!.setDepth(80); // CARD_HOVER depth

          this.scene.tweens.add({
            targets: view,
            y: transform.y - 24, // Lift slightly less for bench cards
            angle: 0,
            scaleX: 1.18,
            scaleY: 1.18,
            duration: 130,
            ease: 'Cubic.Out',
            onUpdate: () => {
              view?.updateMaskGeometry();
            },
          });
        });

        view.on('pointerout', () => {
          this.scene.tweens.killTweensOf(view!);
          view!.setVisualState(isSelected ? 'SELECTED' : 'PLAYABLE');
          view!.setDepth(isSelected ? 90 : originalDepth);

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
        // De-emphasized or not deployment phase -> disable/dim hover
        view.removeAllListeners('pointerover');
        view.removeAllListeners('pointerout');
        
        if (isDeployed || shouldDimBench) {
          view.disableInteractive();
        } else {
          view.setInteractive();
        }
      }
    });
  }

  public destroy(): void {
    this.backgroundTray?.destroy();
    this.cardViews.forEach((view) => view.destroy());
    this.cardViews.clear();
  }
}

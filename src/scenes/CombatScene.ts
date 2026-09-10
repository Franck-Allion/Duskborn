import Phaser from 'phaser';

import {
  isPlayerDeploymentPosition,
  isValidPlayerPlacement,
  deployEnemySquads,
  GRID_COLUMNS,
  GRID_ROWS,
} from '../game/combat/CombatGrid';
import type { CombatPosition } from '../game/combat/CombatPosition';
import type { CombatState } from '../game/combat/CombatState';
import { isDeploymentValid } from '../game/combat/CombatState';
import type { RunState } from '../game/core/RunState';
import { fitSceneToCanvas } from '../ui/fitSceneToCanvas';

export class CombatScene extends Phaser.Scene {
  private runState!: RunState;
  private combatState!: CombatState;
  private selectedSquadIndex: number | null = null;

  private cells: Phaser.GameObjects.Rectangle[][] = [];
  private squadVisuals: Phaser.GameObjects.GameObject[] = [];
  private availableSquadVisuals: Phaser.GameObjects.GameObject[] = [];
  private confirmButtonVisuals: Phaser.GameObjects.GameObject[] = [];

  private dragPreview: Phaser.GameObjects.Container | null = null;
  private currentDragSquadIndex: number | null = null;
  private dragPointer: Phaser.Input.Pointer | null = null;
  private dragSource: Phaser.GameObjects.Rectangle | null = null;
  private dragSettling = false;
  private deploymentHint!: Phaser.GameObjects.Text;

  constructor() {
    super('combat');
  }

  init(data: { runState: RunState }): void {
    this.runState = data.runState;
  }

  create(): void {
    if (this.runState.phase !== 'combat') {
      this.scene.stop();
      return;
    }

    const centerX = 480;
    const centerY = 270;

    // Initialize the mutable CombatState for this battle with unpositioned player squads and deterministically deployed enemy squads
    this.combatState = {
      playerSquads: [
        {
          unitTypeId: 'guardian',
          count: 8,
          damagedUnitHp: null,
          position: null,
        },
        { unitTypeId: 'archer', count: 3, damagedUnitHp: null, position: null },
      ],
      enemySquads: deployEnemySquads([
        {
          unitTypeId: 'duskborn-brute',
          count: 4,
          damagedUnitHp: null,
          position: null,
        },
        {
          unitTypeId: 'duskborn-archer',
          count: 2,
          damagedUnitHp: null,
          position: null,
        },
      ]),
      playerHeroHp: 100,
      enemyHeroHp: 100,
      deploymentConfirmed: false,
    };

    // Outer framing box
    this.add
      .rectangle(centerX, centerY, 800, 480, 0x111827)
      .setStrokeStyle(2, 0x374151);

    // DAY text
    this.add.text(32, 24, `DAY ${this.runState.day}`, {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ffffff',
    });

    // Side headers
    this.add
      .text(centerX - 80, 50, 'DUSKBORN SIDE', {
        fontFamily: 'monospace',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#f87171', // red-400
      })
      .setOrigin(0.5);

    this.add
      .text(centerX - 80, 490, 'PLAYER SIDE', {
        fontFamily: 'monospace',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#60a5fa', // blue-400
      })
      .setOrigin(0.5);

    this.add
      .text(740 + 75, 120, 'DEPLOY SQUADS', {
        fontFamily: 'monospace',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#e2e8f0', // slate-200
      })
      .setOrigin(0.5);

    // Grid measurements
    const startY = 122;
    const CELL_SIZE = 64;
    const GRID_ROW_GAP = 8;
    const CENTER_GAP = 24;

    const totalWidth = 6 * CELL_SIZE + 5 * 8; // 424
    const startX = centerX - 120 - totalWidth / 2; // offset grid left to make space for sidebar

    function getRowY(row: number): number {
      if (row === 0) return startY + CELL_SIZE / 2;
      if (row === 1) return startY + CELL_SIZE + GRID_ROW_GAP + CELL_SIZE / 2;
      if (row === 2)
        return (
          startY + 2 * CELL_SIZE + GRID_ROW_GAP + CENTER_GAP + CELL_SIZE / 2
        );
      return (
        startY + 3 * CELL_SIZE + 2 * GRID_ROW_GAP + CENTER_GAP + CELL_SIZE / 2
      );
    }

    // Render 6x4 Grid
    this.cells = Array.from({ length: GRID_ROWS }, () => []);

    for (let row = 0; row < GRID_ROWS; row += 1) {
      const screenY = getRowY(row);

      // Row labels (Back/Front)
      let rowLabel = 'Back';
      if (row === 1 || row === 2) {
        rowLabel = 'Front';
      }
      this.add
        .text(startX - 50, screenY, rowLabel, {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#64748b', // slate-500
        })
        .setOrigin(0.5);

      for (let col = 0; col < GRID_COLUMNS; col += 1) {
        const screenX = startX + col * (CELL_SIZE + 8) + CELL_SIZE / 2;
        const position = { column: col, row };

        const isPlayer = isPlayerDeploymentPosition(position);
        const strokeColor = isPlayer ? 0x2563eb : 0xdc2626; // blue-600 / red-600
        const fillColor = isPlayer ? 0x1d4ed8 : 0xb91c1c; // blue-700 / red-700
        const fillAlpha = 0.15;

        const rect = this.add
          .rectangle(
            screenX,
            screenY,
            CELL_SIZE,
            CELL_SIZE,
            fillColor,
            fillAlpha,
          )
          .setStrokeStyle(2, strokeColor);

        rect.setInteractive({ useHandCursor: true });
        rect.setData('position', position);

        rect.on('pointerup', (pointer: Phaser.Input.Pointer) => {
          const down = this.cameras.main.getWorldPoint(
            pointer.downX,
            pointer.downY,
          );
          if (
            this.currentDragSquadIndex === null &&
            rect.getBounds().contains(down.x, down.y)
          )
            this.handleCellClick(position);
        });

        rect.on('pointerover', () => {
          if (this.currentDragSquadIndex === null)
            this.refreshPlacementFeedback(position);
        });
        rect.on('pointerout', () => {
          if (this.currentDragSquadIndex === null)
            this.refreshPlacementFeedback();
        });

        this.cells[row][col] = rect;
      }
    }

    // Opposition separator divider
    this.add
      .line(
        centerX - 120,
        centerY,
        -totalWidth / 2,
        0,
        totalWidth / 2,
        0,
        0x475569,
      )
      .setLineWidth(2);

    this.deploymentHint = this.add.text(148, 444, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#cbd5e1',
    });

    // A small movement threshold separates a click from an intentional drag.
    this.input.dragDistanceThreshold = 6 * (window.devicePixelRatio || 1);
    this.input.on('dragstart', this.startSquadDrag, this);
    this.input.on('drag', this.moveSquadDrag, this);
    this.input.on('dragend', this.endSquadDrag, this);
    const cancelDrag = () => this.finishSquadDrag(null);
    this.input.keyboard?.on('keydown-ESC', cancelDrag);
    this.game.events.on(Phaser.Core.Events.BLUR, cancelDrag);
    this.scale.on(Phaser.Scale.Events.RESIZE, cancelDrag);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('dragstart', this.startSquadDrag, this);
      this.input.off('drag', this.moveSquadDrag, this);
      this.input.off('dragend', this.endSquadDrag, this);
      this.input.keyboard?.off('keydown-ESC', cancelDrag);
      this.game.events.off(Phaser.Core.Events.BLUR, cancelDrag);
      this.scale.off(Phaser.Scale.Events.RESIZE, cancelDrag);
      this.dragPreview?.destroy();
      this.dragPreview = null;
      this.currentDragSquadIndex = null;
      this.dragPointer = null;
      this.dragSource = null;
      this.dragSettling = false;
      this.selectedSquadIndex = null;
      this.input.setDefaultCursor('default');
    });

    // Perform initial UI render of cards & placed squads
    this.refreshDeploymentUI();

    fitSceneToCanvas(this);
  }

  private handleCellClick(pos: CombatPosition): void {
    if (
      this.combatState.deploymentConfirmed ||
      this.currentDragSquadIndex !== null
    ) {
      return; // deployment confirmed or drag in progress: lock click placement
    }

    if (this.selectedSquadIndex === null) {
      const index = this.combatState.playerSquads.findIndex(
        (squad) =>
          squad.position?.column === pos.column &&
          squad.position.row === pos.row,
      );
      if (index !== -1) {
        this.selectedSquadIndex = index;
        this.refreshDeploymentUI();
      }
      return;
    }

    const squad = this.combatState.playerSquads[this.selectedSquadIndex];
    if (!squad) {
      return;
    }

    // Validate that the target cell belongs to the player deployment zone and is not occupied
    if (
      !isValidPlayerPlacement(
        pos,
        this.combatState.playerSquads,
        this.selectedSquadIndex,
      )
    ) {
      this.refreshPlacementFeedback(pos);
      return;
    }

    // Update logical position (single source of truth)
    squad.position = pos;

    // Deselect squad
    this.selectedSquadIndex = null;

    // Refresh UI
    this.refreshDeploymentUI();
  }

  private refreshDeploymentUI(): void {
    // 1. Clear old squad markers on grid
    this.squadVisuals.forEach((v) => v.destroy());
    this.squadVisuals = [];

    // 2. Clear old available squad cards
    this.availableSquadVisuals.forEach((v) => v.destroy());
    this.availableSquadVisuals = [];

    if (this.combatState.deploymentConfirmed) {
      this.deploymentHint.setText(
        'Deployment confirmed. Positions are locked.',
      );
    } else if (!this.deploymentHint.text) {
      this.deploymentHint.setText(
        'Drag squads onto the blue cells, or click to select and place.',
      );
    }

    // Reset all grid cell draggability
    for (let r = 0; r < GRID_ROWS; r += 1) {
      for (let c = 0; c < GRID_COLUMNS; c += 1) {
        const cellRect = this.cells[r]?.[c];
        if (cellRect) {
          cellRect.setAlpha(1);
          cellRect.setInteractive({
            cursor: this.combatState.deploymentConfirmed
              ? 'default'
              : 'pointer',
          });
          this.input.setDraggable(cellRect, false);
          cellRect.setData('squadIndex', undefined);
          cellRect.setData('type', undefined);
        }
      }
    }

    // Configure draggability of cells containing player squads (if before confirmation)
    if (!this.combatState.deploymentConfirmed) {
      this.combatState.playerSquads.forEach((squad, index) => {
        if (squad.position !== null) {
          const { column, row } = squad.position;
          const cellRect = this.cells[row]?.[column];
          if (cellRect) {
            cellRect.setInteractive({ cursor: 'grab' });
            this.input.setDraggable(cellRect, true);
            cellRect.setData('squadIndex', index);
            cellRect.setData('type', 'cell');
          }
        }
      });
    }

    // 3. Render squad markers on grid for placed squads (skip drawing lifted squad)
    const startX = 480 - 120 - (6 * 64 + 5 * 8) / 2; // 148
    const startY = 122;
    const CELL_SIZE = 64;
    const GRID_ROW_GAP = 8;
    const CENTER_GAP = 24;

    function getRowY(row: number): number {
      if (row === 0) return startY + CELL_SIZE / 2;
      if (row === 1) return startY + CELL_SIZE + GRID_ROW_GAP + CELL_SIZE / 2;
      if (row === 2)
        return (
          startY + 2 * CELL_SIZE + GRID_ROW_GAP + CENTER_GAP + CELL_SIZE / 2
        );
      return (
        startY + 3 * CELL_SIZE + 2 * GRID_ROW_GAP + CENTER_GAP + CELL_SIZE / 2
      );
    }

    // Render player squads
    this.combatState.playerSquads.forEach((squad) => {
      if (squad.position !== null) {
        const { column, row } = squad.position;
        const screenX = startX + column * (CELL_SIZE + 8) + CELL_SIZE / 2;
        const screenY = getRowY(row);

        // Name text
        const nameText = this.add
          .text(
            screenX,
            screenY - 10,
            squad.unitTypeId === 'guardian' ? 'Guard' : 'Arch',
            {
              fontFamily: 'monospace',
              fontSize: '12px',
              fontStyle: 'bold',
              color: '#ffffff',
            },
          )
          .setOrigin(0.5);

        // Count text
        const countText = this.add
          .text(screenX, screenY + 10, `x${squad.count}`, {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#60a5fa', // blue-400
          })
          .setOrigin(0.5);

        this.squadVisuals.push(nameText, countText);
      }
    });

    // Render enemy squads symmetrically
    this.combatState.enemySquads.forEach((squad) => {
      if (squad.position !== null) {
        const { column, row } = squad.position;
        const screenX = startX + column * (CELL_SIZE + 8) + CELL_SIZE / 2;
        const screenY = getRowY(row);

        // Name text
        const nameText = this.add
          .text(
            screenX,
            screenY - 10,
            squad.unitTypeId === 'duskborn-brute' ? 'Brut' : 'Arch',
            {
              fontFamily: 'monospace',
              fontSize: '12px',
              fontStyle: 'bold',
              color: '#ffffff',
            },
          )
          .setOrigin(0.5);

        // Count text
        const countText = this.add
          .text(screenX, screenY + 10, `x${squad.count}`, {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#f87171', // red-400
          })
          .setOrigin(0.5);

        this.squadVisuals.push(nameText, countText);
      }
    });

    // 4. Render available squad cards on right sidebar
    const sidebarX = 740;
    const sidebarY = 150;
    const cardWidth = 150;
    const cardHeight = 60;
    const cardGap = 20;

    this.combatState.playerSquads.forEach((squad, index) => {
      const y = sidebarY + index * (cardHeight + cardGap);

      const isSelected = this.selectedSquadIndex === index;
      const isPlaced = squad.position !== null;

      // Selectable Card Background
      const bgColor = isSelected ? 0x1e3a8a : 0x1e293b; // blue selection, slate neutral
      const strokeColor = isSelected
        ? 0x60a5fa
        : isPlaced
          ? 0x475569
          : 0x94a3b8; // sky blue highlight, gray placed, slate unplaced
      const strokeWidth = isSelected ? 3 : 1;

      const bg = this.add
        .rectangle(
          sidebarX + cardWidth / 2,
          y + cardHeight / 2,
          cardWidth,
          cardHeight,
          bgColor,
        )
        .setStrokeStyle(strokeWidth, strokeColor);

      // Card is only interactive before confirmation
      if (!this.combatState.deploymentConfirmed) {
        bg.setInteractive({ cursor: 'grab', draggable: true });
        bg.setData('type', 'card');
        bg.setData('squadIndex', index);

        bg.on('pointerup', (pointer: Phaser.Input.Pointer) => {
          const down = this.cameras.main.getWorldPoint(
            pointer.downX,
            pointer.downY,
          );
          if (
            this.currentDragSquadIndex !== null ||
            !bg.getBounds().contains(down.x, down.y)
          )
            return;
          if (this.selectedSquadIndex === index) {
            this.selectedSquadIndex = null; // deselect if clicked again
          } else {
            this.selectedSquadIndex = index;
          }
          this.refreshDeploymentUI();
        });

        this.input.setDraggable(bg, true);
      }

      // Name / Count labels
      const displayName =
        squad.unitTypeId === 'guardian' ? 'Guardians' : 'Archers';
      const titleText = this.add.text(
        sidebarX + 12,
        y + 12,
        `${displayName} x${squad.count}`,
        {
          fontFamily: 'monospace',
          fontSize: '14px',
          fontStyle: 'bold',
          color: isSelected ? '#ffffff' : '#f1f5f9',
        },
      );

      // Placement status
      const statusText = isPlaced ? 'Placed' : 'Not Deployed';
      const statusColor = isPlaced ? '#94a3b8' : '#f87171'; // gray vs red warning
      const subtitleText = this.add.text(sidebarX + 12, y + 34, statusText, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: statusColor,
      });

      this.availableSquadVisuals.push(bg, titleText, subtitleText);
    });

    // 5. Clean up and render the Confirm Deployment action button
    this.confirmButtonVisuals.forEach((v) => v.destroy());
    this.confirmButtonVisuals = [];

    const btnX = sidebarX;
    const btnY =
      sidebarY + this.combatState.playerSquads.length * (cardHeight + cardGap);
    const btnWidth = cardWidth;
    const btnHeight = 40;

    if (!this.combatState.deploymentConfirmed) {
      // Interactive Confirm Deployment Button
      const btnBg = this.add
        .rectangle(
          btnX + btnWidth / 2,
          btnY + btnHeight / 2,
          btnWidth,
          btnHeight,
          0xea580c, // bright orange background
        )
        .setStrokeStyle(1, 0xf97316)
        .setInteractive({ useHandCursor: true });

      const btnText = this.add
        .text(btnX + btnWidth / 2, btnY + btnHeight / 2, 'Confirm Deployment', {
          fontFamily: 'monospace',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#ffffff',
        })
        .setOrigin(0.5);

      btnBg.on('pointerdown', () => {
        if (this.currentDragSquadIndex !== null) return;
        if (!isDeploymentValid(this.combatState)) {
          this.cameras.main.shake(100, 0.005);
          btnText.setText('Deploy All Squads!');
          btnText.setColor('#f87171'); // red warning text
          // Revert button text after 1.5 seconds
          this.time.delayedCall(1500, () => {
            if (!this.combatState.deploymentConfirmed && btnText.active) {
              btnText.setText('Confirm Deployment');
              btnText.setColor('#ffffff');
            }
          });
          return;
        }

        this.combatState.deploymentConfirmed = true;
        this.selectedSquadIndex = null;
        this.refreshDeploymentUI();
      });

      // Hover visual feedback
      btnBg.on('pointerover', () => {
        btnBg.setFillStyle(0xf97316); // lighter orange
      });
      btnBg.on('pointerout', () => {
        btnBg.setFillStyle(0xea580c);
      });

      this.confirmButtonVisuals.push(btnBg, btnText);
    } else {
      // Confirmed State Indicator
      const confirmedBg = this.add
        .rectangle(
          btnX + btnWidth / 2,
          btnY + btnHeight / 2,
          btnWidth,
          btnHeight,
          0x1f2937, // dark gray background
        )
        .setStrokeStyle(1, 0x4b5563);

      const confirmedText = this.add
        .text(
          btnX + btnWidth / 2,
          btnY + btnHeight / 2,
          'DEPLOYMENT CONFIRMED',
          {
            fontFamily: 'monospace',
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#9ca3af', // muted gray
          },
        )
        .setOrigin(0.5);

      this.confirmButtonVisuals.push(confirmedBg, confirmedText);
    }
    this.refreshPlacementFeedback();
    const resolution = Math.max(1, Math.ceil(this.cameras.main.zoom));
    for (const visual of [
      ...this.squadVisuals,
      ...this.availableSquadVisuals,
      ...this.confirmButtonVisuals,
    ]) {
      if (visual instanceof Phaser.GameObjects.Text)
        visual.setResolution(resolution);
    }
  }

  /** Use rendered cell bounds after converting through the camera, including HiDPI zoom. */
  private getCellFromPointer(
    pointer: Phaser.Input.Pointer,
  ): CombatPosition | null {
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    for (const row of this.cells) {
      for (const cell of row) {
        if (cell.getBounds().contains(world.x, world.y)) {
          return cell.getData('position') as CombatPosition;
        }
      }
    }
    return null;
  }

  private startSquadDrag(
    pointer: Phaser.Input.Pointer,
    source: Phaser.GameObjects.Rectangle,
  ): void {
    const index = source.getData('squadIndex') as number | undefined;
    if (
      this.combatState.deploymentConfirmed ||
      this.currentDragSquadIndex !== null ||
      index === undefined
    )
      return;

    this.currentDragSquadIndex = index;
    this.dragPointer = pointer;
    this.dragSource = source;
    this.selectedSquadIndex = null;
    source.setAlpha(0.35);
    const sourceBounds = source.getBounds();
    for (const visual of [
      ...this.squadVisuals,
      ...this.availableSquadVisuals,
    ]) {
      if (
        visual instanceof Phaser.GameObjects.Text &&
        sourceBounds.contains(visual.x, visual.y)
      ) {
        visual.setAlpha(0.35);
      }
    }
    this.input.setDefaultCursor('grabbing');

    const squad = this.combatState.playerSquads[index];
    const previewBg = this.add
      .rectangle(0, 0, 56, 56, 0x172554, 0.95)
      .setStrokeStyle(2, 0x93c5fd);
    const previewText = this.add
      .text(
        0,
        0,
        `${squad.unitTypeId === 'guardian' ? 'Guard' : 'Arch'}
x${squad.count}`,
        {
          fontFamily: 'monospace',
          fontSize: '14px',
          fontStyle: 'bold',
          color: '#ffffff',
          align: 'center',
          resolution: Math.max(1, Math.ceil(this.cameras.main.zoom)),
        },
      )
      .setOrigin(0.5);
    this.dragPreview = this.add
      .container(0, 0, [previewBg, previewText])
      .setDepth(100);
    // Never destroy or disable the object captured by Phaser while it is dragging.
    this.moveSquadDrag(pointer);
  }

  private moveSquadDrag(pointer: Phaser.Input.Pointer): void {
    if (pointer !== this.dragPointer || this.dragSettling || !this.dragPreview)
      return;
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    this.dragPreview.setPosition(world.x, world.y);
    const target = this.getCellFromPointer(pointer);
    const valid =
      target !== null &&
      this.currentDragSquadIndex !== null &&
      isValidPlayerPlacement(
        target,
        this.combatState.playerSquads,
        this.currentDragSquadIndex,
      );
    const previewBg = this.dragPreview.first as Phaser.GameObjects.Rectangle;
    previewBg.setStrokeStyle(
      2,
      target ? (valid ? 0x86efac : 0xfca5a5) : 0x93c5fd,
    );
    this.refreshPlacementFeedback(target);
  }

  private endSquadDrag(pointer: Phaser.Input.Pointer): void {
    if (pointer !== this.dragPointer) return;
    this.finishSquadDrag(
      pointer.event.type === 'touchcancel'
        ? null
        : this.getCellFromPointer(pointer),
    );
  }

  private finishSquadDrag(target: CombatPosition | null): void {
    const index = this.currentDragSquadIndex;
    if (
      index === null ||
      this.dragSettling ||
      !this.dragPreview ||
      !this.dragSource
    )
      return;
    this.dragSettling = true;
    const accepted =
      !this.combatState.deploymentConfirmed &&
      target !== null &&
      isValidPlayerPlacement(target, this.combatState.playerSquads, index);
    const destination = accepted
      ? this.cells[target.row][target.column]
      : this.dragSource;
    if (accepted) this.combatState.playerSquads[index].position = target;
    this.deploymentHint.setText(
      accepted
        ? 'Squad placed. Drag it again to reposition.'
        : 'Placement cancelled. Squad returned to its original position.',
    );
    this.deploymentHint.setColor(accepted ? '#86efac' : '#fca5a5');
    this.refreshPlacementFeedback();
    this.input.setDefaultCursor('default');

    // Keep the gesture locked through release so it cannot also trigger click-to-place.
    this.tweens.add({
      targets: this.dragPreview,
      x: destination.x,
      y: destination.y,
      alpha: accepted ? 0.3 : 0.6,
      duration: 120,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.dragPreview?.destroy();
        this.dragPreview = null;
        this.dragSource?.setAlpha(1);
        this.dragSource = null;
        this.dragPointer = null;
        this.currentDragSquadIndex = null;
        this.dragSettling = false;
        this.refreshDeploymentUI();
      },
    });
  }

  private refreshPlacementFeedback(
    hovered: CombatPosition | null = null,
  ): void {
    const index = this.currentDragSquadIndex ?? this.selectedSquadIndex;
    for (const row of this.cells) {
      for (const cell of row) {
        const position = cell.getData('position') as CombatPosition;
        const player = isPlayerDeploymentPosition(position);
        const active =
          index !== null &&
          !this.combatState.deploymentConfirmed &&
          !this.dragSettling;
        const valid =
          active &&
          isValidPlayerPlacement(
            position,
            this.combatState.playerSquads,
            index,
          );
        const over =
          active &&
          hovered?.column === position.column &&
          hovered.row === position.row;
        cell.setFillStyle(
          over ? (valid ? 0x22c55e : 0xef4444) : player ? 0x1d4ed8 : 0xb91c1c,
          over ? 0.4 : valid ? 0.28 : 0.15,
        );
        cell.setStrokeStyle(
          over ? 3 : 2,
          over
            ? valid
              ? 0x86efac
              : 0xfca5a5
            : valid
              ? 0x60a5fa
              : player
                ? 0x2563eb
                : 0xdc2626,
        );
      }
    }
    if (
      index !== null &&
      !this.dragSettling &&
      !this.combatState.deploymentConfirmed
    ) {
      const valid =
        hovered &&
        isValidPlayerPlacement(hovered, this.combatState.playerSquads, index);
      this.deploymentHint.setText(
        hovered
          ? valid
            ? this.currentDragSquadIndex !== null
              ? 'Release to place squad'
              : 'Click to place squad'
            : isPlayerDeploymentPosition(hovered)
              ? 'Cell occupied - choose an empty cell'
              : 'Deploy in the blue player zone'
          : 'Drag to a blue cell / Esc to cancel',
      );
      this.deploymentHint.setColor(hovered && !valid ? '#fca5a5' : '#cbd5e1');
    }
  }
}

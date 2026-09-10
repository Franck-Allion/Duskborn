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

        rect.on('pointerdown', () => {
          this.handleCellClick(position);
        });

        // Hover effect: when hovering, make border brighter if a squad is selected
        rect.on('pointerover', () => {
          if (
            this.selectedSquadIndex !== null &&
            !this.combatState.deploymentConfirmed
          ) {
            rect.setStrokeStyle(3, 0xffffff); // white thick border on hover
          }
        });

        rect.on('pointerout', () => {
          const isPl = isPlayerDeploymentPosition(position);
          const origStroke = isPl ? 0x2563eb : 0xdc2626;
          rect.setStrokeStyle(2, origStroke);
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

    // Perform initial UI render of cards & placed squads
    this.refreshDeploymentUI();

    fitSceneToCanvas(this);
  }

  private handleCellClick(pos: CombatPosition): void {
    if (this.combatState.deploymentConfirmed) {
      return; // deployment confirmed: lock all repositioning
    }

    if (this.selectedSquadIndex === null) {
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
      this.cameras.main.shake(100, 0.005); // feedback for invalid placement
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

    // 3. Render squad markers on grid for placed squads
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
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => {
          if (this.selectedSquadIndex === index) {
            this.selectedSquadIndex = null; // deselect if clicked again
          } else {
            this.selectedSquadIndex = index;
          }
          this.refreshDeploymentUI();
        });
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
  }
}

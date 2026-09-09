import Phaser from 'phaser';

import {
  isPlayerDeploymentPosition,
  isCellOccupied,
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

    // Initialize the mutable CombatState for this battle with unpositioned player squads
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
      enemySquads: [], // enemy placement handled by later steps
      playerHeroHp: 100,
      enemyHeroHp: 100,
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
          if (this.selectedSquadIndex !== null) {
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
    if (this.selectedSquadIndex === null) {
      return;
    }

    const squad = this.combatState.playerSquads[this.selectedSquadIndex];
    if (!squad) {
      return;
    }

    // Validate that the target cell is not already occupied by another squad
    const otherSquads = this.combatState.playerSquads.filter(
      (_, idx) => idx !== this.selectedSquadIndex,
    );
    if (isCellOccupied(pos, otherSquads)) {
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
        .setStrokeStyle(strokeWidth, strokeColor)
        .setInteractive({ useHandCursor: true });

      bg.on('pointerdown', () => {
        if (this.selectedSquadIndex === index) {
          this.selectedSquadIndex = null; // deselect if clicked again
        } else {
          this.selectedSquadIndex = index;
        }
        this.refreshDeploymentUI();
      });

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
  }
}

import Phaser from 'phaser';

import {
  isPlayerDeploymentPosition,
  GRID_COLUMNS,
  GRID_ROWS,
} from '../game/combat/CombatGrid';
import type { RunState } from '../game/core/RunState';
import { fitSceneToCanvas } from '../ui/fitSceneToCanvas';

export class CombatScene extends Phaser.Scene {
  private runState!: RunState;

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
      .text(centerX, 50, 'DUSKBORN SIDE', {
        fontFamily: 'monospace',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#f87171', // red-400
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, 490, 'PLAYER SIDE', {
        fontFamily: 'monospace',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#60a5fa', // blue-400
      })
      .setOrigin(0.5);

    // Grid measurements
    const startY = 122;
    const CELL_SIZE = 64;
    const GRID_ROW_GAP = 8;
    const CENTER_GAP = 24;

    const totalWidth = 6 * CELL_SIZE + 5 * 8; // 424
    const startX = centerX - totalWidth / 2; // 268

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

        this.add
          .rectangle(
            screenX,
            screenY,
            CELL_SIZE,
            CELL_SIZE,
            fillColor,
            fillAlpha,
          )
          .setStrokeStyle(2, strokeColor);
      }
    }

    // Opposition separator divider
    this.add
      .line(centerX, centerY, -totalWidth / 2, 0, totalWidth / 2, 0, 0x475569)
      .setLineWidth(2);

    fitSceneToCanvas(this);
  }
}

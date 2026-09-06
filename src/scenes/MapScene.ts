import Phaser from 'phaser';

import avatarUrl from '../../assets/avatar1.png';
import { createInitialRunState } from '../game/core/RunState';
import { GameMap } from '../game/map/GameMap';

const CELL_SIZE = 56;
const CELL_GAP = 4;

export class MapScene extends Phaser.Scene {
  private readonly map = new GameMap();
  private readonly runState = createInitialRunState();
  private cells: Phaser.GameObjects.Rectangle[][] = [];
  private playerImage!: Phaser.GameObjects.Image;
  private startX = 0;
  private startY = 0;

  constructor() {
    super('map');
  }

  preload(): void {
    this.load.image('player-avatar', avatarUrl);
  }

  create(): void {
    const { centerX, centerY } = this.cameras.main;
    const cellStep = CELL_SIZE + CELL_GAP;
    const gridWidth = this.map.width * cellStep - CELL_GAP;
    const gridHeight = this.map.height * cellStep - CELL_GAP;
    this.startX = centerX - gridWidth / 2 + CELL_SIZE / 2;
    this.startY = centerY - gridHeight / 2 + CELL_SIZE / 2;

    this.cells = [];

    for (let y = 0; y < this.map.height; y += 1) {
      this.cells[y] = [];
      for (let x = 0; x < this.map.width; x += 1) {
        const tile = this.map.getTile({ x, y });

        if (!tile) {
          continue;
        }

        const screenX = this.startX + x * cellStep;
        const screenY = this.startY + y * cellStep;

        const rect = this.add
          .rectangle(screenX, screenY, CELL_SIZE, CELL_SIZE, 0x263244)
          .setStrokeStyle(2, 0x64748b);

        rect.setData('coords', { x, y });
        this.cells[y][x] = rect;

        // Enable Interactivity
        rect.setInteractive();

        rect.on('pointerover', () => {
          const coords = rect.getData('coords') as { x: number; y: number };
          if (this.map.canMove(coords, this.runState)) {
            // Stronger highlight when hovering a valid destination
            rect.setFillStyle(0x3b82f6); // bright blue
            rect.setStrokeStyle(2, 0x93c5fd); // sky blue border
            this.input.setDefaultCursor('pointer');
          } else {
            this.input.setDefaultCursor('default');
          }
        });

        rect.on('pointerout', () => {
          const coords = rect.getData('coords') as { x: number; y: number };
          this.input.setDefaultCursor('default');
          this.updateCellVisuals(coords.x, coords.y);
        });

        rect.on('pointerdown', () => {
          const coords = rect.getData('coords') as { x: number; y: number };
          if (this.map.movePlayer(coords, this.runState)) {
            // Player successfully moved! Update Phaser visual and refresh all cell highlights
            this.updatePlayerVisualPosition();
            this.refreshAllCellVisuals();
          }
        });
      }
    }

    // Render player logical position on top of the correct map tile.
    const playerPos = this.map.getPlayerPosition();
    const playerX = this.startX + playerPos.x * cellStep;
    const playerY = this.startY + playerPos.y * cellStep;

    this.playerImage = this.add
      .image(playerX, playerY, 'player-avatar')
      .setDisplaySize(CELL_SIZE, CELL_SIZE)
      .setDepth(1);

    // Initial draw of highlights
    this.refreshAllCellVisuals();
  }

  private updateCellVisuals(x: number, y: number): void {
    const rect = this.cells[y]?.[x];
    if (!rect) {
      return;
    }

    const coords = { x, y };
    if (this.map.canMove(coords, this.runState)) {
      // Valid destination: subtle highlight
      rect.setFillStyle(0x1e3a8a); // navy blue
      rect.setStrokeStyle(2, 0x3b82f6); // bright blue border
    } else {
      // Neutral cell
      rect.setFillStyle(0x263244); // neutral slate
      rect.setStrokeStyle(2, 0x64748b); // neutral gray-blue border
    }
  }

  private refreshAllCellVisuals(): void {
    for (let y = 0; y < this.map.height; y += 1) {
      for (let x = 0; x < this.map.width; x += 1) {
        this.updateCellVisuals(x, y);
      }
    }
  }

  private updatePlayerVisualPosition(): void {
    const cellStep = CELL_SIZE + CELL_GAP;
    const playerPos = this.map.getPlayerPosition();
    const playerX = this.startX + playerPos.x * cellStep;
    const playerY = this.startY + playerPos.y * cellStep;

    // Fast and responsive movement tween
    this.tweens.add({
      targets: this.playerImage,
      x: playerX,
      y: playerY,
      duration: 150,
      ease: 'Power2.easeOut',
    });
  }
}

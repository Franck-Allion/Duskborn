import Phaser from 'phaser';

import { GameMap } from '../game/map/GameMap';

const CELL_SIZE = 56;
const CELL_GAP = 4;

export class MapScene extends Phaser.Scene {
  private readonly map = new GameMap();

  constructor() {
    super('map');
  }

  create(): void {
    const { centerX, centerY } = this.cameras.main;
    const cellStep = CELL_SIZE + CELL_GAP;
    const gridWidth = this.map.width * cellStep - CELL_GAP;
    const gridHeight = this.map.height * cellStep - CELL_GAP;
    const startX = centerX - gridWidth / 2 + CELL_SIZE / 2;
    const startY = centerY - gridHeight / 2 + CELL_SIZE / 2;

    for (let y = 0; y < this.map.height; y += 1) {
      for (let x = 0; x < this.map.width; x += 1) {
        const tile = this.map.getTile({ x, y });

        if (!tile) {
          continue;
        }

        this.add
          .rectangle(
            startX + x * cellStep,
            startY + y * cellStep,
            CELL_SIZE,
            CELL_SIZE,
            0x263244,
          )
          .setStrokeStyle(2, 0x64748b);
      }
    }
  }
}

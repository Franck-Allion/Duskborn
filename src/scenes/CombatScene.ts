import Phaser from 'phaser';

import type { RunState } from '../game/core/RunState';

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

    const { centerX, centerY } = this.cameras.main;
    this.add.text(32, 24, `DAY ${this.runState.day}`, {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ffffff',
    });
    this.add
      .rectangle(centerX, centerY, 640, 300, 0x1e293b)
      .setStrokeStyle(2, 0xea580c);
    this.add
      .text(centerX, centerY - 100, 'DUSKBORN ATTACK', {
        fontFamily: 'monospace',
        fontSize: '32px',
        fontStyle: 'bold',
        color: '#fed7aa',
      })
      .setOrigin(0.5);

    for (const [offset, label] of [
      [-200, 'Player'],
      [0, 'VS'],
      [200, 'Duskborn'],
    ] as const) {
      this.add
        .text(centerX + offset, centerY + 30, label, {
          fontFamily: 'monospace',
          fontSize: '24px',
          color: '#ffffff',
        })
        .setOrigin(0.5);
    }
  }
}

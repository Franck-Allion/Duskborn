import Phaser from 'phaser';

import './style.css';

class SetupScene extends Phaser.Scene {
  constructor() {
    super('setup');
  }

  create(): void {
    const { centerX, centerY } = this.cameras.main;

    this.add
      .text(centerX, centerY, 'DUSKBORN', {
        color: '#f3f4f6',
        fontFamily: 'Georgia, serif',
        fontSize: '48px',
        letterSpacing: 8,
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY + 64, 'Project setup complete', {
        color: '#9ca3af',
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
      })
      .setOrigin(0.5);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  parent: 'game',
  backgroundColor: '#111827',
  scene: SetupScene,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});

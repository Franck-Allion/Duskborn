import Phaser from 'phaser';

import { MapScene } from './scenes/MapScene';
import { CombatScene } from './scenes/CombatScene';
import './style.css';

new Phaser.Game({
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  parent: 'game',
  backgroundColor: '#111827',
  pixelArt: false,
  antialias: true,
  scene: [MapScene, CombatScene],
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  callbacks: {
    postBoot: (game) => {
      const resize = () => {
        const parent = game.canvas.parentElement!;
        const fit = Math.min(
          parent.clientWidth / 960,
          parent.clientHeight / 540,
        );
        const density = window.devicePixelRatio || 1;
        const renderScale = Math.max(fit * density, 0.01);
        game.scale.resize(
          Math.round(960 * renderScale),
          Math.round(540 * renderScale),
        );
        game.scale.setZoom(1 / density);
      };
      resize();
      window.addEventListener('resize', resize);
      game.events.once(Phaser.Core.Events.DESTROY, () => {
        window.removeEventListener('resize', resize);
      });
    },
  },
});

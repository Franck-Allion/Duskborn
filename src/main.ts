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
  pixelArt: true,
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
        // Whole-number enlargement; small windows still show the complete game.
        game.scale.setZoom(fit >= 1 ? Math.floor(fit) : Math.max(fit, 0.01));
      };
      resize();
      window.addEventListener('resize', resize);
      game.events.once(Phaser.Core.Events.DESTROY, () => {
        window.removeEventListener('resize', resize);
      });
    },
  },
});

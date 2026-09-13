import Phaser from 'phaser';
import { CardView, type CardViewConfig } from './CardView';

/**
 * Specialized view for playable Magic Spell Cards.
 */
export class SpellCardView extends CardView {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: CardViewConfig,
  ) {
    super(scene, x, y, config, 'SPELL', false);
  }
}

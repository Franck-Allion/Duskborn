import Phaser from 'phaser';
import { CardView, type CardViewConfig } from './CardView';

/**
 * Specialized view for Creature Bench Cards.
 */
export class CreatureCardView extends CardView {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: CardViewConfig,
  ) {
    super(scene, x, y, config, 'CREATURE', true); // isBench = true
  }
}

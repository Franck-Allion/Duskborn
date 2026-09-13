export interface SpellDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Optional preloaded Phaser texture key; missing textures use the card placeholder. */
  readonly imageKey?: string;
  readonly manaCost: number;
  readonly effectId: string;
  readonly effectValue?: number;
}

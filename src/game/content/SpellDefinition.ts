export interface SpellDefinition {
  readonly id: string;
  readonly name: string;
  readonly manaCost: number;
  readonly effectId: string;
  readonly effectValue?: number;
}

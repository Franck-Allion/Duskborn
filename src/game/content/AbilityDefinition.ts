export interface AbilityPositionRule {
  readonly depth?: 'FRONT' | 'BACK';
  readonly horizontal?: 'EDGE' | 'CENTER';
}

export interface PositionModifier {
  readonly type: 'damage' | 'defense';
  readonly value: number;
}

export interface AbilityDefinition {
  readonly id: string;
  readonly name: string;
  readonly manaCost: number;
  readonly effectId: string;
  readonly positionRule?: AbilityPositionRule;
  readonly positionModifier?: PositionModifier;
}

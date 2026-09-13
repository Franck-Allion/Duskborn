export interface CardTransform {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  depth: number;
}

/**
 * Mathematically calculates fanned transforms for cards in a hand layout.
 * Supports dynamic spreading and centering with high-end premium alignment.
 * 
 * Rules:
 * - Center card is the highest, straightest card in the fan.
 * - Outer cards are rotated outwards and sit slightly lower in the fan arc.
 */
export function calculateHandLayout(
  count: number,
  centerX: number,
  baseY: number,
  availableWidth: number,
  isBench: boolean = false,
): CardTransform[] {
  if (count <= 0) return [];

  const transforms: CardTransform[] = [];
  const cardWidth = isBench ? 88 : 104;
  
  // Custom overlap and spread logic based on card counts
  const normalSpacing = cardWidth * 0.85;
  const spread = Math.min(availableWidth - cardWidth, (count - 1) * normalSpacing);
  const startX = centerX - spread / 2;

  const maxRotation = isBench ? 0.04 : 0.09; // in radians (~2 to 5 degrees)
  const arcDepth = isBench ? 6 : 14;         // px depth curve

  for (let i = 0; i < count; i++) {
    // normalized position 't' from -1 to +1 (or 0 for single card)
    const t = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;

    const x = startX + (count === 1 ? spread / 2 : (i / (count - 1)) * spread);
    const y = baseY + Math.abs(t) * arcDepth;
    const rotation = t * maxRotation;

    transforms.push({
      x,
      y,
      rotation,
      scale: 1.0,
      depth: 50 + i, // Base card depth starts at 50
    });
  }

  return transforms;
}

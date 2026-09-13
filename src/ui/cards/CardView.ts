import Phaser from 'phaser';

export type CardVisualState =
  | 'IDLE'
  | 'HOVER'
  | 'PLAYABLE'
  | 'DISABLED'
  | 'SELECTED'
  | 'DRAGGING'
  | 'DEPLOYED';

export const CARD_WIDTH = 136;       // Spell card normal width after resize
export const CARD_HEIGHT = 191.25;   // Spell card normal height after resize

export const CREATURE_CARD_WIDTH = 118;     // Creature card normal width after resize
export const CREATURE_CARD_HEIGHT = 165.94; // Creature card normal height after resize

export interface CardViewConfig {
  instanceId: string;
  contentId: string;
  name: string;
  description: string;
  manaCost?: number;
  count?: number;
  isDeployed?: boolean;
  attack?: number;
  currentHp?: number;
  maxHp?: number;
  level?: number;
}

/**
 * Interface binding a target Image to its hardware-accelerated Phaser 4 filter controllers.
 */
export interface CardImageFilters {
  target: Phaser.GameObjects.Image;
  glow: {
    setActive: (value: boolean) => void;
    color?: number;
    outerStrength?: number;
    innerStrength?: number;
  };
  colorMatrix: {
    setActive: (value: boolean) => void;
    reset: () => void;
    desaturate: () => void;
    brightness: (value: number) => void;
  };
}

/**
 * Reusable premium Phaser 4 component representing a cohesive Combat Card.
 */
export class CardView extends Phaser.GameObjects.Container {
  protected shadow!: Phaser.GameObjects.Graphics;
  protected backing!: Phaser.GameObjects.Graphics;
  protected artContainer!: Phaser.GameObjects.Container;
  protected art!: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics;
  protected frame!: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics;
  protected nameplateBg!: Phaser.GameObjects.Graphics;
  protected nameText!: Phaser.GameObjects.Text;
  protected rulesBg!: Phaser.GameObjects.Graphics;
  protected rulesText!: Phaser.GameObjects.Text;
  protected playGlow!: Phaser.GameObjects.Graphics;

  // Badges: Spell uses standard top-left badgeBg/badgeText.
  // Creature uses 4 distinct tactical badges.
  protected badgeBg!: Phaser.GameObjects.Graphics;
  protected badgeText!: Phaser.GameObjects.Text;

  protected countBadgeBg!: Phaser.GameObjects.Graphics;
  protected countBadgeText!: Phaser.GameObjects.Text;
  protected levelBadgeBg!: Phaser.GameObjects.Graphics;
  protected levelBadgeText!: Phaser.GameObjects.Text;
  protected attackBadgeBg!: Phaser.GameObjects.Graphics;
  protected attackBadgeText!: Phaser.GameObjects.Text;
  protected hpBadgeBg!: Phaser.GameObjects.Graphics;
  protected hpBadgeText!: Phaser.GameObjects.Text;

  protected visualState: CardVisualState = 'IDLE';
  protected widthVal: number;
  protected heightVal: number;

  protected artBaseX: number = 0;
  protected artBaseY: number = 0;

  // Authoritative local-space artwork rectangle
  protected artRect!: { x: number; y: number; width: number; height: number };

  // Stored filter controllers created once per filtered Image to prevent leaks/progressive stacking
  protected imageFilters: CardImageFilters[] = [];

  // Track explicit resting transform data for deterministic hit testing
  public restX: number = 0;
  public restY: number = 0;
  public restRotation: number = 0;
  public restScale: number = 1;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    public readonly config: CardViewConfig,
    public readonly cardType: 'SPELL' | 'CREATURE',
    public readonly isBench: boolean = false,
  ) {
    super(scene, x, y);
    
    this.widthVal = isBench ? CREATURE_CARD_WIDTH : CARD_WIDTH;
    this.heightVal = isBench ? CREATURE_CARD_HEIGHT : CARD_HEIGHT;

    this.setSize(this.widthVal, this.heightVal);

    // Compute center of the artwork slot explicitly using authoritative proportions
    this.artRect = {
      x: -this.widthVal * 0.38,
      y: -this.heightVal * 0.38,
      width: this.widthVal * 0.76,
      height: this.heightVal * 0.44,
    };

    this.artBaseX = this.artRect.x + this.artRect.width / 2;
    this.artBaseY = this.artRect.y + this.artRect.height / 2;

    this.createHierarchy();
    this.setVisualState('IDLE');

    this.setupInteractions();
    scene.add.existing(this);
  }

  private createHierarchy(): void {
    const w = this.widthVal;
    const h = this.heightVal;
    const isSpell = this.cardType === 'SPELL';

    // 1. Soft Rounded Drop Shadow
    this.shadow = this.scene.add.graphics();
    this.shadow.fillStyle(0x000000, 0.4);
    this.shadow.fillRoundedRect(-w / 2 + 4, -h / 2 + 6, w, h, 10);
    this.add(this.shadow);

    // 2. Playable Luminous Glow (behaves as back glow)
    this.playGlow = this.scene.add.graphics();
    this.playGlow.lineStyle(4, 0x60a5fa, 0.8);
    this.playGlow.strokeRoundedRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, 12);
    this.playGlow.setVisible(false);
    this.add(this.playGlow);

    // 3. Base/Backing Plate
    this.backing = this.scene.add.graphics();
    // Procedural layered dark fantasy plate background
    const gradientTop = isSpell ? 0x111e38 : 0x221a15;
    const gradientBot = isSpell ? 0x0c0f1c : 0x14100d;
    this.backing.fillGradientStyle(gradientTop, gradientTop, gradientBot, gradientBot, 1);
    this.backing.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    this.backing.lineStyle(1.5, isSpell ? 0x2e3f5e : 0x47382e, 1);
    this.backing.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
    this.add(this.backing);

    // 4. Artwork Area (Masked)
    this.artContainer = this.scene.add.container(0, 0);
    this.add(this.artContainer);

    const artKey = isSpell
      ? `card-art-spell-${this.config.contentId}`
      : `card-art-creature-${this.config.contentId}`;

    if (this.scene.textures.exists(artKey)) {
      const artImg = this.scene.add.image(this.artBaseX, this.artBaseY, artKey);
      artImg.setOrigin(0.5, 0.5);
      
      // Real Aspect-ratio Cover/Crop calculation
      const scale = Math.max(this.artRect.width / artImg.width, this.artRect.height / artImg.height);
      artImg.setScale(scale);
      
      this.art = artImg;
      this.artContainer.add(artImg);
    } else {
      // Procedural fallback artwork
      const artG = this.scene.add.graphics();
      artG.fillStyle(isSpell ? 0x1d4ed8 : 0x7c2d12, 1);
      artG.fillRoundedRect(this.artRect.x, this.artRect.y, this.artRect.width, this.artRect.height, 6);
      
      // Draw procedural magic symbol or shield centered at slot base Y
      artG.lineStyle(1.5, isSpell ? 0x60a5fa : 0xf97316, 0.6);
      if (isSpell) {
        artG.strokeCircle(this.artBaseX, this.artBaseY, this.artRect.width * 0.2);
        artG.strokeRect(this.artBaseX - 4, this.artBaseY - 4, 8, 8);
      } else {
        // Shield outline
        artG.beginPath();
        artG.moveTo(this.artBaseX, this.artBaseY - 12);
        artG.lineTo(this.artBaseX + 10, this.artBaseY - 6);
        artG.lineTo(this.artBaseX + 8, this.artBaseY + 8);
        artG.lineTo(this.artBaseX, this.artBaseY + 14);
        artG.lineTo(this.artBaseX - 8, this.artBaseY + 8);
        artG.lineTo(this.artBaseX - 10, this.artBaseY - 6);
        artG.closePath();
        artG.strokePath();
      }
      this.art = artG;
      this.artContainer.add(artG);
    }

    // Apply geometry masking with a small 3px inner artwork safe margin
    // This visually separates the art from the frame and guarantees zero bleeding
    const inset = 3;
    const maskX = this.artRect.x + inset;
    const maskY = this.artRect.y + inset;
    const maskW = this.artRect.width - inset * 2;
    const maskH = this.artRect.height - inset * 2;

    const maskGraphics = this.scene.make.graphics({ x: this.x, y: this.y }, false);
    maskGraphics.fillStyle(0xffffff, 1);
    maskGraphics.fillRoundedRect(maskX, maskY, maskW, maskH, 6);
    const mask = maskGraphics.createGeometryMask();
    this.artContainer.setMask(mask);

    // Keep reference of maskGraphics to adjust during card movement
    this.setData('maskGraphics', maskGraphics);

    // 5. Exterior Frame Layer
    const frameKey = isSpell ? 'card-frame-spell' : 'card-frame-creature';
    if (this.scene.textures.exists(frameKey)) {
      const frameImg = this.scene.add.image(0, 0, frameKey);
      frameImg.setDisplaySize(w, h);
      this.frame = frameImg;
      this.add(frameImg);
    } else {
      // Procedural border frame
      const frameG = this.scene.add.graphics();
      frameG.lineStyle(3, isSpell ? 0x3b82f6 : 0xd97706, 1); // Blue for spell, Bronze for creature
      frameG.strokeRoundedRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2, 10);
      frameG.lineStyle(1, isSpell ? 0x93c5fd : 0xfbbf24, 0.7);
      frameG.strokeRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 8);
      
      // Art window inner frame border
      frameG.lineStyle(1.5, isSpell ? 0x3b82f6 : 0x78350f, 1);
      frameG.strokeRoundedRect(this.artRect.x, this.artRect.y, this.artRect.width, this.artRect.height, 6);
      this.frame = frameG;
      this.add(frameG);
    }

    // 6. Title Nameplate Panel
    this.nameplateBg = this.scene.add.graphics();
    this.nameplateBg.fillStyle(isSpell ? 0x1e3a8a : 0x451a03, 0.85); // Dark blue / bronze-brown
    this.nameplateBg.fillRoundedRect(-w * 0.4, h * 0.08, w * 0.8, h * 0.14, 4);
    this.nameplateBg.lineStyle(1, isSpell ? 0x3b82f6 : 0x78350f, 1);
    this.nameplateBg.strokeRoundedRect(-w * 0.4, h * 0.08, w * 0.8, h * 0.14, 4);
    this.add(this.nameplateBg);

    // 7. High-DPI Title Text
    const fontRes = Math.max(1, Math.ceil(this.scene.cameras.main.zoom));
    this.nameText = this.scene.add.text(0, h * 0.14, this.config.name, {
      fontFamily: 'Georgia, serif',
      fontSize: `${isSpell ? 12 : 11}px`,
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setResolution(fontRes);
    this.add(this.nameText);

    // 8. Rules / Effect Panel Background (only for spells, or creatures with text)
    this.rulesBg = this.scene.add.graphics();
    this.rulesBg.fillStyle(0x0a0f1d, 0.75); // Dark slate
    this.rulesBg.fillRoundedRect(-w * 0.42, h * 0.24, w * 0.84, h * 0.22, 6);
    this.add(this.rulesBg);

    // 9. Rules Text
    this.rulesText = this.scene.add.text(0, h * 0.35, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      color: '#cbd5e1',
      align: 'center',
    }).setOrigin(0.5).setResolution(fontRes);
    this.add(this.rulesText);

    // Fit rules text dynamically to avoid vertical overflow
    this.fitRulesText(this.config.description, w * 0.78, h * 0.20);

    // 10. Badges
    const badgeFontRes = Math.max(1, Math.ceil(this.scene.cameras.main.zoom));
    this.badgeBg = this.scene.add.graphics();
    if (isSpell) {
      // Mana Gem badge in top-left
      this.badgeBg.fillStyle(0x1d4ed8, 1); // Blue gem
      this.badgeBg.fillCircle(-w * 0.38, -h * 0.38, 12);
      this.badgeBg.lineStyle(1.5, 0x60a5fa, 1);
      this.badgeBg.strokeCircle(-w * 0.38, -h * 0.38, 12);
      this.add(this.badgeBg);

      this.badgeText = this.scene.add.text(
        -w * 0.38,
        -h * 0.38,
        String(this.config.manaCost ?? 0),
        {
          fontFamily: 'Georgia, serif',
          fontSize: '13px',
          color: '#ffffff',
          fontStyle: 'bold',
        },
      ).setOrigin(0.5).setResolution(badgeFontRes);
      this.add(this.badgeText);
    } else {
      // CREATURE BADGES: Highly detailed, tactical, and clean stats layout

      // A. Top-Left (Squad Count banner)
      this.countBadgeBg = this.scene.add.graphics();
      this.countBadgeBg.fillStyle(0x2563eb, 1); // Royal blue
      this.countBadgeBg.fillCircle(-w * 0.38, -h * 0.38, 11);
      this.countBadgeBg.lineStyle(1.5, 0x60a5fa, 1);
      this.countBadgeBg.strokeCircle(-w * 0.38, -h * 0.38, 11);
      this.add(this.countBadgeBg);

      this.countBadgeText = this.scene.add.text(-w * 0.38, -h * 0.38, `x${this.config.count ?? 1}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '9px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5).setResolution(badgeFontRes);
      this.add(this.countBadgeText);

      // B. Top-Right (Level medallion)
      this.levelBadgeBg = this.scene.add.graphics();
      this.levelBadgeBg.fillStyle(0xd97706, 1); // Amber
      this.levelBadgeBg.fillCircle(w * 0.38, -h * 0.38, 11);
      this.levelBadgeBg.lineStyle(1.5, 0xfbbf24, 1);
      this.levelBadgeBg.strokeCircle(w * 0.38, -h * 0.38, 11);
      this.add(this.levelBadgeBg);

      this.levelBadgeText = this.scene.add.text(w * 0.38, -h * 0.38, `L${this.config.level ?? 1}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '9px',
        color: '#fcd34d',
        fontStyle: 'bold',
      }).setOrigin(0.5).setResolution(badgeFontRes);
      this.add(this.levelBadgeText);

      // C. Bottom-Left (Attack/Damage shield/sword)
      this.attackBadgeBg = this.scene.add.graphics();
      this.attackBadgeBg.fillStyle(0x991b1b, 1); // Deep red
      this.attackBadgeBg.fillCircle(-w * 0.36, h * 0.36, 11);
      this.attackBadgeBg.lineStyle(1.5, 0xfca5a5, 1);
      this.attackBadgeBg.strokeCircle(-w * 0.36, h * 0.36, 11);
      this.add(this.attackBadgeBg);

      this.attackBadgeText = this.scene.add.text(-w * 0.36, h * 0.36, String(this.config.attack ?? 0), {
        fontFamily: 'Georgia, serif',
        fontSize: '11px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5).setResolution(badgeFontRes);
      this.add(this.attackBadgeText);

      // D. Bottom-Right (HP shield/heart)
      this.hpBadgeBg = this.scene.add.graphics();
      this.hpBadgeBg.fillStyle(0x065f46, 1); // Deep emerald
      this.hpBadgeBg.fillCircle(w * 0.36, h * 0.36, 11);
      this.hpBadgeBg.lineStyle(1.5, 0x6ee7b7, 1);
      this.hpBadgeBg.strokeCircle(w * 0.36, h * 0.36, 11);
      this.add(this.hpBadgeBg);

      const cur = this.config.currentHp ?? this.config.maxHp ?? 0;
      const mx = this.config.maxHp ?? 0;
      const hpTextStr = `${cur}/${mx}`;

      this.hpBadgeText = this.scene.add.text(w * 0.36, h * 0.36, hpTextStr, {
        fontFamily: 'Georgia, serif',
        fontSize: '9px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5).setResolution(badgeFontRes);
      this.add(this.hpBadgeText);
    }

    // Initialize native filters once lazily
    this.applyPhaser4Filters();
  }

  private applyPhaser4Filters(): void {
    this.imageFilters = [];
    try {
      const targets = [this.frame, this.art].filter(
        (t): t is Phaser.GameObjects.Image => t instanceof Phaser.GameObjects.Image
      );

      for (const img of targets) {
        // 1. Enable filters system on image
        if (typeof img.enableFilters === 'function') {
          img.enableFilters();
        }

        // 2. Add Glow filter.
        // We choose img.filters.external for Glow because an outer glow
        // needs to extend beyond the image's bounding box/silhouette cleanly
        // without being clipped by the internal texture container.
        let glow: unknown = null;
        const imgFilters = img.filters as unknown as {
          external?: { addGlow?: () => unknown };
          internal?: { addGlow?: () => unknown; addColorMatrix?: () => unknown };
        };
        if (imgFilters?.external && typeof imgFilters.external.addGlow === 'function') {
          glow = imgFilters.external.addGlow();
        } else if (imgFilters?.internal && typeof imgFilters.internal.addGlow === 'function') {
          glow = imgFilters.internal.addGlow();
        }

        if (glow) {
          (glow as { setActive: (v: boolean) => void }).setActive(false);
        }

        // 3. Add ColorMatrix filter.
        // We choose img.filters.internal for ColorMatrix because desaturation
        // and brightness corrections are per-pixel calculations that are best done
        // internally before any external rendering overlays are applied.
        let colorMatrix: unknown = null;
        if (imgFilters?.internal && typeof imgFilters.internal.addColorMatrix === 'function') {
          colorMatrix = imgFilters.internal.addColorMatrix();
        }

        if (colorMatrix) {
          (colorMatrix as { setActive: (v: boolean) => void }).setActive(false);
        }

        if (img && glow && colorMatrix) {
          this.imageFilters.push({
            target: img,
            glow: glow as CardImageFilters['glow'],
            colorMatrix: colorMatrix as CardImageFilters['colorMatrix'],
          });
        }
      }
    } catch {
      // Safe fallback if filters are unsupported by the renderer or Phaser version
    }
  }

  private setupInteractions(): void {
    this.on('pointerdown', () => {
      if (this.visualState === 'HOVER' || this.visualState === 'PLAYABLE') {
        // Quick visual click squish effect (briefly decrease scale by 4%)
        const scaleTween = this.scene.tweens.add({
          targets: this,
          scaleX: this.scaleX * 0.96,
          scaleY: this.scaleY * 0.96,
          duration: 60,
          yoyo: true,
          ease: 'Quad.Out',
        });
        this.setData('clickTween', scaleTween);
      }
    });
  }

  /**
   * Helper method implementing a deterministic font fitting strategy
   * to guarantee rules and description text never overflow card bounds.
   */
  public fitRulesText(text: string, maxWidth: number, maxHeight: number): void {
    if (!this.rulesText) return;

    this.rulesText.setText(text);
    this.rulesText.setWordWrapWidth(maxWidth);

    // Font-size scaling steps
    const sizes = [10, 9, 8];
    for (const size of sizes) {
      this.rulesText.setFontSize(`${size}px`);
      if (this.rulesText.height <= maxHeight) {
        break;
      }
    }
  }

  /**
   * Evaluates if a given world coordinate falls inside the card's RESTING bounds.
   * Completely independent of any active hover lift or zoom scale.
   */
  public containsWorldPoint(worldX: number, worldY: number): boolean {
    // 1. Translate point relative to rest position
    const dx = worldX - this.restX;
    const dy = worldY - this.restY;

    // 2. Rotate point backwards by rest angle
    const cos = Math.cos(-this.restRotation);
    const sin = Math.sin(-this.restRotation);
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;

    // 3. Scale point backwards by rest scale
    const sx = lx / this.restScale;
    const sy = ly / this.restScale;

    // 4. Check within bounding box of card
    const w = this.widthVal;
    const h = this.heightVal;
    return sx >= -w / 2 && sx <= w / 2 && sy >= -h / 2 && sy <= h / 2;
  }

  /**
   * Sets explicit resting transform data of the card for predictable hit testing.
   */
  public setRestTransform(x: number, y: number, rotation: number, scale: number): void {
    this.restX = x;
    this.restY = y;
    this.restRotation = rotation;
    this.restScale = scale;
  }

  /**
   * Updates dynamic card content (e.g. soldier counts, description texts, deployed states, and tactical stats)
   * on the fly, instantly refreshing the actual GameObjects and text overlays.
   */
  public updateDynamicContent(dynamic: {
    count?: number;
    description?: string;
    isDeployed?: boolean;
    currentHp?: number;
    maxHp?: number;
    attack?: number;
    level?: number;
  }): void {
    if (dynamic.count !== undefined) {
      if (this.countBadgeText) {
        this.countBadgeText.setText(`x${dynamic.count}`);
      }
    }

    if (dynamic.currentHp !== undefined || dynamic.maxHp !== undefined) {
      if (dynamic.currentHp !== undefined) this.config.currentHp = dynamic.currentHp;
      if (dynamic.maxHp !== undefined) this.config.maxHp = dynamic.maxHp;
      if (this.hpBadgeText) {
        const cur = this.config.currentHp ?? this.config.maxHp ?? 0;
        const mx = this.config.maxHp ?? 0;
        this.hpBadgeText.setText(`${cur}/${mx}`);
      }
    }

    if (dynamic.attack !== undefined) {
      if (this.attackBadgeText) {
        this.attackBadgeText.setText(String(dynamic.attack));
      }
    }

    if (dynamic.level !== undefined) {
      if (this.levelBadgeText) {
        this.levelBadgeText.setText(`L${dynamic.level}`);
      }
    }

    if (dynamic.description !== undefined) {
      this.fitRulesText(dynamic.description, this.widthVal * 0.78, this.heightVal * 0.20);
    }

    if (dynamic.isDeployed !== undefined) {
      this.config.isDeployed = dynamic.isDeployed;
      this.setVisualState(dynamic.isDeployed ? 'DEPLOYED' : 'IDLE');
    }
  }

  public setVisualState(state: CardVisualState): void {
    this.visualState = state;

    // 1. Playable or Hover outer glow (Back glow Graphics outline fallback)
    if (state === 'HOVER') {
      this.playGlow.setVisible(true);
      this.playGlow.lineStyle(4, 0xfca5a5, 0.9); // lighter highlight
      this.shadow.setScale(1.1);
      this.shadow.setAlpha(0.6); // larger, softer shadow
    } else if (state === 'PLAYABLE') {
      this.playGlow.setVisible(true);
      this.playGlow.lineStyle(4, 0x60a5fa, 0.8); // soft playable blue glow
      this.shadow.setScale(1.0);
      this.shadow.setAlpha(0.4);
    } else if (state === 'SELECTED') {
      this.playGlow.setVisible(true);
      this.playGlow.lineStyle(4, 0xfbbf24, 0.9); // golden selected glow
      this.shadow.setScale(1.0);
      this.shadow.setAlpha(0.4);
    } else {
      this.playGlow.setVisible(false);
      this.shadow.setScale(1.0);
      this.shadow.setAlpha(0.4);
    }

    // 2. Dynamic Update/Reuse of stored native Phaser 4 filters
    try {
      for (const binding of this.imageFilters) {
        // Reset both filters to inactive/clean state by default
        binding.glow.setActive(false);
        binding.colorMatrix.setActive(false);

        if (state === 'PLAYABLE') {
          // Playable state: moderate blue/cyan glow halo
          binding.glow.setActive(true);
          binding.glow.color = 0x60a5fa;
          binding.glow.outerStrength = 10;
          binding.glow.innerStrength = 0;
        } else if (state === 'HOVER') {
          // Hover state: slightly stronger outer glow of same color family
          binding.glow.setActive(true);
          binding.glow.color = 0xfca5a5; // lighter arcane pinkish glow
          binding.glow.outerStrength = 16;
          binding.glow.innerStrength = 0;
        } else if (state === 'SELECTED') {
          // Selected state: gold/amber glow with medium emphasis
          binding.glow.setActive(true);
          binding.glow.color = 0xfbbf24;
          binding.glow.outerStrength = 12;
          binding.glow.innerStrength = 0;
        } else if (state === 'DISABLED') {
          // Disabled state: desaturated and slightly dimmed, reset first to prevent accumulation
          binding.colorMatrix.setActive(true);
          binding.colorMatrix.reset();
          binding.colorMatrix.desaturate();
          binding.colorMatrix.brightness(0.65);
        } else if (state === 'DEPLOYED') {
          // Deployed state: milder desaturation and brightness correction, reset first to prevent accumulation
          binding.colorMatrix.setActive(true);
          binding.colorMatrix.reset();
          binding.colorMatrix.desaturate();
          binding.colorMatrix.brightness(0.85);
        }
      }
    } catch {
      // Safe fallback if runtime properties differ or procedurals are active
    }

    // 3. Fallback alpha overlay adjustments
    if (state === 'DISABLED' || state === 'DEPLOYED') {
      this.setAlpha(state === 'DEPLOYED' ? 0.7 : 0.55);
    } else {
      this.setAlpha(1.0);
    }
  }

  public getVisualState(): CardVisualState {
    return this.visualState;
  }

  // Update position override to also update geometry mask position cleanly
  public updateMaskGeometry(): void {
    const mask = this.getData('maskGraphics') as Phaser.GameObjects.Graphics;
    if (mask) {
      mask.setPosition(this.x, this.y);
      mask.setScale(this.scaleX, this.scaleY);
      mask.setAngle(this.angle);
    }
  }

  destroy(fromScene?: boolean): void {
    const mask = this.getData('maskGraphics') as Phaser.GameObjects.Graphics;
    if (mask) {
      mask.destroy();
    }
    const clickTween = this.getData('clickTween') as Phaser.Tweens.Tween;
    if (clickTween) {
      clickTween.destroy();
    }

    // Clean up filter references
    this.imageFilters = [];

    super.destroy(fromScene);
  }
}

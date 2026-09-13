import Phaser from 'phaser';

export type CardVisualState =
  | 'IDLE'
  | 'HOVER'
  | 'PLAYABLE'
  | 'DISABLED'
  | 'SELECTED'
  | 'DRAGGING'
  | 'DEPLOYED';

export const CARD_WIDTH = 104;
export const CARD_HEIGHT = 146.25;

export interface CardViewConfig {
  instanceId: string;
  contentId: string;
  name: string;
  description: string;
  manaCost?: number;
  count?: number;
  isDeployed?: boolean;
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
  protected badgeBg!: Phaser.GameObjects.Graphics;
  protected badgeText!: Phaser.GameObjects.Text;
  protected playGlow!: Phaser.GameObjects.Graphics;

  protected visualState: CardVisualState = 'IDLE';
  protected widthVal: number;
  protected heightVal: number;

  protected artBaseX: number = 0;
  protected artBaseY: number = 0;

  protected glowFilter: unknown = null;
  protected colorMatrixFilter: unknown = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    public readonly config: CardViewConfig,
    public readonly cardType: 'SPELL' | 'CREATURE',
    public readonly isBench: boolean = false,
  ) {
    super(scene, x, y);
    
    this.widthVal = isBench ? 88 : CARD_WIDTH;
    this.heightVal = isBench ? 123.75 : CARD_HEIGHT;

    this.setSize(this.widthVal, this.heightVal);

    this.artBaseX = 0;
    this.artBaseY = -this.heightVal * 0.16;

    this.createHierarchy();
    this.setVisualState('IDLE');

    // Make the entire container interactive with a rectangular hit area matching card bounds
    this.setInteractive(
      new Phaser.Geom.Rectangle(-this.widthVal / 2, -this.heightVal / 2, this.widthVal, this.heightVal),
      Phaser.Geom.Rectangle.Contains,
    );

    this.setupInteractions();
    scene.add.existing(this);
  }

  private createHierarchy(): void {
    const w = this.widthVal;
    const h = this.heightVal;

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
    const isSpell = this.cardType === 'SPELL';
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

    const artX = -w * 0.38;
    const artY = -h * 0.38;
    const artW = w * 0.76;
    const artH = h * 0.44;

    const artKey = isSpell
      ? `card-art-spell-${this.config.contentId}`
      : `card-art-creature-${this.config.contentId}`;

    if (this.scene.textures.exists(artKey)) {
      const artImg = this.scene.add.image(this.artBaseX, this.artBaseY, artKey);
      
      // Real Aspect-ratio Cover/Crop calculation
      const scale = Math.max(artW / artImg.width, artH / artImg.height);
      artImg.setScale(scale);
      
      this.art = artImg;
      this.artContainer.add(artImg);
    } else {
      // Procedural fallback artwork
      const artG = this.scene.add.graphics();
      artG.fillStyle(isSpell ? 0x1d4ed8 : 0x7c2d12, 1);
      artG.fillRoundedRect(artX, artY, artW, artH, 6);
      
      // Draw procedural magic symbol or shield centered at slot base Y
      artG.lineStyle(1.5, isSpell ? 0x60a5fa : 0xf97316, 0.6);
      if (isSpell) {
        artG.strokeCircle(this.artBaseX, this.artBaseY, artW * 0.2);
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

    // Apply geometry masking to the artwork container
    const maskGraphics = this.scene.make.graphics({ x: this.x, y: this.y }, false);
    maskGraphics.fillStyle(0xffffff, 1);
    maskGraphics.fillRoundedRect(artX, artY, artW, artH, 6);
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
      frameG.strokeRoundedRect(artX, artY, artW, artH, 6);
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
      fontSize: `${this.isBench ? 8 : 9}px`,
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setResolution(fontRes);
    this.add(this.nameText);

    // 8. Rules / Effect Panel Background
    this.rulesBg = this.scene.add.graphics();
    this.rulesBg.fillStyle(0x0a0f1d, 0.75); // Dark slate
    this.rulesBg.fillRoundedRect(-w * 0.42, h * 0.26, w * 0.84, h * 0.20, 6);
    this.add(this.rulesBg);

    // 9. Rules Text
    this.rulesText = this.scene.add.text(0, h * 0.36, this.config.description, {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${this.isBench ? 7 : 8}px`,
      color: '#cbd5e1',
      wordWrap: { width: w * 0.78 },
      align: 'center',
    }).setOrigin(0.5).setResolution(fontRes);
    this.add(this.rulesText);

    // 10. Badges (Top-left Mana cost for Spells, Bottom-left Count for Creatures)
    this.badgeBg = this.scene.add.graphics();
    if (isSpell) {
      // Mana Gem badge in top-left
      this.badgeBg.fillStyle(0x1d4ed8, 1); // Blue gem
      this.badgeBg.fillCircle(-w * 0.38, -h * 0.38, this.isBench ? 10 : 12);
      this.badgeBg.lineStyle(1.5, 0x60a5fa, 1);
      this.badgeBg.strokeCircle(-w * 0.38, -h * 0.38, this.isBench ? 10 : 12);
      this.add(this.badgeBg);

      this.badgeText = this.scene.add.text(
        -w * 0.38,
        -h * 0.38,
        String(this.config.manaCost ?? 0),
        {
          fontFamily: 'Georgia, serif',
          fontSize: `${this.isBench ? 10 : 12}px`,
          color: '#ffffff',
          fontStyle: 'bold',
        },
      ).setOrigin(0.5).setResolution(fontRes);
      this.add(this.badgeText);
    } else {
      // Soldier count badge in bottom-left
      this.badgeBg.fillStyle(0x451a03, 1); // bronze border shield
      const bx = -w * 0.34;
      const by = h * 0.34;
      const br = this.isBench ? 8 : 10;
      
      this.badgeBg.fillCircle(bx, by, br);
      this.badgeBg.lineStyle(1.5, 0xd97706, 1);
      this.badgeBg.strokeCircle(bx, by, br);
      this.add(this.badgeBg);

      this.badgeText = this.scene.add.text(
        bx,
        by,
        `x${this.config.count ?? 1}`,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: `${this.isBench ? 8 : 9}px`,
          color: '#fcd34d', // yellow-300
          fontStyle: 'bold',
        },
      ).setOrigin(0.5).setResolution(fontRes);
      this.add(this.badgeText);
    }

    // Initialize native filters once lazily
    this.applyPhaser4Filters();
  }

  private applyPhaser4Filters(): void {
    try {
      const targets = [this.frame, this.art].filter((t): t is Phaser.GameObjects.Image => t instanceof Phaser.GameObjects.Image);
      for (const img of targets) {
        const imgWithFilters = img as unknown as {
          enableFilters?: () => void;
          filters?: { glow?: unknown; colorMatrix?: unknown };
        };
        if (typeof imgWithFilters.enableFilters === 'function') {
          imgWithFilters.enableFilters();
          
          if (!this.glowFilter && imgWithFilters.filters?.glow) {
            this.glowFilter = imgWithFilters.filters.glow;
          }
          if (!this.colorMatrixFilter && imgWithFilters.filters?.colorMatrix) {
            this.colorMatrixFilter = imgWithFilters.filters.colorMatrix;
          }
        }
      }
    } catch {
      // Safe fallback
    }
  }

  private setupInteractions(): void {
    this.on('pointerover', () => {
      if (this.visualState !== 'DISABLED') {
        this.setVisualState('HOVER');
      }
    });

    this.on('pointerout', () => {
      if (this.visualState !== 'DISABLED') {
        this.setVisualState(this.config.isDeployed ? 'DEPLOYED' : 'IDLE');
      }
      
      // Reset artwork shift smoothly back to base position on pointerout
      if (this.art) {
        this.scene.tweens.killTweensOf(this.art);
        this.scene.tweens.add({
          targets: this.art,
          x: this.artBaseX,
          y: this.artBaseY,
          duration: 120,
          ease: 'Quad.Out',
        });
      }
    });

    this.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.visualState === 'HOVER') {
        // Convert world/screen pointer position into CardView-local coordinates via Matrix Inversion
        const matrix = this.getWorldTransformMatrix();
        const localPoint = matrix.applyInverse(pointer.worldX, pointer.worldY);

        const halfW = this.widthVal / 2;
        const halfH = this.heightVal / 2;

        const normalizedX = Phaser.Math.Clamp(localPoint.x / halfW, -1, 1);
        const normalizedY = Phaser.Math.Clamp(localPoint.y / halfH, -1, 1);

        const px = normalizedX * 2.5; // max +-2.5 px
        const py = normalizedY * 1.5; // max +-1.5 px

        if (this.art) {
          this.art.setPosition(this.artBaseX + px, this.artBaseY + py);
        }
      }
    });

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
   * Updates dynamic card content (e.g. soldier counts, description texts, deployed states)
   * on the fly, instantly refreshing the actual GameObjects and text overlays.
   */
  public updateDynamicContent(dynamic: {
    count?: number;
    description?: string;
    isDeployed?: boolean;
  }): void {
    if (dynamic.count !== undefined) {
      if (this.badgeText) {
        this.badgeText.setText(this.cardType === 'CREATURE' ? `x${dynamic.count}` : String(dynamic.count));
      }
    }

    if (dynamic.description !== undefined) {
      if (this.rulesText) {
        this.rulesText.setText(dynamic.description);
      }
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

    // 2. Playable & Hover effects via Phaser 4 native filter triggers (if supported/practical)
    try {
      if (this.glowFilter) {
        const glow = this.glowFilter as { enable: () => void; disable: () => void; radius: number; color: number };
        if (state === 'HOVER') {
          glow.enable();
          glow.radius = 16;
          glow.color = 0xfca5a5; // lighter
        } else if (state === 'PLAYABLE') {
          glow.enable();
          glow.radius = 10;
          glow.color = 0x60a5fa; // blue
        } else if (state === 'SELECTED') {
          glow.enable();
          glow.radius = 12;
          glow.color = 0xfbbf24; // golden
        } else {
          glow.disable();
        }
      }

      if (this.colorMatrixFilter) {
        const matrix = this.colorMatrixFilter as { enable: () => void; disable: () => void; desaturate: () => void; brightness: (v: number) => void };
        if (state === 'DISABLED') {
          matrix.enable();
          matrix.desaturate();
          matrix.brightness(0.65);
        } else if (state === 'DEPLOYED') {
          matrix.enable();
          matrix.desaturate();
          matrix.brightness(0.85); // milder desat for deployed
        } else {
          matrix.disable();
        }
      }
    } catch {
      // Safe fallback
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
    super.destroy(fromScene);
  }
}

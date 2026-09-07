import Phaser from 'phaser';

import avatarUrl from '../../assets/avatar1.png';
import armyIconUrl from '../../assets/icons/army.png';
import manaIconUrl from '../../assets/icons/mana.png';
import goldIconUrl from '../../assets/icons/gold.png';
import { createInitialRunState } from '../game/core/RunState';
import { GameMap } from '../game/map/GameMap';
import { endDay } from '../game/systems/TurnSystem';

const CELL_SIZE = 56;
const CELL_GAP = 4;
const RESOURCE_ICONS = [
  { resource: 'army', label: 'Army', key: 'icon_army', url: armyIconUrl },
  { resource: 'mana', label: 'Mana', key: 'icon_mana', url: manaIconUrl },
  { resource: 'gold', label: 'Gold', key: 'icon_gold', url: goldIconUrl },
] as const;

export class MapScene extends Phaser.Scene {
  private readonly map = new GameMap();
  private readonly runState = createInitialRunState();
  private cells: Phaser.GameObjects.Rectangle[][] = [];
  private playerImage!: Phaser.GameObjects.Image;
  private dayText!: Phaser.GameObjects.Text;
  private actionsText!: Phaser.GameObjects.Text;
  private resourceTexts: Phaser.GameObjects.Text[] = [];
  private endDayButton!: Phaser.GameObjects.Text;
  private transitionPanel!: Phaser.GameObjects.Container;
  private startX = 0;
  private startY = 0;

  constructor() {
    super('map');
  }

  preload(): void {
    this.load.image('player-avatar', avatarUrl);
    for (const icon of RESOURCE_ICONS) {
      if (!this.textures.exists(icon.key)) {
        this.load.image(icon.key, icon.url);
      }
    }
  }

  create(): void {
    const { centerX, centerY } = this.cameras.main;
    const cellStep = CELL_SIZE + CELL_GAP;
    const gridWidth = this.map.width * cellStep - CELL_GAP;
    const gridHeight = this.map.height * cellStep - CELL_GAP;
    this.startX = centerX - gridWidth / 2 + CELL_SIZE / 2;
    this.startY = centerY - gridHeight / 2 + CELL_SIZE / 2;

    this.dayText = this.add.text(32, 24, '', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#ffffff',
      fontStyle: 'bold',
    });

    this.actionsText = this.add
      .text(960 - 32, 24, '', {
        fontSize: '20px',
        fontFamily: 'monospace',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0);

    this.resourceTexts = RESOURCE_ICONS.map((icon, index) => {
      const x = 240 + index * 152;
      const image = this.add.image(x, 40, icon.key);
      image.setScale(32 / Math.max(image.width, image.height));
      this.add.text(x + 24, 12, icon.label, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#cbd5e1',
      });
      return this.add
        .text(x + 24, 40, '', {
          fontFamily: 'monospace',
          fontSize: '20px',
          fontStyle: 'bold',
          color: '#ffffff',
        })
        .setOrigin(0, 0.5);
    });

    this.cells = [];

    for (let y = 0; y < this.map.height; y += 1) {
      this.cells[y] = [];
      for (let x = 0; x < this.map.width; x += 1) {
        const tile = this.map.getTile({ x, y });

        if (!tile) {
          continue;
        }

        const screenX = this.startX + x * cellStep;
        const screenY = this.startY + y * cellStep;

        const rect = this.add
          .rectangle(screenX, screenY, CELL_SIZE, CELL_SIZE, 0x263244)
          .setStrokeStyle(2, 0x64748b);

        rect.setData('coords', { x, y });
        this.cells[y][x] = rect;

        if (tile.type === 'gold') {
          this.add.image(screenX, screenY, 'icon_gold').setDisplaySize(32, 32);
        } else if (tile.type === 'mana') {
          this.add.image(screenX, screenY, 'icon_mana').setDisplaySize(32, 32);
        } else if (tile.type === 'army') {
          this.add.image(screenX, screenY, 'icon_army').setDisplaySize(32, 32);
        }

        // Enable Interactivity
        rect.setInteractive();

        rect.on('pointerover', () => {
          const coords = rect.getData('coords') as { x: number; y: number };
          if (this.map.canMove(coords, this.runState)) {
            // Stronger highlight when hovering a valid destination
            rect.setFillStyle(0x3b82f6); // bright blue
            rect.setStrokeStyle(2, 0x93c5fd); // sky blue border
            this.input.setDefaultCursor('pointer');
          } else {
            this.input.setDefaultCursor('default');
          }
        });

        rect.on('pointerout', () => {
          const coords = rect.getData('coords') as { x: number; y: number };
          this.input.setDefaultCursor('default');
          this.updateCellVisuals(coords.x, coords.y);
        });

        rect.on('pointerdown', () => {
          const coords = rect.getData('coords') as { x: number; y: number };
          if (this.map.movePlayer(coords, this.runState)) {
            // Player successfully moved! Update Phaser visual, refresh all cell highlights, and update HUD
            this.updatePlayerVisualPosition();
            this.refreshAllCellVisuals();
            this.updateHUD();
          }
        });
      }
    }

    // Render player logical position on top of the correct map tile.
    const playerPos = this.map.getPlayerPosition();
    const playerX = this.startX + playerPos.x * cellStep;
    const playerY = this.startY + playerPos.y * cellStep;

    this.playerImage = this.add
      .image(playerX, playerY, 'player-avatar')
      .setDisplaySize(CELL_SIZE, CELL_SIZE)
      .setDepth(1);

    this.endDayButton = this.add
      .text(centerX, 492, 'END DAY', {
        fontFamily: 'monospace',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#9a3412',
        padding: { x: 24, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        endDay(this.runState);
        this.refreshPhaseVisuals();
      });

    this.transitionPanel = this.add
      .container(centerX, centerY, [
        this.add
          .rectangle(0, 0, 440, 144, 0x111827, 0.98)
          .setStrokeStyle(2, 0xea580c),
        this.add
          .text(0, -30, `DAY ${this.runState.day} ENDS`, {
            fontFamily: 'monospace',
            fontSize: '28px',
            fontStyle: 'bold',
            color: '#ffffff',
          })
          .setOrigin(0.5),
        this.add
          .text(0, 28, 'The Duskborn approaches.', {
            fontFamily: 'monospace',
            fontSize: '20px',
            color: '#fed7aa',
          })
          .setOrigin(0.5),
      ])
      .setDepth(2)
      .setVisible(false);

    this.refreshPhaseVisuals();
    this.updateHUD();
  }

  private refreshPhaseVisuals(): void {
    const exploring = this.runState.phase === 'exploration';
    for (const row of this.cells) {
      for (const cell of row) {
        if (exploring) {
          cell.setInteractive();
        } else {
          cell.disableInteractive();
        }
      }
    }

    if (!exploring) {
      this.endDayButton.disableInteractive().setAlpha(0.4);
      this.input.setDefaultCursor('default');
      this.tweens.killTweensOf(this.playerImage);
      const position = this.map.getPlayerPosition();
      this.playerImage.setPosition(
        this.startX + position.x * (CELL_SIZE + CELL_GAP),
        this.startY + position.y * (CELL_SIZE + CELL_GAP),
      );
    }
    this.transitionPanel.setVisible(!exploring);
    this.refreshAllCellVisuals();
  }

  private updateCellVisuals(x: number, y: number): void {
    const rect = this.cells[y]?.[x];
    if (!rect) {
      return;
    }

    const coords = { x, y };
    if (this.map.canMove(coords, this.runState)) {
      // Valid destination: subtle highlight
      rect.setFillStyle(0x1e3a8a); // navy blue
      rect.setStrokeStyle(2, 0x3b82f6); // bright blue border
    } else {
      // Neutral cell
      rect.setFillStyle(0x263244); // neutral slate
      rect.setStrokeStyle(2, 0x64748b); // neutral gray-blue border
    }
  }

  private refreshAllCellVisuals(): void {
    for (let y = 0; y < this.map.height; y += 1) {
      for (let x = 0; x < this.map.width; x += 1) {
        this.updateCellVisuals(x, y);
      }
    }
  }

  private updatePlayerVisualPosition(): void {
    const cellStep = CELL_SIZE + CELL_GAP;
    const playerPos = this.map.getPlayerPosition();
    const playerX = this.startX + playerPos.x * cellStep;
    const playerY = this.startY + playerPos.y * cellStep;

    // Fast and responsive movement tween
    this.tweens.add({
      targets: this.playerImage,
      x: playerX,
      y: playerY,
      duration: 150,
      ease: 'Power2.easeOut',
    });
  }

  private updateHUD(): void {
    RESOURCE_ICONS.forEach((icon, index) => {
      this.resourceTexts[index].setText(
        String(this.runState.resources[icon.resource]),
      );
    });

    // Day display
    this.dayText.setText(`DAY ${this.runState.day}`);

    // Action points display: filled dots (●) and empty dots (○)
    const total = this.runState.baseActionPoints;
    const remaining = this.runState.actionPoints;

    let dots = '';
    for (let i = 0; i < total; i += 1) {
      if (i < remaining) {
        dots += '● ';
      } else {
        dots += '○ ';
      }
    }

    dots = dots.trim();
    this.actionsText.setText(`Actions: ${dots}`);
  }
}

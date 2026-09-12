import Phaser from 'phaser';
import {
  canConfirmAttack,
  confirmAttack,
  playSpell,
  tryUseAbility,
  type CombatState,
} from '../game/combat/CombatState';
import { ABILITY_REGISTRY } from '../game/content/abilities';
import { SPELL_REGISTRY } from '../game/content/spells';
import { UNIT_REGISTRY } from '../game/content/unitTypes';

/** Compact phase-driven controls. Domain operations own all action legality. */
export class CombatActionPanel {
  private visuals: Phaser.GameObjects.GameObject[] = [];
  private handPage = 0;

  constructor(
    private scene: Phaser.Scene,
    private refresh: () => void,
  ) {}

  clear(): void {
    this.visuals.forEach((visual) => visual.destroy());
    this.visuals = [];
  }

  render(state: CombatState): void {
    this.clear();
    const player = state.activeSide === 'player';
    const interactive = player && state.phase === 'ACTION';
    const squads = (player ? state.playerSquads : state.enemySquads).filter(
      (s) => s.count > 0,
    );
    const selections = player
      ? state.selectedPlayerAbilities
      : state.selectedEnemyAbilities;
    const mana = player ? state.playerMana : state.enemyMana;
    let y = 140;
    this.text(y, `Mana: ${mana.current} / ${mana.max}`, '#93c5fd');
    y += 24;
    for (const squad of squads) {
      const unit = UNIT_REGISTRY.get(squad.unitTypeId);
      this.text(y, `${unit?.name ?? squad.unitTypeId} x${squad.count}`);
      y += 20;
      const selected = selections[squad.unitTypeId];
      if (interactive && selected === undefined) {
        for (const id of unit?.abilities ?? []) {
          const ability = ABILITY_REGISTRY.get(id);
          if (!ability) continue;
          this.button(y, `${ability.name} (${ability.manaCost} Mana)`, () => {
            if (!this.canPlayerAct(state)) return;
            const success = tryUseAbility(
              state,
              'player',
              squad.unitTypeId,
              id,
            );
            this.refresh();
            if (!success)
              this.feedback('Ability unavailable / insufficient Mana.');
          });
          y += 23;
        }
      } else {
        this.text(
          y,
          `Selected: ${ABILITY_REGISTRY.get(selected)?.name ?? 'None'}`,
          '#86efac',
        );
        y += 46;
      }
      y += 8;
    }

    if (interactive) {
      this.text(y, 'Spell hand');
      y += 21;
      const hand = state.playerDeck.hand;
      const pages = Math.max(1, Math.ceil(hand.length / 3));
      this.handPage = Math.min(this.handPage, pages - 1);
      for (const id of hand.slice(this.handPage * 3, this.handPage * 3 + 3)) {
        const spell = SPELL_REGISTRY.get(id);
        this.button(
          y,
          `${spell?.name ?? id} (${spell?.manaCost ?? '?'} Mana)`,
          () => {
            if (!this.canPlayerAct(state)) return;
            const success = playSpell(state, 'player', id);
            this.refresh();
            if (!success)
              this.feedback('Spell unavailable / insufficient Mana.');
          },
        );
        y += 23;
      }
      if (hand.length === 0) this.text(y, 'No spells in hand', '#94a3b8');
      if (pages > 1) {
        this.button(y, `Hand ${this.handPage + 1}/${pages} - Next`, () => {
          if (!this.canPlayerAct(state)) return;
          this.handPage = (this.handPage + 1) % pages;
          this.refresh();
        });
      }
      this.button(
        470,
        'Confirm Attack',
        () => {
          if (!this.canPlayerAct(state)) return;
          if (confirmAttack(state)) this.refresh();
          else this.feedback('Select an ability for every surviving squad.');
        },
        canConfirmAttack(state) ? 0xea580c : 0x334155,
      );
    } else {
      this.text(
        y,
        state.phase === 'RESOLUTION'
          ? 'Attack confirmed.\nResolution pending.'
          : player
            ? `Phase: ${state.phase}`
            : 'Duskborn turn.',
        '#94a3b8',
      );
    }
  }

  private canPlayerAct(state: CombatState): boolean {
    return state.activeSide === 'player' && state.phase === 'ACTION';
  }

  private text(
    y: number,
    label: string,
    color = '#f1f5f9',
  ): Phaser.GameObjects.Text {
    const text = this.scene.add
      .text(704, y, label, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color,
        wordWrap: { width: 212 },
      })
      .setResolution(Math.max(1, Math.ceil(this.scene.cameras.main.zoom)));
    this.visuals.push(text);
    return text;
  }

  private button(
    y: number,
    label: string,
    action: () => void,
    color = 0x1e3a8a,
  ): void {
    const bg = this.scene.add
      .rectangle(810, y + 10, 212, 21, color)
      .setStrokeStyle(1, 0x64748b)
      .setInteractive({ useHandCursor: true });
    bg.on('pointerdown', action);
    this.visuals.push(bg);
    this.text(y + 2, label);
  }

  private feedback(message: string): void {
    const text = this.scene.add
      .text(148, 444, message, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#fca5a5',
        backgroundColor: '#111827',
      })
      .setResolution(Math.max(1, Math.ceil(this.scene.cameras.main.zoom)));
    this.visuals.push(text);
  }
}

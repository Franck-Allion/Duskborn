import Phaser from 'phaser';
import {
  canConfirmAttack,
  tryUseAbility,
  chooseUnitTypeAbilityUnlock,
  getEffectiveAbilitiesForUnitType,
  type CombatState,
} from '../game/combat/CombatState';
import { canReturnToMap } from '../game/combat/CombatInteraction';
import type { RunState } from '../game/core/RunState';
import { ABILITY_REGISTRY } from '../game/content/abilities';
import { UNIT_REGISTRY } from '../game/content/unitTypes';
import {
  abilityEffectLabel,
  combatPhaseLabel,
  squadName,
} from './combatPresentation';

/** Phase-specific controls only; permanent tactical information belongs to the scene. */
export class CombatActionPanel {
  private visuals: Phaser.GameObjects.GameObject[] = [];
  private squadPage = 0;

  constructor(
    private scene: Phaser.Scene,
    private refresh: () => void,
    private commitAttack: () => boolean,
    private returnToMap: () => void,
  ) {}

  clear(): void {
    this.visuals.forEach((visual) => visual.destroy());
    this.visuals = [];
  }

  render(state: CombatState, run: RunState): void {
    this.clear();
    if (state.phase === 'VICTORY' || state.phase === 'DEFEAT') {
      this.renderResult(state, run);
      return;
    }
    if (!this.canPlayerAct(state)) {
      this.text(155, combatPhaseLabel(state), '#94a3b8');
      return;
    }

    // Browsing is presentation state; selections and availability come from the domain.
    const squads = state.playerSquads.filter((s) => s.count > 0);
    this.squadPage = Math.min(this.squadPage, Math.max(0, squads.length - 1));
    const squad = squads[this.squadPage];
    if (squad) {
      this.text(145, squadName(squad, run));
      if (squads.length > 1)
        this.button(
          165,
          `Squad ${this.squadPage + 1}/${squads.length} - Next`,
          () => {
            if (!this.canPlayerAct(state)) return;
            this.squadPage = (this.squadPage + 1) % squads.length;
            this.refresh();
          },
        );
      const selected = state.selectedPlayerAbilities[squad.unitTypeId];
      if (selected === undefined) {
        this.text(192, 'Select an ability', '#94a3b8');
        let y = 212;
        for (const id of getEffectiveAbilitiesForUnitType(
          state,
          'player',
          squad.unitTypeId,
        )) {
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
          200,
          `Selected: ${ABILITY_REGISTRY.get(selected)?.name ?? selected}`,
          '#86efac',
        );
        this.text(238, 'Locked for this turn.', '#94a3b8');
      }
    }

    this.button(
      470,
      'Confirm Attack',
      () => {
        if (!this.canPlayerAct(state)) return;
        if (!this.commitAttack())
          this.feedback('Select an ability for every surviving squad.');
      },
      canConfirmAttack(state) ? 0xea580c : 0x334155,
    );
  }

  private renderResult(state: CombatState, run: RunState): void {
    const victory = state.phase === 'VICTORY';
    const bg = this.scene.add
      .rectangle(810, 290, 220, 300, 0x172033)
      .setStrokeStyle(2, victory ? 0x4ade80 : 0xf87171);
    this.visuals.push(bg);
    this.text(
      155,
      victory ? 'VICTORY' : 'DEFEAT',
      victory ? '#4ade80' : '#f87171',
    );
    if (!victory) {
      this.text(195, 'Your hero has fallen.\nThe run is over.', '#fca5a5');
      return;
    }
    const choice = run.pendingAbilityUnlockChoices?.[0];
    if (choice) {
      const unit = UNIT_REGISTRY.get(choice.unitTypeId);
      const level = run.unitTypeProgression?.[choice.unitTypeId]?.level;
      this.text(
        185,
        `${unit?.name ?? choice.unitTypeId} Lv.${level ?? 1} - Level Up`,
        '#86efac',
      );
      this.text(220, 'Choose a new ability:');
      let y = 250;
      for (const id of choice.options) {
        const ability = ABILITY_REGISTRY.get(id);
        if (!ability) continue;
        this.button(y, `${ability.name} (${ability.manaCost} Mana)`, () => {
          if (
            state.phase !== 'VICTORY' ||
            run.pendingAbilityUnlockChoices?.[0] !== choice
          )
            return;
          const success = chooseUnitTypeAbilityUnlock(
            run,
            choice.unitTypeId,
            id,
          );
          this.refresh();
          if (!success) this.feedback('That ability choice is unavailable.');
        });
        this.text(y + 25, abilityEffectLabel(ability), '#cbd5e1');
        y += 80;
      }
      this.text(
        445,
        `${run.pendingAbilityUnlockChoices.length} choice(s) remaining`,
        '#94a3b8',
      );
    } else {
      this.text(
        200,
        'The Duskborn are defeated.\nYour surviving squads are ready to return.',
        '#cbd5e1',
      );
      if (canReturnToMap(state, run))
        this.button(
          470,
          'Return to Map',
          () => {
            if (canReturnToMap(state, run)) this.returnToMap();
          },
          0x10b981,
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

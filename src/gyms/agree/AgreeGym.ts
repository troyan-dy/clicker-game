import Phaser from 'phaser';
import { TICKETS } from '../../content/tickets';
import { logEvent, metrics } from '../../core/metrics';
import type { Rng } from '../../core/rng';
import { playSound, unlockSound } from '../../core/sound';
import tuningData from '../../data/tuning/agree.json';
import { createOverlay, type Overlay } from '../../debug/overlay';
import { createTuningPanel, type TuningPanel } from '../../debug/tuningPanel';
import {
  createAgree,
  pressAgree,
  stepAgree,
  thinkingProgress,
  type AgreeState,
  type AgreeTuning,
  type Approval,
} from '../../systems/agree/agree';
import { TERMINAL_SPOTS, type TerminalUi } from '../../ui/terminal/terminal';
import { Squares } from '../../view/squares';

const STEP = 1 / 60;
const MONEY_GREEN = 0x7cc68d;
const WINDOW = 3; // seconds the overlay rates are averaged over
const GYM_KEYS = new Set(['KeyR', 'Tab', 'KeyO', 'KeyP', 'KeyT', 'Digit1', 'Digit2']);
const NEWS = 'Местный разработчик третий день не открывал редактор. Коллеги ничего не заметили';

const HELP = `
  <h2>ГИМ M01 · СОГЛАСИЕ</h2>
  <p>Любая клавиша — «Да». Клод присылает запросы со своей скоростью, одно нажатие одобряет один.</p>
  <p><kbd>1</kbd>очередь запросов (как задумано)</p>
  <p><kbd>2</kbd>сравнение: каждое нажатие — «Да»</p>
  <p><kbd>Tab</kbd>настройки: скорость Клода и др.</p>
  <p><kbd>O</kbd>цифры: нажатия, согласия, вхолостую</p>
  <p><kbd>P</kbd>сохранить настройки</p>
  <p><kbd>T</kbd>замедление ×0,25</p>
  <p><kbd>R</kbd>начать заново</p>`;

/** M01 gym: the terminal, Claude's request queue and the «Да» key, with live tuning. */
export class AgreeGym extends Phaser.Scene {
  private readonly rng: Rng;
  private readonly ui: TerminalUi;
  private readonly showOverlay: boolean;
  private readonly tuning = { ...tuningData } as AgreeTuning;
  private state!: AgreeState;
  private squares!: Squares;
  private panel!: TuningPanel;
  private overlay!: Overlay;
  private acc = 0;
  private clock = 0;
  private slow = false;
  private shownMoney = 0;
  private payouts: { at: number; amount: number }[] = [];
  private pressTimes: number[] = [];
  private approveTimes: number[] = [];
  private wasteTimes: number[] = [];
  private taskTimes: number[] = [];

  constructor(rng: Rng, ui: TerminalUi, showOverlay: boolean) {
    super('agree');
    this.rng = rng;
    this.ui = ui;
    this.showOverlay = showOverlay;
  }

  create(): void {
    this.squares = new Squares(this, this.rng);
    this.ui.side.innerHTML = HELP;
    this.overlay = createOverlay(this.showOverlay);
    this.panel = createTuningPanel('M01', this.tuning, [
      { key: 'mode', options: ['queue', 'classic'] },
      { key: 'rate', min: 0.5, max: 20, step: 0.5 },
      { key: 'stepsPerTask', min: 1, max: 10, step: 1 },
      { key: 'pay', min: 1, max: 50, step: 1 },
      { key: 'buffer', min: 0, max: 5, step: 1 },
      { key: 'queueMax', min: 1, max: 30, step: 1 },
    ]);
    this.restart();

    window.addEventListener('keydown', (e) => this.onKey(e));
    window.addEventListener('pointerdown', (e) => {
      if (!(e.target as HTMLElement).closest('.lil-gui')) this.press();
    });
    window.__GAME__.ready = true;
  }

  update(_time: number, deltaMs: number): void {
    this.acc += Math.min(deltaMs / 1000, 0.25) * (this.slow ? 0.25 : 1);
    while (this.acc >= STEP) {
      this.step(STEP);
      this.acc -= STEP;
    }
    this.draw();
  }

  private restart(): void {
    this.state = createAgree(this.tuning);
    this.shownMoney = 0;
    this.payouts = [];
    this.pressTimes = [];
    this.approveTimes = [];
    this.wasteTimes = [];
    this.taskTimes = [];
  }

  private onKey(e: KeyboardEvent): void {
    if (e.repeat) return;
    if (!GYM_KEYS.has(e.code)) {
      this.press();
      return;
    }
    e.preventDefault();
    if (e.code === 'KeyR') this.restart();
    else if (e.code === 'Tab') this.panel.toggle();
    else if (e.code === 'KeyO') this.overlay.toggle();
    else if (e.code === 'KeyP') this.panel.dump();
    else if (e.code === 'KeyT') this.slow = !this.slow;
    else {
      this.tuning.mode = e.code === 'Digit2' ? 'classic' : 'queue';
      this.panel.refresh();
      logEvent(`mode_${this.tuning.mode}`);
    }
  }

  private press(): void {
    unlockSound();
    const { result, approval } = pressAgree(this.state, this.tuning);
    this.pressTimes.push(this.clock);
    this.ui.hit(result);
    if (approval) this.onApproved(approval);
    else if (result === 'buffered') playSound('buffer');
    else {
      this.wasteTimes.push(this.clock);
      playSound('waste');
    }
    metrics.presses = this.state.presses;
  }

  private onApproved(a: Approval): void {
    this.approveTimes.push(this.clock);
    this.squares.fly(TERMINAL_SPOTS.ask, TERMINAL_SPOTS.pips, 5, 0xd97757, 60, [0.16, 0.26]);
    if (!a.taskDone) {
      playSound('yes', a.pip);
      return;
    }
    playSound('task');
    logEvent('task_done');
    this.taskTimes.push(this.clock);
    this.squares.fly(TERMINAL_SPOTS.pips, TERMINAL_SPOTS.money, 24, MONEY_GREEN, 260, [0.4, 0.7]);
    this.payouts.push({ at: this.clock + 0.45, amount: this.tuning.pay });
    metrics.completed = true;
  }

  private step(dt: number): void {
    this.clock += dt;
    for (const a of stepAgree(this.state, this.tuning, dt)) {
      this.ui.hit('approved');
      this.onApproved(a);
    }
    while (this.payouts.length && this.payouts[0].at <= this.clock) {
      this.shownMoney += this.payouts.shift()!.amount;
    }
    this.squares.step(dt);
  }

  private rate(times: number[]): number {
    while (times.length && times[0] < this.clock - WINDOW) times.shift();
    return times.length / Math.min(WINDOW, Math.max(this.clock, 0.5));
  }

  private draw(): void {
    const s = this.state;
    const t = this.tuning;
    this.ui.render({
      money: this.shownMoney,
      ticket: TICKETS[s.tasks % TICKETS.length],
      pips: s.pips,
      stepsPerTask: t.stepsPerTask,
      pay: t.pay,
      queue: s.queue,
      buffered: s.buffered,
      thinking: thinkingProgress(s, t),
      rate: t.rate,
      classic: t.mode === 'classic',
      news: NEWS,
    });
    const presses = this.rate(this.pressTimes);
    const tasks = this.rate(this.taskTimes);
    this.overlay.set([
      `M01 согласие · режим ${t.mode}${this.slow ? ' · замедление' : ''}`,
      `нажатий/с   ${presses.toFixed(1)}   (всего ${s.presses})`,
      `согласий/с  ${this.rate(this.approveTimes).toFixed(1)}   Клод шлёт ${t.rate.toFixed(1)}/с`,
      `вхолостую   ${this.rate(this.wasteTimes).toFixed(1)}/с  (всего ${s.wasted})`,
      `задач/с     ${tasks.toFixed(2)}   $/мин ${(tasks * t.pay * 60).toFixed(0)}`,
      `очередь     ${s.queue}/${t.queueMax}   «Да» заранее ${s.buffered}/${t.buffer}`,
      `fps         ${this.game.loop.actualFps.toFixed(0)}`,
    ]);
  }
}

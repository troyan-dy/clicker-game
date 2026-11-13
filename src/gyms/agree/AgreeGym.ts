import Phaser from 'phaser';
import { promptAt } from '../../content/tickets';
import { logEvent, metrics } from '../../core/metrics';
import type { Rng } from '../../core/rng';
import { playSound, unlockSound } from '../../core/sound';
import autoData from '../../data/balance/auto.json';
import planData from '../../data/balance/plans.json';
import sourceData from '../../data/balance/sources.json';
import tuningData from '../../data/tuning/pipeline.json';
import { createOverlay, type Overlay } from '../../debug/overlay';
import { createTuningPanel, type TuningPanel } from '../../debug/tuningPanel';
import type { Plan } from '../../systems/plan/plan';
import {
  buyBrick,
  buyNoAsk,
  buyPlan,
  buySource,
  buySubagent,
  claudeRate,
  createPipe,
  inflowOf,
  pressPipe,
  sourcePrice,
  stepPipe,
  subagentPrice,
  subagentRate,
  type PipeConfig,
  type PipeState,
  type Source,
} from '../../systems/pipeline/pipeline';
import {
  tasksPhrase,
  TERMINAL_SPOTS,
  type Neck,
  type ShopRow,
  type ShopShelf,
  type TerminalUi,
} from '../../ui/terminal/terminal';
import { Squares } from '../../view/squares';

const STEP = 1 / 60;
const MONEY_GREEN = 0x7cc68d;
const SMOOTH = 1.5; // seconds: how slowly the bottleneck reading and the income follow the moment
const GYM_KEYS = new Set(['KeyR', 'Tab', 'KeyO', 'KeyP', 'KeyT', 'KeyM']);
const GYM_GIFT = 100;
const NEWS = 'Местный разработчик третий день не открывал редактор. Коллеги ничего не заметили';
const fmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

declare global {
  interface Window {
    /** gym-only hooks for scripted captures */
    __gym?: { buy(what: string): boolean; gift(dollars: number): void };
  }
}

const HELP = `
  <p>ГИМ · любая клавиша — «Да», покупки — кликом</p>
  <p><kbd>M</kbd>подбросить $${GYM_GIFT} <kbd>R</kbd>заново <kbd>T</kbd>замедление</p>
  <p><kbd>Tab</kbd>настройки <kbd>O</kbd>цифры <kbd>P</kbd>сохранить</p>`;

/**
 * Gym of the core loop (M01 «Согласие», M02 sources, M03 plan, M05 automation): the terminal
 * with the conveyor of tasks. The player presses «Да», buys from three shelves, watches the bottleneck.
 */
export class AgreeGym extends Phaser.Scene {
  private readonly rng: Rng;
  private readonly ui: TerminalUi;
  private readonly showOverlay: boolean;
  // own copies of the data: the tuning panel edits them live, the mechanic reads them every step
  private readonly cfg: PipeConfig = {
    tuning: { ...tuningData },
    plans: planData as Plan[],
    sources: (sourceData as Source[]).map((s) => ({ ...s })),
    auto: { brick: { ...autoData.brick }, noAsk: { ...autoData.noAsk }, subagent: { ...autoData.subagent } },
  };
  private state!: PipeState;
  private squares!: Squares;
  private panel!: TuningPanel;
  private overlay!: Overlay;
  private acc = 0;
  private clock = 0;
  private slow = false;
  private yesStreak = 0;
  private lastAutoSound = 0;
  private lastMoney = 0;
  private income = 0;
  private avgBacklog = 0;
  private avgReady = 0;
  private pressTimes: number[] = [];

  constructor(rng: Rng, ui: TerminalUi, showOverlay: boolean) {
    super('agree');
    this.rng = rng;
    this.ui = ui;
    this.showOverlay = showOverlay;
  }

  create(): void {
    this.squares = new Squares(this, this.rng, 700);
    this.ui.extra.innerHTML = HELP;
    this.overlay = createOverlay(this.showOverlay);
    const t = this.cfg.tuning;
    this.panel = createTuningPanel('M01', [
      { target: t, key: 'pay', label: '$ за задачу', min: 1, max: 20, step: 1 },
      { target: t, key: 'backlogMax', label: 'бэклог, макс.', min: 5, max: 100, step: 5 },
      { target: t, key: 'readyMax', label: 'ждут «Да», макс.', min: 1, max: 30, step: 1 },
      { target: t, key: 'buffer', label: '«Да» заранее', min: 0, max: 5, step: 1 },
      { target: this.cfg.sources[0], key: 'inflow', label: 'работа №1: задач/с', min: 0.25, max: 5, step: 0.25 },
      { target: this.cfg.auto.brick, key: 'rate', label: 'кирпич: «Да»/с', min: 1, max: 20, step: 1 },
    ]);
    this.restart();

    window.addEventListener('keydown', (e) => this.onKey(e));
    window.addEventListener('pointerdown', (e) => {
      const el = e.target as HTMLElement;
      if (el.closest('.lil-gui')) return;
      const buy = el.closest<HTMLElement>('[data-buy]');
      if (buy) this.buy(buy.dataset.buy ?? '');
      else if (!el.closest('.tm-side')) this.press();
    });
    window.__gym = {
      buy: (what) => this.buy(what),
      gift: (dollars) => this.gift(dollars),
    };
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
    this.state = createPipe(this.cfg);
    this.lastMoney = this.state.money;
    this.income = 0;
    this.avgBacklog = 0;
    this.avgReady = 0;
    this.pressTimes = [];
    this.yesStreak = 0;
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
    else if (e.code === 'KeyP') this.panel.dump({ tuning: this.cfg.tuning, sources: this.cfg.sources, auto: this.cfg.auto });
    else if (e.code === 'KeyT') this.slow = !this.slow;
    else if (e.code === 'KeyM') this.gift(GYM_GIFT);
  }

  /** gym-only: money from nowhere, not counted as income */
  private gift(dollars: number): void {
    this.state.money += dollars;
    this.lastMoney += dollars;
  }

  private buy(what: string): boolean {
    unlockSound();
    const s = this.state;
    const before = s.money;
    let ok = false;
    if (what.startsWith('src:')) ok = buySource(s, this.cfg, what.slice(4));
    else if (what === 'plan') ok = buyPlan(s, this.cfg);
    else if (what === 'brick') ok = buyBrick(s, this.cfg);
    else if (what === 'noask') ok = buyNoAsk(s, this.cfg);
    else if (what === 'sub') ok = buySubagent(s, this.cfg);
    if (!ok) return false;
    this.lastMoney -= before - s.money; // a purchase is not negative income
    playSound('buy');
    logEvent(`buy_${what}`);
    return true;
  }

  private press(): void {
    unlockSound();
    const result = pressPipe(this.state, this.cfg);
    this.pressTimes.push(this.clock);
    this.ui.hit(result);
    if (result === 'approved') {
      playSound('yes', this.yesStreak++ % 5);
      this.squares.fly(TERMINAL_SPOTS.ask, TERMINAL_SPOTS.money, 5, MONEY_GREEN, 220, [0.35, 0.6]);
    } else if (result === 'buffered') playSound('buffer');
    else playSound('waste');
    metrics.presses = this.state.presses;
    metrics.completed = this.state.closedHere >= 3;
  }

  private step(dt: number): void {
    this.clock += dt;
    const s = this.state;
    const done = stepPipe(s, this.cfg, dt);
    if (done.here > 0) {
      this.ui.hit('auto');
      this.squares.fly(TERMINAL_SPOTS.ask, TERMINAL_SPOTS.money, Math.min(done.here, 3) * 2, MONEY_GREEN, 220, [0.35, 0.6]);
      if (this.clock - this.lastAutoSound > 0.16) {
        this.lastAutoSound = this.clock;
        playSound('auto');
      }
    }
    if (done.subagents > 0) {
      this.squares.fly(TERMINAL_SPOTS.backlog, TERMINAL_SPOTS.money, Math.min(done.subagents, 2), MONEY_GREEN, 320, [0.5, 0.8]);
    }
    // smoothed readings: what is slowest, how much comes in per second
    const k = dt / SMOOTH;
    this.avgBacklog += (s.backlog - this.avgBacklog) * k;
    this.avgReady += (s.ready - this.avgReady) * k;
    this.income += ((s.money - this.lastMoney) / dt - this.income) * k;
    this.lastMoney = s.money;
    this.squares.step(dt);
  }

  private neck(): Neck {
    const s = this.state;
    const half = Math.ceil(this.cfg.tuning.readyMax / 2);
    if (!s.noAsk && (this.avgReady >= 3 || (s.ready >= half && this.avgReady >= 1.5))) return 'you';
    if (this.avgBacklog >= 2 && s.backlog >= 2) return 'claude';
    if (this.avgBacklog < 0.7 && inflowOf(s, this.cfg) < claudeRate(s, this.cfg) + subagentRate(s, this.cfg)) return 'tasks';
    return 'none';
  }

  private shelves(neck: Neck): ShopShelf[] {
    const s = this.state;
    const cfg = this.cfg;
    const price = (n: number): string => `$${fmt.format(n)}`;
    const forSale = (buy: string, cost: number): Pick<ShopRow, 'buy' | 'price' | 'state'> => ({
      buy,
      price: price(cost),
      state: s.money >= cost ? 'can' : 'poor',
    });

    const sources: ShopRow[] = cfg.sources.map((src) => {
      const owned = s.owned[src.id] ?? 0;
      const sub = `+${tasksPhrase(src.inflow)}/с · ${src.note}`;
      if (owned >= src.max) return { buy: '', title: src.name, sub, count: 'есть', price: '', state: 'owned' };
      return { title: src.name, sub, count: owned ? `×${owned}` : '', ...forSale(`src:${src.id}`, sourcePrice(src, owned)) };
    });

    const next = cfg.plans[s.plan.index + 1];
    const plans: ShopRow[] = next
      ? [{ title: `Тариф ${next.name}`, sub: `${tasksPhrase(next.rate)}/с · ${next.note}`, count: '', ...forSale('plan', next.price) }]
      : [{ buy: '', title: `Тариф ${cfg.plans[s.plan.index].name}`, sub: 'быстрее тарифа нет', count: 'максимум', price: '', state: 'owned' }];

    const a = cfg.auto;
    const brick: ShopRow = s.noAsk
      ? { buy: '', title: a.brick.name, sub: 'больше не нужен', count: '', price: '', state: 'off' }
      : s.brick
        ? { buy: '', title: a.brick.name, sub: `жмёт «Да» ${a.brick.rate} раз в секунду`, count: 'лежит', price: '', state: 'owned' }
        : { title: a.brick.name, sub: `${a.brick.rate} «Да»/с · ${a.brick.note}; один`, count: '', ...forSale('brick', a.brick.price) };
    const noAsk: ShopRow = s.noAsk
      ? { buy: '', title: a.noAsk.name, sub: a.noAsk.note, count: 'куплено', price: '', state: 'owned' }
      : { title: a.noAsk.name, sub: a.noAsk.note, count: '', ...forSale('noask', a.noAsk.price) };
    const sub: ShopRow = {
      title: a.subagent.name,
      sub: `+${tasksPhrase(claudeRate(s, cfg))}/с · ${a.subagent.note}`,
      count: s.subagents ? `×${s.subagents}` : '',
      ...forSale('sub', subagentPrice(cfg, s.subagents)),
    };

    return [
      { title: 'ВХОД · больше задач', hot: neck === 'tasks', rows: sources },
      { title: 'КЛОД · быстрее делает', hot: neck === 'claude', rows: plans },
      { title: 'АВТОМАТ · жать меньше', hot: neck === 'you', rows: [brick, noAsk, sub] },
    ];
  }

  private draw(): void {
    const s = this.state;
    const cfg = this.cfg;
    const neck = this.neck();
    // at automatic speeds the text would flicker: show a new task twice a second at most
    const shown = s.noAsk ? Math.floor(this.clock * 2) : s.closedHere;
    this.ui.render({
      money: s.money,
      income: Math.max(0, this.income),
      prompt: promptAt(shown),
      pay: cfg.tuning.pay,
      inflow: inflowOf(s, cfg),
      backlog: s.backlog,
      backlogMax: cfg.tuning.backlogMax,
      rate: claudeRate(s, cfg),
      plan: cfg.plans[s.plan.index].name,
      think: s.think,
      ready: s.ready,
      readyMax: cfg.tuning.readyMax,
      buffered: s.buffered,
      brick: s.brick,
      brickRate: cfg.auto.brick.rate,
      noAsk: s.noAsk,
      noAskPrice: cfg.auto.noAsk.price,
      canBuyNoAsk: s.money >= cfg.auto.noAsk.price,
      subagents: s.subagents,
      subRate: subagentRate(s, cfg),
      neck,
      shelves: this.shelves(neck),
      news: NEWS,
    });
    while (this.pressTimes.length && this.pressTimes[0] < this.clock - 3) this.pressTimes.shift();
    this.overlay.set([
      `конвейер${this.slow ? ' · замедление' : ''} · узкое место: ${neck}`,
      `вход        ${inflowOf(s, cfg).toFixed(2)} задач/с`,
      `бэклог      ${s.backlog}/${cfg.tuning.backlogMax}   (в среднем ${this.avgBacklog.toFixed(1)})`,
      `Клод        ${claudeRate(s, cfg).toFixed(2)}/с   сабагенты ${subagentRate(s, cfg).toFixed(2)}/с`,
      `ждут «Да»   ${s.ready}/${cfg.tuning.readyMax}   (в среднем ${this.avgReady.toFixed(1)})`,
      `нажатий/с   ${(this.pressTimes.length / 3).toFixed(1)}   всего ${s.presses}, вхолостую ${s.wasted}`,
      `закрыто     сам ${s.closedHere} · сабагенты ${s.closedBySubagents}`,
      `доход       $${this.income.toFixed(1)}/с   fps ${this.game.loop.actualFps.toFixed(0)}`,
    ]);
  }
}

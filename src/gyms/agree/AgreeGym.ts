import Phaser from 'phaser';
import { promptAt } from '../../content/tickets';
import { logEvent, metrics } from '../../core/metrics';
import type { Rng } from '../../core/rng';
import { playSound, unlockSound } from '../../core/sound';
import autoData from '../../data/balance/auto.json';
import gradeData from '../../data/balance/grades.json';
import planData from '../../data/balance/plans.json';
import sourceData from '../../data/balance/sources.json';
import { BP, deskScreen } from '../../data/layout/blueprint';
import tuningData from '../../data/tuning/pipeline.json';
import { createOverlay, type Overlay } from '../../debug/overlay';
import { createTuningPanel, type TuningPanel } from '../../debug/tuningPanel';
import type { Plan } from '../../systems/plan/plan';
import {
  buyGrade,
  buyNoAsk,
  buyPlan,
  buySource,
  buySubagent,
  claudeRate,
  createPipe,
  inflowOf,
  payOf,
  pressPipe,
  sourcePrice,
  stepPipe,
  subagentPrice,
  subagentRate,
  type PipeConfig,
  type PipeState,
  type Source,
} from '../../systems/pipeline/pipeline';
import type { BlueprintTag, BlueprintUi } from '../../ui/blueprint/blueprint';
import {
  tasksPhrase,
  TERMINAL_SPOTS,
  type Neck,
  type ShopRow,
  type ShopShelf,
  type TerminalUi,
} from '../../ui/terminal/terminal';
import { BlueprintView, VISIBLE_SUBAGENTS } from '../../view/blueprintView';
import { Squares, type Rect } from '../../view/squares';

const STEP = 1 / 60;
const MONEY_ON_DARK = 0x7cc68d;
const MONEY_ON_PAPER = 0x3f7d58;
const SMOOTH = 1.5; // seconds: how slowly the bottleneck reading and the income follow the moment
const GYM_KEYS = new Set(['KeyR', 'Tab', 'KeyO', 'KeyP', 'KeyT', 'KeyM']);
const GYM_GIFT = 100;
const NEWS_TERMINAL = 'Местный разработчик третий день не открывал редактор. Коллеги ничего не заметили';
const NEWS_BLUEPRINT = 'HR заметил, что новый сотрудник отвечает в чате за 0,2 секунды и всегда согласен';
const MONEY_SPOT: Rect = { x: BP.money.x - 80, y: BP.money.y - 20, w: 160, h: 40 };
const fmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const fmt1 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });

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
 * Gym of the core loop. Stage 1 — the terminal: the conveyor of tasks, «Да», sources, plan
 * (M01–M03). Buying «Да, и больше не спрашивай» pulls the camera back to stage 2 — the blueprint,
 * where subagents, new kinds of work and promotions scale the operation (M04, M05, M15).
 */
export class AgreeGym extends Phaser.Scene {
  private readonly rng: Rng;
  private readonly term: TerminalUi;
  private readonly paper: BlueprintUi;
  private readonly showOverlay: boolean;
  // own copies of the data: the tuning panel edits them live, the mechanic reads them every step
  private readonly cfg: PipeConfig = {
    tuning: { ...tuningData },
    plans: planData as Plan[],
    sources: (sourceData as Source[]).map((s) => ({ ...s })),
    grades: gradeData,
    auto: { noAsk: { ...autoData.noAsk }, subagent: { ...autoData.subagent } },
  };
  private state!: PipeState;
  private view!: BlueprintView;
  private squares!: Squares;
  private panel!: TuningPanel;
  private overlay!: Overlay;
  private onBlueprint = false;
  private acc = 0;
  private clock = 0;
  private slow = false;
  private yesStreak = 0;
  private lastAutoSound = 0;
  private lastDelivery = 0;
  private lastMoney = 0;
  private income = 0;
  private avgBacklog = 0;
  private avgReady = 0;
  private pressTimes: number[] = [];
  /** squares owed to the connectors: tasks move faster than squares may be drawn */
  private owed = { in: 0, me: 0, sub: 0 };

  constructor(rng: Rng, term: TerminalUi, paper: BlueprintUi, showOverlay: boolean) {
    super('agree');
    this.rng = rng;
    this.term = term;
    this.paper = paper;
    this.showOverlay = showOverlay;
  }

  preload(): void {
    BlueprintView.preload(this);
  }

  create(): void {
    this.view = new BlueprintView(this, this.rng);
    this.view.onDelivered = (x, y) => this.delivered(x, y);
    this.squares = new Squares(this, this.rng, 700);
    this.term.extra.innerHTML = HELP;
    this.paper.extra.innerHTML = HELP;
    this.overlay = createOverlay(this.showOverlay);
    const t = this.cfg.tuning;
    this.panel = createTuningPanel('M01', [
      { target: t, key: 'pay', label: '$ за задачу', min: 1, max: 20, step: 1 },
      { target: t, key: 'backlogMax', label: 'бэклог, макс.', min: 5, max: 100, step: 5 },
      { target: t, key: 'readyMax', label: 'ждут «Да», макс.', min: 1, max: 30, step: 1 },
      { target: t, key: 'buffer', label: '«Да» заранее', min: 0, max: 5, step: 1 },
      { target: this.cfg.sources[0], key: 'inflow', label: 'работа: задач/с', min: 0.25, max: 5, step: 0.25 },
      { target: this.cfg.auto.subagent, key: 'share', label: 'сабагент: доля тарифа', min: 0.05, max: 1, step: 0.05 },
    ]);
    this.state = createPipe(this.cfg);
    this.lastMoney = this.state.money;

    window.addEventListener('keydown', (e) => this.onKey(e));
    window.addEventListener('pointerdown', (e) => {
      const el = e.target as HTMLElement;
      if (el.closest('.lil-gui')) return;
      const buy = el.closest<HTMLElement>('[data-buy]');
      if (buy) this.buy(buy.dataset.buy ?? '');
      else if (!el.closest('.tm-side') && !el.closest('.bl-shop')) this.press();
    });
    window.__gym = { buy: (what) => this.buy(what), gift: (dollars) => this.gift(dollars) };
    window.__GAME__.ready = true;
  }

  update(_time: number, deltaMs: number): void {
    this.acc += Math.min(deltaMs / 1000, 0.25) * (this.slow ? 0.25 : 1);
    while (this.acc >= STEP) {
      this.step(STEP);
      this.acc -= STEP;
    }
    if (this.onBlueprint) this.drawBlueprint();
    else this.drawTerminal();
    this.drawOverlay();
  }

  private onKey(e: KeyboardEvent): void {
    if (e.repeat) return;
    if (!GYM_KEYS.has(e.code)) {
      this.press();
      return;
    }
    e.preventDefault();
    if (e.code === 'KeyR') window.location.reload();
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
    else if (what === 'noask') ok = !this.onBlueprint && buyNoAsk(s, this.cfg);
    else if (what === 'sub') ok = this.onBlueprint && buySubagent(s, this.cfg);
    else if (what === 'grade') ok = this.onBlueprint && buyGrade(s, this.cfg);
    if (!ok) return false;
    this.lastMoney -= before - s.money; // a purchase is not negative income
    playSound('buy');
    logEvent(`buy_${what}`);
    if (what === 'noask') this.pullBack();
    return true;
  }

  /** «Да, и больше не спрашивай»: the terminal shrinks into the laptop screen, the blueprint appears. */
  private pullBack(): void {
    this.onBlueprint = true;
    const q = deskScreen();
    const m = [
      (q.tr[0] - q.tl[0]) / 1920,
      (q.tr[1] - q.tl[1]) / 1920,
      (q.bl[0] - q.tl[0]) / 1080,
      (q.bl[1] - q.tl[1]) / 1080,
      q.tl[0],
      q.tl[1],
    ];
    this.term.root.style.transform = `matrix(${m.map((v) => v.toFixed(5)).join(',')})`;
    this.term.root.classList.add('small');
    this.paper.show();
    this.view.sync({ sources: this.state.owned, subagents: this.state.subagents });
    this.view.show(650);
    logEvent('pull_back');
  }

  private press(): void {
    unlockSound();
    const result = pressPipe(this.state, this.cfg);
    this.pressTimes.push(this.clock);
    if (!this.onBlueprint) this.term.hit(result);
    if (result === 'approved') {
      playSound('yes', this.yesStreak++ % 5);
      if (this.onBlueprint) this.delivered(...this.deskSpot(), 3);
      else this.squares.fly(TERMINAL_SPOTS.ask, TERMINAL_SPOTS.money, 5, MONEY_ON_DARK, 220, [0.35, 0.6]);
    } else if (result === 'buffered') playSound('buffer');
    else playSound('waste');
    metrics.presses = this.state.presses;
    metrics.completed = this.state.closedHere >= 3;
  }

  private deskSpot(): [number, number] {
    const q = deskScreen();
    return [(q.tr[0] + q.bl[0]) / 2, (q.tr[1] + q.bl[1]) / 2];
  }

  /** a task was closed at a session on the blueprint: a square flies from there into the money */
  private delivered(x: number, y: number, count = 1): void {
    if (count === 1 && this.clock - this.lastDelivery < 0.07) return; // not more than ~14 squares a second
    this.lastDelivery = this.clock;
    this.squares.fly({ x: x - 6, y: y - 6, w: 12, h: 12 }, MONEY_SPOT, count, MONEY_ON_PAPER, 160, [0.45, 0.75]);
  }

  private step(dt: number): void {
    this.clock += dt;
    const s = this.state;
    const done = stepPipe(s, this.cfg, dt);

    if (this.onBlueprint) {
      // squares on the connectors: at most a handful per second on each, however fast the tasks go
      this.owed.in = Math.min(this.owed.in + done.arrived, 2);
      this.owed.me = Math.min(this.owed.me + done.here, 2);
      this.owed.sub = Math.min(this.owed.sub + done.subagents, 3);
      if (this.rng.next() < dt * 9 && this.owed.in >= 1) {
        this.owed.in--;
        const total = inflowOf(s, this.cfg);
        let pick = this.rng.range(0, total);
        for (const src of this.cfg.sources) {
          pick -= (s.owned[src.id] ?? 0) * src.inflow;
          if (pick <= 0) {
            this.view.flow(`src:${src.id}`);
            break;
          }
        }
      }
      if (this.rng.next() < dt * 9 && this.owed.me >= 1) {
        this.owed.me--;
        this.view.flow('ses:me');
      }
      if (this.rng.next() < dt * 14 && this.owed.sub >= 1) {
        this.owed.sub--;
        this.view.flow(this.view.randomSession(s.subagents));
      }
      this.view.step(dt);
    } else if (done.here > 0) {
      this.term.hit('auto');
      this.squares.fly(TERMINAL_SPOTS.ask, TERMINAL_SPOTS.money, Math.min(done.here, 3) * 2, MONEY_ON_DARK, 220, [0.35, 0.6]);
    }
    // once the terminal agrees by itself it works silently: a tick for every task was annoying (PT-04)
    if (done.here > 0 && !s.noAsk && this.clock - this.lastAutoSound > 0.16) {
      this.lastAutoSound = this.clock;
      playSound('auto');
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

  private row(title: string, sub: string, count: string, buy: string, cost: number): ShopRow {
    return { title, sub, count, buy, price: `$${fmt.format(cost)}`, state: this.state.money >= cost ? 'can' : 'poor' };
  }

  /** kinds of work on sale: the terminal sells the first ones, the blueprint all of them */
  private sourceRows(all: boolean): ShopRow[] {
    const s = this.state;
    return this.cfg.sources.filter((src) => all || src.screen === 1).map((src) => {
      const owned = s.owned[src.id] ?? 0;
      return this.row(src.name, `+${tasksPhrase(src.inflow)}/с · ${src.note}`, owned ? `×${owned}` : '', `src:${src.id}`, sourcePrice(src, owned));
    });
  }

  private planRows(): ShopRow[] {
    const s = this.state;
    const next = this.cfg.plans[s.plan.index + 1];
    if (next) return [this.row(`Тариф ${next.name}`, `${tasksPhrase(next.rate)}/с · ${next.note}`, '', 'plan', next.price)];
    const cur = this.cfg.plans[s.plan.index];
    return [{ buy: '', title: `Тариф ${cur.name}`, sub: 'быстрее тарифа нет', count: 'максимум', price: '', state: 'owned' }];
  }

  private gradeRows(): ShopRow[] {
    const cur = this.cfg.grades[this.state.grade];
    const next = this.cfg.grades[this.state.grade + 1];
    if (!next) return [{ buy: '', title: cur.name, sub: 'выше некуда', count: 'максимум', price: '', state: 'owned' }];
    const pay = fmt1.format(this.cfg.tuning.pay * next.mult);
    return [this.row(`Повышение: ${next.name.toLowerCase()}`, `$${pay} за задачу · ${next.note}`, cur.name.toLowerCase(), 'grade', next.price)];
  }

  private terminalShelves(neck: Neck): ShopShelf[] {
    const a = this.cfg.auto;
    return [
      { title: 'ВХОД · больше задач', hot: neck === 'tasks', rows: this.sourceRows(false) },
      { title: 'КЛОД · быстрее делает', hot: neck === 'claude', rows: this.planRows() },
      {
        title: 'АВТОМАТ · жать не надо',
        hot: neck === 'you',
        rows: [this.row(a.noAsk.name, `${a.noAsk.note}; откроет вид сверху`, '', 'noask', a.noAsk.price)],
      },
    ];
  }

  private blueprintShelves(neck: Neck): ShopShelf[] {
    const s = this.state;
    const a = this.cfg.auto;
    const sub = this.row(
      a.subagent.name,
      `+${tasksPhrase(claudeRate(s, this.cfg) * a.subagent.share)}/с · ${a.subagent.note}`,
      s.subagents ? `×${s.subagents}` : '',
      'sub',
      subagentPrice(this.cfg, s.subagents),
    );
    return [
      { title: 'СЕССИИ · больше рук', hot: neck === 'claude', rows: [sub] },
      { title: 'РАБОТЫ · больше задач', hot: neck === 'tasks', rows: this.sourceRows(true) },
      { title: 'ТАРИФ · быстрее все сессии', hot: false, rows: this.planRows() },
      { title: 'ГРЕЙД · дороже каждая задача', hot: false, rows: this.gradeRows() },
    ];
  }

  private drawTerminal(): void {
    const s = this.state;
    const cfg = this.cfg;
    const neck = this.neck();
    this.term.render({
      money: s.money,
      income: Math.max(0, this.income),
      prompt: promptAt(s.closedHere),
      pay: payOf(s, cfg),
      inflow: inflowOf(s, cfg),
      backlog: s.backlog,
      backlogMax: cfg.tuning.backlogMax,
      rate: claudeRate(s, cfg),
      plan: cfg.plans[s.plan.index].name,
      think: s.think,
      ready: s.ready,
      readyMax: cfg.tuning.readyMax,
      buffered: s.buffered,
      noAsk: s.noAsk,
      noAskPrice: cfg.auto.noAsk.price,
      canBuyNoAsk: s.money >= cfg.auto.noAsk.price,
      subagents: s.subagents,
      subRate: subagentRate(s, cfg),
      neck,
      shelves: this.terminalShelves(neck),
      news: NEWS_TERMINAL,
    });
  }

  private drawBlueprint(): void {
    const s = this.state;
    const cfg = this.cfg;
    const neck = this.neck();
    const rate = claudeRate(s, cfg);
    this.view.sync({ sources: s.owned, subagents: s.subagents });

    const tags: BlueprintTag[] = [];
    for (const src of cfg.sources) {
      const owned = s.owned[src.id] ?? 0;
      const place = BP.sources[src.id];
      if (!owned || !place) continue;
      tags.push({ x: 24, y: place.y + 8, html: `${src.tag} ×${owned} · <b>${tasksPhrase(owned * src.inflow)}/с</b>`, hot: neck === 'tasks' });
    }
    tags.push({ x: BP.tray.x - 90, y: BP.tray.y + 8, html: `ждут: <b>${s.backlog} / ${cfg.tuning.backlogMax}</b>`, hot: neck === 'claude' });
    tags.push({ x: BP.desk.x - 190, y: BP.desk.y + 8, html: `твой ноутбук · ${cfg.plans[s.plan.index].name} · <b>${tasksPhrase(rate)}/с</b>` });
    const shown = Math.min(s.subagents, VISIBLE_SUBAGENTS);
    for (let i = 0; i < shown; i++) {
      const [x, y] = BP.slots[i];
      tags.push({ x: x - 60, y: y + 4, html: `сабагент №${i + 1}`, small: true });
    }
    if (s.subagents > shown) tags.push({ x: BP.more.x - 70, y: BP.more.y + 4, html: `и ещё ${s.subagents - shown} в коробке`, small: true });

    const capacity = rate + subagentRate(s, cfg);
    this.paper.render({
      money: s.money,
      income: Math.max(0, this.income),
      summary: `${cfg.grades[s.grade].name.toLowerCase()}: $${fmt1.format(payOf(s, cfg))} за задачу`,
      neck:
        `приходит ${tasksPhrase(inflowOf(s, cfg))}/с, сессии успевают ${tasksPhrase(Math.round(capacity * 10) / 10)}/с<br>` +
        (neck === 'tasks'
          ? 'узкое место: <b>задачи</b> — сессии простаивают, нужны ещё работы'
          : neck === 'claude'
            ? 'узкое место: <b>сессии</b> — нужны сабагенты или тариф быстрее'
            : 'узких мест нет — можно просить повышение'),
      tags,
      shelves: this.blueprintShelves(neck),
      news: NEWS_BLUEPRINT,
      hint: 'Enter — подогнать Клода: +1 задача',
    });
  }

  private drawOverlay(): void {
    const s = this.state;
    const cfg = this.cfg;
    while (this.pressTimes.length && this.pressTimes[0] < this.clock - 3) this.pressTimes.shift();
    this.overlay.set([
      `конвейер${this.slow ? ' · замедление' : ''} · узкое место: ${this.neck()} · экран: ${this.onBlueprint ? 'чертёж' : 'терминал'}`,
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

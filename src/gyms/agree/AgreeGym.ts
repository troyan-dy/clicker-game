import Phaser from 'phaser';
import { promptAt } from '../../content/tickets';
import { logEvent, metrics } from '../../core/metrics';
import type { Rng } from '../../core/rng';
import { playSound, unlockSound } from '../../core/sound';
import autoData from '../../data/balance/auto.json';
import farmData from '../../data/balance/farms.json';
import gradeData from '../../data/balance/grades.json';
import planData from '../../data/balance/plans.json';
import sourceData from '../../data/balance/sources.json';
import { BP, deskScreen } from '../../data/layout/blueprint';
import { CITY } from '../../data/layout/city';
import tuningData from '../../data/tuning/pipeline.json';
import { createOverlay, type Overlay } from '../../debug/overlay';
import { createTuningPanel, type TuningPanel } from '../../debug/tuningPanel';
import type { Plan } from '../../systems/plan/plan';
import {
  backlogCap,
  buyFarm,
  buyGrade,
  buyLlc,
  buyNoAsk,
  buyPlan,
  buySource,
  buySubagent,
  claudeRate,
  createPipe,
  farmPrice,
  inflowOf,
  payOf,
  pressPipe,
  sessionsOf,
  sourcePrice,
  stepPipe,
  subagentPrice,
  subagentRate,
  type PipeConfig,
  type PipeState,
  type Source,
} from '../../systems/pipeline/pipeline';
import type { BlueprintTag, BlueprintUi } from '../../ui/blueprint/blueprint';
import { plural, short } from '../../ui/format';
import {
  tasksPhrase,
  TERMINAL_SPOTS,
  type Neck,
  type ShopRow,
  type ShopShelf,
  type TerminalUi,
} from '../../ui/terminal/terminal';
import { BlueprintView, VISIBLE_SUBAGENTS } from '../../view/blueprintView';
import { CityView, type CityTopology } from '../../view/cityView';
import { preloadNodes } from '../../view/nodeTextures';
import { Squares, type Rect } from '../../view/squares';

const STEP = 1 / 60;
const MONEY_ON_DARK = 0x7cc68d;
const MONEY_ON_PAPER = 0x3f7d58;
const SMOOTH = 1.5; // seconds: how slowly the bottleneck reading and the income follow the moment
const GYM_KEYS = new Set(['KeyR', 'Tab', 'KeyO', 'KeyP', 'KeyT', 'KeyM']);
const GYM_GIFT = 100;
const NEWS = [
  '',
  'Местный разработчик третий день не открывал редактор. Коллеги ничего не заметили',
  'HR заметил, что новый сотрудник отвечает в чате за 0,2 секунды и всегда согласен',
  'В городе закрыты все вакансии разработчика. Кадровики подозревают одного и того же человека',
];
const SESSION_FORMS = ['сессия', 'сессии', 'сессий'] as const;
const MONEY_SPOT: Rect = { x: BP.money.x - 80, y: BP.money.y - 20, w: 160, h: 40 };
const HOME_SPOT: [number, number] = [CITY.home.x, CITY.home.y - 60];
const fmt1 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });

/** «3,75 задачи», «26 задач», «34 600 задач», «1,2 млн задач» */
function flowText(perSec: number): string {
  return perSec < 1000 ? tasksPhrase(Math.round(perSec * 100) / 100) : `${short(Math.round(perSec))} задач`;
}

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
const HELP_PAPER = `<p>ГИМ · <kbd>M</kbd>деньги <kbd>R</kbd>заново <kbd>T</kbd>замедление <kbd>Tab</kbd>настройки</p>`;

/**
 * Gym of the core loop, three screens of one conveyor of tasks.
 * 1 — the terminal: «Да», sources, plan (M01–M03). Buying «Да, и больше не спрашивай» pulls the camera
 *     back to 2 — the blueprint: subagents, new kinds of work, promotions (M04, M05, M15). «Открыть ООО»
 *     pulls it back again to 3 — the city: companies hire the player, server farms run the sessions (M16).
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
    farms: farmData,
    auto: { noAsk: { ...autoData.noAsk }, subagent: { ...autoData.subagent }, llc: { ...autoData.llc } },
  };
  private state!: PipeState;
  private view!: BlueprintView;
  private city!: CityView;
  private squares!: Squares;
  private panel!: TuningPanel;
  private overlay!: Overlay;
  private stage: 1 | 2 | 3 = 1;
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
    preloadNodes(this);
  }

  create(): void {
    this.view = new BlueprintView(this, this.rng);
    this.view.onDelivered = (x, y) => this.delivered(x, y);
    this.city = new CityView(this);
    this.city.onDelivered = (x, y) => this.delivered(x, y);
    this.squares = new Squares(this, this.rng, 700);
    this.term.extra.innerHTML = HELP;
    this.paper.extra.innerHTML = HELP_PAPER;
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
    if (this.stage === 1) this.drawTerminal();
    else if (this.stage === 2) this.drawBlueprint();
    else this.drawCity();
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
    else if (e.code === 'KeyM') this.gift(Math.max(GYM_GIFT, Math.round(this.income * 30))); // half a minute of income
  }

  /** gym-only: money from nowhere, not counted as income */
  private gift(dollars: number): void {
    this.state.money += dollars;
    this.lastMoney += dollars;
  }

  /** what this screen sells: the city deals only in companies */
  private onSale(src: Source): boolean {
    return this.stage === 3 ? src.screen === 3 : src.screen <= this.stage;
  }

  private buy(what: string): boolean {
    unlockSound();
    const s = this.state;
    const cfg = this.cfg;
    const before = s.money;
    let ok = false;
    if (what.startsWith('src:')) {
      const src = cfg.sources.find((x) => x.id === what.slice(4));
      ok = !!src && this.onSale(src) && buySource(s, cfg, src.id);
    } else if (what.startsWith('farm:')) ok = this.stage === 3 && buyFarm(s, cfg, what.slice(5));
    else if (what === 'plan') ok = buyPlan(s, cfg);
    else if (what === 'noask') ok = this.stage === 1 && buyNoAsk(s, cfg);
    else if (what === 'sub') ok = this.stage === 2 && buySubagent(s, cfg);
    else if (what === 'grade') ok = this.stage >= 2 && buyGrade(s, cfg);
    else if (what === 'llc') ok = this.stage === 2 && buyLlc(s, cfg);
    if (!ok) return false;
    this.lastMoney -= before - s.money; // a purchase is not negative income
    playSound('buy');
    logEvent(`buy_${what}`);
    if (what === 'noask') this.pullBack();
    else if (what === 'llc') this.toCity();
    return true;
  }

  /** «Да, и больше не спрашивай»: the terminal shrinks into the laptop screen, the blueprint appears. */
  private pullBack(): void {
    this.stage = 2;
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

  /** «Открыть ООО»: the whole blueprint shrinks into one desk in the middle of the city. */
  private toCity(): void {
    this.stage = 3;
    this.owed = { in: 0, me: 0, sub: 0 };
    this.view.shrinkTo(CITY.home.x, CITY.home.y, CITY.home.scale, 900);
    this.city.sync(this.cityTopology());
    this.city.show(450);
    logEvent('pull_back_city');
  }

  private press(): void {
    unlockSound();
    const result = pressPipe(this.state, this.cfg);
    this.pressTimes.push(this.clock);
    if (this.stage === 1) this.term.hit(result);
    if (result === 'approved') {
      playSound('yes', this.yesStreak++ % 5);
      if (this.stage === 1) this.squares.fly(TERMINAL_SPOTS.ask, TERMINAL_SPOTS.money, 5, MONEY_ON_DARK, 220, [0.35, 0.6]);
      else if (this.stage === 2) this.delivered(...this.deskSpot(), 3);
      else this.delivered(...HOME_SPOT, 3);
    } else if (result === 'buffered') playSound('buffer');
    else playSound('waste');
    metrics.presses = this.state.presses;
    metrics.completed = this.state.closedHere >= 3;
  }

  private deskSpot(): [number, number] {
    const q = deskScreen();
    return [(q.tr[0] + q.bl[0]) / 2, (q.tr[1] + q.bl[1]) / 2];
  }

  /** a task was closed at a session: a square flies from there into the money */
  private delivered(x: number, y: number, count = 1): void {
    if (count === 1 && this.clock - this.lastDelivery < 0.07) return; // not more than ~14 squares a second
    this.lastDelivery = this.clock;
    this.squares.fly({ x: x - 6, y: y - 6, w: 12, h: 12 }, MONEY_SPOT, count, MONEY_ON_PAPER, 160, [0.45, 0.75]);
  }

  /** sessions bought as farms of one kind */
  private farmSessions(id: string): number {
    const f = this.cfg.farms.find((x) => x.id === id);
    return f ? (this.state.farms[id] ?? 0) * f.sessions : 0;
  }

  private cityTopology(): CityTopology {
    const f = this.state.farms;
    return { owned: this.state.owned, racks: f.rack ?? 0, halls: f.hall ?? 0, datacentres: f.dc ?? 0 };
  }

  /** a source on sale picked by its share of the incoming flow */
  private pickSource(sources: readonly Source[]): Source | undefined {
    const s = this.state;
    let total = 0;
    for (const src of sources) total += (s.owned[src.id] ?? 0) * src.inflow;
    let pick = this.rng.range(0, total);
    for (const src of sources) {
      pick -= (s.owned[src.id] ?? 0) * src.inflow;
      if (pick <= 0 && s.owned[src.id]) return src;
    }
    return undefined;
  }

  private step(dt: number): void {
    this.clock += dt;
    const s = this.state;
    const done = stepPipe(s, this.cfg, dt);

    if (this.stage === 2) {
      // squares on the connectors: at most a handful per second on each, however fast the tasks go
      this.owed.in = Math.min(this.owed.in + done.arrived, 2);
      this.owed.me = Math.min(this.owed.me + done.here, 2);
      this.owed.sub = Math.min(this.owed.sub + done.subagents, 3);
      if (this.rng.next() < dt * 9 && this.owed.in >= 1) {
        this.owed.in--;
        const src = this.pickSource(this.cfg.sources.filter((x) => x.screen <= 2));
        if (src) this.view.flow(`src:${src.id}`);
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
    } else if (this.stage === 3) {
      this.owed.in = Math.min(this.owed.in + done.arrived, 3);
      if (this.rng.next() < dt * 16 && this.owed.in >= 1) {
        this.owed.in--;
        const src = this.pickSource(this.cfg.sources.filter((x) => x.screen === 3));
        if (src) this.city.flow(src.id);
      }
      // the desk hands tasks to the servers by their share of the sessions; the laptops inside it keep the rest
      this.owed.sub = Math.min(this.owed.sub + done.subagents, 3);
      if (this.rng.next() < dt * 14 && this.owed.sub >= 1) {
        this.owed.sub--;
        const dc = this.farmSessions('dc');
        const servers = this.farmSessions('rack') + this.farmSessions('hall');
        const pick = this.rng.range(0, sessionsOf(s, this.cfg) + 1);
        if (pick < dc) this.city.flow('dc');
        else if (pick < dc + servers) this.city.flow('servers');
        else this.delivered(...HOME_SPOT);
      }
      this.city.step(dt);
      if (done.here > 0) this.delivered(...HOME_SPOT);
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
    const cap = backlogCap(s, this.cfg);
    const half = Math.ceil(this.cfg.tuning.readyMax / 2);
    if (!s.noAsk && (this.avgReady >= 3 || (s.ready >= half && this.avgReady >= 1.5))) return 'you';
    // the tray grows with the flow, so «piling up» and «empty» are shares of it
    const piling = Math.max(2, cap * 0.1);
    if (this.avgBacklog >= piling && s.backlog >= piling) return 'claude';
    const empty = Math.max(0.7, cap * 0.035);
    if (this.avgBacklog < empty && inflowOf(s, this.cfg) < claudeRate(s, this.cfg) + subagentRate(s, this.cfg)) return 'tasks';
    return 'none';
  }

  private row(title: string, sub: string, count: string, buy: string, cost: number): ShopRow {
    return { title, sub, count, buy, price: `$${short(cost)}`, state: this.state.money >= cost ? 'can' : 'poor' };
  }

  /** kinds of work on sale: the terminal sells the first ones, the blueprint all four */
  private sourceRows(): ShopRow[] {
    const s = this.state;
    return this.cfg.sources.filter((src) => src.screen <= this.stage).map((src) => {
      const owned = s.owned[src.id] ?? 0;
      return this.row(src.name, `+${tasksPhrase(src.inflow)}/с · ${src.note}`, owned ? `×${owned}` : '', `src:${src.id}`, sourcePrice(src, owned));
    });
  }

  /** the next two companies of the city, in the order of the map */
  private companyRows(): ShopRow[] {
    const left = this.cfg.sources.filter((src) => src.screen === 3 && !this.state.owned[src.id]);
    if (!left.length) return [{ buy: '', title: 'Город твой', sub: 'ты числишься во всех компаниях', count: '', price: '', state: 'owned' }];
    return left.slice(0, 2).map((src) => this.row(src.name, `+${flowText(src.inflow)}/с · ${src.note}`, '', `src:${src.id}`, src.price));
  }

  private farmRows(): ShopRow[] {
    const s = this.state;
    const perSession = claudeRate(s, this.cfg) * this.cfg.auto.subagent.share;
    return this.cfg.farms.map((f) => {
      const owned = s.farms[f.id] ?? 0;
      return this.row(f.name, `+${flowText(f.sessions * perSession)}/с · ${f.note}`, owned ? `×${owned}` : '', `farm:${f.id}`, farmPrice(f, owned));
    });
  }

  /** `always` — show the row even when the fastest plan is bought (the terminal does) */
  private planRows(always: boolean): ShopRow[] {
    const s = this.state;
    const next = this.cfg.plans[s.plan.index + 1];
    if (next) return [this.row(`Тариф ${next.name}`, `${tasksPhrase(next.rate)}/с · ${next.note}`, '', 'plan', next.price)];
    if (!always) return [];
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
      { title: 'ВХОД · больше задач', hot: neck === 'tasks', rows: this.sourceRows() },
      { title: 'КЛОД · быстрее делает', hot: neck === 'claude', rows: this.planRows(true) },
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
      { title: 'РАБОТЫ · больше задач', hot: neck === 'tasks', rows: this.sourceRows() },
      { title: 'УЛУЧШЕНИЯ · быстрее и дороже', hot: false, rows: [...this.planRows(false), ...this.gradeRows()] },
      { title: 'МАСШТАБ · дальше — город', hot: false, rows: [this.row(a.llc.name, a.llc.note, '', 'llc', a.llc.price)] },
    ];
  }

  private cityShelves(neck: Neck, hired: number, total: number): ShopShelf[] {
    return [
      { title: `КОМПАНИИ · ${hired} из ${total}`, hot: neck === 'tasks' && hired < total, rows: this.companyRows() },
      { title: 'МОЩНОСТИ · больше сессий', hot: neck === 'claude', rows: this.farmRows() },
      { title: 'УЛУЧШЕНИЯ · быстрее и дороже', hot: false, rows: [...this.planRows(false), ...this.gradeRows()] },
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
      backlogMax: backlogCap(s, cfg),
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
      news: NEWS[1],
    });
  }

  /** the line under the money: the grade and what one task pays */
  private payLine(): string {
    const s = this.state;
    return `${this.cfg.grades[s.grade].name.toLowerCase()}: $${fmt1.format(payOf(s, this.cfg))} за задачу`;
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
    tags.push({ x: BP.tray.x - 90, y: BP.tray.y + 8, html: `ждут: <b>${s.backlog} / ${backlogCap(s, cfg)}</b>`, hot: neck === 'claude' });
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
      summary: this.payLine(),
      neck:
        `приходит ${flowText(inflowOf(s, cfg))}/с, сессии успевают ${flowText(capacity)}/с<br>` +
        (neck === 'tasks'
          ? 'узкое место: <b>задачи</b> — сессии простаивают, нужны ещё работы'
          : neck === 'claude'
            ? 'узкое место: <b>сессии</b> — нужны сабагенты или тариф быстрее'
            : 'узких мест нет — можно просить повышение'),
      tags,
      shelves: this.blueprintShelves(neck),
      news: NEWS[2],
      hint: 'Enter — подогнать Клода: +1 задача',
    });
  }

  private drawCity(): void {
    const s = this.state;
    const cfg = this.cfg;
    const neck = this.neck();
    const capacity = claudeRate(s, cfg) + subagentRate(s, cfg);
    this.city.sync(this.cityTopology());

    const sessions = sessionsOf(s, cfg) + 1; // and the player's own
    // the numbers of the desk live in the line under the money: connectors arrive at it from every side
    const tags: BlueprintTag[] = [{ x: CITY.home.x, y: CITY.home.y + 4, mid: true, small: true, html: 'ты' }];
    const companies = cfg.sources.filter((src) => src.screen === 3);
    let hired = 0;
    for (const src of companies) {
      const lot = CITY.lots[src.id];
      if (!s.owned[src.id]) continue;
      hired++;
      if (lot) tags.push({ x: lot.x, y: lot.y + 4, mid: true, small: true, html: `${src.tag}<br><b>+${short(src.inflow)}/с</b>` });
    }

    const racks = s.farms.rack ?? 0;
    const halls = s.farms.hall ?? 0;
    const dcs = s.farms.dc ?? 0;
    if (racks + halls > 0) {
      const n = this.farmSessions('rack') + this.farmSessions('hall');
      const what = [racks ? `стойки ×${racks}` : '', halls ? `залы ×${halls}` : ''].filter(Boolean).join(' · ');
      tags.push({ x: CITY.farms.servers.x, y: CITY.farms.servers.y + 4, mid: true, small: true, html: `${what}<br><b>${short(n)} ${plural(n, SESSION_FORMS)}</b>` });
    }
    if (dcs > 0) {
      const n = this.farmSessions('dc');
      const d = CITY.farms.dc; // its caption sits above: the connector from the desk arrives from below
      tags.push({ x: d.x, y: d.y - d.h - 44, mid: true, small: true, html: `датацентры ×${dcs}<br><b>${short(n)} ${plural(n, SESSION_FORMS)}</b>` });
    }

    const all = hired === companies.length;
    this.paper.render({
      money: s.money,
      income: Math.max(0, this.income),
      summary: this.payLine(),
      neck:
        `приходит ${flowText(inflowOf(s, cfg))}/с · ${short(sessions)} ${plural(sessions, SESSION_FORMS)} Клода успевают ${flowText(capacity)}/с<br>` +
        (neck === 'claude'
          ? 'узкое место: <b>сессии</b> — нужны серверы'
          : all
            ? 'город твой: ты числишься во всех компаниях'
            : neck === 'tasks'
              ? 'узкое место: <b>задачи</b> — сессии простаивают, нужны ещё компании'
              : 'узких мест нет — можно просить повышение'),
      tags,
      shelves: this.cityShelves(neck, hired, companies.length),
      news: NEWS[3],
      hint: `город: ${hired} из ${companies.length} компаний`,
    });
  }

  private drawOverlay(): void {
    const s = this.state;
    const cfg = this.cfg;
    while (this.pressTimes.length && this.pressTimes[0] < this.clock - 3) this.pressTimes.shift();
    this.overlay.set([
      `конвейер${this.slow ? ' · замедление' : ''} · узкое место: ${this.neck()} · экран ${this.stage}`,
      `вход        ${inflowOf(s, cfg).toFixed(2)} задач/с`,
      `бэклог      ${s.backlog}/${backlogCap(s, cfg)}   (в среднем ${this.avgBacklog.toFixed(1)})`,
      `Клод        ${claudeRate(s, cfg).toFixed(2)}/с   сессии ${sessionsOf(s, cfg)}: ${subagentRate(s, cfg).toFixed(2)}/с`,
      `ждут «Да»   ${s.ready}/${cfg.tuning.readyMax}   (в среднем ${this.avgReady.toFixed(1)})`,
      `нажатий/с   ${(this.pressTimes.length / 3).toFixed(1)}   всего ${s.presses}, вхолостую ${s.wasted}`,
      `закрыто     сам ${s.closedHere} · сессии ${s.closedBySubagents}`,
      `доход       $${this.income.toFixed(1)}/с   fps ${this.game.loop.actualFps.toFixed(0)}`,
    ]);
  }
}

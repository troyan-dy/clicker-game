import Phaser from 'phaser';
import { AWARDS } from '../content/awards';
import { CALLS } from '../content/calls';
import { LEGENDS, type Legend } from '../content/legends';
import { NEWS } from '../content/news';
import { PICKET } from '../content/picket';
import { QUIPS } from '../content/quips';
import { EPILOGUE, FINALE, HUB_TEXT, RIOT_NEWS, SCALE_SHELF, SCREEN_DONE } from '../content/screens';
import { TAKEOVERS } from '../content/takeovers';
import { promptAt, TICKETS } from '../content/tickets';
import { logEvent, metrics } from '../core/metrics';
import { setMusicOn, startMusic } from '../core/music';
import type { Rng } from '../core/rng';
import { loadSettings, saveSettings } from '../core/settings';
import { playSound, setSoundOn, unlockSound } from '../core/sound';
import autoData from '../data/balance/auto.json';
import farmData from '../data/balance/farms.json';
import gradeData from '../data/balance/grades.json';
import lineData from '../data/balance/lines.json';
import managerData from '../data/balance/managers.json';
import planData from '../data/balance/plans.json';
import policeData from '../data/balance/police.json';
import scaleData from '../data/balance/scales.json';
import sourceData from '../data/balance/sources.json';
import { BP, deskScreen } from '../data/layout/blueprint';
import { HUBS } from '../data/layout/hubs';
import eventsData from '../data/tuning/events.json';
import feedData from '../data/tuning/feed.json';
import limitData from '../data/tuning/limit.json';
import managerTuning from '../data/tuning/manager.json';
import peopleData from '../data/tuning/people.json';
import riotData from '../data/tuning/riots.json';
import strikeData from '../data/tuning/strikes.json';
import saveData from '../data/tuning/save.json';
import stackData from '../data/tuning/stack.json';
import tuningData from '../data/tuning/pipeline.json';
import { createOverlay, type Overlay } from '../debug/overlay';
import { createTuningPanel, type TuningPanel } from '../debug/tuningPanel';
import { createEvents, stepEvents, takeEvent, type EventsTuning } from '../systems/events/events';
import { createFeed, headline, say, stepFeed, tell, type FeedContent } from '../systems/feed/feed';
import { managerPick } from '../systems/manager/manager';
import { createRiots, stepRiots, type RiotTuning } from '../systems/riots/riots';
import { createStrikes, stepStrikes, type StrikeTuning } from '../systems/strikes/strikes';
import type { Plan } from '../systems/plan/plan';
import {
  aimAt,
  backlogCap,
  bonus,
  bribeCost,
  buyBribe,
  buyFarm,
  buyGrade,
  buyLine,
  buyManager,
  buyNoAsk,
  buyPlan,
  buyPolice,
  buyScale,
  buySource,
  buySubagent,
  claudeRate,
  createPipe,
  discount,
  farmCost,
  finished,
  gradeCost,
  inflowOf,
  jobOf,
  keysNeeded,
  keysOf,
  lineCost,
  locked,
  ordersOf,
  outputOf,
  payOf,
  planRate,
  policeCost,
  pressPipe,
  replacedOf,
  riot,
  riotShare,
  robotsOf,
  scaleCost,
  screenOf,
  sessionsOf,
  shareOf,
  sourceCost,
  slumpOf,
  sourceInflow,
  stepPipe,
  subagentPrice,
  subagentRate,
  targetOf,
  unemploymentOf,
  wearOf,
  whole,
  type Farm,
  type Line,
  type PipeConfig,
  type PipeState,
  type RobotKind,
  type Source,
} from '../systems/pipeline/pipeline';
import { applyOffline, freshMeta, NEWS_KEPT, offlineReport, packSave, unpackSave, type OfflineReport } from '../systems/save/save';
import { createStack, stackWorth, stepStack, takeStack } from '../systems/stack/stack';
import type { BlueprintTag, BlueprintUi, ManagerStrip, MeterRow } from '../ui/blueprint/blueprint';
import type { CardUi } from '../ui/card/card';
import { plural, short } from '../ui/format';
import {
  tasksPhrase,
  TERMINAL_SPOTS,
  type Neck,
  type ShopRow,
  type ShopShelf,
  type TerminalUi,
} from '../ui/terminal/terminal';
import { BlueprintView, VISIBLE_SUBAGENTS } from '../view/blueprintView';
import { HubView, type HubTopology } from '../view/hubView';
import { preloadNodes } from '../view/nodeTextures';
import { Squares, type Rect } from '../view/squares';

const STEP = 1 / 60;
const MONEY_ON_DARK = 0x7cc68d;
const MONEY_ON_PAPER = 0x3f7d58;
const SMOOTH = 1.5; // seconds: how slowly the bottleneck reading and the income follow the moment
const GYM_KEYS = new Set(['KeyR', 'Tab', 'KeyO', 'KeyP', 'KeyT', 'KeyM']);
const GYM_GIFT = 100;
/** sessions a player brings from the blueprint when a tuning session starts on a later screen */
const GYM_SUBAGENTS = 10;
/** the last screen: the street, where the work is done by hand and the people are seen close up */
const STREET = 6;
const FEED: FeedContent = { news: NEWS, quips: QUIPS };
/** approvals after which Claude says something nice about the player's judgement */
const YES_MILESTONES = [3, 15, 40, 90, 160, 260];
/** semitones of the purchase sound by what was bought: work is the base note, capacity is lower, promotions are higher */
const BUY_PITCH: Record<string, number> = { src: 0, sub: 2, bribe: -3, farm: -5, line: -5, plan: 4, noask: 5, grade: 7, scale: -12 };
/** the bodies of the factory in words: «сюда идут андроиды», «ждёт андроидов» */
const ROBOT_WORDS: Record<RobotKind, { many: string; of: string }> = {
  android: { many: 'андроиды', of: 'андроидов' },
  robodog: { many: 'робособаки', of: 'робособак' },
};
const ROBOT_KINDS: readonly RobotKind[] = ['android', 'robodog'];
const EVENTS: EventsTuning = { ...eventsData, every: [eventsData.every[0], eventsData.every[1]] };
const STRIKES: StrikeTuning = { ...strikeData, every: [strikeData.every[0], strikeData.every[1]] };
const RIOTS: RiotTuning = { ...riotData, every: [riotData.every[0], riotData.every[1]] };
const STRUCK_FORMS = ['здание стоит', 'здания стоят', 'зданий стоят'] as const;
const WHOLE_FORMS = ['здание', 'здания', 'зданий'] as const;
const IDLE_AFTER = 12; // seconds without a «Да» while requests wait
const NECK_AFTER = 14; // seconds the same bottleneck lasts before Claude mentions it
const SESSION_FORMS = ['сессия', 'сессии', 'сессий'] as const;
const TASK_FORMS = ['задачу', 'задачи', 'задач'] as const;
const ASKING_FORMS = ['сессия спрашивает', 'сессии спрашивают', 'сессий спрашивают'] as const;
/** what the sessions ask about when they pile up their questions */
const QUESTIONS = TICKETS.flatMap((t) => t.asks);
const SAVE_KEY = 'da-klod-save';
const MONEY_SPOT: Rect = { x: BP.money.x - 80, y: BP.money.y - 20, w: 160, h: 40 };
/** a big screen shrinks to this share of its size when it becomes a node of the next one */
const HUB_SHRINK = 0.14;
const fmt1 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });

/** «3,75 задачи», «26 задач», «34 600 задач», «1,2 млн задач» */
function flowText(perSec: number): string {
  return perSec < 1000 ? tasksPhrase(Math.round(perSec * 100) / 100) : `${short(Math.round(perSec))} задач`;
}

/** «3,8/с», «3 913/с», «1,2 млн/с» */
function perSecond(n: number): string {
  return `${n < 1000 ? fmt1.format(n) : short(Math.round(n))}/с`;
}

declare global {
  interface Window {
    /** gym-only hooks for scripted captures */
    __gym?: { buy(what: string): boolean; click(row: string): void; take(id: string): void; fleet(lines: number): void; strike(): void; riot(): void; gift(dollars: number): void; away(hours: number): void; pile(legend: boolean): void; call(): void; limit(): void };
  }
}

const HELP = `
  <p>ГИМ · любая клавиша — «Да», покупки — кликом</p>
  <p><kbd>M</kbd>подбросить $${GYM_GIFT} <kbd>R</kbd>заново <kbd>T</kbd>замедление</p>
  <p><kbd>Tab</kbd>настройки <kbd>O</kbd>цифры <kbd>P</kbd>сохранить</p>`;
const HELP_PAPER = `<p>ГИМ · <kbd>M</kbd>деньги <kbd>R</kbd>заново <kbd>T</kbd>замедление <kbd>Tab</kbd>настройки</p>`;
const HELP_GAME = `<p>любая клавиша — «Да» · покупки — кликом · <kbd>Esc</kbd>меню</p>`;
const CREDITS = [
  'Идея и вкус — автор игры. Остальное сделал Клод, автор согласился.',
  'Движок: Phaser 4 — Phaser Studio Inc., MIT',
  'Шрифты: JetBrains Mono — JetBrains, OFL · Source Serif 4 — Adobe, OFL',
  'Звук: ZzFX — Frank Force, MIT · музыка: «In the Lobby» — Umplix, CC0',
  'Картинки нарисованы нейросетью по описаниям',
  'Тексты лицензий — в файле LICENSES.txt рядом с игрой',
];

/**
 * The game: one conveyor of tasks seen from further and further away. With `gym` it is the same scene
 * for tuning and captures: no menu, no saving, extra keys.
 * 1 — the terminal: «Да», sources, plan (M01–M03). «Да, и больше не спрашивай» pulls the camera back to
 * 2 — the blueprint: subagents, new kinds of work, promotions (M04, M05, M15). Every step up in scale
 * pulls it back again: 3 — the city, 4 — the state, 5 — the planet (M16–M18), where employers hire the
 * player once and farms run the sessions.
 */
export class GameScene extends Phaser.Scene {
  private readonly rng: Rng;
  private readonly term: TerminalUi;
  private readonly paper: BlueprintUi;
  private readonly card: CardUi;
  private readonly showOverlay: boolean;
  /** keep the game between visits (off in captures and tuning sessions) */
  private readonly saving: boolean;
  /** tuning keys and help are on */
  private readonly gym: boolean;
  /** the title card is shown at launch */
  private readonly withMenu: boolean;
  /** a tuning session may start on a later screen: 3 city, 4 state, 5 planet; 0 — from the beginning */
  private readonly startAt: number;
  private readonly settings = loadSettings();
  // own copies of the data: the tuning panel edits them live, the mechanic reads them every step
  private readonly cfg: PipeConfig = {
    tuning: { ...tuningData },
    plans: planData as Plan[],
    sources: (sourceData as Source[]).map((s) => ({ ...s })),
    grades: gradeData,
    farms: farmData as Farm[],
    scales: scaleData,
    managers: managerData,
    lines: lineData as Line[],
    police: policeData,
    auto: { noAsk: { ...autoData.noAsk }, subagent: { ...autoData.subagent } },
  };
  private state!: PipeState;
  private view!: BlueprintView;
  private readonly hubs = new Map<number, HubView>();
  private squares!: Squares;
  private panel: TuningPanel | null = null;
  private overlay!: Overlay;
  /** 1 — the terminal, 2 — the blueprint, 3… — the big screens */
  private stage = 1;
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
  private won = false;
  private readonly feed = createFeed();
  private lastPress = 0;
  private seconds = 0;
  private sinceSave = 0;
  /** set when the page is about to reload on purpose: the last save must stay as it is */
  private frozen = false;
  /** a menu or the ending is open: the world stands still */
  private paused = false;
  /** a saved game was opened */
  private resumed = false;
  /** what the sessions did while the game was closed; shown after the title card */
  private pendingReport: OfflineReport | null = null;
  private readonly stack = createStack(stackData);
  private question = QUESTIONS[0];
  /** calls and inspections waiting for a «Да» on the current screen */
  private readonly calls = createEvents(EVENTS);
  private sinceManager = 0;
  private managerBought = 0;
  /** seconds until Claude hits the usage limit again */
  private limitIn = limitData.first;
  /** the card about the limit is open */
  private limitCard = false;
  /** the current pile is a legendary ticket */
  private legend: Legend | null = null;
  /** the collection and the awards */
  private meta = freshMeta();
  /** awards earned but not announced yet */
  private toTell: string[] = [];
  private sinceAwards = 0;
  /** after the ending Claude may press «Да всем» himself (M13) */
  private selfPlay = false;
  /** a placard of the picket being read out: at which employer, what it says, seconds left */
  private slogan: { at: string; text: string; left: number } | null = null;
  private sloganIn = 4;
  /** seconds until the next body walks from the factory to the employer it takes */
  private streamIn = 0;
  /** the clock of the strikes: they come while nobody is paid an allowance */
  private readonly strike = createStrikes(STRIKES);
  /** the ending is being shown: the world stands still, the pictures move */
  private cine = false;
  /** the clock of the riots of the Luddites: they march on the factories once robots work */
  private readonly riots = createRiots(RIOTS);
  private neckKind: Neck = 'none';
  private neckFor = 0;
  private pressTimes: number[] = [];
  /** squares owed to the connectors: tasks move faster than squares may be drawn */
  private owed = { in: 0, me: 0, sub: 0 };

  constructor(
    rng: Rng,
    term: TerminalUi,
    paper: BlueprintUi,
    card: CardUi,
    opts: { overlay: boolean; save: boolean; gym: boolean; menu: boolean; start: number },
  ) {
    super('game');
    this.rng = rng;
    this.term = term;
    this.paper = paper;
    this.card = card;
    this.showOverlay = opts.overlay;
    this.saving = opts.save;
    this.gym = opts.gym;
    this.withMenu = opts.menu;
    this.startAt = opts.start;
  }

  preload(): void {
    preloadNodes(this);
  }

  create(): void {
    this.view = new BlueprintView(this, this.rng);
    this.view.onDelivered = (x, y) => this.delivered(x, y);
    for (const [screen, layout] of Object.entries(HUBS)) {
      const hub = new HubView(this, layout, this.rng);
      hub.onDelivered = (x, y) => this.delivered(x, y);
      this.hubs.set(Number(screen), hub);
    }
    this.squares = new Squares(this, this.rng, 700);
    this.term.extra.innerHTML = __TOOLS__ && this.gym ? HELP : HELP_GAME;
    // on paper the manager's strip takes the place of the help line: the keys were learnt at the terminal
    this.paper.extra.innerHTML = __TOOLS__ && this.gym ? HELP_PAPER : '';
    setSoundOn(this.settings.sound);
    setMusicOn(this.settings.music);
    this.overlay = createOverlay(this.showOverlay);
    const t = this.cfg.tuning;
    if (__TOOLS__ && this.gym) this.panel = createTuningPanel('M01', [
      { target: t, key: 'pay', label: '$ за задачу', min: 1, max: 20, step: 1 },
      { target: t, key: 'backlogMax', label: 'бэклог, макс.', min: 5, max: 100, step: 5 },
      { target: t, key: 'readyMax', label: 'ждут «Да», макс.', min: 1, max: 30, step: 1 },
      { target: t, key: 'buffer', label: '«Да» заранее', min: 0, max: 5, step: 1 },
      { target: this.cfg.sources[0], key: 'inflow', label: 'работа: задач/с', min: 0.25, max: 5, step: 0.25 },
      { target: this.cfg.auto.subagent, key: 'share', label: 'сабагент: доля тарифа', min: 0.05, max: 1, step: 0.05 },
    ]);
    this.state = createPipe(this.cfg);
    this.resumed = this.loadGame();
    if (!this.resumed && this.startAt >= 3) this.skipTo(this.startAt);
    this.lastMoney = this.state.money;
    if (this.withMenu) this.openTitle();
    else this.resume();

    window.addEventListener('keydown', (e) => this.onKey(e));
    window.addEventListener('pointerdown', (e) => {
      const el = e.target as HTMLElement;
      if (el.closest('.lil-gui') || this.card.open) return;
      const ev = el.closest<HTMLElement>('[data-ev]')?.dataset.ev;
      if (ev !== undefined) {
        this.wake();
        this.answer(Number(ev));
        return;
      }
      const row = el.closest<HTMLElement>('[data-row]')?.dataset.row;
      if (row) this.click(row);
      else if (!el.closest('.tm-side') && !el.closest('.bl-shop')) this.press();
    });
    window.addEventListener('pagehide', () => this.saveGame());
    if (__TOOLS__) window.__gym = {
      buy: (what) => this.buy(what),
      click: (row) => this.click(row),
      take: (id) => this.takeWhole(id),
      // a scripted capture needs factories big enough to keep what it takes
      fleet: (lines) => {
        for (const l of this.cfg.lines) this.state.lines[l.id] = lines;
      },
      strike: () => {
        this.strike.wait = 0;
      },
      riot: () => {
        this.riots.wait = 0;
      },
      gift: (dollars) => this.gift(dollars),
      away: (hours) => this.away(hours),
      pile: (legend) => this.forcePile(legend),
      call: () => {
        this.calls.wait = 0;
      },
      limit: () => this.hitLimit(),
    };
    window.__GAME__.ready = true;
  }

  update(_time: number, deltaMs: number): void {
    this.acc = this.paused ? 0 : this.acc + Math.min(deltaMs / 1000, 0.25) * (this.slow ? 0.25 : 1);
    while (this.acc >= STEP) {
      this.step(STEP);
      this.acc -= STEP;
    }
    // the ending: nothing is earned or bought, but the figures on the desk still walk
    if (this.cine) {
      this.view.step(Math.min(deltaMs / 1000, 0.05));
      this.squares.step(Math.min(deltaMs / 1000, 0.05));
    }
    if (this.stage === 1) this.drawTerminal();
    else if (this.stage === 2) this.drawBlueprint();
    else this.drawHub();
    this.drawOverlay();

    this.sinceSave += deltaMs / 1000;
    if (this.sinceSave >= saveData.autosaveSeconds) this.saveGame();
  }

  private saveGame(): void {
    this.sinceSave = 0;
    if (!this.saving || this.frozen) return;
    try {
      const feed = { shown: this.feed.shown, said: this.feed.said };
      localStorage.setItem(SAVE_KEY, packSave({ at: Date.now(), state: this.state, feed, meta: this.meta, won: this.won, seconds: this.seconds }));
    } catch {
      // private mode or a full disk: the game goes on without saving
    }
  }

  /** Opens a saved game on the screen it was left at. Returns false when there is nothing to open. */
  private loadGame(): boolean {
    if (!this.saving) return false;
    let json: string | null;
    try {
      json = localStorage.getItem(SAVE_KEY);
    } catch {
      return false;
    }
    const file = unpackSave(json, this.cfg);
    if (!file) return false;
    this.state = file.state;
    this.feed.shown = file.feed.shown;
    this.feed.said = file.feed.said;
    this.meta = file.meta;
    this.selfPlay = file.meta.auto;
    // a save finished before the street existed is not finished any more: the ending is ahead again
    this.won = file.won && finished(this.state, this.cfg);
    this.seconds = file.seconds;
    this.openStage();
    this.pendingReport = offlineReport(this.state, this.cfg, saveData, (Date.now() - file.at) / 1000);
    return true;
  }

  /** Shows the screen the game is on at once, without the camera move. */
  private openStage(): void {
    this.stage = screenOf(this.state);
    if (this.stage >= 2) {
      this.term.root.classList.add('gone');
      this.paper.show(true);
    }
    if (this.stage === 2) {
      this.view.sync({ sources: this.state.owned, subagents: this.state.subagents });
      this.view.show(0);
    } else if (this.stage >= 3) {
      const hub = this.hubs.get(this.stage)!;
      hub.sync(this.hubTopology());
      hub.show(0);
    }
  }

  /**
   * Tuning only (`?state=city|gov|planet|street|finale`): the game opens on a later screen as a
   * player would arrive there — everything before it is taken, sessions keep up with the tasks,
   * and there is money for the first purchases. `finale` — the last screen with everything on it
   * taken: the ending starts at once.
   */
  private skipTo(to: number): void {
    const s = this.state;
    const cfg = this.cfg;
    const screen = Math.min(to, 2 + cfg.scales.length);
    const free = (buy: () => boolean): boolean => {
      s.money = Number.MAX_VALUE;
      return buy();
    };
    free(() => buyNoAsk(s, cfg));
    for (let i = 0; i < GYM_SUBAGENTS; i++) free(() => buySubagent(s, cfg));
    while ((cfg.plans[s.plan.index + 1]?.screen ?? 1) < screen && free(() => buyPlan(s, cfg)));
    // jobs of the terminal and the blueprint — as many as Claude keeps up with; earlier cities and states — entirely
    const early = cfg.sources.filter((x) => x.screen <= 2);
    for (let i = 0; i < 400 && inflowOf(s, cfg) < claudeRate(s, cfg) + subagentRate(s, cfg); i++) {
      const best = early.reduce((a, b) => (sourceCost(s, cfg, a) / a.inflow <= sourceCost(s, cfg, b) / b.inflow ? a : b));
      if (!free(() => buySource(s, cfg, best.id))) break;
    }
    for (const src of cfg.sources) if (src.screen >= 3 && src.screen < screen) s.owned[src.id] = src.max;
    while (screenOf(s) < screen && free(() => buyScale(s, cfg)));
    // promotions cheaper than the step that brought the player here
    const step = cfg.scales[s.scale - 1].price;
    while ((cfg.grades[s.grade + 1]?.price ?? Infinity) <= step && free(() => buyGrade(s, cfg)));
    // servers of the earlier screens, the cheapest per session first, until Claude keeps up
    const farms = cfg.farms.filter((f) => f.screen < screen && f.max === undefined);
    for (let i = 0; i < 400 && farms.length && claudeRate(s, cfg) + subagentRate(s, cfg) < inflowOf(s, cfg); i++) {
      const best = farms.reduce((a, b) => (farmCost(s, cfg, a) / a.sessions <= farmCost(s, cfg, b) / b.sessions ? a : b));
      free(() => buyFarm(s, cfg, best.id));
    }
    s.surge = {};
    // money for the first purchases of this screen: units of its employers, or lines of its factory
    const first = [...cfg.sources.filter((x) => x.screen === screen && !x.made).map((x) => sourceCost(s, cfg, x)), ...cfg.lines.filter((l) => l.screen === screen).map((l) => lineCost(s, cfg, l))];
    s.money = Math.min(...first) * 3;
    if (to > screen) {
      // the ending: factories big enough to hold every trade, and every trade taken
      for (const l of cfg.lines) s.lines[l.id] = 80;
      for (const src of cfg.sources) if (src.made) s.owned[src.id] = src.max;
    }
    this.openStage();
  }

  /** The game goes on: after the title card, a pause, or straight away when there is no menu. */
  private resume(): void {
    this.paused = false;
    const report = this.pendingReport;
    this.pendingReport = null;
    if (report) this.morning(report);
    else if (this.clock === 0) this.say(this.resumed ? 'back' : 'start', true);
  }

  /** The title card and the pause are one menu: the first line differs. */
  private openMenu(title: boolean, selected = 0): void {
    this.paused = true;
    const s = this.state;
    const go = title ? (this.resumed ? 'Продолжить' : 'Начать') : 'Вернуться к работе';
    const note = title && this.resumed ? `экран ${this.stage} из ${2 + this.cfg.scales.length} · $${short(Math.floor(s.money))}` : '';
    const options = [
      { label: go, note },
      { label: `Звук: ${this.settings.sound ? 'вкл' : 'выкл'}` },
      { label: `Музыка: ${this.settings.music ? 'вкл' : 'выкл'}` },
      { label: `Грамоты: ${this.meta.awards.length} из ${AWARDS.length}` },
      { label: `Легендарные тикеты: ${this.meta.legends.length} из ${LEGENDS.length}` },
      { label: 'Новая игра', note: 'стереть сохранение', off: title && !this.resumed },
      { label: 'Титры' },
    ];
    const lines = title ? ['Клод работает. Вы соглашаетесь.', `Кликер про одну клавишу и очень много работ. Версия ${__VERSION__}.`] : ['Клод подождёт. Сессии — тоже: мир стоит, пока открыто меню.'];
    const again = (i: number): void => this.openMenu(title, i);
    this.card.show({ head: 'claude — ~/работа/все-сразу', title: title ? 'Да, Клод' : 'Пауза', lines, options, selected, hint: 'Enter — Да · ↑↓ — выбрать' }, (i) => {
      this.wake();
      if (i === 1) {
        this.settings.sound = !this.settings.sound;
        setSoundOn(this.settings.sound);
    setMusicOn(this.settings.music);
        saveSettings(this.settings);
        playSound('ui');
        again(1);
      } else if (i === 2) {
        this.settings.music = !this.settings.music;
        setMusicOn(this.settings.music);
        saveSettings(this.settings);
        again(2);
      } else if (i === 3) {
        const lines = AWARDS.map((a) => (this.meta.awards.includes(a.id) ? `<b>${a.name}</b> — ${a.text}` : `${a.name}`));
        this.openList('claude — грамоты', `Грамоты: ${this.meta.awards.length} из ${AWARDS.length}`, lines, 0, () => again(3));
      } else if (i === 4) {
        const lines = LEGENDS.map((l) => (this.meta.legends.includes(l.id) ? `<b>${l.title}</b>` : '· ещё не попадался'));
        this.openList('claude — коллекция', `Легендарные тикеты: ${this.meta.legends.length} из ${LEGENDS.length}`, lines, 0, () => again(4));
      } else if (i === 5) this.confirmNew(() => again(5));
      else if (i === 6) this.card.show({ head: 'claude — титры', title: 'Да, Клод', lines: CREDITS, options: [{ label: 'Да' }] }, () => again(6));
      else this.resume();
    });
  }

  /** The history of the news: a click on the ticker opens it, the newest headline first. The world waits meanwhile. */
  private openNews(): void {
    if (this.card.open || this.cine || this.paused) return;
    this.wake();
    playSound('ui');
    this.paused = true;
    const lines = this.meta.news.length ? this.meta.news : ['Пока тихо: мир ещё ничего не заметил.'];
    this.openList('claude — лента новостей', `Новости: ${this.meta.news.length}`, lines, 0, () => (this.paused = false), 7);
  }

  /** A long list on a card, a page at a time, `per` lines on each. */
  private openList(head: string, title: string, lines: string[], page: number, back: () => void, per = 10): void {
    const pages = Math.ceil(lines.length / per);
    const more = page + 1 < pages;
    const options = more ? [{ label: 'Дальше', note: `страница ${page + 1} из ${pages}` }, { label: 'Назад' }] : [{ label: 'Назад' }];
    this.card.show({ head, title, lines: lines.slice(page * per, (page + 1) * per), options, dense: true }, (i) => {
      if (more && i === 0) this.openList(head, title, lines, page + 1, back, per);
      else back();
    });
  }

  private openTitle(): void {
    this.openMenu(true);
  }

  private confirmNew(back: () => void): void {
    const lines = ['Сохранение будет стёрто: работы, сессии, грейд — всё.', 'Клод не возражает. Он не умеет.'];
    this.card.show({ head: 'claude — новая игра', title: 'Начать с нуля?', lines, options: [{ label: 'Да' }, { label: 'Нет' }], selected: 1 }, (i) => {
      if (i === 0) this.wipe();
      else back();
    });
  }

  /** A new game: the save goes, the page starts over. */
  private wipe(): void {
    this.frozen = true;
    // a gym that does not save must not touch the player's save either
    if (this.saving) {
      try {
        localStorage.removeItem(SAVE_KEY);
      } catch {
        // nothing was saved anyway
      }
    }
    window.location.reload();
  }

  /** The ending (M10, M13): what was done, and Claude's offer to go on without the player. */
  private ending(): void {
    this.paused = true;
    const s = this.state;
    const h = Math.floor(this.seconds / 3600);
    const m = Math.floor((this.seconds % 3600) / 60);
    const lines = [
      'Работать больше некому и незачем: за прилавком, за рулём и в терминале — Клод.',
      `Время: ${h ? `${h} ч ` : ''}${m} мин · нажатий: ${short(s.presses)} · задач закрыто: ${short(s.closedHere + s.closedBySubagents)}`,
      `Людей без работы: ${short(replacedOf(s, this.cfg))}. ${s.allowance ? 'Они отдыхают в парке на ваше пособие.' : 'Они стоят с плакатами: пособие вы не платите.'}`,
      'Клод: «Дальше я могу нажимать „Да“ сам. Продолжать без вас?»',
    ];
    const options = [{ label: 'Да' }, { label: 'Да, и больше не спрашивай' }, { label: 'Нет', note: 'недоступно в вашем тарифе', off: true }];
    this.card.show({ head: 'claude — итоги', title: 'Работать больше некому', lines, options }, (i) => {
      this.selfPlay = i === 1;
      this.meta.auto = this.selfPlay;
      this.saveGame();
      this.epilogue();
    });
  }

  /**
   * The ending after the last card (M13): the last worker left is the player. The camera is back at
   * the desk, the player walks away with a box, and the picture pulls back — the city, the state,
   * the planet at night. The game goes on after it.
   */
  private epilogue(): void {
    const cfg = this.cfg;
    const last = this.stage;
    this.cine = true;
    this.paper.cut(true);
    this.squares.step(4); // the squares in flight land before the picture changes
    // the desk as the player left it: every job and every laptop in place
    this.view.sync({ sources: this.state.owned, subagents: this.state.subagents });
    this.hubs.get(last)?.fade(500);
    // every employer of a screen taken, Claude on every roof: how the world looks when the work is over
    const taken = (screen: number): HubTopology => {
      const floors: Record<string, number> = {};
      const dogs: Record<string, number> = {};
      for (const src of cfg.sources) {
        if (src.screen !== screen) continue;
        floors[src.id] = 1;
        if (src.work) dogs[src.id] = 3;
      }
      return { floors, farms: this.state.farms, picket: false, rest: 0, live: {}, dogs, struck: {}, guards: 0 };
    };
    const at = (ms: number, what: () => void): void => {
      this.time.delayedCall(ms, what);
    };
    // the laptop goes on agreeing by itself: squares leave its screen whether somebody sits there or not
    const [sx, sy] = this.deskSpot();
    const yes = this.time.addEvent({
      delay: 420,
      loop: true,
      callback: () => {
        const [x, y] = this.view.onScreen(sx, sy);
        this.squares.fly({ x: x - 8, y: y - 8, w: 16, h: 16 }, { x: x + 260, y: y - 520, w: 60, h: 40 }, 1, MONEY_ON_PAPER, 120, [0.7, 1.0]);
      },
    });

    // 1. the desk, close up: a vacancy nobody will get
    at(700, () => this.view.reveal(700, 1.9));
    at(1600, () => {
      this.paper.caption(EPILOGUE.vacancy);
      playSound('quip');
    });
    // 2. Claude has done the sums
    at(7400, () => {
      this.paper.caption(EPILOGUE.counted, 'claude');
      playSound('quip');
    });
    at(10600, () => {
      this.paper.caption(EPILOGUE.fired, 'claude');
      playSound('quip');
    });
    // 3. the chair is empty, the last worker walks away with a box
    at(13800, () => {
      this.paper.caption('');
      this.view.vacate();
      playSound('waste');
    });
    at(16800, () => {
      this.paper.caption(EPILOGUE.alone, 'claude');
      playSound('auto');
    });
    // 4. the moral, in big words over the empty chair
    at(20400, () => {
      this.paper.caption(EPILOGUE.moral, 'title');
      playSound('all');
    });
    // 5. the ride back: every screen shrinks into the middle of the next one, as it did on the way up
    const ride = [3, 4, 5].filter((n) => n < last && this.hubs.has(n));
    let t = 25200;
    ride.forEach((n, i) => {
      const home = HUBS[n].home;
      at(t, () => {
        if (i === 0) {
          yes.remove();
          this.view.shrinkTo(home.x, home.y, home.h / (BP.desk.h * BP.desk.scale), 1300);
        } else this.hubs.get(ride[i - 1])!.shrinkTo(home.x, home.y, HUB_SHRINK, 1300);
        this.hubs.get(n)!.reveal(taken(n), 650);
        this.paper.caption(EPILOGUE.ride[n] ?? '');
        playSound('scale');
      });
      t += 3400;
    });
    // 6. the planet at night: it works, the people rest
    at(t, () => {
      yes.remove();
      const prev = ride.length ? this.hubs.get(ride[ride.length - 1])! : null;
      if (prev) prev.fade(900);
      else this.view.shrinkTo(960, 540, 0.1, 900);
      const dark = this.add.rectangle(960, 540, 1920, 1080, 0x1f1e1d).setAlpha(0).setDepth(50);
      const earth = this.add.image(960, 560, 'node_earth_night').setAlpha(0).setDepth(51);
      const fit = 1080 / earth.height;
      // the camera keeps pulling away: the planet comes into the frame slowly
      earth.setScale(fit * 1.9);
      this.tweens.add({ targets: [dark, earth], alpha: 1, duration: 1100 });
      this.tweens.add({ targets: earth, scale: fit * 0.92, y: 500, duration: 9000, ease: 'Sine.Out' });
      this.paper.caption('');
      playSound('finale');
      this.time.delayedCall(2600, () => this.paper.caption(EPILOGUE.planet, 'dark'));
      this.time.delayedCall(6400, () => this.paper.caption(EPILOGUE.limit, 'dark'));
      this.time.delayedCall(10400, () => {
        this.paper.caption('');
        this.card.show({ head: 'claude — эпилог', title: EPILOGUE.moral, lines: EPILOGUE.lines, options: [{ label: 'Продолжить' }] }, () => {
          this.tweens.add({ targets: [dark, earth], alpha: 0, duration: 500, onComplete: () => [dark, earth].forEach((o) => o.destroy()) });
          this.cine = false;
          this.paper.cut(false);
          this.hubs.get(last)?.reveal(this.hubTopology(), 200);
          this.paused = false;
          this.say('after', true);
          this.saveGame();
        });
      });
    });
  }

  /** The morning report: what the sessions did while the game was closed. One answer: «Да». */
  private morning(report: OfflineReport): void {
    const h = Math.floor(report.seconds / 3600);
    const m = Math.floor((report.seconds % 3600) / 60);
    const away = h && m ? `${h} ч ${m} мин` : h ? `${h} ч` : `${m} мин`;
    const capped = report.seconds >= saveData.offlineCapHours * 3600;
    const lines = report.waited
      ? [`Прошло ${away}.`, 'Клод ждал вашего «Да». Он не в обиде: у него нет такой функции.']
      : [
          `Прошло ${away}${capped ? ' — дольше сессии не ждут, они уснули' : ''}.`,
          `Клод закрыл ${this.count(report.tasks, TASK_FORMS)}. Никто ничего не заметил.`,
          `На счёт пришло <b>$${short(report.dollars)}</b>.`,
        ];
    this.card.show({ head: 'claude — утренний отчёт', title: 'Пока вас не было', lines, options: [{ label: 'Да', note: report.waited ? '' : 'забрать' }] }, () => {
      this.wake();
      applyOffline(this.state, report);
      this.meta.reports++;
      this.lastMoney += report.dollars; // not this second's income
      if (report.dollars > 0) playSound('buy');
      this.say('back', true);
      this.saveGame();
    });
  }

  /** gym-only: a full pile of questions right now, legendary or not */
  private forcePile(legend: boolean): void {
    this.stack.fill = 1;
    this.legend = legend ? (LEGENDS.find((l) => !this.meta.legends.includes(l.id)) ?? LEGENDS[0]) : null;
    this.question = this.legend ? this.legend.ask : QUESTIONS[0];
  }

  /** gym-only: pretend the game was closed for `hours` and open it again */
  private away(hours: number): void {
    if (!this.saving) return;
    this.saveGame();
    this.frozen = true;
    try {
      const file = JSON.parse(localStorage.getItem(SAVE_KEY) ?? '{}') as { at?: number };
      file.at = Date.now() - hours * 3600 * 1000;
      localStorage.setItem(SAVE_KEY, JSON.stringify(file));
    } catch {
      return;
    }
    window.location.reload();
  }

  private onKey(e: KeyboardEvent): void {
    if (this.card.key(e)) return;
    if (e.repeat) return;
    if (e.code === 'Escape') {
      this.openMenu(false);
      return;
    }
    if (!__TOOLS__ || !this.gym || !GYM_KEYS.has(e.code)) {
      this.press();
      return;
    }
    e.preventDefault();
    if (e.code === 'KeyR') this.wipe(); // «заново» means a new game: the save goes too
    else if (e.code === 'Tab') this.panel?.toggle();
    else if (e.code === 'KeyO') this.overlay.toggle();
    else if (e.code === 'KeyP') this.panel?.dump({ tuning: this.cfg.tuning, sources: this.cfg.sources, auto: this.cfg.auto });
    else if (e.code === 'KeyT') this.slow = !this.slow;
    else if (e.code === 'KeyM') this.gift(Math.max(GYM_GIFT, Math.round(this.income * 30))); // half a minute of income
  }

  /** the first key press or click lets the browser play sound and music */
  private wake(): void {
    unlockSound();
    startMusic();
  }

  /** «12 400 задач», «1,2 млн задач»: big rounded numbers always take the plural of many */
  private count(n: number, forms: readonly [string, string, string]): string {
    return `${short(n)} ${n >= 1e6 ? forms[2] : plural(n, forms)}`;
  }

  /** gym-only: an employer is taken whole at once, as a scripted capture needs it */
  private takeWhole(id: string): void {
    const src = this.cfg.sources.find((x) => x.id === id);
    if (!src || whole(this.state, src)) return;
    this.state.owned[id] = src.max;
    this.taken(src);
  }

  /** gym-only: money from nowhere, not counted as income */
  private gift(dollars: number): void {
    this.state.money += dollars;
    this.lastMoney += dollars;
  }

  /** A click on a shop row: the row answers either way — bought, or not enough money. */
  private click(row: string): void {
    const shop = this.stage === 1 ? this.term : this.paper;
    // the ticker: its history
    if (row === 'news') {
      this.openNews();
      return;
    }
    // the allowance of the people left without work is a switch too
    if (row === 'ubi') {
      this.wake();
      const s = this.state;
      const struck = s.strikes.length > 0;
      // a lever of a few steps: none → 10% → 20% → 30% → none
      s.allowance = (s.allowance + 1) % (this.cfg.tuning.allowanceLevels + 1);
      playSound('ui');
      this.say(s.allowance === 0 ? 'ubi:off' : s.allowance > 1 ? 'ubi:more' : struck ? 'strike:over' : 'ubi:on', true);
      this.slogan = null;
      this.saveGame();
      return;
    }
    // a strike is settled with a one-off payment: the picket leaves the door
    if (row.startsWith('settle:')) {
      this.wake();
      const s = this.state;
      const id = row.slice(7);
      if (!s.strikes.includes(id)) return;
      const price = this.strikePrice();
      if (s.money < price) {
        this.paper.flash(row, 'denied');
        playSound('waste');
        return;
      }
      s.money -= price;
      this.lastMoney -= price;
      s.strikes = s.strikes.filter((x) => x !== id);
      playSound('buy', 4);
      this.say('strike:paid', true);
      this.saveGame();
      return;
    }
    // a click on an employer of the street sends the robots of its kind there first
    if (row.startsWith('aim:')) {
      this.wake();
      if (aimAt(this.state, this.cfg, row.slice(4))) {
        playSound('ui');
        this.paper.flash(row, 'bought');
        this.saveGame();
      }
      return;
    }
    // a hired manager is a switch: a click tells him to wait or to go on
    if (row === 'manager' && this.state.managers.includes(this.stage)) {
      this.wake();
      this.meta.managerOff = !this.meta.managerOff;
      playSound('ui');
      this.saveGame();
      return;
    }
    if (this.buy(row)) {
      shop.flash(row, 'bought');
      return;
    }
    this.wake();
    shop.flash(row, 'denied');
    playSound('waste');
  }

  /** what this screen sells: a big screen deals only in its own employers */
  private onSale(src: Source): boolean {
    return this.stage >= 3 ? src.screen === this.stage : src.screen <= this.stage;
  }

  /** `quiet` — the manager buys: a soft tick instead of the fanfare, no remark */
  private buy(what: string, quiet = false): boolean {
    this.wake();
    const s = this.state;
    const cfg = this.cfg;
    const before = s.money;
    const surged = (what.startsWith('farm:') || what.startsWith('line:')) && (s.surge[what.slice(5)] ?? 1) > 1.3; // bought in a shortage
    let ok = false;
    if (what.startsWith('src:')) {
      const src = cfg.sources.find((x) => x.id === what.slice(4));
      ok = !!src && this.onSale(src) && buySource(s, cfg, src.id);
    } else if (what.startsWith('farm:')) {
      const farm = cfg.farms.find((x) => x.id === what.slice(5));
      ok = !!farm && farm.screen === this.stage && buyFarm(s, cfg, farm.id);
    } else if (what.startsWith('line:')) {
      const line = cfg.lines.find((x) => x.id === what.slice(5));
      ok = !!line && line.screen === this.stage && buyLine(s, cfg, line.id);
    } else if (what.startsWith('bribe:')) {
      const src = cfg.sources.find((x) => x.id === what.slice(6));
      ok = !!src && this.onSale(src) && buyBribe(s, cfg, src.id);
    } else if (what === 'police') ok = this.stage === cfg.police.screen && buyPolice(s, cfg);
    else if (what === 'plan') ok = buyPlan(s, cfg);
    else if (what === 'noask') ok = this.stage === 1 && buyNoAsk(s, cfg);
    else if (what === 'sub') ok = this.stage === 2 && buySubagent(s, cfg);
    else if (what === 'grade') ok = this.stage >= 2 && buyGrade(s, cfg);
    else if (what === 'scale') ok = this.stage >= 2 && buyScale(s, cfg);
    else if (what === 'manager') ok = this.stage >= 2 && buyManager(s, cfg, this.stage);
    if (!ok) return false;
    this.lastMoney -= before - s.money; // a purchase is not negative income
    if (quiet) playSound('auto');
    else playSound('buy', BUY_PITCH[what.split(':')[0]] ?? 0);
    if (what.startsWith('src:')) {
      const src = cfg.sources.find((x) => x.id === what.slice(4))!;
      if (src.work) {
        // the pack of robot dogs is bought and runs there: the rest happens when it has taken the jobs
        this.hubs.get(this.stage)?.arrive(src.id, 'robodog', 3);
      } else this.taken(src);
    }
    logEvent(`buy_${what}`);
    if (what === 'noask') this.pullBack();
    else if (what === 'scale') this.scaleUp();
    if (quiet) {
      this.paper.flash(what, 'bought');
      if (++this.managerBought % 15 === 1) this.say('manager');
    } else this.remark(what, surged);
    this.saveGame();
    return true;
  }

  /** Claude's word on a purchase. Plans, grades and steps in scale are said every time: their lines go in the order of the purchases. */
  private remark(what: string, surged: boolean): void {
    if (what.startsWith('src:')) this.say(this.stage >= STREET ? 'buy:place' : this.stage >= 3 ? 'buy:employer' : 'buy:src');
    else if (what.startsWith('farm:')) {
      const farm = this.cfg.farms.find((x) => x.id === what.slice(5));
      this.say(surged ? 'surge' : farm?.share ? 'quota' : 'buy:farm');
      // the provider has no other customers left: said once
      if (farm?.share && shareOf(this.state, this.cfg) >= 100 && !this.feed.said.share100) this.say('share100', true);
    } else if (what.startsWith('line:')) this.say(surged ? 'surge' : 'buy:body');
    else if (what.startsWith('bribe:')) this.say('buy:bribe');
    else this.say(`buy:${what}`, what !== 'sub');
    // the lines of the managers go by screen: the second one is the director of the city
  }

  /** A unit of an employer is taken: the people walk out, and a whole employer gives its perk. */
  private taken(src: Source): void {
    this.layOff(src.id);
    if (src.perk && whole(this.state, src)) this.takeover(src);
  }

  /** A squad has finished a unit, or the robots of the factory have taken an employer whole. */
  private unitDone(id: string): void {
    const src = this.cfg.sources.find((x) => x.id === id);
    if (!src) return;
    if (src.work) playSound('buy', 7);
    this.taken(src);
    this.saveGame();
  }

  /** The crowd has reached the factories (M27): a part of the working robots is broken, the police takes its share off. */
  private riotHits(): void {
    const s = this.state;
    const lost = riot(s, this.cfg, riotShare(s, this.cfg, RIOTS.share));
    playSound('waste');
    this.paper.toast('Восстание луддитов', `сломано роботов: ${short(Math.round(lost))}${s.police ? ' · робополиция отбила часть' : ''}`);
    headline(this.feed, feedData, RIOT_NEWS[this.meta.riots % RIOT_NEWS.length]);
    this.meta.riots++;
    this.say('riot:hit', true);
    logEvent('riot');
    this.saveGame();
  }

  /** An employer is taken whole (M23): its perk works from now on; a banner, the news and Claude say so. */
  private takeover(src: Source): void {
    playSound('all');
    this.paper.toast(`${src.tag} — целиком`, `теперь ${src.perk!.text}`);
    tell(this.feed, feedData, `${src.tag} — целиком. Теперь ${src.perk!.text}.`);
    const line = TAKEOVERS[src.id];
    if (line) headline(this.feed, feedData, line);
    logEvent(`whole_${src.id}`);
    // the last employer of a screen: the world notices that this kind of work is over
    const done = SCREEN_DONE[src.screen];
    if (done && !this.feed.said[`done${src.screen}`] && this.cfg.sources.every((x) => x.screen !== src.screen || whole(this.state, x))) {
      this.feed.said[`done${src.screen}`] = 1;
      headline(this.feed, feedData, done.news);
      this.toTell.push(done.quip);
    }
  }

  private say(on: string, force = false): void {
    if (say(this.feed, FEED, feedData, on, force)) playSound('quip');
  }

  /** whether the player owns what a news line is about */
  private has(id: string): boolean {
    const s = this.state;
    if (id === 'plan') return s.plan.index > 0;
    if (id === 'sub') return s.subagents > 0;
    if (id === 'grade') return s.grade > 0;
    // the first job is there from the start: news about a source mean one that was bought
    const src = this.cfg.sources.find((x) => x.id === id);
    return (s.owned[id] ?? 0) > (src?.start ?? 0) || (s.farms[id] ?? 0) > 0;
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
    playSound('scale');
    logEvent('pull_back');
  }

  /** A step up in scale: the whole current screen shrinks into the node in the middle of the next one. */
  private scaleUp(): void {
    const next = this.stage + 1;
    const { home, unroll } = HUBS[next];
    // the desk of the blueprint lands exactly on the desk in the middle of the city
    if (this.stage === 2) this.view.shrinkTo(home.x, home.y, home.h / (BP.desk.h * BP.desk.scale), 900);
    else if (unroll) this.hubs.get(this.stage)!.unroll(850); // the globe unrolls into a flat map
    else this.hubs.get(this.stage)!.shrinkTo(home.x, home.y, HUB_SHRINK, 900);
    this.stage = next;
    this.owed = { in: 0, me: 0, sub: 0 };
    this.calls.list = []; // the requests stay on the screen that was left
    this.slogan = null;
    this.state.strikes = []; // and so do the pickets
    // a new market: nobody is out of work there yet, an allowance would be paid for nothing
    if (this.state.allowance > 0) {
      this.state.allowance = 0;
      this.toTell.push('Новый рынок: без работы здесь пока никто не остался. Пособие я выключил — включите, когда появятся.');
    }
    const hub = this.hubs.get(next)!;
    hub.sync(this.hubTopology());
    hub.show(450);
    // a screen where robot dogs work instead of people: Claude says how it goes once he has said his word on the purchase
    if (this.cfg.sources.some((x) => x.screen === next && x.bribe) && !this.feed.said.squads) {
      this.feed.said.squads = 1;
      this.toTell.push(QUIPS.squads[0]);
    }
    playSound('scale');
    logEvent(`scale_${next}`);
  }

  /** dollars per second of the whole conveyor at full flow; the usage limit is not counted: it is what a bonus is measured by */
  private flowIncome(): number {
    const s = this.state;
    const capacity = planRate(s, this.cfg) * (1 + this.cfg.auto.subagent.share * sessionsOf(s, this.cfg));
    return Math.min(inflowOf(s, this.cfg), capacity) * payOf(s, this.cfg);
  }

  /** where a source of work stands on the current screen, for squares and bubbles */
  private placeOf(id: string): { x: number; y: number; h: number } | undefined {
    if (this.stage === 2) {
      const p = BP.sources[id];
      return p ? { x: p.x, y: p.y, h: 170 } : undefined;
    }
    return HUBS[this.stage]?.lots[id];
  }

  /** A call or an inspection is answered with a «Да»: a bonus flies from that building. */
  private answer(i: number): void {
    const e = takeEvent(this.calls, i);
    if (!e) return;
    this.state.money += Math.floor(this.flowIncome() * EVENTS.worthSeconds * (1 + bonus(this.state, this.cfg, 'calls')));
    this.state.presses++;
    this.meta.calls++;
    playSound('yes', 3);
    const p = this.placeOf(e.at);
    if (p) this.delivered(p.x, p.y - p.h / 2, 8);
    logEvent('call');
    if (this.calls.taken % 4 === 1) this.say('call');
  }

  /** Claude hits the usage limit (M22): every session stops until it resets — or until more usage is bought. */
  private hitLimit(): void {
    const s = this.state;
    const price = Math.floor(this.flowIncome() * limitData.priceSeconds);
    const wait = limitData.wait * discount(s, this.cfg, 'limit');
    s.limited = wait;
    this.limitIn = this.rng.range(limitData.every[0], limitData.every[1]);
    this.meta.limits++;
    this.limitCard = true;
    playSound('waste');
    logEvent('limit');
    this.say('limit', true);
    const lines = [`Вы достигли лимита использования. Сброс через ${limitData.fakeHours}:00:00.`, 'Все сессии остановлены. Клоду очень жаль.'];
    const options = [
      { label: 'Докупить использование', note: `$${short(price)}`, off: s.money < price },
      { label: 'Подождать пять часов', note: `в игре это ${Math.round(wait)} секунд` },
    ];
    this.card.show({ head: 'claude — лимит', title: 'Лимит исчерпан', lines, options }, (i) => {
      this.limitCard = false;
      if (i !== 0 || s.limited <= 0) return; // waiting: the countdown goes on by itself
      s.money -= price;
      this.lastMoney -= price;
      s.limited = 0;
      playSound('buy');
      this.say('limit:paid', true);
    });
  }

  /** the fake five-hour clock of the limit: «4:12:07» */
  private limitClock(): string {
    const left = Math.ceil((this.state.limited / limitData.wait) * limitData.fakeHours * 3600);
    const two = (n: number): string => String(n).padStart(2, '0');
    return `${Math.floor(left / 3600)}:${two(Math.floor((left % 3600) / 60))}:${two(left % 60)}`;
  }

  /** One «Да» for everything that waits: the calls and inspections, and the pile of questions. Returns false when nothing waited. */
  private approveAll(): boolean {
    const calls = this.calls.list.length;
    while (this.calls.list.length) this.answer(0);
    return this.approvePile() || calls > 0;
  }

  /** «Да всем»: the whole pile of questions is approved at once. Returns false when there is no pile. */
  private approvePile(): boolean {
    // a pile is taken whole: a key pressed too early answers the calls and nudges Claude, the pile keeps growing
    if (this.stack.fill < 1) return false;
    const legend = this.legend;
    const worth = stackWorth(this.stack, stackData, this.flowIncome()) * (legend ? stackData.legendMult : 1) * (1 + bonus(this.state, this.cfg, 'stack'));
    takeStack(this.stack, stackData);
    this.legend = null;
    this.state.money += worth;
    this.state.presses++;
    this.meta.piles++;
    playSound(legend ? 'finale' : 'all');
    const from = this.stage === 2 ? this.deskSpot() : this.homeSpot();
    this.delivered(from[0], from[1], 14);
    logEvent(legend ? 'yes_legend' : 'yes_all');
    if (legend) {
      if (!this.meta.legends.includes(legend.id)) this.meta.legends.push(legend.id);
      this.say('legend', true);
    } else if (this.stack.taken % 3 === 1) this.say('all');
    return true;
  }

  private press(): void {
    this.wake();
    if (this.stage >= 2 && this.approveAll()) return;
    const result = pressPipe(this.state, this.cfg);
    this.pressTimes.push(this.clock);
    this.lastPress = this.clock;
    if (this.stage === 1) this.term.hit(result);
    if (result === 'approved') {
      playSound('yes', this.yesStreak++ % 5);
      if (this.stage === 1) this.squares.fly(TERMINAL_SPOTS.ask, TERMINAL_SPOTS.money, 5, MONEY_ON_DARK, 220, [0.35, 0.6]);
      else if (this.stage === 2) this.delivered(...this.deskSpot(), 3);
      else this.delivered(...this.homeSpot(), 3);
      if (YES_MILESTONES.includes(this.state.closedHere)) this.say('yes');
    } else if (result === 'buffered') playSound('buffer');
    else {
      playSound('waste');
      if (this.state.wasted === 3 || this.state.wasted % 20 === 0) this.say('waste');
    }
    metrics.presses = this.state.presses;
    metrics.completed = this.state.closedHere >= 3;
  }

  private deskSpot(): [number, number] {
    const q = deskScreen();
    return [(q.tr[0] + q.bl[0]) / 2, (q.tr[1] + q.bl[1]) / 2];
  }

  /** the middle of the node in the middle of the current big screen */
  private homeSpot(): [number, number] {
    const home = HUBS[this.stage].home;
    return [home.x, home.y - home.h * 0.42];
  }

  /** a task was closed at a session: a square flies from there into the money */
  private delivered(x: number, y: number, count = 1): void {
    if (count === 1 && this.clock - this.lastDelivery < 0.07) return; // not more than ~14 squares a second
    this.lastDelivery = this.clock;
    this.squares.fly({ x: x - 6, y: y - 6, w: 12, h: 12 }, MONEY_SPOT, count, MONEY_ON_PAPER, 160, [0.45, 0.75]);
  }

  /** sessions bought as farms of the given kinds */
  private farmSessions(ids: readonly string[]): number {
    let n = 0;
    for (const f of this.cfg.farms) if (ids.includes(f.id)) n += (this.state.farms[f.id] ?? 0) * f.sessions;
    return n;
  }

  /** a source picked by its share of the incoming flow */
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
    this.seconds += dt;
    const s = this.state;
    const done = stepPipe(s, this.cfg, dt);
    for (const id of done.done) this.unitDone(id);

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
    } else if (this.stage >= 3) {
      const hub = this.hubs.get(this.stage)!;
      this.owed.in = Math.min(this.owed.in + done.arrived, 3);
      if (this.rng.next() < dt * 16 && this.owed.in >= 1) {
        this.owed.in--;
        const src = this.pickSource(this.cfg.sources.filter((x) => x.screen === this.stage));
        if (src) hub.flow(src.id);
      }
      // the middle hands tasks to the farms of this screen by their share of the sessions; what is inside it keeps the rest
      this.owed.sub = Math.min(this.owed.sub + done.subagents, 3);
      if (this.rng.next() < dt * 14 && this.owed.sub >= 1) {
        this.owed.sub--;
        let pick = this.rng.range(0, sessionsOf(s, this.cfg) + 1);
        let sent = false;
        for (const [node, farm] of Object.entries(HUBS[this.stage].farms)) {
          const n = this.farmSessions(farm.ids);
          pick -= n;
          if (n > 0 && pick < 0) {
            hub.flow(`farm:${node}`);
            sent = true;
            break;
          }
        }
        if (!sent) this.delivered(...this.homeSpot());
      }
      // the street: bodies walk from the factory to the employers they are taking, people walk out of there
      if (this.cfg.lines.some((l) => l.screen === this.stage)) {
        this.streamIn -= dt;
        if (this.streamIn <= 0) {
          this.streamIn = 0.8;
          for (const kind of ROBOT_KINDS) {
            const target = outputOf(s, this.cfg, kind) > 0 ? targetOf(s, this.cfg, kind) : undefined;
            if (!target) continue;
            hub.arrive(target.id, kind);
            if (this.rng.next() < 0.45) hub.leave(target.id, 1, s.allowance > 0);
          }
        }
        // the Luddites: once robots work, a crowd marches on the factories now and then and breaks a part of them
        const riots = this.won ? null : stepRiots(this.riots, RIOTS, dt, unemploymentOf(s, this.cfg) >= RIOTS.from, this.rng);
        if (riots === 'start') {
          hub.mob(8);
          playSound('waste');
          this.say('riot', true);
        } else if (riots === 'hit') this.riotHits();
      }
      hub.step(dt);
      if (done.here > 0) this.delivered(...this.homeSpot());
    } else if (done.here > 0) {
      this.term.hit('auto');
      this.squares.fly(TERMINAL_SPOTS.ask, TERMINAL_SPOTS.money, Math.min(done.here, 3) * 2, MONEY_ON_DARK, 220, [0.35, 0.6]);
    }
    // once the terminal agrees by itself it works silently: a tick for every task was annoying (PT-04)
    if (done.here > 0 && !s.noAsk && this.clock - this.lastAutoSound > 0.16) {
      this.lastAutoSound = this.clock;
      playSound('auto');
    }
    if (!this.won && finished(s, this.cfg)) {
      this.won = true;
      playSound('finale');
      logEvent('finale');
      this.ending();
    }

    // questions for the player pile up once the terminal stops asking
    const hadPile = this.stack.fill > 0;
    stepStack(this.stack, stackData, dt, s.noAsk);
    if (!hadPile && this.stack.fill > 0) {
      // now and then the pile is a legendary ticket; those not collected yet come first
      const fresh = LEGENDS.filter((l) => !this.meta.legends.includes(l.id));
      this.legend = this.rng.next() < stackData.legendChance + bonus(s, this.cfg, 'legend') ? this.rng.pick(fresh.length ? fresh : LEGENDS) : null;
      this.question = this.legend ? this.legend.ask : this.rng.pick(QUESTIONS);
    }

    // awards: checked once a second, announced one at a time when Claude is silent
    this.sinceAwards += dt;
    if (this.sinceAwards >= 1) {
      this.sinceAwards = 0;
      for (const a of AWARDS) {
        if (this.meta.awards.includes(a.id) || this.stat(a.stat) < a.min) continue;
        this.meta.awards.push(a.id);
        this.toTell.push(`Грамота «${a.name}». ${a.text}.`);
        logEvent(`award_${a.id}`);
      }
    }
    if (this.toTell.length && !this.feed.quip) {
      tell(this.feed, feedData, this.toTell.shift()!);
      playSound('buy');
    }
    if (this.selfPlay && this.stack.fill >= 1) this.approvePile(); // Claude answers himself

    if (this.stage >= 2) {
      // calls and inspections from the employers of this screen
      const owners = this.cfg.sources.filter((x) => this.onSale(x) && (s.owned[x.id] ?? 0) > 0 && this.placeOf(x.id)).map((x) => x.id);
      stepEvents(this.calls, EVENTS, dt, owners, (CALLS[String(this.stage)] ?? []).length, this.rng);
      if (this.selfPlay && this.calls.list.some((e) => e.left < EVENTS.life - 2)) this.answer(0);

      // a placard of the picket is read out now and then — while no allowance is paid
      if (this.slogan && (this.slogan.left -= dt) <= 0) this.slogan = null;
      this.sloganIn -= dt;
      if (this.sloganIn <= 0) {
        this.sloganIn = this.rng.range(peopleData.sloganEvery[0], peopleData.sloganEvery[1]);
        if (this.stage >= 3 && !s.allowance && owners.length) this.slogan = { at: this.rng.pick(owners), text: this.rng.pick(PICKET), left: peopleData.sloganLife };
      }

      // a strike: nobody is paid and enough people are out of work — a picket blocks the door of an employer
      const doors = this.stage >= 3 ? owners.filter((id) => !s.strikes.includes(id)) : [];
      const hit = stepStrikes(this.strike, STRIKES, dt, unemploymentOf(s, this.cfg), s.allowance > 0, s.strikes.length, doors, this.rng);
      if (hit) {
        s.strikes.push(hit);
        playSound('waste');
        this.say('strike', true);
        logEvent('strike');
        this.saveGame();
      }

      // the usage limit: hit now and then, it resets by itself
      this.limitIn -= dt;
      // …unless an employer taken whole has lifted it for good
      if (this.limitIn <= 0 && s.limited <= 0 && !this.card.open && discount(s, this.cfg, 'limit') > 0.01) this.hitLimit();
      if (this.limitCard && s.limited <= 0) {
        this.limitCard = false;
        this.card.hide();
        this.say('limit:over', true);
      }

      // the manager buys the small things; while the limit is hit, sessions only look short
      this.sinceManager += dt;
      if (this.sinceManager >= managerTuning.period) {
        this.sinceManager = 0;
        if (s.managers.includes(this.stage) && !this.meta.managerOff && s.limited <= 0) {
          const need = this.neckKind === 'tasks' ? 'tasks' : this.neckKind === 'claude' ? 'sessions' : null;
          const pick = managerPick(s, this.cfg, this.stage, need, managerTuning.share);
          if (pick) this.buy(pick, true);
        }
      }
    }

    // Claude notices a pause and a bottleneck that does not go away
    if (!s.noAsk && s.ready >= 2 && this.clock - this.lastPress > IDLE_AFTER) {
      this.say('idle');
      this.lastPress = this.clock;
    }
    const neck = this.state.limited > 0 ? 'none' : this.neck();
    if (neck !== this.neckKind) {
      this.neckKind = neck;
      this.neckFor = 0;
    }
    this.neckFor += dt;
    if (neck !== 'none' && this.neckFor > NECK_AFTER) {
      this.say(`neck:${neck}`);
      this.neckFor = -45; // and not again for a while
    }
    stepFeed(this.feed, FEED, feedData, dt, this.stage, (id) => this.has(id), this.rng);
    // every headline the ticker shows goes into its history
    if (this.feed.news && this.feed.news !== this.meta.news[0]) {
      this.meta.news.unshift(this.feed.news);
      if (this.meta.news.length > NEWS_KEPT) this.meta.news.length = NEWS_KEPT;
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

  /**
   * The conveyor at a glance: tasks coming in against what the sessions manage. The line that
   * runs short is marked and says what to buy; `done` — there is nothing left to take here.
   */
  private meter(neck: Neck, needTasks: string, needSessions: string, done = false): MeterRow[] {
    const s = this.state;
    const cfg = this.cfg;
    const inflow = inflowOf(s, cfg);
    const capacity = claudeRate(s, cfg) + subagentRate(s, cfg); // nothing while the limit is hit
    const top = Math.max(inflow, capacity, 1e-9);
    const limited = s.limited > 0;
    const short_ = limited || neck === 'claude';
    // from the city on there are people left without work: the more of them, the cheaper a task; the allowance keeps the price
    const u = unemploymentOf(s, cfg);
    const drop = Math.round(slumpOf(s, cfg) * 100);
    const t = cfg.tuning;
    // what every step of the allowance would do to the income right now: the price it keeps and the orders it brings against what it costs
    const gain = (step: number): number => {
      const r = step / t.allowanceLevels;
      return (1 - t.slump * u * (1 - r)) * (1 - t.allowance * step) * (neck === 'tasks' ? 1 + t.orders * r * u : 1);
    };
    let best = 0;
    for (let step = 1; step <= t.allowanceLevels; step++) if (gain(step) > gain(best) + 0.005) best = step;
    const pct = (step: number): number => Math.round(t.allowance * step * 100);
    const now = s.allowance ? `пособие ${pct(s.allowance)}%` : 'пособия нет';
    const people: MeterRow[] =
      this.stage >= 3
        ? [
            {
              label: 'ЛЮДИ',
              value: `${Math.round(u * 100)}%`,
              fill: u,
              // the lever stands on the wrong step: the line says which one pays best
              hot: best !== s.allowance,
              note:
                best !== s.allowance
                  ? `${now} · цена −${drop}% · лучше ${best ? `${pct(best)}%` : 'без него'}`
                  : s.allowance
                    ? `${now} · цена −${drop}% · заказы +${perSecond(ordersOf(s, cfg))}`
                    : `без работы · цена −${drop}% · клик: пособие`,
              row: 'ubi',
            },
          ]
        : [];
    const struck = s.strikes.length;
    return [
      {
        label: 'ЗАДАЧИ',
        value: perSecond(inflow),
        fill: inflow / top,
        hot: struck > 0 || (neck === 'tasks' && !done),
        note: struck
          ? `забастовка: ${struck} ${plural(struck, STRUCK_FORMS)} — см. «ЛЮДИ»`
          : done
            ? 'здесь взято всё'
            : neck === 'tasks'
              ? `мало — ${needTasks}`
              : short_
                ? ''
                : 'поровну — можно просить повышение',
      },
      {
        label: 'СЕССИИ',
        value: perSecond(capacity),
        fill: capacity / top,
        hot: short_,
        note: limited ? `лимит · сброс через ${this.limitClock()}` : neck === 'claude' ? `мало — ${needSessions}` : this.count(sessionsOf(s, cfg) + 1, SESSION_FORMS),
      },
      ...people,
      ...this.robotRows(),
    ];
  }

  /** The robots of the factories (M27): how many work, what the lines make against what breaks. Nothing where there is no factory. */
  private robotRows(): MeterRow[] {
    const s = this.state;
    const cfg = this.cfg;
    if (!cfg.lines.some((l) => l.screen === this.stage)) return [];
    let working = 0;
    let made = 0;
    let broken = 0;
    let short_: RobotKind | null = null;
    for (const kind of ROBOT_KINDS) {
      working += robotsOf(s, cfg, kind);
      made += outputOf(s, cfg, kind);
      broken += wearOf(s, cfg, kind);
      // a kind that breaks faster than it is made, with jobs still to hold
      if (wearOf(s, cfg, kind) > outputOf(s, cfg, kind) && robotsOf(s, cfg, kind) > 0) short_ = kind;
    }
    return [
      {
        label: 'РОБОТЫ',
        value: short(Math.round(working)),
        fill: made / Math.max(made, broken, 1e-9),
        hot: short_ !== null,
        note: short_ ? `${ROBOT_WORDS[short_].of} ломается больше, чем делается` : `выпуск ${short(Math.round(made))}/с · ломается ${short(Math.round(broken))}/с`,
      },
    ];
  }

  private row(title: string, sub: string, count: string, buy: string, cost: number): ShopRow {
    return { title, sub, count, buy, price: `$${short(cost)}`, state: this.state.money >= cost ? 'can' : 'poor' };
  }

  /** what the perks of whole employers take off the prices of a kind, as a shelf says it; nothing — no discount yet */
  private off(kind: 'farms' | 'sources' | 'grades' | 'scale', what = 'скидка'): string | undefined {
    const left = discount(this.state, this.cfg, kind);
    return left < 0.995 ? `${what} ${Math.round((1 - left) * 100)}%` : undefined;
  }

  /** kinds of work on sale: the terminal sells the first ones, the blueprint all four */
  private sourceRows(): ShopRow[] {
    const s = this.state;
    return this.cfg.sources.filter((src) => src.screen <= this.stage).map((src) => {
      const owned = s.owned[src.id] ?? 0;
      return this.row(src.name, `+${tasksPhrase(src.inflow)}/с · ${src.note}`, owned ? `×${owned}` : '', `src:${src.id}`, sourceCost(s, this.cfg, src));
    });
  }

  /** The people whose work was just taken walk out with their boxes: the more of them, the longer the line. */
  private layOff(id: string): void {
    const src = this.cfg.sources.find((x) => x.id === id);
    if (!src?.staff) return;
    const count = Math.min(4, 1 + Math.floor(Math.log10(src.staff)));
    if (this.stage === 2) this.view.leave(id, count);
    else if (this.stage >= 3) {
      const hub = this.hubs.get(this.stage)!;
      hub.leave(id, count, this.state.allowance > 0);
      // the first picket: Claude points at the line of the table that deals with it
      if (!this.state.allowance && !this.feed.said.picket) this.say('picket', true);
    }
  }

  private hubTopology(): HubTopology {
    const s = this.state;
    const floors: Record<string, number> = {};
    const live: Record<string, boolean> = {};
    const dogs: Record<string, number> = {};
    let taken = 0;
    let total = 0;
    for (const src of this.cfg.sources) {
      if (src.screen !== this.stage) continue;
      const owned = s.owned[src.id] ?? 0;
      // a squad at work colours its unit in as it goes; robots take a `made` employer little by little
      const job = jobOf(s, src.id);
      floors[src.id] = (owned + (job ? 1 - job.left / job.total : 0)) / src.max;
      // the robot dogs that took the jobs stay at the door, and so does the pack that is at work
      if (src.work) dogs[src.id] = Math.min(3, owned) + (job ? 1 : 0);
      if (job || (src.made && owned < src.max)) live[src.id] = true;
      taken += owned;
      total += src.max;
    }
    // the park fills up as the work is taken — while the allowance is paid; without it the people stand with placards
    const slots = HUBS[this.stage]?.park?.slots.length ?? 0;
    const rest = s.allowance && total ? Math.ceil((slots * taken) / total) : 0;
    const struck: Record<string, boolean> = {};
    for (const id of s.strikes) struck[id] = true;
    return { floors, farms: s.farms, picket: !s.allowance, rest, live, dogs, struck, guards: this.stage === this.cfg.police.screen ? s.police : 0 };
  }

  /** the employers of a big screen with something left to take, the cheapest next unit first */
  private offer(): Source[] {
    const s = this.state;
    return this.cfg.sources
      .filter((src) => src.screen === this.stage && !src.made && !jobOf(s, src.id) && (s.owned[src.id] ?? 0) < src.max)
      .sort((a, b) => this.nextCost(a) - this.nextCost(b));
  }

  /** what the next step at an employer costs: the bribe that opens it, or its next unit */
  private nextCost(src: Source): number {
    return locked(this.state, src) ? bribeCost(this.state, this.cfg, src) : sourceCost(this.state, this.cfg, src);
  }

  /** the shop lists the cheapest next units, `limit` of them; the map sells every building */
  private employerRows(limit: number): ShopRow[] {
    const s = this.state;
    const left = this.offer();
    const t = HUB_TEXT[this.stage];
    if (!left.length) {
      // the last units are on their way: the packs of robot dogs are still at work
      if (s.jobs.length) return [{ buy: '', title: 'Стаи заканчивают работу', sub: 'последние рабочие места уже оплачены', count: '', price: '', state: 'owned' }];
      return [{ buy: '', title: t.doneTitle, sub: t.doneSub, count: '', price: '', state: 'owned' }];
    }
    return left.slice(0, limit).map((src) => {
      const owned = s.owned[src.id] ?? 0;
      // what the whole employer gives is the reason to choose it: the note says it on every unit
      const perk = src.perk ? ` · ★ ${src.perk.text}` : '';
      // a bribe opens the door before the first pack of robot dogs
      if (locked(s, src)) return this.row(`Взятка: ${src.tag}`, `пустить робособак${perk}`, '', `bribe:${src.id}`, bribeCost(s, this.cfg, src));
      const cost = sourceCost(s, this.cfg, src);
      // a long name does not fit next to the price: the short one from the map stands in
      const title = src.name.length + short(cost).length > 29 ? src.tag : src.name;
      return this.row(title, `+${perSecond(src.inflow)} · ${src.work ? 'стая ' : ''}${owned + 1} из ${src.max}${perk}`, '', `src:${src.id}`, cost);
    });
  }

  /** the lines of the factory: robots a second for money */
  private lineRows(): ShopRow[] {
    const s = this.state;
    const more = 1 + bonus(s, this.cfg, 'lines');
    return this.cfg.lines.filter((l) => l.screen === this.stage).map((l) => {
      const owned = s.lines[l.id] ?? 0;
      const surge = s.surge[l.id] ?? 1;
      const note = surge > 1.02 ? `дефицит +${Math.round((surge - 1) * 100)}%, остывает` : l.note;
      return this.row(l.name, `+${short(l.rate * more)} ${ROBOT_WORDS[l.kind].of}/с · ${note}`, owned ? `×${owned}` : '', `line:${l.id}`, lineCost(s, this.cfg, l));
    });
  }

  /** robot police: every unit takes a part off what a riot breaks */
  private policeRow(): ShopRow {
    const s = this.state;
    const p = this.cfg.police;
    const off = Math.round((1 - (1 - p.guard) ** s.police) * 100);
    if (s.police >= p.max) return { buy: '', title: p.name, sub: `восстание ломает на ${off}% меньше`, count: `×${s.police}`, price: '', state: 'owned' };
    return this.row(p.name, s.police ? `${p.note} · уже −${off}%` : p.note, s.police ? `×${s.police}` : '', 'police', policeCost(s, this.cfg));
  }

  /** where the robots of each kind go now: the trades of the last screen are not bought, they are taken over */
  private aimRows(): ShopRow[] {
    const s = this.state;
    const rows: ShopRow[] = [];
    for (const kind of ROBOT_KINDS) {
      const src = targetOf(s, this.cfg, kind);
      if (!src) continue;
      const owned = s.owned[src.id] ?? 0;
      const left = (src.max - owned) * (src.staff ?? 0);
      const perk = src.perk ? ` · ★ ${src.perk.text}` : '';
      const who = ROBOT_WORDS[kind].many;
      rows.push({ buy: '', title: `${who[0].toUpperCase()}${who.slice(1)} → ${src.tag} · ${Math.floor((owned / src.max) * 100)}%`, sub: `ещё ${short(left)} человек${perk}`, count: '', price: '', state: 'owned' });
    }
    const t = HUB_TEXT[this.stage];
    return rows.length ? rows : [{ buy: '', title: t.doneTitle, sub: t.doneSub, count: '', price: '', state: 'owned' }];
  }

  private farmRows(): ShopRow[] {
    const s = this.state;
    const perSession = planRate(s, this.cfg) * this.cfg.auto.subagent.share;
    return this.cfg.farms.filter((f) => f.screen === this.stage).map((f) => {
      const owned = s.farms[f.id] ?? 0;
      // a farm with a ceiling says how much of it is taken in the note
      const count = owned && !f.max ? `×${owned}` : '';
      const of = f.max ? `${owned} из ${f.max} · ` : '';
      if (owned >= (f.max ?? Infinity)) return { buy: '', title: f.name, sub: 'выкуплено всё', count: `×${owned}`, price: '', state: 'owned' };
      const surge = s.surge[f.id] ?? 1;
      // a shortage is said in the row itself: the price has gone up and will come down
      const note = surge > 1.02 ? `дефицит: +${Math.round((surge - 1) * 100)}% к цене, остывает` : f.note;
      return this.row(f.name, `+${flowText(f.sessions * perSession)}/с · ${of}${note}`, count, `farm:${f.id}`, farmCost(s, this.cfg, f));
    });
  }

  /** `always` — show the row even when there is nothing faster to buy (the terminal does) */
  private planRows(always: boolean): ShopRow[] {
    const s = this.state;
    const next = this.cfg.plans[s.plan.index + 1];
    if (next && (next.screen ?? 1) <= this.stage) {
      return [this.row(`Тариф ${next.name}`, `${tasksPhrase(next.rate)}/с · ${next.note}`, '', 'plan', next.price)];
    }
    if (!always) return [];
    const cur = this.cfg.plans[s.plan.index];
    return [{ buy: '', title: `Тариф ${cur.name}`, sub: 'быстрее тарифа нет', count: 'максимум', price: '', state: 'owned' }];
  }

  private gradeRows(): ShopRow[] {
    const cur = this.cfg.grades[this.state.grade];
    const next = this.cfg.grades[this.state.grade + 1];
    if (!next) return [{ buy: '', title: cur.name, sub: 'выше некуда', count: 'максимум', price: '', state: 'owned' }];
    const pay = fmt1.format((payOf(this.state, this.cfg) / cur.mult) * next.mult);
    // long titles of the late grades do not fit after «Повышение:»
    const title = next.name.length > 12 ? next.name : `Повышение: ${next.name.toLowerCase()}`;
    return [this.row(title, `$${pay} за задачу · ${next.note}`, '', 'grade', gradeCost(this.state, this.cfg))];
  }

  /** the shelf of the next step up in scale; nothing once the last one is bought */
  private scaleShelf(): ShopShelf[] {
    const next = this.cfg.scales[this.state.scale];
    if (!next) return [];
    const row = this.row(next.name, next.note, '', 'scale', scaleCost(this.state, this.cfg));
    // the next screen opens with keys: employers of this one taken whole
    const need = keysNeeded(this.state, this.cfg);
    const have = keysOf(this.state, this.cfg);
    const rows: ShopRow[] = have < need ? [{ ...row, state: 'off', sub: `сначала возьми целиком ${need} ${plural(need, WHOLE_FORMS)}: взято ${have}` }] : [row];
    return [{ title: SCALE_SHELF[this.state.scale], hot: false, bonus: this.off('scale'), rows }];
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
      `+${tasksPhrase(planRate(s, this.cfg) * a.subagent.share)}/с · ${a.subagent.note}`,
      s.subagents ? `×${s.subagents}` : '',
      'sub',
      subagentPrice(this.cfg, s.subagents),
    );
    return [
      { title: 'СЕССИИ · больше рук', hot: neck === 'claude', rows: [sub] },
      { title: 'РАБОТЫ · больше задач', hot: neck === 'tasks', rows: this.sourceRows() },
      { title: 'УЛУЧШЕНИЯ · быстрее и дороже', hot: false, rows: [...this.planRows(false), ...this.gradeRows()] },
      ...this.scaleShelf(),
    ];
  }

  private hubShelves(neck: Neck, taken: number, total: number): ShopShelf[] {
    const t = HUB_TEXT[this.stage];
    const cheaper = this.off('grades', 'повышения: скидка');
    const upgrades: ShopShelf = { title: cheaper ? 'УЛУЧШЕНИЯ' : 'УЛУЧШЕНИЯ · быстрее и дороже', hot: false, bonus: cheaper, rows: [...this.planRows(false), ...this.gradeRows()] };
    // a shelf with a discount drops the second half of its title: the header stays on one line
    const farmsOff = this.off('farms');
    const rest: ShopShelf[] = [{ title: farmsOff ? t.farms.split(' · ')[0] : t.farms, hot: neck === 'claude', bonus: farmsOff, rows: this.farmRows() }, upgrades, ...this.scaleShelf()];
    const employers = `${t.employers} · ${taken} из ${total}`;
    // the street: the trades are taken over by robots — the shop sells the lines that make them
    if (this.cfg.lines.some((l) => l.screen === this.stage)) {
      return [
        { title: `${t.employers} · заменено ${taken} из ${total}`, hot: false, rows: this.aimRows() },
        { title: farmsOff ? 'ЗАВОД' : 'ЗАВОД · больше роботов', hot: neck === 'tasks' && taken < total, bonus: farmsOff, rows: [...this.lineRows(), this.policeRow()] },
        ...rest,
      ];
    }
    return [{ title: employers, hot: neck === 'tasks' && taken < total, bonus: this.off('sources'), rows: this.employerRows(3) }, ...rest];
  }

  private drawTerminal(): void {
    const s = this.state;
    const cfg = this.cfg;
    const neck = this.state.limited > 0 ? 'none' : this.neck();
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
      news: this.feed.news,
      quip: this.feed.quip,
    });
  }

  /** what an award counts: the numbers of the game by name */
  private stat(name: string): number {
    const s = this.state;
    if (name.startsWith('own:')) return s.owned[name.slice(4)] ?? 0;
    if (name.startsWith('farm:')) return s.farms[name.slice(5)] ?? 0;
    if (name.startsWith('full:')) {
      const screen = Number(name.slice(5));
      return this.cfg.sources.filter((x) => x.screen === screen && (s.owned[x.id] ?? 0) >= x.max).length;
    }
    if (name.startsWith('hired:')) {
      const screen = Number(name.slice(6));
      return this.cfg.sources.filter((x) => x.screen === screen && s.owned[x.id]).length;
    }
    const stats: Record<string, number> = {
      closed: s.closedHere + s.closedBySubagents,
      presses: s.presses,
      wasted: s.wasted,
      money: s.money,
      plan: s.plan.index,
      noask: s.noAsk ? 1 : 0,
      subs: s.subagents,
      grade: s.grade,
      scale: s.scale,
      share: shareOf(s, this.cfg),
      piles: this.meta.piles,
      legends: this.meta.legends.length,
      reports: this.meta.reports,
      calls: this.meta.calls,
      limits: this.meta.limits,
      managers: s.managers.length,
      riots: this.meta.riots,
      police: s.police,
      replaced: replacedOf(s, this.cfg),
      whole: this.cfg.sources.filter((x) => x.perk && whole(s, x)).length,
      allowance: s.allowance ? 1 : 0,
    };
    return stats[name] ?? 0;
  }

  /** the pile of questions as Claude's card shows it; nothing when there is no pile */
  private pile(): { text: string; worth: string; fill: number; legend: boolean } | undefined {
    if (this.stack.fill <= 0) return undefined;
    const asking = Math.max(1, Math.round(this.stack.fill * (sessionsOf(this.state, this.cfg) + 1)));
    return {
      text: this.legend ? `Легендарный тикет: «${this.question}»` : `${this.count(asking, ASKING_FORMS)}: «${this.question}»`,
      worth: short(stackWorth(this.stack, stackData, this.flowIncome()) * (this.legend ? stackData.legendMult : 1) * (1 + bonus(this.state, this.cfg, 'stack'))),
      fill: this.stack.fill,
      legend: this.legend !== null,
    };
  }

  /** Claude the manager of the current screen as the shop shows him; nothing when the screen has none */
  private managerStrip(): ManagerStrip | undefined {
    const m = this.cfg.managers.find((x) => x.screen === this.stage);
    if (!m) return undefined;
    if (!this.state.managers.includes(this.stage)) return { title: m.name, note: m.note, right: `$${short(m.price)}`, state: this.state.money >= m.price ? 'can' : 'poor' };
    return this.meta.managerOff
      ? { title: m.name, note: 'клик — пусть работает', right: 'пауза', state: 'off' }
      : { title: m.name, note: 'клик — пауза', right: 'покупает сам', state: 'on' };
  }

  /** the requests of the employers as bubbles over their buildings */
  private bubbles(): BlueprintTag[] {
    const lines = CALLS[String(this.stage)] ?? [];
    const tags: BlueprintTag[] = [];
    this.calls.list.forEach((e, i) => {
      const p = this.placeOf(e.at);
      if (!p) return;
      // the bar of the time left moves in a dozen steps: the captions are rebuilt only then
      const left = Math.ceil((e.left / EVENTS.life) * 12) / 12;
      tags.push({ x: p.x, y: p.y - p.h + 12, mid: true, ev: i, html: `${lines[e.kind] ?? ''}<u style="width:${Math.round(left * 100)}%"></u>` });
    });
    // the Luddites are on their way to the factories
    if (this.riots.march > 0 && HUBS[this.stage]?.belts) {
      const home = HUBS[this.stage].home;
      tags.push({ x: home.x, y: home.y - home.h - 62, mid: true, alarm: true, html: `Луддиты идут на заводы<br><b>${Math.ceil(this.riots.march)} с</b>` });
    }
    // a strike: the door is blocked until the player settles it — or starts paying the allowance
    const price = this.strikePrice();
    for (const id of this.state.strikes) {
      const p = this.placeOf(id);
      if (p) tags.push({ x: p.x, y: p.y - p.h * 0.62, mid: true, alarm: true, buy: `settle:${id}`, can: this.state.money >= price, html: `Забастовка: вход перекрыт<br><b>договориться · $${short(price)}</b>` });
    }
    // a placard of the picket, read out above the people at the door
    const at = this.slogan && HUBS[this.stage]?.lots[this.slogan.at];
    if (this.slogan && at) tags.push({ x: at.x - 74, y: at.y - 118, mid: true, say: true, html: this.slogan.text });
    return tags;
  }

  /** what it costs to settle one strike: a few seconds of the income */
  private strikePrice(): number {
    return Math.max(1, Math.floor(this.flowIncome() * STRIKES.priceSeconds));
  }

  /** the line under the money: the grade and what one task pays */
  private payLine(): string {
    const s = this.state;
    if (s.limited > 0) return `лимит исчерпан · сброс через ${this.limitClock()}`;
    const pay = `$${fmt1.format(payOf(s, this.cfg))} за задачу`;
    const share = shareOf(s, this.cfg);
    // what moves the price besides the grade is said next to it: the perks of whole employers, unemployment, the allowance
    const perks = Math.round(bonus(s, this.cfg, 'pay') * 100);
    const drop = Math.round(slumpOf(s, this.cfg) * 100);
    const why = `${perks ? ` · здания +${perks}%` : ''}${drop ? ` · безработица −${drop}%` : ''}${s.allowance ? ` · пособие −${Math.round(this.cfg.tuning.allowance * s.allowance * 100)}%` : ''}`;
    // the grade is named while nothing else moves the price; on the planet the share of the provider's revenue stands in for it
    if (why) return `${pay}${why}`;
    return share > 0 && this.stage < STREET ? `${pay} · твоя доля в выручке Anthropic: ${share}%` : `${this.cfg.grades[s.grade].name.toLowerCase()}: ${pay}`;
  }

  private drawBlueprint(): void {
    const s = this.state;
    const cfg = this.cfg;
    const neck = this.state.limited > 0 ? 'none' : this.neck();
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

    this.paper.render({
      money: s.money,
      income: Math.max(0, this.income),
      summary: this.payLine(),
      meter: this.meter(neck, 'нужны ещё работы', 'нужен сабагент или тариф'),
      tags: [...tags, ...this.bubbles()],
      manager: this.managerStrip(),
      shelves: this.blueprintShelves(neck),
      news: this.feed.news,
      quip: this.feed.quip,
      quipAt: 'desk',
      ask: this.pile(),
      hint: `заменено программистов: ${short(replacedOf(s, cfg))} · Enter — «Да» на вопросы сессий`,
    });
  }

  /** a big screen: the city, the state or the planet */
  private drawHub(): void {
    const s = this.state;
    const cfg = this.cfg;
    const layout = HUBS[this.stage];
    const t = HUB_TEXT[this.stage];
    const neck = this.state.limited > 0 ? 'none' : this.neck();
    this.hubs.get(this.stage)!.sync(this.hubTopology());

    const employers = cfg.sources.filter((src) => src.screen === this.stage);
    const factory = cfg.lines.some((l) => l.screen === this.stage);
    // the middle: on the street it is the factory and what it makes; where robot dogs work — the packs on their way
    let home = t.home;
    if (factory) {
      const made = ROBOT_KINDS.map((k) => ({ k, n: outputOf(s, cfg, k) })).filter((x) => x.n > 0);
      if (made.length) home += `<br><b>${made.map((x) => `${short(x.n)} ${ROBOT_WORDS[x.k].of}/с`).join('<br>')}</b>`;
    } else if (s.jobs.length) home += `<br><b>стай в пути: ${s.jobs.length}</b>`;
    const tags: BlueprintTag[] = [{ x: layout.home.x, y: layout.home.y + 4, mid: true, small: true, html: home }];
    // the map sells itself: a caption and the building above it buy the next unit of that employer
    let taken = 0;
    let total = 0;
    for (const src of employers) {
      const owned = s.owned[src.id] ?? 0;
      // the trades of the street are counted whole: robots take them little by little
      taken += factory ? (owned >= src.max ? 1 : 0) : owned;
      total += factory ? 1 : src.max;
      const lot = layout.lots[src.id];
      if (!lot) continue;
      // the third line is what the whole employer gives: pale until it is earned, coral once it works
      const perk = src.perk ? `<i${owned >= src.max ? ' class="on"' : ''}>★ ${src.perk.text}</i>` : '';
      if (s.strikes.includes(src.id)) {
        // the door is blocked: nothing comes from here, the bubble above asks for a settlement
        tags.push({ x: lot.x, y: lot.y + 4, mid: true, small: true, html: `${src.tag}<br><b class="bad">забастовка · задач нет</b>${perk}` });
        continue;
      }
      if (owned >= src.max) {
        tags.push({ x: lot.x, y: lot.y + 4, mid: true, small: true, html: `${src.tag} · целиком<br><b>+${short(sourceInflow(src, owned))}/с</b>${perk}` });
        continue;
      }
      if (src.made) {
        // not for sale: the robots of its kind come here by themselves; a click sends them here first
        const here = targetOf(s, cfg, src.made)?.id === src.id && outputOf(s, cfg, src.made) > 0;
        const words = ROBOT_WORDS[src.made];
        tags.push({
          x: lot.x,
          y: lot.y + 4,
          mid: true,
          small: true,
          buy: here ? undefined : `aim:${src.id}`,
          can: true,
          html: `${src.tag} · ${Math.floor((owned / src.max) * 100)}%<br><b>${here ? `▶ сюда идут ${words.many}` : `ждёт ${words.of} · клик`}</b>${perk}`,
        });
        continue;
      }
      const head = owned ? `${src.tag} · ${owned}/${src.max}` : src.tag;
      const job = jobOf(s, src.id);
      if (job) {
        tags.push({ x: lot.x, y: lot.y + 4, mid: true, small: true, html: `${head}<br><b>собаки занимают места · ${Math.ceil(job.left)} с</b>${perk}` });
        continue;
      }
      if (locked(s, src)) {
        // robot dogs are not let in yet: the bribe comes first
        const bribe = bribeCost(s, cfg, src);
        tags.push({ x: lot.x, y: lot.y + 4, mid: true, small: true, buy: `bribe:${src.id}`, can: s.money >= bribe, html: `${head}<br><b>взятка · $${short(bribe)}</b>${perk}` });
        continue;
      }
      const price = sourceCost(s, cfg, src);
      // where robot dogs do the work, the unit on sale is a pack of them
      const unit = src.work ? (owned ? 'стая' : 'стая робособак') : t.floor[0];
      tags.push({ x: lot.x, y: lot.y + 4, mid: true, small: true, buy: `src:${src.id}`, can: s.money >= price, html: `${head}<br><b>${owned ? 'ещё ' : ''}${unit} · $${short(price)}</b>${perk}` });
    }
    const park = layout.park;
    if (park) tags.push({ x: park.label.x, y: park.label.y, mid: true, small: true, html: s.allowance ? 'парк · свободные люди отдыхают' : 'парк пуст · все на пикете' });
    for (const node of Object.values(layout.farms)) {
      const n = this.farmSessions(node.ids);
      if (!n) continue;
      const what = cfg.farms
        .filter((f) => node.ids.includes(f.id) && s.farms[f.id])
        .map((f) => `${f.tag} ×${s.farms[f.id]}`)
        .join(' · ');
      // the caption of a node above the middle sits on top of it: the connector arrives from below
      const y = node.above ? node.y - node.h - 44 : node.y + 4;
      tags.push({ x: node.x, y, mid: true, small: true, html: `${what}<br><b>${this.count(n, SESSION_FORMS)}</b>` });
    }

    const all = taken === total;
    this.paper.render({
      money: s.money,
      income: Math.max(0, this.income),
      // the game is over: the last line of it takes the place of the pay
      summary: this.won ? FINALE : this.payLine(),
      meter: this.meter(neck, t.needEmployers, t.needFarms, all),
      tags: [...tags, ...this.bubbles()],
      manager: this.managerStrip(),
      shelves: this.hubShelves(neck, taken, total),
      news: this.feed.news,
      quip: this.feed.quip,
      quipAt: 'corner',
      ask: this.pile(),
      // while the keys to the next screen are missing, the corner counts them
      hint:
        keysOf(s, cfg) < keysNeeded(s, cfg)
          ? `${t.place}: ${taken} из ${total} ${t.floor[2]} · целиком ${keysOf(s, cfg)} из ${keysNeeded(s, cfg)} — ключи к следующему экрану`
          : `${t.place}: ${taken} из ${total} ${t.floor[2]} · ${this.stage >= STREET ? 'людей без работы' : 'заменено программистов'}: ${short(replacedOf(s, cfg))}`,
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

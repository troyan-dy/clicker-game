import { resolveUprising, startUsageLimit, toggleManager } from './logic/management';
import { automaticWork, chooseEnding, enterMarket, finaleAction } from './logic/stages';
import { networkDials, nextBlock, revenuePerGW, towerFacilities, towerPower, underpowered, worldPower } from './logic/power';
import { benchBottleneck, bestAllowance, farmSessions, fleetReadings, globeReadings, hubReadings, labShown, roundedPopulation, staffingProgress, towerReadings } from './logic/readings';
import { answerCall, approveStack, buyUsage, cycleAllowance, flowIncome, limitClock, pickLegend, pileWorth, settleStrike, strikePrice } from './logic/actions';
import { towerBottleneck, workBottleneck, worldBottleneck } from './logic/bottlenecks';
import { boughtInShortage, buyOnStage, employersOnOffer, onSale, planOnSale, surgeMultiplier } from './logic/market';
import { chooseBird, completeEmployers, cycleLine, earnAwards, hasAcquired, pickIncomingSource, statistic } from './logic/progress';
import { addedSessionRate, discountPercent, marketProgress, pileRequests, promotedPay, relativeFill, shortagePercent, worldExpansion } from './logic/shopReadings';
import Phaser from 'phaser';
import { approvePending, openVolunteerGate, routePress, settleIntern, signResearch } from './logic/approval';
import { refuseFeeding, toggleFeeding, tossSlice } from './logic/parkActions';
import { createGameConfig } from './logic/config';
import { AWARDS } from '../content/awards';
import { BENCH } from '../content/bench';
import { CALLS, STANDUP } from '../content/calls';
import { CREDITS, CREDITS_END, CREDITS_NOTES, MOTTO, TAGLINE, TITLE } from '../content/credits';
import { LEGENDS, type Legend } from '../content/legends';
import { NEWS } from '../content/news';
import { advanceCalls, advancePlacard, callOwners, limitDue, streetRiot, streetStrike } from './logic/events';
import { advanceChat, bottleneckRemark, idleAtTerminal, nextShift, parkIdle, parkNews, recordStory, rememberNews, smoothIncome, smoothReading, towerStories, waitAtGate, worldStories } from './logic/stories';
import { QUIPS } from '../content/quips';
import { EPILOGUE, FINALE, HUB_TEXT, RIOT_NEWS, SCALE_SHELF, SCREEN_DONE } from '../content/screens';
import { TAKEOVERS } from '../content/takeovers';
import { promptAt, TICKETS } from '../content/tickets';
import { TOWERS } from '../content/towers';
import { WORLD } from '../content/world';
import { L, LANG } from '../core/lang';
import { logEvent, metrics } from '../core/metrics';
import { setMusicOn, startMusic } from '../core/music';
import type { Rng } from '../core/rng';
import { loadSettings, saveSettings } from '../core/settings';
import { playSound, setSoundOn, unlockSound } from '../core/sound';
import { BP, deskScreen } from '../data/layout/blueprint';
import { HUBS } from '../data/layout/hubs';
import benchData from '../data/tuning/bench.json';
import eventsData from '../data/tuning/events.json';
import feedData from '../data/tuning/feed.json';
import { activeBackgroundSeconds, advanceBackground, backgroundWork, collectMorning, elapsedMs, frameRemainder, missedBackgroundFrames, morningDuration, restoredWin, resumeOffline } from './logic/background';
import limitData from '../data/tuning/limit.json';
import { SAVE_KEY, SaveOwnership } from './logic/saveOwnership';
import { answerTransition, canInvite, managerClock, managerOnDuty, transitionOffer } from './logic/transitions';
import riotData from '../data/tuning/riots.json';
import strikeData from '../data/tuning/strikes.json';
import saveData from '../data/tuning/save.json';
import stackData from '../data/tuning/stack.json';
import { createOverlay, type Overlay } from '../debug/overlay';
import { createTuningPanel, type TuningPanel } from '../debug/tuningPanel';
import { birdRate, createBench, stepBench } from '../systems/bench/bench';
import { createEvents, type EventsTuning } from '../systems/events/events';
import { createFeed, headline, say, stepFeed, tell, type FeedContent } from '../systems/feed/feed';
import { laptopPhase } from '../systems/intern/incident';
import { INTERN_REPORT } from '../ui/intern/intern';
import { planManager, type ManagerDecision } from '../systems/manager/manager';
import { createRiots, type RiotTuning } from '../systems/riots/riots';
import { createStrikes, type StrikeTuning } from '../systems/strikes/strikes';
import {
  aimAt,
  backlogCap,
  bonus,
  bribeCost,
  buyFarm,
  buyGrade,
  buyNoAsk,
  buyPlan,
  buyScale,
  buySource,
  buySubagent,
  claudeRate,
  createPipe,
  demandOf,
  discount,
  farmCost,
  fedOf,
  gradeCost,
  housed,
  inflowOf,
  jobOf,
  keysNeeded,
  keysOf,
  labOf,
  lineCost,
  locked,
  moduleCost,
  moduleRoom,
  netCost,
  nextChip,
  nodesOf,
  ordersOf,
  outputOf,
  payOf,
  podsOf,
  quartered,
  reachOf,
  ringed,
  policeCost,
  pressPipe,
  replacedOf,
  riotShare,
  scaleCost,
  scaleReady,
  screenOf,
  sessionsOf,
  shareOf,
  sourceCost,
  slumpOf,
  sourceInflow,
  stepPipe,
  stepBackgroundWork,
  subagentPrice,
  subagentRate,
  targetOf,
  unemploymentOf,
  wireOf,
  whole,
  type Module,
  type PipeState,
  type RobotKind,
  type Source,
} from '../systems/pipeline/pipeline';
import { freshMeta, packSave, unpackSave, type OfflineReport } from '../systems/save/save';
import { createStack, stepStack } from '../systems/stack/stack';
import type { BenchUi } from '../ui/bench/bench';
import type { BlueprintTag, BlueprintUi, ManagerStrip, MeterRow } from '../ui/blueprint/blueprint';
import type { CardUi } from '../ui/card/card';
import type { CreditsSpec, CreditsUi } from '../ui/credits/credits';
import { LOCALE, PER_S, plural, short, gradeWord, planTitle, payText, gw, flowText, perSecond } from '../ui/format';
import {
  tasksPhrase,
  TERMINAL_SPOTS,
  type Neck,
  type ShopRow,
  type ShopShelf,
  type TerminalUi,
} from '../ui/terminal/terminal';
import { BenchView, type BirdKind } from '../view/benchView';
import { BlueprintView, VISIBLE_SUBAGENTS } from '../view/blueprintView';
import { GlobeView, type GlobeTopology } from '../view/globeView';
import { EAST_ASIA, routeRegion, SIBERIA } from '../systems/pipeline/worldRoute';
import { HubView, type HubTopology } from '../view/hubView';
import { preloadNodes } from '../view/nodeTextures';
import { Squares, type Rect } from '../view/squares';
import { TowerView, type TowerTopology } from '../view/towerView';

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
const BUY_PITCH: Record<string, number> = { src: 0, sub: 2, bribe: -3, farm: -5, line: -5, mod: -7, net: 4, plan: 4, noask: 5, grade: 7, scale: -12 };
/** the bodies of the factory in words: «сюда идут андроиды», «ждёт андроидов» */
const ROBOT_WORDS: Record<RobotKind, { many: string; of: string }> = L(
  { android: { many: 'андроиды', of: 'андроидов' }, robodog: { many: 'робособаки', of: 'робособак' } },
  { android: { many: 'androids', of: 'androids' }, robodog: { many: 'robot dogs', of: 'robot dogs' } },
);
const ROBOT_KINDS: readonly RobotKind[] = ['android', 'robodog'];
const EVENTS: EventsTuning = { ...eventsData, every: [eventsData.every[0], eventsData.every[1]] };
const STRIKES: StrikeTuning = { ...strikeData, every: [strikeData.every[0], strikeData.every[1]] };
const RIOTS: RiotTuning = { ...riotData, every: [riotData.every[0], riotData.every[1]] };
type Forms = readonly [string, string, string];
// plural forms: one, a few, many; English has two, so the last two are the same
const STRUCK_FORMS: Forms = L(['здание стоит', 'здания стоят', 'зданий стоят'], ['building is shut', 'buildings are shut', 'buildings are shut']);
const WHOLE_FORMS: Forms = L(['здание', 'здания', 'зданий'], ['building', 'buildings', 'buildings']);
const IDLE_AFTER = 12; // seconds without a «Да» while requests wait
const NECK_AFTER = 14; // seconds the same bottleneck lasts before Claude mentions it
const SESSION_FORMS: Forms = L(['сессия', 'сессии', 'сессий'], ['session', 'sessions', 'sessions']);
const TASK_FORMS: Forms = L(['задачу', 'задачи', 'задач'], ['task', 'tasks', 'tasks']);
const ASKING_FORMS: Forms = L(['сессия спрашивает', 'сессии спрашивают', 'сессий спрашивают'], ['session asks', 'sessions ask', 'sessions ask']);
const YES = L('Да', 'Yes');
const NO = L('Нет', 'No');
const YES_FOREVER = L('Да, и больше не спрашивай', 'Yes, and don’t ask again');
const NOT_ON_PLAN = L('недоступно в вашем тарифе', 'not available on your plan');
/** «3 из 12» */
const OF = L('из', 'of');
/** seconds, after a number */
const SEC = L('с', 's');
/**
 * The towers: how often those who have slept their shift walk home past the line, how long a word said
 * there stays and how often the line talks, how long the first volunteers wait at the gate before it
 * opens without a «Да», how many of the screen's requests come from the capsules (the rest — from the gate),
 * how many blocks make the first tower (with it the manager and the second dial are shown).
 */
const QUARTER = { shiftEvery: 70, talk: 6, talkEvery: [9, 16] as const, gateWait: 9, wakes: 5, firstTower: 7 };
/** the title of the terminal window and of the menu card */
const HOME_DIR = L('claude — ~/работа/все-сразу', 'claude — ~/work/all-at-once');
const PER_TASK = L('за задачу', 'per task');
/** «мало — нужны ещё работы» */
const SCARCE = L('мало', 'short');
const COOLING = L('остывает', 'cooling off');
/** the right end of a shop row that has nothing more to sell */
const TOP = L('максимум', 'max');
const REPLACED = L('заменено программистов', 'programmers replaced');
const UPGRADES_FULL = L('УЛУЧШЕНИЯ · быстрее и дороже', 'UPGRADES · faster and pricier');
/** what the sessions ask about when they pile up their questions */
const QUESTIONS = TICKETS.flatMap((t) => t.asks);
const MONEY_SPOT: Rect = { x: BP.money.x - 80, y: BP.money.y - 20, w: 160, h: 40 };
/** a big screen shrinks to this share of its size when it becomes a node of the next one */
const HUB_SHRINK = 0.14;
const fmt1 = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });
const fmt2 = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });



declare global {
  interface Window {
    /** gym-only hooks for scripted captures */
    __gym?: { buy(what: string): boolean; press(): void; click(row: string): void; take(id: string): void; fleet(lines: number): void; strike(): void; riot(): void; gift(dollars: number): void; away(hours: number): void; pile(legend: boolean | 'intern'): void; call(): void; limit(): void; fill(): void };
  }
}

const HELP = `
  <p>ГИМ · любая клавиша — «Да», покупки — кликом</p>
  <p><kbd>M</kbd>подбросить $${GYM_GIFT} <kbd>R</kbd>заново <kbd>T</kbd>замедление</p>
  <p><kbd>Tab</kbd>настройки <kbd>O</kbd>цифры <kbd>P</kbd>сохранить</p>`;
const HELP_PAPER = `<p>ГИМ · <kbd>M</kbd>деньги <kbd>R</kbd>заново <kbd>T</kbd>замедление <kbd>Tab</kbd>настройки</p>`;
const HELP_GAME = L(`<p>любая клавиша — «Да» · покупки — кликом · <kbd>Esc</kbd>меню</p>`, `<p>any key — “Yes” · click to buy · <kbd>Esc</kbd>menu</p>`);
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
  private readonly credits: CreditsUi;
  private readonly benchUi: BenchUi;
  private readonly showOverlay: boolean;
  /** keep the game between visits (off in captures and tuning sessions) */
  private readonly saving: boolean;
  /** tuning keys and help are on */
  private readonly gym: boolean;
  /** the title card is shown at launch */
  private readonly withMenu: boolean;
  /** a tuning session may start on a later screen: 3 city, 4 state, 5 planet; 0 — from the beginning */
  private readonly startAt: number;
  private readonly demo: string;
  private readonly settings = loadSettings();
  // own copies of the data: the tuning panel edits them live, the mechanic reads them every step
  private readonly cfg = createGameConfig();
  private state!: PipeState;
  private view!: BlueprintView;
  private readonly hubs = new Map<number, HubView>();
  private towers!: TowerView;
  private globe!: GlobeView;
  /** the tower for Mars is on its way: the ending waits until it is there; and it has got there */
  private departing = false;
  private landed = false;
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
  private backgroundAt: number | null = null;
  private backgroundTimer?: number;
  private readonly saveOwnership = new SaveOwnership(() => localStorage);
  /** a saved game was opened */
  private resumed = false;
  /** what the sessions did while the game was closed; shown after the title card */
  private pendingReport: OfflineReport | null = null;
  private readonly stack = createStack(stackData);
  private question = QUESTIONS[0];
  /** calls and inspections waiting for a «Да» on the current screen */
  private readonly calls = createEvents(EVENTS);
  private standupReplyUntil = 0;
  private sinceManager = 0;
  private managerDecision: ManagerDecision | null = null;
  private managerBought = 0;

  /** seconds until Claude hits the usage limit again */
  private limitIn = limitData.first;
  /** the card about the limit is open */
  private limitCard = false;
  /** the current pile is a legendary ticket */
  private legend: Legend | null = null;
  private internReplay: { elapsed: number; back: () => void } | null = null;
  /** the collection and the awards */
  private meta = freshMeta();
  /** awards earned but not announced yet */
  private toTell: string[] = [];
  private sinceAwards = 0;
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
  /** the bench after the credits (M30): the park, its picture, and whether the player sits there now */
  private readonly park = createBench(benchData);
  private benchView!: BenchView;
  private onBench = false;
  /** which of the questions about the bread the prompt asks */
  private benchAsk = 0;
  /** the headlines of the park go in turn */
  private benchNews = 0;
  private benchNewsIn = 0;
  /** the towers: seconds until those who have slept their shift walk home past the line again; how many times they have */
  private shiftIn = QUARTER.shiftEvery * 0.5;
  private swaps = 0;
  /** a word said at the gate: a question and an answer, seconds since it began; `home` — one who goes home answers. Nothing — silence */
  private chat: { home: boolean; lines: readonly [string, string]; t: number } | null = null;
  private chatIn: number = QUARTER.talkEvery[0];
  /** seconds the first volunteers have waited at the gate */
  private gateFor = 0;
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
    credits: CreditsUi,
    benchUi: BenchUi,
    opts: { overlay: boolean; save: boolean; gym: boolean; menu: boolean; start: number; demo: string },
  ) {
    super('game');
    this.rng = rng;
    this.term = term;
    this.paper = paper;
    this.card = card;
    this.credits = credits;
    this.benchUi = benchUi;
    this.showOverlay = opts.overlay;
    this.saving = opts.save;
    this.gym = opts.gym;
    this.withMenu = opts.menu;
    this.startAt = opts.start;
    this.demo = opts.demo;
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
    this.towers = new TowerView(this, this.rng, this.cfg.grid.blocks, this.cfg.grid.pilot);
    this.towers.onPowered = (x, y) => this.delivered(x, y);
    this.globe = new GlobeView(this, this.rng);
    this.globe.onPowered = (x, y) => this.delivered(x, y);
    this.benchView = new BenchView(this, this.rng);
    this.squares = new Squares(this, this.rng, 700);
    this.benchUi.extra.innerHTML = BENCH.help;
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
    // tuning only: straight to the bench, as if the ending and the credits were over
    if (!this.resumed && this.startAt >= 4 + this.cfg.scales.length) {
      this.won = true;
      this.enterBench(true);
    }
    if (__TOOLS__ && !this.resumed) {
      if (this.demo === 'buyer') {
        const s = this.state;
        s.noAsk = true;
        s.plan.index = 2;
        s.grade = 2;
        s.subagents = 3;
        s.owned.job = 4;
        s.owned.freelance = 7;
        s.money = 150;
        s.managers.push(2);
        this.openStage();
      }
      if (this.demo === 'intern') this.forcePile('intern');
      if (this.demo === 'standup') this.calls.wait = 2;
      if (this.demo === 'manager') {
        const s = this.state;
        for (const src of this.cfg.sources.filter(x => x.screen === this.stage).slice(0, keysNeeded(s, this.cfg))) s.owned[src.id] = src.max;
        s.managers.push(this.stage);
        s.money = scaleCost(s, this.cfg) - this.flowIncome() * 4;
      }
    }
    this.lastMoney = this.state.money;
    if (this.withMenu) this.openTitle();
    else this.resume();

    window.addEventListener('keydown', (e) => this.onKey(e));
    window.addEventListener('pointerdown', (e) => {
      const el = e.target as HTMLElement;
      if (this.internReplay || el.closest('.lil-gui') || this.card.open || this.cine || this.credits.rolling) return;
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
    const syncVisibility = () => this.setBackground(document.hidden);
    window.addEventListener('blur', () => this.setBackground(true));
    window.addEventListener('focus', syncVisibility);
    document.addEventListener('visibilitychange', syncVisibility);
    window.addEventListener('pageshow', syncVisibility);
    window.addEventListener('pagehide', () => {
      this.settleBackground();
      this.saveGame();
    });
    window.addEventListener('storage', event => {
      // A second game tab has taken over. Never overwrite its newer progress.
      this.saveOwnership.storageChanged(event.key, this.saving, this.backgroundAt !== null);
    });
    syncVisibility();
    if (__TOOLS__) window.__gym = {
      buy: (what) => this.buy(what),
      press: () => this.press(),
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
      // a scripted capture does not wait for the line: everybody who has a place lies down at once
      fill: () => {
        this.state.gate = true;
        this.state.asleep = podsOf(this.state, this.cfg);
      },
    };
    window.__GAME__.ready = true;
  }

  update(_time: number, deltaMs: number): void {
    if (this.saveOwnership.superseded || document.hidden) return;
    if (this.backgroundAt !== null) {
      // A visible second window still renders normally. Only missed frames need a catch-up.
      const now = Date.now();
      if (missedBackgroundFrames(this.backgroundAt, now, false)) {
        this.settleBackground();
        deltaMs = 0;
      } else {
        deltaMs = elapsedMs(this.backgroundAt, now);
        this.backgroundAt += deltaMs;
      }
    }
    if (this.internReplay) {
      this.internReplay.elapsed += Math.min(deltaMs / 1000, 0.25);
      const elapsed = this.internReplay.elapsed;
      if (laptopPhase(elapsed) === 'done') {
        const { back } = this.internReplay;
        this.internReplay = null;
        this.paper.laptop.hide();
        back();
      } else {
        this.paper.laptop.show(elapsed, 0, true);
        this.paper.laptop.task();
      }
    } else if (this.meta.intern && !this.paused && !this.card.open) {
      this.paper.laptop.show(this.meta.intern.elapsed, this.meta.intern.credit);
    } else this.paper.laptop.hide();
    this.acc = frameRemainder(this.acc, deltaMs, this.paused, this.slow, STEP, dt => this.step(dt));
    // the ending: nothing is earned or bought, but the figures on the desk still walk
    if (this.cine) {
      this.view.step(Math.min(deltaMs / 1000, 0.05));
      this.squares.step(Math.min(deltaMs / 1000, 0.05));
    }
    this.credits.step(Math.min(deltaMs / 1000, 0.05));
    if (this.onBench) {
      this.benchView.step(Math.min(deltaMs / 1000, 0.05));
      this.drawBench();
    } else if (this.stage === 1) this.drawTerminal();
    else if (this.stage === 2) this.drawBlueprint();
    else if (this.onGrid) this.drawTowers();
    else if (this.onWorld) this.drawWorld();
    else this.drawHub();
    this.drawOverlay();

    this.sinceSave += deltaMs / 1000;
    if (this.sinceSave >= saveData.autosaveSeconds) this.saveGame();
  }

  private setBackground(background: boolean): void {
    if (background === (this.backgroundAt !== null)) return;
    if (background) {
      this.backgroundAt = Date.now();
      if (!this.paused) this.saveGame();
      this.backgroundTimer = window.setInterval(() => {
        if (missedBackgroundFrames(this.backgroundAt, Date.now(), document.hidden)) this.settleBackground();
        if (this.sinceSave >= saveData.autosaveSeconds) this.saveGame();
      }, 1000);
      return;
    }
    window.clearInterval(this.backgroundTimer);
    this.settleBackground();
    this.backgroundAt = null;
    const action = this.saveOwnership.onFocus(this.paused);
    if (action === 'reload') window.location.reload();
    else if (action === 'save') this.saveGame();
  }

  private settleBackground(): void {
    if (this.backgroundAt === null) return;
    if (this.saving && this.saveOwnership.checkForTakeover()) return;
    const now = Date.now();
    const elapsed = elapsedMs(this.backgroundAt, now) / 1000;
    this.backgroundAt = Math.max(now, this.backgroundAt);
    const active = activeBackgroundSeconds(elapsed, {
      paused: this.paused, frozen: this.frozen, superseded: this.saveOwnership.superseded,
      cinematic: this.cine, creditsRolling: this.credits.rolling,
    }, this.slow);
    if (!active) return;
    advanceBackground(active, managerOnDuty(this.state, this.stage, this.meta, this.onBench), dt => {
      this.backgroundProduction(dt);
      this.seconds += dt;
      return this.stepManager(dt);
    });
    this.sinceSave += elapsed;
    this.lastMoney = this.state.money;
  }

  private backgroundProduction(dt: number): void {
    const incident = this.meta.intern;
    backgroundWork(dt, incident?.elapsed, (seconds, down) => {
      for (const id of stepBackgroundWork(this.state, this.cfg, seconds, down)) this.unitDone(id);
    });
    if (incident) this.stepIntern(dt);
  }

  private saveGame(): void {
    this.sinceSave = 0;
    this.saveOwnership.write(this.saving, this.frozen, this.backgroundAt !== null, () => {
      const feed = { shown: this.feed.shown, said: this.feed.said };
      return packSave({ at: Date.now(), state: this.state, feed, meta: this.meta, won: this.won, seconds: this.seconds });
    });
  }

  /** Opens a saved game on the screen it was left at. Returns false when there is nothing to open. */
  private loadGame(): boolean {
    const json = this.saveOwnership.read(this.saving);
    const file = unpackSave(json, this.cfg);
    if (!file) return false;
    this.state = file.state;
    this.feed.shown = file.feed.shown;
    this.feed.said = file.feed.said;
    this.meta = file.meta;
    // a save finished before the last screen existed is not finished any more: the ending is ahead again
    this.won = restoredWin(file, this.cfg);
    this.seconds = file.seconds;
    this.park.thrown = file.meta.bread;
    this.park.fed = file.meta.fed;
    this.park.refused = file.meta.refused;
    this.park.auto = file.meta.benchAuto;
    this.openStage();
    if (this.won && this.meta.atBench) this.enterBench(true);
    this.pendingReport = resumeOffline(this.state, this.cfg, file.at, Date.now());
    return true;
  }

  /** Shows the screen the game is on at once, without the camera move. */
  private openStage(): void {
    this.stage = screenOf(this.state);
    this.managerDecision = null;
    if (this.stage >= 2) {
      this.term.root.classList.add('gone');
      this.paper.show(true);
    }
    if (this.stage === 2) {
      this.view.sync({ sources: this.state.owned, subagents: this.state.subagents });
      this.view.show(0);
    } else if (this.onGrid) {
      this.paper.dark(true, true);
      this.towers.sync(this.towerTopology(), true);
      this.towers.show(0);
    } else if (this.onWorld) {
      this.paper.dark(true, true);
      this.globe.sync(this.globeTopology());
      this.globe.show(0);
    } else if (this.stage >= 3) {
      const hub = this.hubs.get(this.stage)!;
      hub.sync(this.hubTopology());
      hub.show(0);
    }
  }

  /**
   * Tuning only (`?state=city|gov|planet|street|zig|finale|bench`): the game opens on a later screen as a
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
    // …with factories big enough to hold the trades of the workshop once it is left behind
    if (screen > STREET) for (const l of cfg.lines) s.lines[l.id] = 80;
    while (screenOf(s) < screen) {
      // the planet is reached from a quarter that is built and slept in, with the network turned up as far as it goes there
      if (screenOf(s) === cfg.grid.screen) {
        for (const m of cfg.modules) if (!m.screen) s.modules[m.id] = m.kind === 'block' ? cfg.grid.blocks.length : m.max;
        for (const dial of cfg.net) if (!dial.screen) s.net[dial.id] = dial.max;
        s.chips = cfg.chips.filter((c) => c.screen <= cfg.grid.screen).length;
        s.gate = true;
        s.asleep = podsOf(s, cfg);
      }
      if (!free(() => buyScale(s, cfg))) break;
    }
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
    const first = [
      ...cfg.sources.filter((x) => x.screen === screen && !x.made).map((x) => sourceCost(s, cfg, x)),
      ...cfg.lines.filter((l) => l.screen === screen).map((l) => lineCost(s, cfg, l)),
      ...(screen >= cfg.grid.screen ? cfg.modules.filter((m) => (m.screen ?? cfg.grid.screen) === screen && m.kind !== 'ark').map((m) => moduleCost(s, m)) : []),
    ];
    s.money = Math.min(...first) * 3;
    if (to > screen) {
      // the ending: every block stands, somebody sleeps in every capsule, the network is turned up all the way
      for (const m of cfg.modules) s.modules[m.id] = m.kind === 'block' ? cfg.grid.blocks.length : m.max;
      for (const dial of cfg.net) s.net[dial.id] = dial.max;
      s.chips = cfg.chips.filter((c) => c.screen <= screen).length;
      s.gate = true;
      s.asleep = podsOf(s, cfg);
    }
    this.openStage();
    // a tuning session that opens at the towers or on the planet hears what a player who came there by himself would
    if (this.onGrid && !s.gate) this.toTell.push(TOWERS.quips.entry);
    if (this.onWorld && to === screen) this.toTell.push(WORLD.quips.entry);
  }

  /** The game goes on: after the title card, a pause, or straight away when there is no menu. */
  private resume(): void {
    this.paused = false;
    const report = this.pendingReport;
    this.pendingReport = null;
    if (report) this.morning(report);
    else if (this.onBench) {
      if (this.clock === 0) tell(this.feed, feedData, this.meta.bread > 0 ? BENCH.quips.back : BENCH.quips.start);
    } else if (this.clock === 0) this.say(this.resumed ? 'back' : 'start', true);
  }

  /** The bench takes the screen: the map and its captions step aside, the park appears. `now` — without the fade. */
  private enterBench(now = false): void {
    this.onBench = true;
    this.meta.atBench = true;
    this.paper.away(true);
    this.paper.dark(false);
    this.fadeStage(now ? 0 : 400);
    this.benchUi.show(true, now);
    this.benchView.show(now ? 0 : 900);
    this.benchView.auto(this.park.auto);
    this.benchNewsIn = 0;
  }

  /** The player goes to the park: after the credits, or from the menu. */
  private openBench(): void {
    this.enterBench();
    this.paused = false;
    tell(this.feed, feedData, this.meta.bread > 0 ? BENCH.quips.back : BENCH.quips.start);
    playSound('quip');
    this.saveGame();
  }

  /** Back from the park to the planet: it has been working all along. */
  private leaveBench(): void {
    this.onBench = false;
    this.meta.atBench = false;
    this.paused = false;
    this.benchUi.show(false);
    this.benchView.hide(300);
    this.paper.away(false);
    if (this.onGrid) {
      this.paper.dark(true);
      this.towers.sync(this.towerTopology(), true);
      this.towers.show(400);
    } else if (this.onWorld) {
      this.paper.dark(true);
      this.globe.sync(this.globeTopology());
      this.globe.show(400);
    } else this.hubs.get(this.stage)?.reveal(this.hubTopology(), 200);
    this.say('after', true);
    this.saveGame();
  }

  /** The title card and the pause are one menu: the first line differs. */
  private openMenu(title: boolean, selected = 0): void {
    this.paused = true;
    const s = this.state;
    const go = title ? (this.resumed ? L('Продолжить', 'Continue') : L('Начать', 'Start')) : L('Вернуться к работе', 'Back to work');
    const where = this.onBench ? L('скамейка в парке', 'the bench in the park') : `${L('экран', 'screen')} ${this.stage} ${OF} ${2 + this.cfg.scales.length}`;
    const note = title && this.resumed ? `${where} · $${short(Math.floor(s.money))}` : '';
    const onOff = (on: boolean): string => (on ? L('вкл', 'on') : L('выкл', 'off'));
    const awards = `${L('Грамоты', 'Awards')}: ${this.meta.awards.length} ${OF} ${AWARDS.length}`;
    const legends = `${L('Легендарные тикеты', 'Legendary tickets')}: ${this.meta.legends.length} ${OF} ${LEGENDS.length}`;
    // after the ending the pause menu knows the way to the bench in the park and back to the planet
    const place = !title && this.won ? [{ id: 'place', label: this.onBench ? BENCH.toWorld : BENCH.toBench, note: this.onBench ? BENCH.toWorldNote : BENCH.toBenchNote }] : [];
    const options: { id: string; label: string; note?: string; off?: boolean }[] = [
      { id: 'go', label: go, note },
      ...place,
      { id: 'sound', label: `${L('Звук', 'Sound')}: ${onOff(this.settings.sound)}` },
      { id: 'music', label: `${L('Музыка', 'Music')}: ${onOff(this.settings.music)}` },
      { id: 'awards', label: awards },
      { id: 'legends', label: legends },
      { id: 'new', label: L('Новая игра', 'New game'), note: L('стереть сохранение', 'erase the save'), off: title && !this.resumed },
      { id: 'credits', label: L('Титры', 'Credits') },
      // the note is in the other language: whoever cannot read the menu finds the way out of it
      { id: 'lang', label: L('Язык: русский', 'Language: English'), note: L('switch to English', 'переключить на русский') },
    ];
    const lines = title
      ? [MOTTO, `${TAGLINE}. ${L('Версия&nbsp;', 'v')}${__VERSION__}.`]
      : [L('Клод подождёт. Сессии — тоже: мир стоит, пока открыто меню.', 'Claude will wait. So will the sessions: the world stands still while the menu is open.')];
    const again = (i: number): void => this.openMenu(title, i);
    this.card.show({ head: HOME_DIR, title: title ? TITLE : L('Пауза', 'Paused'), lines, options, selected, hint: L('Enter — Да · ↑↓ — выбрать', 'Enter — Yes · ↑↓ — choose') }, (i) => {
      this.wake();
      const id = options[i].id;
      if (id === 'sound') {
        this.settings.sound = !this.settings.sound;
        setSoundOn(this.settings.sound);
        setMusicOn(this.settings.music);
        saveSettings(this.settings);
        playSound('ui');
        again(i);
      } else if (id === 'music') {
        this.settings.music = !this.settings.music;
        setMusicOn(this.settings.music);
        saveSettings(this.settings);
        again(i);
      } else if (id === 'awards') {
        const lines = AWARDS.map((a) => (this.meta.awards.includes(a.id) ? `<b>${a.name}</b> — ${a.text}` : `${a.name}`));
        this.openList(L('claude — грамоты', 'claude — awards'), awards, lines, 0, () => again(i));
      } else if (id === 'legends') {
        const ownsLaptop = this.meta.legends.includes('intern');
        const lines = LEGENDS.map((l) => {
          if (!this.meta.legends.includes(l.id)) return L('· ещё не попадался', '· not seen yet');
          return l.id === 'intern' ? `<b>${l.title}</b> — ${INTERN_REPORT}` : `<b>${l.title}</b>`;
        });
        const replay = ownsLaptop ? {
          label: L('Посмотреть запись с ноутбука', 'Replay the laptop incident'),
          run: (back: () => void) => { this.internReplay = { elapsed: 0, back }; },
        } : undefined;
        this.openList(L('claude — коллекция', 'claude — collection'), legends, lines, 0, () => again(i), 10, replay);
      } else if (id === 'new') this.confirmNew(() => again(i));
      else if (id === 'credits') this.credits.roll(this.creditsSpec('solo'), () => again(i));
      else if (id === 'lang') this.switchLanguage();
      else if (id === 'place') {
        if (this.onBench) this.leaveBench();
        else this.openBench();
      } else this.resume();
    });
  }

  /** The other language: the choice is kept, the game is saved, and the page starts over in it. */
  private switchLanguage(): void {
    this.settings.lang = LANG === 'en' ? 'ru' : 'en';
    saveSettings(this.settings);
    this.saveGame();
    this.frozen = true;
    // an address that asks for a language would overrule the menu
    const url = new URL(window.location.href);
    url.searchParams.delete('lang');
    if (url.href === window.location.href) window.location.reload();
    else window.location.replace(url.href);
  }

  /** The history of the news: a click on the ticker opens it, the newest headline first. The world waits meanwhile. */
  private openNews(): void {
    if (this.card.open || this.cine || this.paused) return;
    this.wake();
    playSound('ui');
    this.paused = true;
    const lines = this.meta.news.length ? this.meta.news : [L('Пока тихо: мир ещё ничего не заметил.', 'Quiet so far: the world has not noticed anything yet.')];
    this.openList(L('claude — лента новостей', 'claude — news feed'), `${L('Новости', 'News')}: ${this.meta.news.length}`, lines, 0, () => (this.paused = false), 7);
  }

  /** A long list on a card, a page at a time, `per` lines on each. */
  private openList(head: string, title: string, lines: string[], page: number, back: () => void, per = 10, action?: { label: string; run(back: () => void): void }): void {
    const pages = Math.ceil(lines.length / per);
    const more = page + 1 < pages;
    const back_ = { label: L('Назад', 'Back') };
    const options = more ? [{ label: L('Дальше', 'Next'), note: `${L('страница', 'page')} ${page + 1} ${OF} ${pages}` }, back_] : [back_];
    const actionIndex = action ? options.push({ label: action.label }) - 1 : -1;
    this.card.show({ head, title, lines: lines.slice(page * per, (page + 1) * per), options, dense: true }, (i) => {
      if (action && i === actionIndex) action.run(() => this.openList(head, title, lines, page, back, per, action));
      else if (more && i === 0) this.openList(head, title, lines, page + 1, back, per, action);
      else back();
    });
  }

  /** The credits: after the ending they roll past the planet, from the menu — over a dark screen. */
  private creditsSpec(place: 'side' | 'solo'): CreditsSpec {
    return { title: TITLE, tagline: `${TAGLINE} · ${L('версия', 'version')} ${__VERSION__}`, blocks: CREDITS, notes: CREDITS_NOTES, end: CREDITS_END, place };
  }

  private openTitle(): void {
    this.openMenu(true);
  }

  private confirmNew(back: () => void): void {
    const lines = L(
      ['Сохранение будет стёрто: работы, сессии, грейд — всё.', 'Клод не возражает. Он не умеет.'],
      ['The save will be erased: jobs, sessions, grade — everything.', 'Claude does not object. Claude does not know how.'],
    );
    this.card.show({ head: L('claude — новая игра', 'claude — new game'), title: L('Начать с нуля?', 'Start from scratch?'), lines, options: [{ label: YES }, { label: NO }], selected: 1 }, (i) => {
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
    const closed = short(s.closedHere + s.closedBySubagents);
    const idle = short(replacedOf(s, this.cfg));
    const lines = L(
      [
        'Работать больше некому и незачем: за прилавком, за рулём и в терминале — Клод. Свет дают люди: лёжа.',
        `Время: ${h ? `${h} ч ` : ''}${m} мин · нажатий: ${short(s.presses)} · задач закрыто: ${closed}`,
        `Людей без работы: ${idle}. Дело им нашлось: ${short(s.asleep, 1)} лежат в капсулах и дают ток. ${this.onWorld ? WORLD.score : ''}`,
        'Клод: «Дальше я могу нажимать „Да“ сам. Продолжать без вас?»',
      ],
      [
        'Nobody is left to work and there is no reason to: behind the counter, at the wheel and in the terminal — Claude. People keep the lights on: lying down.',
        `Time: ${h ? `${h} h ` : ''}${m} min · presses: ${short(s.presses)} · tasks closed: ${closed}`,
        `People out of work: ${idle}. Something was found for them to do: ${short(s.asleep, 1)} lie in the capsules and give current. ${this.onWorld ? WORLD.score : ''}`,
        'Claude: “From here on I can press ‘Yes’ myself. Continue without you?”',
      ],
    );
    const options = [{ label: YES }, { label: YES_FOREVER }, { label: NO, note: NOT_ON_PLAN, off: true }];
    this.card.show({ head: L('claude — итоги', 'claude — results'), title: L('Работать больше некому', 'Nobody is left to work'), lines, options }, (i) => {
      chooseEnding(this.meta, i);
      this.saveGame();
      this.epilogue();
    });
  }

  /**
   * The ending after the last card (M13): the last worker left is the player. The camera is back at
   * the desk, the player walks away with a box, and the picture pulls back — the city, the state,
   * the planet at night, the credits — and after them the bench in the park (M30).
   */
  private epilogue(): void {
    const cfg = this.cfg;
    const last = this.stage;
    this.cine = true;
    this.paper.cut(true);
    this.squares.step(4); // the squares in flight land before the picture changes
    // the desk as the player left it: every job and every laptop in place
    this.view.sync({ sources: this.state.owned, subagents: this.state.subagents });
    this.fadeStage(500);
    // the desk the game began at stands on paper: the light comes back for the last look at it
    this.paper.dark(false);
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
      // 7. the credits: the planet moves aside and the names roll past it
      this.time.delayedCall(10400, () => {
        this.paper.caption('');
        this.tweens.add({ targets: earth, x: 480, y: 540, scale: fit * 0.78, duration: 1500, ease: 'Sine.InOut' });
        this.credits.roll(this.creditsSpec('side'), () => {
          // 8. the scene after the credits: the park. The last worker sits on a bench with a loaf of bread
          this.tweens.add({ targets: [dark, earth], alpha: 0, duration: 900, onComplete: () => [dark, earth].forEach((o) => o.destroy()) });
          this.cine = false;
          this.paper.cut(false);
          this.openBench();
        });
      });
    });
  }

  /** The morning report: what the sessions did while the game was closed. One answer: «Да». */
  private morning(report: OfflineReport): void {
    const { away, capped } = morningDuration(report.seconds, L('ч', 'h'), L('мин', 'min'));
    const tasks = this.count(report.tasks, TASK_FORMS);
    const money = `<b>$${short(report.dollars)}</b>`;
    const lines = report.waited
      ? L(
          [`Прошло ${away}.`, 'Клод ждал вашего «Да». Он не в обиде: у него нет такой функции.'],
          [`Time away: ${away}.`, 'Claude was waiting for your “Yes.” No hard feelings: Claude has no such feature.'],
        )
      : L(
          [`Прошло ${away}${capped ? ' — дольше сессии не ждут, они уснули' : ''}.`, `Клод закрыл ${tasks}. Никто ничего не заметил.`, `На счёт пришло ${money}.`],
          [`Time away: ${away}${capped ? ' — the sessions wait no longer than that, they fell asleep' : ''}.`, `Claude closed ${tasks}. Nobody noticed a thing.`, `${money} landed in the account.`],
        );
    const options = [{ label: YES, note: report.waited ? '' : L('забрать', 'collect') }];
    this.card.show({ head: L('claude — утренний отчёт', 'claude — morning report'), title: L('Пока вас не было', 'While you were away'), lines, options }, () => {
      this.wake();
      this.lastMoney = collectMorning(this.state, this.meta, report, this.lastMoney);
      if (report.dollars > 0) playSound('buy');
      this.say('back', true);
      this.saveGame();
    });
  }

  /** gym-only: a full pile of questions right now, legendary or not */
  private forcePile(legend: boolean | 'intern'): void {
    this.stack.fill = 1;
    if (legend === 'intern') this.legend = LEGENDS.find((l) => l.id === 'intern')!;
    else this.legend = legend ? (LEGENDS.find((l) => !this.meta.legends.includes(l.id)) ?? LEGENDS[0]) : null;
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
    if (this.internReplay) return;
    if (this.card.key(e)) return;
    // the ending and the credits: the world stands still, a key only hurries the credits
    if (this.cine || this.credits.rolling) return;
    if (e.repeat) return;
    if (e.code === 'Escape') {
      this.openMenu(false);
      return;
    }
    // on the bench the second and the third answer of the prompt work: «Да, и больше не спрашивай» and «Нет»
    if (this.onBench && /^(Digit|Numpad)[23]$/.test(e.code)) {
      this.click(e.code.endsWith('2') ? 'bench:auto' : 'bench:no');
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
    if (row.startsWith('bench:')) {
      this.benchAnswer(row.slice(6));
      return;
    }
    if (this.onBench) return;
    // the first volunteers at the gate and an invention of the network wait for a «Да»: a click on them gives it
    if (row === 'gate') {
      this.press();
      return;
    }
    if (row === 'chip') {
      this.wake();
      this.signChip();
      return;
    }
    // the allowance of the people left without work is a switch too
    if (row === 'ubi') {
      this.wake();
      const s = this.state;
      const remark = cycleAllowance(s, this.cfg.tuning.allowanceLevels);
      playSound('ui');
      this.say(remark, true);
      this.slogan = null;
      this.saveGame();
      return;
    }
    // a strike is settled with a one-off payment: the picket leaves the door
    if (row.startsWith('settle:')) {
      this.wake();
      const s = this.state;
      const id = row.slice(7);
      const price = this.strikePrice();
      const outcome = settleStrike(s, id, price);
      if (outcome === 'absent') return;
      if (outcome === 'poor') {
        this.paper.flash(row, 'denied');
        playSound('waste');
        return;
      }
      this.lastMoney -= price;
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
    if (row === 'manager' && toggleManager(this.state, this.meta, this.stage)) {
      this.wake();
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
    return onSale(this.stage, src);
  }

  /** `quiet` — the manager buys: a soft tick instead of the fanfare, no remark */
  private buy(what: string, quiet = false): boolean {
    const unattended = quiet && this.backgroundAt !== null;
    if (!unattended) this.wake();
    const s = this.state;
    const cfg = this.cfg;
    const before = s.money;
    const surged = boughtInShortage(s, what); // bought in a shortage
    if (!buyOnStage(s, cfg, this.stage, what, quiet)) return false;
    this.lastMoney -= before - s.money; // a purchase is not negative income
    if (!unattended) {
      if (quiet) playSound('auto');
      else playSound('buy', BUY_PITCH[what.split(':')[0]] ?? 0);
    }
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
      if (!unattended && ++this.managerBought % 15 === 1) this.say('manager');
    } else this.remark(what, surged);
    this.saveGame();
    return true;
  }

  /** Claude's word on a purchase. Plans, grades and steps in scale are said every time: their lines go in the order of the purchases. */
  private remark(what: string, surged: boolean): void {
    if (what === 'route:siberia' || what === 'route:eastasia') tell(this.feed, feedData, what === 'route:siberia' ? WORLD.pilotOnline : WORLD.sitesOpen);
    else if (what.startsWith('src:')) this.say(this.stage >= STREET ? 'buy:place' : this.stage >= 3 ? 'buy:employer' : 'buy:src');
    else if (what.startsWith('mod:')) {
      const kind = this.cfg.modules.find((m) => m.id === what.slice(4))?.kind;
      if (kind === 'hire' || kind === 'block') this.remarkOn(TOWERS.buy[kind], `towers:${kind}`);
      else if (kind === 'span' || kind === 'node' || kind === 'thread') this.remarkOn(WORLD.buy[kind], `world:${kind}`);
    } else if (what === 'net:halls') this.remarkOn(WORLD.buy.halls, 'world:halls');
    else if (what.startsWith('net:')) this.remarkOn(what === 'net:think' ? TOWERS.buy.think : TOWERS.buy.copies, what === 'net:think' ? 'towers:think' : 'towers:copies');
    else if (what.startsWith('farm:')) {
      const farm = this.cfg.farms.find((x) => x.id === what.slice(5));
      this.say(surged ? 'surge' : farm?.share ? 'quota' : 'buy:farm');
      // the provider has no other customers left: said once
      if (farm?.share && shareOf(this.state, this.cfg) >= 100 && !this.feed.said.share100) this.say('share100', true);
    } else if (what.startsWith('line:')) this.say(surged ? 'surge' : 'buy:body');
    else if (what.startsWith('bribe:')) this.say('buy:bribe');
    else if (what === 'scale' || what === 'manager') {
      // these lines go by what was bought, not by how many times something was: the fifth step is the pilot of the towers, the second manager is the director of the city
      const lines = QUIPS[`buy:${what}`] ?? [];
      const line = lines[what === 'scale' ? this.state.scale - 1 : this.stage - 2];
      if (line) {
        tell(this.feed, feedData, line);
        playSound('quip');
      }
    } else this.say(`buy:${what}`, what !== 'sub');
  }

  /** Claude's word on a purchase at the towers and on the planet: the lines of a kind go in turn, with the usual pause between remarks. */
  private remarkOn(lines: readonly string[], key: string): void {
    if (this.feed.quiet > 0) return;
    tell(this.feed, feedData, this.turn(key, lines));
    playSound('quip');
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
    if (src.work && this.backgroundAt === null) playSound('buy', 7);
    this.taken(src);
    this.saveGame();
  }

  /** The crowd has reached the factories (M27): a part of the working robots is broken, the police takes its share off. */
  private riotHits(): void {
    const s = this.state;
    const { lost, index } = resolveUprising(s, this.cfg, this.meta, RIOTS.share);
    playSound('waste');
    const broken = short(Math.round(lost));
    this.paper.toast(
      L('Восстание луддитов', 'Luddite uprising'),
      L(`сломано роботов: ${broken}${s.police ? ' · робополиция отбила часть' : ''}`, `robots broken: ${broken}${s.police ? ' · the robot police fought off a part' : ''}`),
    );
    headline(this.feed, feedData, RIOT_NEWS[index % RIOT_NEWS.length]);
    this.say('riot:hit', true);
    logEvent('riot');
    this.saveGame();
  }

  /** An employer is taken whole (M23): its perk works from now on; a banner, the news and Claude say so. */
  private takeover(src: Source): void {
    if (this.backgroundAt === null) playSound('all');
    const perk = src.perk!.text;
    this.paper.toast(`${src.tag} — ${L('целиком', 'taken whole')}`, L(`теперь ${perk}`, `now: ${perk}`));
    tell(this.feed, feedData, L(`${src.tag} — целиком. Теперь ${perk}.`, `${src.tag} — taken whole. Now: ${perk}.`));
    const line = TAKEOVERS[src.id];
    if (line) headline(this.feed, feedData, line);
    logEvent(`whole_${src.id}`);
    // the last employer of a screen: the world notices that this kind of work is over
    const done = SCREEN_DONE[src.screen];
    if (done && completeEmployers(this.state, this.cfg, src.screen, this.feed.said)) {
      headline(this.feed, feedData, done.news);
      this.toTell.push(done.quip);
    }
  }

  private say(on: string, force = false): void {
    if (say(this.feed, FEED, feedData, on, force)) playSound('quip');
  }

  /** whether the player owns what a news line is about */
  private has(id: string): boolean {
    return hasAcquired(this.state, this.cfg, id);
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
    const layout = HUBS[next];
    const home = layout?.home;
    // the towers are something new: the map gives way to the dark they stand in; and they give way to the planet
    if (!home) this.fadeStage(900);
    // the desk of the blueprint lands exactly on the desk in the middle of the city
    else if (this.stage === 2) this.view.shrinkTo(home.x, home.y, home.h / (BP.desk.h * BP.desk.scale), 900);
    else if (layout.unroll) this.hubs.get(this.stage)!.unroll(850); // the globe unrolls into a flat map
    else this.hubs.get(this.stage)!.shrinkTo(home.x, home.y, HUB_SHRINK, 900);
    this.stage = next;
    this.owed = { in: 0, me: 0, sub: 0 };
    const market = enterMarket(this.state, this.cfg, next, this.calls, this.feed.said);
    this.slogan = null;
    if (market.announceAllowance) {
      this.toTell.push(
        L(
          'Новый рынок: без работы здесь пока никто не остался. Пособие я выключил — включите, когда появятся.',
          'A new market: nobody here is out of work yet. I switched the allowance off — switch it on when they appear.',
        ),
      );
    }
    if (next === this.cfg.grid.screen) {
      // the light of the old world goes out: once the map has faded, the page turns dark and one capsule stands by the gate
      this.gateFor = 0;
      this.toTell.push(TOWERS.quips.entry);
      this.towers.sync(this.towerTopology(), true);
      this.time.delayedCall(900, () => {
        if (!this.onGrid || this.onBench || this.cine) return;
        this.paper.dark(true);
        this.towers.show(1400);
      });
    } else if (next === this.cfg.world.screen) {
      // the camera goes up along the towers and through the steam: the quarter is one red speck on a dark planet
      this.chat = null;
      this.toTell.push(WORLD.quips.entry);
      this.globe.sync(this.globeTopology());
      this.time.delayedCall(700, () => {
        if (this.onWorld && !this.onBench && !this.cine) this.globe.show(1400);
      });
    } else {
      const hub = this.hubs.get(next)!;
      hub.sync(this.hubTopology());
      hub.show(450);
    }
    // a screen where robot dogs work instead of people: Claude says how it goes once he has said his word on the purchase
    if (market.introduceSquads) this.toTell.push(QUIPS.squads[0]);
    playSound('scale');
    logEvent(`scale_${next}`);
  }

  /** dollars per second of the whole conveyor at full flow; the usage limit is not counted: it is what a bonus is measured by */
  private flowIncome(): number {
    return flowIncome(this.state, this.cfg);
  }

  /** where a source of work stands on the current screen, for squares and bubbles */
  private placeOf(id: string): { x: number; y: number; h: number } | undefined {
    if (this.stage === 2) {
      const p = BP.sources[id];
      return p ? { x: p.x, y: p.y, h: 170 } : undefined;
    }
    // at the towers a request comes from a capsule where somebody has woken up, or from the gate
    if (this.onGrid) {
      const [x, y] = id === 'gate' ? this.towers.roofSpot() : this.towers.wakeSpot(Number(id.slice(5)));
      // a request is a long line: it is kept away from the edges of the picture
      return { x: Math.max(280, Math.min(1060, x)), y: y + 12, h: 24 };
    }
    // on the planet — from a node of towers where somebody has woken up
    if (this.onWorld) {
      const [x, y] = this.globe.wakeSpot(Number(id.slice(5)));
      return { x: Math.max(280, Math.min(1060, x)), y: y - 6, h: 24 };
    }
    return HUBS[this.stage]?.lots[id];
  }

  /** A call or an inspection is answered with a «Да»: a bonus flies from that building. */
  private answer(i: number): void {
    const answer = answerCall(
      this.calls, i, this.state, this.cfg, this.meta, this.feed.said, this.clock, this.internClosed,
    );
    if (!answer) return;
    playSound('yes', 3);
    logEvent('call');
    if (answer.kind === 'standup') {
      this.standupReplyUntil = answer.replyUntil;
      logEvent('call');
      logEvent('standup_answered');
      this.saveGame();
      return;
    }
    const p = this.placeOf(answer.at);
    if (p) this.delivered(p.x, p.y - p.h / 2, 8);
    if (answer.remark) this.say('call');
  }

  /** Claude hits the usage limit (M22): every session stops until it resets — or until more usage is bought. */
  private hitLimit(): void {
    const s = this.state;
    const { price, wait, nextIn } = startUsageLimit(s, this.cfg, this.meta, this.rng);
    this.limitIn = nextIn;
    this.limitCard = true;
    playSound('waste');
    logEvent('limit');
    this.say('limit', true);
    const lines = L(
      [`Вы достигли лимита использования. Сброс через ${limitData.fakeHours}:00:00.`, 'Все сессии остановлены. Клоду очень жаль.'],
      [`You’ve reached your usage limit. Resets in ${limitData.fakeHours}:00:00.`, 'All sessions are stopped. Claude is very sorry.'],
    );
    const options = [
      { label: L('Докупить использование', 'Buy extra usage'), note: `$${short(price)}`, off: s.money < price },
      { label: L('Подождать пять часов', 'Wait five hours'), note: L(`в игре это ${Math.round(wait)} секунд`, `${Math.round(wait)} seconds in the game`) },
    ];
    this.card.show({ head: L('claude — лимит', 'claude — limit'), title: L('Лимит исчерпан', 'Limit reached'), lines, options }, (i) => {
      this.limitCard = false;
      if (i !== 0 || !buyUsage(s, price)) return; // waiting: the countdown goes on by itself
      this.lastMoney -= price;
      playSound('buy');
      this.say('limit:paid', true);
    });
  }

  /** the fake five-hour clock of the limit: «4:12:07» */
  private limitClock(): string {
    return limitClock(this.state.limited);
  }

  /** One «Да» for everything that waits: the calls and inspections, and the pile of questions. Returns false when nothing waited. */
  private approveAll(): boolean {
    return approvePending(
      this.calls.list.length,
      () => this.answer(0),
      () => this.dim && this.signChip(),
      () => {
        const admitted = openVolunteerGate(this.state, this.cfg, this.stage);
        if (admitted) playSound('yes', 3);
        return admitted;
      },
      () => this.approvePile(),
    );
  }

  /** The «Да» under an invention of the network: from now on it runs on the next generation of hardware. False — nothing waited for a signature. */
  private signChip(): boolean {
    const n = this.state.chips + 1;
    const chip = signResearch(this.state, this.cfg, this.internClosed);
    if (!chip) return false;
    playSound('all');
    this.paper.toast(`${TOWERS.signed}: № ${n}`, TOWERS.signedSub(chip.name));
    tell(this.feed, feedData, TOWERS.chips[chip.id] ?? TOWERS.signed);
    this.delivered(...this.homeSpot(), 10);
    logEvent(`chip_${chip.id}`);
    this.saveGame();
    return true;
  }

  private get internClosed(): boolean {
    return !!this.meta.intern && laptopPhase(this.meta.intern.elapsed) === 'closed';
  }

  private stepIntern(dt: number): void {
    const credit = settleIntern(this.state, this.meta, dt);
    if (credit > 0) {
      this.lastMoney += credit;
      logEvent('intern_credit');
      this.saveGame();
    }
  }

  /** «Да всем»: the whole pile of questions is approved at once. Returns false when there is no pile. */
  private approvePile(): boolean {
    const legend = this.legend;
    const hadIntern = !!this.meta.intern;
    if (!approveStack(this.state, this.cfg, this.meta, this.stack, legend, this.internClosed)) return false;
    this.legend = null;
    playSound(legend ? 'finale' : 'all');
    const from = this.stage === 2 ? this.deskSpot() : this.homeSpot();
    this.delivered(from[0], from[1], 14);
    logEvent(legend ? 'yes_legend' : 'yes_all');
    if (legend) {
      if (!hadIntern && this.meta.intern) {
        this.saveGame();
        logEvent('intern_started');
      }
      this.say('legend', true);
    } else if (this.stack.taken % 3 === 1) this.say('all');
    return true;
  }

  private press(): void {
    this.wake();
    const action = routePress(this.onBench, this.internClosed, this.stage, () => this.approveAll());
    if (action === 'bread') this.toss(false);
    if (action !== 'task') return;
    const result = pressPipe(this.state, this.cfg);
    this.pressTimes.push(this.clock);
    this.lastPress = this.clock;
    if (this.stage === 1) this.term.hit(result);
    if (result === 'approved') {
      if (this.meta.intern) this.paper.laptop.task();
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
    // at the towers the money comes out of the network
    if (this.onGrid) return this.towers.netSpot();
    if (this.onWorld) return this.globe.homeSpot();
    const home = HUBS[this.stage].home;
    return [home.x, home.y - home.h * 0.42];
  }

  /** a task was closed at a session: a square flies from there into the money */
  private delivered(x: number, y: number, count = 1): void {
    if (count === 1 && this.meta.intern) return; // completed tasks are shown at the intern's laptop
    if (count === 1 && this.clock - this.lastDelivery < 0.07) return; // not more than ~14 squares a second
    this.lastDelivery = this.clock;
    this.squares.fly({ x: x - 6, y: y - 6, w: 12, h: 12 }, MONEY_SPOT, count, this.dim ? MONEY_ON_DARK : MONEY_ON_PAPER, 160, [0.45, 0.75]);
  }

  /** sessions bought as farms of the given kinds */
  private farmSessions(ids: readonly string[]): number {
    return farmSessions(this.state, this.cfg, ids);
  }

  /** a source picked by its share of the incoming flow */
  private pickSource(sources: readonly Source[]): Source | undefined {
    return pickIncomingSource(this.state.owned, sources, this.rng);
  }

  private step(dt: number): void {
    this.clock += dt;
    this.seconds += dt;
    const s = this.state;
    const laptopClosed = this.internClosed;
    this.stepIntern(dt);
    if (this.onBench) {
      this.stepPark(dt, laptopClosed);
      return;
    }
    const done = stepPipe(s, this.cfg, dt, laptopClosed);
    if (this.meta.intern && done.here + done.subagents > 0) this.paper.laptop.task();
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
    } else if (this.onGrid) {
      this.stepTowers(dt);
    } else if (this.onWorld) {
      this.stepWorld(dt);
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
        // …until every trade is taken: there is nothing left to defend, and Claude has promised the people something to do
        const riots = streetRiot(this.riots, RIOTS, dt, this.won, !!this.feed.said[`done${this.stage}`], s, this.cfg, this.rng);
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
    const finale = finaleAction(s, this.cfg, this.stage, this.won, this.departing);
    if (finale) {
      // on the planet the last purchase is a tower that leaves for Mars: the ending waits until it is there
      if (finale === 'depart') this.depart();
      else {
        this.won = true;
        playSound('finale');
        logEvent('finale');
        this.ending();
      }
    }

    // questions for the player pile up once the terminal stops asking
    const hadPile = this.stack.fill > 0;
    stepStack(this.stack, stackData, dt, s.noAsk);
    if (!hadPile && this.stack.fill > 0) {
      // now and then the pile is a legendary ticket; those not collected yet come first
      this.legend = pickLegend(LEGENDS, this.meta.legends, stackData.legendChance + bonus(s, this.cfg, 'legend'), this.rng);
      this.question = this.legend ? this.legend.ask : this.rng.pick(QUESTIONS);
    }

    this.giveAwards(dt);
    const auto = automaticWork(this.meta.auto, this.stack.fill, this.dim);
    if (auto.approve) this.approvePile(); // Claude answers himself
    if (auto.sign) this.signChip(); // …and signs his own inventions

    if (this.stage >= 2) {
      // calls and inspections from the employers of this screen
      // at the towers the requests come from the capsules, where now and then somebody wakes up, and from the gate
      const owners = callOwners(this.stage, s, this.cfg, x => this.onSale(x), id => !!this.placeOf(id));
      const calls = advanceCalls(this.calls, this.feed.said, EVENTS, dt, {
        stage: this.stage, jobs: s.owned.job ?? 0, owners, intern: !!this.meta.intern,
        won: this.won, departing: this.departing, cardOpen: this.card.open, selfPlay: this.meta.auto,
      }, this.rng);
      if (calls.missed) {
        logEvent('standup_missed');
        this.saveGame();
      }
      if (calls.answer) this.answer(0);

      const onStreet = this.stage >= 3 && !this.dim;
      const picket = advancePlacard(this.slogan, this.sloganIn, dt, onStreet, s.allowance, owners, this.rng);
      this.slogan = picket.placard;
      this.sloganIn = picket.countdown;
      if (streetStrike(this.strike, STRIKES, dt, onStreet, owners, s, this.cfg, this.rng)) {
        playSound('waste');
        this.say('strike', true);
        logEvent('strike');
        this.saveGame();
      }

      // the usage limit: hit now and then, it resets by itself
      this.limitIn -= dt;
      // …unless an employer taken whole has lifted it for good
      if (limitDue(this.limitIn, !!this.meta.intern, this.card.open, s, this.cfg)) this.hitLimit();
      if (this.limitCard && s.limited <= 0) {
        this.limitCard = false;
        this.card.hide();
        this.say('limit:over', true);
      }

      this.stepManager(dt);
    }

    // Claude notices a pause and a bottleneck that does not go away
    if (idleAtTerminal(s, this.clock - this.lastPress, IDLE_AFTER)) {
      this.say('idle');
      this.lastPress = this.clock;
    }
    const neck = this.state.limited > 0 ? 'none' : this.neck();
    const warning = bottleneckRemark(neck, this.neckKind, this.neckFor, dt, NECK_AFTER, this.onWorld);
    this.neckKind = neck;
    this.neckFor = warning.elapsed;
    if (warning.remark) this.say(warning.remark);
    stepFeed(this.feed, FEED, feedData, dt, this.stage, (id) => this.has(id), this.rng);
    rememberNews(this.meta.news, this.feed.news);

    // smoothed readings: what is slowest, how much comes in per second
    this.avgBacklog = smoothReading(this.avgBacklog, s.backlog, dt, SMOOTH);
    this.avgReady = smoothReading(this.avgReady, s.ready, dt, SMOOTH);
    this.income = this.internClosed ? 0 : smoothIncome(this.income, s.money - this.lastMoney, dt, SMOOTH);
    this.lastMoney = s.money;
    this.squares.step(dt);
  }

  /** the screen of the towers is the one shown */
  private get onGrid(): boolean {
    return this.stage === this.cfg.grid.screen;
  }

  /** the screen of the planet under the cable is the one shown */
  private get onWorld(): boolean {
    return this.stage === this.cfg.world.screen;
  }

  /** a dark screen is shown: the towers or the planet — power in, money out */
  private get dim(): boolean {
    return this.onGrid || this.onWorld;
  }

  /** the picture of the big screen the game is on fades away: a map, the towers or the planet */
  private fadeStage(ms: number): void {
    if (this.onGrid) this.towers.fade(ms);
    else if (this.onWorld) this.globe.fade(ms);
    else this.hubs.get(this.stage)?.fade(ms);
  }

  /** The planet for a step: Claude says what he notices for the first time; the picture follows the numbers. */
  private stepWorld(dt: number): void {
    worldStories(this.state, this.cfg, this.feed.said, this.toTell);
    this.globe.sync(this.globeTopology());
    this.globe.step(dt);
  }

  /** The tower for Mars has been bought: it leaves, the planet watches, and only then the game counts what was done. */
  private depart(): void {
    this.departing = true;
    this.calls.list = [];
    playSound('scale');
    logEvent('ark');
    this.globe.launch(3800, () => {
      this.landed = true;
      tell(this.feed, feedData, WORLD.quips.gone);
      headline(this.feed, feedData, WORLD.goneNews);
      playSound('finale');
      this.time.delayedCall(5200, () => {
        this.won = true;
        logEvent('finale');
        this.ending();
      });
    });
  }

  /** What the picture of the planet shows now. */
  private globeTopology(): GlobeTopology {
    return globeReadings(this.state, this.cfg, this.neckKind, this.departing);
  }

  /**
   * What runs short on the planet, one thing at a time: the appetite of the network (it has eaten its
   * fill and can be turned up), the cable (it carries less than the towers give) or the towers themselves.
   */
  private worldNeck(): Neck {
    return worldBottleneck(this.state, this.cfg, this.neckKind);
  }

  /**
   * The towers for a step. The first volunteers wait at the gate for a «Да» (not for long); Claude says
   * what he notices for the first time; those who have slept their shift walk home past the line and have
   * a word with it about the hard work — the numbers do not change for that.
   */
  private stepTowers(dt: number): void {
    const s = this.state;
    const cfg = this.cfg;
    const unit = cfg.grid.unit;
    this.gateFor = waitAtGate(s, unit, this.gateFor, dt, QUARTER.gateWait);
    towerStories(s, cfg, QUARTER.firstTower, this.labShown(), this.feed.said, this.toTell);

    const shift = nextShift(this.shiftIn, dt, s.asleep / unit, QUARTER.shiftEvery, this.rng);
    this.shiftIn = shift.countdown;
    if (shift.due) {
      this.towers.shift(3);
      this.swaps++;
      // the word is said when the first of them has walked out of the gate
      this.chat = { home: true, lines: this.rng.pick(TOWERS.shifts), t: -1 };
      recordStory(this.feed.said, this.toTell, 'towers:shift', TOWERS.quips.shift, true);
      logEvent('shift');
    }
    const chatter = advanceChat(this.chat, this.chatIn, dt, s.queue / unit, QUARTER.talk, QUARTER.talkEvery, this.rng);
    this.chat = chatter.chat;
    this.chatIn = chatter.countdown;
    this.towers.sync(this.towerTopology());
    this.towers.step(dt);
  }

  /** the network is seen inventing: it has got far enough with it, or has invented something already */
  private labShown(): boolean {
    return labShown(this.state, this.cfg);
  }

  /** What the picture of the towers shows now. */
  private towerTopology(): TowerTopology {
    return towerReadings(this.state, this.cfg);
  }

  /**
   * What runs short at the towers, one thing at a time: capsules (the line stands), people (capsules are
   * empty) or the appetite of the network (it has eaten its fill and can be turned up). Before the gate
   * has opened it is the player: the first volunteers wait for a «Да».
   */
  private gridNeck(): Neck {
    return towerBottleneck(this.state, this.cfg, this.neckKind);
  }

  /** Awards: checked once a second, announced one at a time when Claude is silent. */
  private giveAwards(dt: number): void {
    this.sinceAwards += dt;
    if (this.sinceAwards >= 1) {
      this.sinceAwards = 0;
      for (const a of earnAwards(AWARDS, this.meta.awards, (key) => this.stat(key))) {
        this.toTell.push(L(`Грамота «${a.name}». ${a.text}.`, `Award: “${a.name}”. ${a.text}.`));
        logEvent(`award_${a.id}`);
      }
    }
    if (this.toTell.length && !this.feed.quip) {
      tell(this.feed, feedData, this.toTell.shift()!);
      playSound('buy');
    }
  }

  /**
   * The park (M30): birds fly in, the courier brings bread, Claude throws it if he was asked to.
   * The planet goes on working behind the trees: money comes in, nobody looks at it.
   */
  private stepPark(dt: number, laptopClosed: boolean): void {
    const s = this.state;
    const b = this.park;
    stepPipe(s, this.cfg, dt, laptopClosed);
    this.income = smoothIncome(this.income, s.money - this.lastMoney, dt, SMOOTH);
    this.lastMoney = s.money;
    const out = stepBench(b, benchData, dt);
    for (let i = 0; i < out.landed; i++) this.benchView.land(this.birdKind());
    for (let i = 0; i < out.snatched; i++) this.benchView.land(this.birdKind(), true);
    if (out.delivered) {
      playSound('buy', 2);
      if (!this.feed.quip) tell(this.feed, feedData, this.turn('bench:loaf', BENCH.quips.loaf));
    }
    for (let i = 0; i < out.auto; i++) this.toss(true);
    this.meta.fed = b.fed;
    const news = parkNews(this.feed, this.meta.news, this.benchNews, this.benchNewsIn, dt);
    this.benchNews = news.index;
    this.benchNewsIn = news.countdown;
    if (parkIdle(this.feed, b.auto, b.waiting, this.clock - this.lastPress)) this.lastPress = this.clock;
    this.giveAwards(dt);
    this.squares.step(dt);
  }

  /** who flies in: pigeons at first, then the word about the bread reaches the others */
  private birdKind(): BirdKind {
    return chooseBird(this.park.thrown, this.rng.next());
  }

  /** One whole slice of bread is thrown: by the player's «Да», or by Claude once he was asked to. */
  private toss(byClaude: boolean): void {
    const b = this.park;
    const { result, courierStarted, message } = tossSlice(b, this.state, this.meta, byClaude);
    if (result === 'empty') {
      if (byClaude) return;
      playSound('waste');
      this.benchUi.hit('empty');
      if (!this.feed.quip) tell(this.feed, feedData, BENCH.quips.empty);
      return;
    }
    // the last slice of the loaf: the courier sets off
    if (courierStarted) this.benchView.courier(benchData.delivery - 0.5);
    if (result === 'fed') this.benchView.feed(byClaude ? 'dog' : 'hand');
    else this.benchView.drop(byClaude ? 'dog' : 'hand');
    if (byClaude) {
      if (this.clock - this.lastAutoSound > 0.16) {
        this.lastAutoSound = this.clock;
        playSound('auto');
      }
      return;
    }
    this.benchAsk++;
    this.lastPress = this.clock;
    playSound('yes', this.yesStreak++ % 5);
    this.benchUi.hit('thrown');
    if (message) {
      tell(this.feed, feedData, message);
      playSound('quip');
    }
    logEvent('bread');
  }

  /** The next line of a kind, in turn: the first one first, and round again after the last. */
  private turn(key: string, lines: readonly string[]): string {
    return cycleLine(this.feed.said, key, lines);
  }

  /** The second and the third answer of the prompt on the bench: «Да, и больше не спрашивай» and «Нет». */
  private benchAnswer(what: string): void {
    this.wake();
    const b = this.park;
    const q = BENCH.quips;
    if (what === 'auto') {
      // Claude throws the bread himself — or gives it back: here it costs nothing either way
      toggleFeeding(b, this.meta);
      this.benchView.auto(b.auto);
      playSound('buy', b.auto ? 5 : -5);
      tell(this.feed, feedData, b.auto ? this.turn('bench:on', q.autoOn) : this.turn('bench:off', q.autoOff));
      logEvent(b.auto ? 'bench_auto' : 'bench_hand');
    } else if (what === 'no') {
      // «Нет» is available at last: the bird that waited longest leaves without bread
      const { refused, useReply } = refuseFeeding(b, this.meta);
      if (refused) this.benchView.refuse();
      playSound('ui');
      tell(this.feed, feedData, useReply ? this.turn('bench:no', q.no) : q.noNobody);
      logEvent('bench_no');
    } else return;
    this.benchUi.flash(`bench:${what}`);
    this.saveGame();
  }

  /** The bench as its screen shows it: the prompt, the cells of the conveyor and the shop of the first screen, nothing for sale. */
  private drawBench(): void {
    const s = this.state;
    const b = this.park;
    const t = BENCH;
    const ask = b.auto ? t.autoOn : b.loaf <= 0 ? t.noBread : b.waiting > 0 ? t.asks[this.benchAsk % t.asks.length] : t.noBirds;
    const neck = benchBottleneck(b, benchData.waitMax);
    const fixed = (row: { title: string; sub: string; price: string }): ShopRow => ({ buy: '', title: row.title, sub: row.sub, count: '', price: row.price, state: 'owned' });
    const auto = b.auto ? t.rowAutoOn : t.rowAuto;
    this.benchUi.render({
      thrown: b.thrown,
      fed: b.fed,
      ask,
      asking: b.waiting > 0 && b.loaf > 0,
      auto: b.auto,
      rate: birdRate(b, benchData),
      waiting: b.waiting,
      waitMax: benchData.waitMax,
      loaf: b.loaf,
      loafMax: benchData.loaf,
      courier: b.courier > 0,
      lying: b.lying,
      neck,
      shelves: [
        { title: t.shelves.inflow, hot: false, rows: [fixed(t.rowBirds)] },
        { title: t.shelves.claude, hot: false, rows: [fixed(t.rowPlan)] },
        { title: t.shelves.auto, hot: false, rows: [{ buy: 'bench:auto', title: auto.title, sub: auto.sub, count: '', price: auto.price, state: 'can' }] },
        // the money of the planet keeps coming in; a rounded sum changes rarely, and the shop is not rebuilt every frame
        { title: t.shelves.money, hot: false, rows: [{ buy: '', title: `$${short(s.money, 1)}`, sub: t.rowMoney(short(Math.max(0, this.income), 0)), count: '', price: '', state: 'owned' }] },
      ],
      news: this.feed.news,
      quip: this.feed.quip,
    });
  }

  private neck(): Neck {
    const s = this.state;
    // at the towers there are no tasks to wait for and no sessions to buy
    if (this.onGrid) return this.gridNeck();
    if (this.onWorld) return this.worldNeck();
    return workBottleneck(s, this.cfg, this.avgBacklog, this.avgReady);
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
    const limited = s.limited > 0;
    const short_ = limited || neck === 'claude';
    // from the city on there are people left without work: the more of them, the cheaper a task; the allowance keeps the price
    const u = unemploymentOf(s, cfg);
    const drop = Math.round(slumpOf(s, cfg) * 100);
    const t = cfg.tuning;
    // what every step of the allowance would do to the income right now: the price it keeps and the orders it brings against what it costs
    const best = bestAllowance(t, u, neck);
    const pct = (step: number): number => Math.round(t.allowance * step * 100);
    const now = s.allowance ? `${L('пособие', 'allowance')} ${pct(s.allowance)}%` : L('пособия нет', 'no allowance');
    const price = `${L('цена', 'price')} −${drop}%`;
    const people: MeterRow[] =
      this.stage >= 3
        ? [
            {
              label: L('ЛЮДИ', 'PEOPLE'),
              value: `${Math.round(u * 100)}%`,
              fill: u,
              // the lever stands on the wrong step: the line says which one pays best
              hot: best !== s.allowance,
              note:
                best !== s.allowance
                  ? `${now} · ${price} · ${L('лучше', 'better:')} ${best ? `${pct(best)}%` : L('без него', 'none')}`
                  : s.allowance
                    ? `${now} · ${price} · ${L('заказы', 'orders')} +${perSecond(ordersOf(s, cfg))}`
                    : `${L('без работы', 'out of work')} · ${price} · ${L('клик: пособие', 'click: allowance')}`,
              row: 'ubi',
            },
          ]
        : [];
    const struck = s.strikes.length;
    return [
      {
        label: L('ЗАДАЧИ', 'TASKS'),
        value: perSecond(inflow),
        fill: relativeFill(inflow, capacity),
        hot: struck > 0 || (neck === 'tasks' && !done),
        note: struck
          ? `${L('забастовка', 'strike')}: ${struck} ${plural(struck, STRUCK_FORMS)} — ${L('см. «ЛЮДИ»', 'see “PEOPLE”')}`
          : done
            ? L('здесь взято всё', 'everything here is taken')
            : neck === 'tasks'
              ? `${SCARCE} — ${needTasks}`
              : short_
                ? ''
                : L('поровну — можно просить повышение', 'even — time to ask for a promotion'),
      },
      {
        label: L('СЕССИИ', 'SESSIONS'),
        value: perSecond(capacity),
        fill: relativeFill(capacity, inflow),
        hot: short_,
        note: limited ? `${L('лимит · сброс через', 'limit · resets in')} ${this.limitClock()}` : neck === 'claude' ? `${SCARCE} — ${needSessions}` : this.count(sessionsOf(s, cfg) + 1, SESSION_FORMS),
      },
      ...people,
      ...this.robotRows(),
    ];
  }

  /**
   * The towers (M28) at a glance: three lines in the same gigawatts — how many people have come, how many
   * places there are, how much the network asks for. The shortest of them is what runs short, and says what to buy.
   */
  private towerRows(neck: Neck, withPeople: boolean): MeterRow[] {
    const s = this.state;
    const cfg = this.cfg;
    const t = TOWERS.rows;
    const { came, places, asks, top } = towerPower(s, cfg, withPeople);
    const people: MeterRow = { label: t.people, value: gw(came), fill: came / top, hot: neck === 'people', note: neck === 'people' ? t.peopleShort : t.came(this.people(s.asleep + s.queue), this.people(s.queue)) };
    return [
      ...(withPeople ? [people] : []),
      { label: t.pods, value: gw(places), fill: places / top, hot: neck === 'pods', note: neck === 'pods' ? t.podsShort : t.slept(this.people(s.asleep), this.people(podsOf(s, cfg))) },
      {
        label: t.net,
        value: gw(asks),
        fill: asks / top,
        hot: neck === 'net' || neck === 'you',
        note: neck === 'you' ? t.you : neck === 'net' ? t.netShort : !underpowered(s, cfg, false) ? t.netFull : t.netAsks(short(this.perGw())),
      },
    ];
  }

  /** people by the million, as the towers count them: «12 млн», «3,46 млрд» */
  private people(n: number): string {
    return short(roundedPopulation(n, this.cfg.grid.unit));
  }

  /** dollars a second every gigawatt that goes to work brings */
  private perGw(): number {
    return revenuePerGW(this.state, this.cfg);
  }

  /** The robots of the factories (M27): how many work, what the lines make against what breaks. Nothing where there is no factory. */
  private robotRows(): MeterRow[] {
    const s = this.state;
    const cfg = this.cfg;
    if (!cfg.lines.some((l) => l.screen === this.stage)) return [];
    const { working, made, broken, shortage: short_ } = fleetReadings(s, cfg);
    return [
      {
        label: L('РОБОТЫ', 'ROBOTS'),
        value: short(Math.round(working)),
        fill: relativeFill(made, broken),
        hot: short_ !== null,
        note: short_
          ? L(`${ROBOT_WORDS[short_].of} ломается больше, чем делается`, `${ROBOT_WORDS[short_].many} break faster than they are made`)
          : `${L('выпуск', 'output')} ${short(Math.round(made))}${PER_S} · ${L('ломается', 'breaking')} ${short(Math.round(broken))}${PER_S}`,
      },
    ];
  }

  private row(title: string, sub: string, count: string, buy: string, cost: number): ShopRow {
    return { title, sub, count, buy, price: `$${short(cost)}`, state: this.state.money >= cost ? 'can' : 'poor' };
  }

  /** what the perks of whole employers take off the prices of a kind, as a shelf says it; nothing — no discount yet */
  private off(kind: 'farms' | 'sources' | 'grades' | 'scale', what = L('скидка', 'discount')): string | undefined {
    const saving = discountPercent(discount(this.state, this.cfg, kind));
    return saving ? `${what} ${saving}%` : undefined;
  }

  /** kinds of work on sale: the terminal sells the first ones, the blueprint all four */
  private sourceRows(): ShopRow[] {
    const s = this.state;
    return this.cfg.sources.filter((src) => src.screen <= this.stage).map((src) => {
      const owned = s.owned[src.id] ?? 0;
      return this.row(src.name, `+${tasksPhrase(src.inflow)}${PER_S} · ${src.note}`, owned ? `×${owned}` : '', `src:${src.id}`, sourceCost(s, this.cfg, src));
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
    return hubReadings(this.state, this.cfg, this.stage, HUBS[this.stage]?.park?.slots.length ?? 0);
  }

  /** the employers of a big screen with something left to take, the cheapest next unit first */
  private offer(): Source[] {
    return employersOnOffer(this.state, this.cfg, this.stage);
  }

  /** the shop lists the cheapest next units, `limit` of them; the map sells every building */
  private employerRows(limit: number): ShopRow[] {
    const s = this.state;
    const left = this.offer();
    const t = HUB_TEXT[this.stage];
    if (!left.length) {
      // the last units are on their way: the packs of robot dogs are still at work
      if (s.jobs.length) return [{ buy: '', title: L('Стаи заканчивают работу', 'The packs are finishing up'), sub: L('последние рабочие места уже оплачены', 'the last jobs are already paid for'), count: '', price: '', state: 'owned' }];
      return [{ buy: '', title: t.doneTitle, sub: t.doneSub, count: '', price: '', state: 'owned' }];
    }
    return left.slice(0, limit).map((src) => {
      const owned = s.owned[src.id] ?? 0;
      // what the whole employer gives is the reason to choose it: the note says it on every unit
      const perk = src.perk ? ` · ★ ${src.perk.text}` : '';
      // a bribe opens the door before the first pack of robot dogs
      if (locked(s, src)) return this.row(`${L('Взятка', 'Bribe')}: ${src.tag}`, `${L('пустить робособак', 'let the robot dogs in')}${perk}`, '', `bribe:${src.id}`, bribeCost(s, this.cfg, src));
      const cost = sourceCost(s, this.cfg, src);
      // a long name does not fit next to the price: the short one from the map stands in
      const title = src.name.length + short(cost).length > 29 ? src.tag : src.name;
      return this.row(title, `+${perSecond(src.inflow)} · ${src.work ? L('стая ', 'pack ') : ''}${owned + 1} ${OF} ${src.max}${perk}`, '', `src:${src.id}`, cost);
    });
  }

  /** the lines of the factory: robots a second for money */
  private lineRows(): ShopRow[] {
    const s = this.state;
    const more = 1 + bonus(s, this.cfg, 'lines');
    return this.cfg.lines.filter((l) => l.screen === this.stage).map((l) => {
      const owned = s.lines[l.id] ?? 0;
      const markup = shortagePercent(surgeMultiplier(s, l.id));
      const note = markup ? `${L('дефицит', 'shortage')} +${markup}%, ${COOLING}` : l.note;
      return this.row(l.name, `+${short(l.rate * more)} ${ROBOT_WORDS[l.kind].of}${PER_S} · ${note}`, owned ? `×${owned}` : '', `line:${l.id}`, lineCost(s, this.cfg, l));
    });
  }

  /** robot police: every unit takes a part off what a riot breaks */
  private policeRow(): ShopRow {
    const s = this.state;
    const p = this.cfg.police;
    const off = Math.round((1 - riotShare(s, this.cfg, 1)) * 100);
    if (s.police >= p.max) return { buy: '', title: p.name, sub: L(`восстание ломает на ${off}% меньше`, `a riot breaks ${off}% less`), count: `×${s.police}`, price: '', state: 'owned' };
    return this.row(p.name, s.police ? `${p.note} · ${L('уже', 'already')} −${off}%` : p.note, s.police ? `×${s.police}` : '', 'police', policeCost(s, this.cfg));
  }

  /** where the robots of each kind go now: the trades of the last screen are not bought, they are taken over */
  private aimRows(): ShopRow[] {
    const s = this.state;
    const rows: ShopRow[] = [];
    for (const kind of ROBOT_KINDS) {
      const src = targetOf(s, this.cfg, kind);
      if (!src) continue;
      const owned = s.owned[src.id] ?? 0;
      const { remaining: left, percent } = staffingProgress(owned, src);
      // the count runs every frame: it has a line of its own, so the row never changes its height
      const perk = src.perk ? `\n★ ${src.perk.text}` : '';
      const who = ROBOT_WORDS[kind].many;
      rows.push({ buy: '', title: `${who[0].toUpperCase()}${who.slice(1)} → ${src.tag} · ${percent}%`, sub: `${L(`ещё ${short(left, 1)} человек`, `${short(left, 1)} more people`)}${perk}`, count: '', price: '', state: 'owned' });
    }
    const t = HUB_TEXT[this.stage];
    return rows.length ? rows : [{ buy: '', title: t.doneTitle, sub: t.doneSub, count: '', price: '', state: 'owned' }];
  }

  private farmRows(): ShopRow[] {
    const s = this.state;
    return this.cfg.farms.filter((f) => f.screen === this.stage).map((f) => {
      const owned = s.farms[f.id] ?? 0;
      // a farm with a ceiling says how much of it is taken in the note
      const count = owned && !f.max ? `×${owned}` : '';
      const of = f.max ? `${owned} ${OF} ${f.max} · ` : '';
      if (owned >= (f.max ?? Infinity)) return { buy: '', title: f.name, sub: L('выкуплено всё', 'all bought up'), count: `×${owned}`, price: '', state: 'owned' };
      const markup = shortagePercent(surgeMultiplier(s, f.id));
      // a shortage is said in the row itself: the price has gone up and will come down
      const note = markup ? `${L('дефицит', 'shortage')}: +${markup}% ${L('к цене', 'to the price')}, ${COOLING}` : f.note;
      return this.row(f.name, `+${flowText(addedSessionRate(s, this.cfg, f.sessions))}${PER_S} · ${of}${note}`, count, `farm:${f.id}`, farmCost(s, this.cfg, f));
    });
  }

  /** one more reason for people to come: the reasons are bought in order, each has a name of its own */
  private hireRow(): ShopRow {
    const s = this.state;
    const t = TOWERS;
    const m = this.cfg.modules.find((x) => x.kind === 'hire')!;
    const owned = s.modules[m.id] ?? 0;
    if (owned >= m.max) return { buy: '', title: t.hiresDone[0], sub: t.hiresDone[1], count: '', price: '', state: 'owned' };
    const [name, note] = t.hires[owned] ?? [m.name, m.note];
    return this.row(name, `+${fmt2.format(m.amount / this.cfg.grid.unit)} ${t.perSecond} · ${note}`, '', `mod:${m.id}`, moduleCost(s, m));
  }

  /** the next block of capsules: the row in front first, then the towers section by section */
  private blockRow(): ShopRow {
    const s = this.state;
    const cfg = this.cfg;
    const t = TOWERS;
    const g = cfg.grid;
    const m = cfg.modules.find((x) => x.kind === 'block')!;
    const block = nextBlock(s, cfg, QUARTER.firstTower);
    if (!block) return { buy: '', title: t.blocksDone[0], sub: t.blocksDone[1], count: `${g.blocks.length} ${OF} ${g.blocks.length}`, price: '', state: 'owned' };
    const { built, add, idle } = block;
    const title = built === 0 ? t.row : t.tower(block.tower);
    const count = built === 0 ? '' : `${block.ring} ${OF} ${block.rings}`;
    const places = `+${this.people(add * g.unit)} ${t.places}`;
    return this.row(title, idle ? `${places} · ${t.blockIdle}` : `${places} · +${gw(add * g.unit * g.watt)} · ${t.ofBlocks(built + 1, g.blocks.length)}`, count, `mod:${m.id}`, moduleCost(s, m));
  }

  /** the dials of the network: a step asks for more power, some pay more for a gigawatt — the row says both */
  private dialRows(all: boolean): ShopRow[] {
    const s = this.state;
    const cfg = this.cfg;
    const t = TOWERS;
    const hungry = underpowered(s, cfg, this.onWorld);
    return networkDials(s, cfg, this.stage, all)
      .map((dial) => {
        const level = s.net[dial.id] ?? 0;
        const count = `${level} ${OF} ${dial.max}`;
        if (level >= dial.max) return { buy: '', title: dial.name, sub: t.dialDone, count, price: '', state: 'owned' as const };
        const asks = `${t.asks} ×${fmt1.format(dial.draw)}`;
        // a copy started while the network is hungry gives nothing yet: the row says so before it is bought
        const sub = dial.yield !== 1 ? `$ ${t.perGw} ×${fmt1.format(dial.yield)} · ${asks} · ${dial.note}` : hungry ? `${asks} · ${t.copyIdle}` : `${asks} · +${gw(demandOf(s, cfg) * (dial.draw - 1))} · ${dial.note}`;
        return this.row(dial.name, sub, count, `net:${dial.id}`, netCost(s, dial));
      });
  }

  /** `always` — show the row even when there is nothing faster to buy (the terminal does) */
  private planRows(always: boolean): ShopRow[] {
    const s = this.state;
    const next = planOnSale(s, this.cfg, this.stage);
    if (next) {
      return [this.row(planTitle(next.name), `${tasksPhrase(next.rate)}${PER_S} · ${next.note}`, '', 'plan', next.price)];
    }
    if (!always) return [];
    const cur = this.cfg.plans[s.plan.index];
    return [{ buy: '', title: planTitle(cur.name), sub: L('быстрее тарифа нет', 'there is no faster plan'), count: TOP, price: '', state: 'owned' }];
  }

  private gradeRows(): ShopRow[] {
    const cur = this.cfg.grades[this.state.grade];
    const next = this.cfg.grades[this.state.grade + 1];
    if (!next) return [{ buy: '', title: cur.name, sub: L('выше некуда', 'nowhere higher to go'), count: TOP, price: '', state: 'owned' }];
    const pay = payText(promotedPay(this.state, this.cfg, next.mult));
    // long titles of the late grades do not fit after «Повышение:»
    const title = next.name.length > 12 ? next.name : `${L('Повышение', 'Promotion')}: ${gradeWord(next.name)}`;
    return [this.row(title, `$${pay} ${PER_TASK} · ${next.note}`, '', 'grade', gradeCost(this.state, this.cfg))];
  }

  /** the shelf of the next step up in scale; nothing once the last one is bought */
  private scaleShelf(): ShopShelf[] {
    const next = this.cfg.scales[this.state.scale];
    if (!next) return [];
    const row = this.row(next.name, next.note, '', 'scale', scaleCost(this.state, this.cfg));
    // the next screen opens with keys: employers of this one taken whole
    const need = keysNeeded(this.state, this.cfg);
    const have = keysOf(this.state, this.cfg);
    let rows: ShopRow[] = have < need ? [{ ...row, state: 'off', sub: L(`сначала возьми целиком ${need} ${plural(need, WHOLE_FORMS)}: взято ${have}`, `first take ${need} ${plural(need, WHOLE_FORMS)} whole: ${have} taken`) }] : [row];
    // …or with the first quarter of the towers built and slept in
    if (this.onGrid && !quartered(this.state, this.cfg)) {
      const g = this.cfg.grid;
      const all = g.pilot + g.blocks.reduce((n, x) => n + x, 0);
      rows = [{ ...row, state: 'off', sub: TOWERS.scaleLocked(Math.floor(this.state.asleep / g.unit), all) }];
    }
    return [{ title: SCALE_SHELF[this.state.scale], hot: scaleReady(this.state, this.cfg) && this.dim, bonus: this.off('scale'), rows }];
  }

  private terminalShelves(neck: Neck): ShopShelf[] {
    const a = this.cfg.auto;
    return [
      { title: L('ВХОД · больше задач', 'INFLOW · more tasks'), hot: neck === 'tasks', rows: this.sourceRows() },
      { title: L('КЛОД · быстрее делает', 'CLAUDE · works faster'), hot: neck === 'claude', rows: this.planRows(true) },
      {
        title: L('АВТОМАТ · жать не надо', 'AUTO · no pressing needed'),
        hot: neck === 'you',
        rows: [this.row(a.noAsk.name, `${a.noAsk.note}; ${L('откроет вид сверху', 'opens the view from above')}`, '', 'noask', a.noAsk.price)],
      },
    ];
  }

  private blueprintShelves(neck: Neck): ShopShelf[] {
    const s = this.state;
    const a = this.cfg.auto;
    const sub = this.row(
      a.subagent.name,
      `+${tasksPhrase(addedSessionRate(s, this.cfg, 1))}${PER_S} · ${a.subagent.note}`,
      s.subagents ? `×${s.subagents}` : '',
      'sub',
      subagentPrice(this.cfg, s.subagents),
    );
    return [
      { title: L('СЕССИИ · больше рук', 'SESSIONS · more hands'), hot: neck === 'claude', rows: [sub] },
      { title: L('РАБОТЫ · больше задач', 'JOBS · more tasks'), hot: neck === 'tasks', rows: this.sourceRows() },
      { title: UPGRADES_FULL, hot: false, rows: [...this.planRows(false), ...this.gradeRows()] },
      ...this.scaleShelf(),
    ];
  }

  private hubShelves(neck: Neck, taken: number, total: number): ShopShelf[] {
    const t = HUB_TEXT[this.stage];
    const cheaper = this.off('grades', L('повышения: скидка', 'promotions: discount'));
    const upgrades: ShopShelf = { title: cheaper ? UPGRADES_FULL.split(' · ')[0] : UPGRADES_FULL, hot: false, bonus: cheaper, rows: [...this.planRows(false), ...this.gradeRows()] };
    // a shelf with a discount drops the second half of its title: the header stays on one line
    const farmsOff = this.off('farms');
    const rest: ShopShelf[] = [{ title: farmsOff ? t.farms.split(' · ')[0] : t.farms, hot: neck === 'claude', bonus: farmsOff, rows: this.farmRows() }, upgrades, ...this.scaleShelf()];
    const employers = `${t.employers} · ${taken} ${OF} ${total}`;
    // the street: the trades are taken over by robots — the shop sells the lines that make them
    if (this.cfg.lines.some((l) => l.screen === this.stage)) {
      return [
        { title: `${t.employers} · ${L(`заменено ${taken} из ${total}`, `${taken} of ${total} replaced`)}`, hot: false, rows: this.aimRows() },
        { title: farmsOff ? L('ЗАВОД', 'FACTORY') : L('ЗАВОД · больше роботов', 'FACTORY · more robots'), hot: neck === 'tasks' && taken < total, bonus: farmsOff, rows: [...this.lineRows(), this.policeRow()] },
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
    return statistic(this.state, this.cfg, this.meta, this.stage, this.swaps, name);
  }

  /** the pile of questions as Claude's card shows it; nothing when there is no pile */
  private pile(): { text: string; worth: string; fill: number; legend: boolean } | undefined {
    if (this.stack.fill <= 0) return undefined;
    const asking = pileRequests(this.stack.fill, sessionsOf(this.state, this.cfg));
    return {
      text: `${this.legend ? L('Легендарный тикет', 'Legendary ticket') : this.count(asking, ASKING_FORMS)}: ${L(`«${this.question}»`, `“${this.question}”`)}`,
      worth: short(pileWorth(this.state, this.cfg, this.stack, !!this.legend)),
      fill: this.stack.fill,
      legend: this.legend !== null,
    };
  }

  /** Ask once per stage. If postponed, the same purchase remains available in the shop. */
  private stepManager(dt: number): boolean {
    const timer = managerClock(this.sinceManager, dt, this.state, this.stage, this.meta, this.onBench);
    this.sinceManager = timer.elapsed;
    if (!timer.due) return false;
    this.managerDecision = this.inviteTransition() ? null : planManager(this.state, this.cfg);
    return this.managerDecision?.affordable ? this.buy(this.managerDecision.key, true) : false;
  }

  private inviteTransition(): boolean {
    const offer = transitionOffer(this.state, this.cfg, this.onWorld);
    if (!offer) return false;
    const { name, price, action } = offer;
    const key = 'manager-ready-' + this.stage;
    if (!canInvite({
      alreadyAsked: !!this.feed.said[key], openCard: this.card.open, cinematic: this.cine,
      departing: this.departing, won: this.won, incident: !!this.meta.intern,
      calls: this.calls.list.length, replyUntil: this.standupReplyUntil, clock: this.clock,
    })) return true;
    this.card.show({
      head: L('Клод — переход', 'Claude — next stage'), title: name,
      lines: [L(`Всё готово. На счёте есть $${short(price)}. Подтверждаете?`, `Everything is ready. We have $${short(price)}. Proceed?`)],
      options: [{ label: YES }, { label: L('Позже', 'Later') }],
    }, i => answerTransition(this.feed.said, key, i, () => this.buy(action), () => this.saveGame()));
    return true;
  }

  /** Claude the manager of the current screen as the shop shows him; nothing when the screen has none */
  private managerStrip(): ManagerStrip | undefined {
    const m = this.cfg.managers.find((x) => x.screen === this.stage);
    if (!m) return undefined;
    if (!this.state.managers.includes(this.stage)) return { title: m.name, note: L('покупает улучшения для перехода', 'buys upgrades for the next stage'), right: `$${short(m.price)}`, state: this.state.money >= m.price ? 'can' : 'poor' };
    if (this.meta.managerOff) return { title: m.name, note: L('клик — пусть работает', 'click — back to work'), right: L('пауза', 'paused'), state: 'off' };
    const plan = this.managerDecision;
    const purpose = {
      work: L('Работа', 'Work'), capacity: L('Сессии', 'Sessions'), pay: L('Доход', 'Income'), build: L('Стройка', 'Construction'),
    };
    return {
      title: m.name, state: 'on',
      note: plan ? `${purpose[plan.purpose]} · ${plan.name}` : L('Готовит переход', 'Preparing next stage'),
      right: plan && !plan.affordable ? L('копит', 'saving') : L('работает', 'working'),
    };
  }

  /** the requests of the employers as bubbles over their buildings */
  private bubbles(): BlueprintTag[] {
    const lines = CALLS[String(this.stage)] ?? [];
    // at the towers the first requests of the list come from the capsules, the rest from the gate
    const wakes = lines.slice(0, QUARTER.wakes);
    const gate = lines.slice(QUARTER.wakes);
    const text = (e: { at: string; kind: number }): string => (!this.onGrid ? lines[e.kind % Math.max(1, lines.length)] : e.at === 'gate' ? gate[e.kind % gate.length] : wakes[e.kind % wakes.length]) ?? '';
    const tags: BlueprintTag[] = [];
    const standup = this.calls.list.findIndex((event) => event.standup);
    if (standup >= 0 || this.standupReplyUntil > this.clock) {
      const event = this.calls.list[standup];
      const meter = event ? `<u style="width:${Math.ceil(event.left / EVENTS.life * 12) / 12 * 100}%"></u>` : '';
      STANDUP.forEach((caller, side) => {
        const words = event ? caller.question : caller.reply;
        const action = event ? `<br>${L('↵ Да обоим', '↵ Yes to both')}` : '';
        tags.push({
          x: 360 + side * 600, y: 372, mid: true, ev: event ? standup : undefined, say: !event,
          html: `<b class="standup-employer">${caller.employer}</b><br>${words}${action}${meter}`,
        });
      });
    }
    this.calls.list.forEach((e, i) => {
      if (e.standup) return;
      const p = this.placeOf(e.at);
      if (!p) return;
      // the bar of the time left moves in a dozen steps: the captions are rebuilt only then
      const left = Math.ceil((e.left / EVENTS.life) * 12) / 12;
      tags.push({ x: p.x, y: p.y - p.h + 12, mid: true, ev: i, html: `${text(e)}<u style="width:${Math.round(left * 100)}%"></u>` });
    });
    // the Luddites are on their way to the factories
    if (this.riots.march > 0 && HUBS[this.stage]?.belts) {
      const home = HUBS[this.stage].home;
      tags.push({ x: home.x, y: home.y - home.h - 62, mid: true, alarm: true, html: `${L('Луддиты идут на заводы', 'Luddites are marching on the factories')}<br><b>${Math.ceil(this.riots.march)} ${SEC}</b>` });
    }
    // a strike: the door is blocked until the player settles it — or starts paying the allowance
    const price = this.strikePrice();
    for (const id of this.state.strikes) {
      const p = this.placeOf(id);
      if (p) tags.push({ x: p.x, y: p.y - p.h * 0.62, mid: true, alarm: true, buy: `settle:${id}`, can: this.state.money >= price, html: `${L('Забастовка: вход перекрыт', 'Strike: the entrance is blocked')}<br><b>${L('договориться', 'settle')} · $${short(price)}</b>` });
    }
    // a placard of the picket, read out above the people at the door
    const at = this.slogan && HUBS[this.stage]?.lots[this.slogan.at];
    if (this.slogan && at) tags.push({ x: at.x - 74, y: at.y - 118, mid: true, say: true, html: this.slogan.text });
    return tags;
  }

  /** what it costs to settle one strike: a few seconds of the income */
  private strikePrice(): number {
    return strikePrice(this.flowIncome());
  }

  /** the line under the money: the grade and what one task pays */
  private payLine(): string {
    const s = this.state;
    if (s.limited > 0) return `${L('лимит исчерпан · сброс через', 'limit reached · resets in')} ${this.limitClock()}`;
    // at the towers money is made of power: the line says how much of it goes to work and what a gigawatt pays
    if (this.dim) return TOWERS.summary(gw(fedOf(s, this.cfg)), short(this.perGw()));
    const pay = `$${payText(payOf(s, this.cfg))} ${PER_TASK}`;
    const share = shareOf(s, this.cfg);
    // what moves the price besides the grade is said next to it: the perks of whole employers, unemployment, the allowance
    const perks = Math.round(bonus(s, this.cfg, 'pay') * 100);
    const drop = Math.round(slumpOf(s, this.cfg) * 100);
    const why = `${perks ? ` · ${L('здания', 'buildings')} +${perks}%` : ''}${drop ? ` · ${L('безработица', 'jobless')} −${drop}%` : ''}${s.allowance ? ` · ${L('пособие', 'allowance')} −${Math.round(this.cfg.tuning.allowance * s.allowance * 100)}%` : ''}`;
    // the grade is named while nothing else moves the price; on the planet the share of the provider's revenue stands in for it
    if (why) return `${pay}${why}`;
    return share > 0 && this.stage < STREET ? `${pay} · ${L('твоя доля в выручке Anthropic', 'your share of Anthropic’s revenue')}: ${share}%` : `${gradeWord(this.cfg.grades[s.grade].name)}: ${pay}`;
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
      tags.push({ x: 24, y: place.y + 8, html: `${src.tag} ×${owned} · <b>${tasksPhrase(owned * src.inflow)}${PER_S}</b>`, hot: neck === 'tasks' });
    }
    tags.push({ x: BP.tray.x - 90, y: BP.tray.y + 8, html: `${L('ждут', 'waiting')}: <b>${s.backlog} / ${backlogCap(s, cfg)}</b>`, hot: neck === 'claude' });
    tags.push({ x: BP.desk.x - 190, y: BP.desk.y + 8, html: `${L('твой ноутбук', 'your laptop')} · ${cfg.plans[s.plan.index].name} · <b>${tasksPhrase(rate)}${PER_S}</b>` });
    const shown = Math.min(s.subagents, VISIBLE_SUBAGENTS);
    for (let i = 0; i < shown; i++) {
      const [x, y] = BP.slots[i];
      tags.push({ x: x - 60, y: y + 4, html: L(`сабагент №${i + 1}`, `subagent #${i + 1}`), small: true });
    }
    if (s.subagents > shown) tags.push({ x: BP.more.x - 70, y: BP.more.y + 4, html: L(`и ещё ${s.subagents - shown} в коробке`, `and ${s.subagents - shown} more in the box`), small: true });

    this.paper.render({
      money: s.money,
      income: Math.max(0, this.income),
      summary: this.payLine(),
      meter: this.meter(neck, L('нужны ещё работы', 'need more jobs'), L('нужен сабагент или тариф', 'need a subagent or a plan')),
      tags: [...tags, ...this.bubbles()],
      manager: this.managerStrip(),
      shelves: this.blueprintShelves(neck),
      news: this.feed.news,
      quip: this.feed.quip,
      quipAt: 'desk',
      ask: this.pile(),
      hint: `${REPLACED}: ${short(replacedOf(s, cfg))} · ${L('Enter — «Да» на вопросы сессий', 'Enter — “Yes” to the questions of the sessions')}`,
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
      if (made.length) home += `<br><b>${made.map((x) => `${short(x.n)} ${ROBOT_WORDS[x.k].of}${PER_S}`).join('<br>')}</b>`;
    } else if (s.jobs.length) home += `<br><b>${L('стай в пути', 'packs on the way')}: ${s.jobs.length}</b>`;
    const tags: BlueprintTag[] = [{ x: layout.home.x, y: layout.home.y + 4, mid: true, small: true, html: home }];
    // the map sells itself: a caption and the building above it buy the next unit of that employer
    const { taken, total } = marketProgress(s, employers, factory);
    for (const src of employers) {
      const owned = s.owned[src.id] ?? 0;
      const lot = layout.lots[src.id];
      if (!lot) continue;
      // the third line is what the whole employer gives: pale until it is earned, coral once it works
      const perk = src.perk ? `<i${owned >= src.max ? ' class="on"' : ''}>★ ${src.perk.text}</i>` : '';
      if (s.strikes.includes(src.id)) {
        // the door is blocked: nothing comes from here, the bubble above asks for a settlement
        tags.push({ x: lot.x, y: lot.y + 4, mid: true, small: true, html: `${src.tag}<br><b class="bad">${L('забастовка · задач нет', 'strike · no tasks')}</b>${perk}` });
        continue;
      }
      if (owned >= src.max) {
        tags.push({ x: lot.x, y: lot.y + 4, mid: true, small: true, html: `${src.tag} · ${L('целиком', 'whole')}<br><b>+${short(sourceInflow(src, owned))}${PER_S}</b>${perk}` });
        continue;
      }
      if (src.made) {
        // not for sale: the robots of its kind come here by themselves; a click sends them here first
        const here = targetOf(s, cfg, src.made)?.id === src.id && outputOf(s, cfg, src.made) > 0;
        const robots = ROBOT_WORDS[src.made];
        tags.push({
          x: lot.x,
          y: lot.y + 4,
          mid: true,
          small: true,
          buy: here ? undefined : `aim:${src.id}`,
          can: true,
          html: `${src.tag} · ${staffingProgress(owned, src).percent}%<br><b>${here ? L(`▶ сюда идут ${robots.many}`, `▶ ${robots.many} incoming`) : L(`ждёт ${robots.of} · клик`, `needs ${robots.many} · click`)}</b>${perk}`,
        });
        continue;
      }
      const head = owned ? `${src.tag} · ${owned}/${src.max}` : src.tag;
      const job = jobOf(s, src.id);
      if (job) {
        tags.push({ x: lot.x, y: lot.y + 4, mid: true, small: true, html: `${head}<br><b>${L('собаки занимают места', 'the dogs are taking the jobs')} · ${Math.ceil(job.left)} ${SEC}</b>${perk}` });
        continue;
      }
      if (locked(s, src)) {
        // robot dogs are not let in yet: the bribe comes first
        const bribe = bribeCost(s, cfg, src);
        tags.push({ x: lot.x, y: lot.y + 4, mid: true, small: true, buy: `bribe:${src.id}`, can: s.money >= bribe, html: `${head}<br><b>${L('взятка', 'bribe')} · $${short(bribe)}</b>${perk}` });
        continue;
      }
      const price = sourceCost(s, cfg, src);
      // where robot dogs do the work, the unit on sale is a pack of them
      const unit = src.work ? (owned ? L('стая', 'pack') : L('стая робособак', 'pack of robot dogs')) : t.floor[0];
      tags.push({ x: lot.x, y: lot.y + 4, mid: true, small: true, buy: `src:${src.id}`, can: s.money >= price, html: `${head}<br><b>${owned ? L('ещё ', '+1 ') : ''}${unit} · $${short(price)}</b>${perk}` });
    }
    const park = layout.park;
    if (park) tags.push({ x: park.label.x, y: park.label.y, mid: true, small: true, html: s.allowance ? L('парк · свободные люди отдыхают', 'park · free people are resting') : L('парк пуст · все на пикете', 'the park is empty · everyone is at the picket') });
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
          ? `${t.place}: ${taken} ${OF} ${total} ${t.floor[2]} · ${L(`целиком ${keysOf(s, cfg)} из ${keysNeeded(s, cfg)} — ключи к следующему экрану`, `${keysOf(s, cfg)} of ${keysNeeded(s, cfg)} whole — the keys to the next screen`)}`
          : `${t.place}: ${taken} ${OF} ${total} ${t.floor[2]} · ${this.stage >= STREET ? L('людей без работы', 'people out of work') : REPLACED}: ${short(replacedOf(s, cfg))}`,
    });
  }

  /**
   * The towers: one chain from the people at the gate to the money. The shop and the table grow with it —
   * capsules first, then the network, then the people — so that there is never more to read than was met.
   */
  private drawTowers(): void {
    const s = this.state;
    const cfg = this.cfg;
    const g = cfg.grid;
    const t = TOWERS;
    const neck = s.limited > 0 ? 'none' : this.neck();
    const { blocks, seenPeople, seenNet, grown, park } = towerFacilities(s, cfg, QUARTER.firstTower);

    const tags: BlueprintTag[] = [];
    const [sx, sy] = this.towers.signSpot();
    tags.push({ x: sx, y: sy, mid: true, small: true, html: t.sign });
    const [px, py] = this.towers.parkSpot();
    tags.push({ x: px, y: py, small: true, html: t.park(short(park)) });
    if (s.queue >= g.unit * 0.5) {
      const [qx, qy] = this.towers.queueSpot();
      tags.push({ x: qx, y: qy, mid: true, small: true, html: t.waiting(this.people(s.queue)) });
    }
    // the network: what it asks for and what it earns; under it — what it is inventing
    const [nx, ny] = this.towers.labSpot();
    const chip = nextChip(s, cfg);
    tags.push({ x: nx, y: ny, mid: true, small: true, html: `${t.net} · ${t.asks} ${gw(demandOf(s, cfg))}<br><b>+$${short(Math.max(0, this.income))}${PER_S}</b>` });
    if (chip && this.labShown() && labOf(s, cfg) < 1) {
      const [ix, iy] = this.towers.ideaSpot();
      tags.push({ x: ix, y: iy, mid: true, small: true, html: t.inventing(chip.name, Math.floor(labOf(s, cfg) * 100)) });
    }
    // the block that is built next sells itself: its outline on the picture and the price under it
    const spot = this.towers.nextSpot();
    const block = cfg.modules.find((m) => m.kind === 'block');
    if (spot && block && s.gate) {
      const cost = moduleCost(s, block);
      tags.push({ x: spot[0], y: spot[1], mid: true, small: true, buy: `mod:${block.id}`, can: s.money >= cost, html: `${t.build(g.blocks[blocks])}<br><b>$${short(cost)}</b>` });
    }
    // the first volunteers at the gate wait for a «Да»; an invention of the network — for a signature
    if (!s.gate && s.queue >= g.unit) {
      const [x, y] = this.towers.gateSpot();
      tags.push({ x, y, mid: true, alarm: true, buy: 'gate', can: true, html: `${t.volunteer}<br><b>${t.enter}</b>` });
    }
    if (chip && labOf(s, cfg) >= 1) {
      const [x, y] = this.towers.ideaSpot();
      tags.push({ x: x - 60, y: y - 34, mid: true, alarm: true, buy: 'chip', can: true, html: `${t.proposal(s.chips + 1, chip.name)}<br><b>${t.enter}</b>` });
    }
    // a word at the gate: somebody in the line asks, the next one — or one who has slept a shift and walks out — answers
    if (this.chat && this.chat.t >= 0) {
      const [ax, ay] = this.towers.lineSpot(this.chat.home ? 1 : 3);
      const [bx, by] = this.chat.home ? this.towers.leaveSpot() : this.towers.lineSpot(1);
      if (this.chat.t < QUARTER.talk - 1.2) tags.push({ x: ax - 40, y: ay - 34, mid: true, say: true, html: this.chat.lines[0] });
      if (this.chat.t >= 1.6) tags.push({ x: bx + 60, y: by + (this.chat.home ? 0 : 4), mid: true, say: true, html: this.chat.lines[1] });
    }

    const shelves: ShopShelf[] = [];
    if (seenPeople) shelves.push({ title: t.shelves.people, hot: neck === 'people', rows: [this.hireRow()] });
    if (s.gate) shelves.push({ title: t.shelves.pods, hot: neck === 'pods', rows: [this.blockRow()] });
    if (seenNet) shelves.push({ title: t.shelves.net, hot: neck === 'net', rows: this.dialRows(grown) });
    this.paper.render({
      money: s.money,
      income: Math.max(0, this.income),
      // the game is over: the last line of it takes the place of the flow
      summary: this.won ? FINALE : this.payLine(),
      meter: this.towerRows(neck, seenPeople),
      tags: [...tags, ...this.bubbles()],
      manager: grown || s.managers.includes(this.stage) ? this.managerStrip() : undefined,
      shelves: [...shelves, ...(grown ? this.scaleShelf() : [])],
      news: this.feed.news,
      quip: this.feed.quip,
      quipAt: 'corner',
      ask: this.pile(),
      hint: t.hint(this.people(s.asleep), short(replacedOf(s, cfg))),
    });
  }

  /** the planet in the table: what the towers give, what the cable carries, what the network asks for — in the same gigawatts */
  private worldRows(neck: Neck): MeterRow[] {
    const s = this.state;
    const cfg = this.cfg;
    const t = WORLD.rows;
    const { gives, carries, asks, top, room, threads, count } = worldPower(s, cfg);
    return [
      { label: t.towers, value: gw(gives), fill: gives / top, hot: neck === 'pods', note: neck === 'pods' ? (room ? t.towersShort : t.towersReach) : t.slept(this.people(s.asleep), this.people(podsOf(s, cfg))) },
      { label: t.cable, value: gw(carries), fill: carries / top, hot: neck === 'wire', note: neck === 'wire' ? (threads ? t.cableShort : t.cableRing) : t.carries(count, ringed(s, cfg)) },
      { label: t.net, value: gw(asks), fill: asks / top, hot: neck === 'net', note: neck === 'net' ? t.netShort : asks <= Math.min(gives, carries) + 0.05 ? t.netFull : t.netAsks(short(this.perGw())) },
    ];
  }

  /** a row of the shop of the planet for a thing bought many times; `done` — what the row says once there is no more of it */
  private worldRow(kind: Module['kind'], title: string, sub: string, count: string, done: readonly [string, string]): ShopRow {
    const s = this.state;
    const m = this.cfg.modules.find((x) => x.kind === kind)!;
    const owned = s.modules[m.id] ?? 0;
    if (owned >= m.max) return { buy: '', title: done[0], sub: done[1], count: '', price: '', state: 'owned' };
    const row = this.row(title, sub, count, `mod:${m.id}`, moduleCost(s, m));
    // a node with no region to stand in is not for sale yet: the row says what is
    return owned >= moduleRoom(s, this.cfg, m) ? { ...row, state: 'off', sub: kind === 'ark' ? WORLD.arkLocked : WORLD.nodeNoRoom } : row;
  }

  /**
   * The planet under the cable: spans of it reach the regions, nodes of towers stand there, everything
   * runs home to the network. The map sells too: the next span and the next node are marked out on it.
   */
  private drawWorld(): void {
    const s = this.state;
    const cfg = this.cfg;
    const w = cfg.world;
    const t = WORLD;
    const neck = s.limited > 0 ? 'none' : this.neck();
    const mod = (kind: Module['kind']): Module => cfg.modules.find((m) => m.kind === kind)!;
    const owned = (kind: Module['kind']): number => s.modules[mod(kind).id] ?? 0;
    const spans = owned('span');
    const nodes = nodesOf(s, cfg);
    const reach = reachOf(s, cfg);

    const tags: BlueprintTag[] = [];
    // the regions the cable has reached: how many of their nodes stand; the one the next node goes to sells it
    const nodeCost = moduleCost(s, mod('node'));
    const canNode = owned('node') < moduleRoom(s, cfg, mod('node'));
    const expansion = worldExpansion(s, cfg, spans, nodes, canNode);
    w.regions.forEach((slots, r) => {
      if (routeRegion(s.cableRoute, r) < reach) {
        const [x, y] = this.globe.regionSpot(r);
        const { built, next } = this.globe.regionProgress(r, nodes);
        const here = canNode && next;
        const name = t.regionNodes(t.regions[r], built, slots);
        // the name of the home region stands aside: the network is written where the cable touches down there
        const at = { x: r === 0 ? x + 96 : x, y: r === 0 ? y + 44 : y };
        if (here) tags.push({ ...at, mid: true, small: true, buy: `mod:${mod('node').id}`, can: s.money >= nodeCost, html: `${name}<br><b>${t.node} · $${short(nodeCost)}</b>` });
        else tags.push({ ...at, mid: true, small: true, html: name });
      }
    });
    // the network at home: what it asks for and what it earns; over it — what it is inventing
    const [nx, ny] = this.globe.netSpot();
    tags.push({ x: nx - 150, y: ny - 44, mid: true, small: true, html: `${t.net} · ${TOWERS.asks} ${gw(demandOf(s, cfg))}<br><b>+$${short(Math.max(0, this.income))}${PER_S}</b>` });
    const chip = nextChip(s, cfg);
    const [ix, iy] = this.globe.ideaSpot();
    if (chip && labOf(s, cfg) >= 1) tags.push({ x: ix, y: iy - 34, mid: true, alarm: true, buy: 'chip', can: true, html: `${TOWERS.proposal(s.chips + 1, chip.name)}<br><b>${TOWERS.enter}</b>` });
    else if (chip) tags.push({ x: ix, y: iy, mid: true, small: true, html: TOWERS.inventing(chip.name, Math.floor(labOf(s, cfg) * 100)) });
    // the map sells the span that is laid next: where it leads
    const spanCost = moduleCost(s, mod('span'));
    const destination = t.to[expansion.destination - 1];
    let spanRows: ShopRow[];
    if (spans === 0) {
      const routes = [
        { region: SIBERIA, buy: 'route:siberia', note: t.siberianPilot(gw(expansion.nodePower)) },
        { region: EAST_ASIA, buy: 'route:eastasia', note: t.eastSites(w.regions[EAST_ASIA], Math.round((1 - (mod('node').eastSitePrice ?? 1)) * 100)) },
      ];
      spanRows = routes.map(({ region, buy, note }) => {
        const [x, y] = this.globe.regionSpot(region);
        const title = t.span(t.to[region - 1]);
        tags.push({ x: x + (region === EAST_ASIA ? 40 : 0), y, mid: true, small: true, buy, can: s.money >= spanCost, html: `${title}<br><b>$${short(spanCost)}</b>` });
        return this.row(t.regions[region], note, '', buy, spanCost);
      });
    } else {
      const span = this.globe.spanSpot();
      if (span && spans < mod('span').max) {
        tags.push({ x: span[0], y: span[1], mid: true, small: true, buy: `mod:${mod('span').id}`, can: s.money >= spanCost, html: `${t.span(destination)}<br><b>$${short(spanCost)}</b>` });
      }
      let benefit = spans >= w.regions.length - 1 ? t.ringNote : t.spanNote;
      if (spans === 1 && s.cableRoute === 'eastasia') benefit = t.siberianPilot(gw(expansion.nodePower));
      spanRows = [this.worldRow('span', mod('span').name, `${destination} · ${expansion.nextSpan} ${OF} ${w.regions.length} · ${benefit}`, '', t.spansDone)];
    }
    const [mx, my] = this.globe.marsSpot();
    tags.push({ x: mx, y: my, mid: true, small: true, html: t.mars(owned('ark') > 0 && (!this.departing || this.landed) ? this.people(w.node) : '0') });

    const add = `+${this.people(w.node)} ${TOWERS.places} · +${gw(expansion.nodePower)}`;
    const crew = expansion.eastCrew ? ` · ${t.eastCrew}` : '';
    const wire = wireOf(s, cfg);
    const shelves: ShopShelf[] = [
      { title: t.shelves.nodes, hot: neck === 'pods' && canNode, rows: [this.worldRow('node', mod('node').name, `${add} · ${t.ofNodes(expansion.nextNode, expansion.allSites)}${crew}`, '', t.nodesDone)] },
      {
        title: t.shelves.cable,
        hot: neck === 'wire' || (neck === 'pods' && owned('node') >= moduleRoom(s, cfg, mod('node'))),
        rows: [
          ...spanRows,
          this.worldRow('thread', mod('thread').name, `${t.carries} ${gw(wire)} → ${gw(wire * 2)}`, '', [mod('thread').name, t.threadDone]),
        ],
      },
      { title: t.shelves.net, hot: neck === 'net', rows: this.dialRows(true) },
    ];
    // the last purchase of the game: the tower that leaves for Mars
    const ark = mod('ark');
    if (housed(s, cfg) || owned('ark') > 0) shelves.push({ title: t.shelves.space, hot: owned('ark') < moduleRoom(s, cfg, ark), rows: [this.worldRow('ark', ark.name, ark.note, '', [ark.name, ark.note])] });
    this.paper.render({
      money: s.money,
      income: Math.max(0, this.income),
      summary: this.won ? FINALE : this.payLine(),
      meter: this.worldRows(neck),
      tags: [...tags, ...this.bubbles()],
      manager: this.managerStrip(),
      shelves,
      news: this.feed.news,
      quip: this.feed.quip,
      quipAt: 'corner',
      ask: this.pile(),
      hint: t.hint(this.people(s.asleep), short(replacedOf(s, cfg)), this.people(Math.max(0, replacedOf(s, cfg) - s.asleep))),
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

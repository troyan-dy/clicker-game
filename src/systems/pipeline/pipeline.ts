/**
 * The core loop as a conveyor of tasks (M01 «Согласие», M02 sources, M03 plan, M05 «не спрашивай» and subagents,
 * M15 promotions, M16–M18 the scales — city, state, planet: employers taken unit by unit, farms as packs of sessions,
 * M23 perks of the employers taken whole, M24 the people left without work and the price of a task that
 * falls with unemployment, M25 the street: a factory makes robots that take the jobs, M26 packs of robot dogs let in by a bribe, M27 robots wear out and are broken in riots, robot police guards them,
 * M28 the towers: power in, money out — people come and stand in line at the gate, blocks of capsules take
 * them in, whoever sleeps there gives a hundred watts, and the neural network turns the power into money,
 * M32 the planet under the cable: spans of it reach the regions, nodes of the same towers stand there, the
 * cable carries only so much, and the last tower leaves for Mars):
 *
 *   sources ──► backlog ──► Claude (plan rate) ──► waiting for «Да» ──► $ per task
 *                  └──────► subagents: their own sessions, no «Да» needed ──► $
 *
 * Whatever is slowest is the bottleneck: the inflow of tasks, Claude, or the player.
 * Pure logic: no rendering, no clocks of its own; all numbers come from src/data.
 */
import { buyNextPlan, type Plan, type PlanState } from '../plan/plan';

/**
 * What an employer gives once it is taken whole (M23). «Plus» kinds add up: pay, inflow, rate,
 * sessions, calls, stack, legend, surge, squads, lines. «Off» kinds multiply what is left: farms, sources, grades, scale, limit.
 */
export type PerkKind =
  | 'pay'
  | 'inflow'
  | 'rate'
  | 'sessions'
  | 'calls'
  | 'stack'
  | 'legend'
  | 'surge'
  | 'squads'
  | 'lines'
  | 'farms'
  | 'sources'
  | 'grades'
  | 'scale'
  | 'limit';

/** a body Claude works in: the factory of the street makes them */
export type RobotKind = 'android' | 'robodog';
const ROBOTS: readonly RobotKind[] = ['android', 'robodog'];

export interface Perk {
  kind: PerkKind;
  /** a share: 0.1 is «+10%» or «10% off» */
  value: number;
  /** how the map says it: «серверы дешевле на 10%» */
  text: string;
}

export interface Source {
  id: string;
  name: string;
  /** short name for the caption on the blueprint */
  tag: string;
  note: string;
  /** tasks per second one unit brings */
  inflow: number;
  price: number;
  /** price multiplier per unit already bought */
  growth: number;
  /** units owned at the start */
  start: number;
  max: number;
  /** the screen it is sold from: 1 — the terminal, 2 — the blueprint, 3–5 — the city, the state, the planet */
  screen: number;
  /** inflow multiplier once every unit is bought: the employer is taken whole */
  full?: number;
  /** people one unit used to employ */
  staff?: number;
  /** what the employer gives once every unit is bought */
  perk?: Perk;
  /** seconds a pack of robot dogs needs to take the jobs of one unit: the pack is bought at once, the unit is taken later (M26) */
  work?: number;
  /** the price of the one-off bribe that lets the robot dogs in: no pack can be sent before it is paid (M26) */
  bribe?: number;
  /** the units are not bought at all: robots of this kind from the factory take the jobs one by one (M25) */
  made?: RobotKind;
}

/** A step of the career ladder: every closed task pays `mult` times the base. */
export interface Grade {
  id: string;
  name: string;
  mult: number;
  price: number;
  note: string;
}

/** Capacity sold on the big screens: one unit is a pack of Claude sessions. */
export interface Farm {
  id: string;
  name: string;
  /** short plural name for the caption on the map */
  tag: string;
  note: string;
  sessions: number;
  price: number;
  growth: number;
  /** the screen it is sold from: 3–5 */
  screen: number;
  /** how many can be bought at most; absent — no limit */
  max?: number;
  /** a shortage: every purchase multiplies the price by `step`, the surcharge halves every `halfLife` seconds */
  surge?: { step: number; halfLife: number };
  /** percent of the provider's revenue one unit adds (the planet) */
  share?: number;
}

/**
 * What the towers are built of and filled by (M28) and what the planet is girdled with (M32).
 * «block» — the next block of capsules: how many it holds is in the tuning, block by block; «hire» — one
 * more reason to come: `amount` more people a second; «span» — the cable reaches the next region (the
 * last one closes the ring); «node» — one more node of towers in a region the cable has reached;
 * «thread» — the cable carries twice as much; «ark» — the tower that leaves for Mars: the last purchase.
 */
export interface Module {
  id: string;
  name: string;
  /** short plural name for a caption */
  tag: string;
  note: string;
  kind: 'block' | 'hire' | 'span' | 'node' | 'thread' | 'ark';
  amount: number;
  price: number;
  growth: number;
  max: number;
  /** the screen it is sold on; absent — the screen of the towers */
  screen?: number;
}

/**
 * A dial of the neural network (M28): one step makes it ask for `draw` times more power and pay
 * `yield` times more for every gigawatt. There are only a few of them: this is all its scaling now.
 */
export interface NetParam {
  id: string;
  name: string;
  note: string;
  yield: number;
  draw: number;
  price: number;
  growth: number;
  max: number;
  /** the screen it is sold on; absent — the screen of the towers */
  screen?: number;
}

/**
 * Hardware the network invents for itself (M31): it is not sold — the power of the sleepers adds up to
 * `need` gigawatt-seconds, and the network brings the next generation to be signed with a «Да».
 */
export interface Chip {
  id: string;
  name: string;
  note: string;
  /** the screen it may be invented on */
  screen: number;
  need: number;
  /** every gigawatt pays this many times more; the network asks for `draw` times as much */
  yield: number;
  draw: number;
  /** it is not the power that brings this one: it comes when the whole planet sleeps */
  housed?: boolean;
}

/** The towers (M28). */
export interface GridTuning {
  /** the screen they stand on */
  screen: number;
  /** people one capsule of the picture stands for */
  unit: number;
  /** gigawatts one sleeper gives: a hundred watts */
  watt: number;
  /** gigawatts the old grid still gives, and what the network asks for before any of its dials is turned */
  old: number;
  appetite: number;
  /** capsules that stand before anything is bought: the pilot */
  pilot: number;
  /** capsules every block adds, in the order the blocks are built */
  blocks: number[];
  /** people who come every second by themselves */
  trickle: number;
  /** the line at the gate holds this many people: the rest wait in the park */
  line: number;
  /** people the gate lets in every second */
  admit: number;
}

/** The planet under the cable (M32). */
export interface WorldTuning {
  /** the screen it is seen on */
  screen: number;
  /** people a node of towers holds: as many as the whole quarter of the screen before */
  node: number;
  /** nodes every region has room for, in the order the cable reaches them; the first one is reached from the start */
  regions: number[];
  /** gigawatts the cable carries on one thread; every thread more and the closed ring double it */
  wire: number;
  /** people the nodes take in every second: by now the line stands everywhere */
  admit: number;
}

/** A pack of robot dogs on its way to the jobs of the employer `id` (M26): the unit is taken when `left` runs out. */
export interface Job {
  id: string;
  left: number;
  total: number;
}

/** A production line of the factory (M25): it makes robots of one kind, they take the jobs of the employers `made` of that kind. */
export interface Line {
  id: string;
  name: string;
  /** short plural name for the caption on the map */
  tag: string;
  note: string;
  kind: RobotKind;
  /** robots per second one line makes */
  rate: number;
  price: number;
  growth: number;
  screen: number;
  /** a shortage, as with the farms */
  surge?: { step: number; halfLife: number };
}

/** Robot police (M27): every unit takes a part off what a riot breaks. */
export interface Police {
  screen: number;
  name: string;
  note: string;
  price: number;
  growth: number;
  max: number;
  /** the part of a riot's damage one unit takes off: 0.3 leaves 70% */
  guard: number;
}

/** Claude the manager of one screen: a one-off hire. */
export interface Manager {
  screen: number;
  name: string;
  note: string;
  price: number;
}

/** A step up in scale: a one-off purchase that pulls the camera back to the next screen. */
export interface Scale {
  id: string;
  name: string;
  note: string;
  price: number;
  /** employers of the screen it is bought on that must be taken whole first: the keys to the next screen */
  needs?: number;
}

export interface AutoConfig {
  /** one-off: the player's own terminal stops asking */
  noAsk: { name: string; note: string; price: number };
  /** scalable: a session of its own; `share` — the part of the plan's speed it gets */
  subagent: { name: string; note: string; price: number; growth: number; share: number };
}

export interface PipeTuning {
  /** dollars per closed task */
  pay: number;
  /** tasks that can wait for Claude; the inflow pauses above this */
  backlogMax: number;
  /** …or this many seconds of inflow, whichever is more: the tray grows with the business */
  backlogSeconds: number;
  /** percent of the provider's revenue the player is on reaching the planet */
  shareBase: number;
  /** the share is counted once this many steps up in scale are bought */
  shareFrom: number;
  /** the people left without work (M24): the part of every task's pay one step of the allowance takes */
  allowance: number;
  /** …how many steps the allowance has above «none»; at the top step the price of a task does not fall at all */
  allowanceLevels: number;
  /** …the extra tasks they order at the top step, as a share of the inflow — when everybody is out of work */
  orders: number;
  /** …seconds for the orders to grow to full / to dry up without the allowance */
  ordersRise: number;
  ordersFade: number;
  /** the part of a task's price lost when everybody on the screen's market is out of work and no allowance is paid */
  slump: number;
  /** discounts of one kind never leave less than this part of a price, however many employers give them */
  discountFloor: number;
  /** the share of the working robots that breaks every second: the factory replaces them before it makes new ones (M27) */
  wear: number;
  /** finished tasks that can wait for a «Да»; Claude pauses above this */
  readyMax: number;
  /** «Да» that can be given in advance */
  buffer: number;
  startMoney: number;
}

export interface PipeConfig {
  tuning: PipeTuning;
  plans: readonly Plan[];
  sources: readonly Source[];
  grades: readonly Grade[];
  farms: readonly Farm[];
  /** in the order they are bought: the city, the state, the planet */
  scales: readonly Scale[];
  managers: readonly Manager[];
  lines: readonly Line[];
  police: Police;
  /** what the towers are built of and filled by, the dials of the network they feed, and their numbers */
  modules: readonly Module[];
  net: readonly NetParam[];
  /** generations of hardware the network invents, in order */
  chips: readonly Chip[];
  grid: GridTuning;
  world: WorldTuning;
  auto: AutoConfig;
}

export interface PipeState {
  money: number;
  backlog: number;
  ready: number;
  buffered: number;
  /** 0..1: how far Claude is into the task he is working on */
  think: number;
  plan: PlanState;
  /** units owned per source id */
  owned: Record<string, number>;
  noAsk: boolean;
  subagents: number;
  /** how many steps up in scale are bought */
  scale: number;
  /** units owned per farm id */
  farms: Record<string, number>;
  /** current price surcharge per farm id, 1 — none */
  surge: Record<string, number>;
  /** index in cfg.grades */
  grade: number;
  /** screens that have a manager */
  managers: number[];
  /** seconds until the usage limit resets; 0 — Claude works */
  limited: number;
  /** the step of the allowance the player pays to the people left without work: 0 — none */
  allowance: number;
  /** employers whose door is blocked by a strike: no tasks come from there */
  strikes: string[];
  /** 0..1: how much of their orders the people place now */
  orders: number;
  /** employers whose bribe is paid: robot dogs may work there instead of people */
  bribed: Record<string, boolean>;
  /** packs of robot dogs at work */
  jobs: Job[];
  /** production lines owned per line id */
  lines: Record<string, number>;
  /** the employer the robots of a kind go to first, by kind */
  aim: Record<string, string>;
  /** units of robot police bought */
  police: number;
  /** blocks of capsules and ways of hiring owned, per module id */
  modules: Record<string, number>;
  /** steps turned on every dial of the network, per dial id */
  net: Record<string, number>;
  /** people standing in line at the gate of the towers */
  queue: number;
  /** people asleep in the capsules: whoever lies down stays */
  asleep: number;
  /** the gate lets people in by itself: the first of them waits for a «Да» */
  gate: boolean;
  /** gigawatt-seconds the sleepers have given towards the next generation of hardware */
  lab: number;
  /** generations of hardware signed */
  chips: number;
  presses: number;
  wasted: number;
  /** tasks closed in the player's terminal / by subagents */
  closedHere: number;
  closedBySubagents: number;
  inflowAcc: number;
  subAcc: number;
}

export type PressResult = 'approved' | 'buffered' | 'wasted';

export function createPipe(cfg: PipeConfig): PipeState {
  const owned: Record<string, number> = {};
  for (const s of cfg.sources) owned[s.id] = s.start;
  return {
    money: cfg.tuning.startMoney,
    backlog: 1, // one task is already on the desk: the first «Да» is never far away
    ready: 0,
    buffered: 0,
    think: 0.6,
    plan: { index: 0 },
    owned,
    noAsk: false,
    subagents: 0,
    scale: 0,
    farms: {},
    surge: {},
    grade: 0,
    managers: [],
    limited: 0,
    allowance: 0,
    strikes: [],
    orders: 0,
    bribed: {},
    jobs: [],
    lines: {},
    aim: {},
    police: 0,
    modules: {},
    net: {},
    queue: 0,
    asleep: 0,
    gate: false,
    lab: 0,
    chips: 0,
    presses: 0,
    wasted: 0,
    closedHere: 0,
    closedBySubagents: 0,
    inflowAcc: 0,
    subAcc: 0,
  };
}

/** every unit of the employer is bought */
export function whole(s: PipeState, src: Source): boolean {
  return (s.owned[src.id] ?? 0) >= src.max;
}

/** the perks of one kind earned so far, added up: «+10%» and «+15%» give 0.25 */
export function bonus(s: PipeState, cfg: PipeConfig, kind: PerkKind): number {
  let sum = 0;
  for (const src of cfg.sources) if (src.perk?.kind === kind && whole(s, src)) sum += src.perk.value;
  return sum;
}

/**
 * What is left of a price or a wait after the perks of one kind: 10% and 20% off give 0.72, but never
 * less than the floor. The next step up in scale is made cheaper only by the employers of the screen
 * it is bought on; a wait (the usage limit) may go down to nothing.
 */
export function discount(s: PipeState, cfg: PipeConfig, kind: PerkKind): number {
  const here = kind === 'scale' ? screenOf(s) : 0;
  let left = 1;
  for (const src of cfg.sources) if (src.perk?.kind === kind && whole(s, src) && (!here || src.screen === here)) left *= 1 - src.perk.value;
  return Math.max(kind === 'limit' ? 0 : cfg.tuning.discountFloor, left);
}

/** tasks per second the employers bring, before the orders of the people */
export function workOf(s: PipeState, cfg: PipeConfig): number {
  let sum = 0;
  for (const src of cfg.sources) if (!s.strikes.includes(src.id)) sum += sourceInflow(src, s.owned[src.id] ?? 0);
  // at the towers the network does all the work, and does as much of it as it gets power for
  return sum * (1 + bonus(s, cfg, 'inflow')) * (gridOn(s, cfg) ? fedOf(s, cfg) / cfg.grid.old : 1);
}

/** tasks per second the people left without work order: they have the time, and the allowance; the more of them, the more orders */
export function ordersOf(s: PipeState, cfg: PipeConfig): number {
  return workOf(s, cfg) * cfg.tuning.orders * reliefOf(s, cfg) * s.orders * unemploymentOf(s, cfg);
}

/** tasks per second coming in: the employers and the orders of the people */
export function inflowOf(s: PipeState, cfg: PipeConfig): number {
  return workOf(s, cfg) + ordersOf(s, cfg);
}

/** tasks per second `owned` units of a source bring; an employer taken whole brings more */
export function sourceInflow(src: Source, owned: number): number {
  return owned * src.inflow * (owned >= src.max ? (src.full ?? 1) : 1);
}

/** people whose work the player does now; the first job is the player's own */
export function replacedOf(s: PipeState, cfg: PipeConfig): number {
  let n = 0;
  for (const src of cfg.sources) n += Math.max(0, (s.owned[src.id] ?? 0) - src.start) * (src.staff ?? 0);
  return n;
}

/** tasks per second the plan gives one session */
export function planRate(s: PipeState, cfg: PipeConfig): number {
  return cfg.plans[s.plan.index].rate * (1 + bonus(s, cfg, 'rate'));
}

/** tasks per second Claude prepares in the player's terminal right now: nothing while the usage limit is hit */
export function claudeRate(s: PipeState, cfg: PipeConfig): number {
  return s.limited > 0 ? 0 : planRate(s, cfg);
}

/** Claude sessions working besides the player's own: subagents and everything in the server farms */
export function sessionsOf(s: PipeState, cfg: PipeConfig): number {
  let farmed = 0;
  for (const f of cfg.farms) farmed += (s.farms[f.id] ?? 0) * f.sessions;
  return s.subagents + Math.round(farmed * (1 + bonus(s, cfg, 'sessions')));
}

/** tasks per second all those sessions close on their own */
export function subagentRate(s: PipeState, cfg: PipeConfig): number {
  return sessionsOf(s, cfg) * claudeRate(s, cfg) * cfg.auto.subagent.share;
}

/** how many tasks may wait for Claude right now */
export function backlogCap(s: PipeState, cfg: PipeConfig): number {
  return Math.max(cfg.tuning.backlogMax, Math.round(inflowOf(s, cfg) * cfg.tuning.backlogSeconds));
}

export function farmPrice(f: Farm, owned: number, surge = 1): number {
  return Math.round(f.price * f.growth ** owned * surge);
}

/** what the next unit of a farm costs now: the shortage and the perks included */
export function farmCost(s: PipeState, cfg: PipeConfig, f: Farm): number {
  return Math.round(farmPrice(f, s.farms[f.id] ?? 0, s.surge[f.id] ?? 1) * discount(s, cfg, 'farms'));
}

/** percent of the provider's revenue that comes from the player; counted from the planet on */
export function shareOf(s: PipeState, cfg: PipeConfig): number {
  if (s.scale < cfg.tuning.shareFrom) return 0;
  let share = cfg.tuning.shareBase;
  for (const f of cfg.farms) share += (f.share ?? 0) * (s.farms[f.id] ?? 0);
  return Math.min(100, share);
}

/**
 * The end of the game: the last screen is reached and everything on it is taken — every employer whole;
 * where the towers are the last thing, every capsule built and slept in; where the planet is — the tower
 * for Mars has left.
 */
export function finished(s: PipeState, cfg: PipeConfig): boolean {
  const last = 2 + cfg.scales.length;
  if (s.scale < cfg.scales.length || !cfg.sources.every((x) => x.screen !== last || whole(s, x))) return false;
  if (last >= cfg.world.screen) return ownedOf(s, cfg, 'ark') > 0;
  return last < cfg.grid.screen || housed(s, cfg);
}

/** the screen the player is on: 1 — the terminal, 2 — the blueprint, 3… — the scales */
export function screenOf(s: PipeState): number {
  return s.noAsk ? 2 + s.scale : 1;
}

export function sourcePrice(src: Source, owned: number): number {
  return Math.round(src.price * src.growth ** (owned - src.start));
}

/** what the next unit of an employer costs now: the perks included (they work on the big screens) */
export function sourceCost(s: PipeState, cfg: PipeConfig, src: Source): number {
  const base = sourcePrice(src, s.owned[src.id] ?? 0);
  return src.screen >= 3 ? Math.round(base * discount(s, cfg, 'sources')) : base;
}

/** what the next promotion costs now; Infinity — there is none */
export function gradeCost(s: PipeState, cfg: PipeConfig): number {
  const next = cfg.grades[s.grade + 1];
  return next ? Math.round(next.price * discount(s, cfg, 'grades')) : Infinity;
}

/** what the next step up in scale costs now; Infinity — there is none */
export function scaleCost(s: PipeState, cfg: PipeConfig): number {
  const next = cfg.scales[s.scale];
  return next ? Math.round(next.price * discount(s, cfg, 'scale')) : Infinity;
}

export function subagentPrice(cfg: PipeConfig, owned: number): number {
  return Math.round(cfg.auto.subagent.price * cfg.auto.subagent.growth ** owned);
}

/** the share of the people on the current screen's market whose work the player has taken: 0 — nobody, 1 — everybody */
export function unemploymentOf(s: PipeState, cfg: PipeConfig): number {
  const screen = screenOf(s);
  if (screen < 3) return 0;
  let all = 0;
  let out = 0;
  for (const src of cfg.sources) {
    if (src.screen !== screen || !src.staff) continue;
    all += src.max * src.staff;
    out += Math.max(0, (s.owned[src.id] ?? 0) - src.start) * src.staff;
  }
  return all > 0 ? Math.min(1, out / all) : 0;
}

/** how far the allowance goes: 0 — none is paid, 1 — the top step */
export function reliefOf(s: PipeState, cfg: PipeConfig): number {
  return Math.min(1, s.allowance / cfg.tuning.allowanceLevels);
}

/** the share of a task's price lost to the competition for the jobs that are left; every step of the allowance takes a part of it off */
export function slumpOf(s: PipeState, cfg: PipeConfig): number {
  return cfg.tuning.slump * unemploymentOf(s, cfg) * (1 - reliefOf(s, cfg));
}

/** dollars one closed task pays: the grade and the perks, less what unemployment and the allowance take */
export function payOf(s: PipeState, cfg: PipeConfig): number {
  const base = cfg.tuning.pay * cfg.grades[s.grade].mult * (1 + bonus(s, cfg, 'pay'));
  return base * (1 - slumpOf(s, cfg)) * (1 - cfg.tuning.allowance * s.allowance) * netYield(s, cfg);
}

/** employers of the current screen taken whole: the keys to the next one */
export function keysOf(s: PipeState, cfg: PipeConfig): number {
  const screen = screenOf(s);
  return cfg.sources.filter((x) => x.screen === screen && whole(s, x)).length;
}

/** how many of them the next step up in scale asks for */
export function keysNeeded(s: PipeState, cfg: PipeConfig): number {
  return cfg.scales[s.scale]?.needs ?? 0;
}

/** the pack of robot dogs at work at an employer, if there is one */
export function jobOf(s: PipeState, id: string): Job | undefined {
  return s.jobs.find((j) => j.id === id);
}

/** an employer that takes a bribe before robot dogs may work there, and has not been paid yet */
export function locked(s: PipeState, src: Source): boolean {
  return !!src.bribe && !s.bribed[src.id];
}

/** what the bribe of an employer costs now: the perks included */
export function bribeCost(s: PipeState, cfg: PipeConfig, src: Source): number {
  return Math.round((src.bribe ?? 0) * discount(s, cfg, 'sources'));
}

/** robots of a kind the factory makes every second */
export function outputOf(s: PipeState, cfg: PipeConfig, kind: RobotKind): number {
  let sum = 0;
  for (const l of cfg.lines) if (l.kind === kind) sum += (s.lines[l.id] ?? 0) * l.rate;
  return sum * (1 + bonus(s, cfg, 'lines'));
}

/** the employer the robots of a kind are taking now: the one they are aimed at, else the first one left in order */
export function targetOf(s: PipeState, cfg: PipeConfig, kind: RobotKind): Source | undefined {
  const aimed = cfg.sources.find((x) => x.id === s.aim[kind] && x.made === kind && !whole(s, x));
  return aimed ?? cfg.sources.find((x) => x.made === kind && !whole(s, x));
}

/** robots of a kind at work: the jobs of the `made` employers they have taken */
export function robotsOf(s: PipeState, cfg: PipeConfig, kind: RobotKind): number {
  let n = 0;
  for (const src of cfg.sources) if (src.made === kind) n += (s.owned[src.id] ?? 0) * (src.staff ?? 0);
  return n;
}

/** robots of a kind that break every second: the more of them work, the more the factory has to replace */
export function wearOf(s: PipeState, cfg: PipeConfig, kind: RobotKind): number {
  return robotsOf(s, cfg, kind) * cfg.tuning.wear;
}

/** the part of the working robots a riot breaks, after the robot police has taken its share off */
export function riotShare(s: PipeState, cfg: PipeConfig, share: number): number {
  return share * (1 - cfg.police.guard) ** s.police;
}

/** A riot reaches the factory: `share` of the robots at every employer is broken. Returns how many robots are lost. */
export function riot(s: PipeState, cfg: PipeConfig, share: number): number {
  let lost = 0;
  for (const src of cfg.sources) {
    if (!src.made || !src.staff) continue;
    const owned = s.owned[src.id] ?? 0;
    lost += owned * share * src.staff;
    s.owned[src.id] = owned * (1 - share);
  }
  return lost;
}

export function policeCost(s: PipeState, cfg: PipeConfig): number {
  return Math.round(cfg.police.price * cfg.police.growth ** s.police);
}

/** what the next line of that kind costs now: the shortage and the perks included */
export function lineCost(s: PipeState, cfg: PipeConfig, l: Line): number {
  return Math.round(l.price * l.growth ** (s.lines[l.id] ?? 0) * (s.surge[l.id] ?? 1) * discount(s, cfg, 'farms'));
}

/** the towers stand: from here on the game is power in, money out */
export function gridOn(s: PipeState, cfg: PipeConfig): boolean {
  return screenOf(s) >= cfg.grid.screen;
}

/** how many of something the towers are built of is owned, by kind */
function ownedOf(s: PipeState, cfg: PipeConfig, kind: Module['kind']): number {
  let n = 0;
  for (const m of cfg.modules) if (m.kind === kind) n += s.modules[m.id] ?? 0;
  return n;
}

/** blocks of capsules built */
export function blocksOf(s: PipeState, cfg: PipeConfig): number {
  return Math.min(cfg.grid.blocks.length, ownedOf(s, cfg, 'block'));
}

/** capsules that stand: the pilot and every block built */
export function capsulesOf(s: PipeState, cfg: PipeConfig): number {
  let n = cfg.grid.pilot;
  for (let i = blocksOf(s, cfg) - 1; i >= 0; i--) n += cfg.grid.blocks[i];
  return n;
}

/** the planet is girdled now: the cable goes from region to region */
export function worldOn(s: PipeState, cfg: PipeConfig): boolean {
  return screenOf(s) >= cfg.world.screen;
}

/** regions the cable has reached: the first one is home */
export function reachOf(s: PipeState, cfg: PipeConfig): number {
  return Math.min(cfg.world.regions.length, 1 + ownedOf(s, cfg, 'span'));
}

/** the last span is laid: the cable goes all the way round the planet */
export function ringed(s: PipeState, cfg: PipeConfig): boolean {
  return ownedOf(s, cfg, 'span') >= cfg.world.regions.length;
}

/** nodes of towers the regions reached so far have room for */
export function roomOf(s: PipeState, cfg: PipeConfig): number {
  let n = 0;
  for (let i = reachOf(s, cfg) - 1; i >= 0; i--) n += cfg.world.regions[i];
  return n;
}

/** nodes of towers that stand on the planet, besides the first quarter */
export function nodesOf(s: PipeState, cfg: PipeConfig): number {
  return Math.min(roomOf(s, cfg), ownedOf(s, cfg, 'node'));
}

/** places to sleep in, in people: the capsules of the first quarter and every node on the planet */
export function podsOf(s: PipeState, cfg: PipeConfig): number {
  return capsulesOf(s, cfg) * cfg.grid.unit + nodesOf(s, cfg) * cfg.world.node;
}

/** the first quarter is built and somebody sleeps in every capsule of it: the key to the planet */
export function quartered(s: PipeState, cfg: PipeConfig): boolean {
  return blocksOf(s, cfg) >= cfg.grid.blocks.length && s.asleep >= capsulesOf(s, cfg) * cfg.grid.unit * 0.999;
}

/** gigawatts the cable can carry to the network; before the planet nothing stands between the towers and it */
export function wireOf(s: PipeState, cfg: PipeConfig): number {
  if (!worldOn(s, cfg)) return Infinity;
  return cfg.world.wire * 2 ** ownedOf(s, cfg, 'thread') * (ringed(s, cfg) ? 2 : 1);
}

/** people who come to the gate every second: by themselves, and for every reason they were given */
export function hireOf(s: PipeState, cfg: PipeConfig): number {
  let n = cfg.grid.trickle;
  for (const m of cfg.modules) if (m.kind === 'hire') n += (s.modules[m.id] ?? 0) * m.amount;
  return n;
}

/** everything is built and somebody sleeps everywhere: the quarter, and — once the planet is reached — every node of every region */
export function housed(s: PipeState, cfg: PipeConfig): boolean {
  if (!quartered(s, cfg)) return false;
  if (2 + cfg.scales.length < cfg.world.screen) return true;
  const all = cfg.world.regions.reduce((n, x) => n + x, 0);
  return worldOn(s, cfg) && ownedOf(s, cfg, 'node') >= all && s.asleep >= podsOf(s, cfg) * 0.999;
}

/** gigawatts the network gets: what the old grid still gives and what the sleepers add */
export function supplyOf(s: PipeState, cfg: PipeConfig): number {
  return cfg.grid.old + s.asleep * cfg.grid.watt;
}

/** the generations of hardware the network runs on */
function chipsOf(s: PipeState, cfg: PipeConfig): readonly Chip[] {
  return cfg.chips.slice(0, s.chips);
}

/** how many times more a gigawatt pays for the dials and the hardware; 1 before the towers */
export function netYield(s: PipeState, cfg: PipeConfig): number {
  if (!gridOn(s, cfg)) return 1;
  let k = 1;
  for (const p of cfg.net) k *= p.yield ** (s.net[p.id] ?? 0);
  for (const c of chipsOf(s, cfg)) k *= c.yield;
  return k;
}

/** gigawatts the network asks for with its dials where they are */
export function demandOf(s: PipeState, cfg: PipeConfig): number {
  let k = cfg.grid.appetite;
  for (const p of cfg.net) k *= p.draw ** (s.net[p.id] ?? 0);
  for (const c of chipsOf(s, cfg)) k *= c.draw;
  return k;
}

/** gigawatts that go to work: the network eats no more than it asks for, and no more than the cable brings it */
export function fedOf(s: PipeState, cfg: PipeConfig): number {
  return Math.min(supplyOf(s, cfg), demandOf(s, cfg), wireOf(s, cfg));
}

/** people the network still has power to ask for: asleep, they would feed it full */
export function wantedOf(s: PipeState, cfg: PipeConfig): number {
  return Math.max(0, demandOf(s, cfg) - cfg.grid.old) / cfg.grid.watt;
}

/** the generation of hardware the network is inventing now; nothing — there is none left for this screen */
export function nextChip(s: PipeState, cfg: PipeConfig): Chip | undefined {
  const c = cfg.chips[s.chips];
  return c && c.screen <= screenOf(s) ? c : undefined;
}

/** 0..1: how far the network is with its next invention; 1 — it waits for a «Да». The last one comes with the last sleeper. */
export function labOf(s: PipeState, cfg: PipeConfig): number {
  const c = nextChip(s, cfg);
  if (!c) return 0;
  if (!c.housed) return Math.min(1, s.lab / c.need);
  if (housed(s, cfg)) return 1;
  const all = cfg.grid.pilot + cfg.grid.blocks.reduce((n, x) => n + x, 0);
  const people = all * cfg.grid.unit + cfg.world.regions.reduce((n, x) => n + x, 0) * cfg.world.node;
  return Math.min(0.99, s.asleep / people);
}

/** The «Да» under an invention: the network runs on the next generation of hardware from now on. */
export function takeChip(s: PipeState, cfg: PipeConfig): Chip | undefined {
  const c = nextChip(s, cfg);
  if (!c || labOf(s, cfg) < 1) return undefined;
  if (!c.housed) s.lab -= c.need;
  s.chips++;
  return c;
}

/** tasks per second that are actually closed at full flow: before the towers — what the sessions manage, at them — everything that comes in */
export function flowOf(s: PipeState, cfg: PipeConfig): number {
  const inflow = inflowOf(s, cfg);
  return gridOn(s, cfg) ? inflow : Math.min(inflow, planRate(s, cfg) * (1 + cfg.auto.subagent.share * sessionsOf(s, cfg)));
}

export function moduleCost(s: PipeState, m: Module): number {
  return Math.round(m.price * m.growth ** (s.modules[m.id] ?? 0));
}

/** what the next step of a dial of the network costs now */
export function netCost(s: PipeState, p: NetParam): number {
  return Math.round(p.price * p.growth ** (s.net[p.id] ?? 0));
}

/** how many of a thing the towers and the planet are built of can be owned right now: a node needs a region the cable has reached, the tower for Mars — a planet that sleeps and a network that has invented everything */
export function moduleRoom(s: PipeState, cfg: PipeConfig, m: Module): number {
  if ((m.screen ?? cfg.grid.screen) > screenOf(s)) return 0;
  if (m.kind === 'block') return Math.min(m.max, cfg.grid.blocks.length);
  if (m.kind === 'span') return Math.min(m.max, cfg.world.regions.length);
  if (m.kind === 'node') return Math.min(m.max, roomOf(s, cfg));
  if (m.kind === 'ark') return housed(s, cfg) && s.chips >= cfg.chips.length ? m.max : 0;
  return m.max;
}

/** One more block of capsules or reason for people to come; on the planet — a span of the cable, a node of towers, a thread, the tower for Mars. */
export function buyModule(s: PipeState, cfg: PipeConfig, id: string): boolean {
  const m = cfg.modules.find((x) => x.id === id);
  if (!m || !gridOn(s, cfg)) return false;
  const owned = s.modules[id] ?? 0;
  if (owned >= moduleRoom(s, cfg, m) || !spend(s, moduleCost(s, m))) return false;
  s.modules[id] = owned + 1;
  return true;
}

/** One more step of a dial of the network: it asks for more and pays more. */
export function buyNet(s: PipeState, cfg: PipeConfig, id: string): boolean {
  const p = cfg.net.find((x) => x.id === id);
  if (!p || (p.screen ?? cfg.grid.screen) > screenOf(s)) return false;
  const level = s.net[id] ?? 0;
  if (level >= p.max || !spend(s, netCost(s, p))) return false;
  s.net[id] = level + 1;
  return true;
}

/**
 * The towers for dt seconds. People come to the gate and stand in line while there is room in it; the
 * gate lets them in while there are free capsules; whoever lies down stays. What they give adds up
 * towards the next invention of the network. Returns how many came and how many lay down.
 */
function stepGrid(s: PipeState, cfg: PipeConfig, dt: number): { came: number; into: number } {
  const g = cfg.grid;
  const came = Math.max(0, Math.min(hireOf(s, cfg) * dt, g.line - s.queue));
  s.queue += came;
  const free = podsOf(s, cfg) - s.asleep;
  let into: number;
  if (worldOn(s, cfg)) {
    // on the planet the line stands at every node: each one that has room fills by itself, all of them at once
    into = Math.max(0, Math.min(free, cfg.world.admit * dt * Math.ceil(free / cfg.world.node)));
  } else {
    into = s.gate ? Math.max(0, Math.min(s.queue, free, g.admit * dt)) : 0;
    s.queue -= into;
  }
  s.asleep += into;
  const chip = nextChip(s, cfg);
  if (chip && !chip.housed) s.lab += s.asleep * g.watt * dt;
  return { came, into };
}

function pay(s: PipeState, cfg: PipeConfig, bySubagent: boolean, tasks = 1): void {
  s.money += payOf(s, cfg) * tasks;
  if (bySubagent) s.closedBySubagents += tasks;
  else s.closedHere += tasks;
}

/**
 * Advances the conveyor by dt seconds. Returns how many tasks arrived and how many were closed without
 * a key press; at the towers — also how many people came to the gate and how many lay down in the capsules.
 */
export function stepPipe(
  s: PipeState,
  cfg: PipeConfig,
  dt: number,
): { arrived: number; here: number; subagents: number; done: string[]; came: number; lay: number } {
  const t = cfg.tuning;
  /** `done` — employers where a unit was just taken by a squad, or that the robots have just taken whole */
  const out = { arrived: 0, here: 0, subagents: 0, done: [] as string[], came: 0, lay: 0 };

  if (s.limited > 0) s.limited = Math.max(0, s.limited - dt);

  // shortages ease off
  const calm = 1 + bonus(s, cfg, 'surge');
  for (const f of cfg.farms) {
    const m = s.surge[f.id];
    if (f.surge && m > 1) s.surge[f.id] = 1 + (m - 1) * 0.5 ** ((dt * calm) / f.surge.halfLife);
  }
  for (const l of cfg.lines) {
    const m = s.surge[l.id];
    if (l.surge && m > 1) s.surge[l.id] = 1 + (m - 1) * 0.5 ** ((dt * calm) / l.surge.halfLife);
  }

  // packs of robot dogs at work: the unit is taken when the time is up
  for (let i = s.jobs.length - 1; i >= 0; i--) {
    const job = s.jobs[i];
    job.left -= dt;
    if (job.left > 0) continue;
    s.jobs.splice(i, 1);
    const src = cfg.sources.find((x) => x.id === job.id);
    const owned = s.owned[job.id] ?? 0;
    if (!src || owned >= src.max) continue; // nothing is left to take there
    s.owned[job.id] = owned + 1;
    out.done.push(job.id);
  }

  // the factory. Working robots wear out everywhere; what the lines make goes first to the employers that
  // were whole (to keep them so), then to the one the robots are aimed at, then to the others in order.
  // When the lines make less than breaks, the robots at work dwindle — the whole employers last of all.
  for (const kind of ROBOTS) {
    let robots = outputOf(s, cfg, kind) * dt;
    const wasWhole: Record<string, boolean> = {};
    for (const src of cfg.sources) {
      if (src.made !== kind) continue;
      const owned = s.owned[src.id] ?? 0;
      wasWhole[src.id] = owned >= src.max;
      if (owned > 0) s.owned[src.id] = owned * (1 - t.wear * dt);
    }
    for (let pass = 0; pass < 3 && robots > 0; pass++) {
      for (const src of cfg.sources) {
        if (src.made !== kind || !src.staff) continue;
        const turn = wasWhole[src.id] ? 0 : src.id === s.aim[kind] ? 1 : 2;
        if (turn !== pass) continue;
        const owned = s.owned[src.id] ?? 0;
        if (owned >= src.max) continue;
        const units = Math.min(src.max - owned, robots / src.staff);
        robots -= units * src.staff;
        const now = owned + units >= src.max - 1e-9 ? src.max : owned + units;
        s.owned[src.id] = now;
        if (now >= src.max && !wasWhole[src.id]) out.done.push(src.id);
        if (robots <= 0) break;
      }
    }
  }

  // the towers: no backlog and nobody to ask — the network turns whatever power it gets into money
  if (gridOn(s, cfg)) {
    const moved = stepGrid(s, cfg, dt);
    out.came = moved.came;
    out.lay = moved.into;
    const tasks = s.limited > 0 ? 0 : inflowOf(s, cfg) * dt;
    pay(s, cfg, true, tasks);
    s.backlog = 0;
    s.subAcc += tasks;
    out.subagents = Math.floor(s.subAcc);
    s.subAcc -= out.subagents;
    return out;
  }

  // the people left without work order tasks while the allowance is paid; without it the orders dry up
  if (s.allowance > 0) s.orders = Math.min(1, s.orders + dt / t.ordersRise);
  else s.orders = Math.max(0, s.orders - dt / t.ordersFade);
  // …and nobody who is paid stands in a doorway
  if (s.allowance > 0 && s.strikes.length) s.strikes = [];

  // tasks arrive
  const cap = backlogCap(s, cfg);
  s.inflowAcc += inflowOf(s, cfg) * dt;
  out.arrived = Math.max(0, Math.min(Math.floor(s.inflowAcc), cap - s.backlog));
  s.inflowAcc -= out.arrived;
  s.backlog += out.arrived;
  if (s.backlog >= cap) s.inflowAcc = Math.min(s.inflowAcc, 1); // the boss waits

  // Claude in the player's terminal
  const rate = claudeRate(s, cfg);
  if (s.backlog < 1) {
    s.think = 0; // nothing to work on
  } else if (s.noAsk) {
    s.think += rate * dt;
    const n = Math.min(Math.floor(s.think), s.backlog);
    s.think -= n;
    s.backlog -= n;
    pay(s, cfg, false, n);
    out.here += n;
    if (s.backlog < 1) s.think = 0;
  } else {
    if (s.ready < t.readyMax) s.think += rate * dt;
    while (s.think >= 1 && s.backlog >= 1 && s.ready < t.readyMax) {
      s.think--;
      s.backlog--;
      s.ready++;
    }
    if (s.ready >= t.readyMax) s.think = Math.min(s.think, 1); // Claude waits for a «Да»
  }

  // «Да» given in advance
  while (s.buffered > 0 && s.ready > 0) {
    s.buffered--;
    s.ready--;
    pay(s, cfg, false);
    out.here++;
  }

  // subagents: sessions of their own, straight from the backlog
  s.subAcc += subagentRate(s, cfg) * dt;
  out.subagents = Math.min(Math.floor(s.subAcc), s.backlog);
  s.subAcc -= out.subagents;
  s.backlog -= out.subagents;
  pay(s, cfg, true, out.subagents);
  if (s.backlog < 1) s.subAcc = Math.min(s.subAcc, 1);

  return out;
}

/** One «Да». Once the terminal stops asking, a press nudges Claude: it closes a waiting task at once. */
export function pressPipe(s: PipeState, cfg: PipeConfig): PressResult {
  s.presses++;
  // at the towers nothing waits for a «Да» but the first volunteer at the gate: after him it opens by itself;
  // a press is one more task for the network, and it is never wasted
  if (gridOn(s, cfg)) {
    if (s.queue >= 1) s.gate = true;
    pay(s, cfg, false);
    return 'approved';
  }
  if (s.noAsk) {
    if (s.backlog >= 1) {
      s.backlog--;
      pay(s, cfg, false);
      return 'approved';
    }
    s.wasted++;
    return 'wasted';
  }
  if (s.ready > 0) {
    s.ready--;
    pay(s, cfg, false);
    return 'approved';
  }
  if (s.buffered < cfg.tuning.buffer) {
    s.buffered++;
    return 'buffered';
  }
  s.wasted++;
  return 'wasted';
}

function spend(s: PipeState, price: number): boolean {
  if (s.money < price) return false;
  s.money -= price;
  return true;
}

export function buySource(s: PipeState, cfg: PipeConfig, id: string): boolean {
  const src = cfg.sources.find((x) => x.id === id);
  if (!src) return false;
  const owned = s.owned[id] ?? 0;
  if (src.made || owned >= src.max) return false; // the jobs of a `made` employer are taken by robots, not bought
  if (!src.work) {
    if (!spend(s, sourceCost(s, cfg, src))) return false;
    s.owned[id] = owned + 1;
    return true;
  }
  // a pack of robot dogs is bought and runs there: the unit is taken when the pack has taken the jobs; one pack at a time
  if (locked(s, src) || jobOf(s, id) || !spend(s, sourceCost(s, cfg, src))) return false;
  const total = src.work / (1 + bonus(s, cfg, 'squads'));
  s.jobs.push({ id, left: total, total });
  return true;
}

/** The bribe of an employer: from now on robot dogs may work there instead of people. */
export function buyBribe(s: PipeState, cfg: PipeConfig, id: string): boolean {
  const src = cfg.sources.find((x) => x.id === id);
  if (!src || !locked(s, src) || !spend(s, bribeCost(s, cfg, src))) return false;
  s.bribed[id] = true;
  return true;
}

/** One more production line of the factory. */
export function buyLine(s: PipeState, cfg: PipeConfig, id: string): boolean {
  const l = cfg.lines.find((x) => x.id === id);
  if (!l || !spend(s, lineCost(s, cfg, l))) return false;
  s.lines[id] = (s.lines[id] ?? 0) + 1;
  if (l.surge) s.surge[id] = (s.surge[id] ?? 1) * l.surge.step;
  return true;
}

/** One more unit of robot police at the factory. */
export function buyPolice(s: PipeState, cfg: PipeConfig): boolean {
  if (s.police >= cfg.police.max || !spend(s, policeCost(s, cfg))) return false;
  s.police++;
  return true;
}

/** The robots of its kind go to this employer first. False — it is not theirs to take, or it is taken already. */
export function aimAt(s: PipeState, cfg: PipeConfig, id: string): boolean {
  const src = cfg.sources.find((x) => x.id === id);
  if (!src?.made || whole(s, src)) return false;
  s.aim[src.made] = id;
  return true;
}

export function buyPlan(s: PipeState, cfg: PipeConfig): boolean {
  const paid = buyNextPlan(cfg.plans, s.plan, s.money);
  if (!paid) return false;
  s.money -= paid;
  return true;
}

export function buyNoAsk(s: PipeState, cfg: PipeConfig): boolean {
  if (s.noAsk || !spend(s, cfg.auto.noAsk.price)) return false;
  s.noAsk = true;
  // everything that was waiting for a «Да» is approved on the spot
  for (; s.ready > 0; s.ready--) pay(s, cfg, false);
  s.buffered = 0;
  return true;
}

export function buyFarm(s: PipeState, cfg: PipeConfig, id: string): boolean {
  const f = cfg.farms.find((x) => x.id === id);
  if (!f) return false;
  const owned = s.farms[id] ?? 0;
  if (owned >= (f.max ?? Infinity) || !spend(s, farmCost(s, cfg, f))) return false;
  s.farms[id] = owned + 1;
  if (f.surge) s.surge[id] = (s.surge[id] ?? 1) * f.surge.step;
  return true;
}

/** the next screen may be opened: its keys are there — employers taken whole, or the first quarter of the towers built and slept in */
export function scaleReady(s: PipeState, cfg: PipeConfig): boolean {
  return keysOf(s, cfg) >= keysNeeded(s, cfg) && (screenOf(s) !== cfg.grid.screen || quartered(s, cfg));
}

/** The next step up in scale; the first one needs a terminal that agrees by itself. */
export function buyScale(s: PipeState, cfg: PipeConfig): boolean {
  if (!cfg.scales[s.scale] || !s.noAsk || !scaleReady(s, cfg) || !spend(s, scaleCost(s, cfg))) return false;
  s.scale++;
  return true;
}

/** Hires Claude as the manager of `screen`. */
export function buyManager(s: PipeState, cfg: PipeConfig, screen: number): boolean {
  const m = cfg.managers.find((x) => x.screen === screen);
  if (!m || s.managers.includes(screen) || !spend(s, m.price)) return false;
  s.managers.push(screen);
  return true;
}

/** A promotion: the next grade, bought in order. */
export function buyGrade(s: PipeState, cfg: PipeConfig): boolean {
  if (!cfg.grades[s.grade + 1] || !spend(s, gradeCost(s, cfg))) return false;
  s.grade++;
  return true;
}

export function buySubagent(s: PipeState, cfg: PipeConfig): boolean {
  if (!spend(s, subagentPrice(cfg, s.subagents))) return false;
  s.subagents++;
  return true;
}

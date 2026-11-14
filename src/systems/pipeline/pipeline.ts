/**
 * The core loop as a conveyor of tasks (M01 «Согласие», M02 sources, M03 plan, M05 «не спрашивай» and subagents,
 * M15 promotions, M16–M18 the scales — city, state, planet: employers taken unit by unit, farms as packs of sessions,
 * M23 perks of the employers taken whole, M24 the people left without work, M25 the street):
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
 * sessions, calls, stack, surge. «Off» kinds multiply what is left: farms, sources, grades, scale, limit.
 */
export type PerkKind = 'pay' | 'inflow' | 'rate' | 'sessions' | 'calls' | 'stack' | 'surge' | 'farms' | 'sources' | 'grades' | 'scale' | 'limit';

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
  /** the people left without work (M24): the part of every task's pay the allowance takes */
  allowance: number;
  /** …the extra tasks they order while it is paid, as a share of the inflow */
  orders: number;
  /** …seconds for the orders to grow to full / to dry up without the allowance */
  ordersRise: number;
  ordersFade: number;
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
  /** the player pays an allowance to the people left without work */
  allowance: boolean;
  /** 0..1: how much of their orders the people place now */
  orders: number;
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
    allowance: false,
    orders: 0,
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

/** what is left of a price or a wait after the perks of one kind: 10% and 20% off give 0.72 */
export function discount(s: PipeState, cfg: PipeConfig, kind: PerkKind): number {
  let left = 1;
  for (const src of cfg.sources) if (src.perk?.kind === kind && whole(s, src)) left *= 1 - src.perk.value;
  return Math.max(0, left);
}

/** tasks per second the employers bring, before the orders of the people */
export function workOf(s: PipeState, cfg: PipeConfig): number {
  let sum = 0;
  for (const src of cfg.sources) sum += sourceInflow(src, s.owned[src.id] ?? 0);
  return sum * (1 + bonus(s, cfg, 'inflow'));
}

/** tasks per second the people left without work order: they have the time, and the allowance */
export function ordersOf(s: PipeState, cfg: PipeConfig): number {
  return workOf(s, cfg) * cfg.tuning.orders * s.orders;
}

/** tasks per second coming in: the employers and the orders of the people */
export function inflowOf(s: PipeState, cfg: PipeConfig): number {
  return workOf(s, cfg) * (1 + cfg.tuning.orders * s.orders);
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

/** the end of the game: the last screen is reached and every employer on it is taken whole */
export function finished(s: PipeState, cfg: PipeConfig): boolean {
  const last = 2 + cfg.scales.length;
  return s.scale >= cfg.scales.length && cfg.sources.every((x) => x.screen !== last || whole(s, x));
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

/** dollars one closed task pays: the grade, the perks, less the allowance if it is paid */
export function payOf(s: PipeState, cfg: PipeConfig): number {
  return cfg.tuning.pay * cfg.grades[s.grade].mult * (1 + bonus(s, cfg, 'pay')) * (s.allowance ? 1 - cfg.tuning.allowance : 1);
}

function pay(s: PipeState, cfg: PipeConfig, bySubagent: boolean, tasks = 1): void {
  s.money += payOf(s, cfg) * tasks;
  if (bySubagent) s.closedBySubagents += tasks;
  else s.closedHere += tasks;
}

/** Advances the conveyor by dt seconds. Returns how many tasks arrived and how many were closed without a key press. */
export function stepPipe(
  s: PipeState,
  cfg: PipeConfig,
  dt: number,
): { arrived: number; here: number; subagents: number } {
  const t = cfg.tuning;
  const out = { arrived: 0, here: 0, subagents: 0 };

  if (s.limited > 0) s.limited = Math.max(0, s.limited - dt);

  // shortages ease off
  const calm = 1 + bonus(s, cfg, 'surge');
  for (const f of cfg.farms) {
    const m = s.surge[f.id];
    if (f.surge && m > 1) s.surge[f.id] = 1 + (m - 1) * 0.5 ** ((dt * calm) / f.surge.halfLife);
  }

  // the people left without work order tasks while the allowance is paid; without it the orders dry up
  if (s.allowance) s.orders = Math.min(1, s.orders + dt / t.ordersRise);
  else s.orders = Math.max(0, s.orders - dt / t.ordersFade);

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
  if (owned >= src.max || !spend(s, sourceCost(s, cfg, src))) return false;
  s.owned[id] = owned + 1;
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

/** The next step up in scale; the first one needs a terminal that agrees by itself. */
export function buyScale(s: PipeState, cfg: PipeConfig): boolean {
  if (!cfg.scales[s.scale] || !s.noAsk || !spend(s, scaleCost(s, cfg))) return false;
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

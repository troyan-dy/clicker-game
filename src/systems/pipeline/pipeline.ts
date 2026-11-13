/**
 * The core loop as a conveyor of tasks (M01 «Согласие», M02 sources, M03 plan, M05 «не спрашивай» and subagents,
 * M15 promotions):
 *
 *   sources ──► backlog ──► Claude (plan rate) ──► waiting for «Да» ──► $ per task
 *                  └──────► subagents: their own sessions, no «Да» needed ──► $
 *
 * Whatever is slowest is the bottleneck: the inflow of tasks, Claude, or the player.
 * Pure logic: no rendering, no clocks of its own; all numbers come from src/data.
 */
import { buyNextPlan, type Plan, type PlanState } from '../plan/plan';

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
  /** the screen it is sold from: 1 — the terminal, 2 — the blueprint */
  screen: number;
}

/** A step of the career ladder: every closed task pays `mult` times the base. */
export interface Grade {
  id: string;
  name: string;
  mult: number;
  price: number;
  note: string;
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
  /** index in cfg.grades */
  grade: number;
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
    grade: 0,
    presses: 0,
    wasted: 0,
    closedHere: 0,
    closedBySubagents: 0,
    inflowAcc: 0,
    subAcc: 0,
  };
}

/** tasks per second coming in from all sources */
export function inflowOf(s: PipeState, cfg: PipeConfig): number {
  let sum = 0;
  for (const src of cfg.sources) sum += (s.owned[src.id] ?? 0) * src.inflow;
  return sum;
}

/** tasks per second Claude prepares in the player's terminal */
export function claudeRate(s: PipeState, cfg: PipeConfig): number {
  return cfg.plans[s.plan.index].rate;
}

/** tasks per second all subagent sessions close on their own */
export function subagentRate(s: PipeState, cfg: PipeConfig): number {
  return s.subagents * claudeRate(s, cfg) * cfg.auto.subagent.share;
}

export function sourcePrice(src: Source, owned: number): number {
  return Math.round(src.price * src.growth ** (owned - src.start));
}

export function subagentPrice(cfg: PipeConfig, owned: number): number {
  return Math.round(cfg.auto.subagent.price * cfg.auto.subagent.growth ** owned);
}

/** dollars one closed task pays at the current grade */
export function payOf(s: PipeState, cfg: PipeConfig): number {
  return cfg.tuning.pay * cfg.grades[s.grade].mult;
}

function pay(s: PipeState, cfg: PipeConfig, bySubagent: boolean): void {
  s.money += payOf(s, cfg);
  if (bySubagent) s.closedBySubagents++;
  else s.closedHere++;
}

/** Advances the conveyor by dt seconds. Returns how many tasks arrived and how many were closed without a key press. */
export function stepPipe(
  s: PipeState,
  cfg: PipeConfig,
  dt: number,
): { arrived: number; here: number; subagents: number } {
  const t = cfg.tuning;
  const out = { arrived: 0, here: 0, subagents: 0 };

  // tasks arrive
  s.inflowAcc += inflowOf(s, cfg) * dt;
  while (s.inflowAcc >= 1 && s.backlog < t.backlogMax) {
    s.inflowAcc--;
    s.backlog++;
    out.arrived++;
  }
  if (s.backlog >= t.backlogMax) s.inflowAcc = Math.min(s.inflowAcc, 1); // the boss waits

  // Claude in the player's terminal
  const rate = claudeRate(s, cfg);
  if (s.backlog < 1) {
    s.think = 0; // nothing to work on
  } else if (s.noAsk) {
    s.think += rate * dt;
    while (s.think >= 1 && s.backlog >= 1) {
      s.think--;
      s.backlog--;
      pay(s, cfg, false);
      out.here++;
    }
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
  while (s.subAcc >= 1 && s.backlog >= 1) {
    s.subAcc--;
    s.backlog--;
    pay(s, cfg, true);
    out.subagents++;
  }
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
  if (owned >= src.max || !spend(s, sourcePrice(src, owned))) return false;
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

/** A promotion: the next grade, bought in order. */
export function buyGrade(s: PipeState, cfg: PipeConfig): boolean {
  const next = cfg.grades[s.grade + 1];
  if (!next || !spend(s, next.price)) return false;
  s.grade++;
  return true;
}

export function buySubagent(s: PipeState, cfg: PipeConfig): boolean {
  if (!spend(s, subagentPrice(cfg, s.subagents))) return false;
  s.subagents++;
  return true;
}

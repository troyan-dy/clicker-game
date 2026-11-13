/**
 * M01 «Согласие». Claude sends permission requests at the plan's rate; one «Да» approves the top one;
 * `stepsPerTask` approvals close a task and pay. Pure logic: no rendering, no timers of its own.
 */
export interface AgreeTuning {
  /** queue — Claude sets the pace; classic — every press counts (kept for comparison in the gym) */
  mode: 'queue' | 'classic';
  /** requests per second Claude sends */
  rate: number;
  stepsPerTask: number;
  /** dollars per closed task */
  pay: number;
  /** how many «Да» can be given in advance while the queue is empty */
  buffer: number;
  /** Claude stops sending when this many requests are waiting */
  queueMax: number;
  /** dollars in the pocket at the start */
  startMoney: number;
}

export interface AgreeState {
  queue: number;
  /** seconds until Claude sends the next request */
  toNext: number;
  buffered: number;
  pips: number;
  tasks: number;
  money: number;
  presses: number;
  approved: number;
  wasted: number;
}

export type PressResult = 'approved' | 'buffered' | 'wasted';

export interface Approval {
  /** which pip of the task this approval filled, 0-based */
  pip: number;
  taskDone: boolean;
}

export function createAgree(tuning: AgreeTuning): AgreeState {
  return {
    queue: 1, // the first request is already on screen: the first press always works
    toNext: 1 / tuning.rate,
    buffered: 0,
    pips: 0,
    tasks: 0,
    money: tuning.startMoney,
    presses: 0,
    approved: 0,
    wasted: 0,
  };
}

function approve(s: AgreeState, t: AgreeTuning): Approval {
  const pip = s.pips;
  s.approved++;
  s.pips++;
  const taskDone = s.pips >= t.stepsPerTask;
  if (taskDone) {
    s.pips = 0;
    s.tasks++;
    s.money += t.pay;
  }
  return { pip, taskDone };
}

/** Advances Claude by dt seconds. Returns approvals made from «Да» given in advance. */
export function stepAgree(s: AgreeState, t: AgreeTuning, dt: number): Approval[] {
  const auto: Approval[] = [];
  if (t.mode === 'classic') {
    s.queue = 1;
    s.buffered = 0;
    return auto;
  }
  s.toNext -= dt;
  while (s.toNext <= 0) {
    if (s.queue >= t.queueMax) {
      s.toNext = 0; // Claude waits for the player
      break;
    }
    s.queue++;
    s.toNext += 1 / t.rate;
  }
  while (s.buffered > 0 && s.queue > 0) {
    s.buffered--;
    s.queue--;
    auto.push(approve(s, t));
  }
  return auto;
}

export function pressAgree(
  s: AgreeState,
  t: AgreeTuning,
): { result: PressResult; approval?: Approval } {
  s.presses++;
  if (t.mode === 'classic') return { result: 'approved', approval: approve(s, t) };
  if (s.queue > 0) {
    s.queue--;
    return { result: 'approved', approval: approve(s, t) };
  }
  if (s.buffered < t.buffer) {
    s.buffered++;
    return { result: 'buffered' };
  }
  s.wasted++;
  return { result: 'wasted' };
}

/** 0..1: how far Claude is into writing the next request (for the "thinking" hairline). */
export function thinkingProgress(s: AgreeState, t: AgreeTuning): number {
  const period = 1 / t.rate;
  return Math.min(1, Math.max(0, 1 - s.toNext / period));
}

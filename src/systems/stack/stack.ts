/**
 * «Да всем» (M11): once the terminal agrees by itself, the sessions keep piling up questions that
 * only the player can answer. One press approves the whole pile; the longer it grew, the more it pays.
 * Pure logic: no rendering, no clocks of its own.
 */
export interface StackTuning {
  /** seconds of quiet after a pile is approved */
  cooldown: number;
  /** seconds a pile grows to its full worth */
  fillSeconds: number;
  /** a full pile pays this many seconds of income */
  worthSeconds: number;
}

export interface StackState {
  /** seconds until the next pile appears */
  wait: number;
  /** how much of its full worth the pile has reached, 0..1; 0 — nothing to approve */
  fill: number;
  /** piles approved so far */
  taken: number;
}

export function createStack(t: StackTuning): StackState {
  return { wait: t.cooldown / 2, fill: 0, taken: 0 };
}

/** `active` — the terminal no longer asks: only then questions pile up. */
export function stepStack(k: StackState, t: StackTuning, dt: number, active: boolean): void {
  if (!active) return;
  if (k.fill > 0) {
    k.fill = Math.min(1, k.fill + dt / t.fillSeconds);
    return;
  }
  k.wait -= dt;
  if (k.wait <= 0) k.fill = Math.min(1, Math.max(dt, 0.001) / t.fillSeconds);
}

/** dollars the pile pays right now; `income` — dollars per second of the whole conveyor */
export function stackWorth(k: StackState, t: StackTuning, income: number): number {
  return Math.floor(income * t.worthSeconds * k.fill);
}

/** One «Да» for everything: the pile is gone, the next one is a while away. */
export function takeStack(k: StackState, t: StackTuning): void {
  k.fill = 0;
  k.wait = t.cooldown;
  k.taken++;
}

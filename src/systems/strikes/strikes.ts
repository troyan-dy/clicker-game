/**
 * Strikes (M24): while no allowance is paid and enough people are out of work, a picket blocks the
 * door of an employer now and then — no tasks come from there until the player settles it or starts
 * paying. Pure logic: says where a strike starts, changes nothing itself.
 */
import type { Rng } from '../../core/rng';

export interface StrikeTuning {
  /** unemployment from which strikes begin, 0..1 */
  from: number;
  /** seconds between strikes at half unemployment: from … to */
  every: readonly [number, number];
  /** doors blocked at the same time at most */
  max: number;
  /** what settling one costs, in seconds of income */
  priceSeconds: number;
}

export interface StrikeState {
  /** seconds until the next strike */
  wait: number;
}

export function createStrikes(t: StrikeTuning): StrikeState {
  return { wait: t.every[1] };
}

/**
 * Advances the clock of the strikes. `paid` — an allowance is paid, `blocked` — doors blocked now,
 * `doors` — employers that may be struck. Returns the employer where a strike starts now, or null.
 */
export function stepStrikes(st: StrikeState, t: StrikeTuning, dt: number, unemployment: number, paid: boolean, blocked: number, doors: readonly string[], rng: Rng): string | null {
  if (paid || unemployment < t.from || blocked >= t.max || !doors.length) return null;
  // the more people are out of work, the sooner the next one
  st.wait -= dt * (0.5 + unemployment);
  if (st.wait > 0) return null;
  st.wait = rng.range(t.every[0], t.every[1]);
  return rng.pick(doors);
}

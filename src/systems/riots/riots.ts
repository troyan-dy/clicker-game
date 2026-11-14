/**
 * Riots of the Luddites (M27): once enough robots work, a crowd marches on the factory now and then
 * and breaks a part of them. Pure logic: keeps the clock, says when a march starts and when it
 * arrives, breaks nothing itself.
 */
import type { Rng } from '../../core/rng';

export interface RiotTuning {
  /** the share of the jobs robots must hold before riots begin, 0..1 */
  from: number;
  /** seconds between riots: from … to */
  every: readonly [number, number];
  /** seconds the crowd walks to the factory: the warning */
  warn: number;
  /** the share of the working robots a riot breaks before the police */
  share: number;
}

export interface RiotState {
  /** seconds until the next march starts */
  wait: number;
  /** seconds until the crowd on its way reaches the factory; 0 — nobody is marching */
  march: number;
}

export function createRiots(t: RiotTuning): RiotState {
  return { wait: t.every[1], march: 0 };
}

/** Advances the clock. `on` — riots may happen now. Returns «start» when a march begins, «hit» when it arrives. */
export function stepRiots(st: RiotState, t: RiotTuning, dt: number, on: boolean, rng: Rng): 'start' | 'hit' | null {
  if (st.march > 0) {
    st.march -= dt;
    if (st.march > 0) return null;
    st.march = 0;
    return 'hit';
  }
  if (!on) return null;
  st.wait -= dt;
  if (st.wait > 0) return null;
  st.wait = rng.range(t.every[0], t.every[1]);
  st.march = t.warn;
  return 'start';
}

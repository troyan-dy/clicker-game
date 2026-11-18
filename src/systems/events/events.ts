/**
 * Calls and inspections (M20): now and then an employer asks for the player in person — a call with
 * the camera on, an audit, a meeting. One «Да» (a click on the request or any key) earns a bonus;
 * a request nobody answered simply goes away. Pure logic: no rendering, no clocks of its own.
 */
import type { Rng } from '../../core/rng';

export interface EventsTuning {
  /** seconds between requests: from, to */
  every: readonly [number, number];
  /** seconds a request waits for an answer */
  life: number;
  /** an answered request pays this many seconds of income */
  worthSeconds: number;
  /** requests on the screen at once */
  max: number;
}

export interface MapEvent {
  /** Two employers sharing the same slot in the calendar and the same answer. */
  standup?: true;
  /** id of the employer that asks */
  at: string;
  /** which of the screen's requests it is */
  kind: number;
  /** seconds left to answer */
  left: number;
}

export interface EventsState {
  wait: number;
  list: MapEvent[];
  /** requests answered so far */
  taken: number;
}

export function createEvents(t: EventsTuning): EventsState {
  return { wait: t.every[1], list: [], taken: 0 };
}

/** `owners` — employers the player works for on this screen; `kinds` — how many requests the screen knows. */
export function stepEvents(st: EventsState, t: EventsTuning, dt: number, owners: readonly string[], kinds: number, rng: Rng, standupReady = false): void {
  for (const e of st.list) e.left -= dt;
  st.list = st.list.filter((e) => e.left > 0);
  st.wait -= dt;
  if (st.wait > 0) return;
  st.wait = rng.range(t.every[0], t.every[1]);
  if (standupReady && !st.list.length) {
    st.list.push({ at: 'job', kind: 0, left: t.life, standup: true });
    // This meeting pays for two calls and uses two slots in the ordinary schedule.
    st.wait += rng.range(t.every[0], t.every[1]);
    return;
  }
  const free = owners.filter((id) => !st.list.some((e) => e.at === id));
  if (!free.length || kinds <= 0 || st.list.length >= t.max) return;
  st.list.push({ at: rng.pick(free), kind: rng.int(0, kinds - 1), left: t.life });
}

/** The request number `i` is answered. Returns it, or nothing when there is no such request any more. */
export function takeEvent(st: EventsState, i: number): MapEvent | undefined {
  const e = st.list[i];
  if (!e) return undefined;
  st.list.splice(i, 1);
  st.taken += e.standup ? 2 : 1;
  return e;
}

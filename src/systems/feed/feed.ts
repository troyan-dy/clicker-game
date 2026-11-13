/**
 * The voice of the game (M06): a news ticker that follows the player's scale and Claude's remarks
 * on what just happened. Pure logic: no rendering, no clocks of its own; the lines come from src/content.
 */
import type { Rng } from '../../core/rng';

export interface FeedNews {
  screen: number;
  text: string;
  needs?: string;
}

export interface FeedContent {
  news: readonly FeedNews[];
  quips: Record<string, readonly string[]>;
}

export interface FeedTuning {
  /** seconds one news line stays on the ticker */
  newsHold: number;
  /** seconds a remark stays, plus `quipPerChar` for every character of it */
  quipHold: number;
  quipPerChar: number;
  /** seconds of silence after a remark before an ordinary one may follow */
  quipGap: number;
}

export interface FeedState {
  news: string;
  newsLeft: number;
  /** indices of the news already shown */
  shown: number[];
  screen: number;
  quip: string;
  quipLeft: number;
  /** ordinary remarks wait until this runs out */
  quiet: number;
  /** how many times each kind of remark has been said */
  said: Record<string, number>;
}

export function createFeed(): FeedState {
  return { news: '', newsLeft: 0, shown: [], screen: 0, quip: '', quipLeft: 0, quiet: 0, said: {} };
}

/**
 * Advances the ticker and lets a remark fade. `has(id)` — whether the player owns what a line needs.
 * A new screen brings its own headline at once.
 */
export function stepFeed(
  f: FeedState,
  content: FeedContent,
  tuning: FeedTuning,
  dt: number,
  screen: number,
  has: (id: string) => boolean,
  rng: Rng,
): void {
  f.newsLeft -= dt;
  if (f.newsLeft <= 0 || screen !== f.screen) {
    f.screen = screen;
    const fits = (i: number): boolean => {
      const n = content.news[i];
      return n.screen <= screen && (!n.needs || has(n.needs));
    };
    const all = content.news.map((_, i) => i).filter(fits);
    let fresh = all.filter((i) => !f.shown.includes(i));
    if (!fresh.length) {
      // everything has been read: start over, but not with the line that is on the ticker now
      f.shown = [];
      fresh = all.filter((i) => content.news[i].text !== f.news);
    }
    // the news of the current screen come first, the older ones fill the pauses
    const top = Math.max(...fresh.map((i) => content.news[i].screen));
    const pool = fresh.filter((i) => content.news[i].screen === top);
    if (pool.length) {
      const pick = pool[rng.int(0, pool.length - 1)];
      f.shown.push(pick);
      f.news = content.news[pick].text;
    }
    f.newsLeft = tuning.newsHold;
  }

  f.quiet = Math.max(0, f.quiet - dt);
  if (f.quip) {
    f.quipLeft -= dt;
    if (f.quipLeft <= 0) f.quip = '';
  }
}

/**
 * Claude says the next line of the kind `on`. Ordinary remarks keep a pause between each other;
 * `force` — an event too big to stay silent about. Returns whether something was said.
 */
export function say(f: FeedState, content: FeedContent, tuning: FeedTuning, on: string, force = false): boolean {
  const lines = content.quips[on];
  if (!lines?.length || (!force && f.quiet > 0)) return false;
  const n = f.said[on] ?? 0;
  f.said[on] = n + 1;
  f.quip = lines[n % lines.length];
  f.quipLeft = tuning.quipHold + f.quip.length * tuning.quipPerChar;
  f.quiet = f.quipLeft + tuning.quipGap;
  return true;
}

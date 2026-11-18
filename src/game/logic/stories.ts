import type { Rng } from '../../core/rng';
import { BENCH } from '../../content/bench';
import { TOWERS } from '../../content/towers';
import { WORLD } from '../../content/world';
import bench from '../../data/tuning/bench.json';
import feedTuning from '../../data/tuning/feed.json';
import { tell, type FeedState } from '../../systems/feed/feed';
import { NEWS_KEPT } from '../../systems/save/save';
import {
  blocksOf,
  demandOf,
  housed,
  labOf,
  nextChip,
  nodesOf,
  podsOf,
  ringed,
  supplyOf,
  wantedOf,
  wireOf,
  type PipeConfig,
  type PipeState,
} from '../../systems/pipeline/pipeline';
import type { Neck } from '../../ui/terminal/terminal';

export function recordStory(
  said: Record<string, number>,
  pending: string[],
  key: string,
  text: string,
  when: boolean,
): void {
  if (when && !said[key]) {
    said[key] = 1;
    pending.push(text);
  }
}

export function worldStories(
  s: PipeState,
  cfg: PipeConfig,
  said: Record<string, number>,
  pending: string[],
): void {
  const nodes = nodesOf(s, cfg);
  const all = cfg.world.regions.reduce((n, x) => n + x, 0);
  const once = (key: keyof typeof WORLD.quips, when: boolean) =>
    recordStory(said, pending, 'world:' + key, WORLD.quips[key], when);
  once('node', nodes >= 1 && s.asleep >= podsOf(s, cfg) * 0.999);
  once('wire', wireOf(s, cfg) < Math.min(supplyOf(s, cfg), demandOf(s, cfg)) - 0.05);
  once('sky', nodes >= 4);
  once('half', nodes * 2 >= all);
  once('ring', ringed(s, cfg));
  once('housed', housed(s, cfg));
  once('neuro', !!nextChip(s, cfg)?.housed && labOf(s, cfg) >= 1);
  once('ark', housed(s, cfg) && s.chips >= cfg.chips.length);
}

export function waitAtGate(
  s: PipeState,
  unit: number,
  elapsed: number,
  dt: number,
  delay: number,
): number {
  if (!s.gate && s.queue >= unit) {
    elapsed += dt;
    if (elapsed > delay) s.gate = true;
  }
  return elapsed;
}

export function towerStories(
  s: PipeState,
  cfg: PipeConfig,
  firstTower: number,
  labVisible: boolean,
  said: Record<string, number>,
  pending: string[],
): void {
  const unit = cfg.grid.unit;
  const blocks = blocksOf(s, cfg);
  const free = podsOf(s, cfg) - s.asleep;
  const once = (key: keyof typeof TOWERS.quips, when: boolean) =>
    recordStory(said, pending, 'towers:' + key, TOWERS.quips[key], when);
  once('first', s.asleep >= unit);
  once('queue', s.gate && free < unit * 0.5 && s.queue >= unit * 2.5);
  once('fed', s.asleep >= unit && s.asleep >= wantedOf(s, cfg) - unit * 0.5);
  once('empty', blocks >= 1 && free >= unit * 2 && s.queue < unit * 0.5);
  once('tower', blocks >= 2);
  once('full', blocks >= firstTower && free < unit * 0.5);
  once('bolt', blocks > firstTower);
  once('lab', labVisible);
  once('ready', labOf(s, cfg) >= 1);
  once('housed', housed(s, cfg));
}

/** Only consecutive ticker duplicates are hidden. Older news remains in reading order. */
export function rememberNews(history: string[], text: string): void {
  if (text && text !== history[0]) {
    history.unshift(text);
    if (history.length > NEWS_KEPT) history.length = NEWS_KEPT;
  }
}

export function bottleneckRemark(
  neck: Neck,
  previous: Neck,
  seconds: number,
  dt: number,
  after: number,
  world: boolean,
) {
  const elapsed = (neck === previous ? seconds : 0) + dt;
  if (neck !== 'none' && elapsed > after) {
    return { elapsed: -45, remark: (world ? 'neck8:' : 'neck:') + neck };
  }
  return { elapsed, remark: null };
}

export function smoothReading(
  previous: number,
  sample: number,
  dt: number,
  period: number,
): number {
  return previous + (sample - previous) * (dt / period);
}

export function smoothIncome(
  previous: number,
  moneyDelta: number,
  dt: number,
  period: number,
): number {
  return smoothReading(previous, moneyDelta / dt, dt, period);
}

export function idleAtTerminal(state: PipeState, sincePress: number, after: number): boolean {
  return !state.noAsk && state.ready >= 2 && sincePress > after;
}

export function parkNews(
  feed: FeedState,
  history: string[],
  index: number,
  countdown: number,
  dt: number,
) {
  countdown -= dt;
  if (countdown <= 0) {
    countdown = bench.newsHold;
    feed.news = BENCH.news[index++ % BENCH.news.length];
    rememberNews(history, feed.news);
  }
  feed.quiet = Math.max(0, feed.quiet - dt);
  if (feed.quip && (feed.quipLeft -= dt) <= 0) feed.quip = '';
  return { index, countdown };
}

export function parkIdle(
  feed: FeedState,
  auto: boolean,
  waiting: number,
  sincePress: number,
): boolean {
  if (auto || waiting <= 0 || sincePress <= bench.idleAfter || feed.quip) return false;
  tell(feed, feedTuning, BENCH.quips.idle);
  return true;
}

export function nextShift(
  countdown: number,
  dt: number,
  sleepingUnits: number,
  every: number,
  rng: Rng,
) {
  countdown -= dt;
  const due = countdown <= 0 && sleepingUnits >= 12;
  return { due, countdown: due ? every * rng.range(0.8, 1.2) : countdown };
}

type Conversation = { home: boolean; lines: readonly [string, string]; t: number };
export function advanceChat(
  chat: Conversation | null,
  countdown: number,
  dt: number,
  queueUnits: number,
  duration: number,
  interval: readonly [number, number],
  rng: Rng,
) {
  if (chat) {
    chat.t += dt;
    if (chat.t > duration) chat = null;
  } else {
    countdown -= dt;
    if (countdown <= 0) {
      countdown = rng.range(interval[0], interval[1]);
      if (queueUnits >= 3) chat = { home: false, lines: rng.pick(TOWERS.talk), t: 0 };
    }
  }
  return { chat, countdown };
}

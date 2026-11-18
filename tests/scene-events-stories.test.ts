import { describe, expect, it } from 'vitest';
import { BENCH } from '../src/content/bench';
import { TOWERS } from '../src/content/towers';
import { WORLD } from '../src/content/world';
import { createRng } from '../src/core/rng';
import bench from '../src/data/tuning/bench.json';
import {
  advanceChat,
  bottleneckRemark,
  idleAtTerminal,
  nextShift,
  parkIdle,
  parkNews,
  rememberNews,
  smoothIncome,
  towerStories,
  waitAtGate,
  worldStories,
} from '../src/game/logic/stories';
import { createFeed } from '../src/systems/feed/feed';
import { createPipe, podsOf } from '../src/systems/pipeline/pipeline';
import { NEWS_KEPT } from '../src/systems/save/save';
import { cfg } from './fixtures/pipe';

describe('tower milestones', () => {
  it('counts only time with volunteers waiting, and opens the gate after the full wait', () => {
    const s = createPipe(cfg);
    const wait = (previous: number, dt: number) => waitAtGate(s, 10, previous, dt, 9);
    expect(wait(0, 15)).toBe(0);
    s.queue = 10;
    expect(wait(0, 9)).toBe(9);
    expect(s.gate).toBe(false);
    expect(wait(9, 1)).toBe(10);
    expect(s.gate).toBe(true);
    expect(wait(10, 100)).toBe(10);
  });

  it('announces distinct overcrowding, spare capacity, research and construction milestones once', () => {
    const s = createPipe(cfg);
    s.noAsk = true;
    s.scale = cfg.grid.screen - 2;
    const said: Record<string, number> = {};
    const pending: string[] = [];
    const tick = (labVisible: boolean) => towerStories(s, cfg, 7, labVisible, said, pending);
    tick(false);
    expect(pending).toEqual([]);
    const q = TOWERS.quips;
    s.asleep = cfg.grid.unit;
    s.queue = cfg.grid.unit * 3;
    s.gate = true;
    tick(false);
    expect(pending.splice(0)).toEqual([q.first, q.queue]);
    s.modules.block = 2;
    tick(false);
    expect(pending.splice(0)).toEqual([q.tower]);
    s.queue = 0;
    tick(false);
    expect(pending.splice(0)).toEqual([q.empty]);
    s.modules.block = 7;
    s.asleep = podsOf(s, cfg);
    s.lab = cfg.chips[0].need;
    tick(true);
    expect(pending.splice(0)).toEqual([q.fed, q.full, q.lab, q.ready]);
    s.modules.block = 8;
    tick(true);
    expect(pending.splice(0)).toEqual([q.bolt]);
    tick(true);
    expect(pending).toEqual([]);
    expect(said['towers:queue']).toBe(1);
  });

  it('starts a shift only when the clock expires and twelve units of sleepers can leave', () => {
    const rng = createRng(5);
    expect(nextShift(2, 1, 12, 10, rng)).toEqual({ due: false, countdown: 1 });
    expect(nextShift(1, 1, 11.99, 10, rng)).toEqual({ due: false, countdown: 0 });
    const shift = nextShift(0, 0.5, 12, 10, rng);
    expect(shift.due).toBe(true);
    expect(shift.countdown).toBeGreaterThanOrEqual(8);
    expect(shift.countdown).toBeLessThanOrEqual(12);
  });

  it('starts dialogue only when a queue is present and lets a conversation finish before another one', () => {
    const tick = (queue: number, wait: number) =>
      advanceChat(null, wait, 1, queue, 6, [9, 9], createRng(2));
    expect(tick(4, 2)).toEqual({ chat: null, countdown: 1 });
    expect(tick(2, 1)).toEqual({ chat: null, countdown: 9 });
    const start = tick(3, 1);
    expect(start.chat).toMatchObject({ home: false, t: 0 });
    expect(TOWERS.talk).toContain(start.chat?.lines);
    const held = advanceChat(start.chat, 9, 6, 4, 6, [9, 9], createRng(1));
    expect(held.chat?.t).toBe(6);
    expect(advanceChat(held.chat, 9, 1, 4, 6, [9, 9], createRng(1))).toEqual({
      chat: null,
      countdown: 9,
    });
  });
});

describe('world milestones', () => {
  it('reports the filled nodes, cable, hardware and ark stages in order without repeats', () => {
    const s = createPipe(cfg);
    s.noAsk = true;
    s.scale = cfg.world.screen - 2;
    const pending: string[] = [];
    const said: Record<string, number> = {};
    const tick = () => worldStories(s, cfg, said, pending);
    const q = WORLD.quips;
    tick();
    expect(pending).toEqual([]);
    s.modules.block = cfg.grid.blocks.length;
    s.modules.span = 2;
    s.modules.node = 4;
    tick();
    expect(pending.splice(0)).toEqual([q.sky]);
    s.asleep = podsOf(s, cfg);
    s.net.copies = 20;
    tick();
    expect(pending.splice(0)).toEqual([q.node, q.wire]);
    s.modules.span = cfg.world.regions.length;
    s.modules.node = cfg.world.regions.reduce((a, b) => a + b);
    s.chips = cfg.chips.length - 1;
    tick();
    expect(pending.splice(0)).toEqual([q.half, q.ring]);
    s.asleep = podsOf(s, cfg);
    tick();
    expect(pending.splice(0)).toEqual([q.housed, q.neuro]);
    s.chips++;
    tick();
    expect(pending.splice(0)).toEqual([q.ark]);
    tick();
    expect(pending).toEqual([]);
  });
});

describe('observations and readings', () => {
  it('times sustained bottlenecks, resets the clock on a change and applies a repeat cooldown', () => {
    expect(bottleneckRemark('pods', 'tasks', 100, 1, 3, true)).toEqual({
      elapsed: 1,
      remark: null,
    });
    expect(bottleneckRemark('pods', 'pods', 2, 1, 3, true)).toEqual({ elapsed: 3, remark: null });
    expect(bottleneckRemark('pods', 'pods', 3, 1, 3, true)).toEqual({
      elapsed: -45,
      remark: 'neck8:pods',
    });
    expect(bottleneckRemark('pods', 'pods', -45, 1, 3, true).remark).toBeNull();
    expect(bottleneckRemark('wire', 'wire', 3, 1, 3, false).remark).toBe('neck:wire');
    expect(bottleneckRemark('none', 'none', 8, 1, 3, false).remark).toBeNull();
  });

  it('announces idle only when at least two requests await a player response', () => {
    const s = createPipe(cfg);
    expect(idleAtTerminal(s, 11, 10)).toBe(false);
    s.ready = 2;
    expect(idleAtTerminal(s, 10, 10)).toBe(false);
    expect(idleAtTerminal(s, 11, 10)).toBe(true);
    s.noAsk = true;
    expect(idleAtTerminal(s, 11, 10)).toBe(false);
  });

  it('smooths the previous reading toward dollars per second for the elapsed interval', () => {
    expect(smoothIncome(6, 6, 0.5, 1.5)).toBe(8);
    expect(smoothIncome(6, -6, 1.5, 1.5)).toBe(-4);
  });
});

describe('newspaper and idle time on the bench', () => {
  it('keeps the most recent distinct consecutive headlines up to the save limit', () => {
    const history = Array.from({ length: NEWS_KEPT }, (_, i) => String(i));
    rememberNews(history, '');
    rememberNews(history, '0');
    expect(history.length).toBe(NEWS_KEPT);
    rememberNews(history, '1');
    expect(history.slice(0, 3)).toEqual(['1', '0', '1']);
    expect(history.at(-1)).toBe(String(NEWS_KEPT - 2));
  });

  it('loops the bench news in publication order and lets remarks expire between headlines', () => {
    const feed = createFeed();
    const history: string[] = [];
    Object.assign(feed, { quiet: 3, quip: 'hello', quipLeft: 2 });
    const start = parkNews(feed, history, BENCH.news.length - 1, 0, 1);
    expect(history).toEqual([BENCH.news.at(-1)]);
    expect(feed).toMatchObject({ quip: 'hello', quiet: 2, quipLeft: 1 });
    const next = parkNews(feed, history, start.index, start.countdown, 1);
    expect(feed.quip).toBe('');
    expect(next.countdown).toBe(bench.newsHold - 1);
    parkNews(feed, history, next.index, next.countdown, next.countdown);
    expect(history).toEqual([BENCH.news[0], BENCH.news.at(-1)]);
    expect(feed.quiet).toBe(0);
  });

  it('speaks only during prolonged manual inactivity when birds wait and no other remark is in progress', () => {
    const feed = createFeed();
    const late = bench.idleAfter + 1;
    expect(parkIdle(feed, true, 1, late)).toBe(false);
    expect(parkIdle(feed, false, 0, late)).toBe(false);
    expect(parkIdle(feed, false, 1, bench.idleAfter)).toBe(false);
    expect(parkIdle(feed, false, 1, late)).toBe(true);
    expect(feed.quip).toBe(BENCH.quips.idle);
    expect(parkIdle(feed, false, 1, late)).toBe(false);
  });
});

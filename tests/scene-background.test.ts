import { describe, expect, it, vi } from 'vitest';
import {
  activeBackgroundSeconds,
  advanceBackground,
  backgroundWork,
  collectMorning,
  elapsedMs,
  frameRemainder,
  missedBackgroundFrames,
  morningDuration,
  restoredWin,
  resumeOffline,
} from '../src/game/logic/background';
import { canInvite, managerClock, transitionOffer } from '../src/game/logic/transitions';
import { createPipe, podsOf, type PipeConfig } from '../src/systems/pipeline/pipeline';
import { freshMeta, type SaveFile } from '../src/systems/save/save';
import manager from '../src/data/tuning/manager.json';
import save from '../src/data/tuning/save.json';
import { cfg } from './fixtures/pipe';

describe('foreground and background clocks', () => {
  it('only catches up a background window when hidden or more than 250 ms behind', () => {
    expect(missedBackgroundFrames(null, 1000, true)).toBe(false);
    expect(missedBackgroundFrames(400, 650, false)).toBe(false);
    expect(missedBackgroundFrames(400, 651, false)).toBe(true);
    expect(missedBackgroundFrames(400, 400, true)).toBe(true);
    expect(elapsedMs(400, 399)).toBe(0);
    expect(elapsedMs(400, 650)).toBe(250);
  });

  it('keeps the fractional step, caps a delayed frame, and clears the accumulator on pause', () => {
    const simulation = vi.fn();
    const step = 1 / 8;
    let left = frameRemainder(0, 1000, false, false, step, simulation);
    expect(left).toBe(0);
    expect(simulation.mock.calls).toEqual([[step], [step]]);
    left = frameRemainder(left, 250, false, true, step, simulation);
    expect(left).toBe(1 / 16);
    left = frameRemainder(left, 250, false, true, step, simulation);
    expect(left).toBe(0);
    expect(simulation).toHaveBeenCalledTimes(3);
    expect(frameRemainder(0.1, 1000, true, false, step, simulation)).toBe(0);
    expect(simulation).toHaveBeenCalledTimes(3);
  });

  const playing = {
    paused: false,
    frozen: false,
    superseded: false,
    cinematic: false,
    creditsRolling: false,
  };
  it.each(Object.keys(playing))('earns no background seconds while %s', (flag) => {
    expect(activeBackgroundSeconds(60, { ...playing, [flag]: true }, false)).toBe(0);
  });
  it('uses the same slow-motion speed in a hidden and a visible window', () => {
    expect(activeBackgroundSeconds(60, playing, false)).toBe(60);
    expect(activeBackgroundSeconds(60, playing, true)).toBe(15);
  });

  it('skips idle buying intervals and replans immediately after a purchase', () => {
    const steps: number[] = [];
    const period = manager.period;
    advanceBackground(6 * period, true, (dt) => {
      steps.push(dt);
      return steps.length === 2;
    });
    expect(steps).toHaveLength(4);
    [1, 2, 1, 2].forEach((length, i) => expect(steps[i]).toBeCloseTo(length * period));
    const unstaffed = vi.fn(() => false);
    advanceBackground(3600, false, unstaffed);
    advanceBackground(0, true, unstaffed);
    expect(unstaffed.mock.calls).toEqual([[3600]]);
  });

  it.each([
    [undefined, 10, 10, 0],
    [0, 1, 1, 0],
    [1, 5, 2.5, 2.5],
    [3, 1, 0, 1],
    [4, 5, 4, 1],
    [5, 5, 5, 0],
  ])('splits production and outage from %s for %s seconds', (elapsed, dt, active, down) => {
    let produced = 0;
    let offline = 0;
    backgroundWork(dt, elapsed, (seconds, stopped) => {
      if (stopped) offline += seconds;
      else produced += seconds;
    });
    expect(produced).toBe(active);
    expect(offline).toBe(down);
  });

  it('delivers completed work on either side of an outage in chronological order', () => {
    const runs: [number, boolean][] = [];
    backgroundWork(6, 1, (seconds, stopped) => runs.push([seconds, stopped]));
    expect(runs).toEqual([
      [1.5, false],
      [2.5, true],
      [2, false],
    ]);
  });
});

describe('restoring an offline run', () => {
  it('reopens a previously won shorter campaign when another scale has been added', () => {
    const state = createPipe(cfg);
    const file: SaveFile = {
      v: 1,
      state,
      feed: { shown: [], said: {} },
      meta: freshMeta(),
      at: 0,
      won: true,
      seconds: 900,
    };
    state.scale = cfg.scales.length - 1;
    expect(restoredWin(file, cfg)).toBe(false);
    state.scale++;
    expect(restoredWin(file, cfg)).toBe(true);
    expect(restoredWin({ ...file, won: false }, cfg)).toBe(false);
  });
  it('quotes the report before expiring the limit and only credits production when collected', () => {
    const state = createPipe(cfg);
    state.noAsk = true;
    state.limited = 20;
    const before = state.money;
    const report = resumeOffline(state, cfg, 5000, 105000)!;
    expect(state.limited).toBe(0);
    const reference = createPipe(cfg);
    reference.noAsk = true;
    const withoutOutage = resumeOffline(reference, cfg, 0, 80000)!;
    expect(report.tasks).toBeGreaterThan(0);
    expect(report.tasks).toBe(withoutOutage.tasks);
    expect(report.dollars).toBe(withoutOutage.dollars);
    expect(state.money).toBe(before);
    const meta = freshMeta();
    expect(collectMorning(state, meta, report, 10)).toBe(10 + report.dollars);
    expect(state.closedBySubagents).toBe(report.tasks);
    expect(state.money).toBe(before + report.dollars);
    expect(meta.reports).toBe(1);
  });
  it('retains the remaining limit for a short absence or a clock rollback', () => {
    const s = createPipe(cfg);
    s.limited = 60;
    expect(resumeOffline(s, cfg, 3000, 2000)).toBeNull();
    expect(s.limited).toBe(60);
    expect(resumeOffline(s, cfg, 3000, 13000)).toBeNull();
    expect(s.limited).toBe(50);
  });
  it('formats whole minutes and hours and marks the exact cap', () => {
    expect(morningDuration(119, 'h', 'min')).toEqual({ away: '1 min', capped: false });
    expect(morningDuration(3600, 'h', 'min').away).toBe('1 h');
    expect(morningDuration(3660, 'h', 'min').away).toBe('1 h 1 min');
    expect(morningDuration(save.offlineCapHours * 3600, 'h', 'min').capped).toBe(true);
  });
});

describe('manager timing and transitions', () => {
  const clockElapsed = manager.period / 2;
  it('pauses decisions during incidents, usage limits, opt-out and bench play without losing elapsed time', () => {
    const s = createPipe(cfg);
    const meta = freshMeta();
    const tick = (bench = false) => managerClock(clockElapsed, clockElapsed, s, 2, meta, bench);
    const waiting = { elapsed: clockElapsed, due: false };
    expect(tick()).toEqual(waiting);
    s.managers.push(2);
    meta.managerOff = true;
    expect(tick()).toEqual(waiting);
    meta.managerOff = false;
    expect(tick(true)).toEqual(waiting);
    meta.intern = { elapsed: 0, credit: 1 };
    expect(tick()).toEqual(waiting);
    delete meta.intern;
    s.limited = 1;
    expect(tick()).toEqual(waiting);
    s.limited = 0;
    expect(tick()).toEqual({ elapsed: 0, due: true });
    expect(managerClock(0, clockElapsed, s, 2, meta, false)).toEqual(waiting);
  });
  it('offers the next scale only when its keys, price and name are ready', () => {
    const s = createPipe(cfg);
    s.noAsk = true;
    const next = cfg.scales[0];
    s.money = next.price - 1;
    expect(transitionOffer(s, cfg, false)).toBeNull();
    s.money++;
    expect(transitionOffer(s, cfg, false)).toEqual({
      action: 'scale',
      name: next.name,
      price: next.price,
    });
    const unnamed: PipeConfig = { ...cfg, scales: [{ ...next, name: '' }] };
    expect(transitionOffer(s, unnamed, false)).toBeNull();
    s.scale++;
    expect(transitionOffer(s, cfg, false)).toBeNull();
    expect(transitionOffer(s, unnamed, false)).toBeNull();
  });
  it('offers a single affordable ark at the end of a populated and researched world', () => {
    const s = createPipe(cfg);
    s.noAsk = true;
    s.scale = cfg.world.screen - 2;
    const ark = cfg.modules.find((m) => m.kind === 'ark')!;
    s.money = ark.price;
    expect(transitionOffer(s, { ...cfg, modules: [] }, true)).toBeNull();
    expect(transitionOffer(s, cfg, true)).toBeNull();
    s.modules.block = cfg.grid.blocks.length;
    s.modules.span = cfg.world.regions.length;
    s.modules.node = cfg.world.regions.reduce((sum, count) => sum + count, 0);
    s.chips = cfg.chips.length;
    s.asleep = podsOf(s, cfg);
    expect(transitionOffer(s, cfg, true)).toEqual({
      action: 'mod:' + ark.id,
      name: ark.name,
      price: ark.price,
    });
    s.modules[ark.id] = 1;
    expect(transitionOffer(s, cfg, true)).toBeNull();
  });
  it('defers an invitation while another interaction takes precedence, including a timed reply', () => {
    const ready = {
      alreadyAsked: false,
      openCard: false,
      cinematic: false,
      departing: false,
      won: false,
      incident: false,
      calls: 0,
      replyUntil: 12,
      clock: 12,
    };
    expect(canInvite(ready)).toBe(true);
    for (const flag of ['alreadyAsked', 'openCard', 'cinematic', 'departing', 'won', 'incident'])
      expect(canInvite({ ...ready, [flag]: true }), flag).toBe(false);
    expect(canInvite({ ...ready, calls: 2 })).toBe(false);
    expect(canInvite({ ...ready, replyUntil: 12.1 })).toBe(false);
  });
});

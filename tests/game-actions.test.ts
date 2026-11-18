import { expect, it } from 'vitest';
import { BENCH } from '../src/content/bench';
import tuning from '../src/data/tuning/bench.json';
import { createBench } from '../src/systems/bench/bench';
import { createPipe } from '../src/systems/pipeline/pipeline';
import { freshMeta } from '../src/systems/save/save';
import { approvePending, openVolunteerGate, routePress, settleIntern, signResearch } from '../src/game/logic/approval';
import { refuseFeeding, toggleFeeding, tossSlice } from '../src/game/logic/parkActions';
import { cfg } from './fixtures/pipe';

it('lets one Yes handle all pending work without spending it on a normal task too', () => {
  const seen: string[] = [];
  const pending = (calls: number, chip: boolean, gate: boolean, pile: boolean) => () =>
    approvePending(calls, () => { seen.push('call'); }, () => { seen.push('chip'); return chip; },
      () => { seen.push('gate'); return gate; }, () => { seen.push('pile'); return pile; });
  const all = pending(2, true, true, true);
  expect(routePress(true, true, 8, all)).toBe('bread');
  expect(routePress(false, true, 8, all)).toBe('blocked');
  expect(routePress(false, false, 1, all)).toBe('task');
  expect(seen).toEqual([]);
  expect(routePress(false, false, 8, all)).toBe('batch');
  expect(seen).toEqual(['call', 'call', 'chip', 'gate', 'pile']);
  expect(routePress(false, false, 2, pending(0, false, false, false))).toBe('task');
  for (const only of ['calls', 'chip', 'gate', 'pile']) {
    expect(routePress(false, false, 8, pending(only === 'calls' ? 1 : 0, only === 'chip', only === 'gate', only === 'pile'))).toBe('batch');
  }
});

it('opens the volunteer gate only once and counts research approval only when signed', () => {
  const state = createPipe(cfg);
  state.queue = cfg.grid.unit - 1;
  expect(openVolunteerGate(state, cfg, cfg.grid.screen)).toBe(false);
  state.queue++;
  expect(openVolunteerGate(state, cfg, 1)).toBe(false);
  expect(openVolunteerGate(state, cfg, cfg.grid.screen)).toBe(true);
  expect(openVolunteerGate(state, cfg, cfg.grid.screen)).toBe(false);
  expect(state.presses).toBe(1);
  expect(signResearch(state, cfg, false)).toBeUndefined();
  state.noAsk = true;
  state.scale = cfg.grid.screen - 2;
  state.lab = cfg.chips[0].need;
  expect(signResearch(state, cfg, true)).toBeUndefined();
  expect(state).toMatchObject({ presses: 1, chips: 0, lab: cfg.chips[0].need });
  expect(signResearch(state, cfg, false)?.id).toBe(cfg.chips[0].id);
  expect(state).toMatchObject({ presses: 2, chips: 1, gate: true });
});

it('credits an intern outage once even if an entire incident passes between frames', () => {
  const state = createPipe(cfg);
  const meta = freshMeta();
  const money = state.money;
  expect(settleIntern(state, meta, 20)).toBe(0);
  meta.intern = { elapsed: 0, credit: 75 };
  expect(settleIntern(state, meta, 1)).toBe(0);
  expect(meta.intern.elapsed).toBe(1);
  expect(settleIntern(state, meta, 20)).toBe(75);
  expect(meta.intern).toBeUndefined();
  expect(settleIntern(state, meta, 20)).toBe(0);
  expect(state.money).toBe(money + 75);
});

it('keeps player milestones separate from automatic throws and empty hands', () => {
  const park = createBench(tuning);
  const state = createPipe(cfg);
  const meta = freshMeta();
  park.loaf = 2;
  park.waiting = 2;
  expect(tossSlice(park, state, meta, false)).toEqual({ result: 'fed', message: BENCH.milestones[1], courierStarted: false });
  expect(tossSlice(park, state, meta, true)).toEqual({ result: 'fed', message: '', courierStarted: true });
  expect(tossSlice(park, state, meta, false)).toEqual({ result: 'empty', message: '', courierStarted: false });
  expect([meta.bread, state.presses, park.thrown, park.fed]).toEqual([1, 1, 2, 2]);
  park.loaf = 4;
  meta.bread = tuning.offerAfter - 1;
  expect(tossSlice(park, state, meta, false).message).toBe(BENCH.quips.offer);
  expect(tossSlice(park, state, meta, false).message).toBe('');
  toggleFeeding(park, meta);
  expect([park.auto, meta.benchAuto, meta.feeder]).toEqual([true, true, true]);
  meta.bread = tuning.offerAfter - 1;
  expect(tossSlice(park, state, meta, false).message).toBe('');
  toggleFeeding(park, meta);
  expect([park.auto, meta.benchAuto, meta.feeder]).toEqual([false, false, true]);
});

it('distinguishes refusing a waiting bird from pressing No with an empty queue', () => {
  const park = createBench(tuning);
  const meta = freshMeta();
  expect(refuseFeeding(park, meta)).toEqual({ refused: false, useReply: true });
  expect(refuseFeeding(park, meta)).toEqual({ refused: false, useReply: false });
  park.waiting = 1;
  expect(refuseFeeding(park, meta)).toEqual({ refused: true, useReply: true });
  expect([meta.refused, park.refused, park.waiting]).toEqual([3, 1, 0]);
});

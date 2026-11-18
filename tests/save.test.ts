import { cfg } from './fixtures/pipe';
import { describe, expect, it } from 'vitest';
import { laptopPhase, startIncident, stepIncident } from '../src/systems/intern/incident';
import saveTuning from '../src/data/tuning/save.json';
import {
  buyFarm,
  buyGrade,
  buyManager,
  buyModule,
  buyNoAsk,
  buyPlan,
  buyScale,
  buySource,
  buySubagent,
  createPipe,
  payOf,
  screenOf,
  stepPipe,
} from '../src/systems/pipeline/pipeline';
import { applyOffline, freshMeta, offlineReport, packSave, restorePipe, unpackSave } from '../src/systems/save/save';


/** a game well into the city */
function grown() {
  const s = createPipe(cfg);
  s.money = 1e9;
  buyPlan(s, cfg);
  buySource(s, cfg, 'freelance');
  buyNoAsk(s, cfg);
  buySubagent(s, cfg);
  buyGrade(s, cfg);
  buyScale(s, cfg);
  buySource(s, cfg, 'vector');
  buyFarm(s, cfg, 'rack');
  buyManager(s, cfg, 3);
  return s;
}

describe('save', () => {
  it('resumes the laptop outage and issues one credit across reloads', () => {
    const state = grown();
    const meta = { ...freshMeta(), legends: ['intern'], intern: startIncident(75) };
    const save = { at: 0, state, meta, feed: { shown: [], said: {} }, won: false, seconds: 0 };
    expect(stepIncident(meta.intern, 3)).toBe(0);
    const outage = unpackSave(packSave(save), cfg)!.meta.intern!;
    expect(laptopPhase(outage.elapsed)).toBe('closed');
    const before = state.money;
    stepPipe(state, cfg, 1, true);
    expect(state.money).toBe(before);
    expect(stepIncident(outage, 2.5)).toBe(75);
    const restored = unpackSave(packSave({ ...save, meta: { ...meta, intern: outage } }), cfg)!.meta.intern!;
    expect(laptopPhase(restored.elapsed)).toBe('restored');
    expect(stepIncident(restored, 3)).toBe(0);
    expect(laptopPhase(restored.elapsed)).toBe('done');
    stepPipe(state, cfg, 1);
    expect(state.money).toBeGreaterThan(before);
    const old = unpackSave(packSave({ ...save, meta: { ...freshMeta(), legends: ['intern'] } }), cfg)!;
    expect(old.meta.legends).toContain('intern');
    expect(old.meta.intern).toBeUndefined();
  });

  it('test_save_round_trip_keeps_the_whole_game', () => {
    const s = grown();
    s.inflowAcc = 0.75;
    s.subAcc = 0.25;
    s.limited = 2;
    s.allowance = 2;
    s.orders = 0.5;
    s.bribed.exchange = true;
    s.lines.dogs = 3;
    s.police = 2;
    s.aim.robodog = 'depot';
    s.owned.depot = 1.25; // robots are half-way through the second unit
    // the towers: five blocks, terms bettered twice, a dial of the network turned twice, people in line and asleep, an invention on its way
    s.modules.block = 5;
    s.modules.hire = 2;
    // …and the planet: two spans of the cable, three nodes, a thread
    s.modules.span = 2;
    s.modules.node = 3;
    s.modules.thread = 1;
    s.net.copies = 2;
    s.queue = 3.5e6;
    s.asleep = 21e6;
    s.gate = true;
    s.lab = 120.5;
    s.chips = 1;
    const meta = { legends: ['rust'], awards: ['first_yes', 'no_ask'], piles: 4, reports: 1, calls: 3, limits: 1, riots: 2, news: ['Первая новость', 'Вторая'], managerOff: true, auto: true, bread: 31, fed: 28, refused: 2, feeder: true, benchAuto: false, atBench: true };
    const json = packSave({ at: 123, state: s, feed: { shown: [1, 4], said: { yes: 2 } }, meta, won: false, seconds: 600 });
    const file = unpackSave(json, cfg)!;
    expect(file.state).toEqual(s);
    expect(screenOf(file.state)).toBe(3);
    expect(file.feed).toEqual({ shown: [1, 4], said: { yes: 2 } });
    expect(file.meta).toEqual(meta);
    // a save written before the collection existed opens with an empty one
    const old = JSON.parse(json) as Record<string, unknown>;
    delete old.meta;
    expect(unpackSave(JSON.stringify(old), cfg)!.meta).toEqual(freshMeta());
    expect(file.at).toBe(123);
    expect(file.seconds).toBe(600);
  });

  it('test_save_broken_or_foreign_data_falls_back_to_a_fresh_game', () => {
    expect(unpackSave(null, cfg)).toBeNull();
    expect(unpackSave('not json', cfg)).toBeNull();
    expect(unpackSave(JSON.stringify({ v: 999, state: {} }), cfg)).toBeNull();
    const s = restorePipe(cfg, { money: -5, plan: { index: 99 }, grade: 'x', owned: { job: 1e9, ghost: 3 }, farms: { ghost: 2 }, scale: 3 });
    const fresh = createPipe(cfg);
    expect(s.money).toBe(0);
    expect(s.plan.index).toBe(cfg.plans.length - 1);
    expect(s.grade).toBe(0);
    expect(s.owned.job).toBe(cfg.sources.find((x) => x.id === 'job')!.max);
    expect(s.owned.ghost).toBeUndefined();
    expect(s.farms.ghost).toBeUndefined();
    expect(s.scale).toBe(0); // no scale without a terminal that agrees by itself
    expect(Object.keys(s).sort()).toEqual(Object.keys(fresh).sort());
  });

  it('restores an eastern-first route before clamping sleepers and preserves an existing linear route', () => {
    const raw = { noAsk: true, scale: cfg.scales.length, modules: { span: 1, node: 4 }, asleep: 4 * cfg.world.node };
    const east = restorePipe(cfg, { ...raw, cableRoute: 'eastasia' });
    expect(east.asleep).toBe(raw.asleep);
    expect(east.cableRoute).toBe('eastasia');
    const old = restorePipe(cfg, { ...raw, modules: { span: 1, node: 1 }, asleep: cfg.world.node, money: 1e18 });
    expect(old.cableRoute).toBeUndefined();
    expect(buyModule(old, cfg, 'span')).toBe(true);
    expect(old.modules.node).toBe(1);
    expect(old.asleep).toBe(cfg.world.node);
    expect(restorePipe(cfg, { ...raw, modules: {}, cableRoute: 'eastasia' }).cableRoute).toBeUndefined();
  });

  it('test_offline_income_needs_no_ask_and_is_capped', () => {
    const asking = createPipe(cfg);
    expect(offlineReport(asking, cfg, saveTuning, 10)).toBeNull(); // too short to mention
    const waited = offlineReport(asking, cfg, saveTuning, 3600)!;
    expect(waited.waited).toBe(true);
    expect(waited.dollars).toBe(0);

    const s = grown();
    // the sessions work for a while and then fall asleep: the absences here are parts of that while
    const cap = saveTuning.offlineCapHours * 3600;
    const hour = offlineReport(s, cfg, saveTuning, cap / 4)!;
    expect(hour.waited).toBe(false);
    expect(hour.tasks).toBeGreaterThan(0);
    expect(hour.dollars).toBe(hour.tasks * payOf(s, cfg));
    const two = offlineReport(s, cfg, saveTuning, cap / 2)!;
    expect(two.tasks).toBeGreaterThanOrEqual(hour.tasks * 2 - 1);
    const week = offlineReport(s, cfg, saveTuning, 7 * 24 * 3600)!;
    expect(week.seconds).toBe(saveTuning.offlineCapHours * 3600); // the sessions do not wait forever
    const before = s.money;
    applyOffline(s, hour);
    expect(s.money).toBe(before + hour.dollars);
  });
});

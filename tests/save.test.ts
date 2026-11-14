import { describe, expect, it } from 'vitest';
import autoData from '../src/data/balance/auto.json';
import chipData from '../src/data/balance/chips.json';
import farmData from '../src/data/balance/farms.json';
import gradeData from '../src/data/balance/grades.json';
import lineData from '../src/data/balance/lines.json';
import managerData from '../src/data/balance/managers.json';
import moduleData from '../src/data/balance/modules.json';
import netData from '../src/data/balance/net.json';
import planData from '../src/data/balance/plans.json';
import policeData from '../src/data/balance/police.json';
import scaleData from '../src/data/balance/scales.json';
import sourceData from '../src/data/balance/sources.json';
import gridData from '../src/data/tuning/grid.json';
import worldData from '../src/data/tuning/world.json';
import tuningData from '../src/data/tuning/pipeline.json';
import saveTuning from '../src/data/tuning/save.json';
import type { Plan } from '../src/systems/plan/plan';
import {
  buyFarm,
  buyGrade,
  buyManager,
  buyNoAsk,
  buyPlan,
  buyScale,
  buySource,
  buySubagent,
  createPipe,
  payOf,
  screenOf,
  type Farm,
  type Line,
  type Module,
  type PipeConfig,
  type Source,
} from '../src/systems/pipeline/pipeline';
import { applyOffline, freshMeta, offlineReport, packSave, restorePipe, unpackSave } from '../src/systems/save/save';

const cfg: PipeConfig = {
  tuning: tuningData,
  plans: planData as Plan[],
  sources: sourceData as Source[],
  grades: gradeData,
  farms: farmData as Farm[],
  scales: scaleData,
  managers: managerData,
  lines: lineData as Line[],
  police: policeData,
  modules: moduleData as Module[],
  net: netData,
  chips: chipData,
  grid: gridData,
  world: worldData,
  auto: autoData,
};

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
  it('test_save_round_trip_keeps_the_whole_game', () => {
    const s = grown();
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

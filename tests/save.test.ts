import { describe, expect, it } from 'vitest';
import autoData from '../src/data/balance/auto.json';
import farmData from '../src/data/balance/farms.json';
import gradeData from '../src/data/balance/grades.json';
import planData from '../src/data/balance/plans.json';
import scaleData from '../src/data/balance/scales.json';
import sourceData from '../src/data/balance/sources.json';
import tuningData from '../src/data/tuning/pipeline.json';
import saveTuning from '../src/data/tuning/save.json';
import type { Plan } from '../src/systems/plan/plan';
import {
  buyFarm,
  buyGrade,
  buyNoAsk,
  buyPlan,
  buyScale,
  buySource,
  buySubagent,
  createPipe,
  payOf,
  screenOf,
  type Farm,
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
  return s;
}

describe('save', () => {
  it('test_save_round_trip_keeps_the_whole_game', () => {
    const s = grown();
    const meta = { legends: ['rust'], awards: ['first_yes', 'no_ask'], piles: 4, reports: 1 };
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
    const hour = offlineReport(s, cfg, saveTuning, 3600)!;
    expect(hour.waited).toBe(false);
    expect(hour.tasks).toBeGreaterThan(0);
    expect(hour.dollars).toBe(hour.tasks * payOf(s, cfg));
    const two = offlineReport(s, cfg, saveTuning, 7200)!;
    expect(two.tasks).toBeGreaterThanOrEqual(hour.tasks * 2 - 1);
    const week = offlineReport(s, cfg, saveTuning, 7 * 24 * 3600)!;
    expect(week.seconds).toBe(saveTuning.offlineCapHours * 3600); // the sessions do not wait forever
    const before = s.money;
    applyOffline(s, hour);
    expect(s.money).toBe(before + hour.dollars);
  });
});

import { describe, expect, it } from 'vitest';
import {
  benchBottleneck,
  bestAllowance,
  farmSessions,
  fleetReadings,
  globeReadings,
  hubReadings,
  labShown,
  towerReadings,
} from '../src/game/logic/readings';
import { createPipe } from '../src/systems/pipeline/pipeline';
import { createBench } from '../src/systems/bench/bench';
import benchData from '../src/data/tuning/bench.json';
import { cfg } from './fixtures/pipe';

describe('values computed for the game screens', () => {
  it('estimates the best allowance using income lost, prices preserved and extra orders', () => {
    const tuning = { ...cfg.tuning, allowanceLevels: 2, allowance: 0.12, slump: 0.1, orders: 2 };
    expect(bestAllowance(tuning, 1, 'claude')).toBe(0);
    expect(bestAllowance(tuning, 1, 'tasks')).toBe(2);
    expect(bestAllowance(tuning, 0, 'tasks')).toBe(0);
  });

  it('counts sessions in the selected farms and compares fleet production with wear', () => {
    const s = createPipe(cfg);
    const [farm, missing] = cfg.farms;
    s.farms[farm.id] = 3;
    expect(farmSessions(s, cfg, [farm.id, missing.id])).toBe(farm.sessions * 3);
    expect(fleetReadings(s, cfg)).toEqual({ working: 0, made: 0, broken: 0, shortage: null });
    const employer = cfg.sources.find((x) => x.made === 'android')!;
    s.owned[employer.id] = 2;
    const fleet = fleetReadings(s, cfg);
    expect(fleet.working).toBe(2 * employer.staff!);
    expect(fleet.broken).toBe(fleet.working * cfg.tuning.wear);
    expect(fleet.shortage).toBe('android');
    const line = cfg.lines.find((x) => x.kind === 'android')!;
    s.lines[line.id] = Math.ceil(fleet.broken / line.rate) + 1;
    expect(fleetReadings(s, cfg).shortage).toBeNull();
  });

  it('maps the work in progress, the park and pickets to their actual employers', () => {
    const s = createPipe(cfg);
    const stage = cfg.police.screen;
    const [a, b, c] = cfg.sources;
    const config = {
      ...cfg,
      sources: [
        { ...a, screen: stage, max: 2, work: 8 },
        { ...b, screen: stage, max: 3, work: 4 },
        { ...c, screen: stage, max: 1, made: 'android' as const },
        { ...c, id: 'elsewhere', screen: stage + 1 },
      ],
    };
    s.owned = { [a.id]: 1 };
    s.jobs = [{ id: a.id, total: 8, left: 4 }];
    s.strikes = [a.id];
    s.police = 2;
    const view = hubReadings(s, config, stage, 12);
    expect(view).toMatchObject({
      floors: { [a.id]: 0.75, [b.id]: 0, [c.id]: 0 },
      dogs: { [a.id]: 2, [b.id]: 0 },
      live: { [a.id]: true, [c.id]: true },
      rest: 0,
      picket: true,
      struck: { [a.id]: true },
      guards: 2,
    });
    expect(view.floors).not.toHaveProperty('elsewhere');
    s.allowance = 1;
    s.owned[c.id] = 1;
    const paid = hubReadings(s, config, stage, 12);
    expect(paid.rest).toBe(4);
    expect(paid.live[c.id]).toBeUndefined();
    expect(paid.picket).toBe(false);
    expect(hubReadings(s, config, stage + 4, 12)).toMatchObject({ rest: 0, guards: 0, floors: {} });
  });

  it('converts sleepers into towers and world nodes while reporting actual construction capacity', () => {
    const s = createPipe(cfg);
    const unit = cfg.grid.unit;
    s.noAsk = true;
    s.scale = cfg.grid.screen - 2;
    s.queue = 2 * unit;
    expect(towerReadings(s, cfg)).toMatchObject({ asleep: 0, queue: 2, lab: -1, next: false });
    s.lab = cfg.chips[0].need * 0.3;
    expect(towerReadings(s, cfg).lab).toBeCloseTo(0.3);
    s.lab = 0;
    s.chips = 1;
    expect(labShown(s, cfg)).toBe(true);
    s.chips = cfg.chips.length;
    expect(labShown(s, cfg)).toBe(false);
    s.scale = cfg.world.screen - 2;
    const quarter = (cfg.grid.blocks.reduce((a, b) => a + b, 0) + cfg.grid.pilot) * unit;
    s.asleep = quarter + cfg.world.node / 2;
    s.modules = { span: 1, node: 1, thread: 2, ark: 1 };
    const model = globeReadings(s, cfg, 'wire', false);
    expect(model).toMatchObject({
      spans: 1,
      nodes: 1,
      threads: 2,
      asleep: 0.5,
      hot: true,
      gone: true,
      canNode: true,
      canSpan: true,
      lab: -1,
    });
    expect(globeReadings(s, cfg, 'none', true).gone).toBe(false);
    s.chips = 0;
    expect(globeReadings(s, { ...cfg, modules: [] }, 'none', false)).toMatchObject({
      spans: 0,
      canNode: false,
      canSpan: false,
      lab: 0,
    });
  });

  it('identifies a hungry bird, empty loaf or overloaded player even while automation is on', () => {
    const b = createBench(benchData);
    const read = () => benchBottleneck(b, 10);
    expect(read()).toBe('none');
    b.thrown = 1;
    expect(read()).toBe('birds');
    b.waiting = 5;
    expect(read()).toBe('none');
    b.waiting = 7;
    expect(read()).toBe('you');
    b.auto = true;
    expect(read()).toBe('none');
    b.loaf = 0;
    expect(read()).toBe('bread');
  });
});

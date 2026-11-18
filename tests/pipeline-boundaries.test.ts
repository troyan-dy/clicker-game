import { describe, expect, it } from 'vitest';
import { cfg } from './fixtures/pipe';
import {
  aimAt,
  bribeCost,
  buyFarm,
  buyModule,
  buyPolice,
  buySource,
  createPipe,
  discount,
  finished,
  gradeCost,
  housed,
  labOf,
  moduleRoom,
  podsOf,
  replacedOf,
  riot,
  robotsOf,
  scaleCost,
  shareOf,
  sourceCost,
  sourceInflow,
  stepPipe,
  takeChip,
  targetOf,
  unemploymentOf,
  wearOf,
  whole,
  workOf,
} from '../src/systems/pipeline/pipeline';
import { connectedPilot, routeRegion } from '../src/systems/pipeline/worldRoute';

describe('workforce and purchases', () => {
  it('treats missing ownership as zero and counts only newly replaced workers', () => {
    const employer = { ...cfg.sources[0], start: 1, max: 3, staff: 12, full: undefined };
    const freelance = { ...cfg.sources[1], start: 0, staff: undefined };
    const balance = { ...cfg, sources: [employer, freelance] };
    const s = createPipe(balance);
    s.owned = {};
    expect(whole(s, employer)).toBe(false);
    expect(workOf(s, balance)).toBe(0);
    expect(replacedOf(s, balance)).toBe(0);
    s.money = sourceCost(s, balance, freelance);
    expect(buySource(s, balance, freelance.id)).toBe(true);
    expect(s.money).toBe(0);
    s.owned[employer.id] = employer.max;
    expect(replacedOf(s, balance)).toBe(24);
    expect(sourceInflow(employer, employer.max)).toBe(3 * employer.inflow);
    expect(bribeCost(s, balance, employer)).toBe(0);
  });

  it('applies the full limit discount only after a contract replaces its workforce', () => {
    const employer = {
      ...cfg.sources[0],
      start: 0,
      max: 1,
      screen: 3,
      perk: { kind: 'limit' as const, value: 1, text: '' },
    };
    const balance = { ...cfg, sources: [employer] };
    const s = createPipe(balance);
    s.noAsk = true;
    s.scale = 1;
    s.owned = {};
    expect(unemploymentOf(s, balance)).toBe(0);
    expect(discount(s, balance, 'limit')).toBe(1);
    s.owned[employer.id] = 1;
    expect(discount(s, balance, 'limit')).toBe(0);
    expect(unemploymentOf(s, balance)).toBe(1);
  });

  it('starts counting market share on the planet and caps it at one hundred percent', () => {
    const s = createPipe(cfg);
    s.scale = cfg.tuning.shareFrom - 1;
    s.farms.quota = 2;
    expect(shareOf(s, cfg)).toBe(0);
    s.scale++;
    expect(shareOf(s, cfg)).toBe(cfg.tuning.shareBase + 16);
    s.farms.quota = 100;
    expect(shareOf(s, cfg)).toBe(100);
  });

  it('refuses unknown, premature and exhausted purchases without charging', () => {
    const s = createPipe(cfg);
    s.money = 1e20;
    s.grade = cfg.grades.length - 1;
    expect(gradeCost(s, cfg)).toBe(Infinity);
    expect(buySource(s, cfg, 'missing')).toBe(false);
    expect(buyFarm(s, cfg, 'missing')).toBe(false);
    expect(buyModule(s, cfg, 'missing')).toBe(false);
    expect(buyModule(s, cfg, 'block')).toBe(false);
    expect(moduleRoom(s, cfg, cfg.modules[0])).toBe(0);
    s.police = cfg.police.max;
    expect(buyPolice(s, cfg)).toBe(false);
    s.scale = cfg.scales.length;
    expect(scaleCost(s, cfg)).toBe(Infinity);
    expect(s.money).toBe(1e20);
  });

  it('retires obsolete squads without awarding another unit or a completion', () => {
    const s = createPipe(cfg);
    const src = cfg.sources.find((x) => x.work)!;
    s.owned[src.id] = src.max;
    s.jobs = [src.id, 'removed'].map((id) => ({ id, left: 1, total: 2 }));
    expect(stepPipe(s, cfg, 1).done).toEqual([]);
    expect(s.jobs).toEqual([]);
    expect(s.owned[src.id]).toBe(src.max);
    expect(s.owned).not.toHaveProperty('removed');
  });

  it('targets only unfinished jobs for the right robots and falls back in contract order', () => {
    const s = createPipe(cfg);
    const [first, second] = cfg.sources.filter((src) => src.made === 'android');
    expect(targetOf(s, cfg, 'android')).toBe(first);
    expect(aimAt(s, cfg, cfg.sources[0].id)).toBe(false);
    expect(aimAt(s, cfg, second.id)).toBe(true);
    expect(targetOf(s, cfg, 'android')).toBe(second);
    s.owned[second.id] = second.max;
    expect(aimAt(s, cfg, second.id)).toBe(false);
    expect(targetOf(s, cfg, 'android')).toBe(first);
    for (const src of cfg.sources.filter((x) => x.made === 'android')) s.owned[src.id] = src.max;
    expect(targetOf(s, cfg, 'android')).toBeUndefined();
  });

  it('accounts for staffing, wear and spare production when a workforce starts empty', () => {
    const employer = { ...cfg.sources.find((x) => x.made === 'android')!, max: 2, staff: 5 };
    const vacant = { ...employer, id: 'vacant', staff: undefined };
    const balance = { ...cfg, sources: [vacant, employer], tuning: { ...cfg.tuning, wear: 0 } };
    const s = createPipe(balance);
    s.owned = {};
    s.lines.android = 1;
    expect(robotsOf(s, balance, 'android')).toBe(0);
    expect(riot(s, balance, 0.1)).toBe(0);
    delete s.owned[employer.id];
    expect(stepPipe(s, balance, 1).done).toEqual([employer.id]);
    expect(robotsOf(s, balance, 'android')).toBe(10);
    expect(wearOf(s, { ...balance, tuning: cfg.tuning }, 'android')).toBe(10 * cfg.tuning.wear);
    expect(stepPipe(s, balance, 1).done).toEqual([]);
    expect(s.owned[employer.id]).toBe(2);
  });
});

describe('grid milestones', () => {
  it('finishes a shorter campaign at its actual last employer or housing milestone', () => {
    const balance = {
      ...cfg,
      scales: cfg.scales.slice(0, 1),
      sources: cfg.sources.filter((x) => x.id === 'vector'),
    };
    const s = createPipe(balance);
    s.noAsk = true;
    s.scale = 1;
    expect(finished(s, balance)).toBe(false);
    s.owned.vector = balance.sources[0].max;
    expect(finished(s, balance)).toBe(true);
    const quarter = { ...cfg, scales: cfg.scales.slice(0, cfg.grid.screen - 2) };
    s.scale = quarter.scales.length;
    expect(finished(s, quarter)).toBe(false);
    s.modules.block = cfg.grid.blocks.length;
    s.asleep = podsOf(s, quarter);
    expect(housed(s, quarter)).toBe(true);
    expect(finished(s, quarter)).toBe(true);
  });

  it('requires both finished housing and the final sleeper for the last chip', () => {
    const s = createPipe(cfg);
    s.noAsk = true;
    s.scale = cfg.world.screen - 2;
    s.chips = cfg.chips.length - 1;
    s.lab = 77;
    s.modules.span = cfg.world.regions.length;
    s.modules.block = cfg.grid.blocks.length;
    s.modules.node = cfg.world.regions.reduce((sum, size) => sum + size, 0);
    const capacity = podsOf(s, cfg);
    s.asleep = capacity / 2;
    expect(labOf(s, cfg)).toBe(0.5);
    expect(takeChip(s, cfg)).toBeUndefined();
    s.asleep = capacity * 0.998;
    expect(labOf(s, cfg)).toBe(0.99);
    s.asleep = capacity;
    expect(takeChip(s, cfg)).toBe(cfg.chips.at(-1));
    expect(s.lab).toBe(77);
    expect(labOf(s, cfg)).toBe(0);
  });

  it('pays no tower production during a processing outage', () => {
    const s = createPipe(cfg);
    s.noAsk = true;
    s.scale = cfg.grid.screen - 2;
    const before = s.money;
    expect(stepPipe(s, cfg, 3, true).subagents).toBe(0);
    expect(s.money).toBe(before);
    expect(stepPipe(s, cfg, 3).subagents).toBeGreaterThan(0);
    expect(s.money).toBeGreaterThan(before);
  });

  it('keeps the old route order and connects the free pilot only once Siberia is reached', () => {
    for (const route of [undefined, 'siberia', 'eastasia'] as const) {
      expect([0, 1, 2, 3].map((n) => routeRegion(route, n))).toEqual(
        route === 'eastasia' ? [0, 2, 1, 3] : [0, 1, 2, 3],
      );
    }
    expect(connectedPilot(undefined, 8)).toBe(false);
    expect(connectedPilot('siberia', 0)).toBe(false);
    expect(connectedPilot('siberia', 1)).toBe(true);
    expect(connectedPilot('eastasia', 1)).toBe(false);
    expect(connectedPilot('eastasia', 2)).toBe(true);
  });
});

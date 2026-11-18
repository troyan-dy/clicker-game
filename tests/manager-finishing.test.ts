import { describe, expect, it } from 'vitest';
import { cfg } from './fixtures/pipe';
import { planManager } from '../src/systems/manager/manager';
import { createPipe, type PipeConfig } from '../src/systems/pipeline/pipeline';

function atScreen(screen: number, balance: PipeConfig) {
  const s = createPipe(balance);
  s.noAsk = true;
  s.scale = screen - 2;
  s.grade = balance.grades.length - 1;
  s.plan.index = balance.plans.length - 1;
  return s;
}

describe('manager production decisions', () => {
  it('buys permission before deploying the only squad and waits once the contract is secured', () => {
    const employer = {
      ...cfg.sources.find((x) => x.bribe)!,
      max: 1,
      price: 100,
      growth: 1,
      bribe: 40,
      work: 2,
    };
    const balance = {
      ...cfg,
      sources: [cfg.sources[0], employer],
      farms: [],
      lines: [],
      scales: cfg.scales.map((scale, i) => (i === 3 ? { ...scale, price: 500, needs: 1 } : scale)),
    };
    const s = atScreen(5, balance);
    delete s.owned[employer.id];
    s.money = 640;
    const before = structuredClone(s);
    const bribe = planManager(s, balance);
    expect(bribe).toMatchObject({ key: 'bribe:' + employer.id, purpose: 'work', affordable: true });
    expect(s).toEqual(before);
    s.bribed[employer.id] = true;
    s.money -= 40;
    expect(planManager(s, balance)?.key).toBe('src:' + employer.id);
    s.owned[employer.id] = 1;
    expect(planManager(s, balance)).toBeNull();
  });

  it('counts only staffed factory jobs and starts a line before buying capacity for finished ones', () => {
    const contract = { ...cfg.sources.find((x) => x.made === 'android')!, max: 1, staff: 100 };
    const empty = { ...contract, id: 'empty', staff: undefined, max: 0 };
    const line = { ...cfg.lines[0], rate: 2, price: 5, growth: 1 };
    const balance = {
      ...cfg,
      sources: [cfg.sources[0], contract, empty],
      lines: [line],
      farms: [],
      scales: cfg.scales.map((scale, i) => (i === 4 ? { ...scale, price: 100, needs: 2 } : scale)),
    };
    const s = atScreen(6, balance);
    s.money = 100;
    expect(planManager(s, balance)).toMatchObject({
      key: 'line:' + line.id,
      purpose: 'build',
      affordable: true,
    });
    s.lines[line.id] = 1;
    s.owned[contract.id] = contract.max;
    expect(planManager(s, balance)).toBeNull();
  });

  it.each([0.5, undefined])(
    'completes eastern sites with a %s construction factor and preserves the player’s first route choice',
    (eastSitePrice) => {
      const balance = {
        ...cfg,
        modules: cfg.modules.map((m) => (m.kind === 'node' ? { ...m, eastSitePrice } : m)),
      };
      const s = atScreen(cfg.world.screen, balance);
      s.money = 1e21;
      s.modules.block = cfg.grid.blocks.length;
      const before = structuredClone(s);
      const first = planManager(s, balance);
      expect(first).toMatchObject({ key: 'mod:node', affordable: true });
      expect(s).toEqual(before);
      s.cableRoute = 'eastasia';
      s.modules.span = 1;
      const next = planManager(s, balance);
      expect(next).toMatchObject({ key: 'mod:node', purpose: 'build', affordable: true });
    },
  );
});

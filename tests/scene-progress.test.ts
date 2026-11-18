import { describe, expect, it } from 'vitest';
import {
  chooseBird,
  earnAwards,
  hasAcquired,
  pickIncomingSource,
  statistic,
} from '../src/game/logic/progress';
import { AWARDS } from '../src/content/awards';
import { createRng } from '../src/core/rng';
import { createPipe, podsOf } from '../src/systems/pipeline/pipeline';
import { freshMeta } from '../src/systems/save/save';
import { cfg } from './fixtures/pipe';

describe('world progress', () => {
  it('looks up per-employer counts and distinguishes starting work from purchased work', () => {
    const s = createPipe(cfg),
      m = freshMeta();
    const stat = (key: string) => statistic(s, cfg, m, 2, 0, key);
    const has = (key: string) => hasAcquired(s, cfg, key);
    const module = cfg.modules[0].id,
      dial = cfg.net[0].id;
    const chip = cfg.chips[0].id;
    for (const id of ['job', 'sub', 'grade', 'plan', module, dial, chip, 'rack', 'missing'])
      expect(has(id)).toBe(false);
    s.owned = { job: 2, vector: 4, cats: 1 };
    s.farms.rack = 2;
    s.subagents = s.grade = s.plan.index = s.modules[module] = s.net[dial] = s.chips = 1;
    for (const id of ['job', 'sub', 'grade', 'plan', module, dial, chip, 'rack'])
      expect(has(id)).toBe(true);
    expect(
      [
        'own:job',
        'own:missing',
        'farm:rack',
        'farm:missing',
        'hired:3',
        'full:3',
        'whole',
        'unknown',
      ].map(stat),
    ).toEqual([2, 0, 2, 0, 2, 1, 1, 0]);
    s.closedHere = 4;
    s.closedBySubagents = 5;
    m.bread = 13;
    expect(['closed', 'bread', 'noask', 'allowance', 'feeder'].map(stat)).toEqual([9, 13, 0, 0, 0]);
  });

  it('unlocks endgame achievements on their screens and counts installed upgrades', () => {
    const s = createPipe(cfg),
      m = freshMeta();
    const stat = (stage: number, key: string) => statistic(s, cfg, m, stage, 4, key);
    expect(stat(6, 'housed')).toBe(0);
    expect(stat(7, 'housed')).toBe(0);
    expect(stat(8, 'planet')).toBe(0);
    s.noAsk = m.feeder = true;
    s.allowance = 2;
    s.scale = cfg.world.screen - 2;
    s.modules = {
      block: cfg.grid.blocks.length,
      span: cfg.world.regions.length,
      node: cfg.world.regions.reduce((a, b) => a + b, 0),
      ark: 1,
    };
    s.net = Object.fromEntries(cfg.net.map((n) => [n.id, 2]));
    s.asleep = podsOf(s, cfg);
    expect(
      ['housed', 'planet', 'ring', 'ark', 'feeder', 'noask', 'allowance', 'swaps', 'net'].map((k) =>
        stat(8, k),
      ),
    ).toEqual([1, 1, 1, 1, 1, 1, 1, 4, cfg.net.length * 2]);
  });

  it('announces each award once when its threshold is met', () => {
    const [first, second, third] = AWARDS;
    const earned = [first.id];
    const awards = [
      first,
      { ...second, stat: 'progress', min: 5 },
      { ...third, stat: 'progress', min: 6 },
    ];
    expect(earnAwards(awards, earned, () => 5)).toEqual([awards[1]]);
    expect(earnAwards(awards, earned, () => 6)).toEqual([awards[2]]);
    expect(earned).toEqual([first.id, second.id, third.id]);
  });

  it('weights incoming tasks by purchases times inflow and skips missing employers', () => {
    const [a, b, c] = cfg.sources;
    const owned = { [b.id]: 2, [c.id]: 1 };
    const candidates = [a, b, c];
    const rng = createRng(5);
    expect(pickIncomingSource({}, candidates, rng)).toBeUndefined();
    expect(pickIncomingSource(owned, candidates, { ...rng, range: () => 2 * b.inflow })).toBe(b);
    expect(
      pickIncomingSource(owned, candidates, { ...rng, range: (_min, max) => max - 0.0001 }),
    ).toBe(c);
  });

  it.each([
    [0, 0, 'pigeon'],
    [5, 0, 'pigeon'],
    [6, 0.35, 'sparrow'],
    [24, 0.01, 'sparrow'],
    [25, 0.15, 'duck'],
    [59, 0.05, 'duck'],
    [60, 0.059, 'seagull'],
    [60, 0.06, 'duck'],
    [60, 0.16, 'sparrow'],
    [60, 0.36, 'pigeon'],
  ] as const)('after %i throws and a roll of %f the park gets a %s', (n, r, bird) =>
    expect(chooseBird(n, r)).toBe(bird),
  );
});

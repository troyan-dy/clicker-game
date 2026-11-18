import { describe, expect, it } from 'vitest';
import { cfg } from './fixtures/pipe';
import { boughtInShortage, buyOnStage, employersOnOffer } from '../src/game/logic/market';
import { bribeCost, createPipe, sourceCost } from '../src/systems/pipeline/pipeline';

function funded(stage: number) {
  const s = createPipe(cfg);
  s.noAsk = stage >= 2;
  s.scale = Math.max(0, stage - 2);
  s.money = 1e23;
  return s;
}

describe('the shop on the current screen', () => {
  const farm = cfg.farms[0];
  const line = cfg.lines[0];
  const bribe = cfg.sources.find((x) => x.bribe)!;
  const hire = cfg.modules.find((x) => x.kind === 'hire')!;
  const thread = cfg.modules.find((x) => x.kind === 'thread')!;
  const dial = cfg.net[0];
  it.each([
    ['src:job', 1],
    ['src:job', 2],
    ['farm:' + farm.id, farm.screen],
    ['line:' + line.id, line.screen],
    ['bribe:' + bribe.id, bribe.screen],
    ['mod:' + hire.id, cfg.grid.screen],
    ['mod:' + thread.id, cfg.world.screen],
    ['net:' + dial.id, cfg.grid.screen],
    ['net:' + dial.id, cfg.world.screen],
    ['police', cfg.police.screen],
    ['plan', 1],
    ['noask', 1],
    ['sub', 2],
    ['grade', 2],
    ['scale', 2],
    ['manager', 2],
  ] as const)('sells %s on screen %i', (key, stage) => {
    const s = funded(stage);
    s.money = 1e20;
    if (stage < 3) s.money = 1e9;
    const before = structuredClone(s);
    expect(buyOnStage(s, cfg, stage, key, false)).toBe(true);
    expect(s.money).toBeLessThan(before.money);
  });

  it.each([
    ['src:missing', 1],
    ['src:job', 3],
    ['farm:missing', 1],
    ['farm:' + farm.id, 1],
    ['line:missing', 1],
    ['line:' + line.id, 1],
    ['bribe:missing', 1],
    ['bribe:' + bribe.id, 1],
    ['mod:missing', 1],
    ['mod:' + hire.id, 1],
    ['route:siberia', 1],
    ['net:' + dial.id, 6],
    ['police', 1],
    ['noask', 2],
    ['sub', 3],
    ['grade', 1],
    ['scale', 1],
    ['manager', 1],
    ['invalid', 1],
  ] as const)('rejects %s on screen %i without changing the balance', (key, stage) => {
    const s = funded(stage);
    const before = structuredClone(s);
    expect(buyOnStage(s, cfg, stage, key, false)).toBe(false);
    expect(s).toEqual(before);
  });

  it.each(['siberia', 'eastasia'])('reserves the initial %s route for the player', (route) => {
    const stage = cfg.world.screen;
    const s = funded(stage);
    expect(buyOnStage(s, cfg, stage, 'route:' + route, true)).toBe(false);
    expect(s.modules.span).toBeUndefined();
    expect(buyOnStage(s, cfg, stage, 'route:' + route, false)).toBe(true);
    expect(s.cableRoute).toBe(route);
  });

  it('rejects a future or exhausted plan even when the command bypasses the shop row', () => {
    const s = funded(2);
    const future = cfg.plans.findIndex((x) => x.screen === 4);
    s.plan.index = future - 1;
    expect(buyOnStage(s, cfg, 2, 'plan', false)).toBe(false);
    expect(s.plan.index).toBe(future - 1);
    expect(buyOnStage(s, cfg, 4, 'plan', false)).toBe(true);
    expect(buyOnStage(s, cfg, 4, 'plan', false)).toBe(false);
  });

  it('orders remaining contracts by the cost of their next required action', () => {
    const s = funded(bribe.screen);
    const sources = cfg.sources.filter((x) => x.screen === bribe.screen);
    const [busy, full, ...rest] = sources.filter((x) => x.id !== bribe.id);
    s.jobs.push({ id: busy.id, left: 1, total: 1 });
    s.owned[full.id] = full.max;
    const expected = [bribe, ...rest]
      .filter((x) => !x.made)
      .sort((a, b) => {
        const cost = (x: typeof a) =>
          x.bribe && !s.bribed[x.id] ? bribeCost(s, cfg, x) : sourceCost(s, cfg, x);
        return cost(a) - cost(b);
      });
    expect(employersOnOffer(s, cfg, bribe.screen)).toEqual(expected);
    expect(employersOnOffer(s, cfg, line.screen)).toEqual([]);
    s.bribed[bribe.id] = true;
    delete s.owned[bribe.id];
    const unlocked = employersOnOffer(s, cfg, bribe.screen);
    expect(unlocked).toContain(bribe);
    const open = unlocked.filter((x) => !x.bribe || s.bribed[x.id]);
    expect(open.map((x) => sourceCost(s, cfg, x))).toEqual(
      open.map((x) => sourceCost(s, cfg, x)).sort((a, b) => a - b),
    );
  });
});

it('recognizes shortages only for farms and production lines above the commentary threshold', () => {
  const s = createPipe(cfg);
  expect(boughtInShortage(s, 'farm:rack')).toBe(false);
  s.surge.rack = 1.3;
  expect(boughtInShortage(s, 'farm:rack')).toBe(false);
  s.surge.rack = 1.31;
  expect(boughtInShortage(s, 'line:rack')).toBe(true);
  expect(boughtInShortage(s, 'src:rack')).toBe(false);
});

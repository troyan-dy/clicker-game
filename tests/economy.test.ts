import { describe, expect, it } from 'vitest';
import autoData from '../src/data/balance/auto.json';
import planData from '../src/data/balance/plans.json';
import sourceData from '../src/data/balance/sources.json';
import tuningData from '../src/data/tuning/pipeline.json';
import type { Plan } from '../src/systems/plan/plan';
import {
  buyBrick,
  buyNoAsk,
  buyPlan,
  buySource,
  buySubagent,
  claudeRate,
  createPipe,
  inflowOf,
  pressPipe,
  sourcePrice,
  stepPipe,
  subagentPrice,
  subagentRate,
  type PipeConfig,
  type Source,
} from '../src/systems/pipeline/pipeline';

const cfg: PipeConfig = {
  tuning: tuningData,
  plans: planData as Plan[],
  sources: sourceData as Source[],
  auto: autoData,
};
const FINGER = 5; // presses per second of a player who keeps mashing

/**
 * A bot that always buys what removes the current bottleneck — the pace of the first minutes
 * in numbers. Prints the purchase log; fails if the opening drags.
 */
function play(seconds: number): { t: number; what: string }[] {
  const s = createPipe(cfg);
  const log: { t: number; what: string }[] = [];
  const dt = 1 / 60;
  let untilPress = 0;
  for (let i = 0; i < seconds * 60; i++) {
    const t = i / 60;
    stepPipe(s, cfg, dt);
    untilPress -= dt;
    if (untilPress <= 0) {
      pressPipe(s, cfg);
      untilPress += 1 / FINGER;
    }
    if (i % 30 !== 0) continue; // the bot shops twice a second

    const inflow = inflowOf(s, cfg);
    const hands = s.noAsk ? Infinity : s.brick ? Math.max(FINGER, cfg.auto.brick.rate) : FINGER;
    const mine = Math.min(claudeRate(s, cfg), hands);
    const capacity = mine + subagentRate(s, cfg);
    const note = (what: string): void => {
      log.push({ t, what: `${what} → вход ${inflowOf(s, cfg).toFixed(1)}/с, тариф ${cfg.plans[s.plan.index].name}, $${s.money.toFixed(0)}` });
    };

    if (inflow < capacity) {
      // not enough tasks: the cheapest inflow per dollar
      const best = cfg.sources
        .filter((x) => (s.owned[x.id] ?? 0) < x.max)
        .sort((a, b) => sourcePrice(a, s.owned[a.id]) / a.inflow - sourcePrice(b, s.owned[b.id]) / b.inflow)[0];
      if (best && buySource(s, cfg, best.id)) note(best.name);
    } else if (claudeRate(s, cfg) <= hands) {
      // Claude is the slow one: a faster plan, or one more session if that is cheaper
      const next = cfg.plans[s.plan.index + 1];
      if (next && next.price <= subagentPrice(cfg, s.subagents)) {
        if (buyPlan(s, cfg)) note(`тариф ${next.name}`);
      } else if (buySubagent(s, cfg)) note(`сабагент №${s.subagents}`);
    } else if (!s.brick) {
      if (buyBrick(s, cfg)) note('кирпич');
    } else if (buyNoAsk(s, cfg)) note('«не спрашивай»');
  }
  log.push({ t: seconds, what: `итог: $${s.money.toFixed(0)}, вход ${inflowOf(s, cfg).toFixed(1)}/с, сабагентов ${s.subagents}` });
  return log;
}

describe('economy', () => {
  it('test_economy_opening_does_not_drag', () => {
    const log = play(600);
    console.log(log.map((e) => `${String(Math.round(e.t)).padStart(4)} с  ${e.what}`).join('\n'));
    const first = log[0];
    const max5 = log.find((e) => e.what.startsWith('тариф Max 5x'));
    expect(first.t).toBeLessThanOrEqual(60); // the first purchase within a minute
    expect(max5?.t ?? Infinity).toBeLessThanOrEqual(180); // the first big upgrade within three minutes
    // no dead zone: never more than 2.5 minutes between purchases in the first ten minutes
    for (let i = 1; i < log.length - 1; i++) expect(log[i].t - log[i - 1].t).toBeLessThanOrEqual(150);
  });
});

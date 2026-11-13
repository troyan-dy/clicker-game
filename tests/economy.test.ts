import { describe, expect, it } from 'vitest';
import autoData from '../src/data/balance/auto.json';
import farmData from '../src/data/balance/farms.json';
import gradeData from '../src/data/balance/grades.json';
import planData from '../src/data/balance/plans.json';
import sourceData from '../src/data/balance/sources.json';
import tuningData from '../src/data/tuning/pipeline.json';
import type { Plan } from '../src/systems/plan/plan';
import {
  buyFarm,
  buyGrade,
  buyLlc,
  buyNoAsk,
  buyPlan,
  buySource,
  buySubagent,
  claudeRate,
  createPipe,
  farmPrice,
  inflowOf,
  payOf,
  pressPipe,
  sessionsOf,
  sourcePrice,
  stepPipe,
  subagentPrice,
  subagentRate,
  type PipeConfig,
  type Source,
} from '../src/systems/pipeline/pipeline';

const base: PipeConfig = {
  tuning: tuningData,
  plans: planData as Plan[],
  sources: sourceData as Source[],
  grades: gradeData,
  farms: farmData,
  auto: autoData,
};
const FINGER = 5; // presses per second of a player who keeps mashing

/**
 * A bot that always buys what removes the current bottleneck — the pace of the first minutes
 * in numbers. Prints the purchase log; fails if the opening drags.
 */
function play(seconds: number, cfg: PipeConfig = base): { t: number; what: string }[] {
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
    const hands = s.noAsk ? Infinity : FINGER;
    const screen = s.llc ? 3 : s.noAsk ? 2 : 1;
    const income = Math.min(inflow, claudeRate(s, cfg) + subagentRate(s, cfg)) * payOf(s, cfg);
    // the company of one: bought as soon as it costs less than a minute of income
    if (screen === 2 && cfg.auto.llc.price <= income * 60) {
      if (buyLlc(s, cfg)) log.push({ t, what: `ООО: город открыт, $${s.money.toFixed(0)}` });
      continue; // saving for it
    }
    // a promotion that pays back within a minute and a half is taken first (promotions are sold on the blueprint)
    const grade = cfg.grades[s.grade + 1];
    if (s.noAsk && grade) {
      const flow = Math.min(inflow, claudeRate(s, cfg) + subagentRate(s, cfg));
      const gain = flow * cfg.tuning.pay * (grade.mult - cfg.grades[s.grade].mult);
      if (grade.price / gain <= 90) {
        if (buyGrade(s, cfg)) log.push({ t, what: `повышение: ${grade.name} → $${payOf(s, cfg)} за задачу, $${s.money.toFixed(0)}` });
        continue; // saving for it
      }
    }

    const mine = Math.min(claudeRate(s, cfg), hands);
    const capacity = mine + subagentRate(s, cfg);
    const note = (what: string): void => {
      log.push({ t, what: `${what} → вход ${inflowOf(s, cfg).toFixed(1)}/с, сессий ${sessionsOf(s, cfg)}, $${s.money.toFixed(0)}` });
    };

    if (inflow < capacity) {
      // not enough tasks: the cheapest inflow per dollar
      const best = cfg.sources
        .filter((x) => (s.owned[x.id] ?? 0) < x.max && (screen === 3 ? x.screen === 3 : x.screen <= screen))
        .sort((a, b) => sourcePrice(a, s.owned[a.id]) / a.inflow - sourcePrice(b, s.owned[b.id]) / b.inflow)[0];
      if (best && buySource(s, cfg, best.id)) note(best.name);
    } else if (screen === 3) {
      // sessions are short: the farm that is cheapest per session among those affordable within 45 s
      const soon = s.money + income * 45;
      const farms = cfg.farms.map((f) => ({ f, price: farmPrice(f, s.farms[f.id] ?? 0) }));
      const best =
        farms.filter((x) => x.price <= soon).sort((a, b) => a.price / a.f.sessions - b.price / b.f.sessions)[0] ??
        farms.sort((a, b) => a.price - b.price)[0];
      if (buyFarm(s, cfg, best.f.id)) note(best.f.name);
    } else if (claudeRate(s, cfg) <= hands) {
      // Claude is the slow one: a faster plan or one more session — what can be afforded sooner
      const next = cfg.plans[s.plan.index + 1];
      const canHire = s.noAsk; // subagents live on the blueprint
      if (next && (!canHire || next.price <= subagentPrice(cfg, s.subagents))) {
        if (buyPlan(s, cfg)) note(`тариф ${next.name}`);
      } else if (buySubagent(s, cfg)) note(`сабагент №${s.subagents}`);
    } else if (buyNoAsk(s, cfg)) note('«не спрашивай»');
  }
  const hired = cfg.sources.filter((x) => x.screen === 3 && s.owned[x.id]).length;
  log.push({ t: seconds, what: `итог: $${s.money.toFixed(0)}, вход ${inflowOf(s, cfg).toFixed(1)}/с, сессий ${sessionsOf(s, cfg)}, компаний ${hired}` });
  return log;
}

describe('economy', () => {
  it('test_economy_opening_does_not_drag', () => {
    const log = play(1800);
    console.log(log.map((e) => `${String(Math.round(e.t)).padStart(4)} с  ${e.what}`).join('\n'));
    const first = log[0];
    const max5 = log.find((e) => e.what.startsWith('тариф Max 5x'));
    expect(first.t).toBeLessThanOrEqual(60); // the first purchase within a minute
    expect(max5?.t ?? Infinity).toBeLessThanOrEqual(180); // the first big upgrade within three minutes
    // no dead zone: never more than 2.5 minutes between purchases in the first half an hour
    for (let i = 1; i < log.length - 1; i++) expect(log[i].t - log[i - 1].t).toBeLessThanOrEqual(150);
  });
});

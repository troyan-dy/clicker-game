import { describe, expect, it } from 'vitest';
import autoData from '../src/data/balance/auto.json';
import farmData from '../src/data/balance/farms.json';
import gradeData from '../src/data/balance/grades.json';
import managerData from '../src/data/balance/managers.json';
import planData from '../src/data/balance/plans.json';
import scaleData from '../src/data/balance/scales.json';
import sourceData from '../src/data/balance/sources.json';
import tuningData from '../src/data/tuning/pipeline.json';
import type { Plan } from '../src/systems/plan/plan';
import {
  buyFarm,
  buyGrade,
  buyScale,
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
  screenOf,
  sessionsOf,
  sourcePrice,
  stepPipe,
  subagentPrice,
  subagentRate,
  type Farm,
  type PipeConfig,
  type Source,
} from '../src/systems/pipeline/pipeline';

const base: PipeConfig = {
  tuning: tuningData,
  plans: planData as Plan[],
  sources: sourceData as Source[],
  grades: gradeData,
  farms: farmData as Farm[],
  scales: scaleData,
  managers: managerData,
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
    const screen = screenOf(s);
    const income = Math.min(inflow, claudeRate(s, cfg) + subagentRate(s, cfg)) * payOf(s, cfg);
    // the next step up in scale: bought as soon as it costs less than a minute of income, or when this screen is done
    const scale = cfg.scales[s.scale];
    const left = cfg.sources.some((x) => x.screen === screen && (s.owned[x.id] ?? 0) < x.max);
    if (screen >= 2 && scale && (scale.price <= income * 60 || (screen >= 3 && !left))) {
      if (buyScale(s, cfg)) log.push({ t, what: `МАСШТАБ: ${scale.name} → экран ${screenOf(s)}, $${s.money.toFixed(0)}` });
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
        .filter((x) => (s.owned[x.id] ?? 0) < x.max && (screen >= 3 ? x.screen === screen : x.screen <= screen))
        .sort((a, b) => sourcePrice(a, s.owned[a.id]) / a.inflow - sourcePrice(b, s.owned[b.id]) / b.inflow)[0];
      if (best && buySource(s, cfg, best.id)) note(best.name);
    } else if (screen >= 3) {
      // sessions are short: a farm or a faster plan — the cheapest per task a second among those affordable within 45 s
      const soon = s.money + income * 45;
      const rate = claudeRate(s, cfg);
      const share = cfg.auto.subagent.share;
      const options = cfg.farms
        .filter((f) => f.screen === screen && (s.farms[f.id] ?? 0) < (f.max ?? Infinity))
        .map((f) => ({ name: f.name, price: farmPrice(f, s.farms[f.id] ?? 0, s.surge[f.id] ?? 1), gain: f.sessions * rate * share, buy: () => buyFarm(s, cfg, f.id) }));
      const plan = cfg.plans[s.plan.index + 1];
      if (plan) options.push({ name: `тариф ${plan.name}`, price: plan.price, gain: (plan.rate - rate) * (1 + share * sessionsOf(s, cfg)), buy: () => buyPlan(s, cfg) });
      const best =
        options.filter((x) => x.price <= soon).sort((a, b) => a.price / a.gain - b.price / b.gain)[0] ??
        options.sort((a, b) => a.price - b.price)[0];
      if (best?.buy()) note(best.name);
    } else if (claudeRate(s, cfg) <= hands) {
      // Claude is the slow one: a faster plan or one more session — what can be afforded sooner
      const next = cfg.plans[s.plan.index + 1];
      const canHire = s.noAsk; // subagents live on the blueprint
      if (next && (!canHire || next.price <= subagentPrice(cfg, s.subagents))) {
        if (buyPlan(s, cfg)) note(`тариф ${next.name}`);
      } else if (buySubagent(s, cfg)) note(`сабагент №${s.subagents}`);
    } else if (buyNoAsk(s, cfg)) note('«не спрашивай»');
  }
  const hired = [3, 4, 5].map((n) => cfg.sources.filter((x) => x.screen === n && s.owned[x.id]).length).join('/');
  log.push({ t: seconds, what: `итог: экран ${screenOf(s)}, $${s.money.toExponential(2)}, вход ${inflowOf(s, cfg).toFixed(0)}/с, сессий ${sessionsOf(s, cfg)}, контрактов ${hired}` });
  return log;
}

describe('economy', () => {
  it('test_economy_opening_does_not_drag', () => {
    const log = play(3600);
    console.log(log.map((e) => `${String(Math.round(e.t)).padStart(4)} с  ${e.what}`).join('\n'));
    const first = log[0];
    const max5 = log.find((e) => e.what.startsWith('тариф Max 5x'));
    expect(first.t).toBeLessThanOrEqual(60); // the first purchase within a minute
    expect(max5?.t ?? Infinity).toBeLessThanOrEqual(180); // the first big upgrade within three minutes
    // no dead zone: never more than 2.5 minutes between purchases in the first hour
    for (let i = 1; i < log.length - 1; i++) expect(log[i].t - log[i - 1].t).toBeLessThanOrEqual(150);
  });
});

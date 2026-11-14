import { describe, expect, it } from 'vitest';
import autoData from '../src/data/balance/auto.json';
import farmData from '../src/data/balance/farms.json';
import gradeData from '../src/data/balance/grades.json';
import lineData from '../src/data/balance/lines.json';
import managerData from '../src/data/balance/managers.json';
import planData from '../src/data/balance/plans.json';
import scaleData from '../src/data/balance/scales.json';
import sourceData from '../src/data/balance/sources.json';
import squadData from '../src/data/balance/squads.json';
import tuningData from '../src/data/tuning/pipeline.json';
import type { Plan } from '../src/systems/plan/plan';
import {
  buyFarm,
  buyGrade,
  buyLine,
  buyScale,
  buyNoAsk,
  buyPlan,
  buySource,
  buySquad,
  buySubagent,
  claudeRate,
  createPipe,
  farmCost,
  finished,
  inflowOf,
  jobOf,
  lineCost,
  payOf,
  pressPipe,
  screenOf,
  sessionsOf,
  sourceCost,
  squadsOf,
  stepPipe,
  subagentPrice,
  subagentRate,
  unemploymentOf,
  type Farm,
  type Line,
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
  squads: squadData,
  lines: lineData as Line[],
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
  let won = false;
  for (let i = 0; i < seconds * 60; i++) {
    const t = i / 60;
    stepPipe(s, cfg, dt);
    if (!won && finished(s, cfg)) {
      won = true;
      log.push({ t, what: `ФИНАЛ: $${s.money.toExponential(2)}` });
    }
    untilPress -= dt;
    if (untilPress <= 0) {
      pressPipe(s, cfg);
      untilPress += 1 / FINGER;
    }
    if (i % 30 !== 0) continue; // the bot shops twice a second
    // the allowance pays off once enough people are out of work: it keeps the price of a task
    s.allowance = unemploymentOf(s, cfg) > 0.31;

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
      const lines = cfg.lines.filter((l) => l.screen === screen && cfg.sources.some((x) => x.made === l.kind && (s.owned[x.id] ?? 0) < x.max));
      if (lines.length) {
        // the street: tasks come with the robots — the line that gives most robots per dollar
        const best = lines.sort((a, b) => lineCost(s, cfg, a) / a.rate - lineCost(s, cfg, b) / b.rate)[0];
        if (buyLine(s, cfg, best.id)) note(best.name);
      } else {
        // not enough tasks: the cheapest inflow per dollar; where squads do the work, one squad per employer
        const best = cfg.sources
          .filter((x) => !x.made && (s.owned[x.id] ?? 0) < x.max && !jobOf(s, x.id) && (screen >= 3 ? x.screen === screen : x.screen <= screen))
          .sort((a, b) => sourceCost(s, cfg, a) / a.inflow - sourceCost(s, cfg, b) / b.inflow)[0];
        if (best?.work && s.jobs.length >= squadsOf(s, cfg)) {
          if (buySquad(s, cfg)) note('отряд робособак');
        } else if (best && buySource(s, cfg, best.id)) note(best.name);
      }
    } else if (screen >= 3) {
      // sessions are short: a farm or a faster plan — the cheapest per task a second among those affordable within 45 s
      const soon = s.money + income * 45;
      const rate = claudeRate(s, cfg);
      const share = cfg.auto.subagent.share;
      const options = cfg.farms
        .filter((f) => f.screen === screen && (s.farms[f.id] ?? 0) < (f.max ?? Infinity))
        .map((f) => ({ name: f.name, price: farmCost(s, cfg, f), gain: f.sessions * rate * share, buy: () => buyFarm(s, cfg, f.id) }));
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
    // the street: lines are bought whenever they are cheap next to the money, whatever is short
    for (const l of cfg.lines) {
      const needed = l.screen === screen && cfg.sources.some((x) => x.made === l.kind && (s.owned[x.id] ?? 0) < x.max);
      if (needed && lineCost(s, cfg, l) * 4 <= s.money && buyLine(s, cfg, l.id)) note(l.name);
    }
  }
  const hired = [3, 4, 5, 6].map((n) => cfg.sources.filter((x) => x.screen === n && s.owned[x.id]).length).join('/');
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

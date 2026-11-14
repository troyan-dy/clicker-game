import { describe, expect, it } from 'vitest';
import autoData from '../src/data/balance/auto.json';
import farmData from '../src/data/balance/farms.json';
import gradeData from '../src/data/balance/grades.json';
import lineData from '../src/data/balance/lines.json';
import managerData from '../src/data/balance/managers.json';
import moduleData from '../src/data/balance/modules.json';
import planData from '../src/data/balance/plans.json';
import policeData from '../src/data/balance/police.json';
import scaleData from '../src/data/balance/scales.json';
import sourceData from '../src/data/balance/sources.json';
import gridData from '../src/data/tuning/grid.json';
import tuningData from '../src/data/tuning/pipeline.json';
import eventsData from '../src/data/tuning/events.json';
import riotData from '../src/data/tuning/riots.json';
import stackData from '../src/data/tuning/stack.json';
import { createRng } from '../src/core/rng';
import { createEvents, stepEvents, takeEvent } from '../src/systems/events/events';
import type { Plan } from '../src/systems/plan/plan';
import { createRiots, stepRiots } from '../src/systems/riots/riots';
import { createStack, stackWorth, stepStack, takeStack } from '../src/systems/stack/stack';
import {
  bestShifts,
  bonus,
  bribeCost,
  buyBribe,
  buyFarm,
  buyGrade,
  buyLine,
  buyModule,
  buyScale,
  buyNoAsk,
  buyPlan,
  buyPolice,
  buySource,
  buySubagent,
  claudeRate,
  createPipe,
  demandOf,
  farmCost,
  finished,
  gridOn,
  inflowOf,
  jobOf,
  keysNeeded,
  keysOf,
  lineCost,
  locked,
  moduleCost,
  payOf,
  peakOf,
  planRate,
  policeCost,
  pressPipe,
  riot,
  riotShare,
  screenOf,
  sessionsOf,
  sourceCost,
  stepPipe,
  subagentPrice,
  subagentRate,
  unemploymentOf,
  type Farm,
  type Line,
  type Module,
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
  lines: lineData as Line[],
  police: policeData,
  modules: moduleData as Module[],
  grid: gridData,
  auto: autoData,
};
const FINGER = 5; // presses per second of a player who keeps mashing

const EVENTS = { ...eventsData, every: [eventsData.every[0], eventsData.every[1]] as const };
const RIOTS = { ...riotData, every: [riotData.every[0], riotData.every[1]] as const };
/** an average player: takes a full pile of questions after a few seconds, answers most of the calls */
const PLAYER = { pileDelay: 6, callTake: 0.7, callDelay: 2 };

/**
 * A bot that always buys what removes the current bottleneck and plays the active part as an
 * average player does — piles of «Да всем», legendary tickets, calls, paid exactly as the scene
 * pays them. Prints the purchase log; fails if the opening drags.
 */
function play(seconds: number, cfg: PipeConfig = base): { t: number; what: string }[] {
  const s = createPipe(cfg);
  const log: { t: number; what: string }[] = [];
  const dt = 1 / 60;
  let untilPress = 0;
  let won = false;
  const rng = createRng(7);
  const stack = createStack(stackData);
  const calls = createEvents(EVENTS);
  const skipped = new WeakSet<object>();
  const riots = createRiots(RIOTS);
  let legend = false;
  let fullFor = 0;
  const flowIncome = (): number => Math.min(inflowOf(s, cfg), planRate(s, cfg) * (1 + cfg.auto.subagent.share * sessionsOf(s, cfg))) * payOf(s, cfg);
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
    // the active part: a full pile is taken after a few seconds, most calls are answered
    const hadPile = stack.fill > 0;
    stepStack(stack, stackData, dt, s.noAsk);
    if (!hadPile && stack.fill > 0) legend = rng.next() < stackData.legendChance + bonus(s, cfg, 'legend');
    if (stack.fill >= 1 && (fullFor += dt) >= PLAYER.pileDelay) {
      s.money += stackWorth(stack, stackData, flowIncome()) * (legend ? stackData.legendMult : 1) * (1 + bonus(s, cfg, 'stack'));
      takeStack(stack, stackData);
      fullFor = 0;
    }
    if (screenOf(s) >= 2) {
      const at = screenOf(s);
      const owners = cfg.sources.filter((x) => (at >= 3 ? x.screen === at : x.screen <= at) && (s.owned[x.id] ?? 0) > 0).map((x) => x.id);
      stepEvents(calls, EVENTS, dt, owners, 3, rng);
      for (let k = calls.list.length - 1; k >= 0; k--) {
        const e = calls.list[k];
        if (e.left > EVENTS.life - PLAYER.callDelay || skipped.has(e)) continue;
        if (rng.next() >= PLAYER.callTake) {
          skipped.add(e);
          continue;
        }
        takeEvent(calls, k);
        s.money += Math.floor(flowIncome() * EVENTS.worthSeconds * (1 + bonus(s, cfg, 'calls')));
      }
    }
    // the Luddites come to the factory as they do in the game
    if (!won && stepRiots(riots, RIOTS, dt, cfg.lines.some((l) => l.screen === screenOf(s)) && unemploymentOf(s, cfg) >= RIOTS.from, rng) === 'hit') {
      riot(s, cfg, riotShare(s, cfg, RIOTS.share));
    }
    if (i % 30 !== 0) continue; // the bot shops twice a second
    // the step of the allowance that pays best right now: what it keeps of the price and what it brings in orders against what it costs
    {
      const u = unemploymentOf(s, cfg);
      const tun = cfg.tuning;
      const short = inflowOf(s, cfg) < claudeRate(s, cfg) + subagentRate(s, cfg);
      let best = 0;
      let top = 0;
      for (let l = 0; l <= tun.allowanceLevels; l++) {
        const r = l / tun.allowanceLevels;
        const gain = (1 - tun.slump * u * (1 - r)) * (1 - tun.allowance * l) * (short ? 1 + tun.orders * r * u : 1);
        if (gain > top + 1e-9) {
          top = gain;
          best = l;
        }
      }
      s.allowance = best;
    }

    const inflow = inflowOf(s, cfg);
    const hands = s.noAsk ? Infinity : FINGER;
    const screen = screenOf(s);
    const income = Math.min(inflow, claudeRate(s, cfg) + subagentRate(s, cfg)) * payOf(s, cfg);
    // the next step up in scale: bought as soon as it costs less than a minute of income, or when this screen is done
    const scale = cfg.scales[s.scale];
    const left = cfg.sources.some((x) => x.screen === screen && (s.owned[x.id] ?? 0) < x.max);
    const keys = keysOf(s, cfg) >= keysNeeded(s, cfg);
    if (screen >= 2 && scale && keys && (scale.price <= income * 60 || (screen >= 3 && !left))) {
      if (buyScale(s, cfg)) log.push({ t, what: `МАСШТАБ: ${scale.name} → экран ${screenOf(s)}, $${s.money.toFixed(0)}` });
      continue; // saving for it
    }
    // the next screen is affordable but its keys are missing: finish the employer that is closest to whole
    if (screen >= 3 && scale && !keys && scale.price <= income * 60) {
      const rest = (x: Source): number => (x.max - (s.owned[x.id] ?? 0)) * (locked(s, x) ? bribeCost(s, cfg, x) : sourceCost(s, cfg, x));
      const near = cfg.sources.filter((x) => x.screen === screen && !x.made && !jobOf(s, x.id) && (s.owned[x.id] ?? 0) < x.max).sort((a, b) => rest(a) - rest(b))[0];
      if (near && (locked(s, near) ? buyBribe(s, cfg, near.id) : buySource(s, cfg, near.id))) log.push({ t, what: `к целому: ${near.name} → $${s.money.toFixed(0)}` });
      continue;
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

    // the ziggurat: the shifts that pay best are paid; power is bought before what would ask for more than there is
    if (gridOn(s, cfg)) s.shifts = bestShifts(s, cfg);
    const buyPower = (): void => {
      const peak = peakOf(s, cfg);
      const best = cfg.modules
        .filter((m) => m.kind !== 'cell' && (s.modules[m.id] ?? 0) < (m.max ?? Infinity))
        .map((m) => ({ m, price: moduleCost(s, cfg, m), gain: m.kind === 'baths' ? peak / (s.modules[m.id] ?? 1) : peak * (m.amount - 1) }))
        .sort((a, b) => a.price / a.gain - b.price / b.gain)[0];
      if (best && buyModule(s, cfg, best.m.id)) log.push({ t, what: `${best.m.name} №${s.modules[best.m.id]} → ${peakOf(s, cfg).toFixed(0)} ГВт при спросе ${demandOf(s, cfg).toFixed(0)}, $${s.money.toFixed(0)}` });
    };
    const lacks = (draw: number | undefined): boolean => gridOn(s, cfg) && demandOf(s, cfg) + (draw ?? 0) > peakOf(s, cfg);
    if (lacks(0)) {
      buyPower();
      continue;
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
        // not enough tasks: the cheapest inflow per dollar; where robot dogs do the work — a bribe first, one pack at a time
        const cost = (x: Source): number => (locked(s, x) ? bribeCost(s, cfg, x) : sourceCost(s, cfg, x));
        const best = cfg.sources
          .filter((x) => !x.made && (s.owned[x.id] ?? 0) < x.max && !jobOf(s, x.id) && (screen >= 3 ? x.screen === screen : x.screen <= screen))
          .sort((a, b) => cost(a) / a.inflow - cost(b) / b.inflow)[0];
        if (best && lacks(best.draw)) buyPower();
        else if (best && locked(s, best)) {
          if (buyBribe(s, cfg, best.id)) note(`взятка: ${best.name}`);
        } else if (best && buySource(s, cfg, best.id)) note(best.name);
      }
    } else if (screen >= 3) {
      // sessions are short: a farm or a faster plan — the cheapest per task a second among those affordable within 45 s
      const soon = s.money + income * 45;
      const rate = claudeRate(s, cfg);
      const share = cfg.auto.subagent.share;
      const options = cfg.farms
        .filter((f) => f.screen === screen && (s.farms[f.id] ?? 0) < (f.max ?? Infinity))
        .map((f) => ({ name: f.name, price: farmCost(s, cfg, f), gain: f.sessions * rate * share, buy: () => (lacks(f.draw) ? (buyPower(), false) : buyFarm(s, cfg, f.id)) }));
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
    // robot police is bought once it costs a small part of the money
    if (screen === cfg.police.screen && policeCost(s, cfg) * 5 <= s.money && buyPolice(s, cfg)) note('робополиция');
    // the street: lines are bought whenever they are cheap next to the money, whatever is short
    for (const l of cfg.lines) {
      const needed = l.screen === screen && cfg.sources.some((x) => x.made === l.kind && (s.owned[x.id] ?? 0) < x.max);
      if (needed && lineCost(s, cfg, l) * 4 <= s.money && buyLine(s, cfg, l.id)) note(l.name);
    }
  }
  const hired = [3, 4, 5, 6, 7].map((n) => cfg.sources.filter((x) => x.screen === n && s.owned[x.id]).length).join('/');
  log.push({ t: seconds, what: `итог: экран ${screenOf(s)}, $${s.money.toExponential(2)}, вход ${inflowOf(s, cfg).toFixed(0)}/с, сессий ${sessionsOf(s, cfg)}, контрактов ${hired}` });
  return log;
}

describe('economy', () => {
  it('test_economy_opening_does_not_drag', () => {
    const log = play(Number(process.env.ECO_SECONDS ?? 3600));
    console.log(log.map((e) => `${String(Math.round(e.t)).padStart(4)} с  ${e.what}`).join('\n'));
    const first = log[0];
    const max5 = log.find((e) => e.what.startsWith('тариф Max 5x'));
    expect(first.t).toBeLessThanOrEqual(60); // the first purchase within a minute
    expect(max5?.t ?? Infinity).toBeLessThanOrEqual(180); // the first big upgrade within three minutes
    // no dead zone: never more than 2.5 minutes between purchases in the first hour
    for (let i = 1; i < log.length - 1; i++) expect(log[i].t - log[i - 1].t).toBeLessThanOrEqual(150);
  });
});

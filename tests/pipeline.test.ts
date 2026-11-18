import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng';
import autoData from '../src/data/balance/auto.json';
import chipData from '../src/data/balance/chips.json';
import farmData from '../src/data/balance/farms.json';
import globe from '../src/data/layout/globe.json';
import gradeData from '../src/data/balance/grades.json';
import lineData from '../src/data/balance/lines.json';
import managerData from '../src/data/balance/managers.json';
import moduleData from '../src/data/balance/modules.json';
import netData from '../src/data/balance/net.json';
import planData from '../src/data/balance/plans.json';
import policeData from '../src/data/balance/police.json';
import scaleData from '../src/data/balance/scales.json';
import sourceData from '../src/data/balance/sources.json';
import gridData from '../src/data/tuning/grid.json';
import worldData from '../src/data/tuning/world.json';
import tuningData from '../src/data/tuning/pipeline.json';
import { createEvents, stepEvents, takeEvent } from '../src/systems/events/events';
import { managerPick } from '../src/systems/manager/manager';
import { createRiots, stepRiots } from '../src/systems/riots/riots';
import { createStrikes, stepStrikes } from '../src/systems/strikes/strikes';
import type { Plan } from '../src/systems/plan/plan';
import {
  backlogCap,
  buyFarm,
  aimAt,
  buyBribe,
  buyGrade,
  buyLine,
  buyManager,
  buyModule,
  buyNet,
  buyNoAsk,
  buyPolice,
  buyScale,
  buyPlan,
  buySource,
  buySubagent,
  claudeRate,
  createPipe,
  demandOf,
  farmCost,
  fedOf,
  farmPrice,
  finished,
  flowOf,
  inflowOf,
  keysNeeded,
  keysOf,
  labOf,
  netCost,
  nodesOf,
  payOf,
  podsOf,
  pressPipe,
  quartered,
  riot,
  riotShare,
  robotsOf,
  scaleReady,
  sessionsOf,
  sourceInflow,
  sourcePrice,
  stepPipe,
  supplyOf,
  takeChip,
  unemploymentOf,
  wantedOf,
  wireOf,
  type Farm,
  type Line,
  type Module,
  type PipeConfig,
  type PipeState,
  type Source,
} from '../src/systems/pipeline/pipeline';

const cfg: PipeConfig = {
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
  net: netData,
  chips: chipData,
  grid: gridData,
  world: worldData,
  auto: autoData,
};
const DT = 1 / 60;

/** Run the conveyor for `seconds`, pressing «Да» `pressesPerSec` times a second. */
function run(s: PipeState, seconds: number, pressesPerSec: number): void {
  let untilPress = 0;
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    stepPipe(s, cfg, DT);
    if (pressesPerSec <= 0) continue;
    untilPress -= DT;
    if (untilPress <= 0) {
      pressPipe(s, cfg);
      untilPress += 1 / pressesPerSec;
    }
  }
}

function rich(): PipeState {
  const s = createPipe(cfg);
  s.money = 1e6;
  return s;
}

describe('pipeline', () => {
  it('test_pipe_every_yes_pays_one_task', () => {
    const s = createPipe(cfg);
    s.ready = 3;
    const before = s.money;
    expect(pressPipe(s, cfg)).toBe('approved');
    expect(s.money).toBe(before + cfg.tuning.pay);
    expect(s.ready).toBe(2);
  });

  it('test_pipe_start_claude_on_pro_is_slower_than_the_first_job', () => {
    const s = createPipe(cfg);
    const start = s.money;
    run(s, 60, 6);
    const perSec = (s.money - start) / cfg.tuning.pay / 60; // tasks per second
    expect(inflowOf(s, cfg)).toBeGreaterThan(claudeRate(s, cfg)); // there is always something to approve
    expect(perSec).toBeGreaterThan(claudeRate(s, cfg) * 0.9);
    expect(perSec).toBeLessThan(claudeRate(s, cfg) * 1.1);
  });

  it('test_pipe_fast_claude_and_fast_finger_are_capped_by_the_inflow_of_tasks', () => {
    const s = rich();
    buyPlan(s, cfg);
    buyPlan(s, cfg); // Max 20x: 15/s against one job
    const start = s.money;
    run(s, 60, 6);
    const perSec = (s.money - start) / cfg.tuning.pay / 60; // tasks per second
    expect(perSec).toBeGreaterThan(inflowOf(s, cfg) * 0.9);
    expect(perSec).toBeLessThan(inflowOf(s, cfg) * 1.1);
  });

  it('test_pipe_more_tasks_than_claude_can_do_caps_income_at_his_rate', () => {
    const s = rich();
    for (let i = 0; i < 4; i++) buySource(s, cfg, 'freelance'); // inflow 2.5/s, Pro does 0.75/s
    const start = s.money;
    run(s, 60, 6);
    const perSec = (s.money - start) / cfg.tuning.pay / 60; // tasks per second
    expect(perSec).toBeGreaterThan(0.7);
    expect(perSec).toBeLessThan(0.8);
    expect(s.backlog).toBe(cfg.tuning.backlogMax); // tasks pile up in front of Claude
  });

  it('test_pipe_fast_claude_without_presses_waits_for_the_player', () => {
    const s = rich();
    buySource(s, cfg, 'job');
    buyPlan(s, cfg);
    const start = s.money;
    run(s, 30, 0);
    expect(s.ready).toBe(cfg.tuning.readyMax);
    expect(s.money).toBe(start);
  });

  it('test_pipe_no_ask_closes_tasks_at_claude_rate_without_presses', () => {
    const s = rich();
    for (let i = 0; i < 3; i++) buySource(s, cfg, 'job'); // inflow 6.5/s
    buyPlan(s, cfg); // 3.75/s
    s.ready = 5;
    const before = s.money;
    expect(buyNoAsk(s, cfg)).toBe(true);
    expect(s.money).toBe(before - cfg.auto.noAsk.price + 5 * cfg.tuning.pay); // waiting tasks are approved at once
    const start = s.money;
    run(s, 60, 0);
    const perSec = (s.money - start) / cfg.tuning.pay / 60; // tasks per second
    expect(perSec).toBeGreaterThan(3.6);
    expect(perSec).toBeLessThan(3.9);
  });

  it('test_pipe_subagents_close_tasks_on_their_own', () => {
    const s = rich();
    for (let i = 0; i < 3; i++) buySource(s, cfg, 'job'); // inflow 6.5/s
    buySubagent(s, cfg);
    buySubagent(s, cfg); // two sessions, each a share of Pro; the player does nothing
    const expected = 2 * cfg.plans[0].rate * cfg.auto.subagent.share;
    const start = s.money;
    run(s, 60, 0);
    const perSec = (s.money - start) / cfg.tuning.pay / 60; // tasks per second
    expect(perSec).toBeGreaterThan(expected * 0.93);
    expect(perSec).toBeLessThan(expected * 1.07);
    expect(s.closedBySubagents).toBeGreaterThan(expected * 55);
  });

  it('test_pipe_promotion_raises_the_pay_of_every_task', () => {
    const s = rich();
    s.ready = 2;
    const junior = payOf(s, cfg);
    expect(junior).toBe(cfg.tuning.pay);
    expect(buyGrade(s, cfg)).toBe(true);
    const before = s.money;
    pressPipe(s, cfg);
    expect(s.money - before).toBe(cfg.tuning.pay * cfg.grades[1].mult);
    expect(payOf(s, cfg)).toBeGreaterThan(junior);
    s.money = 1e30;
    for (let i = 0; i < cfg.grades.length; i++) buyGrade(s, cfg);
    expect(s.grade).toBe(cfg.grades.length - 1); // the ladder ends
    expect(buyGrade(s, cfg)).toBe(false);
  });

  it('test_pipe_city_companies_are_hired_once_and_farms_add_sessions', () => {
    const s = rich();
    expect(buyScale(s, cfg)).toBe(false); // the company comes after the terminal agrees by itself
    buyNoAsk(s, cfg);
    expect(buyScale(s, cfg)).toBe(true);
    expect(s.scale).toBe(1);
    expect(buyScale(s, cfg)).toBe(false); // the next scale costs far more than a million
    // a company is taken department by department; taken whole, it brings more
    const company = cfg.sources.find((x) => x.screen === 3)!;
    const before = inflowOf(s, cfg);
    expect(buySource(s, cfg, company.id)).toBe(true);
    expect(inflowOf(s, cfg)).toBe(before + company.inflow);
    s.money = 1e12;
    while (buySource(s, cfg, company.id));
    expect(s.owned[company.id]).toBe(company.max); // nothing is sold above the last department
    expect(sourceInflow(company, company.max)).toBeCloseTo(company.max * company.inflow * (company.full ?? 1));
    expect(inflowOf(s, cfg)).toBeGreaterThan(before + company.max * company.inflow * 0.999);
    expect(backlogCap(s, cfg)).toBeGreaterThan(cfg.tuning.backlogMax); // the tray grows with the flow
    expect(buyFarm(s, cfg, cfg.farms[0].id)).toBe(true);
    expect(sessionsOf(s, cfg)).toBe(cfg.farms[0].sessions);
    // a second of work: everything that arrives is closed, nothing is lost in bulk steps
    const start = s.money;
    run(s, 10, 0);
    const perSec = (s.money - start) / payOf(s, cfg) / 10;
    const expected = Math.min(inflowOf(s, cfg), claudeRate(s, cfg) * (1 + cfg.auto.subagent.share * sessionsOf(s, cfg)));
    expect(perSec).toBeGreaterThan(expected * 0.97);
    expect(perSec).toBeLessThan(expected * 1.05);
  });

  it('test_pipe_shortage_raises_the_price_and_eases_off', () => {
    const s = rich();
    s.money = 1e18;
    const gpu = cfg.farms.find((f) => f.surge)!;
    const calm = farmPrice(gpu, 0);
    expect(buyFarm(s, cfg, gpu.id)).toBe(true);
    expect(farmPrice(gpu, 1, s.surge[gpu.id])).toBeGreaterThan(calm * 1.3); // bought out: dearer at once
    run(s, gpu.surge!.halfLife * 8, 0);
    expect(farmPrice(gpu, 1, s.surge[gpu.id])).toBeLessThan(calm * 1.1); // the market cooled down
    const capped = cfg.farms.find((f) => f.max)!;
    for (let i = 0; i < capped.max! + 3; i++) buyFarm(s, cfg, capped.id);
    expect(s.farms[capped.id]).toBe(capped.max); // nothing is sold above the limit
  });

  it('test_pipe_usage_limit_stops_every_session_until_it_resets', () => {
    const s = rich();
    buyNoAsk(s, cfg);
    buySubagent(s, cfg);
    s.limited = 5;
    const start = s.money;
    run(s, 4, 0);
    expect(s.money).toBe(start); // nothing is closed while the limit is hit
    expect(claudeRate(s, cfg)).toBe(0);
    run(s, 4, 0);
    expect(s.limited).toBe(0);
    expect(s.money).toBeGreaterThan(start); // …and work goes on after the reset
  });

  it('manager buys immediately when profitable and preserves an affordable transition', () => {
    const s = rich();
    buyNoAsk(s, cfg);
    expect(buyManager(s, cfg, 2)).toBe(true);
    expect(buyManager(s, cfg, 2)).toBe(false);
    expect(managerPick(s, cfg)).toBeNull(); // the money for the transition stays on the account
    s.money = cfg.plans[1].price;
    const before = structuredClone(s);
    expect(managerPick(s, cfg)).toBe('plan'); // spends 100% when it accelerates the transition
    expect(s).toEqual(before);
    s.money = cfg.scales[0].price - 1;
    expect(managerPick(s, cfg)).toBeNull(); // waiting one dollar beats another upgrade
  });

  it('manager can finish mandatory employers even when income is already sufficient', () => {
    const s = rich();
    s.noAsk = true;
    s.scale = 1;
    s.money = 1e12;
    const employers = cfg.sources.filter(x => x.screen === 3);
    for (const x of employers.slice(0, 5)) s.owned[x.id] = x.max;
    const last = employers[5];
    s.owned[last.id] = last.max - 1;
    expect(managerPick(s, cfg)).toBe('src:' + last.id);
    buySource(s, cfg, last.id);
    expect(managerPick(s, cfg)).toBeNull();
  });

  it('manager gets past a balanced city where a contract and server are needed together', () => {
    const s = rich();
    s.noAsk = true;
    s.scale = 1;
    s.plan.index = 3;
    s.owned.job = 30; // 60 incoming tasks and 60 per second of processing capacity
    s.grade = 6;
    s.money = 600_000;
    const before = flowOf(s, cfg);
    const spare = structuredClone(s);
    expect(buyFarm(spare, cfg, 'rack')).toBe(true);
    expect(flowOf(spare, cfg)).toBe(before);
    for (let i = 0; i < 6 && flowOf(s, cfg) === before; i++) {
      const pick = managerPick(s, cfg);
      expect(pick).toBeTruthy();
      const [kind, id] = pick!.split(':');
      if (kind === 'src') buySource(s, cfg, id);
      else if (kind === 'farm') buyFarm(s, cfg, id);
      else throw new Error('Unexpected city purchase: ' + pick);
    }
    expect(flowOf(s, cfg)).toBeGreaterThan(before);
  });

  it('test_events_ask_only_employers_the_player_works_for', () => {
    const t = { every: [1, 1] as const, life: 3, worthSeconds: 4, max: 2 };
    const st = createEvents(t);
    const rng = createRng(7);
    for (let i = 0; i < 600; i++) stepEvents(st, t, 1 / 60, [], 3, rng);
    expect(st.list.length).toBe(0); // nobody to ask
    for (let i = 0; i < 600; i++) stepEvents(st, t, 1 / 60, ['a', 'b', 'c'], 3, rng);
    expect(st.list.length).toBeGreaterThan(0);
    expect(st.list.length).toBeLessThanOrEqual(t.max);
    expect(new Set(st.list.map((e) => e.at)).size).toBe(st.list.length); // one request per employer
    const n = st.list.length;
    expect(takeEvent(st, 0)).toBeDefined();
    expect(st.list.length).toBe(n - 1);
    expect(st.taken).toBe(1);
  });

  it('the paired standup uses two ordinary call slots and one answer', () => {
    const tuning = { every: [20, 20] as const, life: 14, worthSeconds: 2, max: 2 };
    const calls = createEvents(tuning);
    const rng = createRng(7);
    stepEvents(calls, tuning, 20, ['job'], 3, rng, true);
    expect(calls.list).toHaveLength(1);
    expect(calls.wait).toBe(40);
    expect(takeEvent(calls, 0)?.standup).toBe(true);
    expect(takeEvent(calls, 0)).toBeUndefined();
    expect(calls.taken).toBe(2);
    stepEvents(calls, tuning, 39, ['job'], 3, rng);
    expect(calls.list).toHaveLength(0);
    stepEvents(calls, tuning, 1, ['job'], 3, rng);
    expect(calls.list[0]?.standup).toBeUndefined();
    expect(calls.list).toHaveLength(1);
  });

  it('test_perk_of_a_whole_employer_changes_pay_and_prices', () => {
    const s = createPipe(cfg);
    s.noAsk = true;
    const max = (id: string): number => cfg.sources.find((x) => x.id === id)!.max;
    const pay = payOf(s, cfg);
    const perk = (id: string): number => cfg.sources.find((x) => x.id === id)!.perk!.value;
    s.owned.bank = max('bank') - 1; // more for every task once the bank is taken whole
    expect(payOf(s, cfg)).toBe(pay);
    s.owned.bank = max('bank');
    expect(payOf(s, cfg)).toBeCloseTo(pay * (1 + perk('bank')));
    // discounts multiply: both employers make the servers cheaper
    const rack = cfg.farms.find((f) => f.id === 'rack')!;
    const before = farmCost(s, cfg, rack);
    s.owned.logistics = max('logistics');
    s.owned.cloud = max('cloud');
    expect(farmCost(s, cfg, rack)).toBe(Math.round(before * (1 - perk('logistics')) * (1 - perk('cloud'))));
    // and the purchase takes the discounted price
    s.money = farmCost(s, cfg, rack);
    expect(buyFarm(s, cfg, 'rack')).toBe(true);
    expect(s.money).toBe(0);
  });

  it('test_allowance_costs_a_share_of_the_pay_and_brings_orders', () => {
    const s = createPipe(cfg);
    s.noAsk = true;
    s.scale = 1; // the city: people are out of work there
    s.owned.vector = 2;
    const work = inflowOf(s, cfg);
    const u = unemploymentOf(s, cfg);
    const t = cfg.tuning;
    s.allowance = 1;
    // one step of the allowance takes its share of the pay and a third of the fall of the price
    expect(payOf(s, cfg)).toBeCloseTo(t.pay * (1 - t.slump * u * (1 - 1 / t.allowanceLevels)) * (1 - t.allowance));
    run(s, t.ordersRise + 1, 0);
    expect(inflowOf(s, cfg)).toBeCloseTo(work * (1 + (t.orders * u) / t.allowanceLevels)); // the more people are out of work, the more they order
    s.allowance = t.allowanceLevels;
    expect(inflowOf(s, cfg)).toBeCloseTo(work * (1 + t.orders * u)); // the top step: all the orders
    s.allowance = 0;
    run(s, cfg.tuning.ordersFade + 1, 0);
    expect(inflowOf(s, cfg)).toBeCloseTo(work); // without the allowance the orders dry up
  });

  it('test_unemployment_lowers_the_price_of_a_task_and_the_allowance_keeps_it', () => {
    const s = createPipe(cfg);
    s.noAsk = true;
    s.scale = 1; // the city
    const full = payOf(s, cfg);
    expect(unemploymentOf(s, cfg)).toBe(0);
    const city = cfg.sources.filter((x) => x.screen === 3);
    for (const src of city) if (!src.perk || src.perk.kind !== 'pay') s.owned[src.id] = src.max; // everybody but the bank: no pay perk in the way
    const u = unemploymentOf(s, cfg);
    expect(u).toBeGreaterThan(0.5);
    expect(payOf(s, cfg)).toBeCloseTo(full * (1 - cfg.tuning.slump * u));
    s.allowance = cfg.tuning.allowanceLevels;
    // the top step of the allowance: the price does not fall, the allowance takes its share
    expect(payOf(s, cfg)).toBeCloseTo(full * (1 - cfg.tuning.allowance * cfg.tuning.allowanceLevels));
    // a new market: nobody is out of work there yet
    s.scale = 2;
    s.allowance = 0;
    expect(payOf(s, cfg)).toBeCloseTo(full);
  });

  it('test_strike_stops_the_tasks_of_an_employer_and_the_allowance_ends_it', () => {
    const s = createPipe(cfg);
    s.noAsk = true;
    s.scale = 1;
    s.owned.vector = 2;
    s.owned.cats = 1;
    const all = inflowOf(s, cfg);
    s.strikes.push('cats');
    expect(inflowOf(s, cfg)).toBeCloseTo(all - sourceInflow(cfg.sources.find((x) => x.id === 'cats')!, 1));
    s.allowance = 1;
    stepPipe(s, cfg, DT);
    expect(s.strikes).toEqual([]);
    // strikes begin only when enough people are out of work and nobody is paid
    const t = { from: 0.15, every: [1, 1] as const, max: 2, priceSeconds: 6 };
    const st = createStrikes(t);
    const rng = createRng(7);
    const hits = (u: number, paid: boolean, blocked: number): number => {
      let n = 0;
      for (let i = 0; i < 600; i++) if (stepStrikes(st, t, DT, u, paid, blocked, ['vector', 'cats'], rng)) n++;
      return n;
    };
    expect(hits(0.1, false, 0)).toBe(0);
    expect(hits(0.6, true, 0)).toBe(0);
    expect(hits(0.6, false, 2)).toBe(0);
    expect(hits(0.6, false, 0)).toBeGreaterThan(3);
  });

  it('test_next_screen_needs_employers_taken_whole', () => {
    const s = createPipe(cfg);
    s.noAsk = true;
    s.scale = 1;
    s.money = 1e30;
    const need = keysNeeded(s, cfg);
    expect(need).toBeGreaterThan(0);
    expect(buyScale(s, cfg)).toBe(false); // money alone does not open the state
    const city = cfg.sources.filter((x) => x.screen === 3);
    for (const src of city.slice(0, need)) s.owned[src.id] = src.max;
    expect(keysOf(s, cfg)).toBe(need);
    expect(buyScale(s, cfg)).toBe(true);
  });

  it('test_bribe_lets_the_robot_dogs_in_and_a_pack_takes_a_unit_over_time', () => {
    const s = createPipe(cfg);
    s.noAsk = true;
    s.scale = 3; // the planet
    s.money = 1e15;
    const exchange = cfg.sources.find((x) => x.id === 'exchange')!;
    expect(buySource(s, cfg, 'exchange')).toBe(false); // no bribe — no robot dogs
    expect(buyBribe(s, cfg, 'exchange')).toBe(true);
    expect(buyBribe(s, cfg, 'exchange')).toBe(false); // it is paid once
    expect(buySource(s, cfg, 'exchange')).toBe(true);
    expect(s.owned.exchange).toBe(0); // the pack is on its way: nothing is taken yet
    expect(buySource(s, cfg, 'exchange')).toBe(false); // one pack at a time
    expect(buyBribe(s, cfg, 'shipping')).toBe(true);
    expect(buySource(s, cfg, 'shipping')).toBe(true); // another employer does not wait
    let done: string[] = [];
    for (let i = 0; i < (exchange.work! + 0.5) * 60; i++) done = done.concat(stepPipe(s, cfg, DT).done);
    expect(done).toContain('exchange');
    expect(s.owned.exchange).toBe(1);
    expect(s.jobs.some((j) => j.id === 'exchange')).toBe(false);
  });

  it('test_factory_robots_take_the_jobs_and_go_where_they_are_aimed', () => {
    const s = createPipe(cfg);
    s.noAsk = true;
    s.scale = 4; // the street
    s.money = 1e16;
    expect(buySource(s, cfg, 'checkout')).toBe(false); // these jobs are not for sale
    expect(buyLine(s, cfg, 'android')).toBe(true);
    const line = cfg.lines.find((l) => l.id === 'android')!;
    const first = cfg.sources.find((x) => x.made === 'android')!;
    for (let i = 0; i < 600; i++) stepPipe(s, cfg, DT);
    // ten seconds of one line, less what has worn out on the way
    const made = (line.rate * 10) / first.staff!;
    expect(s.owned[first.id]).toBeGreaterThan(made * (1 - cfg.tuning.wear * 10));
    expect(s.owned[first.id]).toBeLessThan(made);
    // aimed at another employer, the robots go there
    const other = cfg.sources.filter((x) => x.made === 'android')[1];
    expect(aimAt(s, cfg, other.id)).toBe(true);
    const before = s.owned[first.id];
    for (let i = 0; i < 600; i++) stepPipe(s, cfg, DT);
    expect(s.owned[first.id]).toBeLessThan(before); // nothing new comes here, and what is here wears out
    expect(s.owned[other.id]).toBeGreaterThan(0);
    // enough robots take an employer whole — and say so once
    s.lines.android = 1e6;
    let done: string[] = [];
    for (let i = 0; i < 120; i++) done = done.concat(stepPipe(s, cfg, DT).done);
    expect(done.filter((id) => id === other.id).length).toBe(1);
    expect(s.owned[other.id]).toBe(other.max);
  });

  it('test_robots_wear_out_and_one_line_cannot_hold_everything', () => {
    const s = createPipe(cfg);
    s.noAsk = true;
    s.scale = 4;
    s.lines.android = 1;
    const line = cfg.lines.find((l) => l.id === 'android')!;
    // one line holds as many robots as it can replace: what it makes a second over the share that breaks a second
    for (let i = 0; i < 60 * 1500; i++) stepPipe(s, cfg, 1 / 30);
    const held = robotsOf(s, cfg, 'android');
    expect(held).toBeGreaterThan((line.rate / cfg.tuning.wear) * 0.97);
    expect(held).toBeLessThanOrEqual(line.rate / cfg.tuning.wear + 1);
    // no lines at all: even an employer taken whole loses its robots
    const first = cfg.sources.find((x) => x.made === 'android')!;
    s.owned[first.id] = first.max;
    s.lines.android = 0;
    stepPipe(s, cfg, 1);
    expect(s.owned[first.id]).toBeLessThan(first.max);
    // enough lines keep a whole employer whole, and it is not announced again
    s.owned[first.id] = first.max;
    s.lines.android = 1e6;
    expect(stepPipe(s, cfg, 1).done).not.toContain(first.id);
    expect(s.owned[first.id]).toBe(first.max);
  });

  it('test_riot_breaks_robots_and_police_takes_a_part_off', () => {
    const s = createPipe(cfg);
    s.noAsk = true;
    s.scale = 4;
    s.money = 1e30;
    for (const src of cfg.sources) if (src.made) s.owned[src.id] = src.max;
    const all = robotsOf(s, cfg, 'android') + robotsOf(s, cfg, 'robodog');
    expect(riotShare(s, cfg, 0.25)).toBeCloseTo(0.25);
    expect(riot(s, cfg, 0.25)).toBeCloseTo(all * 0.25);
    expect(robotsOf(s, cfg, 'android') + robotsOf(s, cfg, 'robodog')).toBeCloseTo(all * 0.75);
    expect(buyPolice(s, cfg)).toBe(true);
    expect(riotShare(s, cfg, 0.25)).toBeCloseTo(0.25 * (1 - cfg.police.guard));
    // the clock of the riots: a march starts, then it arrives
    const t = { from: 0.05, every: [1, 1] as const, warn: 2, share: 0.25 };
    const st = createRiots(t);
    const rng = createRng(7);
    const seen: string[] = [];
    for (let i = 0; i < 60 * 4; i++) {
      const what = stepRiots(st, t, DT, true, rng);
      if (what) seen.push(what);
    }
    expect(seen.slice(0, 2)).toEqual(['start', 'hit']);
    expect(stepRiots(createRiots(t), t, 100, false, rng)).toBeNull(); // nothing to break yet
  });

  it('test_game_ends_when_the_last_screen_is_taken_whole', () => {
    const s = createPipe(cfg);
    s.noAsk = true;
    s.scale = cfg.scales.length;
    const last = 2 + cfg.scales.length;
    s.money = 1e40;
    expect(finished(s, cfg)).toBe(false);
    for (const src of cfg.sources) if (src.screen === last) s.owned[src.id] = src.max;
    // the last screen is the planet: the tower for Mars is not for sale until everything stands, everybody sleeps and the network has invented all it can
    for (const m of cfg.modules) if (m.kind !== 'ark') s.modules[m.id] = m.max;
    s.asleep = podsOf(s, cfg);
    expect(buyModule(s, cfg, 'ark')).toBe(false);
    s.chips = cfg.chips.length;
    s.asleep -= cfg.world.node;
    expect(buyModule(s, cfg, 'ark')).toBe(false);
    s.asleep = podsOf(s, cfg);
    expect(finished(s, cfg)).toBe(false);
    expect(buyModule(s, cfg, 'ark')).toBe(true);
    expect(finished(s, cfg)).toBe(true);
    s.scale--;
    expect(finished(s, cfg)).toBe(false);
  });

  /** a game that has just come to the towers */
  const atTowers = (): PipeState => {
    const s = createPipe(cfg);
    s.noAsk = true;
    s.scale = cfg.grid.screen - 2;
    return s;
  };

  it('test_towers_people_wait_at_the_gate_and_lie_down_where_there_is_room', () => {
    const s = atTowers();
    const g = cfg.grid;
    // people come by themselves and stand in line: nobody is let in before the first «Да»
    for (let i = 0; i < 120; i++) stepPipe(s, cfg, DT);
    expect(s.queue).toBeCloseTo(g.trickle * 2, -3);
    expect(s.asleep).toBe(0);
    pressPipe(s, cfg);
    expect(s.gate).toBe(true);
    // the pilot capsule is taken, the rest wait: the line never holds more than it has room for
    for (let i = 0; i < 60 * 120; i++) stepPipe(s, cfg, DT);
    expect(s.asleep).toBeCloseTo(g.pilot * g.unit);
    expect(s.queue).toBeCloseTo(g.line);
    expect(supplyOf(s, cfg)).toBeCloseTo(g.old + g.pilot * g.unit * g.watt);
    // a block gives the line somewhere to lie down; whoever lies down stays
    s.money = 1e30;
    expect(buyModule(s, cfg, 'block')).toBe(true);
    expect(podsOf(s, cfg)).toBe((g.pilot + g.blocks[0]) * g.unit);
    for (let i = 0; i < 60 * 60; i++) stepPipe(s, cfg, DT);
    expect(s.asleep).toBeCloseTo(podsOf(s, cfg));
    // better terms bring more people a second; there are only so many of them, and of blocks
    const hire = cfg.modules.find((m) => m.kind === 'hire')!;
    const before = supplyOf(s, cfg);
    expect(buyModule(s, cfg, hire.id)).toBe(true);
    expect(supplyOf(s, cfg)).toBe(before);
    s.modules.block = g.blocks.length;
    expect(buyModule(s, cfg, 'block')).toBe(false);
    s.modules[hire.id] = hire.max;
    expect(buyModule(s, cfg, hire.id)).toBe(false);
  });

  it('test_towers_network_eats_no_more_than_it_asks_for_and_a_dial_changes_what_it_asks_and_pays', () => {
    const s = atTowers();
    const g = cfg.grid;
    // on the way in nothing is lost: the old grid feeds the network as before, everything that comes in is closed
    const entry = inflowOf(s, cfg);
    s.scale--;
    expect(inflowOf(s, cfg)).toBeCloseTo(entry);
    s.scale++;
    expect(fedOf(s, cfg)).toBe(g.old);
    expect(flowOf(s, cfg)).toBe(inflowOf(s, cfg));
    // sleepers add to what it gets — until it has eaten its fill
    s.asleep = 5 * g.unit;
    expect(inflowOf(s, cfg)).toBeCloseTo((entry * (g.old + 5 * g.unit * g.watt)) / g.old);
    s.asleep = wantedOf(s, cfg) * 3;
    expect(fedOf(s, cfg)).toBe(g.appetite);
    const full = inflowOf(s, cfg);
    expect(full).toBeCloseTo((entry * g.appetite) / g.old);
    // a copy asks for more and pays the same; a dial with a yield pays more for every gigawatt
    s.money = 1e30;
    const copy = cfg.net.find((p) => p.yield === 1)!;
    const think = cfg.net.find((p) => p.yield > 1)!;
    const pay = payOf(s, cfg);
    const price = netCost(s, copy);
    expect(buyNet(s, cfg, copy.id)).toBe(true);
    expect(demandOf(s, cfg)).toBeCloseTo(g.appetite * copy.draw);
    expect(inflowOf(s, cfg)).toBeCloseTo(full * copy.draw);
    expect(payOf(s, cfg)).toBeCloseTo(pay);
    expect(netCost(s, copy)).toBeGreaterThan(price);
    expect(buyNet(s, cfg, think.id)).toBe(true);
    expect(payOf(s, cfg)).toBeCloseTo(pay * think.yield);
    expect(demandOf(s, cfg)).toBeCloseTo(g.appetite * copy.draw * think.draw);
    // money is what goes to work times what it pays
    s.money = 0;
    s.gate = true;
    for (let i = 0; i < 60; i++) stepPipe(s, cfg, DT);
    expect(s.money).toBeCloseTo(inflowOf(s, cfg) * payOf(s, cfg), -6);
    expect(s.backlog).toBe(0);
    // a dial has only so many steps; before the towers the dials do nothing and cannot be turned
    s.net[copy.id] = copy.max;
    expect(buyNet(s, cfg, copy.id)).toBe(false);
    s.scale--;
    expect(payOf(s, cfg)).toBeCloseTo(pay);
    expect(buyNet(s, cfg, think.id)).toBe(false);
  });

  it('test_towers_hardware_is_invented_on_the_power_of_the_sleepers_and_waits_for_a_yes', () => {
    const s = atTowers();
    const g = cfg.grid;
    const chip = cfg.chips[0];
    s.gate = true;
    s.modules.block = 3;
    s.asleep = podsOf(s, cfg);
    const pay = payOf(s, cfg);
    const asks = demandOf(s, cfg);
    expect(takeChip(s, cfg)).toBeUndefined();
    // what the sleepers give adds up, gigawatt-second by gigawatt-second
    const seconds = Math.ceil(chip.need / (s.asleep * g.watt)) + 1;
    for (let i = 0; i < seconds * 60; i++) stepPipe(s, cfg, DT);
    expect(labOf(s, cfg)).toBe(1);
    expect(payOf(s, cfg)).toBeCloseTo(pay); // nothing changes until it is signed
    expect(takeChip(s, cfg)).toBe(chip);
    expect(s.chips).toBe(1);
    expect(payOf(s, cfg)).toBeCloseTo(pay * chip.yield);
    expect(demandOf(s, cfg)).toBeCloseTo(asks * chip.draw);
    // what was given above the need is not lost: it goes towards the next one
    expect(labOf(s, cfg)).toBeGreaterThan(0);
    expect(labOf(s, cfg)).toBeLessThan(0.5);
  });

  it('manager helps fill the quarter and stops when it is ready', () => {
    const s = atTowers();
    s.gate = true;
    s.money = 1e30;
    s.modules.block = cfg.grid.blocks.length - 1;
    s.modules.hire = cfg.modules.find(m => m.kind === 'hire')!.max;
    s.asleep = podsOf(s, cfg);
    expect(managerPick(s, cfg)).toBe('mod:block');
    buyModule(s, cfg, 'block');
    s.asleep = podsOf(s, cfg);
    expect(managerPick(s, cfg)).toBeNull();
  });

  it('test_planet_nodes_stand_where_the_cable_has_reached_and_the_cable_carries_only_so_much', () => {
    const s = atTowers();
    const g = cfg.grid;
    const w = cfg.world;
    s.money = 1e40;
    s.gate = true;
    // the planet opens from a quarter that is built and slept in
    expect(buyScale(s, cfg)).toBe(false);
    s.modules.block = g.blocks.length;
    expect(scaleReady(s, cfg)).toBe(false);
    s.asleep = podsOf(s, cfg);
    expect(quartered(s, cfg)).toBe(true);
    expect(buyScale(s, cfg)).toBe(true);
    const quarter = podsOf(s, cfg);
    // home has room for one node; the next one needs a region the cable has reached
    expect(buyModule(s, cfg, 'node')).toBe(true);
    expect(buyModule(s, cfg, 'node')).toBe(false);
    expect(buyModule(s, cfg, 'span')).toBe(true);
    expect(buyModule(s, cfg, 'node')).toBe(true);
    expect(nodesOf(s, cfg)).toBe(2);
    expect(podsOf(s, cfg)).toBe(quarter + 2 * w.node);
    // a node fills by itself: the line stands everywhere by now
    for (let i = 0; i < 60 * 60; i++) stepPipe(s, cfg, DT);
    expect(s.asleep).toBeCloseTo(podsOf(s, cfg));
    // the network may ask for anything: the cable brings it no more than it carries
    for (const dial of cfg.net) s.net[dial.id] = dial.max;
    expect(supplyOf(s, cfg)).toBeGreaterThan(w.wire);
    expect(fedOf(s, cfg)).toBe(w.wire);
    expect(buyModule(s, cfg, 'thread')).toBe(true);
    expect(wireOf(s, cfg)).toBe(w.wire * 2);
    expect(fedOf(s, cfg)).toBeCloseTo(supplyOf(s, cfg));
    // the last span closes the ring: twice as much again
    s.modules.span = w.regions.length - 1;
    expect(buyModule(s, cfg, 'span')).toBe(true);
    expect(wireOf(s, cfg)).toBe(w.wire * 4);
    expect(buyModule(s, cfg, 'span')).toBe(false);
  });

  it('test_planet_the_picture_has_a_place_for_every_node_the_data_sells', () => {
    // the first region of the picture holds home as well: the quarter of the screen before
    expect(globe.regions.map((r, i) => r.nodes.length - (i === 0 ? 1 : 0))).toEqual(cfg.world.regions);
    expect(cfg.modules.find((m) => m.kind === 'node')!.max).toBe(cfg.world.regions.reduce((n, x) => n + x, 0));
    expect(cfg.modules.find((m) => m.kind === 'span')!.max).toBe(cfg.world.regions.length);
    expect(cfg.modules.find((m) => m.kind === 'block')!.max).toBe(cfg.grid.blocks.length);
    // every sleeper of the planet is one of the people the game has put out of work
    const idle = cfg.sources.reduce((n, src) => n + (src.max - src.start) * (src.staff ?? 0), 0);
    const places = (cfg.grid.pilot + cfg.grid.blocks.reduce((n, x) => n + x, 0)) * cfg.grid.unit + cfg.world.regions.reduce((n, x) => n + x, 0) * cfg.world.node;
    // …and there is a place for every one of them: nobody is left idle at the end
    expect(places).toBeGreaterThanOrEqual(idle);
    expect(places).toBeLessThan(idle + 100);
  });

  it('test_pipe_prices_grow_and_money_is_required', () => {
    const s = createPipe(cfg);
    const freelance = cfg.sources.find((x) => x.id === 'freelance')!;
    expect(sourcePrice(freelance, 1)).toBeGreaterThan(sourcePrice(freelance, 0));
    s.money = 0;
    expect(buySource(s, cfg, 'freelance')).toBe(false);
    expect(buyPlan(s, cfg)).toBe(false);
    expect(buySubagent(s, cfg)).toBe(false);
    expect(s.money).toBe(0);
  });
});

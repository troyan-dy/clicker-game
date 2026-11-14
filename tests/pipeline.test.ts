import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng';
import autoData from '../src/data/balance/auto.json';
import farmData from '../src/data/balance/farms.json';
import gradeData from '../src/data/balance/grades.json';
import lineData from '../src/data/balance/lines.json';
import managerData from '../src/data/balance/managers.json';
import planData from '../src/data/balance/plans.json';
import scaleData from '../src/data/balance/scales.json';
import sourceData from '../src/data/balance/sources.json';
import tuningData from '../src/data/tuning/pipeline.json';
import { createEvents, stepEvents, takeEvent } from '../src/systems/events/events';
import { managerPick } from '../src/systems/manager/manager';
import type { Plan } from '../src/systems/plan/plan';
import {
  backlogCap,
  buyFarm,
  aimAt,
  buyBribe,
  buyGrade,
  buyLine,
  buyManager,
  buyNoAsk,
  buyScale,
  buyPlan,
  buySource,
  buySubagent,
  claudeRate,
  createPipe,
  farmCost,
  farmPrice,
  finished,
  inflowOf,
  payOf,
  pressPipe,
  sessionsOf,
  sourceInflow,
  sourcePrice,
  stepPipe,
  unemploymentOf,
  type Farm,
  type Line,
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
    s.money = 1e18;
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

  it('test_manager_buys_only_what_is_needed_and_within_his_share', () => {
    const s = rich();
    buyNoAsk(s, cfg);
    expect(buyManager(s, cfg, 2)).toBe(true);
    expect(buyManager(s, cfg, 2)).toBe(false); // one manager per screen
    expect(managerPick(s, cfg, 2, null, 0.3)).toBeNull(); // nothing is short: he keeps the money
    expect(managerPick(s, cfg, 2, 'sessions', 0.3)).toBe('sub');
    expect(managerPick(s, cfg, 2, 'tasks', 0.3)).toBe('src:freelance'); // the cheapest work on sale
    s.money = 20;
    expect(managerPick(s, cfg, 2, 'tasks', 0.3)).toBeNull(); // dearer than his share of the money
    s.money = 1e12;
    expect(managerPick(s, cfg, 3, 'tasks', 0.3)).toMatch(/^src:/);
    expect(managerPick(s, cfg, 3, 'sessions', 0.3)).toBe('farm:rack');
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
    s.allowance = true;
    // the allowance takes its share of the pay; the price itself falls less
    expect(payOf(s, cfg)).toBeCloseTo(t.pay * (1 - t.slump * t.relief * u) * (1 - t.allowance));
    run(s, t.ordersRise + 1, 0);
    expect(inflowOf(s, cfg)).toBeCloseTo(work * (1 + t.orders * u)); // the more people are out of work, the more they order
    s.allowance = false;
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
    s.allowance = true;
    expect(payOf(s, cfg)).toBeCloseTo(full * (1 - cfg.tuning.slump * cfg.tuning.relief * u) * (1 - cfg.tuning.allowance));
    // a new market: nobody is out of work there yet
    s.scale = 2;
    s.allowance = false;
    expect(payOf(s, cfg)).toBeCloseTo(full);
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
    expect(s.owned[first.id]).toBeCloseTo((line.rate * 10) / first.staff!, 4);
    // aimed at another employer, the robots go there
    const other = cfg.sources.filter((x) => x.made === 'android')[1];
    expect(aimAt(s, cfg, other.id)).toBe(true);
    const before = s.owned[first.id];
    for (let i = 0; i < 600; i++) stepPipe(s, cfg, DT);
    expect(s.owned[first.id]).toBe(before);
    expect(s.owned[other.id]).toBeGreaterThan(0);
    // enough robots take an employer whole — and say so once
    s.lines.android = 1e6;
    let done: string[] = [];
    for (let i = 0; i < 120; i++) done = done.concat(stepPipe(s, cfg, DT).done);
    expect(done.filter((id) => id === other.id).length).toBe(1);
    expect(s.owned[other.id]).toBe(other.max);
  });

  it('test_game_ends_when_the_last_screen_is_taken_whole', () => {
    const s = createPipe(cfg);
    s.noAsk = true;
    s.scale = cfg.scales.length;
    const last = 2 + cfg.scales.length;
    expect(finished(s, cfg)).toBe(false);
    for (const src of cfg.sources) if (src.screen === last) s.owned[src.id] = src.max;
    expect(finished(s, cfg)).toBe(true);
    s.scale--;
    expect(finished(s, cfg)).toBe(false);
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

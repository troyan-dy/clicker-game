import { describe, expect, it } from 'vitest';
import autoData from '../src/data/balance/auto.json';
import farmData from '../src/data/balance/farms.json';
import gradeData from '../src/data/balance/grades.json';
import planData from '../src/data/balance/plans.json';
import scaleData from '../src/data/balance/scales.json';
import sourceData from '../src/data/balance/sources.json';
import tuningData from '../src/data/tuning/pipeline.json';
import type { Plan } from '../src/systems/plan/plan';
import {
  backlogCap,
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
  sessionsOf,
  sourceInflow,
  sourcePrice,
  stepPipe,
  type Farm,
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

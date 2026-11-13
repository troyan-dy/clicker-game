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
  type PipeConfig,
  type PipeState,
  type Source,
} from '../src/systems/pipeline/pipeline';

const cfg: PipeConfig = {
  tuning: tuningData,
  plans: planData as Plan[],
  sources: sourceData as Source[],
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

  it('test_pipe_start_income_is_capped_by_the_inflow_of_tasks', () => {
    const s = createPipe(cfg);
    const start = s.money;
    run(s, 60, 6);
    const perSec = (s.money - start) / cfg.tuning.pay / 60; // tasks per second
    expect(inflowOf(s, cfg)).toBeLessThan(claudeRate(s, cfg)); // the job gives less than Pro can do
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

  it('test_pipe_brick_presses_instead_of_the_player', () => {
    const s = rich();
    buySource(s, cfg, 'job'); // inflow 2.5/s
    buyPlan(s, cfg); // Max 5x: 3.75/s
    expect(buyBrick(s, cfg)).toBe(true);
    expect(buyBrick(s, cfg)).toBe(false); // one brick only: it does not scale
    const start = s.money;
    run(s, 60, 0);
    const perSec = (s.money - start) / cfg.tuning.pay / 60; // tasks per second
    expect(perSec).toBeGreaterThan(2.3);
    expect(perSec).toBeLessThan(2.6);
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
    buySubagent(s, cfg); // two sessions at Pro: 1.5/s, the player does nothing
    const start = s.money;
    run(s, 60, 0);
    const perSec = (s.money - start) / cfg.tuning.pay / 60; // tasks per second
    expect(perSec).toBeGreaterThan(1.4);
    expect(perSec).toBeLessThan(1.6);
    expect(s.closedBySubagents).toBeGreaterThan(80);
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

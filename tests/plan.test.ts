import { describe, expect, it } from 'vitest';
import planData from '../src/data/balance/plans.json';
import { buyNextPlan, createPlan, nextPlan, type Plan } from '../src/systems/plan/plan';

const plans = planData as Plan[];

describe('plan', () => {
  it('test_plan_not_enough_money_buys_nothing', () => {
    const s = createPlan();
    expect(buyNextPlan(plans, s, plans[1].price - 1)).toBe(0);
    expect(s.index).toBe(0);
  });

  it('test_plan_buy_moves_to_next_and_returns_price', () => {
    const s = createPlan();
    expect(buyNextPlan(plans, s, 1000)).toBe(plans[1].price);
    expect(s.index).toBe(1);
  });

  it('test_plan_last_plan_has_no_next', () => {
    const s = { index: plans.length - 1 };
    expect(nextPlan(plans, s)).toBeUndefined();
    expect(buyNextPlan(plans, s, 1e9)).toBe(0);
  });

  it('test_plan_data_every_plan_is_faster_and_dearer', () => {
    for (let i = 1; i < plans.length; i++) {
      expect(plans[i].rate).toBeGreaterThan(plans[i - 1].rate);
      expect(plans[i].price).toBeGreaterThan(plans[i - 1].price);
    }
  });
});

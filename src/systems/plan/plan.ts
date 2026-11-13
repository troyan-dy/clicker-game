/**
 * M03 «Подписка Клода». The plan sets how fast Claude sends requests; plans are bought in order.
 * Pure logic; the list itself lives in src/data/balance/plans.json.
 */
export interface Plan {
  id: string;
  name: string;
  /** dollars; the first plan is already paid for at the start */
  price: number;
  /** requests per second Claude sends on this plan */
  rate: number;
  /** the screen it appears in the shop from; absent — from the start */
  screen?: number;
  note: string;
}

export interface PlanState {
  index: number;
}

export function createPlan(): PlanState {
  return { index: 0 };
}

export function nextPlan(plans: readonly Plan[], s: PlanState): Plan | undefined {
  return plans[s.index + 1];
}

/** Buys the next plan if the money is there. Returns the price paid, or 0 if nothing was bought. */
export function buyNextPlan(plans: readonly Plan[], s: PlanState, money: number): number {
  const next = nextPlan(plans, s);
  if (!next || money < next.price) return 0;
  s.index++;
  return next.price;
}

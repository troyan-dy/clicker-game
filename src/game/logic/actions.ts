import type { Rng } from '../../core/rng';
import type { Legend } from '../../content/legends';
import limit from '../../data/tuning/limit.json';
import stackTuning from '../../data/tuning/stack.json';
import strike from '../../data/tuning/strikes.json';
import events from '../../data/tuning/events.json';
import {
  bonus,
  discount,
  flowOf,
  payOf,
  type PipeConfig,
  type PipeState,
} from '../../systems/pipeline/pipeline';
import { stackWorth, takeStack, type StackState } from '../../systems/stack/stack';
import { startIncident } from '../../systems/intern/incident';
import type { SavedMeta } from '../../systems/save/save';

export function flowIncome(s: PipeState, cfg: PipeConfig): number {
  return flowOf(s, cfg) * payOf(s, cfg);
}

export function strikePrice(income: number): number {
  return Math.max(1, Math.floor(income * strike.priceSeconds));
}

export function settleStrike(s: PipeState, id: string, price: number): 'absent' | 'poor' | 'paid' {
  if (!s.strikes.includes(id)) return 'absent';
  if (s.money < price) return 'poor';
  s.money -= price;
  s.strikes = s.strikes.filter((strike) => strike !== id);
  return 'paid';
}

export function cycleAllowance(s: PipeState, levels: number): string {
  s.allowance = (s.allowance + 1) % (levels + 1);
  if (!s.allowance) return 'ubi:off';
  if (s.allowance > 1) return 'ubi:more';
  return s.strikes.length ? 'strike:over' : 'ubi:on';
}

export function rewardCall(s: PipeState, cfg: PipeConfig, meta: SavedMeta, standup: boolean): void {
  const count = standup ? 2 : 1;
  const worth = Math.floor(flowIncome(s, cfg) * events.worthSeconds * (1 + bonus(s, cfg, 'calls')));
  s.money += count * worth;
  s.presses++;
  meta.calls += count;
}

export function limitOffer(s: PipeState, cfg: PipeConfig) {
  return {
    price: Math.floor(flowIncome(s, cfg) * limit.priceSeconds),
    wait: limit.wait * discount(s, cfg, 'limit'),
  };
}

export function buyUsage(s: PipeState, price: number): boolean {
  if (s.limited <= 0 || s.money < price) return false;
  s.limited = 0;
  s.money -= price;
  return true;
}

export function limitClock(limited: number): string {
  const left = Math.ceil((limited / limit.wait) * limit.fakeHours * 3600);
  const two = (n: number) => String(n).padStart(2, '0');
  return `${Math.floor(left / 3600)}:${two(Math.floor((left % 3600) / 60))}:${two(left % 60)}`;
}

export function pickLegend(
  legends: readonly Legend[],
  owned: readonly string[],
  chance: number,
  rng: Rng,
): Legend | null {
  if (rng.next() >= chance) return null;
  const fresh = legends.filter((l) => !owned.includes(l.id));
  return rng.pick(fresh.length ? fresh : legends);
}

export function pileWorth(
  s: PipeState,
  cfg: PipeConfig,
  stack: StackState,
  legendary: boolean,
): number {
  return (
    stackWorth(stack, stackTuning, flowIncome(s, cfg)) *
    (legendary ? stackTuning.legendMult : 1) *
    (1 + bonus(s, cfg, 'stack'))
  );
}

export function approveStack(
  s: PipeState,
  cfg: PipeConfig,
  meta: SavedMeta,
  stack: StackState,
  legend: Legend | null,
  closed: boolean,
): boolean {
  if (closed || stack.fill < 1) return false;
  s.money += pileWorth(s, cfg, stack, !!legend);
  takeStack(stack, stackTuning);
  s.presses++;
  meta.piles++;
  if (legend && !meta.legends.includes(legend.id)) {
    meta.legends.push(legend.id);
    if (legend.id === 'intern') meta.intern = startIncident(flowIncome(s, cfg));
  }
  return true;
}

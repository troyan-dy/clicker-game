import { expect, it, vi } from 'vitest';
import { createRng } from '../src/core/rng';
import limit from '../src/data/tuning/limit.json';
import { flowIncome } from '../src/game/logic/actions';
import { resolveUprising, startUsageLimit, toggleManager } from '../src/game/logic/management';
import { createPipe } from '../src/systems/pipeline/pipeline';
import { freshMeta } from '../src/systems/save/save';
import { cfg } from './fixtures/pipe';

it('toggles the manager for a hired screen and preserves the global preference on other screens', () => {
  const state = createPipe(cfg);
  const meta = freshMeta();
  state.managers = [3];
  expect(toggleManager(state, meta, 2)).toBe(false);
  expect(meta.managerOff).toBe(false);
  expect(toggleManager(state, meta, 3)).toBe(true);
  expect(meta.managerOff).toBe(true);
  expect(toggleManager(state, meta, 4)).toBe(false);
  expect(meta.managerOff).toBe(true);
  expect(toggleManager(state, meta, 3)).toBe(true);
  expect(meta.managerOff).toBe(false);
});

it('starts the discounted outage, records the limit and draws the next interval from the configured range', () => {
  const state = createPipe(cfg);
  const meta = freshMeta();
  const perk = cfg.sources.find((src) => src.perk?.kind === 'limit' && src.perk.value < 1)!;
  state.owned[perk.id] = perk.max;
  meta.limits = 3;
  const rng = createRng(4);
  const range = vi.spyOn(rng, 'range');
  const oldMoney = state.money;
  const expectedPrice = Math.floor(flowIncome(state, cfg) * limit.priceSeconds);
  const quote = startUsageLimit(state, cfg, meta, rng);
  expect(quote.price).toBe(expectedPrice);
  expect(quote.wait).toBeCloseTo(limit.wait * (1 - perk.perk!.value));
  expect(state.limited).toBe(quote.wait);
  expect(state.money).toBe(oldMoney);
  expect(meta.limits).toBe(4);
  expect(range).toHaveBeenCalledExactlyOnceWith(...limit.every);
  expect(quote.nextIn).toBeGreaterThanOrEqual(limit.every[0]);
  expect(quote.nextIn).toBeLessThan(limit.every[1]);
});

it('records each march, rotates its news and applies police protection only to robots at work', () => {
  const state = createPipe(cfg);
  const meta = freshMeta();
  const employer = cfg.sources.find((src) => src.made && src.staff)!;
  const empty = resolveUprising(state, cfg, meta, 0.25);
  expect(empty).toEqual({ lost: 0, index: 0 });
  expect(meta.riots).toBe(1);
  state.owned[employer.id] = 2;
  state.police = 2;
  const result = resolveUprising(state, cfg, meta, 0.25);
  const lostShare = 0.25 * (1 - cfg.police.guard) ** 2;
  expect(result.index).toBe(1);
  expect(result.lost).toBeCloseTo(2 * employer.staff! * lostShare);
  expect(state.owned[employer.id]).toBeCloseTo(2 * (1 - lostShare));
  expect(meta.riots).toBe(2);
});

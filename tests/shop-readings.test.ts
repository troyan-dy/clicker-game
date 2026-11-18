import { expect, it } from 'vitest';
import { addedSessionRate, discountPercent, marketProgress, pileRequests, promotedPay, relativeFill, shortagePercent, worldExpansion } from '../src/game/logic/shopReadings';
import { buyGrade, createPipe, payOf, subagentRate } from '../src/systems/pipeline/pipeline';
import { cfg } from './fixtures/pipe';

it('shows discounts and shortages only after their own display thresholds', () => {
  expect([1, 0.995, 0.9949, 0.875].map(discountPercent)).toEqual([0, 0, 1, 13]);
  expect([0.98, 1.02, 1.0201, 1.126].map(shortagePercent)).toEqual([0, 0, 2, 13]);
});

it('quotes the pay after a real promotion, preserving the current allowance', () => {
  const s = createPipe(cfg);
  s.money = 1e9;
  s.allowance = 1;
  const quote = promotedPay(s, cfg, cfg.grades[s.grade + 1].mult);
  expect(buyGrade(s, cfg)).toBe(true);
  expect(payOf(s, cfg)).toBeCloseTo(quote, 12);
});

it('quotes the production a farm adds even while a usage limit pauses its sessions', () => {
  const s = createPipe(cfg);
  const farm = cfg.farms[0];
  const before = subagentRate(s, cfg);
  s.farms[farm.id] = 1;
  const added = subagentRate(s, cfg) - before;
  expect(added).toBeGreaterThan(0);
  s.limited = 15;
  expect(subagentRate(s, cfg)).toBe(0);
  expect(addedSessionRate(s, cfg, farm.sessions)).toBeCloseTo(added, 12);
});

it('counts waiting questions across the player and extra sessions', () => {
  expect(pileRequests(0.01, 0)).toBe(1);
  expect(pileRequests(0.5, 4)).toBe(3);
  expect(pileRequests(1, 4)).toBe(5);
});

it('keeps stopped production at zero and gives peer meters a common scale', () => {
  expect(relativeFill(0, 0)).toBe(0);
  expect(relativeFill(0.5, 2)).toBe(0.25);
  expect(relativeFill(2, 0.5)).toBe(1);
});

it('counts partial employers on a normal market and whole trades at the factory', () => {
  const s = createPipe(cfg);
  const employers = ['first', 'partial', 'missing'].map(id => ({ ...cfg.sources[0], id, max: 4 }));
  s.owned.first = 4;
  s.owned.partial = 1.5;
  expect(marketProgress(s, employers, false)).toEqual({ taken: 5.5, total: 12 });
  expect(marketProgress(s, employers, true)).toEqual({ taken: 1, total: 3 });
  expect(marketProgress(s, [], true)).toEqual({ taken: 0, total: 0 });
});

it('quotes the next cable destination and crew availability for both initial routes', () => {
  const s = createPipe(cfg);
  const grid = { ...cfg, grid: { ...cfg.grid, watt: 0.25 }, world: { ...cfg.world, regions: [1, 4, 3], node: 40 } };
  expect(worldExpansion(s, grid, 0, 0, true)).toEqual({
    allSites: 8, nextNode: 1, nextSpan: 1, destination: 1, nodePower: 10, eastCrew: false,
  });
  s.cableRoute = 'eastasia';
  expect(worldExpansion(s, grid, 0, 0, true).destination).toBe(2);
  expect(worldExpansion(s, grid, 1, 0, true).eastCrew).toBe(false);
  expect(worldExpansion(s, grid, 1, 1, false).eastCrew).toBe(false);
  expect(worldExpansion(s, grid, 1, 1, true)).toMatchObject({ destination: 1, eastCrew: true });
  expect(worldExpansion(s, grid, 3, 8, false)).toMatchObject({ nextSpan: 3, nextNode: 8, eastCrew: false });
});

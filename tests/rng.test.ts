import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng';

describe('rng', () => {
  it('test_rng_same_seed_same_sequence', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('test_rng_different_seed_different_sequence', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it('test_rng_int_stays_in_bounds', () => {
    const r = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.int(3, 6);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(6);
    }
  });
});

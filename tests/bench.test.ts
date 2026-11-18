import { describe, expect, it } from 'vitest';
import {
  birdRate,
  createBench,
  refuseBird,
  stepBench,
  throwBread,
  type BenchTuning,
} from '../src/systems/bench/bench';

const tuning: BenchTuning = {
  birds: 1,
  birdsPerSlice: 1,
  birdsMax: 3,
  lure: 0.5,
  waitMax: 2,
  lieMax: 1,
  loaf: 3,
  delivery: 4,
  autoRate: 2,
  offerAfter: 2,
};

describe('park bench', () => {
  it('serves waiting birds first, limits the bread on the lawn and replaces an empty loaf once', () => {
    const park = createBench(tuning);
    expect(stepBench(park, tuning, 1).landed).toBe(1);
    expect(throwBread(park, tuning)).toBe('fed');
    expect(throwBread(park, tuning)).toBe('lawn');
    expect(throwBread(park, tuning)).toBe('lawn');
    expect(park).toMatchObject({ waiting: 0, lying: 1, fed: 1, thrown: 3, loaf: 0, courier: 4 });
    expect(throwBread(park, tuning)).toBe('empty');
    expect(birdRate(park, tuning)).toBe(3.5);

    expect(stepBench(park, tuning, 1)).toEqual({
      landed: 2,
      snatched: 1,
      delivered: false,
      auto: 0,
    });
    expect(park).toMatchObject({
      waiting: 2,
      lying: 0,
      fed: 2,
      arriveAcc: 0.5,
      loaf: 0,
      courier: 3,
    });
    expect(stepBench(park, tuning, 3)).toEqual({
      landed: 0,
      snatched: 0,
      delivered: true,
      auto: 0,
    });
    expect(park).toMatchObject({ loaf: 3, courier: 0, waiting: 2, thrown: 3 });
    expect(stepBench(park, tuning, 1).delivered).toBe(false);
  });

  it('dismisses a waiting bird without feeding it or consuming bread', () => {
    const park = createBench(tuning);
    expect(refuseBird(park)).toBe(false);
    stepBench(park, tuning, 1);
    expect(refuseBird(park)).toBe(true);
    expect(refuseBird(park)).toBe(false);
    expect(park).toMatchObject({ refused: 1, waiting: 0, fed: 0, loaf: tuning.loaf });
  });

  it('retains fractional automatic throws between ticks and clears them when switched off', () => {
    const park = createBench(tuning);
    park.auto = true;
    expect(stepBench(park, tuning, 0.25).auto).toBe(0);
    expect(stepBench(park, tuning, 1).auto).toBe(2);
    expect(stepBench(park, tuning, 0.25).auto).toBe(1);
    stepBench(park, tuning, 0.25);
    park.auto = false;
    expect(stepBench(park, tuning, 3).auto).toBe(0);
    park.auto = true;
    expect(stepBench(park, tuning, 0.25).auto).toBe(0);
    expect(park.loaf).toBe(tuning.loaf);
  });
});

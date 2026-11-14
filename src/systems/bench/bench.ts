/**
 * The bench after the credits (M30): the first screen of the game turned inside out. Birds fly in
 * instead of tasks, a press throws a whole slice of bread instead of saying «Да», nothing is earned
 * and nothing is short. Pure logic: no rendering, no clocks of its own; the numbers come from src/data.
 */

export interface BenchTuning {
  /** birds that fly in per second at the start */
  birds: number;
  /** …what every slice thrown adds to that, and where it stops */
  birdsPerSlice: number;
  birdsMax: number;
  /** birds per second every slice lying on the lawn adds: bread in plain sight is noticed */
  lure: number;
  /** birds that can wait on the lawn at once */
  waitMax: number;
  /** slices that may lie on the lawn when nobody is there to take them */
  lieMax: number;
  /** slices in a loaf */
  loaf: number;
  /** seconds the courier needs to bring the next loaf */
  delivery: number;
  /** slices per second Claude throws once he is asked to */
  autoRate: number;
  /** slices thrown by hand after which Claude offers to do it himself */
  offerAfter: number;
}

export interface BenchState {
  /** slices thrown in all, by the player and by Claude */
  thrown: number;
  /** birds that got a slice */
  fed: number;
  /** birds waiting on the lawn */
  waiting: number;
  /** slices lying on the lawn: thrown when nobody waited */
  lying: number;
  /** slices left in the bag */
  loaf: number;
  /** seconds until the courier brings the next loaf; 0 — nobody is on the way */
  courier: number;
  /** Claude throws the bread himself */
  auto: boolean;
  /** times the player said «Нет» */
  refused: number;
  arriveAcc: number;
  autoAcc: number;
}

export type ThrowResult = 'fed' | 'lawn' | 'empty';

export function createBench(t: BenchTuning): BenchState {
  return { thrown: 0, fed: 0, waiting: 0, lying: 0, loaf: t.loaf, courier: 0, auto: false, refused: 0, arriveAcc: 0, autoAcc: 0 };
}

/** birds per second that fly in now: the word about the bread spreads, and slices on the lawn are seen from afar */
export function birdRate(b: BenchState, t: BenchTuning): number {
  return Math.min(t.birdsMax, t.birds + b.thrown * t.birdsPerSlice) + b.lying * t.lure;
}

/**
 * Advances the park by dt seconds. `landed` — birds that came and wait; `snatched` — birds that came
 * and took a slice lying on the lawn; `delivered` — the courier has brought a loaf; `auto` — slices
 * Claude throws now (the caller throws them one by one).
 */
export function stepBench(b: BenchState, t: BenchTuning, dt: number): { landed: number; snatched: number; delivered: boolean; auto: number } {
  const out = { landed: 0, snatched: 0, delivered: false, auto: 0 };
  if (b.courier > 0) {
    b.courier -= dt;
    if (b.courier <= 0) {
      b.courier = 0;
      b.loaf = t.loaf;
      out.delivered = true;
    }
  }
  b.arriveAcc += birdRate(b, t) * dt;
  while (b.arriveAcc >= 1) {
    b.arriveAcc--;
    if (b.lying > 0) {
      // bread is already there: the bird takes it and does not wait
      b.lying--;
      b.fed++;
      out.snatched++;
    } else if (b.waiting < t.waitMax) {
      b.waiting++;
      out.landed++;
    }
  }
  if (b.auto) {
    b.autoAcc += t.autoRate * dt;
    out.auto = Math.floor(b.autoAcc);
    b.autoAcc -= out.auto;
  } else b.autoAcc = 0;
  return out;
}

/** One whole slice is thrown. «fed» — a waiting bird got it; «lawn» — nobody waited, it lies there; «empty» — the bag is empty. */
export function throwBread(b: BenchState, t: BenchTuning): ThrowResult {
  if (b.loaf <= 0) return 'empty';
  b.loaf--;
  b.thrown++;
  if (b.loaf === 0 && b.courier <= 0) b.courier = t.delivery;
  if (b.waiting > 0) {
    b.waiting--;
    b.fed++;
    return 'fed';
  }
  if (b.lying < t.lieMax) b.lying++;
  return 'lawn';
}

/** «Нет»: the bird that waited longest leaves without bread. False — nobody was waiting. */
export function refuseBird(b: BenchState): boolean {
  if (b.waiting <= 0) return false;
  b.waiting--;
  b.refused++;
  return true;
}

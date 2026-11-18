import { BENCH } from '../../content/bench';
import tuning from '../../data/tuning/bench.json';
import { refuseBird, throwBread, type BenchState } from '../../systems/bench/bench';
import type { PipeState } from '../../systems/pipeline/pipeline';
import type { SavedMeta } from '../../systems/save/save';

export function tossSlice(park: BenchState, state: PipeState, meta: SavedMeta, automatic: boolean) {
  const onWay = park.courier > 0;
  const result = throwBread(park, tuning);
  let message = '';
  if (!automatic && result !== 'empty') {
    state.presses++;
    meta.bread++;
    message = BENCH.milestones[meta.bread] ?? (meta.bread === tuning.offerAfter && !park.auto ? BENCH.quips.offer : '');
  }
  return { result, message, courierStarted: park.courier > 0 && !onWay };
}

export function toggleFeeding(park: BenchState, meta: SavedMeta): void {
  park.auto = !park.auto;
  meta.benchAuto = park.auto;
  if (park.auto) meta.feeder = true;
}

export function refuseFeeding(park: BenchState, meta: SavedMeta) {
  const refused = refuseBird(park);
  meta.refused++;
  return { refused, useReply: refused || meta.refused === 1 };
}

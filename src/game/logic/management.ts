import type { Rng } from '../../core/rng';
import limit from '../../data/tuning/limit.json';
import { riot, riotShare, type PipeConfig, type PipeState } from '../../systems/pipeline/pipeline';
import type { SavedMeta } from '../../systems/save/save';
import { limitOffer } from './actions';

/** A manager can be paused or resumed only after being hired for the current screen. */
export function toggleManager(state: PipeState, meta: SavedMeta, stage: number): boolean {
  if (!state.managers.includes(stage)) return false;
  meta.managerOff = !meta.managerOff;
  return true;
}

export function startUsageLimit(state: PipeState, cfg: PipeConfig, meta: SavedMeta, rng: Rng) {
  const { price, wait } = limitOffer(state, cfg);
  state.limited = wait;
  meta.limits++;
  return { price, wait, nextIn: rng.range(limit.every[0], limit.every[1]) };
}

/** Reaching the factories counts as an uprising, even when there are no working robots to lose. */
export function resolveUprising(state: PipeState, cfg: PipeConfig, meta: SavedMeta, share: number) {
  const lost = riot(state, cfg, riotShare(state, cfg, share));
  const index = meta.riots;
  meta.riots++;
  return { lost, index };
}

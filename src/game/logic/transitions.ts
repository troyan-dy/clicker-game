import manager from '../../data/tuning/manager.json';
import {
  moduleCost,
  moduleRoom,
  scaleCost,
  scaleReady,
  type PipeState,
  type PipeConfig,
} from '../../systems/pipeline/pipeline';
import type { SavedMeta } from '../../systems/save/save';

export function managerOnDuty(
  s: PipeState,
  stage: number,
  meta: SavedMeta,
  onBench: boolean,
): boolean {
  return s.managers.includes(stage) && !meta.managerOff && !onBench;
}

/** A suspended manager keeps the time accumulated towards its next decision. */
export function managerClock(
  elapsed: number,
  dt: number,
  s: PipeState,
  stage: number,
  meta: SavedMeta,
  onBench: boolean,
) {
  if (!managerOnDuty(s, stage, meta, onBench) || meta.intern || s.limited > 0)
    return { elapsed, due: false };
  elapsed += dt;
  return elapsed < manager.period ? { elapsed, due: false } : { elapsed: 0, due: true };
}

export function transitionOffer(s: PipeState, cfg: PipeConfig, onWorld: boolean) {
  let offer: { action: string; name: string; price: number };
  if (onWorld) {
    const ark = cfg.modules.find((module) => module.kind === 'ark');
    if (!ark || (s.modules[ark.id] ?? 0) >= moduleRoom(s, cfg, ark)) return null;
    offer = { action: 'mod:' + ark.id, name: ark.name, price: moduleCost(s, ark) };
  } else {
    const next = cfg.scales[s.scale];
    if (!next || !scaleReady(s, cfg)) return null;
    offer = { action: 'scale', name: next.name, price: scaleCost(s, cfg) };
  }
  return !offer.name || s.money < offer.price ? null : offer;
}

export interface TransitionInterruptions {
  alreadyAsked: boolean;
  openCard: boolean;
  cinematic: boolean;
  departing: boolean;
  won: boolean;
  incident: boolean;
  calls: number;
  replyUntil: number;
  clock: number;
}

export function canInvite(t: TransitionInterruptions): boolean {
  return !(
    t.alreadyAsked ||
    t.openCard ||
    t.cinematic ||
    t.departing ||
    t.won ||
    t.incident ||
    t.calls ||
    t.replyUntil > t.clock
  );
}

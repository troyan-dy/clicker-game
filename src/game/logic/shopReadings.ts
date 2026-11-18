import { payOf, planRate, type PipeConfig, type PipeState, type Source } from '../../systems/pipeline/pipeline';
import { routeRegion } from '../../systems/pipeline/worldRoute';

/** Show discounts from half a percent and shortages strictly above two percent. */
export function discountPercent(multiplier: number): number {
  return multiplier < 0.995 ? Math.round((1 - multiplier) * 100) : 0;
}

export function shortagePercent(multiplier: number): number {
  return multiplier > 1.02 ? Math.round((multiplier - 1) * 100) : 0;
}

/** Potential production of the sessions being offered, including while processing is paused. */
export function addedSessionRate(s: PipeState, cfg: PipeConfig, sessions: number): number {
  return sessions * (planRate(s, cfg) * cfg.auto.subagent.share);
}

export function promotedPay(s: PipeState, cfg: PipeConfig, nextMultiplier: number): number {
  return (payOf(s, cfg) / cfg.grades[s.grade].mult) * nextMultiplier;
}

export function pileRequests(fill: number, extraSessions: number): number {
  return Math.max(1, Math.round(fill * (extraSessions + 1)));
}

/** Compare per-second quantities on a shared scale, including a stopped conveyor. */
export function relativeFill(value: number, other: number): number {
  return value / Math.max(value, other, 1e-9);
}

/** The factory counts whole trades. Earlier markets count individual purchases. */
export function marketProgress(s: PipeState, employers: Source[], factory: boolean) {
  let taken = 0;
  let total = 0;
  for (const employer of employers) {
    const owned = s.owned[employer.id] ?? 0;
    taken += factory ? Number(owned >= employer.max) : owned;
    total += factory ? 1 : employer.max;
  }
  return { taken, total };
}

export function worldExpansion(s: PipeState, cfg: PipeConfig, spans: number, nodes: number, canBuildNode: boolean) {
  const w = cfg.world;
  const allSites = w.regions.reduce((sum, sites) => sum + sites, 0);
  const nextSpan = Math.min(spans + 1, w.regions.length);
  return {
    allSites,
    nextNode: Math.min(allSites, nodes + 1),
    nextSpan,
    destination: routeRegion(s.cableRoute, nextSpan),
    nodePower: w.node * cfg.grid.watt,
    eastCrew: s.cableRoute === 'eastasia' && spans === 1 && nodes >= w.regions[0] && canBuildNode,
  };
}

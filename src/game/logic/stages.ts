import { finished, type PipeConfig, type PipeState } from '../../systems/pipeline/pipeline';
import type { EventsState, MapEvent } from '../../systems/events/events';
import type { SavedMeta } from '../../systems/save/save';

export function enterMarket(
  s: PipeState,
  cfg: PipeConfig,
  next: number,
  calls: EventsState,
  said: Record<string, number>,
) {
  calls.list = [];
  s.strikes = [];
  const announceAllowance = s.allowance > 0 && next < cfg.grid.screen;
  s.allowance = 0;
  const introduceSquads = !said.squads && cfg.sources.some((x) => x.screen === next && x.bribe);
  if (introduceSquads) said.squads = 1;
  return { announceAllowance, introduceSquads };
}

export function finaleAction(
  s: PipeState,
  cfg: PipeConfig,
  stage: number,
  won: boolean,
  departing: boolean,
): 'depart' | 'ending' | undefined {
  if (won || departing || !finished(s, cfg)) return undefined;
  return stage === cfg.world.screen ? 'depart' : 'ending';
}

export function chooseEnding(meta: SavedMeta, choice: number): void {
  meta.auto = choice === 1;
}

export function automaticWork(auto: boolean, fill: number, powered: boolean) {
  return { approve: auto && fill >= 1, sign: auto && powered };
}

export function automaticCall(
  auto: boolean,
  events: readonly MapEvent[],
  lifetime: number,
): boolean {
  return auto && events.some((event) => event.left < lifetime - 2);
}

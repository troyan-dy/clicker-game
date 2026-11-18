import { automaticCall } from './stages';
import type { Rng } from '../../core/rng';
import { CALLS } from '../../content/calls';
import { PICKET } from '../../content/picket';
import people from '../../data/tuning/people.json';
import { stepEvents, type EventsState, type EventsTuning } from '../../systems/events/events';
import {
  discount,
  unemploymentOf,
  type PipeConfig,
  type PipeState,
  type Source,
} from '../../systems/pipeline/pipeline';
import { stepRiots, type RiotState, type RiotTuning } from '../../systems/riots/riots';
import { stepStrikes, type StrikeState, type StrikeTuning } from '../../systems/strikes/strikes';

export function streetRiot(
  riots: RiotState,
  tuning: RiotTuning,
  dt: number,
  won: boolean,
  tradesTaken: boolean,
  s: PipeState,
  cfg: PipeConfig,
  rng: Rng,
) {
  if (won || tradesTaken) return null;
  return stepRiots(riots, tuning, dt, unemploymentOf(s, cfg) >= tuning.from, rng);
}

export function callOwners(
  stage: number,
  s: PipeState,
  cfg: PipeConfig,
  onSale: (x: Source) => boolean,
  placed: (id: string) => boolean,
): string[] {
  if (stage === cfg.grid.screen) {
    const owners = s.asleep >= cfg.grid.unit * 2 ? ['wake:0', 'wake:1'] : [];
    if (s.gate) owners.push('gate');
    return owners;
  }
  if (stage === cfg.world.screen) return ['wake:0', 'wake:1'];
  return cfg.sources
    .filter((x) => onSale(x) && (s.owned[x.id] ?? 0) > 0 && placed(x.id))
    .map((x) => x.id);
}

interface MeetingOptions {
  stage: number;
  jobs: number;
  owners: readonly string[];
  intern: boolean;
  won: boolean;
  departing: boolean;
  cardOpen: boolean;
  selfPlay: boolean;
}

export function advanceCalls(
  calls: EventsState,
  said: Record<string, number>,
  tuning: EventsTuning,
  dt: number,
  options: MeetingOptions,
  rng: Rng,
) {
  const missed = calls.list.some((e) => e.standup && e.left <= dt);
  if (missed) said.standup = 1;
  const ready =
    !said.standup &&
    !options.intern &&
    !options.won &&
    !options.departing &&
    !options.cardOpen &&
    (options.stage > 2 || options.owners.length >= 2 || options.jobs >= 2);
  stepEvents(
    calls,
    tuning,
    dt,
    options.owners,
    (CALLS[String(options.stage)] ?? []).length,
    rng,
    ready,
  );
  const answer = automaticCall(options.selfPlay, calls.list, tuning.life);
  return { missed, answer };
}

type Placard = { at: string; text: string; left: number };
export function advancePlacard(
  placard: Placard | null,
  countdown: number,
  dt: number,
  onStreet: boolean,
  allowance: number,
  owners: readonly string[],
  rng: Rng,
) {
  if (placard && (placard.left -= dt) <= 0) placard = null;
  countdown -= dt;
  if (countdown <= 0) {
    countdown = rng.range(people.sloganEvery[0], people.sloganEvery[1]);
    if (onStreet && !allowance && owners.length)
      placard = { at: rng.pick(owners), text: rng.pick(PICKET), left: people.sloganLife };
  }
  return { placard, countdown };
}

export function streetStrike(
  strike: StrikeState,
  tuning: StrikeTuning,
  dt: number,
  onStreet: boolean,
  owners: readonly string[],
  s: PipeState,
  cfg: PipeConfig,
  rng: Rng,
) {
  const doors = onStreet ? owners.filter((id) => !s.strikes.includes(id)) : [];
  const hit = stepStrikes(
    strike,
    tuning,
    dt,
    unemploymentOf(s, cfg),
    s.allowance > 0,
    s.strikes.length,
    doors,
    rng,
  );
  if (hit) s.strikes.push(hit);
  return hit;
}

export function limitDue(
  countdown: number,
  intern: boolean,
  cardOpen: boolean,
  s: PipeState,
  cfg: PipeConfig,
): boolean {
  return (
    countdown <= 0 && !intern && s.limited <= 0 && !cardOpen && discount(s, cfg, 'limit') > 0.01
  );
}

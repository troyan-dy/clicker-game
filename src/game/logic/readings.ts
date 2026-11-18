import type { HubTopology } from '../../view/hubView';
import type { GlobeTopology } from '../../view/globeView';
import type { TowerTopology } from '../../view/towerView';
import type { Neck } from '../../ui/terminal/terminal';
import type { BenchNeck } from '../../ui/bench/bench';
import type { BenchState } from '../../systems/bench/bench';
import {
  blocksOf,
  demandOf,
  fedOf,
  jobOf,
  labOf,
  moduleRoom,
  nextChip,
  nodesOf,
  outputOf,
  robotsOf,
  wantedOf,
  wearOf,
  type Module,
  type PipeConfig,
  type PipeState,
  type RobotKind,
} from '../../systems/pipeline/pipeline';

export function farmSessions(s: PipeState, cfg: PipeConfig, ids: readonly string[]): number {
  let n = 0;
  for (const f of cfg.farms) if (ids.includes(f.id)) n += (s.farms[f.id] ?? 0) * f.sessions;
  return n;
}

export function labShown(s: PipeState, cfg: PipeConfig): boolean {
  return !!nextChip(s, cfg) && (s.chips > 0 || labOf(s, cfg) >= 0.3);
}

export function hubReadings(
  s: PipeState,
  cfg: PipeConfig,
  stage: number,
  slots: number,
): HubTopology {
  const floors: Record<string, number> = {};
  const live: Record<string, boolean> = {};
  const dogs: Record<string, number> = {};
  let taken = 0;
  let total = 0;
  for (const src of cfg.sources) {
    if (src.screen !== stage) continue;
    const owned = s.owned[src.id] ?? 0;
    // a squad at work colours its unit in as it goes; robots take a `made` employer little by little
    const job = jobOf(s, src.id);
    floors[src.id] = (owned + (job ? 1 - job.left / job.total : 0)) / src.max;
    // the robot dogs that took the jobs stay at the door, and so does the pack that is at work
    if (src.work) dogs[src.id] = Math.min(3, owned) + (job ? 1 : 0);
    if (job || (src.made && owned < src.max)) live[src.id] = true;
    taken += owned;
    total += src.max;
  }
  // the park fills up as the work is taken вЂ” while the allowance is paid; without it the people stand with placards
  const rest = s.allowance && total ? Math.ceil((slots * taken) / total) : 0;
  const struck: Record<string, boolean> = {};
  for (const id of s.strikes) struck[id] = true;
  return {
    floors,
    farms: s.farms,
    picket: !s.allowance,
    rest,
    live,
    dogs,
    struck,
    guards: stage === cfg.police.screen ? s.police : 0,
  };
}

export function globeReadings(
  s: PipeState,
  cfg: PipeConfig,
  previous: Neck,
  departing: boolean,
): GlobeTopology {
  const mod = (kind: Module['kind']): Module | undefined =>
    cfg.modules.find((m) => m.kind === kind);
  const owned = (kind: Module['kind']): number => s.modules[mod(kind)?.id ?? ''] ?? 0;
  const can = (kind: Module['kind']): boolean => {
    const m = mod(kind);
    return !!m && owned(kind) < moduleRoom(s, cfg, m);
  };
  const quarter = (cfg.grid.pilot + cfg.grid.blocks.reduce((n, x) => n + x, 0)) * cfg.grid.unit;
  return {
    spans: owned('span'),
    route: s.cableRoute,
    nodes: nodesOf(s, cfg),
    asleep: Math.max(0, s.asleep - quarter) / cfg.world.node,
    threads: owned('thread'),
    hot: previous === 'wire',
    lab: nextChip(s, cfg) ? labOf(s, cfg) : -1,
    canNode: can('node'),
    canSpan: can('span'),
    gone: owned('ark') > 0 && !departing,
  };
}

export function towerReadings(s: PipeState, cfg: PipeConfig): TowerTopology {
  const unit = cfg.grid.unit;
  return {
    blocks: blocksOf(s, cfg),
    asleep: s.asleep / unit,
    queue: s.queue / unit,
    fed: fedOf(s, cfg) / demandOf(s, cfg),
    spare: s.asleep > wantedOf(s, cfg) + unit * 0.5,
    lab: labShown(s, cfg) ? labOf(s, cfg) : -1,
    chips: s.chips,
    next: s.gate,
  };
}

export function bestAllowance(t: PipeConfig['tuning'], u: number, neck: Neck): number {
  const gain = (step: number): number => {
    const r = step / t.allowanceLevels;
    return (
      (1 - t.slump * u * (1 - r)) *
      (1 - t.allowance * step) *
      (neck === 'tasks' ? 1 + t.orders * r * u : 1)
    );
  };
  let best = 0;
  for (let step = 1; step <= t.allowanceLevels; step++)
    if (gain(step) > gain(best) + 0.005) best = step;
  return best;
}

export function fleetReadings(s: PipeState, cfg: PipeConfig) {
  let working = 0;
  let made = 0;
  let broken = 0;
  let shortage: RobotKind | null = null;
  for (const kind of ['android', 'robodog'] as const) {
    working += robotsOf(s, cfg, kind);
    made += outputOf(s, cfg, kind);
    broken += wearOf(s, cfg, kind);
    // a kind that breaks faster than it is made, with jobs still to hold
    if (wearOf(s, cfg, kind) > outputOf(s, cfg, kind) && robotsOf(s, cfg, kind) > 0)
      shortage = kind;
  }
  return { working, made, broken, shortage };
}

export function benchBottleneck(b: BenchState, max: number): BenchNeck {
  return b.loaf <= 0
    ? 'bread'
    : b.auto
      ? 'none'
      : b.waiting >= max * 0.7
        ? 'you'
        : b.waiting === 0 && b.thrown > 0
          ? 'birds'
          : 'none';
}

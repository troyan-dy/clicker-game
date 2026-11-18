import type { Neck } from '../../ui/terminal/terminal';
import {
  backlogCap,
  blocksOf,
  claudeRate,
  demandOf,
  inflowOf,
  nodesOf,
  podsOf,
  subagentRate,
  supplyOf,
  wantedOf,
  wireOf,
  type PipeConfig,
  type PipeState,
} from '../../systems/pipeline/pipeline';

export function worldBottleneck(s: PipeState, cfg: PipeConfig, previous: Neck): Neck {
  const supply = supplyOf(s, cfg);
  const wire = wireOf(s, cfg);
  const asks = demandOf(s, cfg);
  const dials = cfg.net.some(
    (dial) =>
      (dial.screen ?? cfg.grid.screen) <= cfg.world.screen && (s.net[dial.id] ?? 0) < dial.max,
  );
  if (asks <= Math.min(supply, wire) + 0.05) return dials ? 'net' : 'none';
  if (wire < supply - 0.05) return 'wire';
  const all = cfg.world.regions.reduce((n, x) => n + x, 0);
  // a node that is filling up will give more by itself
  if (podsOf(s, cfg) - s.asleep > cfg.grid.unit) return previous === 'pods' ? 'pods' : 'none';
  return nodesOf(s, cfg) < all ? 'pods' : 'none';
}

export function towerBottleneck(s: PipeState, cfg: PipeConfig, previous: Neck): Neck {
  const unit = cfg.grid.unit;
  if (!s.gate) return s.queue >= unit ? 'you' : 'none';
  const free = podsOf(s, cfg) - s.asleep;
  const full = s.asleep >= wantedOf(s, cfg) - unit * 0.5;
  if (full && cfg.net.some((dial) => (s.net[dial.id] ?? 0) < dial.max)) return 'net';
  if (free < unit * 0.5) return blocksOf(s, cfg) < cfg.grid.blocks.length ? 'pods' : 'none';
  if (s.queue < unit * 0.5) return 'people';
  // the line is walking in: what was short a moment ago still is
  return previous === 'pods' || previous === 'people' ? previous : 'none';
}

export function workBottleneck(
  s: PipeState,
  cfg: PipeConfig,
  avgBacklog: number,
  avgReady: number,
): Neck {
  const cap = backlogCap(s, cfg);
  const half = Math.ceil(cfg.tuning.readyMax / 2);
  if (!s.noAsk && (avgReady >= 3 || (s.ready >= half && avgReady >= 1.5))) return 'you';
  // the tray grows with the flow, so «piling up» and «empty» are shares of it
  const piling = Math.max(2, cap * 0.1);
  if (avgBacklog >= piling && s.backlog >= piling) return 'claude';
  const empty = Math.max(0.7, cap * 0.035);
  if (avgBacklog < empty && inflowOf(s, cfg) < claudeRate(s, cfg) + subagentRate(s, cfg))
    return 'tasks';
  return 'none';
}

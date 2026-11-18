import {
  blocksOf,
  demandOf,
  fedOf,
  moduleRoom,
  podsOf,
  replacedOf,
  supplyOf,
  wantedOf,
  wireOf,
  type PipeConfig,
  type PipeState,
} from '../../systems/pipeline/pipeline';
import { flowIncome } from './actions';

export function revenuePerGW(s: PipeState, cfg: PipeConfig): number {
  return flowIncome(s, cfg) / Math.max(1e-9, fedOf(s, cfg));
}

export function towerPower(s: PipeState, cfg: PipeConfig, withPeople: boolean) {
  const came = (s.asleep + s.queue) * cfg.grid.watt;
  const places = podsOf(s, cfg) * cfg.grid.watt;
  const asks = demandOf(s, cfg) - cfg.grid.old;
  return { came, places, asks, top: Math.max(withPeople ? came : 0, places, asks, 1e-9) };
}

export function worldPower(s: PipeState, cfg: PipeConfig) {
  const gives = supplyOf(s, cfg) - cfg.grid.old;
  const carries = wireOf(s, cfg);
  const asks = demandOf(s, cfg) - cfg.grid.old;
  const top = Math.max(gives, carries, asks, 1e-9);
  const room = cfg.modules.some(
    (m) => m.kind === 'node' && (s.modules[m.id] ?? 0) < moduleRoom(s, cfg, m),
  );
  const threads = cfg.modules.some((m) => m.kind === 'thread' && (s.modules[m.id] ?? 0) < m.max);
  const count = cfg.modules
    .filter((m) => m.kind === 'thread')
    .reduce((n, m) => n + (s.modules[m.id] ?? 0), 1);
  return { gives, carries, asks, top, room, threads, count };
}

export function towerFacilities(s: PipeState, cfg: PipeConfig, firstTower: number) {
  const blocks = blocksOf(s, cfg);
  const dials = cfg.net.reduce((n, dial) => n + (s.net[dial.id] ?? 0), 0);
  const hires = cfg.modules
    .filter((m) => m.kind === 'hire')
    .reduce((n, m) => n + (s.modules[m.id] ?? 0), 0);
  const seenPeople = blocks >= 1 || hires > 0;
  const seenNet =
    dials > 0 ||
    s.asleep >= (cfg.grid.appetite - cfg.grid.old) / cfg.grid.watt - cfg.grid.unit * 0.5;
  const grown = blocks >= firstTower;
  const park = Math.max(0, replacedOf(s, cfg) - s.asleep - s.queue);
  return { blocks, seenPeople, seenNet, grown, park };
}

export function networkDials(s: PipeState, cfg: PipeConfig, stage: number, all: boolean) {
  const world = stage === cfg.world.screen;
  return cfg.net.filter((dial) => {
    const level = s.net[dial.id] ?? 0;
    return (
      (dial.screen ?? cfg.grid.screen) <= stage &&
      (!world || !!dial.screen || level < dial.max) &&
      (all || dial.yield === 1 || level > 0)
    );
  });
}

export function underpowered(s: PipeState, cfg: PipeConfig, world: boolean): boolean {
  return world
    ? demandOf(s, cfg) > Math.min(supplyOf(s, cfg), wireOf(s, cfg)) + 0.05
    : s.asleep < wantedOf(s, cfg) - cfg.grid.unit * 0.5;
}

export function nextBlock(s: PipeState, cfg: PipeConfig, firstTower: number) {
  const built = blocksOf(s, cfg);
  if (built >= cfg.grid.blocks.length) return undefined;
  const rings = firstTower - 1;
  return {
    built,
    add: cfg.grid.blocks[built],
    rings,
    tower: Math.floor((built - 1) / rings) + 1,
    ring: ((built - 1) % rings) + 1,
    idle: s.queue < cfg.grid.unit * 0.5 && podsOf(s, cfg) - s.asleep >= cfg.grid.unit,
  };
}

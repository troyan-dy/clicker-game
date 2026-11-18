import type { Rng } from '../../core/rng';
import type { Award } from '../../content/awards';
import {
  blocksOf,
  housed,
  nodesOf,
  quartered,
  replacedOf,
  ringed,
  shareOf,
  whole,
  type PipeConfig,
  type PipeState,
  type Source,
} from '../../systems/pipeline/pipeline';
import type { SavedMeta } from '../../systems/save/save';

export function statistic(
  s: PipeState,
  cfg: PipeConfig,
  meta: SavedMeta,
  stage: number,
  swaps: number,
  name: string,
): number {
  if (name.startsWith('own:')) return s.owned[name.slice(4)] ?? 0;
  if (name.startsWith('farm:')) return s.farms[name.slice(5)] ?? 0;
  if (name.startsWith('full:')) {
    const screen = Number(name.slice(5));
    return cfg.sources.filter((x) => x.screen === screen && (s.owned[x.id] ?? 0) >= x.max).length;
  }
  if (name.startsWith('hired:')) {
    const screen = Number(name.slice(6));
    return cfg.sources.filter((x) => x.screen === screen && s.owned[x.id]).length;
  }
  const stats: Record<string, number> = {
    closed: s.closedHere + s.closedBySubagents,
    presses: s.presses,
    wasted: s.wasted,
    money: s.money,
    plan: s.plan.index,
    noask: s.noAsk ? 1 : 0,
    subs: s.subagents,
    grade: s.grade,
    scale: s.scale,
    share: shareOf(s, cfg),
    piles: meta.piles,
    legends: meta.legends.length,
    reports: meta.reports,
    calls: meta.calls,
    limits: meta.limits,
    managers: s.managers.length,
    riots: meta.riots,
    police: s.police,
    replaced: replacedOf(s, cfg),
    whole: cfg.sources.filter((x) => x.perk && whole(s, x)).length,
    allowance: s.allowance ? 1 : 0,
    blocks: blocksOf(s, cfg),
    asleep: s.asleep / cfg.grid.unit,
    housed: (stage === cfg.grid.screen || stage === cfg.world.screen) && quartered(s, cfg) ? 1 : 0,
    nodes: nodesOf(s, cfg),
    planet: stage === cfg.world.screen && housed(s, cfg) ? 1 : 0,
    ring: ringed(s, cfg) ? 1 : 0,
    ark: cfg.modules.some((m) => m.kind === 'ark' && (s.modules[m.id] ?? 0) > 0) ? 1 : 0,
    net: cfg.net.reduce((n, dial) => n + (s.net[dial.id] ?? 0), 0),
    chips: s.chips,
    swaps,
    bread: meta.bread,
    fed: meta.fed,
    refused: meta.refused,
    feeder: meta.feeder ? 1 : 0,
  };
  return stats[name] ?? 0;
}

export function hasAcquired(s: PipeState, cfg: PipeConfig, id: string): boolean {
  if (id === 'plan') return s.plan.index > 0;
  if (id === 'sub') return s.subagents > 0;
  if (id === 'grade') return s.grade > 0;
  // the first job is there from the start: news about a source mean one that was bought
  const src = cfg.sources.find((x) => x.id === id);
  if (cfg.modules.some((m) => m.id === id)) return (s.modules[id] ?? 0) > 0;
  if (cfg.net.some((dial) => dial.id === id)) return (s.net[id] ?? 0) > 0;
  const chip = cfg.chips.findIndex((c) => c.id === id);
  if (chip >= 0) return s.chips > chip;
  return (s.owned[id] ?? 0) > (src?.start ?? 0) || (s.farms[id] ?? 0) > 0;
}

export function chooseBird(
  thrown: number,
  chance: number,
): 'seagull' | 'duck' | 'sparrow' | 'pigeon' {
  if (thrown >= 60 && chance < 0.06) return 'seagull';
  if (thrown >= 25 && chance < 0.16) return 'duck';
  if (thrown >= 6 && chance < 0.36) return 'sparrow';
  return 'pigeon';
}

export function earnAwards(
  awards: readonly Award[],
  earned: string[],
  readStat: (name: string) => number,
): Award[] {
  const fresh: Award[] = [];
  for (const award of awards) {
    if (earned.includes(award.id) || readStat(award.stat) < award.min) continue;
    earned.push(award.id);
    fresh.push(award);
  }
  return fresh;
}

export function pickIncomingSource(
  owned: Record<string, number>,
  sources: readonly Source[],
  rng: Rng,
): Source | undefined {
  let total = 0;
  for (const src of sources) total += (owned[src.id] ?? 0) * src.inflow;
  let pick = rng.range(0, total);
  for (const src of sources) {
    pick -= (owned[src.id] ?? 0) * src.inflow;
    if (pick <= 0 && owned[src.id]) return src;
  }
  return undefined;
}

/** Mark completion once. Only screens with a completion headline use this milestone. */
export function completeEmployers(
  s: PipeState,
  cfg: PipeConfig,
  screen: number,
  said: Record<string, number>,
): boolean {
  const key = 'done' + screen;
  if (said[key] || !cfg.sources.every((x) => x.screen !== screen || whole(s, x))) return false;
  said[key] = 1;
  return true;
}

export function cycleLine(
  said: Record<string, number>,
  key: string,
  lines: readonly string[],
): string {
  const n = said[key] ?? 0;
  said[key] = n + 1;
  return lines[n % lines.length];
}

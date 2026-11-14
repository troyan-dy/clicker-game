/**
 * Claude the manager (M21): hired for a screen, he keeps buying the small things — the next unit of
 * work when tasks run short, the next sessions when they pile up — and leaves plans, promotions and
 * steps up in scale to the player. Pure logic: says what to buy, buys nothing itself.
 */
import {
  bribeCost,
  farmCost,
  jobOf,
  lineCost,
  locked,
  moduleCost,
  netCost,
  sourceCost,
  subagentPrice,
  type PipeConfig,
  type PipeState,
} from '../pipeline/pipeline';

export interface ManagerTuning {
  /** seconds between his purchases */
  period: number;
  /** the share of the money he may spend on one purchase */
  share: number;
}

/** what runs short on a screen, as the manager sees it: tasks or sessions before the towers; at them — capsules, people, or the appetite of the network */
export type ManagerNeed = 'tasks' | 'sessions' | 'pods' | 'people' | 'net' | null;

/**
 * What the manager of `screen` buys now: `src:<id>`, `bribe:<id>`, `farm:<id>`, `line:<id>`, `mod:<id>`,
 * `net:<id>` or `sub` — the cheapest thing that relieves `need`. At the towers he builds the next block
 * when the line stands, gives people one more reason to come when capsules are empty, and starts one
 * more copy of the network when it has eaten its fill; the dials that change what a gigawatt costs are
 * the player's to turn. Null — nothing is needed, or it costs more than his share of the money.
 */
export function managerPick(s: PipeState, cfg: PipeConfig, screen: number, need: ManagerNeed, share: number): string | null {
  if (!need) return null;
  let best: { key: string; price: number } | null = null;
  const offer = (key: string, price: number): void => {
    if (!best || price < best.price) best = { key, price };
  };
  if (need === 'pods' || need === 'people') {
    const kind = need === 'pods' ? 'block' : 'hire';
    for (const m of cfg.modules) {
      const max = m.kind === 'block' ? Math.min(m.max, cfg.grid.blocks.length) : m.max;
      if (m.kind === kind && (s.modules[m.id] ?? 0) < max) offer(`mod:${m.id}`, moduleCost(s, m));
    }
  } else if (need === 'net') {
    // a copy asks for more and pays the same for a gigawatt: there is nothing to decide about it
    for (const p of cfg.net) if (p.yield === 1 && (s.net[p.id] ?? 0) < p.max) offer(`net:${p.id}`, netCost(s, p));
  } else if (need === 'tasks') {
    for (const src of cfg.sources) {
      const owned = s.owned[src.id] ?? 0;
      const onSale = screen >= 3 ? src.screen === screen : src.screen <= screen;
      if (!onSale || src.made || owned >= src.max || jobOf(s, src.id)) continue; // one pack of robot dogs at a time
      // where a bribe opens the door, it comes first
      if (locked(s, src)) offer(`bribe:${src.id}`, bribeCost(s, cfg, src));
      else offer(`src:${src.id}`, sourceCost(s, cfg, src));
    }
    // on the street the tasks come with the robots: one more line
    for (const l of cfg.lines) if (l.screen === screen) offer(`line:${l.id}`, lineCost(s, cfg, l));
  } else if (screen === 2) offer('sub', subagentPrice(cfg, s.subagents));
  else {
    for (const f of cfg.farms) {
      const owned = s.farms[f.id] ?? 0;
      if (f.screen === screen && owned < (f.max ?? Infinity)) offer(`farm:${f.id}`, farmCost(s, cfg, f));
    }
  }
  const pick = best as { key: string; price: number } | null;
  return pick && pick.price <= s.money * share ? pick.key : null;
}

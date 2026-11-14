/**
 * Claude the manager (M21): hired for a screen, he keeps buying the small things — the next unit of
 * work when tasks run short, the next sessions when they pile up — and leaves plans, promotions and
 * steps up in scale to the player. Pure logic: says what to buy, buys nothing itself.
 */
import { bribeCost, demandOf, farmCost, gridOn, jobOf, lineCost, locked, moduleCost, peakOf, sourceCost, subagentPrice, type PipeConfig, type PipeState } from '../pipeline/pipeline';

export interface ManagerTuning {
  /** seconds between his purchases */
  period: number;
  /** the share of the money he may spend on one purchase */
  share: number;
}

/**
 * What the manager of `screen` buys now: `src:<id>`, `bribe:<id>`, `farm:<id>`, `line:<id>`, `mod:<id>` or `sub` — the
 * cheapest thing that relieves `need`. Null — nothing is needed, or it costs more than his share of the money.
 */
export function managerPick(s: PipeState, cfg: PipeConfig, screen: number, need: 'tasks' | 'sessions' | 'power' | null, share: number): string | null {
  if (!need) return null;
  let best: { key: string; price: number } | null = null;
  const offer = (key: string, price: number): void => {
    if (!best || price < best.price) best = { key, price };
  };
  // what would ask the ziggurat for more than it can give waits until it is built up
  const spare = gridOn(s, cfg) ? peakOf(s, cfg) - demandOf(s, cfg) : Infinity;
  let starved = false;
  const fits = (draw: number | undefined): boolean => {
    if (!draw || draw <= spare) return true;
    starved = true;
    return false;
  };
  const power = (): void => {
    // one more tier or a better plug; accumulators are the player's own bet
    for (const m of cfg.modules) {
      if (m.kind !== 'cell' && (s.modules[m.id] ?? 0) < (m.max ?? Infinity)) offer(`mod:${m.id}`, moduleCost(s, cfg, m));
    }
  };
  if (need === 'tasks') {
    for (const src of cfg.sources) {
      const owned = s.owned[src.id] ?? 0;
      const onSale = screen >= 3 ? src.screen === screen : src.screen <= screen;
      if (!onSale || src.made || owned >= src.max || jobOf(s, src.id)) continue; // one pack of robot dogs at a time
      if (!fits(src.draw)) continue;
      // where a bribe opens the door, it comes first
      if (locked(s, src)) offer(`bribe:${src.id}`, bribeCost(s, cfg, src));
      else offer(`src:${src.id}`, sourceCost(s, cfg, src));
    }
    // on the street the tasks come with the robots: one more line
    for (const l of cfg.lines) if (l.screen === screen) offer(`line:${l.id}`, lineCost(s, cfg, l));
  } else if (need === 'power') {
    power();
  } else if (screen === 2) {
    offer('sub', subagentPrice(cfg, s.subagents));
  } else {
    for (const f of cfg.farms) {
      const owned = s.farms[f.id] ?? 0;
      if (f.screen === screen && owned < (f.max ?? Infinity) && fits(f.draw)) offer(`farm:${f.id}`, farmCost(s, cfg, f));
    }
  }
  if (!best && starved) power();
  const pick = best as { key: string; price: number } | null;
  return pick && pick.price <= s.money * share ? pick.key : null;
}

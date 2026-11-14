/**
 * Claude the manager (M21): hired for a screen, he keeps buying the small things — the next unit of
 * work when tasks run short, the next sessions when they pile up — and leaves plans, promotions and
 * steps up in scale to the player. Pure logic: says what to buy, buys nothing itself.
 */
import { farmCost, jobOf, lineCost, sourceCost, squadPrice, squadsOf, subagentPrice, type PipeConfig, type PipeState } from '../pipeline/pipeline';

export interface ManagerTuning {
  /** seconds between his purchases */
  period: number;
  /** the share of the money he may spend on one purchase */
  share: number;
}

/**
 * What the manager of `screen` buys now: `src:<id>`, `farm:<id>`, `line:<id>`, `squad` or `sub` — the
 * cheapest thing that relieves `need`. Null — nothing is needed, or it costs more than his share of the money.
 */
export function managerPick(s: PipeState, cfg: PipeConfig, screen: number, need: 'tasks' | 'sessions' | null, share: number): string | null {
  if (!need) return null;
  let best: { key: string; price: number } | null = null;
  const offer = (key: string, price: number): void => {
    if (!best || price < best.price) best = { key, price };
  };
  if (need === 'tasks') {
    const idle = s.jobs.length < squadsOf(s, cfg);
    let waits = false;
    for (const src of cfg.sources) {
      const owned = s.owned[src.id] ?? 0;
      const onSale = screen >= 3 ? src.screen === screen : src.screen <= screen;
      if (!onSale || src.made || owned >= src.max) continue;
      // where squads do the work he needs a free one, and one squad per employer
      if (src.work && (!idle || jobOf(s, src.id))) waits = waits || !jobOf(s, src.id);
      else offer(`src:${src.id}`, sourceCost(s, cfg, src));
    }
    // every squad is out: one more
    if (waits && !idle && screen === cfg.squads.screen && squadsOf(s, cfg) < cfg.squads.max) offer('squad', squadPrice(s, cfg));
    // on the street the tasks come with the robots: one more line
    for (const l of cfg.lines) if (l.screen === screen) offer(`line:${l.id}`, lineCost(s, cfg, l));
  } else if (screen === 2) {
    offer('sub', subagentPrice(cfg, s.subagents));
  } else {
    for (const f of cfg.farms) {
      const owned = s.farms[f.id] ?? 0;
      if (f.screen === screen && owned < (f.max ?? Infinity)) offer(`farm:${f.id}`, farmCost(s, cfg, f));
    }
  }
  const pick = best as { key: string; price: number } | null;
  return pick && pick.price <= s.money * share ? pick.key : null;
}

/**
 * Saving and the income earned while the game was closed (M07). Pure logic: the caller brings the
 * clock and the storage. A save from an older build is read field by field onto a fresh state,
 * so new sources, farms and grades never break it.
 */
import {
  claudeRate,
  createPipe,
  inflowOf,
  payOf,
  subagentRate,
  type PipeConfig,
  type PipeState,
} from '../pipeline/pipeline';

export const SAVE_VERSION = 1;
/** headlines the history of the ticker keeps */
export const NEWS_KEPT = 120;

export interface SaveTuning {
  /** share of the usual income the sessions earn while nobody watches */
  offlineRate: number;
  /** hours after which the sessions stop waiting for the player */
  offlineCapHours: number;
  /** absences shorter than this are not reported, seconds */
  offlineMinSeconds: number;
  autosaveSeconds: number;
}

/** What the voice of the game remembers between sessions. */
export interface SavedFeed {
  shown: number[];
  said: Record<string, number>;
}

/** What the player has collected besides money. */
export interface SavedMeta {
  /** ids of the legendary tickets closed */
  legends: string[];
  /** ids of the awards earned */
  awards: string[];
  /** piles of questions approved */
  piles: number;
  /** morning reports taken */
  reports: number;
  /** calls and inspections answered */
  calls: number;
  /** usage limits hit */
  limits: number;
  /** riots of the Luddites lived through */
  riots: number;
  /** the headlines the ticker has shown, the newest first */
  news: string[];
  /** the manager is told to wait */
  managerOff: boolean;
  /** after the ending Claude answers the piles of questions himself */
  auto: boolean;
}

export function freshMeta(): SavedMeta {
  return { legends: [], awards: [], piles: 0, reports: 0, calls: 0, limits: 0, riots: 0, news: [], managerOff: false, auto: false };
}

export interface SaveFile {
  v: number;
  /** when it was written, ms since the epoch */
  at: number;
  state: PipeState;
  feed: SavedFeed;
  meta: SavedMeta;
  /** the finale has been seen */
  won: boolean;
  /** seconds played in total */
  seconds: number;
}

export interface OfflineReport {
  /** seconds counted, after the cap */
  seconds: number;
  tasks: number;
  dollars: number;
  /** the terminal still asks: nothing could be closed without a «Да» */
  waited: boolean;
}

export function packSave(file: Omit<SaveFile, 'v'>): string {
  return JSON.stringify({ v: SAVE_VERSION, ...file });
}

const num = (v: unknown, fallback: number, min = 0, max = Number.MAX_VALUE): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

const counts = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

/** A state built from whatever was stored: unknown fields are dropped, broken ones fall back to a fresh game. */
export function restorePipe(cfg: PipeConfig, raw: unknown): PipeState {
  const s = createPipe(cfg);
  const r = counts(raw);
  s.money = num(r.money, s.money);
  s.backlog = Math.floor(num(r.backlog, s.backlog));
  s.ready = Math.floor(num(r.ready, 0, 0, cfg.tuning.readyMax));
  s.buffered = Math.floor(num(r.buffered, 0, 0, cfg.tuning.buffer));
  s.think = num(r.think, 0, 0, 1);
  s.plan.index = Math.floor(num(counts(r.plan).index, 0, 0, cfg.plans.length - 1));
  s.noAsk = r.noAsk === true;
  s.subagents = Math.floor(num(r.subagents, 0));
  s.grade = Math.floor(num(r.grade, 0, 0, cfg.grades.length - 1));
  // older saves kept the allowance as a switch
  s.allowance = r.allowance === true ? 1 : Math.floor(num(r.allowance, 0, 0, cfg.tuning.allowanceLevels));
  s.strikes = s.allowance > 0 || !Array.isArray(r.strikes) ? [] : cfg.sources.map((x) => x.id).filter((id) => (r.strikes as unknown[]).includes(id));
  s.orders = num(r.orders, 0, 0, 1);
  s.managers = Array.isArray(r.managers) ? cfg.managers.map((m) => m.screen).filter((n) => (r.managers as unknown[]).includes(n)) : [];
  // a step up in scale needs a terminal that agrees by itself
  s.scale = s.noAsk ? Math.floor(num(r.scale, 0, 0, cfg.scales.length)) : 0;
  s.presses = Math.floor(num(r.presses, 0));
  s.wasted = Math.floor(num(r.wasted, 0));
  s.closedHere = Math.floor(num(r.closedHere, 0));
  s.closedBySubagents = Math.floor(num(r.closedBySubagents, 0));
  const owned = counts(r.owned);
  for (const src of cfg.sources) {
    const n = num(owned[src.id], src.start, src.start, src.max);
    s.owned[src.id] = src.made ? n : Math.floor(n); // robots take the jobs of a `made` employer little by little
  }
  // a bribe is paid once; an employer with units taken was let in already
  const bribed = counts(r.bribed);
  for (const src of cfg.sources) if (src.bribe && (bribed[src.id] === true || s.owned[src.id] > 0)) s.bribed[src.id] = true;
  for (const raw of Array.isArray(r.jobs) ? r.jobs : []) {
    const job = counts(raw);
    const src = cfg.sources.find((x) => x.id === job.id);
    if (!src?.work || s.owned[src.id] >= src.max || s.jobs.some((j) => j.id === src.id)) continue;
    const total = num(job.total, src.work, 0.1);
    s.jobs.push({ id: src.id, left: num(job.left, total, 0, total), total });
  }
  s.police = Math.floor(num(r.police, 0, 0, cfg.police.max));
  const lines = counts(r.lines);
  for (const l of cfg.lines) {
    const n = Math.floor(num(lines[l.id], 0));
    if (n > 0) s.lines[l.id] = n;
    const m = num(counts(r.surge)[l.id], 1, 1);
    if (l.surge && m > 1) s.surge[l.id] = m;
  }
  for (const [kind, id] of Object.entries(counts(r.aim))) {
    if (cfg.sources.some((x) => x.id === id && x.made === kind)) s.aim[kind] = id as string;
  }
  // the ziggurat: its parts, its shifts, the hour of its day and what the accumulators keep
  const modules = counts(r.modules);
  for (const m of cfg.modules) {
    const n = Math.floor(num(modules[m.id], m.start ?? 0, m.start ?? 0, m.max ?? Number.MAX_VALUE));
    if (n > 0) s.modules[m.id] = n;
  }
  s.shifts = Math.floor(num(r.shifts, 1, 1, 2));
  s.hour = num(r.hour, 0, 0, cfg.grid.day + cfg.grid.night);
  s.crew = num(r.crew, 0, 0, 1);
  s.charge = num(r.charge, 0);
  s.power = num(r.power, 1, 0, 1);
  const farms = counts(r.farms);
  const surge = counts(r.surge);
  for (const f of cfg.farms) {
    const n = Math.floor(num(farms[f.id], 0, 0, f.max ?? Number.MAX_VALUE));
    if (n > 0) s.farms[f.id] = n;
    const m = num(surge[f.id], 1, 1);
    if (f.surge && m > 1) s.surge[f.id] = m;
  }
  return s;
}

/** Reads a stored save; null — there is none, or it cannot be read. */
export function unpackSave(json: string | null, cfg: PipeConfig): SaveFile | null {
  if (!json) return null;
  let data: Record<string, unknown>;
  try {
    data = counts(JSON.parse(json));
  } catch {
    return null;
  }
  if (data.v !== SAVE_VERSION) return null;
  const feed = counts(data.feed);
  const meta = counts(data.meta);
  const ids = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  const said: Record<string, number> = {};
  for (const [k, v] of Object.entries(counts(feed.said))) said[k] = Math.floor(num(v, 0));
  return {
    v: SAVE_VERSION,
    at: num(data.at, 0),
    state: restorePipe(cfg, data.state),
    feed: { shown: Array.isArray(feed.shown) ? feed.shown.filter((i): i is number => Number.isInteger(i)) : [], said },
    meta: { legends: ids(meta.legends), awards: ids(meta.awards), piles: Math.floor(num(meta.piles, 0)), reports: Math.floor(num(meta.reports, 0)), calls: Math.floor(num(meta.calls, 0)), limits: Math.floor(num(meta.limits, 0)), riots: Math.floor(num(meta.riots, 0)), news: ids(meta.news).slice(0, NEWS_KEPT), managerOff: meta.managerOff === true, auto: meta.auto === true },
    won: data.won === true,
    seconds: num(data.seconds, 0),
  };
}

/**
 * What the sessions did while the game was closed for `seconds`. Null — too short to mention.
 * Before «Да, и больше не спрашивай» nothing can be closed without the player: Claude just waited.
 */
export function offlineReport(s: PipeState, cfg: PipeConfig, tuning: SaveTuning, seconds: number): OfflineReport | null {
  if (!(seconds >= tuning.offlineMinSeconds)) return null;
  const counted = Math.min(seconds, tuning.offlineCapHours * 3600);
  if (!s.noAsk) return { seconds: counted, tasks: 0, dollars: 0, waited: true };
  const flow = Math.min(inflowOf(s, cfg), claudeRate(s, cfg) + subagentRate(s, cfg));
  const tasks = Math.floor(flow * counted * tuning.offlineRate);
  return { seconds: counted, tasks, dollars: tasks * payOf(s, cfg), waited: false };
}

/** The player took the report: the money is theirs. */
export function applyOffline(s: PipeState, report: OfflineReport): void {
  s.money += report.dollars;
  s.closedBySubagents += report.tasks;
}

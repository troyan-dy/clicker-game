import {
  bribeCost,
  buyBribe,
  buyFarm,
  buyGrade,
  buyLine,
  buyModule,
  buyNet,
  buyPlan,
  buySource,
  buySubagent,
  discount,
  flowOf,
  gridOn,
  hireOf,
  jobOf,
  keysNeeded,
  lineCost,
  locked,
  moduleCost,
  outputOf,
  payOf,
  robotsOf,
  scaleCost,
  scaleReady,
  screenOf,
  sourcePrice,
  stepPipe,
  whole,
  worldOn,
  type Module,
  type PipeConfig,
  type PipeState,
} from '../pipeline/pipeline';

/** Remaining cost of a series of purchases, including the increase after each unit. */
function series(first: number, growth: number, count: number): number {
  if (count <= 0) return 0;
  return growth === 1 ? first * count : (first * (growth ** count - 1)) / (growth - 1);
}

interface Goal {
  cost: number;
  workSeconds: number;
}

/** The transition needs money AND keys. Count the cheapest unfinished contracts, including outstanding squads. */
function contractGoal(s: PipeState, cfg: PipeConfig, screen: number): Goal {
  const needs = keysNeeded(s, cfg);
  const goal = { cost: scaleCost(s, cfg), workSeconds: 0 };
  if (!needs) return goal;
  const sources = cfg.sources.filter((x) => x.screen === screen);
  if (sources.some((x) => x.made)) {
    // At the factory the fleet must both replace worn robots and fill the remaining jobs.
    for (const line of cfg.lines.filter((l) => l.screen === screen)) {
      const target = sources
        .filter((x) => x.made === line.kind)
        .reduce((n, x) => n + x.max * (x.staff ?? 0), 0);
      const occupied = robotsOf(s, cfg, line.kind);
      const production = outputOf(s, cfg, line.kind);
      const built = s.lines[line.id] ?? 0;
      const perLine = built ? production / built : line.rate;
      const required = Math.floor((target * cfg.tuning.wear) / perLine) + 1;
      goal.cost += series(lineCost(s, cfg, line), line.growth, required - built);
      const net =
        Math.max(required * perLine, production) - (cfg.tuning.wear * (target + occupied)) / 2;
      goal.workSeconds = Math.max(
        goal.workSeconds,
        Math.max(0, target - occupied) / Math.max(1, net),
      );
    }
    return goal;
  }
  const priceFactor = discount(s, cfg, 'sources');
  const costs = sources.map((src) => {
    const owned = (s.owned[src.id] ?? 0) + Number(!!jobOf(s, src.id));
    return (
      series(sourcePrice(src, owned) * priceFactor, src.growth, src.max - owned) +
      (locked(s, src) ? bribeCost(s, cfg, src) : 0)
    );
  });
  goal.cost += costs
    .sort((a, b) => a - b)
    .slice(0, needs)
    .reduce((sum, n) => sum + n, 0);
  return goal;
}

/** Include the remaining construction and the time it takes people to arrive. */
function gridGoal(s: PipeState, cfg: PipeConfig): Goal {
  const world = worldOn(s, cfg);
  const limit: Partial<Record<Module['kind'], number>> = world
    ? {
        span: cfg.world.regions.length - 1,
        node: cfg.world.regions.reduce((a, b) => a + b, 0),
        ark: 1,
      }
    : { block: cfg.grid.blocks.length };
  let cost = world ? 0 : scaleCost(s, cfg);
  for (const m of cfg.modules) {
    const required = limit[m.kind];
    if (required !== undefined)
      cost += series(moduleCost(s, m), m.growth, required - (s.modules[m.id] ?? 0));
  }
  const quarter = (cfg.grid.pilot + cfg.grid.blocks.reduce((a, b) => a + b, 0)) * cfg.grid.unit;
  const population = quarter + (limit.node ?? 0) * cfg.world.node;
  const admission = world ? cfg.world.admit : Math.min(hireOf(s, cfg), cfg.grid.admit);
  return { cost, workSeconds: Math.max(0, population - s.asleep) / admission };
}

function estimate(s: PipeState, cfg: PipeConfig, screen: number) {
  const goal = gridOn(s, cfg) ? gridGoal(s, cfg) : contractGoal(s, cfg, screen);
  const income = Math.max(0.01, flowOf(s, cfg) * payOf(s, cfg));
  const seconds = Math.max(0, goal.cost - s.money) / income;
  return { seconds: Math.max(seconds, goal.workSeconds), cost: goal.cost, income };
}

/** Compare buying now with waiting. Short projections let squads, factories and new capacity start producing. */
export function managerPick(s: PipeState, cfg: PipeConfig): string | null {
  const screen = screenOf(s);
  if (!s.noAsk || s.limited > 0 || (scaleReady(s, cfg) && s.money >= scaleCost(s, cfg)))
    return null;
  const forecast = (next: PipeState) => {
    stepPipe(next, cfg, 4);
    stepPipe(next, cfg, 4);
    return estimate(next, cfg, screen);
  };
  const wait = forecast(structuredClone(s));
  const options: { key: string; buy: (draft: PipeState) => boolean }[] = [];
  function offer(key: string, buy: (draft: PipeState) => boolean): void {
    options.push({ key, buy });
  }
  if (gridOn(s, cfg)) {
    for (const m of cfg.modules) {
      if ((m.screen ?? cfg.grid.screen) !== screen || m.kind === 'ark') continue;
      if (m.kind === 'span' && !s.modules[m.id]) continue; // the player chooses the first route
      offer('mod:' + m.id, (d) => buyModule(d, cfg, m.id));
    }
    for (const n of cfg.net) offer('net:' + n.id, (d) => buyNet(d, cfg, n.id));
  } else {
    for (const x of cfg.sources) {
      if ((screen <= 2 ? x.screen > screen : x.screen !== screen) || x.made || whole(s, x))
        continue;
      if (locked(s, x)) offer('bribe:' + x.id, (d) => buyBribe(d, cfg, x.id));
      else offer('src:' + x.id, (d) => buySource(d, cfg, x.id));
    }
    for (const f of cfg.farms)
      if (f.screen === screen) offer('farm:' + f.id, (d) => buyFarm(d, cfg, f.id));
    for (const l of cfg.lines)
      if (l.screen === screen) offer('line:' + l.id, (d) => buyLine(d, cfg, l.id));
    if (screen === 2) offer('sub', (d) => buySubagent(d, cfg));
    if ((cfg.plans[s.plan.index + 1]?.screen ?? 1) <= screen) offer('plan', (d) => buyPlan(d, cfg));
    offer('grade', (d) => buyGrade(d, cfg));
  }

  let choice: string | null = null;
  let best = 0;
  const singles: { key: string; draft: PipeState }[] = [];
  function rank(key: string, draft: PipeState, price: number, delay = 0): void {
    const after = forecast(structuredClone(draft));
    const progress = Math.max(0, wait.cost - after.cost) / wait.income;
    const saving = wait.seconds - after.seconds - delay;
    if (saving < -0.01 || (saving <= 0.01 && !progress)) return;
    const score = (Math.max(0, saving) + Math.min(progress, 1)) / Math.max(1, price / wait.income);
    if (score > best) {
      best = score;
      choice = key;
    }
  }
  for (const option of options) {
    const draft = structuredClone(s);
    if (!option.buy(draft)) continue;
    rank(option.key, draft, s.money - draft.money);
    singles.push({ key: option.key, draft });
  }
  // A contract and extra processing capacity can be valuable together even when neither alone pays off.
  if (!choice && !gridOn(s, cfg)) {
    const capacity = (key: string) => key === 'sub' || key === 'plan' || key.startsWith('farm:');
    for (const first of singles) {
      for (const second of options) {
        if (capacity(first.key) === capacity(second.key)) continue;
        const draft = structuredClone(first.draft);
        // Price the second purchase with the same rules, including discounts unlocked by the first.
        const credit = wait.cost;
        draft.money += credit;
        if (!second.buy(draft)) continue;
        draft.money -= credit;
        const shortfall = Math.max(0, -draft.money);
        const rate = Math.max(0.01, flowOf(first.draft, cfg) * payOf(first.draft, cfg));
        const price = s.money - draft.money;
        draft.money += shortfall;
        rank(first.key, draft, price, shortfall / rate);
      }
    }
  }
  return choice;
}

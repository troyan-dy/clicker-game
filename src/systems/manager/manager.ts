import tuning from '../../data/tuning/manager.json';
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
  farmCost,
  flowOf,
  gradeCost,
  gridOn,
  hireOf,
  jobOf,
  keysNeeded,
  lineCost,
  locked,
  moduleCost,
  netCost,
  outputOf,
  payOf,
  robotsOf,
  roomOf,
  scaleCost,
  scaleReady,
  screenOf,
  sourceCost,
  sourcePrice,
  stepPipe,
  subagentPrice,
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
    if (required === undefined) continue;
    const owned = s.modules[m.id] ?? 0;
    if (m.kind === 'node' && s.cableRoute === 'eastasia' && s.modules.span === 1) {
      // Only the three eastern sites get the introductory price. Connecting Siberia adds one paid-up node.
      const sites = roomOf(s, cfg);
      for (let n = owned; n < required; n++) {
        if (n === sites) continue;
        const factor = n > 0 && n < sites ? (m.eastSitePrice ?? 1) : 1;
        cost += Math.round(m.price * m.growth ** n * factor);
      }
    } else {
      cost += series(moduleCost(s, m), m.growth, required - owned);
    }
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

type Purpose = 'work' | 'capacity' | 'pay' | 'build';
interface Offer {
  key: string;
  name: string;
  purpose: Purpose;
  price: (s: PipeState) => number;
  buy: (s: PipeState) => boolean;
}

function shop(s: PipeState, cfg: PipeConfig, screen: number): Offer[] {
  const offers: Offer[] = [];
  function add(key: string, name: string, purpose: Purpose, price: Offer['price'], buy: Offer['buy']): void {
    offers.push({ key, name, purpose, price, buy });
  }
  if (gridOn(s, cfg)) {
    for (const m of cfg.modules) {
      if ((m.screen ?? cfg.grid.screen) !== screen || m.kind === 'ark' || (m.kind === 'span' && !s.modules.span)) continue;
      add('mod:' + m.id, m.name, 'build', d => moduleCost(d, m), d => buyModule(d, cfg, m.id));
    }
    for (const n of cfg.net) add('net:' + n.id, n.name, 'pay', d => netCost(d, n), d => buyNet(d, cfg, n.id));
    return offers;
  }
  for (const x of cfg.sources) {
    if ((screen === 2 ? x.screen > screen : x.screen !== screen) || x.made || whole(s, x)) continue;
    if (locked(s, x)) add('bribe:' + x.id, x.name, 'work', d => bribeCost(d, cfg, x), d => buyBribe(d, cfg, x.id));
    add('src:' + x.id, x.name, 'work', d => sourceCost(d, cfg, x), d => buySource(d, cfg, x.id));
  }
  for (const f of cfg.farms) {
    if (f.screen === screen) add('farm:' + f.id, f.name, 'capacity', d => farmCost(d, cfg, f), d => buyFarm(d, cfg, f.id));
  }
  for (const l of cfg.lines) {
    if (l.screen === screen) add('line:' + l.id, l.name, 'build', d => lineCost(d, cfg, l), d => buyLine(d, cfg, l.id));
  }
  if (screen === 2) add('sub', cfg.auto.subagent.name, 'capacity', d => subagentPrice(cfg, d.subagents), d => buySubagent(d, cfg));
  const plan = cfg.plans[s.plan.index + 1];
  if (plan && (plan.screen ?? 1) <= screen) add('plan', plan.name, 'capacity', d => cfg.plans[d.plan.index + 1]?.price ?? Infinity, d => buyPlan(d, cfg));
  const grade = cfg.grades[s.grade + 1];
  if (grade) add('grade', grade.name, 'pay', d => gradeCost(d, cfg), d => buyGrade(d, cfg));
  return offers;
}

export interface ManagerDecision {
  key: string;
  name: string;
  purpose: Purpose;
  affordable: boolean;
}

/** Compare waiting, one purchase and complementary purchases at the same elapsed time. */
export function planManager(s: PipeState, cfg: PipeConfig): ManagerDecision | null {
  const screen = screenOf(s);
  if (!s.noAsk || s.limited > 0 || (scaleReady(s, cfg) && s.money >= scaleCost(s, cfg))) return null;
  const offers = shop(s, cfg, screen);
  function projectedEstimate(next: PipeState) {
    if (screen < 5) return estimate(next, cfg, screen);
    // Value a running squad or a new tower over the same interval for every option, including waiting.
    const projected = structuredClone(next);
    for (let second = 0; second < tuning.previewSeconds; second++) stepPipe(projected, cfg, 1);
    projected.money = next.money;
    return estimate(projected, cfg, screen);
  }
  const base = projectedEstimate(s);
  const horizon = Math.min(base.seconds, tuning.reinvestSeconds);
  let bestGain = -Infinity;
  let bestFinish = base.seconds;
  let choice: ManagerDecision | null = null;

  function project(from: PipeState, income: number, offer: Offer) {
    const price = offer.price(from);
    const wait = Math.max(0, price - from.money) / income;
    if (!Number.isFinite(wait) || wait > horizon) return null;
    const next = structuredClone(from);
    next.money = Math.max(next.money, price);
    if (!offer.buy(next)) return null;
    return { next, wait };
  }

  function rank(next: PipeState, elapsed: number, first: ManagerDecision) {
    const after = projectedEstimate(next);
    const finish = elapsed + after.seconds;
    const progress = base.cost - after.cost;
    if (finish > base.seconds + 0.001 || (finish >= base.seconds - 0.001 && progress <= 0)) return;
    // Money earned by the next reinvestment, plus costs already paid toward mandatory contracts.
    // Near the transition the actual time to completion takes precedence.
    const gain = base.seconds <= horizon ? base.seconds - finish :
      (next.money - s.money + progress + (horizon - elapsed) * after.income) / base.income - horizon;
    if (gain > bestGain + 0.001 || (Math.abs(gain - bestGain) <= 0.001 && finish < bestFinish)) {
      bestGain = gain;
      bestFinish = finish;
      choice = first;
    }
  }

  for (const a of offers) {
    const one = project(s, base.income, a);
    if (!one) continue;
    const first = { key: a.key, name: a.name, purpose: a.purpose, affordable: one.wait === 0 };
    rank(one.next, one.wait, first);
    if (screen >= 6) continue;
    const rate = Math.max(0.01, flowOf(one.next, cfg) * payOf(one.next, cfg));
    for (const b of offers) {
      // Cross the bottleneck in either order, or finish/unlock a single contract.
      if (a.purpose === b.purpose && !(a.purpose === 'work' && a.key.split(':')[1] === b.key.split(':')[1])) continue;
      const two = project(one.next, rate, b);
      if (two && one.wait + two.wait <= horizon) rank(two.next, one.wait + two.wait, first);
    }
  }
  return choice;
}

export function managerPick(s: PipeState, cfg: PipeConfig): string | null {
  const plan = planManager(s, cfg);
  return plan?.affordable ? plan.key : null;
}

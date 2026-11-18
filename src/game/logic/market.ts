import {
  bribeCost,
  buyBribe,
  buyFarm,
  buyGrade,
  buyLine,
  buyManager,
  buyModule,
  buyNet,
  buyNoAsk,
  buyPlan,
  buyPolice,
  buyScale,
  buySource,
  buySubagent,
  jobOf,
  locked,
  sourceCost,
  type PipeConfig,
  type PipeState,
  type Source,
} from '../../systems/pipeline/pipeline';

export function onSale(stage: number, src: Source): boolean {
  return stage >= 3 ? src.screen === stage : src.screen <= stage;
}

function nextCost(state: PipeState, cfg: PipeConfig, src: Source): number {
  return locked(state, src) ? bribeCost(state, cfg, src) : sourceCost(state, cfg, src);
}

export function employersOnOffer(s: PipeState, cfg: PipeConfig, stage: number): Source[] {
  return cfg.sources
    .filter(
      (src) =>
        src.screen === stage && !src.made && !jobOf(s, src.id) && (s.owned[src.id] ?? 0) < src.max,
    )
    .sort((a, b) => nextCost(s, cfg, a) - nextCost(s, cfg, b));
}

export function planOnSale(s: PipeState, cfg: PipeConfig, stage: number) {
  const next = cfg.plans[s.plan.index + 1];
  return next && (next.screen ?? 1) <= stage ? next : undefined;
}

export function buyOnStage(
  s: PipeState,
  cfg: PipeConfig,
  stage: number,
  what: string,
  quiet: boolean,
): boolean {
  if (what.startsWith('src:')) {
    const src = cfg.sources.find((x) => x.id === what.slice(4));
    return !!src && onSale(stage, src) && buySource(s, cfg, src.id);
  }
  if (what.startsWith('farm:')) {
    const farm = cfg.farms.find((x) => x.id === what.slice(5));
    return !!farm && farm.screen === stage && buyFarm(s, cfg, farm.id);
  }
  if (what.startsWith('line:')) {
    const line = cfg.lines.find((x) => x.id === what.slice(5));
    return !!line && line.screen === stage && buyLine(s, cfg, line.id);
  }
  if (what.startsWith('bribe:')) {
    const src = cfg.sources.find((x) => x.id === what.slice(6));
    return !!src && onSale(stage, src) && buyBribe(s, cfg, src.id);
  }
  if (what === 'route:siberia' || what === 'route:eastasia') {
    return (
      !quiet &&
      stage === cfg.world.screen &&
      buyModule(s, cfg, 'span', what === 'route:siberia' ? 'siberia' : 'eastasia')
    );
  }
  if (what.startsWith('mod:')) {
    // what the towers are built of is sold at the towers, what the planet is girdled with — on the planet
    const m = cfg.modules.find((x) => x.id === what.slice(4));
    return !!m && (m.screen ?? cfg.grid.screen) === stage && buyModule(s, cfg, m.id);
  }
  if (what.startsWith('net:'))
    return (
      (stage === cfg.grid.screen || stage === cfg.world.screen) && buyNet(s, cfg, what.slice(4))
    );
  if (what === 'police') return stage === cfg.police.screen && buyPolice(s, cfg);
  if (what === 'plan') return !!planOnSale(s, cfg, stage) && buyPlan(s, cfg);
  if (what === 'noask') return stage === 1 && buyNoAsk(s, cfg);
  if (what === 'sub') return stage === 2 && buySubagent(s, cfg);
  if (what === 'grade') return stage >= 2 && buyGrade(s, cfg);
  if (what === 'scale') return stage >= 2 && buyScale(s, cfg);
  if (what === 'manager') return stage >= 2 && buyManager(s, cfg, stage);
  return false;
}

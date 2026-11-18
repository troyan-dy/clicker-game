import { words } from '../../content/names';
import autoData from '../../data/balance/auto.json';
import chipData from '../../data/balance/chips.json';
import farmData from '../../data/balance/farms.json';
import gradeData from '../../data/balance/grades.json';
import lineData from '../../data/balance/lines.json';
import managerData from '../../data/balance/managers.json';
import moduleData from '../../data/balance/modules.json';
import netData from '../../data/balance/net.json';
import planData from '../../data/balance/plans.json';
import policeData from '../../data/balance/police.json';
import scaleData from '../../data/balance/scales.json';
import sourceData from '../../data/balance/sources.json';
import gridData from '../../data/tuning/grid.json';
import worldData from '../../data/tuning/world.json';
import tuningData from '../../data/tuning/pipeline.json';
import type { Plan } from '../../systems/plan/plan';
import type { Chip, Farm, Line, Module, PipeConfig, Source } from '../../systems/pipeline/pipeline';

export function createGameConfig(): PipeConfig {
  return {
    tuning: { ...tuningData },
    plans: (planData as Plan[]).map((p) => ({ ...p, ...words('plans', p.id) })),
    sources: (sourceData as Source[]).map((s) => ({ ...s, ...words('sources', s.id), perk: s.perk && { ...s.perk, ...words('perks', s.id) } })),
    grades: gradeData.map((g) => ({ ...g, ...words('grades', g.id) })),
    farms: (farmData as Farm[]).map((f) => ({ ...f, ...words('farms', f.id) })),
    scales: scaleData.map((x) => ({ ...x, ...words('scales', x.id) })),
    managers: managerData.map((m) => ({ ...m, ...words('managers', m.screen) })),
    lines: (lineData as Line[]).map((l) => ({ ...l, ...words('lines', l.id) })),
    police: { ...policeData, ...words('police', 'police') },
    modules: (moduleData as Module[]).map((m) => ({ ...m, ...words('modules', m.id) })),
    net: netData.map((p) => ({ ...p, ...words('net', p.id) })),
    chips: (chipData as Chip[]).map((c) => ({ ...c, ...words('chips', c.id) })),
    grid: { ...gridData },
    world: { ...worldData },
    auto: { noAsk: { ...autoData.noAsk, ...words('auto', 'noAsk') }, subagent: { ...autoData.subagent, ...words('auto', 'subagent') } },
  };
}

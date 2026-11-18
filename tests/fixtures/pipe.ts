import autoData from '../../src/data/balance/auto.json';
import chipData from '../../src/data/balance/chips.json';
import farmData from '../../src/data/balance/farms.json';
import gradeData from '../../src/data/balance/grades.json';
import lineData from '../../src/data/balance/lines.json';
import managerData from '../../src/data/balance/managers.json';
import moduleData from '../../src/data/balance/modules.json';
import netData from '../../src/data/balance/net.json';
import planData from '../../src/data/balance/plans.json';
import policeData from '../../src/data/balance/police.json';
import scaleData from '../../src/data/balance/scales.json';
import sourceData from '../../src/data/balance/sources.json';
import gridData from '../../src/data/tuning/grid.json';
import worldData from '../../src/data/tuning/world.json';
import tuningData from '../../src/data/tuning/pipeline.json';
import type { Farm, Line, Module, PipeConfig, Source } from '../../src/systems/pipeline/pipeline';
import type { Plan } from '../../src/systems/plan/plan';

export const cfg: PipeConfig = {
  tuning: tuningData,
  plans: planData as Plan[],
  sources: sourceData as Source[],
  grades: gradeData,
  farms: farmData as Farm[],
  scales: scaleData,
  managers: managerData,
  lines: lineData as Line[],
  police: policeData,
  modules: moduleData as Module[],
  net: netData,
  chips: chipData,
  grid: gridData,
  world: worldData,
  auto: autoData,
};

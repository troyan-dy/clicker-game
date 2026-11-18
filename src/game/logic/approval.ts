import { laptopPhase, stepIncident } from '../../systems/intern/incident';
import { takeChip, type PipeConfig, type PipeState } from '../../systems/pipeline/pipeline';
import type { SavedMeta } from '../../systems/save/save';

/** An accepted batch consumes the press, even if an ordinary task is ready too. */
export function routePress(onBench: boolean, closed: boolean, stage: number, approvePending: () => boolean) {
  if (onBench) return 'bread';
  if (closed) return 'blocked';
  return stage >= 2 && approvePending() ? 'batch' : 'task';
}

export function approvePending(calls: number, answerFirst: () => void, sign: () => boolean, admit: () => boolean, takePile: () => boolean): boolean {
  for (let i = 0; i < calls; i++) answerFirst();
  const signed = sign();
  const admitted = admit();
  return takePile() || calls > 0 || signed || admitted;
}

export function signResearch(state: PipeState, cfg: PipeConfig) {
  const chip = takeChip(state, cfg);
  if (chip) state.presses++;
  return chip;
}

export function openVolunteerGate(state: PipeState, cfg: PipeConfig, stage: number): boolean {
  if (stage !== cfg.grid.screen || state.gate || state.queue < cfg.grid.unit) return false;
  state.gate = true;
  state.presses++;
  return true;
}

export function settleIntern(state: PipeState, meta: SavedMeta, dt: number): number {
  if (!meta.intern) return 0;
  const credit = stepIncident(meta.intern, dt);
  state.money += credit;
  if (laptopPhase(meta.intern.elapsed) === 'done') delete meta.intern;
  return credit;
}

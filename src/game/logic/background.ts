import intern from '../../data/tuning/intern.json';
import manager from '../../data/tuning/manager.json';
import save from '../../data/tuning/save.json';
import {
  applyOffline,
  offlineReport,
  type OfflineReport,
  type SaveFile,
  type SavedMeta,
} from '../../systems/save/save';
import type { PipeConfig, PipeState } from '../../systems/pipeline/pipeline';

export function missedBackgroundFrames(
  since: number | null,
  now: number,
  hidden: boolean,
): boolean {
  return since !== null && (hidden || now - since > 250);
}

export function elapsedMs(since: number, now: number): number {
  return Math.max(0, now - since);
}

function gameSeconds(seconds: number, slow: boolean) {
  return seconds * (slow ? 0.25 : 1);
}

/** Keep fractional frames and limit visible catch-up to a quarter of a second. */
export function frameRemainder(
  acc: number,
  deltaMs: number,
  paused: boolean,
  slow: boolean,
  step: number,
  advance: (dt: number) => void,
): number {
  if (paused) return 0;
  acc += gameSeconds(Math.min(deltaMs / 1000, 0.25), slow);
  while (acc >= step) {
    advance(step);
    acc -= step;
  }
  return acc;
}

interface BackgroundActivity {
  paused: boolean;
  frozen: boolean;
  superseded: boolean;
  cinematic: boolean;
  creditsRolling: boolean;
}

/** Pauses consume wall time without earning it on the next tick. */
export function activeBackgroundSeconds(
  elapsed: number,
  state: BackgroundActivity,
  slow: boolean,
): number {
  if (state.paused || state.frozen || state.superseded || state.cinematic || state.creditsRolling)
    return 0;
  return gameSeconds(elapsed, slow);
}

export function advanceBackground(
  seconds: number,
  managed: boolean,
  tick: (dt: number) => boolean,
): void {
  let interval = managed ? manager.period : seconds;
  while (seconds > 0) {
    const dt = Math.min(seconds, interval);
    interval = tick(dt) ? manager.period : interval * 2;
    seconds -= dt;
  }
}

/** Process the time on each side of the laptop outage at its proper rate. */
export function backgroundWork(
  dt: number,
  incidentElapsed: number | undefined,
  work: (seconds: number, down: boolean) => void,
): void {
  if (incidentElapsed === undefined) {
    work(dt, false);
    return;
  }
  const before = Math.min(dt, Math.max(0, intern.routeSeconds - incidentElapsed));
  const throughOutage = Math.min(
    dt,
    Math.max(0, intern.routeSeconds + intern.closedSeconds - incidentElapsed),
  );
  work(before, false);
  work(throughOutage - before, true);
  work(dt - throughOutage, false);
}

export function restoredWin(file: SaveFile, cfg: PipeConfig): boolean {
  return file.won && file.state.scale >= cfg.scales.length;
}

export function resumeOffline(state: PipeState, cfg: PipeConfig, savedAt: number, now: number) {
  const away = elapsedMs(savedAt, now) / 1000;
  const report = offlineReport(state, cfg, save, away);
  state.limited = Math.max(0, state.limited - away);
  return report;
}

export function morningDuration(seconds: number, hourUnit: string, minuteUnit: string) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const hours = `${h} ${hourUnit}`;
  const minutes = `${m} ${minuteUnit}`;
  return {
    away: h && m ? `${hours} ${minutes}` : h ? hours : minutes,
    capped: seconds >= save.offlineCapHours * 3600,
  };
}

/** Collected offline money is excluded from the next frame’s live income reading. */
export function collectMorning(
  state: PipeState,
  meta: SavedMeta,
  report: OfflineReport,
  lastMoney: number,
) {
  applyOffline(state, report);
  meta.reports++;
  return lastMoney + report.dollars;
}

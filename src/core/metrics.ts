export interface Metrics {
  completed: boolean;
  presses: number;
  events: string[];
}

declare global {
  interface Window {
    __metrics: Metrics;
    __GAME__: { ready: boolean };
  }
}

/** What the frame capture reads back: tools/capture.mjs stores it in metrics.json. */
export const metrics: Metrics = { completed: false, presses: 0, events: [] };

export function installMetrics(): void {
  window.__metrics = metrics;
  window.__GAME__ = { ready: false };
}

export function logEvent(name: string): void {
  if (metrics.events.length < 200) metrics.events.push(name);
}

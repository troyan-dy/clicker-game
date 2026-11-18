/** The first paid span can reach a working Siberian node or three East Asian building sites. */
export type CableRoute = 'siberia' | 'eastasia';

export const SIBERIA = 1;
export const EAST_ASIA = 2;

/** Both orders use the same eight regions. Only the first two destinations trade places. */
export function routeRegion(route: CableRoute | undefined, step: number): number {
  if (route === 'eastasia') {
    if (step === 1) return EAST_ASIA;
    if (step === 2) return SIBERIA;
  }
  return step;
}

/** Saves from before the fork have no route and keep their original, entirely player-built nodes. */
export function connectedPilot(route: CableRoute | undefined, spans: number): boolean {
  return route !== undefined && spans >= (route === 'siberia' ? 1 : 2);
}

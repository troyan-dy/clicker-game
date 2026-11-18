import globe from '../../data/layout/globe.json';
import { connectedPilot, routeRegion, SIBERIA, type CableRoute } from '../../systems/pipeline/worldRoute';

/** every node of towers on the planet, the regions in the order the cable reaches them; the first one is home */
export const NODES = globe.regions.flatMap((r, region) => r.nodes.map((n) => ({ ...n, region }))).map((n, texture) => ({ ...n, texture }));
// Counting the occupied pilot first lets it light up immediately without displacing a player-built tower.
const PILOT_FIRST = [NODES[0], ...NODES.filter((n) => n.region === SIBERIA), ...NODES.slice(1).filter((n) => n.region !== SIBERIA)];
const EAST_FIRST = [...NODES].sort((a, b) => routeRegion('eastasia', a.region) - routeRegion('eastasia', b.region));

export function orderedNodes(route: CableRoute | undefined, spans: number) {
  if (connectedPilot(route, spans)) return PILOT_FIRST;
  return route === 'eastasia' ? EAST_FIRST : NODES;
}

export function regionProgress(nodes: typeof NODES, region: number, built: number): { built: number; next: boolean } {
  const occupied = nodes.slice(1, built + 1).filter(node => node.region === region);
  return { built: occupied.length, next: nodes[built + 1]?.region === region };
}

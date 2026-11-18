import tuning from '../../data/tuning/intern.json';

/** Elapsed playing time and the service credit quoted when the ticket was signed. */
export interface InternIncident {
  elapsed: number;
  credit: number;
}

export function laptopPhase(elapsed: number): 'routing' | 'closed' | 'restored' | 'done' {
  if (elapsed < tuning.routeSeconds) return 'routing';
  if (elapsed < tuning.routeSeconds + tuning.closedSeconds) return 'closed';
  if (elapsed < tuning.routeSeconds + tuning.closedSeconds + tuning.receiptSeconds) return 'restored';
  return 'done';
}

export function startIncident(income: number): InternIncident {
  return { elapsed: 0, credit: Math.max(1, Math.floor(income * tuning.creditSeconds)) };
}

/** Crossing the reopening boundary issues exactly one credit, including on a restored save. */
export function stepIncident(incident: InternIncident, dt: number): number {
  const reopens = tuning.routeSeconds + tuning.closedSeconds;
  const before = incident.elapsed;
  incident.elapsed += dt;
  return before < reopens && incident.elapsed >= reopens ? incident.credit : 0;
}

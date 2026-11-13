export interface Args {
  seed: number;
  gym: string;
  state: string;
  debug: boolean;
  capture: boolean;
  /** keep the game between visits */
  save: boolean;
}

/** Launch arguments from the URL: ?seed=7&gym=agree&state=rich&debug=1&save=1 */
export function readArgs(search: string): Args {
  const p = new URLSearchParams(search);
  const seed = Number(p.get('seed'));
  return {
    seed: Number.isFinite(seed) && p.has('seed') ? seed : Date.now() >>> 0,
    gym: p.get('gym') ?? '',
    state: p.get('state') ?? '',
    debug: p.get('debug') === '1',
    capture: p.get('capture') === '1',
    save: p.get('save') === '1',
  };
}

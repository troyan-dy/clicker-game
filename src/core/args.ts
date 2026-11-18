export interface Args {
  seed: number;
  gym: string;
  state: string;
  debug: boolean;
  capture: boolean;
  /** keep the game between visits */
  save: boolean;
  /** show the title card even in a gym or a capture */
  menu: boolean;
}

/** Launch arguments from the URL: ?seed=7&gym=agree&state=rich&debug=1&save=1 */
export function readArgs(search: string, tools = __TOOLS__): Args {
  // the release reads nothing from the address: no gyms, no quick starts
  if (!tools) return { seed: Date.now() >>> 0, gym: '', state: '', debug: false, capture: false, save: false, menu: false };
  const p = new URLSearchParams(search);
  const seed = Number(p.get('seed'));
  return {
    seed: Number.isFinite(seed) && p.has('seed') ? seed : Date.now() >>> 0,
    gym: p.get('gym') ?? '',
    state: p.get('state') ?? '',
    debug: p.get('debug') === '1',
    capture: p.get('capture') === '1',
    save: p.get('save') === '1',
    menu: p.get('menu') === '1',
  };
}

export function gameOptions(args: Args, gym: boolean) {
  // a gym saves and shows the menu only when asked; a capture never touches the player's save
  const save = !args.capture && (gym ? args.save : true);
  const menu = args.menu || (!gym && !args.capture);
  // a tuning session may open on a later screen: ?gym=agree&state=city|gov|planet|street|zig|world|finale|bench
  const start = gym ? ({ city: 3, intern: 3, standup: 3, manager: 3, gov: 4, planet: 5, street: 6, zig: 7, world: 8, finale: 9, bench: 10 }[args.state] ?? 0) : 0;
  return { overlay: args.debug, save, gym, menu, start, demo: gym ? args.state : '' };
}

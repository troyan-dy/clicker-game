/**
 * The big screens — the city (3), the state (4), the planet (5), the street (6), the ziggurat (7) — share one layout:
 * a node in the middle (the previous screen shrunk, or the factory of the street), employers around
 * it, the farms that run the sessions next to it. Scene coordinates (1920×1080), nodes anchored at
 * their bottom centre, `h` — the height a node is drawn at, px.
 */
export interface HubLayout {
  home: { key: string; x: number; y: number; h: number };
  /** connectors stop this far from the middle of the home node */
  homeRadius: number;
  /** employer (source id) → its lot; the first contracts are the closest ones */
  lots: Record<string, { key: string; x: number; y: number; h: number }>;
  /**
   * Where the bought sessions live. `ids` — the farms a node stands for; `upgrade` — the picture
   * it takes once that farm is owned; `above` — the node is above the home, its caption goes on top.
   */
  farms: Record<string, { key: string; x: number; y: number; h: number; ids: readonly string[]; upgrade?: { farm: string; key: string }; above?: boolean }>;
  /** a node is never drawn wider than this */
  maxWidth: number;
  /** a pale picture behind everything */
  backdrop?: { key: string; x: number; y: number; h: number; alpha: number };
  /** a pale isometric grid of streets behind everything: the distance between them, px */
  streets?: number;
  /** conveyor belts run from the middle to every employer: the factories of the last screen */
  belts?: boolean;
  /** where the people freed from work rest: the feet of every group (the far ones first), their height, the caption */
  park?: { slots: readonly (readonly [number, number])[]; h: number; label: { x: number; y: number } };
  /** the previous screen does not shrink into the middle of this one: its globe unrolls into this flat map */
  unroll?: boolean;
  /** the previous screen simply fades and this one appears in its place: the middle is something new */
  fresh?: boolean;
  /**
   * The middle is a ziggurat (M28): a dark tower coloured in tier by tier, with capsules on its walls;
   * the paper darkens at night, a dial shows the hour, power runs out to the lots. `steps` — how much of
   * the picture's height stands with one tier, two, … `faces` — the front wall of every tier in the
   * picture's own pixels (`size`): its top left corner, where it ends, the middle of the cables that
   * cross it and its height; the walls lean by `slope` px down for every px to the right.
   */
  grid?: {
    steps: readonly number[];
    size: readonly [number, number];
    slope: number;
    faces: readonly (readonly [y: number, x0: number, x1: number, cables: number, h: number])[];
  };
  /** the node in the middle may be wider than the others */
  homeWidth?: number;
}

const MID = { x: 670, y: 700 };
const BELOW = { x: 670, y: 930 };
const ABOVE = { x: 670, y: 480 };

export const HUBS: Record<number, HubLayout> = {
  // the city: the desk of the blueprint in the middle (the same picture at 0.4 of its size)
  3: {
    home: { key: 'desk', ...MID, h: 144 },
    homeRadius: 105,
    lots: {
      vector: { key: 'office', x: 410, y: 700, h: 158 },
      cats: { key: 'garage', x: 930, y: 700, h: 150 },
      creative: { key: 'studio', x: 410, y: 480, h: 150 },
      market: { key: 'mall', x: 930, y: 930, h: 150 },
      logistics: { key: 'warehouse', x: 930, y: 480, h: 140 },
      factory: { key: 'factory', x: 410, y: 930, h: 158 },
      bank: { key: 'bank', x: 150, y: 480, h: 160 },
      telecom: { key: 'tower', x: 1190, y: 930, h: 160 },
      gov: { key: 'admin', x: 1190, y: 480, h: 158 },
      cloud: { key: 'garage', x: 150, y: 930, h: 150 },
      consult: { key: 'office', x: 150, y: 700, h: 158 },
      everyone: { key: 'tower', x: 1190, y: 700, h: 160 },
    },
    farms: {
      servers: { key: 'rack', ...BELOW, h: 150, ids: ['rack', 'hall'], upgrade: { farm: 'hall', key: 'racks' } },
      dc: { key: 'datacenter', ...ABOVE, h: 125, ids: ['dc'], above: true },
    },
    maxWidth: 185,
    streets: 190,
  },
  // the state: the city is a block in the middle, ministries stand in a ring around it
  4: {
    home: { key: 'cityblock', ...MID, h: 150 },
    homeRadius: 110,
    lots: {
      pension: { key: 'office', x: 410, y: 700, h: 158 },
      customs: { key: 'warehouse', x: 930, y: 700, h: 140 },
      tax: { key: 'tower', x: 410, y: 480, h: 160 },
      digital: { key: 'admin', x: 930, y: 480, h: 158 },
      central: { key: 'bank', x: 410, y: 930, h: 160 },
      space: { key: 'launchpad', x: 930, y: 930, h: 160 },
      parliament: { key: 'parliament', x: 150, y: 700, h: 158 },
      defence: { key: 'military', x: 1190, y: 700, h: 150 },
    },
    farms: {
      gpus: { key: 'gpus', ...BELOW, h: 140, ids: ['gpu'] },
      campus: { key: 'datacenter', ...ABOVE, h: 125, ids: ['campus'], above: true },
    },
    maxWidth: 185,
    backdrop: { key: 'back_state', x: 670, y: 1010, h: 740, alpha: 0.4 },
  },
  // the planet: the country is an island in the middle of a globe
  5: {
    home: { key: 'island', ...MID, h: 140 },
    homeRadius: 115,
    lots: {
      exchange: { key: 'bank', x: 410, y: 700, h: 160 },
      shipping: { key: 'warehouse', x: 930, y: 700, h: 140 },
      satnet: { key: 'dish', x: 410, y: 480, h: 158 },
      games: { key: 'admin', x: 930, y: 480, h: 158 },
      station: { key: 'launchpad', x: 410, y: 930, h: 160 },
      standards: { key: 'hq', x: 930, y: 930, h: 150 },
      peace: { key: 'military', x: 150, y: 700, h: 150 },
      nations: { key: 'parliament', x: 1190, y: 700, h: 158 },
    },
    farms: {
      quota: { key: 'racks', ...BELOW, h: 150, ids: ['quota'] },
      orbit: { key: 'satellite', ...ABOVE, h: 125, ids: ['orbit'], above: true },
    },
    maxWidth: 185,
    backdrop: { key: 'globe', x: 670, y: 1010, h: 760, alpha: 0.3 },
  },
  // the planet as a workshop: the same world unrolled into a flat map; the factories in the middle, the trades done by hand around them, parks for the people
  6: {
    home: { key: 'robofactory', ...MID, h: 160 },
    homeRadius: 110,
    lots: {
      checkout: { key: 'supermarket', x: 150, y: 480, h: 150 },
      coffee: { key: 'coffee', x: 410, y: 480, h: 140 },
      courier: { key: 'pizzeria', x: 1190, y: 700, h: 140 },
      taxi: { key: 'taxi', x: 930, y: 700, h: 120 },
      barber: { key: 'barber', x: 930, y: 480, h: 145 },
      depot: { key: 'warehouse', x: 410, y: 930, h: 135 },
      build: { key: 'build', x: 930, y: 930, h: 160 },
      clinic: { key: 'clinic', x: 1190, y: 480, h: 130 },
      school: { key: 'school', x: 150, y: 930, h: 135 },
      farm: { key: 'farm', x: 1190, y: 930, h: 150 },
    },
    farms: {
      chips: { key: 'gpus', ...BELOW, h: 125, ids: ['chips'] },
    },
    maxWidth: 185,
    backdrop: { key: 'back_world', x: 670, y: 1016, h: 790, alpha: 0.5 },
    belts: true,
    park: {
      slots: [
        [95, 672],
        [265, 672],
        [435, 672],
        [180, 774],
        [350, 774],
        [520, 774],
      ],
      h: 100,
      label: { x: 270, y: 776 },
    },
    unroll: true,
  },
  // the ziggurat: the tallest thing on the map stands in the middle; the neural network it feeds — in the far
  // row, the old power plants that people in baths replace — around
  7: {
    home: { key: 'ziggurat', x: 670, y: 884, h: 372 },
    homeRadius: 200,
    homeWidth: 400,
    lots: {
      diesel: { key: 'diesel', x: 384, y: 700, h: 112 },
      coal: { key: 'coalplant', x: 956, y: 700, h: 150 },
      gas: { key: 'gasplant', x: 384, y: 930, h: 126 },
      wind: { key: 'wind', x: 956, y: 930, h: 158 },
      solar: { key: 'solar', x: 132, y: 700, h: 118 },
      hydro: { key: 'hydro', x: 1208, y: 700, h: 146 },
      nuclear: { key: 'nuclear', x: 132, y: 930, h: 150 },
      fusion: { key: 'fusion', x: 1208, y: 930, h: 150 },
    },
    farms: {
      net: { key: 'netcore', x: 384, y: 478, h: 150, ids: ['net'] },
    },
    maxWidth: 185,
    fresh: true,
    grid: {
      steps: [0.24, 0.374, 0.464, 0.606, 0.689, 0.794, 1],
      size: [725, 862],
      slope: 0.099,
      faces: [
        [683, 8, 513, 281, 142],
        [572, 61, 480, 290, 89],
        [469, 108, 456, 298, 86],
        [370, 153, 452, 309, 95],
        [275, 197, 434, 318, 80],
        [186, 242, 416, 329, 85],
      ],
    },
  },
};

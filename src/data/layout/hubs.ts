/**
 * The big screens — the city (3), the state (4), the planet (5) — share one layout: the previous
 * screen shrunk into a node in the middle, one-off employers around it, the farms that run the
 * sessions next to it. Scene coordinates (1920×1080), nodes anchored at their bottom centre,
 * `h` — the height a node is drawn at, px.
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
      vector: { key: 'office', x: 410, y: 700, h: 170 },
      cats: { key: 'garage', x: 930, y: 700, h: 150 },
      creative: { key: 'studio', x: 410, y: 480, h: 150 },
      market: { key: 'mall', x: 930, y: 930, h: 150 },
      logistics: { key: 'warehouse', x: 930, y: 480, h: 140 },
      factory: { key: 'factory', x: 410, y: 930, h: 165 },
      bank: { key: 'bank', x: 150, y: 480, h: 160 },
      telecom: { key: 'tower', x: 1190, y: 930, h: 175 },
      gov: { key: 'admin', x: 1190, y: 480, h: 165 },
      cloud: { key: 'garage', x: 150, y: 930, h: 150 },
      consult: { key: 'office', x: 150, y: 700, h: 170 },
      everyone: { key: 'tower', x: 1190, y: 700, h: 175 },
    },
    farms: {
      servers: { key: 'rack', ...BELOW, h: 150, ids: ['rack', 'hall'], upgrade: { farm: 'hall', key: 'racks' } },
      dc: { key: 'datacenter', ...ABOVE, h: 125, ids: ['dc'], above: true },
    },
    maxWidth: 185,
  },
  // the state: the city is a block in the middle, ministries stand in a ring around it
  4: {
    home: { key: 'cityblock', ...MID, h: 150 },
    homeRadius: 110,
    lots: {
      pension: { key: 'office', x: 410, y: 700, h: 170 },
      customs: { key: 'warehouse', x: 930, y: 700, h: 140 },
      tax: { key: 'tower', x: 410, y: 480, h: 175 },
      digital: { key: 'admin', x: 930, y: 480, h: 165 },
      central: { key: 'bank', x: 410, y: 930, h: 160 },
      space: { key: 'launchpad', x: 930, y: 930, h: 175 },
      parliament: { key: 'parliament', x: 150, y: 700, h: 170 },
      defence: { key: 'military', x: 1190, y: 700, h: 150 },
    },
    farms: {
      gpus: { key: 'gpus', ...BELOW, h: 140, ids: ['gpu'] },
      campus: { key: 'datacenter', ...ABOVE, h: 125, ids: ['campus'], above: true },
    },
    maxWidth: 185,
  },
  // the planet: the country is an island in the middle of a globe
  5: {
    home: { key: 'island', ...MID, h: 140 },
    homeRadius: 115,
    lots: {
      exchange: { key: 'bank', x: 410, y: 700, h: 160 },
      shipping: { key: 'warehouse', x: 930, y: 700, h: 140 },
      satnet: { key: 'dish', x: 410, y: 480, h: 165 },
      games: { key: 'admin', x: 930, y: 480, h: 165 },
      station: { key: 'launchpad', x: 410, y: 930, h: 175 },
      standards: { key: 'hq', x: 930, y: 930, h: 150 },
      peace: { key: 'military', x: 150, y: 700, h: 150 },
      nations: { key: 'parliament', x: 1190, y: 700, h: 170 },
    },
    farms: {
      quota: { key: 'racks', ...BELOW, h: 150, ids: ['quota'] },
      orbit: { key: 'satellite', ...ABOVE, h: 125, ids: ['orbit'], above: true },
    },
    maxWidth: 185,
    backdrop: { key: 'globe', x: 670, y: 1010, h: 760, alpha: 0.3 },
  },
};

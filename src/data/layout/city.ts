/**
 * The city (the third screen), in scene coordinates (1920×1080): a grid of five columns and three rows
 * with the player's desk in the middle. Nodes are anchored at their bottom centre.
 * `h` — the height a building is drawn at, px.
 */
export const CITY = {
  /** the desk of the blueprint shrinks into this node: same picture, `scale` of its size */
  home: { x: 670, y: 700, scale: 0.4 },
  /** connectors stop this far from the middle of the desk */
  homeRadius: 105,
  /** company id → its lot; the first contracts are the closest buildings */
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
  } as Record<string, { key: string; x: number; y: number; h: number }>,
  /** where the bought sessions live: the server room below the desk, the datacentre above it */
  farms: {
    servers: { x: 670, y: 930, h: 150 },
    dc: { x: 670, y: 480, h: 125 },
  },
  /** a building is never drawn wider than this */
  maxWidth: 185,
} as const;

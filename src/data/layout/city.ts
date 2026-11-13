/**
 * The city (the third screen), in scene coordinates (1920×1080): the player's desk in the middle,
 * company buildings around it in three staggered rows. Nodes are anchored at their bottom centre.
 * `h` — the height a building is drawn at, px.
 */
export const CITY = {
  /** the desk of the blueprint shrinks into this node: same picture, `scale` of its size */
  home: { x: 670, y: 700, scale: 0.4 },
  /** squares from the companies stop this far from the middle of the desk */
  homeRadius: 105,
  /** company id → its lot; the first contracts are the closest buildings */
  lots: {
    vector: { key: 'office', x: 390, y: 700, h: 170 },
    cats: { key: 'garage', x: 950, y: 700, h: 150 },
    creative: { key: 'studio', x: 530, y: 480, h: 150 },
    market: { key: 'mall', x: 810, y: 930, h: 150 },
    logistics: { key: 'warehouse', x: 810, y: 480, h: 140 },
    factory: { key: 'factory', x: 530, y: 930, h: 165 },
    bank: { key: 'bank', x: 250, y: 480, h: 160 },
    telecom: { key: 'tower', x: 1090, y: 930, h: 200 },
    gov: { key: 'admin', x: 1090, y: 480, h: 165 },
    cloud: { key: 'datacenter', x: 250, y: 930, h: 130 },
    consult: { key: 'office', x: 110, y: 700, h: 170 },
    everyone: { key: 'tower', x: 1230, y: 700, h: 200 },
  } as Record<string, { key: string; x: number; y: number; h: number }>,
  /** a building is never drawn wider than this */
  maxWidth: 200,
} as const;

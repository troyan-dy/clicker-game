type Pt = readonly [number, number];

/**
 * Where things stand on the blueprint, in scene coordinates (1920×1080).
 * Nodes are anchored at their bottom centre. The shop takes x > 1340, the money counter the top centre.
 */
export const BP = {
  /** the player's desk; `screen` is the laptop screen inside the sprite (423×360), measured on the picture */
  desk: { x: 800, y: 760, scale: 1, w: 423, h: 360, screen: { tl: [65, 83], tr: [130, 57], bl: [77, 139] } },
  tray: { x: 470, y: 690, scale: 0.55 },
  sources: {
    job: { key: 'office', x: 170, y: 470, scale: 0.55, out: [270, 430], into: [470, 540] },
    freelance: { key: 'board', x: 170, y: 800, scale: 0.5, out: [242, 730], into: [382, 640] },
  } as Record<string, { key: string; x: number; y: number; scale: number; out: Pt; into: Pt }>,
  /** tasks leave the tray here */
  trayOut: [560, 640] as Pt,
  /** laptops of the subagents, in the order they are bought */
  slots: [
    [1190, 640],
    [1190, 420],
    [1190, 860],
    [1010, 990],
    [810, 990],
    [610, 990],
    [410, 990],
    [1000, 380],
  ] as readonly Pt[],
  slotScale: 0.5,
  /** Claude on the screen of a subagent's laptop: offset from the slot, tilt of the screen */
  slotFace: { dx: 14, dy: -128, rot: 0.37 },
  /** connectors to the subagents run along these lines, below and above the desk */
  busY: 815,
  busTopY: 330,
  money: { x: 670, y: 96 },
} as const;

/** The laptop screen of the desk in scene coordinates: top-left, top-right, bottom-left. */
export function deskScreen(): { tl: Pt; tr: Pt; bl: Pt } {
  const d = BP.desk;
  const left = d.x - (d.w * d.scale) / 2;
  const top = d.y - d.h * d.scale;
  const at = (p: Pt): Pt => [left + p[0] * d.scale, top + p[1] * d.scale];
  return { tl: at(d.screen.tl), tr: at(d.screen.tr), bl: at(d.screen.bl) };
}

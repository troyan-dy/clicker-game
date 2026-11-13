type Pt = readonly [number, number];

/**
 * Where things stand on the blueprint, in scene coordinates (1920×1080).
 * Nodes are anchored at their bottom centre. The shop takes x > 1340, the money counter the top centre.
 */
export const BP = {
  /** the player's desk; `screen` is the laptop screen inside the sprite (423×360), measured on the picture */
  desk: { x: 800, y: 760, scale: 1, w: 423, h: 360, screen: { tl: [65, 83], tr: [130, 57], bl: [77, 139] } },
  tray: { x: 470, y: 690, scale: 0.55 },
  /** kinds of work: a column on the left, in the order of the shop */
  sources: {
    job: { key: 'office', x: 170, y: 250, scale: 0.42 },
    freelance: { key: 'board', x: 170, y: 480, scale: 0.42 },
    referral: { key: 'handshake', x: 170, y: 710, scale: 0.42 },
    studio: { key: 'studio', x: 170, y: 940, scale: 0.42 },
  } as Record<string, { key: string; x: number; y: number; scale: number }>,
  /** every source sends its tasks to this vertical line, and along it into the tray */
  trunkX: 345,
  trayIn: [382, 640] as Pt,
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
  ] as readonly Pt[],
  slotScale: 0.5,
  /** Claude on the screen of a subagent's laptop: offset from the slot, tilt of the screen */
  slotFace: { dx: 14, dy: -128, rot: 0.37 },
  /** subagents beyond the slots are a box of laptops with a number */
  more: { x: 430, y: 992, scale: 0.4 },
  /** connectors to the subagents run along this line below the desk */
  busY: 815,
  money: { x: 850, y: 96 },
} as const;

/** The laptop screen of the desk in scene coordinates: top-left, top-right, bottom-left. */
export function deskScreen(): { tl: Pt; tr: Pt; bl: Pt } {
  const d = BP.desk;
  const left = d.x - (d.w * d.scale) / 2;
  const top = d.y - d.h * d.scale;
  const at = (p: Pt): Pt => [left + p[0] * d.scale, top + p[1] * d.scale];
  return { tl: at(d.screen.tl), tr: at(d.screen.tr), bl: at(d.screen.bl) };
}

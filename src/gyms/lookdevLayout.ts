/**
 * Scene coordinates (1920×1080) of the look-dev composition.
 * Derived from the measured sprite (pr_desk_laptop 1536×1024: screen centre 768,280; tabletop row 545)
 * at scale 0.62, then tuned by eye from captures.
 */
export const LAYOUT = {
  desk: { x: 907, bottom: 1026, height: 635 },
  coder: { x: 262, bottom: 1046, height: 690 },
  /** centre of the laptop screen and the side of Claude's square face */
  face: { x: 907, y: 565, size: 138 },
  key: { x: 575, y: 667, w: 170, h: 84 },
  /** where Claude's message card sits (matches .ld-bubble in lookdev.css) */
  bubble: { x: 619, y: 196, w: 576, h: 220 },
  /** centre of the money counter */
  money: { x: 710, y: 86 },
} as const;

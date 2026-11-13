type Pt = readonly [number, number];

/** Scene coordinates (1920×1080), measured on public/assets/img/scene_blueprint.webp. */
export const LD = {
  /** inner screen of the central laptop: top-left, top-right, bottom-left corners */
  screen: { tl: [589, 611], tr: [725, 656], bl: [575, 710] },
  /** centres of the money counters */
  moneyPaper: { x: 670, y: 96 },
  moneyTerm: { x: 960, y: 66 },
  /** top edge of Claude's prompt card on the blueprint (.bp-card): squares leave from here, never over its text */
  card: { x: 818, y: 138, w: 500, h: 14 },
  /** empty middle of the terminal's prompt box (.t-ask): squares leave from here, never over its text */
  askLine: { x: 540, y: 420, w: 440, h: 70 },
  /** connector lines, each ending at the central laptop */
  paths: [
    [[345, 497], [345, 549], [599, 549], [599, 598]],
    [[682, 460], [682, 630]],
    [[205, 661], [570, 661]],
    [[1049, 580], [1049, 637], [768, 637], [768, 676], [733, 676]],
    [[1105, 789], [884, 789], [884, 730], [725, 730]],
  ] as readonly (readonly Pt[])[],
} as const;

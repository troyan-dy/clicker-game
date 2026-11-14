import data from './awards.json';

/**
 * An award (M10): a dry certificate for a milestone. `stat` — what is counted (see GameScene.stats),
 * `min` — how much of it earns the award.
 */
export interface Award {
  id: string;
  name: string;
  text: string;
  stat: string;
  min: number;
}

export const AWARDS: readonly Award[] = data;

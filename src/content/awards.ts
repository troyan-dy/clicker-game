import { LANG } from '../core/lang';
import en from './awards.en.json';
import data from './awards.json';

/**
 * An award (M10): a dry certificate for a milestone. `stat` — what is counted (see GameScene.stats),
 * `min` — how much of it earns the award. The English words live in awards.en.json, by id.
 */
export interface Award {
  id: string;
  name: string;
  text: string;
  stat: string;
  min: number;
}

const words: Record<string, { name: string; text: string }> = en;
export const AWARDS: readonly Award[] = LANG === 'en' ? data.map((a) => ({ ...a, ...words[a.id] })) : data;

import { L } from '../core/lang';
import en from './takeovers.en.json';
import data from './takeovers.json';

/**
 * The headline of the day an employer is taken whole (M23), by source id. The lines live in
 * takeovers.json (English — takeovers.en.json): one per employer of the big screens.
 */
export const TAKEOVERS: Record<string, string> = L(data, en);

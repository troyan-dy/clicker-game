import { L } from '../core/lang';
import en from './calls.en.json';
import data from './calls.json';

/**
 * Calls and inspections (M20): what an employer may ask the player in person, by screen (2 blueprint … 6 street).
 * The lines live in calls.json (English — calls.en.json) — add freely; they must fit a small bubble above a building.
 */
export const CALLS: Record<string, readonly string[]> = L(data, en);

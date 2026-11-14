import data from './calls.json';

/**
 * Calls and inspections (M20): what an employer may ask the player in person, by screen (2 blueprint … 5 planet).
 * The lines live in calls.json — add freely; they must fit a small bubble above a building.
 */
export const CALLS: Record<string, readonly string[]> = data;

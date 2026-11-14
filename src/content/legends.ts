import data from './legends.json';

/** A legendary ticket (M12): a question so absurd that approving it pays many times over and goes into the collection. */
export interface Legend {
  id: string;
  title: string;
  /** the question as the pile shows it */
  ask: string;
}

export const LEGENDS: readonly Legend[] = data;

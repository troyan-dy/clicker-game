import { L } from '../core/lang';
import en from './calls.en.json';
import data from './calls.json';

/**
 * Calls and inspections (M20): what an employer may ask the player in person, by screen (2 blueprint … 6 street).
 * The lines live in calls.json (English — calls.en.json) — add freely; they must fit a small bubble above a building.
 */
export const CALLS: Record<string, readonly string[]> = L(data, en);

export const STANDUP = L(
  [
    { employer: '10:00 · «Первый Контур»', question: 'Можете показать экран всем?', reply: 'Спасибо. Вы на проекторе.' },
    { employer: '10:00 · «Под грифом»', question: 'Таблицу видите только вы?', reply: 'Отлично. Тогда открываю зарплаты.' },
  ],
  [
    { employer: '10:00 · First Line', question: 'Can you share your screen?', reply: 'Thanks. You’re on the projector.' },
    { employer: '10:00 · In Confidence', question: 'Only you can see this sheet?', reply: 'Great. Opening the payroll tab.' },
  ],
);

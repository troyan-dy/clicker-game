export interface Settings {
  sound: boolean;
  music: boolean;
  /** chosen in the menu; absent — the browser decides */
  lang?: 'ru' | 'en';
}

const KEY = 'da-klod-settings';

/** What the player chose in the menu; survives a restart. */
export function loadSettings(): Settings {
  const s: Settings = { sound: true, music: true };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Settings>;
    if (typeof raw.sound === 'boolean') s.sound = raw.sound;
    if (typeof raw.music === 'boolean') s.music = raw.music;
    if (raw.lang === 'ru' || raw.lang === 'en') s.lang = raw.lang;
  } catch {
    // no storage or a broken record: the defaults will do
  }
  return s;
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // the choice lives until the page is closed
  }
}

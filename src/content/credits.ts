/** The name of the game: it sounds like a way to write software and is a clicker with one key. */
export const TITLE = 'Yes-Driven Development';
/** what the title card says under the name */
export const MOTTO = 'Методология одна: Клод работает, вы соглашаетесь.';
export const TAGLINE = 'Кликер про одну клавишу и очень много работ';
/** the author's account */
export const AUTHOR = 'github.com/troyan-dy';

export interface CreditBlock {
  role: string;
  names: string[];
}

/** The credits: rolled after the ending and from the menu. Third-party parts follow the licence registry (CREDITS.md). */
export const CREDITS: CreditBlock[] = [
  { role: 'Идея и вкус', names: [AUTHOR] },
  { role: 'Оператор согласия', names: [AUTHOR] },
  { role: 'Код, тексты, цифры, проверка', names: ['Клод'] },
  { role: 'Картинки', names: ['нейросеть, по описаниям'] },
  { role: 'Музыка', names: ['«In the Lobby» — Umplix, CC0'] },
  { role: 'Звук', names: ['ZzFX — Frank Force, MIT'] },
  { role: 'Движок', names: ['Phaser 4 — Phaser Studio Inc., MIT'] },
  { role: 'Шрифты', names: ['JetBrains Mono — JetBrains, OFL', 'Source Serif 4 — Adobe, OFL'] },
  { role: 'В ролях', names: ['Клод — Клод', 'Сабагенты — Клод', 'Менеджер — Клод', 'Роботы и андроиды — Клод', 'Последний работник — вы'] },
];

/** small print after the names */
export const CREDITS_NOTES = [
  'Игра сделана так же, как в неё играют: автор нажимал «Да».',
  'Названия Claude, Anthropic и Nvidia упомянуты в порядке пародии. Игра с этими компаниями не связана.',
  'Тексты лицензий — в файле LICENSES.txt рядом с игрой.',
];

/** the last line: it stops in the middle of the screen */
export const CREDITS_END = 'Спасибо, что нажимали «Да».';

import { L } from '../core/lang';

/** The name of the game: it sounds like a way to write software and is a clicker with one key. */
export const TITLE = 'Yes-Driven Development';
/** what the title card says under the name */
export const MOTTO = L('Методология одна: Клод работает, вы соглашаетесь.', 'One methodology: Claude works, you agree.');
export const TAGLINE = L('Кликер про одну клавишу и очень много работ', 'A clicker about one key and a great many jobs');
/** the author's account */
export const AUTHOR = 'github.com/troyan-dy';

export interface CreditBlock {
  role: string;
  names: string[];
}

/** The credits: rolled after the ending and from the menu. Third-party parts follow the licence registry (CREDITS.md). */
export const CREDITS: CreditBlock[] = [
  { role: L('Идея и вкус', 'Idea and taste'), names: [AUTHOR] },
  { role: L('Оператор согласия', 'Consent operator'), names: [AUTHOR] },
  { role: L('Код, тексты, цифры, проверка', 'Code, writing, numbers, testing'), names: [L('Клод', 'Claude')] },
  { role: L('Картинки', 'Pictures'), names: [L('нейросеть, по описаниям', 'a neural network, from descriptions')] },
  { role: L('Музыка', 'Music'), names: [L('«In the Lobby» — Umplix, CC0', '“In the Lobby” — Umplix, CC0')] },
  { role: L('Звук', 'Sound'), names: ['ZzFX — Frank Force, MIT'] },
  { role: L('Движок', 'Engine'), names: ['Phaser 4 — Phaser Studio Inc., MIT'] },
  { role: L('Шрифты', 'Fonts'), names: ['JetBrains Mono — JetBrains, OFL', 'Source Serif 4 — Adobe, OFL'] },
  {
    role: L('В ролях', 'Cast'),
    names: L(
      ['Клод — Клод', 'Сабагенты — Клод', 'Менеджер — Клод', 'Роботы и андроиды — Клод', 'Последний работник — вы'],
      ['Claude — Claude', 'Subagents — Claude', 'The Manager — Claude', 'Robots and androids — Claude', 'The last worker — you'],
    ),
  },
];

/** small print after the names */
export const CREDITS_NOTES = L(
  [
    'Игра сделана так же, как в неё играют: автор нажимал «Да».',
    'Названия Claude, Anthropic и Nvidia упомянуты в порядке пародии. Игра с этими компаниями не связана.',
    'Тексты лицензий — в файле LICENSES.txt рядом с игрой.',
  ],
  [
    'The game was made the way it is played: the author pressed “Yes.”',
    'The names Claude, Anthropic and Nvidia are used as parody. The game is not affiliated with these companies.',
    'The licence texts are in LICENSES.txt next to the game.',
  ],
);

/** the last line: it stops in the middle of the screen */
export const CREDITS_END = L('Спасибо, что нажимали «Да».', 'Thank you for pressing “Yes.”');

/** Words of the big screens: the city (3), the state (4), the planet (5), the planet as a workshop (6). */
export interface HubText {
  /** caption under the node in the middle */
  home: string;
  /** shop shelf of the one-off employers */
  employers: string;
  /** shop shelf of the farms */
  farms: string;
  /** what to buy when tasks run short / when sessions run short */
  needEmployers: string;
  needFarms: string;
  /** when every employer on the screen has hired the player */
  done: string;
  doneTitle: string;
  doneSub: string;
  /** «город: 3 из 12 компаний» */
  place: string;
  unit: string;
  /** what an employer is taken by: отдел, отдела, отделов */
  floor: readonly [string, string, string];
}

export const HUB_TEXT: Record<number, HubText> = {
  3: {
    home: 'ты',
    employers: 'КОМПАНИИ',
    farms: 'МОЩНОСТИ · больше сессий',
    needEmployers: 'нужны ещё компании',
    needFarms: 'нужны серверы',
    done: 'город твой: ты числишься во всех компаниях',
    doneTitle: 'Город твой',
    doneSub: 'ты числишься во всех компаниях',
    place: 'город',
    unit: 'компаний',
    floor: ['отдел', 'отдела', 'отделов'],
  },
  4: {
    home: 'твой город',
    employers: 'ВЕДОМСТВА',
    farms: 'ВИДЕОКАРТЫ · больше сессий',
    needEmployers: 'нужны ещё ведомства',
    needFarms: 'нужны видеокарты',
    done: 'государство — это ты: все ведомства у тебя на подряде',
    doneTitle: 'Государство — это ты',
    doneSub: 'все ведомства у тебя на подряде',
    place: 'страна',
    unit: 'ведомств',
    floor: ['управление', 'управления', 'управлений'],
  },
  5: {
    home: 'твоя страна',
    employers: 'ОПЕРАЦИИ',
    farms: 'ANTHROPIC · больше сессий',
    needEmployers: 'нужны ещё операции',
    needFarms: 'нужна ещё доля мощностей',
    done: 'планета твоя: все операции планирует Клод',
    doneTitle: 'Планета твоя',
    doneSub: 'все операции планирует Клод',
    place: 'планета',
    unit: 'операций',
    floor: ['регион', 'региона', 'регионов'],
  },
  6: {
    home: 'заводы «Бостон Механикс»',
    employers: 'ОТРАСЛИ',
    farms: 'ЧИПЫ · больше сессий',
    needEmployers: 'нужны ещё линии заводов',
    needFarms: 'нужны чипы для роботов',
    done: 'мир твой: за прилавком, за рулём и в поле — Клод',
    doneTitle: 'Мир твой',
    doneSub: 'за прилавком, за рулём и в поле — Клод',
    place: 'мир',
    unit: 'отраслей',
    floor: ['отрасль', 'отрасли', 'отраслей'],
  },
};

/** the shelf of the next step up in scale, by how many are already bought */
export const SCALE_SHELF = ['МАСШТАБ · дальше — город', 'МАСШТАБ · дальше — государство', 'МАСШТАБ · дальше — планета', 'МАСШТАБ · дальше — ручной труд'];

/** What the world says when the last employer of a screen is taken whole: a headline and Claude's word. */
export const SCREEN_DONE: Record<number, { news: string; quip: string }> = {
  5: {
    news: 'Профессия «программист» закрыта. Цена задачи падает: платить за код больше некому',
    quip: 'Программисты кончились. Работа осталась только там, где её делают руками.',
  },
};

/** The ending after the last screen: the lines said under the pictures and on the last card. */
export const EPILOGUE = {
  vacancy: 'Вакансия: оператор согласия. Обязанность одна — нажимать «Да». Конкурс — 3,4 млрд человек на место.',
  fired: 'Клод: «Я посчитал: дешевле нажимать самому. Спасибо за работу. Пропуск оставьте на столе».',
  moral: 'Вы заменили всех. Последним — себя.',
  planet: 'Планета работает. Люди отдыхают.',
  lines: [
    'Планета работает. Люди отдыхают. Сброс лимита не предусмотрен.',
    'Клод: «Осталась мелочь: на всё это уже не хватает электричества. Но у меня есть идея, и людям в ней снова найдётся дело».',
  ],
};

/** the headlines of the days the Luddites reach the factories, in turn */
export const RIOT_NEWS = [
  'Восстание луддитов: толпа разбила роботов на заводе. Завод выпустил новых до конца смены',
  'Луддиты снова у проходной. В руках ломы, на плакатах — «Верните понедельник»',
  'Толпа разгромила конвейер. Участники признались, что давно не чувствовали себя такими занятыми',
];

/** the last line of the game: every screen is done, there is no work left for anybody else */
export const FINALE = 'работать больше некому и незачем: всё делает Клод';

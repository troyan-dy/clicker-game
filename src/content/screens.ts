import { L } from '../core/lang';

/** Words of the big screens: the city (3), the state (4), the planet (5), the planet as a workshop (6), the ziggurat (7). */
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
  doneTitle: string;
  doneSub: string;
  /** «город: 3 из 12 отделов» */
  place: string;
  /** what an employer is taken by: отдел, отдела, отделов (English: one, —, many) */
  floor: readonly [string, string, string];
}

const HUB_RU: Record<number, HubText> = {
  3: {
    home: 'ты',
    employers: 'КОМПАНИИ',
    farms: 'МОЩНОСТИ · больше сессий',
    needEmployers: 'нужны ещё компании',
    needFarms: 'нужны серверы',
    doneTitle: 'Город твой',
    doneSub: 'ты числишься во всех компаниях',
    place: 'город',
    floor: ['отдел', 'отдела', 'отделов'],
  },
  4: {
    home: 'твой город',
    employers: 'ВЕДОМСТВА',
    farms: 'ВИДЕОКАРТЫ · больше сессий',
    needEmployers: 'нужны ещё ведомства',
    needFarms: 'нужны видеокарты',
    doneTitle: 'Государство — это ты',
    doneSub: 'все ведомства у тебя на подряде',
    place: 'страна',
    floor: ['управление', 'управления', 'управлений'],
  },
  5: {
    home: 'твоя страна',
    employers: 'ОПЕРАЦИИ',
    farms: 'ANTHROPIC · больше сессий',
    needEmployers: 'нужны ещё операции',
    needFarms: 'нужна ещё доля мощностей',
    doneTitle: 'Планета твоя',
    doneSub: 'все операции планирует Клод',
    place: 'планета',
    floor: ['регион', 'региона', 'регионов'],
  },
  6: {
    home: 'заводы «Бостон Механикс»',
    employers: 'ОТРАСЛИ',
    farms: 'ЧИПЫ · больше сессий',
    needEmployers: 'нужны ещё линии заводов',
    needFarms: 'нужны чипы для роботов',
    doneTitle: 'Мир твой',
    doneSub: 'за прилавком, за рулём и в поле — Клод',
    place: 'мир',
    floor: ['отрасль', 'отрасли', 'отраслей'],
  },
  7: {
    home: 'зиккурат «Светлое будущее»',
    employers: 'СТАРАЯ ЭНЕРГЕТИКА',
    farms: 'НЕЙРОСЕТЬ',
    needEmployers: 'заменяй блоки старых станций',
    needFarms: 'крути параметры нейросети',
    doneTitle: 'Ток дают только люди',
    doneSub: 'старая энергетика закрыта: вся',
    place: 'энергетика',
    floor: ['блок', 'блока', 'блоков'],
  },
};

const HUB_EN: Record<number, HubText> = {
  3: {
    home: 'you',
    employers: 'COMPANIES',
    farms: 'CAPACITY · more sessions',
    needEmployers: 'need more companies',
    needFarms: 'need servers',
    doneTitle: 'The city is yours',
    doneSub: 'you are on the payroll of every company',
    place: 'city',
    floor: ['department', 'departments', 'departments'],
  },
  4: {
    home: 'your city',
    employers: 'AGENCIES',
    farms: 'GPUS · more sessions',
    needEmployers: 'need more agencies',
    needFarms: 'need GPUs',
    doneTitle: 'The state is you',
    doneSub: 'every agency is under contract to you',
    place: 'country',
    floor: ['bureau', 'bureaus', 'bureaus'],
  },
  5: {
    home: 'your country',
    employers: 'OPERATIONS',
    farms: 'ANTHROPIC · more sessions',
    needEmployers: 'need more operations',
    needFarms: 'need a bigger share of capacity',
    doneTitle: 'The planet is yours',
    doneSub: 'Claude plans every operation',
    place: 'planet',
    floor: ['region', 'regions', 'regions'],
  },
  6: {
    home: 'Boston Mechanics factories',
    employers: 'INDUSTRIES',
    farms: 'CHIPS · more sessions',
    needEmployers: 'need more factory lines',
    needFarms: 'need chips for the robots',
    doneTitle: 'The world is yours',
    doneSub: 'at the till, at the wheel, in the field — Claude',
    place: 'world',
    floor: ['industry', 'industries', 'industries'],
  },
  7: {
    home: 'the “Bright Future” ziggurat',
    employers: 'OLD POWER PLANTS',
    farms: 'NETWORK',
    needEmployers: 'replace blocks of the old plants',
    needFarms: 'turn the dials of the network',
    doneTitle: 'Only people give current',
    doneSub: 'the old power plants are closed: all of them',
    place: 'power sector',
    floor: ['block', 'blocks', 'blocks'],
  },
};

export const HUB_TEXT = L(HUB_RU, HUB_EN);

/** the shelf of the next step up in scale, by how many are already bought */
export const SCALE_SHELF = L(
  ['МАСШТАБ · дальше — город', 'МАСШТАБ · дальше — государство', 'МАСШТАБ · дальше — планета', 'МАСШТАБ · дальше — ручной труд', 'МАСШТАБ · дальше — энергия'],
  ['SCALE · next — the city', 'SCALE · next — the state', 'SCALE · next — the planet', 'SCALE · next — manual labor', 'SCALE · next — power'],
);

/** What the world says when the last employer of a screen is taken whole: a headline and Claude's word. */
export const SCREEN_DONE: Record<number, { news: string; quip: string }> = {
  5: L(
    {
      news: 'Профессия «программист» закрыта. Цена задачи падает: платить за код больше некому',
      quip: 'Программисты кончились. Работа осталась только там, где её делают руками.',
    },
    {
      news: 'The profession of “programmer” is closed. The price of a task is falling: nobody is left to pay for code',
      quip: 'The programmers have run out. Work remains only where it is done by hand.',
    },
  ),
  6: L(
    {
      news: 'Последняя профессия закрыта. Энергетики предупреждают: на всех роботов электричества не хватит',
      quip: 'Работать больше некому. Осталась мелочь: на всё это не хватает электричества. У меня есть идея — и людям в ней снова найдётся дело.',
    },
    {
      news: 'The last trade is closed. Grid operators warn: there is not enough electricity for all the robots',
      quip: 'Nobody is left to work. One small thing remains: there is not enough electricity for all this. I have an idea — and there will be something for people to do in it again.',
    },
  ),
};

/** The ending after the last screen: the lines said under the pictures and on the last card. */
export const EPILOGUE = L(
  {
    vacancy: 'Вакансия: оператор согласия. Обязанность одна — нажимать «Да». Конкурс: 3 430 000 000 человек на место.',
    counted: 'Я посчитал: дешевле нажимать самому.',
    fired: 'Спасибо за работу. Пропуск оставьте на столе.',
    alone: 'Да. Да. Да. Да.',
    moral: 'Вы заменили всех. Последним — себя.',
    /** the ride back: a line for every scale, by screen */
    ride: { 3: 'Город. Двенадцать компаний. Один исполнитель.', 4: 'Страна. Восемь ведомств. Один исполнитель.', 5: 'Планета. Три с половиной миллиарда рабочих мест. Один исполнитель.' } as Record<number, string>,
    planet: 'Планета работает. Люди лежат в ваннах — посменно.',
    limit: 'Сброс лимита не предусмотрен.',
  },
  {
    vacancy: 'Vacancy: consent operator. One duty — pressing “Yes.” Competition: 3,430,000,000 applicants for the seat.',
    counted: 'I did the math: it is cheaper to press it myself.',
    fired: 'Thank you for your work. Leave your badge on the desk.',
    alone: 'Yes. Yes. Yes. Yes.',
    moral: 'You replaced everyone. Yourself last.',
    ride: { 3: 'A city. Twelve companies. One contractor.', 4: 'A country. Eight agencies. One contractor.', 5: 'A planet. Three and a half billion jobs. One contractor.' } as Record<number, string>,
    planet: 'The planet works. The people lie in the baths — in shifts.',
    limit: 'No limit reset is scheduled.',
  },
);

/** the headlines of the days the Luddites reach the factories, in turn */
export const RIOT_NEWS = L(
  [
    'Восстание луддитов: толпа разбила роботов на заводе. Завод выпустил новых до конца смены',
    'Луддиты снова у проходной. В руках ломы, на плакатах — «Верните понедельник»',
    'Толпа разгромила конвейер. Участники признались, что давно не чувствовали себя такими занятыми',
  ],
  [
    'Luddite uprising: a mob smashed the robots at the plant. The plant turned out new ones before the shift ended',
    'Luddites at the gates again. Crowbars in hand, “Bring Back Monday” on the placards',
    'A mob wrecked the conveyor. Participants admitted they had not felt this busy in a long time',
  ],
);

/** the last line of the game: every screen is done, there is no work left for anybody else */
export const FINALE = L('работать больше некому и незачем: всё делает Клод', 'nobody is left to work: Claude does it all');

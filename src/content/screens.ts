/** Words of the big screens: the city (3), the state (4), the planet (5). */
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
  news: string;
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
    news: 'В городе закрыты все вакансии разработчика. Кадровики подозревают одного и того же человека',
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
    news: 'Госзакупки: тендер на «разработку всего» снова выиграл единственный участник',
  },
  5: {
    home: 'твоя страна',
    employers: 'ОПЕРАЦИИ',
    farms: 'ANTHROPIC · больше сессий',
    needEmployers: 'нужны ещё международные операции',
    needFarms: 'нужна ещё доля мощностей',
    done: 'планета твоя: все операции планирует Клод',
    doneTitle: 'Планета твоя',
    doneSub: 'все операции планирует Клод',
    place: 'планета',
    unit: 'операций',
    news: 'Аналитики: вся выручка одной ИИ-лаборатории приходится на одного клиента. Клиент согласен',
  },
};

/** the shelf of the next step up in scale, by how many are already bought */
export const SCALE_SHELF = ['МАСШТАБ · дальше — город', 'МАСШТАБ · дальше — государство', 'МАСШТАБ · дальше — планета'];

/** the last line of the game: every screen is done and the provider has no other customers left */
export const FINALE = 'ты — единственный клиент Anthropic и единственный программист планеты';

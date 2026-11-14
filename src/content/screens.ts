/** Words of the big screens: the city (3), the state (4), the planet (5), the street (6). */
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
    home: 'завод «Бостон Механикс»',
    employers: 'ПРОФЕССИИ',
    farms: 'ЧИПЫ · больше сессий',
    needEmployers: 'нужны ещё линии завода',
    needFarms: 'нужны чипы для роботов',
    done: 'улица твоя: за прилавком и за рулём — Клод',
    doneTitle: 'Улица твоя',
    doneSub: 'за прилавком и за рулём — Клод',
    place: 'улица',
    unit: 'мест',
    floor: ['профессия', 'профессии', 'профессий'],
  },
};

/** the shelf of the next step up in scale, by how many are already bought */
export const SCALE_SHELF = ['МАСШТАБ · дальше — город', 'МАСШТАБ · дальше — государство', 'МАСШТАБ · дальше — планета', 'МАСШТАБ · дальше — улица'];

/** the last line of the game: every screen is done, there is no work left for anybody else */
export const FINALE = 'работать больше некому и незачем: всё делает Клод';

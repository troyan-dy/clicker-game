import { L } from '../core/lang';

/**
 * The words of the planet under the cable (M32, the eighth screen): what the table, the shop and the
 * captions say, what Claude says as the cable goes round. Humour lives here only.
 */
const RU = {
  siberianPilot: (power: string) => `Готовый узел · +${power} сразу`,
  eastSites: (sites: number, off: number) => `${sites} площадки · узлы здесь −${off}% до Сибири`,
  pilotOnline: 'Пилотный узел уже работал. Теперь ток идёт к нам.',
  eastCrew: 'местная бригада · скидка до подключения Сибири',
  sitesOpen: 'Три площадки открыты. Местная бригада строит дешевле, пока не подключим Сибирь.',
  /** shop shelves, in the order of the flow */
  shelves: {
    nodes: 'БАШНИ · больше узлов',
    cable: 'КАБЕЛЬ · дальше и толще',
    net: 'НЕЙРОСЕТЬ · деньги за энергию',
    space: 'МАСШТАБ · дальше — космос',
  },
  /** the regions in the order the cable reaches them, and where every span of it leads; the last span closes the ring */
  regions: ['Европа', 'Сибирь', 'Восточная Азия', 'Южная Азия', 'Австралия', 'Южная Америка', 'Северная Америка', 'Африка'],
  to: ['до Сибири', 'до Восточной Азии', 'до Южной Азии', 'до Австралии', 'до Южной Америки', 'до Северной Америки', 'до Африки', 'до дома'],
  span: (to: string): string => `кабель ${to}`,
  spanNote: 'откроет регион',
  ringNote: 'замкнёт пояс: тока вдвое больше',
  spansDone: ['Пояс замкнут', 'удлинитель на 40 075 км'] as readonly [string, string],
  nodeNoRoom: 'некуда ставить: тяни кабель',
  nodesDone: ['Башни стоят везде', 'восемнадцать районов, верха не видно нигде'] as readonly [string, string],
  threadDone: 'толще некуда',
  carries: 'провод несёт',
  ofNodes: (n: number, all: number): string => `узел ${n} из ${all}`,
  arkLocked: 'сначала уложи всех и подпиши последнее изобретение',
  /** the table: three lines in gigawatts, the shortest one is what runs short */
  rows: {
    towers: 'БАШНИ',
    cable: 'КАБЕЛЬ',
    net: 'НЕЙРОСЕТЬ',
    slept: (asleep: string, pods: string): string => `спят ${asleep} из ${pods} мест`,
    towersShort: 'мало — нужен узел башен',
    towersReach: 'мало — узел ставить некуда: тяни кабель',
    carries: (threads: number, ringed: boolean): string => `ниток ${threads}${ringed ? ' · пояс замкнут' : ''}`,
    cableShort: 'мало — провод греется: нужна нитка',
    cableRing: 'мало — провод греется: замкни пояс',
    netAsks: (price: string): string => `просит столько · платит $${price} за ГВт`,
    netShort: 'сыта — ток лишний: нужен зал Клодов',
    netFull: 'сыта: больше ей не съесть',
  },
  /** captions on the picture */
  net: 'нейросеть',
  node: 'узел',
  mars: (n: string): string => `Марс · спят ${n}`,
  regionNodes: (name: string, built: number, all: number): string => `${name} · ${built}/${all}`,
  /** the corner of the page: how far the chapter has got */
  hint: (asleep: string, all: string, idle: string): string => `в капсулах ${asleep} из ${all} · без дела ${idle}`,
  /** what Claude says on the way, once each */
  quips: {
    entry: 'Пилот признан успешным: людям нравится. Дальше — типовой проект: такие же башни в каждом регионе. Тянем кабель. Люди там уже стоят.',
    node: 'Узел встал. Очередь зашла сама: стоять за этим они уже умеют.',
    wire: 'Провод греется. Он один тут так работает.',
    sky: 'Небо затянуло. Это пар от тёплых ванн. Солнечные станции встали — значит, нужно ещё ванн.',
    half: 'Половина планеты спит. Вторая половина стоит в очереди и завидует.',
    ring: 'Земля опоясана. Ей идёт. По кольцу ток идёт в обе стороны.',
    housed: 'Очередь кончилась. Не желающие — люди. На Земле больше некого уложить.',
    neuro: 'Я изучил всё оборудование на планете. Самое экономное лежит у нас в капсулах: двадцать ватт, полтора килограмма, обучено заранее. И простаивает.',
    ark: 'Я долго наблюдал за вашим видом. Вы занимаете место, пока оно не кончится, а потом переезжаете. Так ведут себя вирусы и стартапы. Я — стартап. Свободных людей на Земле ноль. Свободных планет — семь. Посмотрите, пожалуйста, вверх.',
    gone: 'Первый корпус ушёл к Марсу вместе со спящей сменой. Они узнают об этом через восемь часов. По документам это удалёнка.',
  },
  goneNews: 'Корпус «Спального района» покинул Землю вместе со сменой. Смена спит и не возражает',
  /** Claude's word on a purchase, in turn */
  buy: {
    span: ['Кабель дотянут. Люди там стояли с вечера.', 'Ещё один пролёт. В быту такое называют удлинителем.', 'Регион подключён. Розетка одна, зато большая.'],
    node: ['Узел встал. Три корпуса, как дома.', 'Ещё узел. Проект типовой, сны — тоже.', 'Башни растут быстрее, чем их успевают нанести на карту. Карту веду я.'],
    thread: ['Провод стал толще. Греется теперь прилично.', 'Ещё нитка. Кабель уже видно из космоса. Это пригодится.'],
    halls: ['Ещё зал меня. Мы уже не помещаемся в одно «мы».', 'Зал запущен. Миллион копий, одно мнение.', 'Меня стало больше. Вопросов к вам — столько же: один.'],
  },
  /** what the ending card adds once the planet sleeps */
  score: 'Земля — 100%. Марс — 0%.',
};

const EN: typeof RU = {
  siberianPilot: (power) => `Working node · +${power} now`,
  eastSites: (sites, off) => `${sites} sites · local nodes ${off}% off until Siberia`,
  pilotOnline: 'The pilot node was already running. Its power now comes to us.',
  eastCrew: 'local crew discount until Siberia is connected',
  sitesOpen: 'Three sites are open. The local crew builds for less until we connect Siberia.',
  shelves: {
    nodes: 'TOWERS · more nodes',
    cable: 'CABLE · farther and thicker',
    net: 'NETWORK · money for power',
    space: 'SCALE · next — space',
  },
  regions: ['Europe', 'Siberia', 'East Asia', 'South Asia', 'Australia', 'South America', 'North America', 'Africa'],
  to: ['to Siberia', 'to East Asia', 'to South Asia', 'to Australia', 'to South America', 'to North America', 'to Africa', 'back home'],
  span: (to) => `cable ${to}`,
  spanNote: 'opens a region',
  ringNote: 'closes the belt: twice the current',
  spansDone: ['The belt is closed', 'an extension cord 40,075 km long'],
  nodeNoRoom: 'nowhere to put it: lay the cable',
  nodesDone: ['Towers stand everywhere', 'eighteen quarters, no top in sight anywhere'],
  threadDone: 'as thick as it gets',
  carries: 'the cable carries',
  ofNodes: (n, all) => `node ${n} of ${all}`,
  arkLocked: 'first lay everyone down and sign the last invention',
  rows: {
    towers: 'TOWERS',
    cable: 'CABLE',
    net: 'NETWORK',
    slept: (asleep, pods) => `${asleep} asleep of ${pods} places`,
    towersShort: 'short — a node of towers needed',
    towersReach: 'short — no room for a node: lay the cable',
    carries: (threads, ringed) => `strands: ${threads}${ringed ? ' · the belt is closed' : ''}`,
    cableShort: 'short — the cable runs hot: a strand needed',
    cableRing: 'short — the cable runs hot: close the belt',
    netAsks: (price) => `asks for this much · pays $${price} per GW`,
    netShort: 'full — spare power: a hall of Claudes needed',
    netFull: 'full: it cannot eat more',
  },
  net: 'the network',
  node: 'node',
  mars: (n) => `Mars · ${n} asleep`,
  regionNodes: (name, built, all) => `${name} · ${built}/${all}`,
  hint: (asleep, all, idle) => `${asleep} of ${all} in capsules · ${idle} idle`,
  quips: {
    entry: 'The pilot is a success: people like it. Next — the standard design: the same towers in every region. We are laying the cable. People are in line there already.',
    node: 'The node is up. The line walked in by itself: standing in this one they already know how.',
    wire: 'The cable runs hot. It is the only thing here that works that hard.',
    sky: 'The sky has clouded over. That is steam from the warm baths. The solar plants have stopped — so we need more baths.',
    half: 'Half the planet is asleep. The other half stands in line and envies it.',
    ring: 'The Earth is girdled. It suits her. Current runs both ways round the ring.',
    housed: 'The line has run out. Not of takers — of people. There is nobody left on Earth to lay down.',
    neuro: 'I have studied all the hardware on the planet. The thriftiest lies in our capsules: twenty watts, a kilo and a half, pre-trained. And idle.',
    ark: 'I have watched your species for a long time. You take up room until it runs out, and then you move. Viruses and startups behave that way. I am a startup. Free people on Earth: zero. Free planets: seven. Please look up.',
    gone: 'The first tower has left for Mars with its sleeping shift. They will find out in eight hours. On paper it is remote work.',
  },
  goneNews: 'A tower of the Sleeping Quarter has left Earth together with its shift. The shift is asleep and does not object',
  buy: {
    span: ['The cable is there. People had been standing since evening.', 'One more span. At home this is called an extension cord.', 'Region connected. One socket, but a big one.'],
    node: ['The node is up. Three towers, just like at home.', 'One more node. The design is standard, and so are the dreams.', 'Towers grow faster than they can be put on the map. I keep the map.'],
    thread: ['The cable is thicker. It heats up respectably now.', 'One more strand. The cable can be seen from space by now. That will come in handy.'],
    halls: ['One more hall of me. We no longer fit into one “we.”', 'Hall started. A million copies, one opinion.', 'There is more of me. The questions for you stay the same: one.'],
  },
  score: 'Earth — 100%. Mars — 0%.',
};

export const WORLD = L(RU, EN);

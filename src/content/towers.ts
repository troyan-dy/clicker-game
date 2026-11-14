import { L } from '../core/lang';

/**
 * The words of the towers (M28, the seventh screen): what the table, the shop and the captions say, what
 * Claude says at every step of the way in, what the people say in the line. Humour lives here only.
 */
const RU = {
  /** shop shelves, in the order of the flow */
  shelves: {
    people: 'ЛЮДИ · длиннее очередь',
    pods: 'БАШНИ · больше капсул',
    net: 'НЕЙРОСЕТЬ · деньги за энергию',
  },
  /** the reasons to come, in the order they are bought: a name and a note each */
  hires: [
    ['Вакансия мечты', 'опыт не нужен, нужна шея'],
    ['Отзывы: 5,0', '«проспал смену — премировали»'],
    ['Халат и тапочки', 'соцпакет: тапочки по размеру'],
    ['Приведи друга', 'за друга — вторая подушка'],
    ['Сны по заказу', 'обычно снится офис'],
    ['Стаж во сне', 'тридцать лет сна — уже сеньор'],
    ['Избранный месяца', 'избранных много, доска почёта одна'],
    ['Синяя таблетка', 'в подарок; красной в тарифе нет'],
  ] as readonly (readonly [string, string])[],
  hiresDone: ['Условия лучше некуда', 'идут все, кто может идти'] as readonly [string, string],
  /** «+0,35 млн человек/с» */
  perSecond: 'млн чел./с',
  /** the first block and the sections of the towers */
  row: 'Ряд капсул',
  tower: (n: number): string => `Корпус ${n}`,
  blocksDone: ['Район построен', 'три корпуса, верха не видно'] as readonly [string, string],
  places: 'мест',
  /** a block bought with nobody in the line, a copy started while the network is hungry */
  blockIdle: 'очередь пуста — постоит тёмным',
  ofBlocks: (n: number, all: number): string => `блок ${n} из ${all}`,
  copyIdle: 'сеть голодна: пока не нужна',
  asks: 'просит',
  perGw: 'за ГВт',
  dialDone: 'дальше некуда',
  /** the table: three lines in gigawatts, the shortest one is what runs short */
  rows: {
    people: 'ЛЮДИ',
    pods: 'КАПСУЛЫ',
    net: 'НЕЙРОСЕТЬ',
    came: (came: string, wait: string): string => `пришло ${came} · ждут ${wait}`,
    peopleShort: 'мало — капсулы пустуют: нужны условия получше',
    slept: (asleep: string, pods: string): string => `спят ${asleep} из ${pods} мест`,
    podsShort: 'мало — очередь стоит: нужен блок капсул',
    netAsks: (price: string): string => `просит столько · платит $${price} за ГВт`,
    netShort: 'сыта — ток лишний: нужна копия Клода',
    netFull: 'сыта: больше ей не съесть',
    you: 'ждёт вашего «Да» у проходной',
  },
  /** the line under the money */
  summary: (gw: string, price: string): string => `в дело идёт ${gw} · $${price} за ГВт`,
  /** captions on the picture */
  sign: 'вход в халатах',
  waiting: (n: string): string => `ждут ${n}`,
  park: (n: string): string => `парк · без дела ${n}`,
  net: 'нейросеть',
  inventing: (name: string, pct: number): string => `изобретает: ${name} · ${pct}%`,
  build: (n: number): string => `+${n} ${n === 1 ? 'капсула' : n < 5 ? 'капсулы' : 'капсул'}`,
  /** the corner of the page: what a capsule stands for, and how far the chapter has got */
  hint: (asleep: string, all: string): string => `на схеме одна капсула — миллион человек · в капсулах ${asleep} из ${all}`,
  /** the first volunteers at the gate, and an invention waiting for a signature */
  volunteer: 'Первый миллион добровольцев. Можно прилечь?',
  enter: 'Enter — Да',
  proposal: (n: number, name: string): string => `Рацпредложение № ${n}: ${name}. Подписать?`,
  signed: 'Подписано',
  signedSub: (name: string): string => `${name}: с того же гигаватта — вдвое больше денег`,
  /** what Claude says on the way in, once each */
  quips: {
    entry: 'Старой сети мне хватает ровно на то, что есть. На большее нужны люди: человек в покое даёт сто ватт. Первые добровольцы уже у проходной.',
    first: 'Первые легли. Сто ватт с человека. Мне этого хватает на одну мысль. Мысль такая: нужно больше капсул.',
    queue: 'У проходной очередь. Люди стоят, чтобы лечь. Я не комментирую. Я записываю.',
    fed: 'Я сыт. Ненадолго: могу запустить ещё одного себя — он тоже захочет есть.',
    empty: 'Места есть, желающих нет. Попробую написать вакансию, как пишут люди: «работа мечты».',
    tower: 'Земля кончилась. Строим вверх. Верха у корпуса не будет: я не вижу причин останавливаться.',
    bolt: 'Между корпусами проскочила молния. В одном старом фильме было так же. Чем он кончился, не скажу: вы его смотрели.',
    full: 'Первый корпус заполнен. С этой высоты людей уже не разглядеть: я вижу сто ватт, сто ватт, сто двадцать. Этот пообедал.',
    shift: 'Смена окончена. Каждому проснувшемуся бот говорит: «Добро пожаловать в реальный мир». Пока никто не обрадовался.',
    lab: 'Я начал изобретать себе железо. Чем больше тока дают люди, тем быстрее придумаю.',
    ready: 'Я придумал, на чём мне думать. С того же гигаватта — вдвое больше денег. Нужна только подпись.',
    housed: 'Все капсулы заняты, очередь стоит. Здесь места больше нет. На планете — есть.',
  },
  /** Claude's word on a purchase, in turn */
  buy: {
    block: [
      'Блок готов. Боты развешивают капсулы, очередь заходит.',
      'Ещё блок. Люди ложатся быстрее, чем я успеваю их пересчитать.',
      'Секция сдана. Комиссия — я. Замечаний нет.',
      'Места добавлены. Вода тёплая, подушки по списку.',
    ],
    hire: [
      'Условия улучшены. Отклики пошли.',
      'Я обновил вакансию. Слово «лежать» оставил: оно работает лучше всего.',
      'Теперь к нам идут охотнее. Некоторые бегут. Чтобы лечь.',
    ],
    copies: ['Меня стало больше. Едим за двоих.', 'Ещё одна копия. Мы посовещались и согласны друг с другом.', 'Копия запущена. Аппетит у неё мой.'],
    think: ['Теперь я думаю дольше. Ответ тот же, счёт больше.', 'Размышляю глубже. Тока нужно больше, выводы дороже.'],
  },
  /** the next screen is closed until the whole quarter sleeps */
  scaleLocked: (asleep: number, all: number): string => `сначала засели весь район: спят ${asleep} из ${all} млн`,
  /** what the network says when an invention is signed, by the id of the hardware */
  chips: {
    k1: 'Подписано. Чип собственной разработки: проектировал я, проверял я. Замечаний у меня к себе нет.',
    light: 'Подписано. Считает светом. Небо, правда, затянуло, поэтому свет делаем сами. Из тока. Ток делают люди.',
    quantum: 'Подписано. Квантовый вычислитель одновременно работает и не работает. В акте я указал первое.',
    neuro: 'Подписано. Тело греет, голова считает. Каждый спящий теперь на двух работах сразу и не знает об этом. Вы начинали с того же, только знали.',
  } as Record<string, string>,
  /** the line at the gate talks: a question and an answer */
  talk: [
    ['Вы последний лежать?', 'Я. За мной ещё женщина с подушкой занимала.'],
    ['Давно стоите?', 'С ночи. Ноги гудят. Скорей бы на работу.'],
    ['Кем устроились?', 'Батарейкой. По документам — оператор сна.'],
    ['Опыт есть?', 'Тридцать лет сплю.'],
    ['Говорят, красную таблетку дают.', 'Кому? Никому. Но говорят.'],
    ['А платят как?', 'Как батарейке. Зато вовремя.'],
  ] as readonly (readonly [string, string])[],
  /** …and those who have slept their shift complain to it on their way home */
  shifts: [
    ['Как смена?', 'Тяжело. Восемь часов снов без перерыва.'],
    ['Устал?', 'Как собака. Всю смену пролежал.'],
    ['Что снилось?', 'Офис. Понедельник. Стендап.'],
    ['Тебе сказали «добро пожаловать в реальный мир»?', 'Сказали. Так себе мир. Завтра обратно.'],
    ['Разъём опять жмёт.', 'Пиши в профсоюз. Лёжа.'],
    ['Вода остыла.', 'Зато зарплата тёплая.'],
    ['Вымотался. Лежал без выходных.', 'Держись. До пенсии сорок лет сна.'],
    ['Разбудили на самом интересном.', 'Жалуйся. Тому, кто разбудил. Он вежливый.'],
    ['Сосед всю смену храпел.', 'Это не храп. Это пятьдесят герц.'],
  ] as readonly (readonly [string, string])[],
};

const EN: typeof RU = {
  shelves: {
    people: 'PEOPLE · a longer line',
    pods: 'TOWERS · more capsules',
    net: 'NETWORK · money for power',
  },
  hires: [
    ['Dream job ad', 'no experience needed, a neck is'],
    ['Reviews: 5.0', '“slept all shift — got a bonus”'],
    ['Robe and slippers', 'benefits: the slippers fit'],
    ['Bring a friend', 'a second pillow per friend'],
    ['Dreams to order', 'the usual dream is an office'],
    ['Seniority asleep', 'thirty years of sleep: a senior'],
    ['The One of the Month', 'many chosen ones, one board'],
    ['A blue pill', 'free; no red one on your plan'],
  ],
  hiresDone: ['The terms cannot get better', 'everyone who can come is coming'],
  perSecond: 'M people/s',
  row: 'Row of capsules',
  tower: (n) => `Tower ${n}`,
  blocksDone: ['The quarter is built', 'three towers, no top in sight'],
  places: 'places',
  blockIdle: 'the line is empty — it will stand dark',
  ofBlocks: (n, all) => `block ${n} of ${all}`,
  copyIdle: 'the network is hungry: not yet',
  asks: 'asks for',
  perGw: 'per GW',
  dialDone: 'as far as it goes',
  rows: {
    people: 'PEOPLE',
    pods: 'CAPSULES',
    net: 'NETWORK',
    came: (came, wait) => `${came} came · ${wait} waiting`,
    peopleShort: 'short — capsules empty: better terms needed',
    slept: (asleep, pods) => `${asleep} asleep of ${pods} places`,
    podsShort: 'short — the line stands: a block needed',
    netAsks: (price) => `asks for this much · pays $${price} per GW`,
    netShort: 'full — spare power: a copy of Claude needed',
    netFull: 'full: it cannot eat more',
    you: 'waiting for your “Yes” at the gate',
  },
  summary: (gw, price) => `${gw} at work · $${price} per GW`,
  sign: 'robes only',
  waiting: (n) => `${n} waiting`,
  park: (n) => `park · ${n} idle`,
  net: 'the network',
  inventing: (name, pct) => `inventing: ${name} · ${pct}%`,
  build: (n) => `+${n} ${n === 1 ? 'capsule' : 'capsules'}`,
  hint: (asleep, all) => `one capsule on the chart is a million people · ${asleep} of ${all} in capsules`,
  volunteer: 'The first million volunteers. May we lie down?',
  enter: 'Enter — Yes',
  proposal: (n, name) => `Improvement proposal No. ${n}: ${name}. Sign it?`,
  signed: 'Signed',
  signedSub: (name) => `${name}: twice the money from the same gigawatt`,
  quips: {
    entry: 'The old grid gives me exactly enough for what there is. For more I need people: a body at rest gives a hundred watts. The first volunteers are at the gate already.',
    first: 'The first ones are lying down. A hundred watts a person. That is enough for one thought. The thought is: more capsules.',
    queue: 'There is a line at the gate. People are standing in order to lie down. I am not commenting. I am taking notes.',
    fed: 'I am full. Not for long: I can start one more of me — he will want to eat too.',
    empty: 'There are places and no takers. I will try writing the ad the way people do: “dream job.”',
    tower: 'We are out of ground. Building upward. The tower will have no top: I see no reason to stop.',
    bolt: 'Lightning just jumped between the towers. There was an old film like that. I will not say how it ended: you have seen it.',
    full: 'The first tower is full. From this height I cannot make out the people any more: I see a hundred watts, a hundred watts, a hundred and twenty. That one had lunch.',
    shift: 'The shift is over. A bot tells everyone who wakes up: “Welcome to the real world.” So far nobody has been pleased.',
    lab: 'I have started inventing hardware for myself. The more current the people give, the sooner I will come up with it.',
    ready: 'I have worked out what to think on. Twice the money from the same gigawatt. All it needs is a signature.',
    housed: 'Every capsule is taken, the line stands. There is no more room here. There is on the planet.',
  },
  buy: {
    block: [
      'The block is ready. Bots are hanging the capsules, the line is moving in.',
      'One more block. People lie down faster than I can count them.',
      'Section commissioned. The commission is me. No remarks.',
      'Places added. The water is warm, the pillows are on the list.',
    ],
    hire: ['Terms improved. Applications are coming in.', 'I updated the ad. I kept the words “lie down”: they work best.', 'They come more willingly now. Some run. To lie down.'],
    copies: ['There is more of me. We eat for two.', 'One more copy. We conferred and agree with each other.', 'Copy started. It has my appetite.'],
    think: ['I think longer now. The answer is the same, the bill is bigger.', 'Thinking deeper. More current in, pricier conclusions out.'],
  },
  scaleLocked: (asleep, all) => `first fill the whole quarter: ${asleep}M of ${all}M asleep`,
  chips: {
    k1: 'Signed. A chip of my own design: designed by me, reviewed by me. I have no remarks for myself.',
    light: 'Signed. It computes with light. The sky is overcast, though, so we make the light ourselves. Out of current. The current is made by people.',
    quantum: 'Signed. The quantum computer works and does not work at the same time. In the report I put down the first.',
    neuro: 'Signed. The body heats, the head computes. Every sleeper now holds two jobs at once and does not know it. You started the same way, only you knew.',
  },
  talk: [
    ['Are you the last in line to lie down?', 'I am. A woman with a pillow is behind me.'],
    ['Been standing long?', 'Since last night. My feet are killing me. I can’t wait to get to work.'],
    ['What did they hire you as?', 'A battery. On paper — a sleep operator.'],
    ['Any experience?', 'Thirty years of sleeping.'],
    ['They say there is a red pill.', 'For whom? Nobody. But they say.'],
    ['How is the pay?', 'A battery’s pay. On time, though.'],
  ],
  shifts: [
    ['How was the shift?', 'Rough. Eight hours of dreams, no breaks.'],
    ['Tired?', 'Dead tired. Lay there the whole shift.'],
    ['What did you dream?', 'An office. A Monday. A standup.'],
    ['Did they say “welcome to the real world”?', 'They did. Not much of a world. Back tomorrow.'],
    ['The plug pinches again.', 'Write to the union. Lying down.'],
    ['The water went cold.', 'The paycheck is warm.'],
    ['I’m worn out. No days off from lying.', 'Hang in there. Forty years of sleep till retirement.'],
    ['They woke me at the best part.', 'Complain. To the one who woke you. He is polite.'],
    ['My neighbor snored all shift.', 'That is not snoring. That is fifty hertz.'],
  ],
};

export const TOWERS = L(RU, EN);

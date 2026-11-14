# Assets — Да, Клод

<!-- Phase 5 (references/assets.md). -->

## Inventory
<!-- one line per asset card (references/assets.md): name · category · style · budget · source · status -->
| asset | category | style | budget | source | status |
|---|---|---|---|---|---|
| A001 CH_Coder | персонаж | маленький программист за центральным столом, тонкая линия, изометрия | часть центрального узла | генерация (Codex) | plan |
| A002 CH_Claude | персонаж | Клод: коралловый квадрат с двумя точками-глазами на экране ноутбука и в терминале; свой знак, не логотип | код | код (CSS и Graphics) | plan |
| A003 ND_Center | узел-герой | центральный узел: изометрический стол, ноутбук, программист | public/assets/img/nodes/desk.webp | генерация (Codex), фон-бумага вырезается локально | wip |
| A004 UI_Terminal | UI-герой | окно терминала этапа 1: лог задачи, запрос с вариантами, деления согласий, клавиша Enter | HTML/CSS | код | wip |
| A005 EN_Paper | окружение | бумага чертежа с точечной сеткой | код | код (src/ui/blueprint) | wip |
| A006 VFX_Squares | VFX | коралловые квадраты: бегут по связям, на «Да» летят в счётчик и зеленеют | пул ≤ 2000 | код | wip |
| A007 VFX_ZoomOut | VFX | отъезд: терминал сжимается в экран ноутбука, проявляется чертёж | код | код (CSS matrix + tween) | wip |
| A008 UI_Money | UI | деньги и доход в секунду: сериф на бумаге, моно в терминале, зелёные | HTML/CSS | код | plan |
| A009 UI_Shop | UI | правая панель магазина: карточки с тонкой рамкой | HTML/CSS | код | plan |
| A010 UI_PromptCard | UI | тёмная терминальная карточка запроса Клода на чертеже | HTML/CSS | код | plan |
| A011 UI_NodeTags | UI | подписи узлов: имя и доход в секунду, моноширинные | HTML/CSS | код | plan |
| A012 UI_News | UI | строка новостей внизу | HTML/CSS | код | plan |
| A013 UI_CompanyCard | UI, сатира | пародия на лендинги стартапов — отложено: конфетная палитра спорит с новым стилем | — | — | cut |
| A014 ND_Sources | узлы | 10 источников задач как изометрические значки одной линией; готовы: офис, доска фриланса, лоток задач, ноутбук сабагента, стойка, рукопожатие, студия, башня, три стойки, датацентр, коробка ноутбуков, банк, гараж, торговый центр, завод, администрация, склад, парламент, штаб, космодром, палета видеокарт, городской квартал, остров-страна, тарелка, штаб-квартира, спутник, глобус | public/assets/img/nodes/*.webp, листы art/gen/nodes_sheet_a.png, _b, _c1, _c2, _d, _e, _f и globe.png; здания вырезаны заливкой от края | генерация (Codex), нарезка кодом | wip |
| A015 EN_Scales | окружение | масштабы после стола: сеть работ, город, планета, орбита — как чертежи | PNG 1920×1080, 4 сцены | генерация (Codex) | plan |
| A016 FNT | шрифты | JetBrains Mono 400/700, Source Serif 4 400/600, кириллица | woff2 ≤ 300 КБ | Fontsource (OFL) | wip |
| A017 SFX | звук | нажатие, закрытие задачи, покупка, отъезд камеры, легендарный тикет | параметры в коде | ZzFX | plan |
| A018 MUS | музыка | спокойный зацикленный лоу-фай «In the Lobby» (1,4 МБ); запасной кандидат — «Calm Track», pmiller, CC0, https://opengameart.org/content/calm-track | ≤ 3 МБ | CC0, OpenGameArt | wip |

## Strategy by category
| category | source (pack / Blender / procedural / generation / user) | why | status |
|---|---|---|---|
| персонажи, предметы, окружение | generation: Codex image_gen по арт-библии (решение пользователя) | рисунок выразительнее, чем SVG руками; стиль держит общий ключевой кадр-референс | agreed |
| VFX | procedural: Graphics и пул частиц в движке | взрыв пикселей — доминанта стиля, нужен полный контроль | agreed |
| UI | procedural: HTML/CSS; иконки — уменьшенные ассеты сцены | чёткий текст и дешёвая вёрстка; информативность выше стиля | agreed |
| шрифты | pack: Fontsource (Rubik, JetBrains Mono), OFL | кириллица, бесплатно, ставятся через npm | agreed |
| SFX | procedural: ZzFX | десятки срабатываний в секунду — высоту и громкость меняем на лету | agreed |
| музыка | pack: CC0/CC-BY, подбираю и показываю на выбор (решение пользователя) | бесплатно, автор в титрах | agreed |

## Conventions
- единицы — пиксели сцены 1920×1080; спрайты генерируются не меньше 2× от экранного размера
- якорь: низ-центр у персонажей и предметов, левый верх у слоёв фона
- имена файлов — ASCII в нижнем регистре: `scene_blueprint.png`, `nd_center.png`, `nd_sources_a.png`
- генерация: промпты в `art/prompts/<имя>.txt`; результат `art/gen/<имя>.png` → webp в `public/assets/img/`; эскизы экранов — `art/concepts/*.html`, снимок — `node tools/shot.mjs`
- ограничение Codex: запрос генерации обрывается на ~104 с, поэтому просим только простые сцены без интерфейса, текста, прозрачного фона и картинок-референсов; фон — ровная бумага, вырезаем локально (`--alpha lum`); интерфейс и надписи накладываем кодом; запускаем строго по одной
- генератор: `python <ref2game>/scripts/gen.py one <имя> art/prompts/<имя>.txt --provider codex` (Codex CLI, встроенный image_gen); текст и буквы в картинках не генерируем — их рисует игра
- цвета только из палитры ART_BIBLE; линия тушью `#262624`, 1,5–2 px, одной толщины
- коралловый — только Клод и его квадраты; зелёный — только деньги
- звук: параметры ZzFX в `src/data/`, единая точка `playSound(name)`
- шрифты: woff2 из Fontsource (JetBrains Mono, Source Serif 4), подмножества latin и cyrillic
- каждый новый ассет сначала ставится в сцену look-dev (`?gym=lookdev`) и снимается

## Requests to the user
- музыка: выбрать трек из 2–3 подобранных (к вертикальному срезу)

## License registry
| asset / pack | source (URL) | license | author | path | attribution |
|---|---|---|---|---|---|
| Phaser 4.2.1 | https://github.com/phaserjs/phaser | MIT | Phaser Studio Inc. | node_modules/phaser | в титрах |
| картинки персонажей, предметов и фонов | generated (Codex image_gen, аккаунт пользователя) | generated:true | — | art/gen/, public/assets/img/ | не требуется |
| JetBrains Mono | https://www.npmjs.com/package/@fontsource/jetbrains-mono | OFL-1.1 | JetBrains | node_modules/@fontsource/jetbrains-mono | в титрах |
| Source Serif 4 | https://www.npmjs.com/package/@fontsource/source-serif-4 | OFL-1.1 | Adobe | node_modules/@fontsource/source-serif-4 | в титрах |
| ZzFX | https://github.com/KilledByAPixel/ZzFX | MIT | Frank Force | node_modules/zzfx | в титрах |
| музыка «In the Lobby» | https://opengameart.org/content/in-the-lobby | CC0 | Umplix | public/assets/audio/in_the_lobby.ogg | в титрах (не обязательно) |
| lil-gui (только dev-панель настроек) | https://github.com/georgealways/lil-gui | MIT | George Michael Brower | node_modules/lil-gui | не входит в сборку игры |

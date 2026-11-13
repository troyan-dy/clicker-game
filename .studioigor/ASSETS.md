# Assets — Да, Клод

<!-- Phase 5 (references/assets.md). -->

## Inventory
<!-- one line per asset card (references/assets.md): name · category · style · budget · source · status -->
| asset | category | style | budget | source | status |
|---|---|---|---|---|---|
| A001 CH_Coder | персонаж | вайб-кодер за столом: пухлый, голова 1:2, сиреневое худи, контур 4 px | PNG ≤ 400 КБ, 1024 px | генерация (Codex) | plan |
| A002 CH_Claude | персонаж | Клод: оранжевый скруглённый квадрат с глазами-пикселями на экране ноутбука; свой персонаж, не логотип | Graphics | код (моргает и говорит) | plan |
| A003 PR_Laptop | предмет-герой | кремовый стол и пухлый ноутбук экраном к зрителю | PNG ≤ 400 КБ, 1024 px | генерация (Codex) | plan |
| A004 PR_KeyYes | предмет-герой | оранжевая клавиша «ДА», проседает при нажатии | Graphics | код | wip |
| A005 EN_Room | окружение | масштаб «комната»: небесная стена, окно, полка, растение, пол | PNG 1920×1080 ≤ 1 МБ | генерация (Codex) | plan |
| A006 VFX_PixelBurst | VFX | 20–40 тёплых квадратов, дуги в счётчик, зеленеют | пул ≤ 5000 | код | wip |
| A007 VFX_Rays | VFX | веер солнечных лучей за ноутбуком, крупное «+$» | Graphics | код | plan |
| A008 UI_Money | UI | деньги и доход в секунду, Rubik 900, зелёный | HTML/CSS | код | plan |
| A009 UI_Shop | UI | панель магазина с кремовыми ценниками-ярлыками | HTML/CSS + SVG-иконки | код | plan |
| A010 UI_Ticket | UI | карточка задачи: имя тикета и 5 делений согласий | HTML/CSS | код | plan |
| A011 UI_Terminal | UI | реплика Клода в окне терминала, JetBrains Mono | HTML/CSS | код | plan |
| A012 UI_News | UI | бегущая лента новостей внизу | HTML/CSS | код | plan |
| A013 UI_CompanyCard | UI, сатира | карточка компании как лендинг стартапа: плоско, без контура | PNG ≤ 200 КБ | генерация (Codex) | plan |
| A014 PR_Sources | предметы | 10 источников задач как объекты сцены, по одному на ярус | PNG, 10 шт | генерация (Codex) | plan |
| A015 EN_Scales | окружение | масштабы 2–6: квартира, офис, город, планета, орбита | PNG 1920×1080, 5 сцен | генерация (Codex) | plan |
| A016 FNT | шрифты | Rubik 700/900, JetBrains Mono 500/700, кириллица | woff2 ≤ 300 КБ | Fontsource (OFL) | plan |
| A017 SFX | звук | нажатие, закрытие задачи, покупка, взрыв, легендарный тикет, новый ярус | параметры в коде | ZzFX | plan |
| A018 MUS | музыка | 1–2 лёгких зацикленных трека | ≤ 3 МБ | CC0/CC-BY, подбираю и показываю на выбор | plan |

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
- имена файлов — ASCII в нижнем регистре: `ch_coder.png`, `pr_laptop.png`, `bg_room.png`, `ui_card_company.png`
- генерация: промпты в `art/prompts/<имя>.txt`, общий стиль в `art/style_bible.txt`, ключевой кадр-референс `art/gen/key_lookdev.png`; результат `art/gen/<имя>.png` → копия в `public/assets/img/`
- генератор: `python <ref2game>/scripts/gen.py one <имя> art/prompts/<имя>.txt --provider codex` (Codex CLI, встроенный image_gen); текст и буквы в картинках не генерируем — их рисует игра
- цвета только из палитры ART_BIBLE (`src/data/palette.ts`); контур `#2A2140`, 4 px снаружи и 3 px внутри, скруглённые стыки
- оранжевый — только Клод, клавиша «ДА» и его пиксели; зелёный — только деньги
- звук: параметры ZzFX в `src/data/`, единая точка `playSound(name)`
- шрифты: woff2 из Fontsource, подмножества latin и cyrillic
- каждый новый ассет сначала ставится в сцену look-dev (`?gym=lookdev`) и снимается

## Requests to the user
- музыка: выбрать трек из 2–3 подобранных (к вертикальному срезу)

## License registry
| asset / pack | source (URL) | license | author | path | attribution |
|---|---|---|---|---|---|
| Phaser 4.2.1 | https://github.com/phaserjs/phaser | MIT | Phaser Studio Inc. | node_modules/phaser | в титрах |
| картинки персонажей, предметов и фонов | generated (Codex image_gen, аккаунт пользователя) | generated:true | — | art/gen/, public/assets/img/ | не требуется |

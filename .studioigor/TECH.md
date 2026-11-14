# Technology — Yes-Driven Development

<!-- Phase 3 (references/stack.md). ENGINE — one of: godot, godot-mono, unity,
unreal, web, defold, bevy (read by studio.py and envcheck.py). DIMENSION — 2D or 3D
(2.5D with 3D models is 3D); envcheck.py recommends Blender for 3D. -->
ENGINE: web
ENGINE VERSION: Phaser 4.2.1
DIMENSION: 2D
LANGUAGE: TypeScript
PLATFORMS: web — GitHub Pages (ссылка на игру, браузер на ПК)

## Decision
- context: 2D бесконечный кликер в браузере на ПК; гладкий вектор, тысячи пикселей-частиц, камера с отъездом по 6 масштабам, магазин и цифры обычным текстом
- options: Phaser 4 — камера, частицы, твины, звук из коробки / новая мажорная версия, сборка тяжелее; PixiJS 8 — самый быстрый рендер / сцены, твины и звук собирать самим; HTML + SVG + canvas без движка — вектор всегда резкий, крошечная сборка / потолок по частицам, всё писать самим; Godot 4.7 web — путь на ПК / тяжёлая веб-сборка, нет HTML-интерфейса
- choice and why: Phaser 4.2.1 + TypeScript + Vite — быстрее всего до «сочной» игры: всё для взрыва на «Да» и отъезда камеры уже есть; интерфейс — HTML-слой поверх канваса (выбор пользователя)
- consequences: графика — SVG и процедурная отрисовка, растеризуется под каждый из 6 масштабов; текст и магазин — DOM; сборка `npm run build` в `dist/`; API Phaser 4 сверять с `node_modules/phaser/types`, а не с памятью о Phaser 3

## Budgets
- 60 fps на среднем ноутбуке; в худший момент (≥ 5000 частиц в кадре) fps_min ≥ 50
- draw calls ≤ 100; память вкладки ≤ 300 МБ
- сборка ≤ 5 МБ начальной загрузки, старт до первого нажатия ≤ 3 с
- сохранение ≤ 100 КБ в localStorage

- замер 2026-11-14 (автопилот): пятый экран со всеми покупками — в окне браузера на видеокарте 277 кадров/с в среднем, 239 в худший момент; память 19 МБ и не растёт за три минуты; сборка 4,5 МБ (скрипт 1,5 МБ, музыка 1,4 МБ); код игры ~0,2 мс на кадр. Съёмка без видеокарты (tools/capture.mjs без --headed) показывает 36–60 кадров/с — это предел самой съёмки

## Project structure
- `index.html`, `src/main.ts` — вход: читает `?seed=&gym=&state=&debug=`, запускает Phaser
- `src/core/` — RNG с сидом, шина событий, сохранение, аргументы запуска
- `src/systems/` — механики без рендера: папка на механику из DESIGN.md
- `src/view/` — сцены Phaser и «сок»: читают состояние, ничего не решают
- `src/ui/` — HTML-слой: деньги, магазин, новости; шлёт намерения
- `src/data/` — все числа (JSON); `src/content/` — тикеты, реплики, новости
- `src/gyms/` — тестовые сцены механик; `src/debug/` — панель тюнинга, только в dev
- `tests/` — Vitest, только формулы и сохранения; `tools/capture.mjs` — снимки кадров

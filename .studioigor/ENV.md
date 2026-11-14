# Environment — Да, Клод

<!-- Phase 4 (references/environment.md). Commands verified by a real run.
VERIFIED is switched only by `studio.py verify`. CAPTURE writes images to
.studioigor/captures/. -->
VERIFIED: yes

## Installed
| tool | version | why |
|---|---|---|
| Node + npm | 24.22.1 / 11.19.1 | сборка и запуск |
| Phaser | 4.2.1 | движок (2D, WebGL) |
| Vite | 8.3.8 | dev-сервер и сборка в `dist/` |
| TypeScript | 6.0.3 | язык; 7.x пока не поддержан typescript-eslint (нужен < 6.1) |
| Vitest | 5.1.0 | тесты формул и сохранений |
| Playwright + Chromium | 1.65.0 | снимки кадров без человека (`tools/capture.mjs`) |
| ESLint + typescript-eslint | 10.14.0 / 8.72.2 | линтер |
| Prettier | 3.10.1 | форматирование |
| ZzFX | 1.4.0 | звуки кодом, единая точка `playSound` |
| lil-gui | dev | панель настроек в гимах (Tab) |
| шрифты Fontsource | 5.3.x | JetBrains Mono, Source Serif 4 (кириллица) |
| git + git-lfs | 2.56.0 / 3.8.1 | версии; LFS для картинок, звука, шрифтов |
| Python | 3.12.16 | скрипты студии |
| ffmpeg | 9.0.2 (winget Gyan.FFmpeg) | звук, нарезка клипов |
| ImageMagick | 7.1.2-34 (winget) | палитры, контактные листы |
| yt-dlp | 2026.10.26 (winget) | кадры из видео-референсов |

## Agent integrations
- документация Phaser 4 для агента лежит в пакете: `node_modules/phaser/skills/<тема>/SKILL.md` и `node_modules/phaser/docs/` — читать перед кодом новой подсистемы (проверено: game-setup, input, graphics)
- кадры игры: `tools/capture.mjs` (Playwright, расписание ввода, ошибки консоли → exit 1, `window.__metrics` → metrics.json) — проверено на сцене hello
- браузер для агента: расширение Claude in Chrome уже подключено в сессии; Playwright MCP не ставился — команда `claude` недоступна в PATH этой среды (VS Code)
- редактора у веб-стека нет: весь проект — код в репозитории
- гимы: `http://localhost:5173/?gym=<имя>` (agree — M01, hello — проверка окружения); `&debug=1` включает оверлей; клавиша P пишет настройки в `.studioigor/captures/tuning/` через dev-сервер
- эскизы интерфейса: `node tools/shot.mjs <файл.html> <out.png>`
- быстрый старт гима с большого экрана: `http://localhost:5173/?gym=agree&state=city|gov|planet|street|finale` (finale — сразу карточка итогов и эпилог) — всё прежнее куплено, деньги на первые покупки; клавиша M — полминуты дохода

## Commands
RUN: npm run dev -- --open
TEST: npx tsc --noEmit && npx vitest run
BUILD: npm run build
CAPTURE: npm run build && node tools/capture.mjs --dir dist --url "/?gym=hello" --out .studioigor/captures/hello --duration 5 --every 1 --inputs tools/inputs/hello.json --wait-for "window.__GAME__?.ready" --seed 7
EDITOR: none — the code is in the repository

## Pitfalls
- Windows: скрипты студии запускать с `PYTHONIOENCODING=utf-8 PYTHONUTF8=1`; `refs.py` — ещё и с `PYTHONPATH=.studioigor/tools/pyshim` (заглушка fcntl)
- Windows: `board.py serve` запускать без `--open` (флаг вызывает macOS-команду), ссылку открывать через `Start-Process`
- envcheck.py требует brew — на Windows его нет; его роль выполняют winget и npm
- ffmpeg, magick, yt-dlp поставлены через winget: PATH обновится в новом терминале
- fps в headless-съёмке занижен (программный WebGL: 34–47 на пустой сцене) — производительность мерить в настоящем окне
- TypeScript `erasableSyntaxOnly`: нельзя enum и параметры-свойства в конструкторе
- API сверять с `node_modules/phaser/types/phaser.d.ts`: модель помнит Phaser 3 (`setTintFill`, `preFX/postFX`, `Geom.Point`, `Math.PI2` в 4-й версии убраны)

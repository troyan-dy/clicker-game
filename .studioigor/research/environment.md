# Environment — research (2026-11-13)

Стек: Phaser 4 + TypeScript + Vite, браузер на ПК. Машина: Windows 11, Node 24.22.1, npm 11.19.1.

## Findings
- Версии из `npm view <пакет> version` (2026-11-13): phaser 4.2.1, vite 8.3.8, typescript 7.0.2
  (и 6.0.3 в ветке 6), vitest 5.1.0, playwright 1.65.0, eslint 10.14.0, @eslint/js 10.0.1,
  typescript-eslint 8.72.2, prettier 3.10.1, @playwright/mcp 0.0.85.
- typescript-eslint 8.72.2 объявляет peer `typescript >=4.8.4 <6.1.0` — с TypeScript 7 не ставится.
  Шаблон `npm create vite` уже кладёт `typescript ~7.0.2`, поэтому версию закрепили вручную на ~6.0.3.
- Пакет phaser 4.2.1 содержит документацию для агентов: 28 тем в `node_modules/phaser/skills/`
  (v3-to-v4-migration, particles, tweens, cameras, filters-and-postfx, …) и гайды в
  `node_modules/phaser/docs/`. Это первичный источник по API 4-й версии, надёжнее памяти модели.
- Что изменилось в Phaser 4 против 3 (из v3-to-v4-migration): новый WebGL-рендерер; FX и маски
  стали фильтрами (`filters.internal/external`, Bloom — через `Phaser.Actions.AddEffectBloom()`);
  `setTintFill` → `setTint().setTintMode(Phaser.TintModes.FILL)`; `Geom.Point` → `Vector2`;
  `Math.PI2` убран, `Math.TAU` теперь 2π; `roundPixels` по умолчанию false; `DynamicTexture`
  требует `render()`; `Create.GenerateTexture` убран; у `Rectangle` появились скруглённые углы.
  Базовый API (Game, Scene, Graphics, Tweens, ввод с клавиатуры) прежний.
- ESLint 10: `ts.config(...)` помечен устаревшим, конфиг собирается через `defineConfig` из
  `eslint/config`.
- Сборка hello-проекта: 1,37 МБ JS (359 КБ gzip) — укладывается в бюджет 5 МБ.
- Редакторного MCP у веб-стека нет. Playwright MCP ставится командой
  `claude mcp add -s user playwright -- npx @playwright/mcp@latest`, но CLI `claude` в PATH
  этой среды отсутствует (сессия идёт из расширения VS Code); браузер для агента уже есть —
  Claude in Chrome, а кадры снимает `tools/capture.mjs`.
- Windows: Homebrew нет; ffmpeg 9.0.2, ImageMagick 7.1.2-34 и yt-dlp 2026.10.26 поставлены через
  winget (`Gyan.FFmpeg`, `ImageMagick.ImageMagick`, `yt-dlp.yt-dlp`).
- Скрипты студии рассчитаны на macOS: `refs.py` импортирует `fcntl`, `board.py serve --open`
  вызывает `open`, `envcheck.py` требует brew. Обходы записаны в ENV.md → Pitfalls.

## What this changes
- TypeScript закреплён на 6.0.x до выхода typescript-eslint с поддержкой 7.
- Перед кодом каждой подсистемы Phaser читать соответствующий `skills/<тема>/SKILL.md` из пакета.
- Гейт «envcheck exit 0» на Windows недостижим из-за brew — закрывается с пометкой, остальное
  проверено вручную и через `studio.py verify`.

## Sources
- `npm view` для каждого пакета (2026-11-13)
- node_modules/phaser/skills/v3-to-v4-migration/SKILL.md, game-setup-and-config/SKILL.md (phaser 4.2.1)
- https://phaser.io/download/stable (2026-11-13)
- вывод `winget install` и `envcheck.py` на этой машине (2026-11-13)

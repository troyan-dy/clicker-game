# Pipeline — phases and gates

Read by `studio.py status`. The current phase is the first one that has open gates or
unfilled `<placeholders>` in its files (`files:`). Gates are never deleted: they are
ticked (`studio.py tick`), reopened (`--reopen`), skipped (`--skip`) or
blocked (`--block`). Going back to any phase = reopening its gates.

Checks: `check: <command>` — status runs it itself and ticks the gate if it passes;
`check: manual` — the agent judges; `check: user` — only after an explicit "yes" from
the user (AskUserQuestion) + `studio.py decide --by user`. On autopilot —
`tick "…" --proxy` (PROXY mark), the user reviews it on return.

## Phase 0 — Start
files:
- [x] project under git — check: git rev-parse --is-inside-work-tree

## Phase 1 — Idea
files: CONCEPT.md
- [x] interview done, concept slots filled with source tags — check: manual
- [x] 3–5 falsifiable pillars and anti-pillars — check: manual
- [x] story skeleton in STORY.md (or decided there is no story) — check: manual
- [x] draft mechanics in DESIGN.md and scale in SCOPE.md — check: manual
- [x] game designer proposed signature hooks, the user chose — check: user
- [x] user approved the pitch card — check: user

## Phase 2 — Style
files: ART_BIBLE.md
- [x] ≥3 directions with real references shown on the board — check: manual
- [x] user locked the style — check: user
- [x] art bible: hex palette, lighting, form, ≥3 signature techniques, "forbidden" — check: manual

## Phase 3 — Platform and engine
files: TECH.md
- [x] stack research done — check: test -s .studioigor/research/stack.md
- [x] user chose the platforms — check: user
- [x] user chose the engine; alternatives and reasons in TECH.md — check: user

## Phase 4 — Environment
files: ENV.md
- [x] research of the best engine setup done — check: test -s .studioigor/research/environment.md
- [ ] full setup installed: engine, CLI, plugin/skills, MCP, tests, linter, export — check: python3 {skill}/scripts/envcheck.py --engine {engine} SKIP: Windows: envcheck требует brew и ищет кэш Playwright по пути macOS; фактически всё установлено — studio.py verify прошёл, ffmpeg/magick/yt-dlp поставлены через winget
- [ ] editor MCP connected: `claude mcp list` ✔ and a real tool call succeeded — check: manual SKIP: у веб-стека нет редактора; Playwright MCP не ставится — CLI claude нет в PATH; кадры снимает tools/capture.mjs
- [x] hello project: TEST and CAPTURE pass (studio.py verify) — check: grep -q "^VERIFIED: yes" .studioigor/ENV.md
- [x] user saw the project running on their machine — check: user

## Phase 5 — Assets and look-dev
files: ASSETS.md
- [x] asset and pipeline research done — check: test -s .studioigor/research/assets.md
- [x] strategy by category agreed — check: user
- [x] look-dev scene built per the art bible and captured — check: ls .studioigor/captures/lookdev/*.png
- [x] user approved the look-dev: "this is how the game will look" — check: user
- [x] everything third-party is in the license registry — check: manual

## Phase 6 — Mechanics
files:
- [x] all mvp mechanics locked, each with research and a playtest — check: python3 {skill}/scripts/studio.py mechanics --check
- [x] design holism check passed, findings in BACKLOG.md — check: manual

## Phase 7 — Vertical slice
files:
- [x] full loop: menu → game → result → restart/next — check: manual
- [x] game-ness checklist passed for the vertical slice (references/production.md) — check: manual
- [x] post-slice boost ideas (synergies, new mechanics) shown and decided by the user — check: user
- [x] vertical slice with real assets, sound and story delivery — check: manual
- [x] user played through the vertical slice, it's fun; verdict recorded — check: user

## Phase 8 — Content
files: SCOPE.md
- [x] scope contract met — check: python3 {skill}/scripts/scope.py .
- [x] contact sheet of all units shown; neighbors differ on ≥2 axes — check: manual
- [x] story played from start to finale (if story-driven) — check: manual
- [x] user played the new content — check: user

## Phase 9 — Polish
files:
- [x] juice on the core actions, sound and motion on each — check: manual
- [x] first 60 seconds: a newcomer starts playing without explanations — check: user
- [x] performance budgets hold at the worst moment — check: manual
- [x] user decided: the polish is good enough — check: user

## Phase 10 — Release
files:
- [ ] platform requirements research — check: ls .studioigor/research/release-*.md
- [x] no stubs, debug, cheat keys, console.log — check: manual
- [ ] soak session with no leaks or degradation; saves compatible — check: manual SKIP: пользователь отказался от часового прогона; короткие прогоны 3 мин (captures/street/07-soak) и 75 с (captures/release/00-soak-smoke): 0 ошибок, память 16–26 МБ ровная; формат сохранения не менялся (SAVE_VERSION 1, недостающие поля получают значения по умолчанию)
- [x] end credits/CREDITS built from the license registry — check: manual
- [x] release builds made for each platform — check: manual
- [ ] user decided whether and where to publish — check: user

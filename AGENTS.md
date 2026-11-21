# Yes-Driven Development — project instructions

## Start here

If the lead assigned you a studio role, read its [role brief](docs/agents/roles/) and return the result in its specified format. Skip `studio.py status`: it can change phase gates.

For the lead, start in the current checkout. In a linked worktree, first check `.studioigor/autopilot/state.json` in the main checkout: this file is not tracked by Git. If `active` is `true`, only the autopilot tick edits the project.

1. Locate the installed `studioigor` skill. `<skill>` below means the directory containing its `SKILL.md`, `references/` and `scripts/`. Use the location reported by your harness, or locate `studioigor/SKILL.md` in the local skills directories (e.g. `~/.agents/skills`, `~/.codex/skills`, `~/.claude/skills`). Use Python 3 to run scripts **from the checkout**, e.g. `python3 "<skill>/scripts/studio.py" status`, substituting the actual path. Bare script names below use the same convention.
2. Read `.studioigor/STATE.md` (“Now”, open questions, session log). Follow the current phase, open gates, preferences and warnings from `status`; use `<skill>/SKILL.md` and the phase references for pipeline work. Decisions in `.studioigor/DECISIONS.md` stand until revisited by the user.
3. If `status` reports `AUTOPILOT ACTIVE`, leave edits to its tick. To intervene, run `autopilot.py stop` in the checkout running the autopilot first.

**Without the skill:** check `.studioigor/autopilot/state.json` in the current checkout too. For ordinary development, read the tracked state above, use the commands in [.studioigor/ENV.md](.studioigor/ENV.md) and commit with Git. For a pipeline step that needs a missing script or reference, report the missing dependency; leave its gates and generated state alone.

## Game development

- Build a game with a goal, menus, progression, sound, story, win and loss. Spend effort on what the player experiences. After several steps of tests, docs or tools, return to the game.
- Use RUN, TEST, BUILD, CAPTURE and EDITOR from `.studioigor/ENV.md`. If a command changes, update that file and run `studio.py verify`. For visual changes, inspect a CAPTURE frame yourself (`.studioigor/captures/`) and give the user a playtest. First question: “Is it fun?”
- Keep tuning in data files and architecture as simple as the current mechanic needs (`<skill>/references/code.md`). Add tests for silent failures in economy, damage, saves or determinism, or a bug that has returned. Skip UI tests and tests for coverage alone. Keep decision records to one line.

## Decisions and studio state

- Find facts about files, tools and APIs yourself. Ask the user about taste, scope, direction, money, accounts and publishing. Use your harness's question control or plain chat: 1–4 questions, 2–4 options each, recommended first and marked “(Recommended)”; always allow “you decide”.
- Record the choice with `studio.py decide "…" --by user|agent --why "…"`. When the user asks you to continue while they are away, decide `--by agent`. On an authorized autopilot tick use `--by proxy` for taste and `studio.py tick "…" --proxy` for user gates; follow `<skill>/references/autopilot.md`.
- Save a standing preference with `learn.py prefer "…"` in `.studioigor/PREFERENCES.md`. Use `--global` only for a way of working the user wants across games.
- Update studio state through `studio.py` (`decide`, `tick`, `note`, `commit`) when it provides a command. Propose improvements to the external skill via `learn.py propose`; do not edit its files.

## Git and studio roles

- Commit each decision, closed gate or locked mechanic with `studio.py commit "…"`. Push or publish only at the user's request.
- Pass the role brief, task, base commit and checkout path to the worker. If the harness has no subagents, the lead can use the same brief directly.
- **Worktree check for delegated edits:** run `git rev-parse --show-toplevel` and `git worktree list --porcelain`. The top level must match the assigned linked worktree (a `worktree` entry **other than the first**, which is the main checkout). Verify the assigned branch before writing. If the check fails, return `BLOCKED`. The directory name does not matter.
- The lead reviews each diff, merges one branch at a time and checks the game after each merge (`<skill>/references/team.md`). Only the lead uses live Blender or the engine editor via MCP; workers run headless.

## Project references

- Tasks and specifications: [GitHub Issues workflow](docs/agents/issue-tracker.md).
- Triage: [the five issue labels](docs/agents/triage-labels.md).
- Before working on game concepts or architecture: [glossary and decision records](docs/agents/domain.md).

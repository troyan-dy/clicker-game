# Scope — the contract in numbers

What "the game is done" means for this project. The scale is agreed in phase 1,
the numbers are refined in phase 8. Lines are never deleted — they are ticked or marked
`BLOCKED: <why>`. Counted by `scope.py`.

Line syntax:

    - [ ] <name>: <N> <unit> — count: <command that prints a number>

## Reference inventory
Cookie Clicker: 20 зданий, 700+ улучшений, 600+ ачивок, престиж, золотые печеньки, лента новостей — годы контента. Берём форму, а не объём: небольшая игра ≈ половина зданий и ~5% улучшений.

## Contract
- [x] источники задач: 10 шт — count: node -e "console.log(require('./src/data/balance/sources.json').length)"
- [x] тарифы подписки: 5 шт — count: node -e "console.log(require('./src/data/balance/plans.json').length)"
- [x] улучшения: 40 шт — считаются грейды, мощности, тарифы, масштабы, автомат и особые эффекты зданий (M23) — count: node -e "const d=n=>require('./src/data/balance/'+n+'.json');console.log(d('grades').length-1+d('farms').length+d('plans').length-1+d('scales').length+2+d('sources').filter(s=>s.perk).length)"
- [x] масштабы сцены: 6 шт (с башнями — 7; скамейка после титров — вне счёта) — count: node -e "console.log(2+require('./src/data/balance/scales.json').length)"
- [x] легендарные тикеты: 15 шт — count: node -e "console.log(require('./src/content/legends.json').length)"
- [x] реплики Клода: 60 шт — count: node -e "console.log(Object.values(require('./src/content/quips.json')).flat().length)"
- [x] новости: 60 шт — count: node -e "console.log(require('./src/content/news.json').length)"
- [x] ачивки: 30 шт — count: node -e "console.log(require('./src/content/awards.json').length)"

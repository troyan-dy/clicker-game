# Playtests

One session — one section. The user's feedback — verbatim. The first question is always "is it fun?".

<!--
## PT-01 — 2026-09-28 — M01 Drift (gym)
- build: <commit> · run: `<command>`
- what we tried: …
- is it fun? … · feedback (verbatim): …
- conclusions → actions: …
-->

## PT-01 — 2026-11-14 — M01 Согласие + M03 Подписка (gym)
- build: f8c1fc4 · run: `npm run dev` → http://localhost:5173/?gym=agree&debug=1
- what we tried: долбить Enter; скорость Клода в панели; пресеты 1 и 2; ритм Клода; замедление T
- is it fun? прямого ответа пока нет: «Остальное нравится» · feedback (verbatim): «скорость наполнения задач в очереди пусть зависит от подписки Остальное нравится»; следом: «замедленное на 0.25 на подписке за 20$»
- self-check: OBSERVED — captures/mech-M01/01 (до правки), captures/mech-M01/02 (после: Pro 0,75/с → Max 5x → Max 20x, очередь 8/8 и «тормозишь ты», 0 ошибок)
- conclusions → actions: design: скорость очереди задаёт тариф подписки — M03 встроен в гим M01; balance: Pro $20 = 0,75 запроса/с (прежние 3/с × 0,25), Max 5x $100 = 3,75/с, Max 20x $200 = 15/с, Enterprise $2 000 = 60/с; next: пользователь пробует тарифы, затем вопрос «весело?»


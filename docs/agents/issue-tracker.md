# GitHub Issues

Задачи и спецификации хранятся в `troyan-dy/yes-driven-development`.
Из корня репозитория `gh` выбирает его по `origin`.

- Создать задачу — `gh issue create --title "..." --body-file <файл>`.
- Прочитать задачу и обсуждение — `gh issue view <номер> --comments`.
- Найти открытые задачи — `gh issue list --state open`. Для фильтра по метке добавь `--label <метка>`.
- Добавить или снять метку — `gh issue edit <номер> --add-label <метка>` или `--remove-label <метка>`.
- Оставить комментарий — `gh issue comment <номер> --body-file <файл>`.
- Закрыть задачу — `gh issue close <номер>`.

Для подзадач и зависимостей используй связи GitHub. Если связь недоступна,
укажи `Part of #<номер>` или `Blocked by: #<номер>` в начале описания.

PRs as a request surface: no.

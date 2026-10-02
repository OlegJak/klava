# Инструкции для Claude

- Сайт публикуется через GitHub Pages из ветки `main` (папка `/`): https://olegjak.github.io/klava/
- Работа идёт локально: после изменения открой `index.html` в браузере,
  чтобы пользователь проверил результат (`start index.html` на Windows, `open index.html` на macOS).
- После изменения `style.css`, `data.js` или `app.js` увеличь номер `?v=` у ссылок на них в `index.html`,
  иначе браузер покажет старую версию из кэша.
- Когда пользователь проверил изменение, отправь его в `main` (`git push origin HEAD:main`),
  чтобы оно появилось на сайте. Если git недоступен, пользователь загружает файлы в `main` через сайт GitHub.

## Agent skills

### Issue tracker

Задачи ведутся локально, markdown-файлами в `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Стандартные метки: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: один `GLOSSARY.md` и `docs/adr/` в корне репозитория. See `docs/agents/domain.md`.

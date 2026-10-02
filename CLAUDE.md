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

Issues live in GitHub Issues for `OlegJak/klava` (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

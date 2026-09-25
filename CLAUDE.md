# Инструкции для Claude

- Сайт публикуется через GitHub Pages из ветки `gh-pages`: https://olegjak.github.io/klava/
- Работа идёт локально: после изменения открой `index.html` в браузере,
  чтобы пользователь проверил результат (`start index.html` на Windows, `open index.html` на macOS).
- После изменения `style.css`, `data.js` или `app.js` увеличь номер `?v=` у ссылок на них в `index.html`,
  иначе браузер покажет старую версию из кэша.
- Когда пользователь проверил изменение, отправь его в `main` и `gh-pages`
  (`git push origin HEAD:main HEAD:gh-pages`), чтобы оно появилось на сайте.

// Ядро обучения: каталог модулей, «Мои слова», настройки, нормализация и проверка текста.
// Не трогает страницу, localStorage, сеть и часы — хранилище передаётся снаружи.
// На сайте — глобальный объект KlavaCore, в Node (тесты) — module.exports
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KlavaCore = api;
})(this, function () {
  // ---------- Хранилище ----------
  // Хранилище — любой объект с get(key, def) и set(key, val); значения — JSON-совместимые

  function memoryStorage(initial = {}) {
    const data = JSON.parse(JSON.stringify(initial));
    return {
      get: (key, def) => (key in data ? JSON.parse(JSON.stringify(data[key])) : def),
      set: (key, val) => { data[key] = JSON.parse(JSON.stringify(val)); },
    };
  }

  // Браузерное хранилище: getLocal возвращает localStorage (в некоторых браузерах обращение к нему бросает ошибку)
  function browserStorage(getLocal, prefix) {
    return {
      get(key, def) {
        try { return JSON.parse(getLocal().getItem(prefix + key)) ?? def; } catch { return def; }
      },
      set(key, val) {
        try { getLocal().setItem(prefix + key, JSON.stringify(val)); } catch {}
      },
    };
  }

  // ---------- Каталог ----------
  // id встроенной карточки — из id модуля и термина, а не из места в уроке:
  // новые уроки и карточки в data.js не сдвигают прогресс по остальным
  const cardId = (moduleId, term) => `${moduleId}:${term}`;

  function builtInModule(id, lesson, notes) {
    const seen = {};
    const cards = lesson.items.map(([term, definition, note]) => {
      // термин может повториться в уроке — второму достаётся номер
      seen[term] = (seen[term] || 0) + 1;
      const base = cardId(id, term);
      return {
        id: seen[term] > 1 ? `${base}#${seen[term]}` : base,
        term,
        definition,
        explanation: note ? notes[note] || note : undefined,
      };
    });
    return {
      id,
      title: lesson.title,
      icon: lesson.icon,
      folderId: lesson.group,
      kind: lesson.type, // 'words' — по слову в строке, 'phrases' — по фразе
      langs: { term: 'en', definition: 'ru' },
      builtIn: true,
      cards,
    };
  }

  // lessons, groups, notes — LESSONS, GROUPS и NOTES из data.js
  function createCore({ lessons, groups, notes, storage }) {
    const folders = groups.map((g) => ({ id: g.id, title: g.title, builtIn: true }));
    const modules = Object.entries(lessons).map(([id, lesson]) => builtInModule(id, lesson, notes));
    const byId = new Map(modules.map((m) => [m.id, m]));

    // «Мои слова» хранятся под ключом study как [[термин, перевод], …] — формат прежней версии сайта
    const study = () => storage.get('study', []);

    return {
      folders: () => folders,
      modules: (folderId) => (folderId ? modules.filter((m) => m.folderId === folderId) : modules),
      module: (id) => byId.get(id) || null,

      // Перевод отдельных слов из словарных модулей: слово → перевод.
      // Неправильные глаголы — по каждой форме («went» → «идти (go went gone)»),
      // устойчивые выражения — целиком («make sense» → «иметь смысл»)
      wordTranslations() {
        const dict = {};
        for (const m of modules) {
          if (m.kind !== 'words') continue;
          for (const { term, definition } of m.cards) {
            if (!term.includes(' ')) dict[term] = definition;
            else if (m.id === 'verbs') for (const form of term.split(' ')) dict[form] ??= `${definition} (${term})`;
            else dict[term.toLowerCase()] = definition;
          }
        }
        return dict;
      },

      // Фразы всех фразовых модулей — из них берутся примеры употребления слов
      phrases: () => modules.filter((m) => m.kind === 'phrases')
        .flatMap((m) => m.cards.map(({ term, definition }) => ({ term, definition }))),

      myWords: () => study().map(([term, definition]) => ({ term, definition })),
      hasMyWord: (term) => study().some(([t]) => t === term),
      addMyWord(term, definition) {
        const list = study();
        if (list.some(([t]) => t === term)) return false;
        storage.set('study', [...list, [term, definition || '']]);
        return true;
      },

      settings: { get: storage.get, set: storage.set },
    };
  }

  // ---------- Текст ----------

  // Приводит «умные» кавычки и тире к символам, которые есть на клавиатуре
  function normalize(text) {
    return text
      .replace(/[‘’ʼ]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, '-')
      .replace(/…/g, '...')
      .replace(/[^\x20-\x7E\n]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Сравнение без учёта регистра, знаков препинания и лишних пробелов:
  // на слух запятые и заглавные буквы не различить.
  // inCls/tCls — класс каждого символа ввода/образца, matched — совпавшие символы, errs — ошибки по словам
  function compareDictation(input, target) {
    const sig = (s) => {
      const out = [];
      let space = true;
      for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (/[A-Za-z0-9']/.test(c)) { out.push({ c: c.toLowerCase(), i }); space = false; }
        else if (/\s/.test(c) && !space) { out.push({ c: ' ', i }); space = true; }
      }
      if (out.length && out[out.length - 1].c === ' ') out.pop();
      return out;
    };
    const a = sig(input), b = sig(target);
    // Наибольшая общая подпоследовательность
    const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = a.length - 1; i >= 0; i--) {
      for (let j = b.length - 1; j >= 0; j--) {
        dp[i][j] = a[i].c === b[j].c ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    const inCls = [...input].map(() => 'neutral');
    const tCls = [...target].map((c) => (/[A-Za-z0-9']/.test(c) ? 'missing' : 'punct'));
    a.forEach((x) => { inCls[x.i] = 'extra'; });
    b.forEach((x) => { if (x.c === ' ') tCls[x.i] = 'missing'; });
    let i = 0, j = 0, matched = 0;
    while (i < a.length && j < b.length) {
      if (a[i].c === b[j].c) { inCls[a[i].i] = 'done'; tCls[b[j].i] = 'ok'; matched++; i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
      else j++;
    }
    // Ошибки считаем по словам: слово образца, в котором чего-то не хватает,
    // плюс целиком лишние слова во вводе
    const words = (s, bad) => [...s.matchAll(/\S+/g)].filter((m) => bad(m.index, m.index + m[0].length)).length;
    const errs = words(target, (from, to) => tCls.slice(from, to).includes('missing')) +
      words(input, (from, to) => { const c = inCls.slice(from, to); return c.includes('extra') && !c.includes('done'); });
    return { inCls, tCls, matched, errs };
  }

  return { createCore, memoryStorage, browserStorage, cardId, normalize, compareDictation };
});

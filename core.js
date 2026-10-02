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

  // Свой модуль считается фразовым, если больше половины терминов — из трёх слов и длиннее
  const kindOf = (cards) =>
    (cards.filter((c) => c.term.split(/\s+/).length >= 3).length * 2 > cards.length ? 'phrases' : 'words');

  const title = (s) => {
    const t = String(s ?? '').trim();
    if (!t) throw new Error('Нужно название');
    return t;
  };

  // Поля карточки: термин и определение есть всегда, пустые необязательные поля не хранятся
  const OPTIONAL = ['example', 'exampleTranslation', 'explanation'];
  function applyCardFields(card, fields) {
    if ('term' in fields) {
      card.term = String(fields.term ?? '').trim();
      if (!card.term) throw new Error('Нужен термин');
    }
    if ('definition' in fields) card.definition = String(fields.definition ?? '').trim();
    for (const k of OPTIONAL) {
      if (!(k in fields)) continue;
      const v = String(fields[k] ?? '').trim();
      if (v) card[k] = v; else delete card[k];
    }
    return card;
  }

  // lessons, groups, notes — LESSONS, GROUPS и NOTES из data.js;
  // newId — источник уникальных id для своих папок, модулей и карточек
  // Системная папка «Своё»: в ней «Мои слова»; её нельзя переименовать или удалить, но можно класть туда модули
  const OWN_FOLDER = { id: 'own', title: 'Своё' };
  // «Мои слова» — свой модуль с постоянным id: туда «+ В словарь» складывает слова. Удалить его нельзя
  const MINE = 'mine';

  function createCore({ lessons, groups, notes, storage, newId }) {
    const folders = [...groups, OWN_FOLDER].map((g) => ({ id: g.id, title: g.title, builtIn: true }));
    const modules = Object.entries(lessons).map(([id, lesson]) => builtInModule(id, lesson, notes));
    const byId = new Map(modules.map((m) => [m.id, m]));
    const builtInFolderIds = new Set(folders.map((f) => f.id));

    // Свои папки и модули — под ключом own: { folders: [{ id, title }], modules: [{ id, title, folderId, langs, cards }] }.
    // Приставки f_, m_, c_ не дают id совпасть со встроенными
    const loadOwn = () => storage.get('own', { folders: [], modules: [] });
    const editOwn = (fn) => { const own = loadOwn(); const r = fn(own); storage.set('own', own); return r; };
    const ownView = (m) => ({ ...m, icon: m.id === MINE ? '⭐' : '📘', kind: kindOf(m.cards), builtIn: false });
    const sameTerm = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
    const folderExists = (own, id) => builtInFolderIds.has(id) || own.folders.some((f) => f.id === id);

    function ownFolder(own, id) {
      if (builtInFolderIds.has(id)) throw new Error('Встроенную папку нельзя изменить');
      const f = own.folders.find((x) => x.id === id);
      if (!f) throw new Error(`Нет папки ${id}`);
      return f;
    }
    function ownModule(own, id) {
      if (byId.has(id)) throw new Error('Встроенный модуль нельзя изменить');
      const m = own.modules.find((x) => x.id === id);
      if (!m) throw new Error(`Нет модуля ${id}`);
      return m;
    }
    function ownCard(m, cardId) {
      const c = m.cards.find((x) => x.id === cardId);
      if (!c) throw new Error(`Нет карточки ${cardId}`);
      return c;
    }

    // Новая карточка: термин обязателен, определение по умолчанию пустое
    const newCard = (fields) =>
      applyCardFields({ id: `c_${newId()}`, term: '', definition: '' }, { definition: '', ...fields, term: fields.term });

    const allModules = () => [...modules, ...loadOwn().modules.map(ownView)];

    // «Мои слова» есть всегда. Прежняя версия сайта хранила их списком [[термин, перевод], …]
    // под ключом study — переносим его в модуль один раз и очищаем
    const study = storage.get('study', []);
    if (study.length || !loadOwn().modules.some((m) => m.id === MINE)) {
      editOwn((own) => {
        let mine = own.modules.find((m) => m.id === MINE);
        if (!mine) {
          mine = { id: MINE, title: 'Мои слова', folderId: OWN_FOLDER.id, langs: { term: 'en', definition: 'ru' }, cards: [] };
          own.modules.unshift(mine);
        }
        for (const [term, definition] of study) {
          if (term && !mine.cards.some((c) => sameTerm(c.term, term))) mine.cards.push(newCard({ term, definition }));
        }
      });
      if (study.length) storage.set('study', []);
    }

    return {
      folders: () => [...folders, ...loadOwn().folders.map((f) => ({ ...f, builtIn: false }))],
      modules: (folderId) => (folderId ? allModules().filter((m) => m.folderId === folderId) : allModules()),
      module(id) {
        if (byId.has(id)) return byId.get(id);
        const m = loadOwn().modules.find((x) => x.id === id);
        return m ? ownView(m) : null;
      },

      createFolder: (name) => editOwn((own) => {
        const f = { id: `f_${newId()}`, title: title(name) };
        own.folders.push(f);
        return { ...f, builtIn: false };
      }),
      renameFolder: (id, name) => editOwn((own) => { ownFolder(own, id).title = title(name); }),
      // Вместе с папкой удаляются её модули
      deleteFolder: (id) => editOwn((own) => {
        ownFolder(own, id);
        own.folders = own.folders.filter((f) => f.id !== id);
        own.modules = own.modules.filter((m) => m.folderId !== id);
      }),

      createModule: ({ title: name, folderId }) => editOwn((own) => {
        if (!folderExists(own, folderId)) throw new Error(`Нет папки ${folderId}`);
        const m = { id: `m_${newId()}`, title: title(name), folderId, langs: { term: 'en', definition: 'ru' }, cards: [] };
        own.modules.push(m);
        return ownView(m);
      }),
      // Переименовать и/или перенести в другую папку
      updateModule: (id, changes) => editOwn((own) => {
        const m = ownModule(own, id);
        if ('folderId' in changes && !folderExists(own, changes.folderId)) throw new Error(`Нет папки ${changes.folderId}`);
        if ('title' in changes) m.title = title(changes.title);
        if ('folderId' in changes) m.folderId = changes.folderId;
      }),
      deleteModule: (id) => editOwn((own) => {
        ownModule(own, id);
        if (id === MINE) throw new Error('«Мои слова» удалить нельзя');
        own.modules = own.modules.filter((m) => m.id !== id);
      }),

      addCard: (moduleId, fields) => editOwn((own) => {
        const m = ownModule(own, moduleId);
        const card = newCard(fields);
        m.cards.push(card);
        return { ...card };
      }),
      // Несколько карточек за одну запись — для импорта
      addCards: (moduleId, list) => editOwn((own) => {
        const m = ownModule(own, moduleId);
        const cards = list.map(newCard);
        m.cards.push(...cards);
        return cards.map((c) => ({ ...c }));
      }),
      updateCard: (moduleId, cardId, fields) => editOwn((own) => {
        applyCardFields(ownCard(ownModule(own, moduleId), cardId), fields);
      }),
      deleteCard: (moduleId, cardId) => editOwn((own) => {
        const m = ownModule(own, moduleId);
        ownCard(m, cardId);
        m.cards = m.cards.filter((c) => c.id !== cardId);
      }),
      // Перенести карточку в конец другого своего модуля
      moveCardTo: (fromId, cardId, toId) => editOwn((own) => {
        const from = ownModule(own, fromId);
        const to = ownModule(own, toId);
        const card = ownCard(from, cardId);
        from.cards = from.cards.filter((c) => c !== card);
        to.cards.push(card);
      }),
      // Поставить карточку на место index (за краями — в начало или конец)
      moveCard: (moduleId, cardId, index) => editOwn((own) => {
        const m = ownModule(own, moduleId);
        const card = ownCard(m, cardId);
        m.cards = m.cards.filter((c) => c !== card);
        m.cards.splice(Math.max(0, Math.min(index, m.cards.length)), 0, card);
      }),

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

      // «+ В словарь»: карточка в «Мои слова» (термин, перевод, пример с переводом); повтор не добавляется
      hasMyWord: (term) => loadOwn().modules.find((m) => m.id === MINE).cards.some((c) => sameTerm(c.term, term)),
      addMyWord: (fields) => editOwn((own) => {
        const mine = ownModule(own, MINE);
        if (mine.cards.some((c) => sameTerm(c.term, fields.term))) return false;
        mine.cards.push(newCard(fields));
        return true;
      }),

      // Недавно открытые модули для главной: id, последний открытый — первым
      recent: () => storage.get('recent', []),
      markOpened(id) {
        storage.set('recent', [id, ...storage.get('recent', []).filter((r) => r !== id)].slice(0, 6));
      },

      settings: { get: storage.get, set: storage.set },
    };
  }

  // ---------- Импорт ----------
  // Разделители: готовые варианты или свой текст. Тире — длинное или короткое с пробелами вокруг или без,
  // дефис — только с пробелами вокруг, чтобы не резать слова вроде well-known
  const TERM_SEPS = { tab: '\t', comma: ',', semicolon: ';', dash: /\s*[–—]\s*|\s+-\s+/ };
  const CARD_SEPS = { newline: /\r?\n/, semicolon: ';' };

  // Делит s по первому вхождению sep (строка или RegExp): [до, после] или null
  function splitOnce(s, sep) {
    if (typeof sep === 'string') {
      const i = sep ? s.indexOf(sep) : -1;
      return i < 0 ? null : [s.slice(0, i), s.slice(i + sep.length)];
    }
    const m = s.match(sep);
    return m ? [s.slice(0, m.index), s.slice(m.index + m[0].length)] : null;
  }

  // Разбор вставленного списка: карточки с пометкой повтора ('module' — термин уже есть в модуле,
  // 'paste' — встречался выше во вставке) и строки, которые не удалось разобрать
  function parseImport(text, { termSep = 'tab', cardSep = 'newline', existingTerms = [] } = {}) {
    const tSep = TERM_SEPS[termSep] ?? termSep;
    const cSep = CARD_SEPS[cardSep] ?? cardSep;
    const key = (t) => t.trim().toLowerCase();
    const inModule = new Set(existingTerms.map(key));
    const seen = new Set();
    const cards = [];
    const unparsed = [];
    for (const chunk of cSep ? String(text).split(cSep) : [String(text)]) {
      if (!chunk.trim()) continue;
      const parts = splitOnce(chunk, tSep);
      const term = parts && parts[0].trim();
      if (!term) { unparsed.push(chunk.trim()); continue; }
      const k = key(term);
      cards.push({ term, definition: parts[1].trim(), duplicate: inModule.has(k) ? 'module' : seen.has(k) ? 'paste' : null });
      seen.add(k);
    }
    return { cards, unparsed };
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

  return { createCore, memoryStorage, browserStorage, cardId, normalize, compareDictation, parseImport };
});

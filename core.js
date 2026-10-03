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

  // Браузерное хранилище: getLocal возвращает localStorage (в некоторых браузерах обращение к нему бросает ошибку).
  // onError(key, error) — запись не удалась, например кончилось место
  function browserStorage(getLocal, prefix, onError = () => {}) {
    return {
      get(key, def) {
        try { return JSON.parse(getLocal().getItem(prefix + key)) ?? def; } catch { return def; }
      },
      set(key, val) {
        try { getLocal().setItem(prefix + key, JSON.stringify(val)); } catch (e) { onError(key, e); }
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
  const OPTIONAL = ['example', 'exampleTranslation', 'explanation', 'image'];
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

  // Языки сторон карточки: { term, definition } — коды языков вроде 'en'; меняются по одному
  function moduleLangs(base, changes = {}) {
    const langs = { ...base };
    for (const side of ['term', 'definition']) {
      if (!(side in changes)) continue;
      const code = changes[side];
      if (typeof code !== 'string' || !/^[a-z]{2,3}$/.test(code)) throw new Error(`Неверный код языка: ${code}`);
      langs[side] = code;
    }
    return langs;
  }

  // Системная папка «Своё»: в ней «Мои слова»; её нельзя переименовать или удалить, но можно класть туда модули
  const OWN_FOLDER = { id: 'own', title: 'Своё' };
  // «Мои слова» — свой модуль с постоянным id: туда «+ В словарь» складывает слова. Удалить его нельзя
  const MINE = 'mine';

  // ---------- Повторение: коробки Лейтнера ----------
  // Прогресс — на пару (карточка, направление): { box 1–5, due — день следующего повтора, last — день ответа }.
  // Дни — номера календарных дней по местному времени. Интервал после попадания в коробку:
  const BOX_DAYS = [0, 1, 3, 7, 14, 30];
  const LEARNED_BOX = 3;
  const dayOf = (ms) => { const d = new Date(ms); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); };

  // Верный ответ двигает в следующую коробку, только если срок наступил (или карточка новая):
  // повторные ответы в тот же день не перескакивают интервалы. Неверный — в коробку 1, повтор завтра
  function nextProgress(p, ok, today) {
    if (!ok) return { box: 1, due: today + 1, last: today };
    if (p && p.due > today) return { ...p, last: today };
    const box = Math.min((p ? p.box : 0) + 1, BOX_DAYS.length - 1);
    return { box, due: today + BOX_DAYS[box], last: today };
  }

  // lessons, groups, notes — LESSONS, GROUPS и NOTES из data.js;
  // newId — источник уникальных id для своих папок, модулей и карточек; now — текущее время в мс;
  // builtIns — показывать ли встроенные уроки (их видит только владелец сайта, новые пользователи начинают с нуля).
  // Словарь для подсказок (wordTranslations, phrases) строится по урокам в любом случае
  function createCore({ lessons, groups, notes, storage, newId, now, builtIns = true }) {
    const lessonModules = Object.entries(lessons).map(([id, lesson]) => builtInModule(id, lesson, notes));
    const folders = [...(builtIns ? groups : []), OWN_FOLDER].map((g) => ({ id: g.id, title: g.title, builtIn: true }));
    const modules = builtIns ? lessonModules : [];
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

    function findModule(id) {
      if (byId.has(id)) return byId.get(id);
      const m = loadOwn().modules.find((x) => x.id === id);
      return m ? ownView(m) : null;
    }

    // Прогресс повторения под ключом progress: { [id карточки]: { 'en-ru': {...}, 'ru-en': {...} } }
    const loadProgress = () => storage.get('progress', {});
    const today = () => dayOf(now());
    const isDueIn = (all, cardId, day) => Object.values(all[cardId] || {}).some((p) => p.due <= day);
    // Состояние каждой карточки модуля: { [id]: { state: 'new' | 'learning' | 'learned', due } }
    function cardStates(moduleId) {
      const all = loadProgress();
      const day = today();
      const learned = (id) => ['en-ru', 'ru-en'].every((d) => (all[id]?.[d]?.box || 0) >= LEARNED_BOX);
      const out = {};
      for (const c of findModule(moduleId)?.cards || []) {
        out[c.id] = { state: !all[c.id] ? 'new' : learned(c.id) ? 'learned' : 'learning', due: isDueIn(all, c.id, day) };
      }
      return out;
    }

    function dueList(folderId) {
      const all = loadProgress();
      const day = today();
      const out = [];
      for (const m of inFolder(visibleModules(), folderId)) {
        for (const c of m.cards) {
          if (!isDueIn(all, c.id, day)) continue;
          const due = Math.min(...Object.values(all[c.id]).map((p) => p.due));
          out.push({ card: c, moduleId: m.id, due });
        }
      }
      // сортировка устойчивая: при равном сроке — порядок модулей и карточек
      return out.sort((a, b) => a.due - b.due).map(({ card, moduleId }) => ({ card, moduleId }));
    }

    // Скрытые встроенные модули — список id под ключом hidden
    const hidden = () => new Set(storage.get('hidden', []));
    const allModules = () => [...modules, ...loadOwn().modules.map(ownView)];
    const visibleModules = () => { const h = hidden(); return allModules().filter((m) => !h.has(m.id)); };
    const inFolder = (list, folderId) => (folderId ? list.filter((m) => m.folderId === folderId) : list);
    function builtInOnly(id) {
      if (!byId.has(id)) throw new Error('Скрыть можно только встроенный модуль');
    }

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
      // Модули папки (или все), кроме скрытых
      modules: (folderId) => inFolder(visibleModules(), folderId),
      // Модуль по id — в том числе скрытый
      module: findModule,

      hiddenModules: (folderId) => { const h = hidden(); return inFolder(modules.filter((m) => h.has(m.id)), folderId); },
      isHidden: (id) => hidden().has(id),
      hideModule(id) {
        builtInOnly(id);
        storage.set('hidden', [...hidden().add(id)]);
      },
      showModule(id) {
        const h = hidden();
        h.delete(id);
        storage.set('hidden', [...h]);
      },

      // Копия модуля — свой модуль «<название> (копия)» с теми же карточками (у карточек новые id);
      // sourceId — id исходного модуля. По умолчанию копия ложится в папку оригинала
      copyModule(id, { folderId } = {}) {
        const src = findModule(id);
        if (!src) throw new Error(`Нет модуля ${id}`);
        return editOwn((own) => {
          const target = folderId ?? src.folderId;
          if (!folderExists(own, target)) throw new Error(`Нет папки ${target}`);
          const m = {
            id: `m_${newId()}`, title: `${src.title} (копия)`, folderId: target, langs: { ...src.langs }, sourceId: src.id,
            cards: src.cards.map(({ id: _, ...fields }) => newCard(fields)),
          };
          own.modules.push(m);
          // прогресс исходных карточек переходит на карточки копии
          const all = loadProgress();
          src.cards.forEach((c, i) => { if (all[c.id]) all[m.cards[i].id] = JSON.parse(JSON.stringify(all[c.id])); });
          storage.set('progress', all);
          return ownView(m);
        });
      },

      // Ответ по карточке в направлении 'en-ru' или 'ru-en' из любого режима
      recordAnswer(cardId, direction, ok) {
        const all = loadProgress();
        const day = today();
        all[cardId] = { ...all[cardId], [direction]: nextProgress(all[cardId]?.[direction], ok, day) };
        storage.set('progress', all);
        // счётчик ответов по дням — для серии и «сегодня»; хранится не больше года
        const act = storage.get('activity', {});
        act[day] = (act[day] || 0) + 1;
        for (const d of Object.keys(act)) if (Number(d) < day - 400) delete act[d];
        storage.set('activity', act);
      },
      cardProgress: (cardId) => loadProgress()[cardId] || {},

      // Статистика для главной: today — ответов сегодня, streak — дней подряд с ответами
      // (если сегодня ещё не занимались, серия считается до вчера), learned — выученных слов
      activity() {
        const act = storage.get('activity', {});
        const day = today();
        let d = act[day] ? day : day - 1;
        let streak = 0;
        while (act[d]) { streak++; d--; }
        const learned = Object.values(loadProgress())
          .filter((p) => ['en-ru', 'ru-en'].every((dir) => (p[dir]?.box || 0) >= LEARNED_BOX)).length;
        return { today: act[day] || 0, streak, learned };
      },
      // Ждёт повторения: срок хотя бы одного направления наступил
      isDue: (cardId) => isDueIn(loadProgress(), cardId, today()),

      // Отметки ★ — список id карточек под ключом starred
      isStarred: (cardId) => storage.get('starred', []).includes(cardId),
      // Переключить отметку; вернёт новое состояние
      toggleStar(cardId) {
        const list = storage.get('starred', []);
        const on = !list.includes(cardId);
        storage.set('starred', on ? [...list, cardId] : list.filter((id) => id !== cardId));
        return on;
      },
      // Отмеченные карточки модуля, в порядке модуля
      starredCards(moduleId) {
        const set = new Set(storage.get('starred', []));
        return (findModule(moduleId)?.cards || []).filter((c) => set.has(c.id));
      },
      // total — карточек, seen — встречено, learned — выучено (оба направления в коробке 3+), due — ждут повторения
      moduleStats(moduleId) {
        const states = Object.values(cardStates(moduleId));
        return {
          total: states.length,
          seen: states.filter((s) => s.state !== 'new').length,
          learned: states.filter((s) => s.state === 'learned').length,
          due: states.filter((s) => s.due).length,
        };
      },
      cardStates,

      // Очередь «Сегодня»: карточки видимых модулей с наступившим сроком, самые просроченные первыми.
      // [{ card, moduleId }]; folderId — только из этой папки
      dueCards: (folderId) => dueList(folderId),
      dueCount: (folderId) => dueList(folderId).length,

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

      // langs — языки сторон карточки (по умолчанию английский термин и русское определение);
      // одинаковые языки — модуль терминов с объяснениями, например «коленвал — …»
      createModule: ({ title: name, folderId, langs }) => editOwn((own) => {
        if (!folderExists(own, folderId)) throw new Error(`Нет папки ${folderId}`);
        const m = { id: `m_${newId()}`, title: title(name), folderId, langs: moduleLangs({ term: 'en', definition: 'ru' }, langs), cards: [] };
        own.modules.push(m);
        return ownView(m);
      }),
      // Переименовать, перенести в другую папку и/или сменить языки сторон
      updateModule: (id, changes) => editOwn((own) => {
        const m = ownModule(own, id);
        if ('folderId' in changes && !folderExists(own, changes.folderId)) throw new Error(`Нет папки ${changes.folderId}`);
        if ('title' in changes) m.title = title(changes.title);
        if ('folderId' in changes) m.folderId = changes.folderId;
        if ('langs' in changes) m.langs = moduleLangs(m.langs || { term: 'en', definition: 'ru' }, changes.langs);
      }),
      // Снимок своего модуля и возврат к нему — для «Не сохранять» в редакторе
      moduleSnapshot: (id) => editOwn((own) => JSON.parse(JSON.stringify(ownModule(own, id)))),
      restoreModule: (snapshot) => editOwn((own) => {
        const i = own.modules.findIndex((m) => m.id === snapshot.id);
        if (i < 0) throw new Error(`Нет модуля ${snapshot.id}`);
        own.modules[i] = JSON.parse(JSON.stringify(snapshot));
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
        for (const m of lessonModules) {
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
      phrases: () => lessonModules.filter((m) => m.kind === 'phrases')
        .flatMap((m) => m.cards.map(({ term, definition }) => ({ term, definition }))),

      // «+ В словарь»: карточка в «Мои слова» (термин, перевод, пример с переводом); повтор не добавляется
      hasMyWord: (term) => loadOwn().modules.find((m) => m.id === MINE).cards.some((c) => sameTerm(c.term, term)),
      addMyWord: (fields) => editOwn((own) => {
        const mine = ownModule(own, MINE);
        if (mine.cards.some((c) => sameTerm(c.term, fields.term))) return false;
        mine.cards.push(newCard(fields));
        return true;
      }),

      // Личный рекорд подбора пар по модулю (мс) — под ключом match-records
      matchRecord: (moduleId) => storage.get('match-records', {})[moduleId] ?? null,
      // Сохранить время, если это рекорд; true — новый рекорд
      saveMatchTime(moduleId, ms) {
        const records = storage.get('match-records', {});
        if (records[moduleId] != null && records[moduleId] <= ms) return false;
        storage.set('match-records', { ...records, [moduleId]: ms });
        return true;
      },

      // Недавно открытые модули для главной: id, последний открытый — первым
      recent: () => storage.get('recent', []),
      markOpened(id) {
        storage.set('recent', [id, ...storage.get('recent', []).filter((r) => r !== id)].slice(0, 6));
      },

      settings: { get: storage.get, set: storage.set },
    };
  }

  // ---------- Режим «Карточки» ----------
  // Занятие — неизменяемое состояние: каждый ответ возвращает новое.
  // { cards, index, known, unknown, current, position (с 1), total, done }

  function shuffled(list, random) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function flashState(cards, index, known, unknown) {
    const done = index >= cards.length;
    return { cards, index, known, unknown, current: done ? null : cards[index], position: Math.min(index + 1, cards.length), total: cards.length, done };
  }

  // random — источник случайности (Math.random на сайте, предсказуемый в тестах)
  const flashSession = (cards, { shuffle = false, random = Math.random } = {}) =>
    flashState(shuffle ? shuffled(cards, random) : cards.slice(), 0, [], []);

  function flashAnswer(s, known) {
    if (s.done) return s;
    return flashState(s.cards, s.index + 1,
      known ? [...s.known, s.current] : s.known,
      known ? s.unknown : [...s.unknown, s.current]);
  }

  // «Повторить незнакомые»: новое занятие из карточек, отмеченных «не знаю»
  const flashRetry = (s, options) => flashSession(s.unknown, options);

  // Занятие карточками для сохранения — только id, чтобы потом продолжить с того же места
  const flashSnapshot = (s) => ({
    order: s.cards.map((c) => c.id), index: s.index,
    known: s.known.map((c) => c.id), unknown: s.unknown.map((c) => c.id),
  });
  // Продолжить сохранённое занятие на нынешних карточках колоды: удалённые выпадают, новые встают в конец
  function flashResume(cards, snap) {
    const byId = new Map(cards.map((c) => [c.id, c]));
    const order = snap.order.filter((id) => byId.has(id));
    const passed = new Set(snap.order.slice(0, snap.index));
    const inOrder = new Set(order);
    const pick = (ids) => ids.filter((id) => byId.has(id)).map((id) => byId.get(id));
    return flashState(
      [...pick(order), ...cards.filter((c) => !inOrder.has(c.id))],
      order.filter((id) => passed.has(id)).length,
      pick(snap.known), pick(snap.unknown));
  }

  // ---------- Проверка ответа ----------
  // Не важны регистр, знаки препинания, апострофы, лишние пробелы и «ё/е»
  // (апостроф выпадает совсем: don't → dont, остальные знаки становятся пробелами)
  const answerKey = (s) => String(s).toLowerCase().replace(/ё/g, 'е').replace(/['’ʼ`]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

  // Расстояние Левенштейна, но не больше limit+1 — дальше считать незачем
  function editDistance(a, b, limit = 1) {
    if (Math.abs(a.length - b.length) > limit) return limit + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[b.length];
  }

  // Допустимые ответы: эталон целиком и каждый вариант через , ; / — со скобками и без текста в скобках
  function answerVariants(expected) {
    const parts = [expected, ...String(expected).split(/[,;/]/)];
    const out = new Set();
    for (const p of parts) {
      for (const v of [p.replace(/[()]/g, ' '), p.replace(/\([^)]*\)/g, ' ')]) {
        const k = answerKey(v);
        if (k) out.add(k);
      }
    }
    return [...out];
  }

  // 'correct' | 'almost' (одна опечатка в варианте от 4 букв) | 'wrong'
  function checkAnswer(input, expected) {
    const given = answerKey(input);
    if (!given) return 'wrong';
    const variants = answerVariants(expected);
    if (variants.includes(given)) return 'correct';
    return variants.some((v) => v.length >= 4 && editDistance(given, v) === 1) ? 'almost' : 'wrong';
  }

  // Что спрашиваем и что ждём в ответ: «англ → рус» — термин и определение, «рус → англ» — наоборот
  const sidesOf = (direction) => (direction === 'en-ru'
    ? { ask: (c) => c.term, want: (c) => c.definition }
    : { ask: (c) => c.definition, want: (c) => c.term });

  // До n неверных вариантов ответа из других карточек — разных и не совпадающих с правильным
  function distractors(cards, want, answer, n, random) {
    const seen = new Set([answerKey(answer)]);
    const out = [];
    for (const c of shuffled(cards, random)) {
      const a = want(c);
      const k = answerKey(a || '');
      if (out.length >= n) break;
      if (k && !seen.has(k)) { seen.add(k); out.push(a); }
    }
    return out;
  }

  // ---------- Режим «Тест» ----------
  // Вопросы трёх типов: 'choice' — выбор из вариантов, 'truefalse' — верно ли показанный ответ, 'written' — ввод.
  // Типы раздаются по кругу перемешанным карточкам, каждая карточка — один раз
  const TEST_TYPES = ['choice', 'truefalse', 'written'];
  // Вопросов в тесте может быть больше, чем карточек (карточки повторяются по кругу), но не больше этого
  const TEST_MAX = 100;

  // direction: 'en-ru', 'ru-en' или 'mixed' — в выборе и «верно/неверно» направление случайное для каждого вопроса,
  // а в письменных всегда нужно написать термин. Для смешанного нужны обе стороны карточки
  function buildTest(cards, { count = 10, direction = 'en-ru', types = TEST_TYPES, random = Math.random } = {}) {
    const has = (x) => (x || '').trim();
    const usable = cards.filter((c) => (direction === 'mixed' ? has(c.term) && has(c.definition) : has(sidesOf(direction).want(c))));
    // по кругу: каждый круг — карточки в новом порядке; одна карточка не встаёт два раза подряд
    const want = Math.min(Math.max(1, count), TEST_MAX);
    const picked = [];
    while (usable.length && picked.length < want) {
      const lap = shuffled(usable, random);
      if (lap.length > 1 && lap[0] === picked[picked.length - 1]) lap.push(lap.shift());
      picked.push(...lap.slice(0, want - picked.length));
    }
    return picked.map((card, i) => {
      const type = types[i % types.length];
      let dir = direction;
      if (dir === 'mixed') dir = type !== 'written' && random() < 0.5 ? 'en-ru' : 'ru-en';
      const { ask, want } = sidesOf(dir);
      const answer = want(card);
      const q = { card, type, direction: dir, prompt: ask(card), answer };
      if (type === 'choice') q.choices = shuffled([answer, ...distractors(usable, want, answer, 3, random)], random);
      if (type === 'truefalse') {
        const [other] = distractors(usable, want, answer, 1, random);
        q.shown = !other || random() < 0.5 ? answer : other;
        q.isTrue = q.shown === answer;
      }
      return q;
    });
  }

  // responses[i]: выбранный вариант (choice), true/false (truefalse), введённый текст (written).
  // results[i]: 'correct' | 'almost' | 'wrong'; «почти» засчитывается
  function gradeTest(questions, responses) {
    const results = questions.map((q, i) => {
      const r = responses[i];
      if (q.type === 'choice') return r === q.answer ? 'correct' : 'wrong';
      if (q.type === 'truefalse') return typeof r === 'boolean' && r === q.isTrue ? 'correct' : 'wrong';
      return checkAnswer(r ?? '', q.answer);
    });
    const correct = results.filter((x) => x !== 'wrong').length;
    return {
      results,
      correct,
      total: questions.length,
      percent: questions.length ? Math.round((correct / questions.length) * 100) : 0,
      mistakes: results.flatMap((x, i) => (x === 'wrong' ? [{ index: i, question: questions[i], given: responses[i] }] : [])),
    };
  }

  // ---------- Подбор пар ----------
  // Поле — до 6 пар: плитка термина и плитка определения на карточку, вперемешку. Состояние неизменяемое.
  // { tiles: [{ id, cardId, side: 'term' | 'def', text }], pairs, matched: [cardId], selected, mistakes, done, last }
  // last — что случилось при последнем клике: { result: 'match' | 'miss', tiles, cardIds }
  const MATCH_PAIRS = 6;
  const MATCH_PENALTY_MS = 1000;

  function matchGame(cards, { random = Math.random } = {}) {
    // на поле не должно быть одинаковых текстов — иначе пара неоднозначна
    const terms = new Set();
    const defs = new Set();
    const picked = [];
    for (const c of shuffled(cards, random)) {
      const t = answerKey(c.term || '');
      const d = answerKey(c.definition || '');
      if (!t || !d || terms.has(t) || defs.has(d) || terms.has(d) || defs.has(t)) continue;
      terms.add(t);
      defs.add(d);
      picked.push(c);
      if (picked.length === MATCH_PAIRS) break;
    }
    const tiles = shuffled(picked.flatMap((c) => [
      { id: `${c.id}|term`, cardId: c.id, side: 'term', text: c.term },
      { id: `${c.id}|def`, cardId: c.id, side: 'def', text: c.definition },
    ]), random);
    return { tiles, pairs: picked.length, matched: [], selected: null, mistakes: 0, done: picked.length === 0, last: null };
  }

  function matchPick(g, tileId) {
    const tile = g.tiles.find((t) => t.id === tileId);
    if (g.done || !tile || g.matched.includes(tile.cardId)) return g;
    const sel = g.tiles.find((t) => t.id === g.selected);
    if (!sel) return { ...g, selected: tileId, last: null };
    if (sel.id === tileId) return { ...g, selected: null, last: null };
    if (sel.side === tile.side) return { ...g, selected: tileId, last: null };
    const pair = { tiles: [sel.id, tileId], cardIds: [sel.cardId, tile.cardId] };
    if (sel.cardId !== tile.cardId) return { ...g, selected: null, mistakes: g.mistakes + 1, last: { result: 'miss', ...pair } };
    const matched = [...g.matched, tile.cardId];
    return { ...g, selected: null, matched, done: matched.length === g.pairs, last: { result: 'match', ...pair } };
  }

  // Итоговое время: сколько шла игра плюс штраф за каждую ошибку
  const matchTime = (g, elapsedMs) => elapsedMs + g.mistakes * MATCH_PENALTY_MS;

  // ---------- Режим «Заучивание» ----------
  // Карточки идут раундами до roundSize штук. Этап 1 — выбор из вариантов, этап 2 — ввод.
  // Верный выбор переводит на ввод; два верных ввода подряд — карточка освоена и уступает место следующей.
  // Ошибка при вводе возвращает карточку на выбор. За раунд каждая карточка спрашивается один раз.
  // Состояние неизменяемое: learnAnswer возвращает новое. random — источник случайности для вариантов

  const LEARN_ROUND = 7;

  // direction: 'en-ru', 'ru-en' или 'mixed' — в выборе из вариантов направление случайное для каждого вопроса,
  // а писать всегда нужно термин (по определению). Для смешанного нужны обе стороны карточки
  function learnSession(cards, { direction = 'en-ru', shuffle = false, random = Math.random } = {}) {
    const has = (x) => (x || '').trim();
    const usable = (shuffle ? shuffled(cards, random) : cards.slice()).filter((c) => (direction === 'mixed'
      ? has(c.term) && has(c.definition)
      : has(sidesOf(direction).want(c))));
    const base = {
      cards: usable, direction, random,
      progress: {},                       // id → { stage, streak }
      waiting: usable.map((c) => c.id),   // ещё не начатые
      active: [],                         // в работе, не больше LEARN_ROUND
      masteredIds: [],
      round: 0,
    };
    return learnNextRound(base);
  }

  function learnNextRound(s) {
    const active = [...s.active];
    const waiting = [...s.waiting];
    while (active.length < LEARN_ROUND && waiting.length) active.push(waiting.shift());
    return learnView({ ...s, active, waiting, roundIds: active, pos: 0, round: s.round + 1 });
  }

  // Публичные поля: question, round, roundSize, mastered, total, done
  function learnView(s) {
    const done = s.roundIds.length === 0;
    const id = done ? null : s.roundIds[s.pos];
    return {
      ...s,
      done,
      total: s.cards.length,
      mastered: s.masteredIds.length,
      roundSize: s.roundIds.length,
      question: done ? null : learnQuestion(s, s.cards.find((c) => c.id === id)),
    };
  }

  // direction вопроса — для смешанного: случайное в выборе, «по определению написать термин» во вводе
  function learnQuestion(s, card) {
    const { stage } = s.progress[card.id] || { stage: 1 };
    let direction = s.direction;
    if (direction === 'mixed') direction = stage === 1 && s.random() < 0.5 ? 'en-ru' : 'ru-en';
    const { ask, want } = sidesOf(direction);
    const answer = want(card);
    const choices = stage === 1 ? shuffled([answer, ...distractors(s.cards, want, answer, 3, s.random)], s.random) : null;
    return { card, stage, direction, prompt: ask(card), answer, choices };
  }

  function learnAnswer(s, ok) {
    if (s.done) return s;
    const { card, stage } = s.question;
    const p = s.progress[card.id] || { stage: 1, streak: 0 };
    let next;
    if (stage === 1) next = ok ? { stage: 2, streak: 0 } : p;
    else next = ok ? { stage: 2, streak: p.streak + 1 } : { stage: 1, streak: 0 };
    const mastered = next.streak >= 2;
    const s2 = {
      ...s,
      progress: { ...s.progress, [card.id]: next },
      active: mastered ? s.active.filter((x) => x !== card.id) : s.active,
      masteredIds: mastered ? [...s.masteredIds, card.id] : s.masteredIds,
      pos: s.pos + 1,
    };
    return s2.pos >= s.roundIds.length ? learnNextRound(s2) : learnView(s2);
  }

  // ---------- Слияние данных браузера и облака (первый вход на устройстве) ----------
  // local и cloud — записи хранилища { ключ: значение }. Ничего не теряем:
  // свои папки и модули — объединение по id (при совпадении — из облака), «Мои слова» — по термину;
  // прогресс — по каждой паре (карточка, направление) более свежий ответ; отметки и скрытые — объединение;
  // рекорды — лучшие; счётчик ответов по дням — больший; недавние — сначала облачные; прочее (настройки) — из облака
  const unionIds = (a = [], b = []) => [...new Set([...a, ...b])];
  function mergeById(cloudList = [], localList = []) {
    const ids = new Set(cloudList.map((x) => x.id));
    return [...cloudList, ...localList.filter((x) => !ids.has(x.id))];
  }
  const MERGE = {
    own(local, cloud) {
      const modules = mergeById(cloud.modules, local.modules).map((m) => {
        if (m.id !== MINE) return m;
        const other = (local.modules || []).find((x) => x.id === MINE);
        if (!other || other === m) return m;
        const has = new Set(m.cards.map((c) => c.term.trim().toLowerCase()));
        return { ...m, cards: [...m.cards, ...other.cards.filter((c) => !has.has(c.term.trim().toLowerCase()))] };
      });
      return { folders: mergeById(cloud.folders, local.folders), modules };
    },
    progress(local, cloud) {
      const out = JSON.parse(JSON.stringify(cloud));
      for (const [id, dirs] of Object.entries(local)) {
        out[id] = out[id] || {};
        for (const [dir, p] of Object.entries(dirs)) {
          const c = out[id][dir];
          if (!c || p.last > c.last || (p.last === c.last && p.box > c.box)) out[id][dir] = p;
        }
      }
      return out;
    },
    starred: (local, cloud) => unionIds(cloud, local),
    hidden: (local, cloud) => unionIds(cloud, local),
    recent: (local, cloud) => unionIds(cloud, local).slice(0, 6),
    'match-records'(local, cloud) {
      const out = { ...cloud };
      for (const [k, v] of Object.entries(local)) out[k] = out[k] == null ? v : Math.min(out[k], v);
      return out;
    },
    best: (local, cloud) => Math.max(local, cloud),
    activity(local, cloud) {
      const out = { ...cloud };
      for (const [d, n] of Object.entries(local)) out[d] = Math.max(out[d] || 0, n);
      return out;
    },
  };

  function mergeData(local, cloud) {
    const out = { ...cloud };
    for (const [key, value] of Object.entries(local)) {
      if (!(key in cloud)) out[key] = value;
      else if (MERGE[key]) out[key] = MERGE[key](value, cloud[key]);
    }
    return out;
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

  return { createCore, memoryStorage, browserStorage, cardId, normalize, compareDictation, parseImport,
    flashSession, flashAnswer, flashRetry, flashSnapshot, flashResume, TEST_MAX, checkAnswer, learnSession, learnAnswer, buildTest, gradeTest,
    matchGame, matchPick, matchTime, MATCH_PENALTY_MS, mergeData };
});

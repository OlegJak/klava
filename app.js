// ---------- Раскладка клавиатуры ----------
// [code, обычный символ, с Shift, палец, доп. класс]
// Пальцы: l/r — рука, p/r/m/i — мизинец/безымянный/средний/указательный, th — большой
const LAYOUT = [
  [
    ['Backquote', '`', '~', 'lp'], ['Digit1', '1', '!', 'lp'], ['Digit2', '2', '@', 'lr'],
    ['Digit3', '3', '#', 'lm'], ['Digit4', '4', '$', 'li'], ['Digit5', '5', '%', 'li'],
    ['Digit6', '6', '^', 'ri'], ['Digit7', '7', '&', 'ri'], ['Digit8', '8', '*', 'rm'],
    ['Digit9', '9', '(', 'rr'], ['Digit0', '0', ')', 'rp'], ['Minus', '-', '_', 'rp'],
    ['Equal', '=', '+', 'rp'], ['Backspace', 'Backspace', null, 'none', 'w2'],
  ],
  [
    ['Tab', 'Tab', null, 'none', 'w15'], ['KeyQ', 'q', 'Q', 'lp'], ['KeyW', 'w', 'W', 'lr'],
    ['KeyE', 'e', 'E', 'lm'], ['KeyR', 'r', 'R', 'li'], ['KeyT', 't', 'T', 'li'],
    ['KeyY', 'y', 'Y', 'ri'], ['KeyU', 'u', 'U', 'ri'], ['KeyI', 'i', 'I', 'rm'],
    ['KeyO', 'o', 'O', 'rr'], ['KeyP', 'p', 'P', 'rp'], ['BracketLeft', '[', '{', 'rp'],
    ['BracketRight', ']', '}', 'rp'], ['Backslash', '\\', '|', 'rp', 'w15'],
  ],
  [
    ['CapsLock', 'Caps', null, 'none', 'w18'], ['KeyA', 'a', 'A', 'lp', 'home'], ['KeyS', 's', 'S', 'lr', 'home'],
    ['KeyD', 'd', 'D', 'lm', 'home'], ['KeyF', 'f', 'F', 'li', 'home'], ['KeyG', 'g', 'G', 'li'],
    ['KeyH', 'h', 'H', 'ri'], ['KeyJ', 'j', 'J', 'ri', 'home'], ['KeyK', 'k', 'K', 'rm', 'home'],
    ['KeyL', 'l', 'L', 'rr', 'home'], ['Semicolon', ';', ':', 'rp', 'home'], ['Quote', "'", '"', 'rp'],
    ['Enter', 'Enter', null, 'none', 'w2'],
  ],
  [
    ['ShiftLeft', 'Shift', null, 'lp', 'w25'], ['KeyZ', 'z', 'Z', 'lp'], ['KeyX', 'x', 'X', 'lr'],
    ['KeyC', 'c', 'C', 'lm'], ['KeyV', 'v', 'V', 'li'], ['KeyB', 'b', 'B', 'li'],
    ['KeyN', 'n', 'N', 'ri'], ['KeyM', 'm', 'M', 'ri'], ['Comma', ',', '<', 'rm'],
    ['Period', '.', '>', 'rr'], ['Slash', '/', '?', 'rp'], ['ShiftRight', 'Shift', null, 'rp', 'w25'],
  ],
  [['Space', ' ', null, 'th', 'space']],
];

const $ = (id) => document.getElementById(id);
const keyByCode = {};   // code -> элемент клавиши

function buildKeyboard() {
  const kb = $('keyboard');
  for (const row of LAYOUT) {
    const rowEl = document.createElement('div');
    rowEl.className = 'row';
    for (const [code, base, shifted, finger, extra] of row) {
      const el = document.createElement('div');
      el.className = `key f-${finger} ${extra || ''}`;
      const isLetter = /^[a-z]$/.test(base);
      if (shifted && !isLetter) el.innerHTML = `<small>${shifted}</small>${base}`;
      else el.textContent = code === 'Space' ? '' : isLetter ? base.toUpperCase() : base;
      rowEl.appendChild(el);
      keyByCode[code] = el;
    }
    kb.appendChild(rowEl);
  }
}

// ---------- Упражнения ----------
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Уроки, «Мои слова» и настройки — через ядро обучения (core.js).
// Хранилище переключаемое: гость работает с браузером, после входа — с Supabase (см. connectCloud)
const { normalize, compareDictation } = KlavaCore;
const storage = {
  backend: KlavaCore.browserStorage(() => localStorage, 'klava:',
    () => toast('Не хватает места в браузере — изменение не сохранилось. Уберите лишние картинки или войдите, чтобы хранить в облаке', 'alert')),
  get: (key, def) => storage.backend.get(key, def),
  set: (key, val) => storage.backend.set(key, val),
};
// Встроенные уроки видит только владелец сайта после входа; гости и новые пользователи начинают с нуля
const OWNER_EMAILS = ['yakimush.oleg@gmail.com'];
const makeCore = (builtIns = false) => KlavaCore.createCore({
  lessons: LESSONS, groups: GROUPS, notes: NOTES,
  storage,
  newId: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
  now: () => Date.now(),
  builtIns,
});
let core = makeCore();
const store = core.settings;

// ---------- Языки модулей ----------
// Пока три языка. Одинаковые языки сторон — модуль терминов с объяснениями: «Коленвал — вал двигателя, который…»
const LANGS = {
  en: { name: 'Английский', short: 'англ', adv: 'по-английски', speech: 'en-US' },
  ru: { name: 'Русский', short: 'рус', adv: 'по-русски', speech: 'ru-RU' },
  et: { name: 'Эстонский', short: 'эст', adv: 'по-эстонски', speech: 'et-EE' },
};
const DEFAULT_LANGS = { term: 'en', definition: 'ru' };
const langsOf = (moduleId) => core.module(moduleId)?.langs || DEFAULT_LANGS;
// Языки карточки: по колоде, а в «Сегодня» — по модулю, где карточка лежит
function cardLangs(cardId, deckId) {
  if (deckId !== 'today') return langsOf(deckId);
  return langsOf(core.dueCards().find((x) => x.card.id === cardId)?.moduleId);
}
// Языки колоды; у «Сегодня» — только если они общие у всех модулей с карточками к повтору
function deckLangs(deckId) {
  if (deckId !== 'today') return langsOf(deckId);
  const all = [...new Set(core.dueCards().map((x) => x.moduleId))].map(langsOf);
  return all.length && all.every((l) => l.term === all[0].term && l.definition === all[0].definition) ? all[0] : null;
}
const isTermDeck = (l) => !l || l.term === l.definition;
// Подписи направлений: «англ → рус» или, у терминов и смешанных колод, «Термин → определение»
function dirLabels(deckId) {
  const l = deckLangs(deckId);
  if (isTermDeck(l)) return { 'en-ru': 'Термин → определение', 'ru-en': 'Определение → термин' };
  const s = (c) => LANGS[c]?.short || c;
  return { 'en-ru': `${s(l.term)} → ${s(l.definition)}`, 'ru-en': `${s(l.definition)} → ${s(l.term)}` };
}
const langSelect = (id, value) => `<select id="${id}">${Object.entries(LANGS).map(([code, l]) =>
  `<option value="${code}"${code === value ? ' selected' : ''}>${l.name}</option>`).join('')}</select>`;
// Выбор языков сторон в формах модуля; prefix — начало id полей
const langFields = (prefix, langs) => '<div class="lang-fields"><span class="lang-title">Языки</span><div class="lang-pair">' +
  `<label class="lang-side"><small>Термин</small>${langSelect(`${prefix}-term-lang`, langs.term)}</label>` +
  `<span class="lang-arrow">${icon('arrow')}</span>` +
  `<label class="lang-side"><small>Определение</small>${langSelect(`${prefix}-def-lang`, langs.definition)}</label></div>` +
  `<small class="lang-hint">${icon('book')}<span>Термины вроде «Коленвал — вал двигателя, который…» — выберите один язык с обеих сторон</span></small></div>`;
const readLangs = (prefix) => ({ term: $(`${prefix}-term-lang`).value, definition: $(`${prefix}-def-lang`).value });

// Каждый фрагмент: { text, parts: [{ from, to, tr }] } — части нужны для перевода текущего слова
function makeChunks(lessonId) {
  if (lessonId === 'custom') {
    const text = normalize($('custom-text').value);
    const sentences = text.match(/[^.!?]+[.!?]*/g) || [];
    const chunks = [];
    let cur = '';
    for (const s of sentences.map((s) => s.trim()).filter(Boolean)) {
      if (cur && (cur + ' ' + s).length > 120) { chunks.push(cur); cur = s; }
      else cur = cur ? cur + ' ' + s : s;
    }
    if (cur) chunks.push(cur);
    return chunks.map((t) => ({ text: t, parts: [] }));
  }

  // Фразы — по 10 за урок, слова — по 20, в каждой строке одна фраза или одно слово
  // в «Сегодня» слова и фразы вперемешку: фразой считаем термин из трёх слов и длиннее
  const kind = lessonId === 'today' ? null : core.module(lessonId).kind;
  const cards = lessonId === 'today' ? typeableDue() : deckCards(lessonId);
  const wordLike = (en) => (kind ? kind === 'words' : en.split(/\s+/).length < 3);
  return shuffle(cards).slice(0, kind === 'phrases' ? 10 : 20).map(({ id: cardId, term: en, definition: ru, explanation }) => ({
    cardId, text: en, ru, note: explanation, parts: [{ from: 0, to: en.length, tr: wordLike(en) ? `${en} — ${ru || '?'}` : ru }],
  }));
}

// ---------- Состояние ----------
const state = {
  lessonId: 'a1',
  chunks: [],
  index: 0,        // номер текущего фрагмента
  pos: 0,          // позиция в фрагменте
  missed: new Set(),
  chars: [],       // что реально набрано в фрагменте (для режима «не исправлять ошибки»)
  wrongKey: '',    // последняя неверно нажатая клавиша
  errors: 0,
  typed: 0,        // верно набранных символов за урок
  lineStart: 0,    // первое нажатие в текущей строке
  lessonChars: 0,  // верные символы всех завершённых строк урока
  lessonMs: 0,     // время набора этих строк
  lastSpeed: 0,    // скорость последней набранной строки, зн/мин
  finished: false,
  lookup: null,    // слово, показанное по Ctrl: { word, from, to, tr, saved }
  dict: null,      // диктант: { input, caret, checked, res }
  edit: -1,        // курсор, сдвинутый стрелками внутрь набранного (-1 — в конце, на pos)
};
const newDict = () => ({ input: '', caret: 0, checked: false, res: null });
const editPos = () => (state.edit < 0 ? state.pos : state.edit);
state.dict = newDict();

function startLesson() {
  state.chunks = makeChunks(state.lessonId);
  state.index = 0;
  state.pos = 0;
  state.missed = new Set();
  state.chars = [];
  state.wrongKey = '';
  state.errors = 0;
  state.errorsAtLine = 0; // ошибок было к началу текущей строки
  state.typed = 0;
  state.lineStart = 0;
  state.lessonChars = 0;
  state.lessonMs = 0;
  state.lastSpeed = 0;
  state.finished = false;
  state.lookup = null;
  state.dict = newDict();
  state.edit = -1;
  $('result').hidden = true;
  const custom = state.lessonId === 'custom';
  $('custom-box').hidden = !custom || state.chunks.length > 0;
  render();
  renderStats();
  if (!custom || state.chunks.length) maybeSpeak();
}

// ---------- Отрисовка ----------
const escapeHtml = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function render() {
  const chunk = state.chunks[state.index];
  const textEl = $('text');

  if (!chunk) {
    const empty = {
      custom: 'Вставьте текст ниже',
      mine: 'Пока пусто. Во время набора нажмите Ctrl на слове, а затем Ctrl ещё раз — оно сохранится сюда.',
      today: 'На сегодня всё повторено.',
    }[state.lessonId] ?? 'В модуле пока нет карточек.';
    textEl.innerHTML = `<span class="next">${empty}</span>`;
    $('typed').innerHTML = '';
    $('translation').textContent = '';
    renderLookup();
    renderExplain(null);
    return;
  }

  const t = chunk.text;
  if (freeMode()) { renderDictation(chunk); renderLookup(); renderExplain(chunk); return; }

  // Строка ввода стоит над образцом символ в символ: пробелы на тех же местах,
  // а ненабранный остаток образца занимает место невидимым — поэтому переносы строк совпадают
  const cell = (ch, i, cls) => {
    if (ch !== t[i] && t[i] === ' ') return `<span class="${cls} gap"> </span>`; // лишний символ вместо пробела
    // пробел вместо буквы показываем «_»: той же ширины и без переноса строки в этом месте
    const shown = ch !== t[i] && ch === ' ' ? '_' : ch;
    return `<span class="${cls}">${escapeHtml(shown)}</span>`;
  };
  let typed = '';
  const caretAt = editPos();
  for (let i = 0; i < state.pos; i++) {
    if (i === caretAt && !state.finished) typed += '<span class="caret"></span>';
    typed += cell(state.chars[i] ?? t[i], i, state.missed.has(i) ? 'miss' : 'done');
  }
  if (caretAt >= state.pos && !state.finished) typed += '<span class="caret"></span>';
  // Неверная клавиша на миг появляется красной и сразу исчезает (см. showWrongKey) — в строку она не попадает
  let rest = state.pos;
  if (state.wrongKey && rest <= t.length) typed += cell(state.wrongKey, rest++, 'wrong');
  typed += `<span class="ghost">${escapeHtml(t.slice(rest))}</span>`;
  $('typed').innerHTML = typed;

  // Образец: пройденная часть приглушена, слово по Ctrl выделено; в конце строки — подсказка нажать пробел
  const lk = state.lookup;
  const classOf = (i) => [i < state.pos && 'passed', lk && i >= lk.from && i < lk.to && 'look'].filter(Boolean).join(' ');
  let html = '';
  for (let i = 0; i < t.length;) {
    const cls = classOf(i);
    let j = i + 1;
    while (j < t.length && classOf(j) === cls) j++;
    html += cls ? `<span class="${cls}">${escapeHtml(t.slice(i, j))}</span>` : escapeHtml(t.slice(i, j));
    i = j;
  }
  if (state.pos >= t.length && !state.finished) html += '<span class="end-hint" title="Нажмите пробел или Enter">␣</span>';
  textEl.innerHTML = html;

  const part = chunk.parts.find((p) => state.pos >= p.from && state.pos <= p.to) || chunk.parts[0];
  $('translation').textContent = $('show-tr').checked && part ? part.tr : '';
  renderLookup();
  renderExplain(chunk);
}

// Объяснение под фразой: почему это время, конструкция, предлог.
// Текст объяснения — из карточки урока; разметка **жирный** и `формула`.
// В «Диктанте» и «Переводе» показываем только после проверки, чтобы не подсказать ответ
function renderExplain(chunk) {
  const el = $('explain');
  const note = chunk && chunk.note;
  const show = Boolean(note) && $('show-explain').checked && !textHidden();
  el.hidden = !show;
  if (!show) return;
  el.innerHTML = `<span class="explain-icon">${icon('book')}</span><div class="explain-body">${noteHtml(note)}</div>`;
}

// Разметка объяснений: **жирный** и `формула`
const noteHtml = (note) => escapeHtml(note).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>');

// ---------- Диктант ----------
// Фраза только звучит, её нужно набрать на слух и нажать Enter.
// Потом снизу появляется правильная строка: чего не хватает — выделено, лишнее — зачёркнуто
const dictation = () => $('dictation').checked;
// «Перевод»: видна только русская фраза, её нужно набрать по-английски — проверка та же, что в диктанте
const translateMode = () => $('translate-mode').checked;
const freeMode = () => dictation() || translateMode();

// Русский вариант строки; для «Своего текста» переводим через Google и запоминаем
function chunkRu(chunk) {
  if (chunk.ru !== undefined) return chunk.ru;
  chunk.ru = null; // перевод загружается
  translate(chunk.text).then((ru) => { chunk.ru = ru || ''; if (state.chunks[state.index] === chunk) render(); });
  return null;
}

function renderDictation(chunk) {
  const d = state.dict;
  const t = chunk.text;
  const spans = (s, cls) => {
    let html = '';
    for (let i = 0; i < s.length;) {
      let j = i + 1;
      while (j < s.length && cls(j) === cls(i)) j++;
      html += `<span class="${cls(i)}">${escapeHtml(s.slice(i, j))}</span>`;
      i = j;
    }
    return html;
  };

  if (!d.checked) {
    $('typed').innerHTML = escapeHtml(d.input.slice(0, d.caret)) + '<span class="caret"></span>' + escapeHtml(d.input.slice(d.caret));
    if (translateMode()) {
      const ru = chunkRu(chunk);
      $('text').innerHTML = `<span class="tr-prompt">${ru ? escapeHtml(ru) : ru === null ? '…' : 'перевод недоступен'}</span>`;
      $('translation').innerHTML = '<span class="dict-hint">Наберите по-английски · <kbd>Enter</kbd> — проверить</span>';
    } else {
      $('text').innerHTML = `<span class="dict-hint">${icon('headphones')} Слушайте и печатайте · <kbd>Enter</kbd> — проверить · <kbd>Ctrl+Space</kbd> — повторить</span>`;
      $('translation').textContent = '';
    }
    return;
  }

  const { inCls, tCls, errs } = d.res;
  const lk = state.lookup;
  $('typed').innerHTML = spans(d.input, (i) => inCls[i]);
  $('text').innerHTML = spans(t, (i) => tCls[i] + (lk && i >= lk.from && i < lk.to ? ' look' : '')) +
    '<span class="end-hint" title="Нажмите Enter или пробел">␣</span>';
  const verdict = errs
    ? `<b class="dict-bad">${plural(errs, 'ошибка', 'ошибки', 'ошибок')}</b>`
    : '<b class="dict-ok">✓ Без ошибок</b>';
  // В режиме «Перевод» рядом с итогом — русская фраза, которую переводили
  const trText = translateMode() ? chunkRu(chunk) : $('show-tr').checked && chunk.parts[0] ? chunk.parts[0].tr : '';
  $('translation').innerHTML = verdict + (trText ? ` · ${escapeHtml(trText)}` : '');
}

function onDictationKey(e, chunk) {
  const d = state.dict;
  // После проверки Enter или пробел — следующая фраза
  if (d.checked) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nextChunk(); render(); }
    return;
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    if (d.input.trim()) checkDictation(chunk);
    return;
  }
  // Стрелки, Home и End двигают курсор по набранному
  const moves = { ArrowLeft: d.caret - 1, ArrowRight: d.caret + 1, Home: 0, End: d.input.length };
  if (e.key in moves) {
    e.preventDefault();
    d.caret = Math.max(0, Math.min(d.input.length, moves[e.key]));
    render();
    return;
  }
  if (e.key === 'Backspace' || e.key === 'Delete') {
    e.preventDefault();
    if ($('hardcore').checked) { d.input = ''; d.caret = 0; }
    else if (e.key === 'Backspace' && d.caret > 0) {
      d.input = d.input.slice(0, d.caret - 1) + d.input.slice(d.caret);
      d.caret--;
    } else if (e.key === 'Delete') d.input = d.input.slice(0, d.caret) + d.input.slice(d.caret + 1);
    render();
    return;
  }
  if (e.key.length !== 1) return;
  e.preventDefault();
  $('layout-warn').hidden = !/[а-яё]/i.test(e.key);
  if (!state.lineStart) state.lineStart = Date.now();
  d.input = d.input.slice(0, d.caret) + e.key + d.input.slice(d.caret);
  d.caret++;
  render();
}

function checkDictation(chunk) {
  const d = state.dict;
  d.res = compareDictation(d.input, chunk.text);
  d.checked = true;
  recordLine(chunk, d.res.errs === 0);
  state.errors += d.res.errs;
  state.typed += d.res.matched;
  if (state.lineStart) {
    const ms = Date.now() - state.lineStart;
    state.lessonChars += d.res.matched + 1;
    state.lessonMs += ms;
    state.lastSpeed = speedOf(d.res.matched + 1, ms) || state.lastSpeed;
    state.lineStart = 0; // строка уже учтена, finishLine её пропустит
  }
  renderStats();
  render();
}

function accuracy() {
  const total = state.typed + state.errors;
  return total ? Math.round((state.typed / total) * 1000) / 10 : 100;
}

// Статистика обновляется только в начале урока и после каждой набранной строки,
// чтобы цифры не мелькали во время набора
function renderStats() {
  $('cpm').textContent = state.lastSpeed || '—'; // скорость последней набранной строки
  $('acc').textContent = state.typed ? accuracy() + '%' : '—';
  $('errors').textContent = state.errors;
  $('progress').textContent = `${Math.min(state.index + (state.finished ? 0 : 1), state.chunks.length)}/${state.chunks.length}`;
  const best = store.get('best', 0);
  $('best').textContent = best ? `Рекорд: ${best} зн/мин` : '';
}

// ---------- Ввод ----------
function flash(el, cls) {
  if (!el) return;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), 150);
}

const isFormField = (el) => el.tagName === 'TEXTAREA' || el.tagName === 'SELECT';
let ctrlAlone = false; // Ctrl нажат сам по себе, без других клавиш (не Ctrl+Space и т. п.)

function onKeyDown(e) {
  if (e.key === 'Control') { if (!e.repeat) ctrlAlone = true; return; }
  ctrlAlone = false;
  if (isFormField(e.target)) return;

  if (!onTrainer) return; // набор идёт только в тренажёре
  if (e.key === 'Escape') { startLesson(); return; }
  if (e.ctrlKey && e.code === 'Space') { e.preventDefault(); speak(); return; }
  if (e.ctrlKey && e.code === 'KeyK') { e.preventDefault(); toggleKeyboard(!$('show-kb').checked); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  flash(keyByCode[e.code], 'pressed');

  const chunk = state.chunks[state.index];
  if (!chunk || state.finished) return;
  if (freeMode()) { onDictationKey(e, chunk); return; }
  const keepErrors = $('keep-errors').checked;
  if (keepErrors && onEditKey(e, chunk)) return;
  const atEnd = state.pos >= chunk.text.length;

  // Хардкор: Backspace или Delete стирает всю строку (ошибки остаются в счётчике)
  if ((e.key === 'Backspace' || e.key === 'Delete') && $('hardcore').checked) {
    e.preventDefault();
    for (let i = 0; i < state.pos; i++) if (state.chars[i] === chunk.text[i]) state.typed--;
    state.pos = 0;
    state.chars = [];
    state.missed = new Set();
    state.wrongKey = '';
    state.edit = -1;
    render();
    return;
  }

  // В конце строки Enter, как и пробел, переходит на следующую
  if (e.key === 'Enter' && atEnd) {
    e.preventDefault();
    goNextLine(chunk, e);
    return;
  }

  // Backspace стирает последний символ (только в режиме «не исправлять ошибки»)
  if (e.key === 'Backspace' && keepErrors) {
    e.preventDefault();
    if (state.wrongKey) { state.wrongKey = ''; render(); return; }
    if (state.pos === 0) return;
    state.pos--;
    if (state.chars[state.pos] === chunk.text[state.pos]) state.typed--;
    state.chars.length = state.pos;
    state.missed.delete(state.pos); // ошибка остаётся в счётчике, но место можно перепечатать
    render();
    return;
  }

  if (e.key.length !== 1) return;
  e.preventDefault(); // чтобы пробел не прокручивал страницу

  $('layout-warn').hidden = !/[а-яё]/i.test(e.key);

  if (!state.lineStart) state.lineStart = Date.now();

  // Строка набрана — на следующую переходим только по пробелу (или Enter, см. выше)
  if (atEnd) {
    if (e.key === ' ') { goNextLine(chunk, e); return; }
    else {
      state.errors++;
      showWrongKey(e.key);
      flash(keyByCode[e.code], 'wrong');
    }
    render();
    return;
  }

  // Ошибка остаётся в строке, курсор идёт дальше
  if (keepErrors) {
    state.wrongKey = '';
    state.chars[state.pos] = e.key;
    if (e.key === chunk.text[state.pos]) state.typed++;
    else {
      state.errors++;
      state.missed.add(state.pos);
      flash(keyByCode[e.code], 'wrong');
    }
    state.pos++;
    render();
    return;
  }

  if (e.key !== chunk.text[state.pos]) {
    state.errors++;
    state.missed.add(state.pos);
    showWrongKey(e.key);
    flash(keyByCode[e.code], 'wrong');
    render();
    return;
  }

  state.wrongKey = '';
  state.chars[state.pos] = e.key;
  state.typed++;
  state.pos++;
  render();
}

// Стрелки в режиме «Не исправлять ошибки»: курсор ходит по набранному, буква под ним
// заменяется новой, Backspace/Delete удаляют символ до/после курсора. Возвращает true, если клавиша обработана
function onEditKey(e, chunk) {
  const t = chunk.text;
  const setEdit = (p) => { state.edit = p >= state.pos ? -1 : Math.max(0, p); };
  const moves = { ArrowLeft: editPos() - 1, ArrowRight: editPos() + 1, Home: 0, End: state.pos };
  if (e.key in moves) { e.preventDefault(); setEdit(moves[e.key]); render(); return true; }
  if (state.edit < 0) return false; // курсор в конце — обычный набор

  // Пересчитать верные символы строки и отметки ошибок после правки
  const correct = () => state.chars.slice(0, state.pos).filter((c, i) => c === t[i]).length;
  const before = correct();
  const apply = () => {
    state.typed += correct() - before;
    state.missed = new Set(state.chars.map((c, i) => (c !== t[i] ? i : -1)).filter((i) => i >= 0));
    state.wrongKey = '';
    render();
  };

  const p = state.edit;
  if (e.key === 'Backspace') {
    e.preventDefault();
    if (p === 0) return true;
    state.chars.splice(p - 1, 1);
    state.pos--;
    setEdit(p - 1);
    apply();
    return true;
  }
  if (e.key === 'Delete') {
    e.preventDefault();
    state.chars.splice(p, 1);
    state.pos--;
    setEdit(p);
    apply();
    return true;
  }
  if (e.key.length !== 1) return false;
  e.preventDefault();
  if (!state.lineStart) state.lineStart = Date.now();
  state.chars[p] = e.key;
  if (e.key !== t[p]) { state.errors++; flash(keyByCode[e.code], 'wrong'); }
  setEdit(p + 1);
  apply();
  return true;
}

// Неверная буква мелькает красной на месте курсора и через долю секунды исчезает
let wrongTimer = 0;
function showWrongKey(key) {
  state.wrongKey = key;
  clearTimeout(wrongTimer);
  wrongTimer = setTimeout(() => { state.wrongKey = ''; render(); }, 300);
}

// Неисправленные ошибки в строке (бывают только в режиме «Не исправлять ошибки»)
const hasUnfixed = (chunk) => state.chars.some((ch, i) => ch !== chunk.text[i]);

// Переход на следующую строку по пробелу или Enter — только если в строке нет ошибок
function goNextLine(chunk, e) {
  if (hasUnfixed(chunk)) { flash(keyByCode[e.code], 'wrong'); return; }
  state.wrongKey = ''; // лишняя клавиша после конца строки ошибкой в строке не считается
  state.typed++;
  recordLine(chunk, state.errors === state.errorsAtLine);
  nextChunk();
  render();
}

const speedOf =(chars, ms) => (ms > 0 ? Math.round(chars / (ms / 60000)) : 0);

// Скорость строки: верные символы строки (плюс завершающий пробел или Enter)
// за время от первого нажатия до пробела/Enter — пауза перед переходом тоже считается.
// Время между строками (от пробела до первой буквы следующей) не считается нигде
function finishLine(chunk) {
  if (!state.lineStart) return;
  const ms = Date.now() - state.lineStart;
  let chars = 1;
  for (let i = 0; i < chunk.text.length; i++) if (state.chars[i] === chunk.text[i]) chars++;
  state.lessonChars += chars;
  state.lessonMs += ms;
  state.lastSpeed = speedOf(chars, ms) || state.lastSpeed;
  state.lineStart = 0;
}

// Ответ по карточке строки — в повторение. Во всех режимах набора воспроизводится английский: «рус → англ»
function recordLine(chunk, ok) {
  if (chunk.cardId) core.recordAnswer(chunk.cardId, 'ru-en', ok);
}

function nextChunk() {
  finishLine(state.chunks[state.index]);
  state.index++;
  state.errorsAtLine = state.errors;
  state.pos = 0;
  state.missed = new Set();
  state.chars = [];
  state.lookup = null;
  state.dict = newDict();
  state.edit = -1;
  if (state.index >= state.chunks.length) finish();
  else maybeSpeak();
  renderStats();
}

function finish() {
  state.index = state.chunks.length - 1;
  state.pos = state.chunks[state.index].text.length;
  state.finished = true;
  const speed = speedOf(state.lessonChars, state.lessonMs); // средняя по строкам урока
  const best = store.get('best', 0);
  const record = speed > best;
  if (record) { store.set('best', speed); celebrate(); }
  $('result-text').innerHTML =
    `Скорость: <b>${speed}</b> зн/мин (≈${Math.round(speed / 5)} слов/мин)<br>` +
    `Точность: <b>${accuracy()}%</b>, ошибок: <b>${state.errors}</b>` +
    (record ? `<br>${icon('trophy')} Новый рекорд!` : '');
  $('result').hidden = false;
  $('again').focus();
}

// ---------- Слово по Ctrl и «Мои слова» ----------
// Первый Ctrl — выделить слово под курсором и показать предложение с ним и перевод предложения,
// второй — сохранить слово (с переводом) в «Мои слова»
const dict = core.wordTranslations(); // перевод слов из уроков: слово -> перевод
const trCache = {};   // текст -> Promise с переводом

function translate(word, from = 'en', to = 'ru') {
  if (from === 'en' && to === 'ru' && dict[word]) return Promise.resolve(dict[word]);
  const key = `${from}>${to}:${word}`;
  trCache[key] ??= fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=` + encodeURIComponent(word))
    .then((r) => r.json())
    .then((j) => j[0].map((x) => x[0]).join('').trim() || null)
    .catch(() => { delete trCache[key]; return null; });
  return trCache[key];
}

// Слово под курсором (или последнее набранное, если курсор стоит после слова)
function wordAt(t, pos) {
  const isW = (c) => /[A-Za-z']/.test(c || '');
  let i = Math.min(pos, t.length - 1);
  if (!isW(t[i]) && isW(t[i - 1])) i--;
  if (!isW(t[i])) {
    const next = t.slice(i).search(/[A-Za-z]/);
    if (next < 0) return null;
    i += next;
  }
  let from = i, to = i + 1;
  while (isW(t[from - 1])) from--;
  while (isW(t[to])) to++;
  while (t[from] === "'") from++;
  while (to > from && t[to - 1] === "'") to--;
  if (from >= to) return null;
  const raw = t.slice(from, to);
  return { word: raw === 'I' ? raw : raw.toLowerCase(), from, to };
}

const isSaved = (word) => core.hasMyWord(word);

// В слове только буквы и апостроф, поэтому экранировать нечего
const wordRe = (word) => new RegExp(`\\b${word}\\b`, 'i');
// Слово и его формы: exaggerate → exaggerates, exaggerated, exaggerating
const stemRe = (word, flags = 'i') =>
  new RegExp(word.length > 3 ? `\\b${word.replace(/e$/, '')}[a-z]*` : `\\b${word}\\b`, flags);

// Пример предложения со словом: { en, ru } или null.
// Ищем другое предложение, не ту строку, что сейчас набирается: сначала во фразах уроков,
// потом в Tatoeba; если ничего нет — показываем текущую фразу с переводом
async function findExample(word, chunk, from) {
  const found = shuffle(core.phrases()).find((p) => p.term !== chunk.text && wordRe(word).test(p.term));
  if (found) return { en: found.term, ru: found.definition };
  return (await findOnlineExample(word, chunk.text)) || currentSentence(chunk, from);
}

// Предложение текущей строки, в котором стоит слово (для фраз и своего текста)
async function currentSentence(chunk, from) {
  if (core.module(state.lessonId)?.kind === 'phrases') return { en: chunk.text, ru: chunk.parts[0].tr };
  if (state.lessonId !== 'custom') return null;
  const t = chunk.text;
  const start = Math.max(...['.', '!', '?'].map((c) => t.lastIndexOf(c, from - 1))) + 1;
  const ends = ['.', '!', '?'].map((c) => t.indexOf(c, from)).filter((i) => i >= 0);
  const en = t.slice(start, ends.length ? Math.min(...ends) + 1 : t.length).trim();
  return { en, ru: await translate(en) };
}

async function findOnlineExample(word, skip) {
  // Tatoeba — база предложений с переводами, сделанными людьми.
  // Лучше всего — предложение с точно этим словом длиной 5–14 слов
  try {
    const r = await fetch('https://api.tatoeba.org/unstable/sentences?lang=eng&trans:lang=rus&sort=random&limit=50&q=' + encodeURIComponent(word));
    const { data } = await r.json();
    const score = (en) => {
      const n = en.split(' ').length;
      return (wordRe(word).test(en) ? 0 : 10) + Math.max(0, 5 - n) + Math.max(0, n - 14);
    };
    const pairs = data
      .filter((s) => s.translations.length && stemRe(word).test(s.text) && normalize(s.text) !== skip)
      .map((s) => ({ en: normalize(s.text), ru: s.translations[0].text }))
      .sort((a, b) => score(a.en) - score(b.en));
    if (pairs.length) return pairs[0];
  } catch {}
  return null;
}

// В диктанте до проверки фраза скрыта — подсказывать слова нельзя
const textHidden = () => freeMode() && !state.dict.checked;

function onCtrl() {
  const chunk = state.chunks[state.index];
  if (!chunk || textHidden()) return;
  const w = wordAt(chunk.text, state.pos);
  if (!w) return;
  // Повторный Ctrl на том же слове — сохранить; курсор ушёл на другое слово — показать его
  if (state.lookup && state.lookup.from === w.from) { saveLookup(state.lookup); return; }
  const next = { ...w, ex: undefined, saved: isSaved(w.word) };
  state.lookup = next;
  render();
  findExample(w.word, chunk, w.from).then((ex) => { next.ex = ex; if (state.lookup === next) renderLookup(); });
}

// Добавить слово или фразу в «Мои слова» с переводом и примером — фразой, где оно встретилось.
// from — место слова в текущей строке (-1 — неизвестно, например выделено в списке примеров)
async function addToStudy(en, from = -1) {
  const chunk = state.chunks[state.index];
  const known = chunk && (state.lessonId !== 'custom' || from >= 0);
  const [definition, ex] = await Promise.all([translate(en), known ? currentSentence(chunk, from) : null]);
  // в словарных уроках строка — само слово, примером она не служит
  const example = ex && ex.en !== en ? ex : null;
  const added = core.addMyWord({ term: en, definition: definition || '', example: example?.en, exampleTranslation: example?.ru || '' });
  toast(added ? `«${en}» — в «Моих словах»` : `«${en}» уже в «Моих словах»`, 'star');
}

function saveLookup(lk) {
  if (lk.saved) return;
  lk.saved = true;
  renderLookup();
  addToStudy(lk.word, lk.from);
}

// ---------- Панель над словом: произнести, в словарь, ещё фразы ----------
// Появляется при наведении мыши на слово образца и при выделении слова или фразы мышью
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Слово — вместе с формами (stemRe), фраза — как есть
const matchRe = (q, flags = 'i') => (q.includes(' ') ? new RegExp(escapeRe(q), flags) : stemRe(q, flags));
const cleanPhrase = (s) => {
  const text = normalize(s).replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '');
  if (text === 'I') return text;
  if (!text.includes(' ')) return text.toLowerCase();
  // «Let me know» → «let me know», но «I think» остаётся как есть
  return /^I\b/.test(text) ? text : text[0].toLowerCase() + text.slice(1);
};

// Несколько предложений с этим словом/фразой: сначала из уроков, потом из Tatoeba
async function findExamples(q, skip, n = 5) {
  const re = matchRe(q);
  const local = shuffle(core.phrases())
    .filter((p) => p.term !== skip && re.test(p.term))
    .map((p) => ({ en: p.term, ru: p.definition }));
  let online = [];
  if (local.length < n) {
    try {
      const query = q.includes(' ') ? `"${q}"` : q;
      const r = await fetch('https://api.tatoeba.org/unstable/sentences?lang=eng&trans:lang=rus&sort=random&limit=50&q=' + encodeURIComponent(query));
      const { data } = await r.json();
      const len = (en) => { const k = en.split(' ').length; return Math.max(0, 5 - k) + Math.max(0, k - 14); };
      online = data
        .filter((s) => s.translations.length && re.test(s.text))
        .map((s) => ({ en: normalize(s.text), ru: s.translations[0].text }))
        .filter((s) => s.en !== skip && !local.some((l) => l.en === s.en))
        .sort((a, b) => len(a.en) - len(b.en));
    } catch {}
  }
  return [...local, ...online].slice(0, n);
}

// Позиция символа в тексте элемента ↔ узел DOM
function textOffset(root, node, off) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n, k = 0;
  while ((n = w.nextNode())) { if (n === node) return k + off; k += n.length; }
  return -1;
}
function textRange(root, from, to) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const r = document.createRange();
  let n, k = 0, started = false;
  while ((n = w.nextNode())) {
    if (!started && from <= k + n.length) { r.setStart(n, from - k); started = true; }
    if (started && to <= k + n.length) { r.setEnd(n, to - k); return r; }
    k += n.length;
  }
  return null;
}

// Слово образца под указателем мыши: { text, from, to, rect } или null
function wordUnderPointer(x, y) {
  const caret = document.caretRangeFromPoint?.(x, y);
  const chunk = state.chunks[state.index];
  if (!caret || !chunk || textHidden() || !$('text').contains(caret.startContainer)) return null;
  const t = chunk.text;
  const off = textOffset($('text'), caret.startContainer, caret.startOffset);
  const isW = (c) => /[A-Za-z']/.test(c || '');
  let i = isW(t[off]) ? off : isW(t[off - 1]) ? off - 1 : -1;
  if (i < 0) return null;
  let from = i, to = i + 1;
  while (isW(t[from - 1])) from--;
  while (isW(t[to])) to++;
  const range = textRange($('text'), from, to);
  const rect = range && range.getBoundingClientRect();
  if (!rect || x < rect.left - 2 || x > rect.right + 2 || y < rect.top - 2 || y > rect.bottom + 2) return null;
  const text = cleanPhrase(t.slice(from, to));
  return text ? { text, from, to, rect } : null;
}

// Выделенный мышью кусок образца или примера
function selectedTarget() {
  const sel = getSelection();
  if (!sel.rangeCount || sel.isCollapsed) return null;
  const inside = (node) => node && (($('text').contains(node) && !textHidden()) || $('lookup').contains(node));
  if (!inside(sel.anchorNode) || !inside(sel.focusNode)) return null;
  const text = cleanPhrase(sel.toString());
  if (!text) return null;
  const range = sel.getRangeAt(0);
  let from = -1, to = -1;
  if ($('text').contains(range.startContainer) && $('text').contains(range.endContainer)) {
    from = textOffset($('text'), range.startContainer, range.startOffset);
    to = textOffset($('text'), range.endContainer, range.endOffset);
  }
  return { text, from, to, rect: range.getBoundingClientRect(), selected: true };
}

const tools = { target: null, showTimer: 0, hideTimer: 0 };

function showTools(target) {
  const el = $('word-tools');
  tools.target = target;
  el.querySelector('.wt-text').textContent = target.text;
  const add = el.querySelector('[data-act="add"]');
  add.textContent = isSaved(target.text) ? '✓ В словаре' : '+ В словарь';
  add.disabled = isSaved(target.text);
  el.hidden = false;
  const { rect } = target;
  const left = Math.max(8, Math.min(rect.left + rect.width / 2 - el.offsetWidth / 2, innerWidth - el.offsetWidth - 8));
  const above = rect.top - el.offsetHeight - 6;
  el.style.left = `${left}px`;
  el.style.top = `${above > 8 ? above : rect.bottom + 6}px`;
}

function hideTools() {
  clearTimeout(tools.showTimer);
  clearTimeout(tools.hideTimer);
  tools.target = null;
  $('word-tools').hidden = true;
}

function showMore(target) {
  const chunk = state.chunks[state.index];
  const lk = { word: target.text, from: target.from, to: target.to, list: undefined, saved: isSaved(target.text) };
  state.lookup = lk;
  render();
  findExamples(target.text, chunk && chunk.text).then((list) => { lk.list = list; if (state.lookup === lk) renderLookup(); });
}

function initWordTools() {
  const el = $('word-tools');
  const inTools = (x, y) => { const r = el.getBoundingClientRect(); return !el.hidden && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; };

  document.addEventListener('mousemove', (e) => {
    if (tools.target?.selected || !onTrainer) return;
    const { clientX: x, clientY: y } = e;
    if (inTools(x, y)) { clearTimeout(tools.hideTimer); return; }
    const w = wordUnderPointer(x, y);
    if (w && tools.target && w.from === tools.target.from) { clearTimeout(tools.hideTimer); return; }
    clearTimeout(tools.showTimer);
    if (w) tools.showTimer = setTimeout(() => showTools(w), 300);
    if (tools.target) { clearTimeout(tools.hideTimer); tools.hideTimer = setTimeout(hideTools, 250); }
  });

  document.addEventListener('selectionchange', () => {
    const s = selectedTarget();
    if (s) { clearTimeout(tools.showTimer); showTools(s); }
    else if (tools.target?.selected) hideTools();
  });
  addEventListener('scroll', hideTools, { passive: true });
  document.addEventListener('keydown', hideTools); // во время набора панель не нужна

  el.addEventListener('mousedown', (e) => e.preventDefault()); // не сбрасывать выделение
  el.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    const target = tools.target;
    if (!btn || !target) return;
    const act = btn.dataset.act;
    if (act === 'speak') speakText(target.text);
    if (act === 'more') { hideTools(); getSelection().removeAllRanges(); showMore(target); }
    if (act === 'add') {
      btn.disabled = true;
      btn.textContent = 'Добавляю…';
      await addToStudy(target.text, target.from);
      if (state.lookup && state.lookup.word === target.text) { state.lookup.saved = true; renderLookup(); }
      if (tools.target === target) btn.textContent = '✓ В словаре';
    }
  });

  $('lookup').addEventListener('click', (e) => {
    if (e.target.closest('.lookup-close')) { state.lookup = null; render(); }
  });
}

function renderLookup() {
  const lk = state.lookup;
  const el = $('lookup');
  el.hidden = !lk;
  if (!lk) return;
  if ('list' in lk) { el.innerHTML = renderExampleList(lk); return; }
  const hint = lk.saved ? '✓ в «Моих словах»' : 'Ctrl ещё раз — сохранить в «Мои слова»';
  let body;
  if (lk.ex === undefined) body = '<span class="lookup-ru">…</span>';
  else if (!lk.ex) body = `<span class="lookup-ru">Пример с «${escapeHtml(lk.word)}» не найден</span>`;
  else {
    const en = escapeHtml(lk.ex.en).replace(stemRe(lk.word, 'gi'), '<mark>$&</mark>');
    body = `<span class="lookup-en">${en}</span><span class="lookup-ru">${escapeHtml(lk.ex.ru || 'перевод недоступен')}</span>`;
  }
  el.innerHTML = `<div class="lookup-body">${body}</div><span class="lookup-hint">${hint}</span>`;
}

// «Ещё фразы»: список предложений со словом или фразой
function renderExampleList(lk) {
  const head = `<div class="lookup-head">Фразы с «${escapeHtml(lk.word)}»` +
    `${lk.saved ? ' <span class="lookup-hint">✓ в «Моих словах»</span>' : ''}` +
    '<button class="lookup-close" title="Закрыть">×</button></div>';
  let body;
  if (lk.list === undefined) body = '<span class="lookup-ru">…</span>';
  else if (!lk.list.length) body = '<span class="lookup-ru">Других фраз не найдено</span>';
  else {
    body = lk.list.map((ex) => {
      const en = escapeHtml(ex.en).replace(matchRe(lk.word, 'gi'), '<mark>$&</mark>');
      return `<li><span class="lookup-en">${en}</span><span class="lookup-ru">${escapeHtml(ex.ru || '')}</span></li>`;
    }).join('');
    body = `<ul class="lookup-list">${body}</ul>`;
  }
  return `<div class="lookup-body">${head}${body}</div>`;
}

// ---------- Экраны: главная, папка, модуль, редактор, тренажёр ----------
// Адреса: #/ — главная, #/folder/<id> — папка, #/module/<id> — модуль,
// #/module/<id>/type — набор по модулю, #/module/<id>/edit — правка своего модуля,
// #/new или #/new/<папка> — новый модуль, #/custom — «Свой текст»
// «Свой текст» — не модуль, а режим тренажёра; живёт в системной папке «Своё» рядом с «Моими словами»
const SPECIAL = {
  custom: { title: 'Свой текст', group: 'own' },
  today: { title: 'Повторить сегодня', group: null },
};

// Колода для режимов: карточки модуля или очередь «Сегодня» (id 'today') — слова всех модулей, срок которых наступил
function deckCards(id) {
  if (id === 'today') return core.dueCards().map((x) => x.card);
  const starred = starredOnly(id) ? core.starredCards(id) : [];
  return starred.length ? starred : core.module(id).cards;
}
const deckHref = (id) => (id === 'today' ? '#/today' : `#/module/${id}`);
// Порядок на главной: сначала свои папки, потом встроенные (системная «Своё» — последняя из них)
const allFolders = () => {
  const list = core.folders();
  return [...list.filter((f) => !f.builtIn), ...list.filter((f) => f.builtIn)];
};
const folderOf = (id) => allFolders().find((f) => f.id === id);
// Папки, куда можно положить свой модуль, — все
const moduleFolders = allFolders;
const isOwnModule = (id) => core.module(id)?.builtIn === false;
const escapeAttr = (s) => escapeHtml(s).replace(/"/g, '&quot;');
// Название, значок и папка — для модуля или особого урока
const lessonInfo = (id) => {
  const m = core.module(id);
  return m ? { title: m.title, icon: m.icon, group: m.folderId } : SPECIAL[id];
};

const plural = (n, one, few, many) => {
  const m10 = n % 10, m100 = n % 100;
  const w = m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
  return `${n} ${w}`;
};

function lessonCount(id) {
  if (id === 'custom') return 'любой текст';
  const m = core.module(id);
  return m.kind === 'words' ? plural(m.cards.length, 'слово', 'слова', 'слов') : plural(m.cards.length, 'фраза', 'фразы', 'фраз');
}

// Уроки папки — её модули, в «Своём» ещё и «Свой текст»
const folderLessons = (folderId) => [...core.modules(folderId).map((m) => m.id),
  ...Object.keys(SPECIAL).filter((id) => SPECIAL[id].group === folderId && canType())];
// Модуль открывается своей страницей, «Свой текст» — сразу тренажёром
const lessonHref = (id) => (id === 'custom' ? '#/custom' : `#/module/${id}`);
const lessonCards = (id) => core.module(id).cards;

// Плашка модуля: цветной квадрат с буквами названия («Co», «A1»), у особых — значок.
// Цвет постоянный для модуля — выбирается по его id
const BADGE_COLORS = ['#4255ff', '#18ae79', '#f28b2c', '#e2557c', '#20b5c4', '#8b5cf6', '#d4a017'];
const BADGE_ICONS = { mine: 'star', custom: 'file', today: 'calendar' };
function monogram(title) {
  const level = title.match(/\b[ABC][12]\b/);
  if (level) return level[0];
  const word = (title.match(/[\p{L}\d]+/gu) || ['?'])[0];
  return word[0].toUpperCase() + (word[1] || '');
}
function lessonBadge(id, cls = '') {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const inner = BADGE_ICONS[id] ? icon(BADGE_ICONS[id]) : escapeHtml(monogram(lessonInfo(id).title));
  return `<span class="badge ${cls}" style="--badge:${BADGE_COLORS[h % BADGE_COLORS.length]}">${inner}</span>`;
}

// extra — что-то под подписью, например полоска прогресса; cls — дополнительный класс плитки
// attrs — data-tile-module / data-tile-folder: по ним меню плитки (правая кнопка мыши) знает, что это
const tile = (href, iconHtml, title, sub, extra = '', cls = '', attrs = '') =>
  `<a class="tile ${cls}" href="${href}"${attrs}><span class="tile-icon">${iconHtml}</span>` +
  `<span class="tile-text"><b>${escapeHtml(title)}</b><small>${sub}</small>${extra}</span></a>`;
const dueNote = (n) => (n ? ` · <span class="due-count">ждут: ${n}</span>` : '');
// Полоска «выучено X%»: показываем, когда модуль уже начат
const progressBar = (s) => (s.seen && s.total
  ? `<span class="progress" title="Выучено ${Math.round((s.learned / s.total) * 100)}%">` +
    `<span style="width:${Math.max(3, (s.learned / s.total) * 100)}%"></span></span>`
  : '');
const lessonTile = (id) => {
  const l = lessonInfo(id);
  if (SPECIAL[id]) return tile(lessonHref(id), lessonBadge(id), l.title, lessonCount(id));
  const s = core.moduleStats(id);
  return tile(lessonHref(id), lessonBadge(id), l.title, lessonCount(id) + dueNote(s.due), progressBar(s), '',
    ` data-tile-module="${escapeAttr(id)}"`);
};
const folderTile = (f) => {
  const ids = folderLessons(f.id);
  return tile(`#/folder/${f.id}`, icon('folder'), f.title,
    plural(ids.length, 'модуль', 'модуля', 'модулей') + dueNote(core.dueCount(f.id)), '', f.builtIn ? '' : 'own',
    ` data-tile-folder="${escapeAttr(f.id)}"`);
};
const tilesSection = (title, tiles, actions = '') =>
  `<section class="tiles-section"><div class="section-head"><h2>${escapeHtml(title)}</h2>${actions}</div>` +
  `<div class="tiles">${tiles.join('')}</div></section>`;
const actionBtn = (act, label, cls = '') => `<button class="pill-btn ${cls}" data-act="${act}">${label}</button>`;
const actionLink = (href, label) => `<a class="pill-btn" href="${href}">${label}</a>`;

// ---------- Отклик: уведомления и конфетти ----------
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Короткое уведомление внизу экрана
function toast(text, iconName = 'check') {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `${icon(iconName)}${escapeHtml(text)}`;
  $('toasts').append(el);
  setTimeout(() => el.classList.add('out'), 2400);
  setTimeout(() => el.remove(), 2800);
}

// ---------- Окна вопросов вместо prompt и confirm браузера ----------
// openDialog → Promise: с полем ввода — введённый текст или null, без поля — true / false
// choices — [[значение, подпись], …]: вместо поля ввода список, результат — выбранное значение
// cancelLabel — подпись второй кнопки. Результат без поля: true — первая кнопка, false — вторая,
// null — закрыли окно (Esc или нажатие мимо)
function openDialog({ title, text = '', input = null, choices = null, value = '', ok = 'Готово', cancelLabel = 'Отмена', danger = false }) {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = 'dialog';
    d.innerHTML = `<form class="dialog-body"><h2>${escapeHtml(title)}</h2>` +
      (text ? `<p>${escapeHtml(text)}</p>` : '') +
      (input ? `<input class="dialog-input" value="${escapeAttr(input.value || '')}" placeholder="${escapeAttr(input.placeholder || '')}" maxlength="80" enterkeyhint="done">` : '') +
      (choices ? `<select class="dialog-input">${choices.map(([v, label]) =>
        `<option value="${escapeAttr(v)}"${v === value ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('')}</select>` : '') +
      `<div class="dialog-actions"><button type="button" class="pill-btn" data-dialog="cancel">${escapeHtml(cancelLabel)}</button>` +
      `<button class="primary-btn${danger ? ' danger' : ''}">${escapeHtml(ok)}</button></div></form>`;
    document.body.append(d);
    const field = d.querySelector('.dialog-input');
    const cancel = () => finish(input || choices ? null : false);
    function finish(result) {
      d.close();
      d.remove();
      resolve(result);
    }
    d.querySelector('[data-dialog="cancel"]').addEventListener('click', cancel);
    d.addEventListener('cancel', (e) => { e.preventDefault(); finish(null); }); // Esc
    d.addEventListener('click', (e) => { if (e.target === d) finish(null); }); // нажали мимо окна
    d.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (field && !field.value.trim()) { field.focus(); return; }
      finish(field ? field.value.trim() : true);
    });
    d.showModal();
    if (field && input) { field.focus(); field.select(); }
  });
}
const askText = (title, { value = '', placeholder = '', ok = 'Готово' } = {}) => openDialog({ title, input: { value, placeholder }, ok });
const askConfirm = (title, text, ok = 'Удалить') => openDialog({ title, text, ok, danger: true });

// Конфетти за хороший результат: ~120 бумажек падают и кружатся пару секунд
function celebrate() {
  if (reducedMotion()) return;
  const canvas = $('confetti');
  const ctx = canvas.getContext('2d');
  const W = canvas.width = innerWidth;
  const H = canvas.height = innerHeight;
  canvas.hidden = false;
  const colors = ['#4255ff', '#3ccfcf', '#ffcd1f', '#ff7eb6', '#18ae79'];
  const bits = Array.from({ length: 120 }, () => ({
    x: W / 2 + (Math.random() - .5) * W * .3, y: H * .35,
    vx: (Math.random() - .5) * 14, vy: -Math.random() * 12 - 4,
    size: 6 + Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - .5) * .3,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
  const start = performance.now();
  (function frame(t) {
    ctx.clearRect(0, 0, W, H);
    for (const b of bits) {
      b.vy += .35; b.vx *= .99; b.x += b.vx; b.y += b.vy; b.rot += b.vr;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.fillStyle = b.color;
      ctx.fillRect(-b.size / 2, -b.size / 4, b.size, b.size / 2);
      ctx.restore();
    }
    if (t - start < 2600) requestAnimationFrame(frame);
    else { ctx.clearRect(0, 0, W, H); canvas.hidden = true; }
  })(start);
}

// Статистика вверху главной: серия дней, ответы сегодня, выученные слова
function renderHomeStats() {
  const a = core.activity();
  const stat = (icon, value, label, cls = '') =>
    `<div class="stat ${cls}"><span class="stat-icon">${icon}</span><span class="stat-text"><b>${value}</b><small>${label}</small></span></div>`;
  return '<section class="stats-row">' +
    stat(icon('flame'), a.streak, plural(a.streak, 'день подряд', 'дня подряд', 'дней подряд').replace(/^\d+ /, ''), a.streak ? 'hot' : '') +
    stat(icon('pen'), a.today, `${plural(a.today, 'ответ', 'ответа', 'ответов').replace(/^\d+ /, '')} сегодня`) +
    stat(icon('trophy'), a.learned, plural(a.learned, 'слово выучено', 'слова выучено', 'слов выучено').replace(/^\d+ /, '')) +
    '</section>';
}

// Плашка «Повторить сегодня» вверху главной
function todayBanner() {
  const n = core.dueCount();
  if (!n) {
    return `<div class="today-banner calm"><span class="mode-icon">${icon('calendar')}</span><span class="tile-text">` +
      '<b>На сегодня повторять нечего</b><small>Слова, которые вы учили, появятся здесь, когда придёт срок повторить</small></span></div>';
  }
  return `<a class="today-banner" href="#/today"><span class="mode-icon">${icon('calendar')}</span><span class="tile-text">` +
    `<b>Повторить сегодня: ${plural(n, 'слово', 'слова', 'слов')}</b><small>Из всех модулей, срок которых наступил</small></span>` +
    '<span class="today-go">Повторить →</span></a>';
}

function renderToday() {
  const due = core.dueCards();
  const modules = new Set(due.map((x) => x.moduleId)).size;
  const head = `<section class="module-head">${lessonBadge('today', 'badge-lg')}` +
    `<div><h1>Повторить сегодня</h1><small>${due.length ? `${plural(due.length, 'слово', 'слова', 'слов')} из ${plural(modules, 'модуля', 'модулей', 'модулей')}` : 'всё повторено'}</small></div></section>`;
  if (!due.length) return `${head}<p class="empty">На сегодня всё повторено. Возвращайтесь завтра или учите новые модули.</p>`;
  const mode = (path, icon, title, sub) =>
    `<a class="mode-btn" data-mode="${path}" href="#/today/${path}"><span class="mode-icon">${icon}</span><span class="tile-text"><b>${title}</b><small>${sub}</small></span></a>`;
  return head + '<div class="modes">' +
    mode('cards', icon('cards'), 'Карточки', 'Переворачивать и отмечать «знаю / не знаю»') +
    mode('learn', icon('target'), 'Заучивание', 'Выбор из вариантов, потом ввод ответа') +
    mode('test', icon('test'), 'Тест', 'Вопросы разных типов и оценка в конце') +
    mode('match', icon('match'), 'Подбор пар', 'Соединить термины с переводами на время') +
    (canTypeDeck('today') ? mode('type', icon('keyboard'), 'Набор', 'Печатать английские слова и фразы, диктант, перевод на английский') : '') +
    '</div>' +
    `<ol class="card-list">${due.map(({ card: c, moduleId }) =>
      `<li><span class="card-term">${escapeHtml(c.term)}<small class="card-module">${escapeHtml(lessonInfo(moduleId).title)}</small></span>` +
      `<span class="card-def">${escapeHtml(c.definition || '—')}</span></li>`).join('')}</ol>`;
}

// ---------- Главная для гостя ----------
// Без входа ничего сделать нельзя: рассказываем о платформе и зовём войти через Google.
// Карточку-пример на первом экране можно попробовать без входа
const LANDING_DEMO = [
  ['serendipity', 'счастливая случайность'],
  ['Коленвал', 'вал двигателя, который превращает движение поршней во вращение'],
  ['raamat', 'книга'],
  ['Фотосинтез', 'как растения делают сахар из света, воды и углекислого газа'],
];

function renderLanding() {
  const cta = (text, cls = '') => `<button class="cta-btn ${cls}" data-act="sign-in">${text}${icon('arrow')}</button>`;
  // from — с какого числа считать: стоимость «падает» со 100 до 0
  const stat = (n, suffix, title, sub, from = 0) =>
    `<div class="land-stat"><b><span data-count="${n}" data-from="${from}">${n}</span>${suffix}</b><span>${title}</span><small>${sub}</small></div>`;
  const mode = (m, iconName, title, sub, tag = '') =>
    `<article class="land-mode reveal" data-mode="${m}"><span class="mode-icon">${icon(iconName)}</span>` +
    `<b>${title}</b><p>${sub}</p>${tag ? `<span class="land-tag">${tag}</span>` : ''}</article>`;
  const perk = (iconName, title, sub) =>
    `<li class="reveal"><span class="perk-icon">${icon(iconName)}</span><b>${title}</b><small>${sub}</small></li>`;
  // Сравнение: на компьютере — таблица по строкам, на телефоне — две карточки «Тетрадка» и «Klava»
  const compare = [
    ['Повторяете всё подряд или ничего', 'Повторяете только то, что начинаете забывать'],
    ['Непонятно, что уже выучено', 'Прогресс по каждой карточке в обе стороны'],
    ['Скучно — бросаете через неделю', 'Пять режимов, игра на время и серии дней'],
    ['Нет произношения', 'Слова звучат вслух'],
    ['Тетрадь осталась дома', 'Модули с вами на любом устройстве'],
  ];
  const row = (bad, good) => `<li><span class="cmp-bad">${icon('x')}${bad}</span><span class="cmp-good">${icon('check')}${good}</span></li>`;
  const cmpCard = (cls, title, side, iconName) => `<div class="cmp-card ${cls}"><h3>${title}</h3><ul>` +
    compare.map((pair) => `<li>${icon(iconName)}${pair[side]}</li>`).join('') + '</ul></div>';
  const step = (n, title, sub) => `<li class="reveal"><span class="step-num">${n}</span><b>${title}</b><small>${sub}</small></li>`;
  const faq = (q, a) => `<details class="land-faq-item"><summary>${q}${icon('plus')}</summary><p>${a}</p></details>`;
  const [term, def] = LANDING_DEMO[0];

  return '<div class="landing">' +
    // Первый экран: обещание, кнопка входа и живая карточка
    '<section class="land-hero">' +
      '<div class="land-hero-text">' +
        `<span class="land-eyebrow">${icon('sparkle')} Бесплатная платформа для запоминания</span>` +
        '<h1>Запоминайте что угодно — <span class="land-grad">навсегда</span>, а не до завтра</h1>' +
        '<p>Иностранные слова, термины по работе и учёбе, определения к экзамену. Соберите модуль — и учите его ' +
        'карточками, тестами и игрой на скорость. Klava сама считает, что повторить сегодня: 10 минут в день, ' +
        'и знания остаются в долговременной памяти.</p>' +
        `<div class="land-cta">${cta('Начать бесплатно')}<button class="ghost-btn" data-scroll="land-how">Как это работает</button></div>` +
        `<ul class="land-trust"><li>${icon('check')}Бесплатно</li><li>${icon('check')}Без рекламы</li><li>${icon('check')}Вход через Google за 5 секунд</li></ul>` +
      '</div>' +
      '<div class="land-demo">' +
        `<span class="land-chip chip-a">${icon('flame')}Серия 12 дней</span>` +
        `<span class="land-chip chip-b">${icon('calendar')}Повтор через 3 дня</span>` +
        `<div class="demo-label">${icon('play')}Попробуйте: нажмите на карточку</div>` +
        `<button class="demo-card" id="demo-card" aria-label="Перевернуть карточку"><span class="demo-inner">` +
          `<span class="demo-face front"><small>Термин</small><b id="demo-term">${term}</b></span>` +
          `<span class="demo-face back"><small>Перевод</small><b id="demo-def">${def}</b></span>` +
        '</span></button>' +
        '<div class="demo-actions" id="demo-actions">' +
          `<button class="demo-btn bad" data-demo="0">${icon('x')}Не знаю</button>` +
          `<span class="demo-count" id="demo-count">1 / ${LANDING_DEMO.length}</span>` +
          `<button class="demo-btn ok" data-demo="1">${icon('check')}Знаю</button>` +
        '</div>' +
        '<div class="demo-progress"><span id="demo-bar"></span></div>' +
      '</div>' +
    '</section>' +

    // Цифры
    '<section class="land-stats reveal">' +
      stat(5, '', 'режимов обучения', 'карточки, заучивание, тест, пары, набор') +
      stat(5, '', 'ступеней повторения', 'через 1, 3, 7, 14 и 30 дней') +
      stat(3, '', 'языка', 'английский, русский и эстонский — с озвучкой') +
      stat(100, '%', 'ваши данные', 'модули и прогресс видите только вы') +
      stat(0, '&nbsp;€', 'стоимость', 'без подписки и платных уровней', 100) +
    '</section>' +

    // Почему забываем и как помогает интервальное повторение
    '<section class="land-science">' +
      '<div class="land-science-text reveal">' +
        '<span class="land-kicker">Почему слова забываются</span>' +
        '<h2>Без повторения мозг стирает новое за считанные дни</h2>' +
        '<p>Это кривая забывания — её ещё в XIX веке описал психолог Герман Эббингауз. Зубрёжка накануне не спасает: ' +
        'через неделю от выученного остаются обрывки.</p>' +
        '<p>Секрет — повторять слово или термин именно тогда, когда он начинает ускользать. С каждым повтором память держит его ' +
        'дольше. <b>Klava считает эти моменты за вас</b> и каждый день собирает подборку «Повторить сегодня».</p>' +
        '<ol class="land-boxes">' + [1, 3, 7, 14, 30].map((d, i) =>
          `<li style="--i:${i}"><b>${d}</b><small>${plural(d, 'день', 'дня', 'дней').replace(/^\d+ /, '')}</small></li>`).join('') + '</ol>' +
      '</div>' +
      '<figure class="land-curve reveal">' +
        '<svg viewBox="0 0 560 280" role="img" aria-label="Кривая забывания без повторения и с повторением">' +
          '<path class="curve-grid" d="M40 30H540M40 90H540M40 150H540M40 210H540"/>' +
          '<path class="curve-axis" d="M40 20V250H545"/>' +
          '<path class="curve-forget" d="M40 30C70 160 130 205 540 232"/>' +
          '<path class="curve-klava" d="M40 30Q46 78 57 92L57 30Q68 66 90 80L90 30Q112 58 157 66L157 30Q195 48 273 54L273 30Q360 40 540 43"/>' +
          [57, 90, 157, 273].map((x) => `<circle class="curve-dot" cx="${x}" cy="30" r="5"/>`).join('') +
          '<text x="540" y="22" text-anchor="end" class="curve-label klava">с Klava</text>' +
          '<text x="540" y="212" text-anchor="end" class="curve-label forget">без повторения</text>' +
          '<text x="34" y="34" text-anchor="end" class="curve-tick">100%</text>' +
          '<text x="34" y="254" text-anchor="end" class="curve-tick">0</text>' +
          '<text x="540" y="272" text-anchor="end" class="curve-tick">30 дней</text>' +
        '</svg>' +
        '<figcaption>Точки — повторения, которые назначает Klava</figcaption>' +
      '</figure>' +
    '</section>' +

    // Режимы
    '<section class="land-section">' +
      '<span class="land-kicker">Пять способов выучить слово</span>' +
      '<h2>Учите так, как удобно именно вам</h2>' +
      '<div class="land-modes">' +
        mode('cards', 'cards', 'Карточки', 'Переворачивайте и отмечайте «знаю / не знаю». На телефоне — смахивайте влево и вправо.', 'Быстрое знакомство') +
        mode('learn', 'target', 'Заучивание', 'Сначала выбор из вариантов, потом ввод ответа. Ошибки возвращаются, пока не выучите.', 'Самый эффективный') +
        mode('test', 'test', 'Тест', 'Вопросы разных типов и оценка в конце — проверьте себя перед экзаменом.') +
        mode('match', 'match', 'Подбор пар', 'Соединяйте термины с определениями на время и бейте собственный рекорд.', 'Игра') +
        mode('type', 'keyboard', 'Набор текста', 'Печатайте английские слова и фразы, пишите диктант на слух и переводите на английский.', 'Только в Klava') +
      '</div>' +
    '</section>' +

    // Всё остальное
    '<section class="land-section">' +
      '<span class="land-kicker">И ещё десяток мелочей</span>' +
      '<h2>Всё, чтобы учить было легко</h2>' +
      '<ul class="land-perks">' +
        perk('book', 'Любые термины', 'Коленвал, фотосинтез, статья закона — модуль с определениями на одном языке') +
        perk('download', 'Импорт из Quizlet', 'Перенесите свои модули за минуту — вставьте экспорт или таблицу') +
        perk('translate', 'Автоперевод', 'Введите слово — перевод между английским, русским и эстонским подставится сам') +
        perk('image', 'Картинки', 'Добавьте изображение к слову — запоминается в разы легче') +
        perk('volume', 'Озвучка', 'Слова звучат на английском, русском и эстонском — голосами вашего браузера') +
        perk('star', 'Избранное', 'Отмечайте трудные слова и учите только их') +
        perk('folder', 'Папки и модули', 'Раскладывайте слова по темам, урокам и экзаменам') +
        perk('chart', 'Статистика и серии', 'Сколько выучено, сколько повторить и сколько дней подряд вы учитесь') +
        perk('phone', 'На всех устройствах', 'Начали на компьютере — продолжили в телефоне, прогресс общий') +
      '</ul>' +
    '</section>' +

    // Сравнение
    '<section class="land-section">' +
      '<span class="land-kicker">Честное сравнение</span>' +
      '<h2>Тетрадка или Klava</h2>' +
      '<ul class="land-compare reveal">' +
        '<li class="cmp-head"><span>Тетрадка и зубрёжка</span><span>Klava</span></li>' +
        compare.map(([bad, good]) => row(bad, good)).join('') +
      '</ul>' +
      '<div class="cmp-cards reveal">' +
        cmpCard('bad', 'Тетрадка и зубрёжка', 0, 'x') +
        '<span class="cmp-vs">vs</span>' +
        cmpCard('good', `<img class="brand-mark" src="img/klava-icon.svg" alt="">Klava`, 1, 'check') +
      '</div>' +
    '</section>' +

    // Как начать
    '<section class="land-section" id="land-how">' +
      '<span class="land-kicker">Как начать</span>' +
      '<h2>Три шага — и вы уже учите</h2>' +
      '<ol class="land-steps">' +
        step(1, 'Войдите через Google', 'Один клик, без паролей и анкет') +
        step(2, 'Создайте модуль', 'Слова с переводами или термины с определениями — свои или из Quizlet') +
        step(3, 'Повторяйте 10 минут в день', 'Klava подскажет, какие слова повторить сегодня') +
      '</ol>' +
    '</section>' +

    // Вопросы
    '<section class="land-section land-faq">' +
      '<span class="land-kicker">Вопросы</span>' +
      '<h2>Частые вопросы</h2>' +
      faq('Это правда бесплатно?', 'Да. Все режимы, модули, папки и повторение доступны бесплатно, без пробного периода и рекламы.') +
      faq('Зачем входить через Google?', 'Чтобы ваши модули и прогресс сохранялись в облаке и были доступны на любом устройстве. ' +
        'Пароль придумывать не нужно, Klava получает только вашу почту.') +
      faq('Что можно учить?', 'Иностранные слова — с переводом, озвучкой и автопереводом: пока для английского, русского ' +
        'и эстонского. И любые термины с определениями: устройство автомобиля, медицину, право, историю — всё, что нужно запомнить.') +
      faq('Кто видит мои модули?', 'Только вы. Данные хранятся в защищённой базе, и доступ к ним есть только у вашего аккаунта.') +
      faq('У меня уже есть модули в Quizlet', 'Экспортируйте модуль в Quizlet и вставьте текст в Klava — слова и переводы перенесутся за минуту.') +
      faq('Работает ли на телефоне?', 'Да, сайт подстраивается под экран: карточки можно смахивать пальцем, прогресс общий с компьютером.') +
    '</section>' +

    // Финальный призыв
    '<section class="land-final reveal">' +
      '<h2>Начните сегодня — первые слова и термины запомнятся уже через неделю</h2>' +
      '<p>Вход занимает 5 секунд. Никаких карт и подписок.</p>' +
      cta('Войти через Google', 'light') +
    '</section>' +
    '<footer class="land-footer"><img class="brand-mark" src="img/klava-icon.svg" alt="">Klava — запоминайте с удовольствием</footer>' +
  '</div>';
}

// Анимации главной: появление блоков при прокрутке, счётчики цифр, карточка-пример
function initLanding() {
  const root = $('page-body').querySelector('.landing');
  const countUp = (el) => {
    const target = +el.dataset.count;
    const from = +el.dataset.from;
    if (reducedMotion() || target === from) return;
    const start = performance.now();
    const ms = from > target ? 1800 : 1200;
    (function frame(t) {
      const k = Math.min(1, (t - start) / ms);
      el.textContent = Math.round(from + (target - from) * (1 - (1 - k) ** 3));
      if (k < 1) requestAnimationFrame(frame);
    })(start);
  };
  const show = (el) => {
    el.classList.add('shown');
    el.querySelectorAll('[data-count]').forEach(countUp);
  };
  // Показываем всё, что уже дошло до экрана или осталось выше него: после перезагрузки браузер
  // возвращает прокрутку в середину страницы, и блоки выше не должны остаться невидимыми
  root.classList.add('animate');
  let pending = [...root.querySelectorAll('.reveal')];
  let frame = 0;
  const check = () => {
    frame = 0;
    if (!root.isConnected) { removeEventListener('scroll', onScroll); return; }
    pending = pending.filter((el) => {
      const r = el.getBoundingClientRect();
      // скрытый на этой ширине блок (height 0) тоже показываем — вдруг экран повернут
      const reached = r.top < innerHeight * .9 || (!r.height && !r.width);
      if (reached) show(el);
      return !reached;
    });
    if (!pending.length) removeEventListener('scroll', onScroll);
  };
  const onScroll = () => { frame ||= requestAnimationFrame(check); };
  addEventListener('scroll', onScroll, { passive: true });
  check();
  // прокрутку, восстановленную браузером после загрузки, ловим ещё и так — на случай, если события прокрутки не было
  setTimeout(check, 300);
  addEventListener('load', check, { once: true });

  root.addEventListener('click', (e) => {
    const to = e.target.closest('[data-scroll]')?.dataset.scroll;
    if (to) $(to).scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' });
  });

  const card = $('demo-card');
  let i = 0;
  let known = 0;
  card.addEventListener('click', () => card.classList.toggle('flipped'));
  $('demo-actions').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-demo]');
    if (!btn) return;
    known += +btn.dataset.demo;
    i++;
    $('demo-bar').style.width = `${(i / LANDING_DEMO.length) * 100}%`;
    card.classList.remove('flipped');
    card.classList.add(btn.dataset.demo === '1' ? 'out-right' : 'out-left');
    setTimeout(() => {
      card.classList.remove('out-right', 'out-left');
      if (i >= LANDING_DEMO.length) {
        card.querySelector('.front small').textContent = 'Вы знаете';
        $('demo-term').textContent = `${known} из ${LANDING_DEMO.length}`;
        $('demo-def').textContent = 'Войдите и создайте свой модуль';
        card.classList.add('done');
        $('demo-actions').innerHTML = `<button class="cta-btn" data-act="sign-in">Создать свой модуль${icon('arrow')}</button>`;
        if (known === LANDING_DEMO.length) celebrate();
        return;
      }
      [$('demo-term').textContent, $('demo-def').textContent] = LANDING_DEMO[i];
      card.classList.toggle('long', LANDING_DEMO[i][1].length > 30);
      $('demo-count').textContent = `${i + 1} / ${LANDING_DEMO.length}`;
    }, reducedMotion() ? 0 : 260);
  });
}

// Стартовый экран для новичка после входа: своих модулей со словами ещё нет — предлагаем создать или импортировать
function renderWelcome() {
  const action = (attrs, mode, iconName, title, sub) =>
    `<${attrs.href ? 'a' : 'button'} class="mode-btn welcome-card" data-mode="${mode}"` +
    Object.entries(attrs).map(([k, v]) => ` ${k}="${v}"`).join('') +
    `><span class="mode-icon">${icon(iconName)}</span><span class="tile-text"><b>${title}</b><small>${sub}</small></span></${attrs.href ? 'a' : 'button'}>`;
  const step = (n, iconName, title, sub) =>
    `<li><span class="step-num">${n}</span><span class="step-icon">${icon(iconName)}</span><b>${title}</b><small>${sub}</small></li>`;
  return '<section class="welcome">' +
    '<div class="welcome-hero"><img class="brand-mark big" src="img/klava-icon.svg" alt="Klava">' +
    '<h1>Учите что угодно так, как удобно вам</h1>' +
    '<p>Соберите свой модуль — слова с переводами или термины с определениями — и запоминайте его карточками, заучиванием, тестами ' +
    'и игрой на скорость. Klava сама напомнит, когда пора повторить.</p></div>' +
    '<div class="welcome-actions">' +
    action({ href: '#/new' }, 'cards', 'plus', 'Создать модуль', 'Добавьте слова и переводы — перевод подставится сам') +
    action({ href: '#/import' }, 'learn', 'download', 'Импорт из Quizlet', 'Вставьте экспорт модуля или список из таблицы') +
    action({ 'data-act': 'new-folder' }, 'match', 'folder', 'Создать папку', 'Разложите модули по темам') +
    '</div>' +
    '<h2 class="welcome-title">Как это работает</h2><ol class="welcome-steps">' +
    step(1, 'pen', 'Соберите модуль', 'Своими словами или импортом из Quizlet, с картинками и примерами') +
    step(2, 'cards', 'Учите в режимах', 'Карточки, заучивание, тест, подбор пар и набор текста') +
    step(3, 'calendar', 'Повторяйте вовремя', 'Слова возвращаются через 1, 3, 7, 14 и 30 дней — пока не запомнятся') +
    '</ol></section>';
}

function renderHome() {
  // нет ни встроенных уроков, ни своих модулей со словами — стартовый экран
  if (!core.modules().some((m) => m.builtIn || m.cards.length)) return renderWelcome();
  const recent = core.recent().filter((id) => lessonInfo(id) && !core.isHidden(id));
  return renderHomeStats() + todayBanner() + (recent.length ? tilesSection('Недавние', recent.map(lessonTile)) : '') +
    tilesSection('Папки', allFolders().map(folderTile),
      `<div class="page-actions">${actionLink('#/new', '+ Модуль')}${actionBtn('new-folder', '+ Папка')}${actionLink('#/import', 'Импорт')}</div>`);
}

function renderFolder(folderId) {
  const f = folderOf(folderId);
  const ids = folderLessons(folderId);
  let actions = '';
  actions += actionLink(`#/new/${folderId}`, '+ Модуль') + actionLink(`#/import/folder/${folderId}`, 'Импорт');
  if (!f.builtIn) actions += actionBtn('rename-folder', 'Переименовать') + actionBtn('delete-folder', 'Удалить', 'danger');
  // скрытые встроенные модули — свёрнуты внизу, оттуда их можно открыть и вернуть
  const hiddenIds = core.hiddenModules(folderId).map((m) => m.id);
  return tilesSection(f.title, ids.map(lessonTile), actions && `<div class="page-actions">${actions}</div>`) +
    (ids.length ? '' : '<p class="empty">В папке пока нет модулей.</p>') +
    (hiddenIds.length ? `<details class="hidden-modules"><summary>Скрытые модули (${hiddenIds.length})</summary>` +
      `<div class="tiles">${hiddenIds.map(lessonTile).join('')}</div></details>` : '');
}

// Строка термина на странице модуля: точка состояния, термин | определение, картинка;
// справа — отметить ★, проговорить и (в своих модулях) править на месте
const STATE_TITLE = { new: 'Новая', learning: 'Изучается', learned: 'Выучена' };
// withImages — в модуле есть картинки: место под них оставляем во всех строках, чтобы колонки совпадали
function termRow(c, st, own, editing = false, withImages = false) {
  const star = core.isStarred(c.id);
  const dot = `<span class="card-dot ${st.state}${st.due ? ' due' : ''}" title="${STATE_TITLE[st.state]}${st.due ? ' · пора повторить' : ''}"></span>`;
  const body = editing
    ? `<input class="term-input" data-term-field="term" value="${escapeAttr(c.term)}" aria-label="Термин">` +
      `<input class="term-input" data-term-field="definition" value="${escapeAttr(c.definition || '')}" aria-label="Определение">`
    : `<span class="term-term">${dot}${escapeHtml(c.term)}</span><span class="term-def">${escapeHtml(c.definition || '—')}</span>`;
  return `<li class="term-row${star ? ' starred' : ''}${editing ? ' editing' : ''}" data-card="${escapeAttr(c.id)}">` +
    `<div class="term-body">${body}</div>` +
    (withImages ? `<span class="term-img">${c.image ? `<img src="${escapeAttr(c.image)}" alt="">` : ''}</span>` : '') +
    '<div class="term-tools">' +
    `<button class="icon-btn star-btn" data-act="term-star" title="${star ? 'Снять отметку' : 'Отметить'}">${icon(star ? 'star-fill' : 'star')}</button>` +
    `<button class="icon-btn" data-act="term-speak" title="Произнести">${icon('volume')}</button>` +
    (own ? `<button class="icon-btn" data-act="term-edit" title="${editing ? 'Готово' : 'Изменить'}">${icon(editing ? 'check' : 'pen')}</button>` : '') +
    '</div></li>';
}

// Что учить в режимах: все карточки или только отмеченные ★
const starredOnly = (id) => Boolean(store.get('starred-only', {})[id]);
function studyFilter(id, total, starred) {
  if (!starred) return '';
  const only = starredOnly(id);
  const seg = (value, label) => `<button class="seg-btn${only === value ? ' on' : ''}" data-act="study-filter" data-only="${value}">${label}</button>`;
  return `<div class="study-filter"><span>Учить в режимах:</span><div class="seg">${seg(false, `Все (${total})`)}${seg(true, `${icon('star-fill')} Отмеченные (${starred})`)}</div></div>`;
}

// ---------- Действия в списке терминов ----------
function redrawTermRow(row, editing = false) {
  const moduleId = parseRoute().id;
  const card = core.module(moduleId).cards.find((c) => c.id === row.dataset.card);
  const cards = core.module(moduleId).cards;
  row.outerHTML = termRow(card, core.cardStates(moduleId)[card.id], isOwnModule(moduleId), editing, cards.some((x) => x.image));
  return $('page-body').querySelector(`.term-row[data-card="${CSS.escape(card.id)}"]`);
}

function refreshStudyFilter(moduleId) {
  const box = $('study-filter');
  if (box) box.innerHTML = studyFilter(moduleId, core.module(moduleId).cards.length, core.starredCards(moduleId).length);
}

function onTermAction(act, row) {
  const moduleId = parseRoute().id;
  const card = core.module(moduleId).cards.find((c) => c.id === row.dataset.card);
  if (act === 'term-speak') speakText(card.term, langsOf(moduleId).term);
  else if (act === 'term-star') {
    const on = core.toggleStar(card.id);
    redrawTermRow(row, row.classList.contains('editing'));
    refreshStudyFilter(moduleId);
    toast(on ? 'Отмечено' : 'Отметка снята', on ? 'star-fill' : 'star');
  } else if (act === 'term-edit') {
    const editing = !row.classList.contains('editing');
    const fresh = redrawTermRow(row, editing);
    if (editing) fresh.querySelector('.term-input').focus();
  }
}

// Правка на месте: каждое поле сохраняется при выходе из него, Enter — закончить
function onTermInput(e) {
  const input = e.target.closest('.term-input');
  if (!input) return;
  const row = input.closest('.term-row');
  const moduleId = parseRoute().id;
  const field = input.dataset.termField;
  const card = core.module(moduleId).cards.find((c) => c.id === row.dataset.card);
  if (field === 'term' && !input.value.trim()) { input.value = card.term; return; }
  core.updateCard(moduleId, card.id, { [field]: input.value });
}

function renderModule(id) {
  const l = lessonInfo(id);
  const cards = lessonCards(id);
  const own = isOwnModule(id);
  const emptyText = id === 'mine'
    ? 'Пока пусто. Во время набора нажмите Ctrl на слове, а затем Ctrl ещё раз — оно сохранится сюда.'
    : 'В модуле пока нет карточек.';
  const states = core.cardStates(id);
  const starred = core.starredCards(id).length;
  const list = cards.length
    ? `<h2 class="terms-title">Термины в модуле (${cards.length})</h2>` +
      `<ol class="term-list">${cards.map((c) => termRow(c, states[c.id], own, false, cards.some((x) => x.image))).join('')}</ol>`
    : `<p class="empty">${emptyText}</p>`;
  const stats = core.moduleStats(id);
  const statsLine = stats.seen
    ? ` · выучено ${Math.round((stats.learned / stats.total) * 100)}%` +
      (stats.due ? ` · <span class="due-count">ждут повторения: ${stats.due}</span>` : '')
    : '';
  const hiddenNow = core.isHidden(id);
  const actions = '<div class="page-actions">' + (own
    ? actionLink(`#/module/${id}/edit`, `${icon('pen')} Изменить`) + actionLink(`#/import/module/${id}`, 'Импорт') +
      actionBtn('copy-module', 'Скопировать') + actionBtn('voice-settings', `${icon('volume')} Озвучка`) +
      (id === 'mine' ? '' : actionBtn('delete-module', 'Удалить', 'danger'))
    : actionBtn('copy-module', 'Скопировать и изменить') + actionBtn('voice-settings', `${icon('volume')} Озвучка`) +
      (hiddenNow ? actionBtn('show-module', 'Вернуть в папку') : actionBtn('hide-module', 'Скрыть'))) + '</div>';
  const hiddenNote = hiddenNow ? '<p class="empty">Модуль скрыт: в папке его не видно.</p>' : '';
  const mode = (path, icon, title, sub) => {
    const inner = `<span class="mode-icon">${icon}</span><span class="tile-text"><b>${title}</b><small>${sub}</small></span>`;
    return cards.length ? `<a class="mode-btn" data-mode="${path}" href="#/module/${id}/${path}">${inner}</a>` : `<span class="mode-btn disabled" data-mode="${path}">${inner}</span>`;
  };
  return `<section class="module-head">${lessonBadge(id, 'badge-lg')}` +
    `<div><h1>${escapeHtml(l.title)}</h1><small>${lessonCount(id)}${statsLine}</small>${progressBar(stats)}</div>${actions}</section>${hiddenNote}` +
    '<div class="modes">' +
    mode('cards', icon('cards'), 'Карточки', 'Переворачивать и отмечать «знаю / не знаю»') +
    mode('learn', icon('target'), 'Заучивание', 'Сначала выбор из вариантов, потом ввод ответа — пока не запомнится') +
    mode('test', icon('test'), 'Тест', 'Вопросы разных типов и оценка в конце') +
    mode('match', icon('match'), 'Подбор пар', 'Соединить термины с переводами на время') +
    (canTypeDeck(id) ? mode('type', icon('keyboard'), 'Набор', 'Печатать слова и фразы. Диктант и перевод на английский — в настройках набора') : '') +
    `</div><div id="study-filter">${studyFilter(id, cards.length, starred)}</div>${list}`;
}

// Режимы набора нужны физической клавиатуре: на сенсорном экране без мыши их не показываем
const canType = () => matchMedia('(any-pointer: fine)').matches;
// Тренажёр набора — под английскую раскладку: в нём только модули с английскими терминами
const typeableDue = () => core.dueCards().filter((x) => langsOf(x.moduleId).term === 'en').map((x) => x.card);
const canTypeDeck = (id) => canType() && (id === 'today' ? typeableDue().length > 0 : langsOf(id).term === 'en');

// ---------- Режим «Карточки» ----------
// #/module/<id>/cards. Направление и «перемешать» запоминаются в настройках
const flashcards = { moduleId: null, session: null, flipped: false };
const flashDir = () => store.get('cards-dir', 'en-ru');
const flashOptions = () => ({ shuffle: store.get('cards-shuffle', false) });

// Место в карточках запоминается по колоде и направлению (в настройках — значит, и в облаке):
// открыли модуль снова — продолжаем с той же карточки. «Повторить незнакомые» не запоминается
const flashKey = (deckId) => `${deckId}|${flashDir()}`;
function saveFlash() {
  if (!flashcards.saving) return;
  const all = store.get('flash-progress', {});
  const s = flashcards.session;
  if (s.done || !s.index) delete all[flashKey(flashcards.moduleId)];
  else all[flashKey(flashcards.moduleId)] = KlavaCore.flashSnapshot(s);
  store.set('flash-progress', all);
}

// fresh — начать заново, не продолжая сохранённое; retry — занятие из незнакомых карточек
function startFlash(moduleId, { fresh = false, retry = null } = {}) {
  flashcards.moduleId = moduleId;
  flashcards.saving = !retry;
  const saved = !fresh && !retry && store.get('flash-progress', {})[flashKey(moduleId)];
  const resumed = saved && KlavaCore.flashResume(deckCards(moduleId), saved);
  if (resumed && !resumed.done && resumed.index) {
    flashcards.session = resumed;
    toast(`Продолжаем с карточки ${resumed.position} из ${resumed.total}`, 'cards');
  } else {
    flashcards.session = KlavaCore.flashSession(retry || deckCards(moduleId), flashOptions());
    saveFlash(); // сбрасывает сохранённое место, если начали заново
  }
  flashcards.flipped = false;
  renderFlash();
  flashAutoSpeak();
}

// Лицевая и оборотная стороны: «англ → рус» — термин и определение, «рус → англ» — наоборот
const cardImage = (card) => (card?.image ? `<img class="card-img" src="${escapeAttr(card.image)}" alt="">` : '');

function flashSides(card) {
  const term = escapeHtml(card.term);
  const def = escapeHtml(card.definition || '—');
  // картинка — подсказка для образной памяти: она видна сразу, вместе с вопросом (см. renderFlash, renderLearn)
  const extra =
    (card.example ? `<div class="flash-example"><span>${escapeHtml(card.example)}</span>` +
      `${card.exampleTranslation ? `<small>${escapeHtml(card.exampleTranslation)}</small>` : ''}</div>` : '') +
    (card.explanation ? `<div class="explain flash-explain"><span class="explain-icon">${icon('book')}</span><div class="explain-body">${noteHtml(card.explanation)}</div></div>` : '');
  return flashDir() === 'en-ru' ? { front: term, back: def, extra } : { front: def, back: term, extra };
}

function renderFlash() {
  const s = flashcards.session;
  const dir = flashDir();
  const seg = (value, label) => `<button class="seg-btn${dir === value ? ' on' : ''}" data-act="flash-dir" data-dir="${value}">${label}</button>`;
  const bar = '<div class="flash-bar">' +
    `<div class="seg">${seg('en-ru', dirLabels(flashcards.moduleId)['en-ru'])}${seg('ru-en', dirLabels(flashcards.moduleId)['ru-en'])}</div>` +
    `<label class="icon-toggle" data-tip="Перемешать"><input type="checkbox" id="flash-shuffle" aria-label="Перемешать"${flashOptions().shuffle ? ' checked' : ''}>${icon('shuffle')}</label>` +
    `<span class="flash-progress">${s.done ? s.total : s.position} / ${s.total}</span>` +
    (s.index && !s.done ? `<button class="icon-btn voice-btn" data-act="flash-restart" data-tip="Начать сначала" aria-label="Начать сначала">${icon('restart')}</button>` : '') +
    `<button class="icon-btn voice-btn" data-act="voice-settings" data-tip="Голос озвучки" aria-label="Голос озвучки">${icon('volume')}</button></div>` +
    `<div class="flash-track"><span style="width:${s.total ? (s.index / s.total) * 100 : 0}%"></span></div>`;

  if (s.done) {
    const n = s.unknown.length;
    $('page-body').innerHTML = `<div class="flash">${bar}<div class="flash-done">` +
      '<h2>Готово!</h2>' +
      `<p>Знаю: <b class="dict-ok">${s.known.length}</b> · Не знаю: <b class="dict-bad">${n}</b></p>` +
      '<div class="page-actions">' +
      (n ? `<button class="primary-btn" data-act="flash-retry">Повторить незнакомые (${n})</button>` : '') +
      '<button class="pill-btn" data-act="flash-restart">Начать заново</button>' +
      `<a class="pill-btn" href="${deckHref(flashcards.moduleId)}">Назад</a></div></div></div>`;
    return;
  }

  const { front, back, extra } = flashSides(s.current);
  const long = (html) => (html.length > 40 ? ' long' : '');
  $('page-body').innerHTML = `<div class="flash">${bar}` +
    `<div class="flash-card${flashcards.flipped ? ' flipped' : ''}" data-act="flash-flip" role="button" tabindex="0" aria-label="Перевернуть карточку">` +
    '<div class="flash-inner">' +
    '<span class="swipe-stamp yes">Know</span><span class="swipe-stamp no">Don’t know</span>' +
    `<div class="face front">${cardImage(s.current)}<span class="flash-text${long(front)}">${front}</span><small class="flash-hint">${canType()
      ? 'Нажмите, чтобы перевернуть'
      : 'Коснитесь, чтобы перевернуть · смахните вправо или влево'}</small></div>` +
    `<div class="face back">${cardImage(s.current)}<span class="flash-text${long(back)}">${back}</span>${extra}</div>` +
    '</div></div>' +
    '<div class="flash-actions">' +
    `<button class="flash-btn no" data-act="flash-no">${icon('x')} Don’t know</button>` +
    `<button class="flash-btn speak" data-act="flash-speak" title="Произнести">${icon('volume')}</button>` +
    `<button class="flash-btn yes" data-act="flash-yes">${icon('check')} Know</button>` +
    '</div>' +
    // клавиши — только там, где есть клавиатура
    (canType() ? '<div class="kbd-legend">' +
      `<span><kbd class="key-cap wide">Пробел</kbd>перевернуть</span>` +
      `<span class="no"><kbd class="key-cap">${icon('arrow', 'flip')}</kbd>не знаю</span>` +
      `<span class="yes"><kbd class="key-cap">${icon('arrow')}</kbd>знаю</span></div>` : '') +
    '</div>';
}

// Сторона с термином звучит сама, когда появляется, — если в настройках включена озвучка
const flashTermShown = () => (flashDir() === 'en-ru' ? !flashcards.flipped : flashcards.flipped);
function flashAutoSpeak() {
  const s = flashcards.session;
  if (s.done || !store.get('auto-read', true)) return;
  if (flashTermShown()) speakText(s.current.term, cardLangs(s.current.id, flashcards.moduleId).term, true);
}
// Кнопка озвучки — видимая сторона на своём языке
function flashSpeak() {
  const c = flashcards.session.current;
  const langs = cardLangs(c.id, flashcards.moduleId);
  if (flashTermShown()) speakText(c.term, langs.term);
  else speakText(c.definition, langs.definition);
}

function flashFlip() {
  flashcards.flipped = !flashcards.flipped;
  document.querySelector('.flash-card')?.classList.toggle('flipped', flashcards.flipped);
  if (flashcards.flipped) flashAutoSpeak();
}

// Ответ «знаю / не знаю»: карточка улетает вправо или влево, потом появляется следующая
function flashMark(known) {
  if (flashcards.busy) return;
  const el = document.querySelector('.flash-card');
  const next = () => {
    flashcards.busy = false;
    core.recordAnswer(flashcards.session.current.id, flashDir(), known);
    flashcards.session = KlavaCore.flashAnswer(flashcards.session, known);
    saveFlash();
    flashcards.flipped = false;
    renderFlash();
    flashAutoSpeak();
    const s = flashcards.session;
    if (s.done && s.total && !s.unknown.length) celebrate();
  };
  if (!el || reducedMotion()) { next(); return; }
  flashcards.busy = true;
  el.style.transition = 'transform .25s ease-in, opacity .25s ease-in';
  el.style.transform = `translateX(${known ? 120 : -120}%) rotate(${known ? 14 : -14}deg)`;
  el.style.opacity = '0';
  setTimeout(next, 230);
}

// Свайп карточки пальцем или мышью: вправо — «знаю», влево — «не знаю».
// Пока тянешь, карточка наклоняется и показывает метку; короткое касание — переворот
const swipe = { x: 0, dx: 0, active: false, moved: false };
function initFlashSwipe() {
  const body = $('page-body');
  body.addEventListener('pointerdown', (e) => {
    const card = e.target.closest('.flash-card');
    if (!card || flashcards.busy) return;
    Object.assign(swipe, { x: e.clientX, dx: 0, active: true, moved: false });
    try { card.setPointerCapture(e.pointerId); } catch {}
  });
  body.addEventListener('pointermove', (e) => {
    if (!swipe.active) return;
    const card = document.querySelector('.flash-card');
    swipe.dx = e.clientX - swipe.x;
    if (Math.abs(swipe.dx) > 8) swipe.moved = true;
    if (!card || !swipe.moved) return;
    card.style.transition = 'none';
    card.style.transform = `translateX(${swipe.dx}px) rotate(${swipe.dx / 25}deg)`;
    card.classList.toggle('swipe-yes', swipe.dx > 60);
    card.classList.toggle('swipe-no', swipe.dx < -60);
  });
  const end = () => {
    if (!swipe.active) return;
    swipe.active = false;
    const card = document.querySelector('.flash-card');
    if (Math.abs(swipe.dx) > 100) { flashMark(swipe.dx > 0); return; }
    if (card) {
      card.style.transition = 'transform .2s';
      card.style.transform = '';
      card.classList.remove('swipe-yes', 'swipe-no');
    }
  };
  body.addEventListener('pointerup', end);
  body.addEventListener('pointercancel', end);
}

function onFlashAction(act, btn) {
  const s = flashcards.session;
  if (act === 'flash-flip') {
    if (swipe.moved) { swipe.moved = false; return; } // это был свайп, а не нажатие
    flashFlip();
  }
  else if (act === 'flash-yes' || act === 'flash-no') flashMark(act === 'flash-yes');
  else if (act === 'flash-speak' && s.current) flashSpeak();
  else if (act === 'flash-retry') startFlash(flashcards.moduleId, { retry: s.unknown });
  else if (act === 'flash-restart') startFlash(flashcards.moduleId, { fresh: true });
  else if (act === 'flash-dir') { store.set('cards-dir', btn.dataset.dir); startFlash(flashcards.moduleId); }
}

// ---------- Режим «Заучивание» ----------
// #/module/<id>/learn. Направление общее с «Карточками».
// После ответа показываем разбор; само занятие продвигается по «Продолжить» —
// так «Я был прав» может засчитать ответ заново, взяв состояние до ответа
const learn = { moduleId: null, state: null, feedback: null }; // feedback: { result, given, choice }

function startLearn(moduleId) {
  learn.moduleId = moduleId;
  learn.state = KlavaCore.learnSession(deckCards(moduleId), { direction: learnDir() });
  learn.feedback = null;
  renderLearn();
  learnAutoSpeak();
}

// Сторона с термином: в прямом направлении — вопрос, в обратном — ответ (звучит после ответа)
// Направление заучивания — своё: кроме «англ → рус» и обратно есть «Смешанно»
const learnDir = () => store.get('learn-dir', flashDir());
const learnTerm = () => {
  const q = learn.state.question;
  if (!q) return null;
  if (q.direction === 'en-ru') return q.prompt;
  return learn.feedback ? q.answer : null;
};
const learnTermLang = () => cardLangs(learn.state.question.card.id, learn.moduleId).term;
function learnAutoSpeak() {
  const term = learnTerm();
  if (term && store.get('auto-read', true)) speakText(term, learnTermLang(), true);
}

function renderLearn() {
  const s = learn.state;
  const fb = learn.feedback;
  const dir = learnDir();
  const seg = (value, label, tip = '') => `<button class="seg-btn${dir === value ? ' on' : ''}" data-act="learn-dir" data-dir="${value}"` +
    `${tip ? ` data-tip="${tip}"` : ''}>${label}</button>`;
  const bar = '<div class="flash-bar">' +
    `<div class="seg">${seg('en-ru', dirLabels(learn.moduleId)['en-ru'])}${seg('ru-en', dirLabels(learn.moduleId)['ru-en'])}` +
    `${seg('mixed', 'Смешанно', 'Выбор — в обе стороны, писать — термин')}</div>` +
    (s.done ? '' : `<span class="learn-round">Раунд ${s.round}</span>`) +
    `<span class="flash-progress">Освоено ${s.mastered} из ${s.total}</span>` +
    `<button class="icon-btn voice-btn" data-act="voice-settings" data-tip="Голос озвучки" aria-label="Голос озвучки">${icon('volume')}</button></div>` +
    `<div class="flash-track"><span style="width:${s.total ? (s.mastered / s.total) * 100 : 0}%"></span></div>`;

  if (s.done) {
    $('page-body').innerHTML = `<div class="flash">${bar}<div class="flash-done">` +
      (s.total ? `<h2>Все ${plural(s.total, 'карточка освоена', 'карточки освоены', 'карточек освоено')}!</h2>`
        : '<h2>Нечего заучивать</h2><p>В этом направлении у карточек нет ответа.</p>') +
      '<div class="page-actions"><button class="primary-btn" data-act="learn-restart">Начать заново</button>' +
      `<a class="pill-btn" href="${deckHref(learn.moduleId)}/cards">Карточки</a>` +
      `<a class="pill-btn" href="${deckHref(learn.moduleId)}">Назад</a></div></div></div>`;
    return;
  }

  const q = s.question;
  const what = q.stage === 1 ? 'Выберите' : 'Напишите';
  // что писать: «перевод» и «по-эстонски» или, у терминов, «определение» и «термин»
  const langs = deckLangs(learn.moduleId);
  const target = isTermDeck(langs) ? (q.direction === 'en-ru' ? 'определение' : 'термин')
    : q.direction === 'en-ru' ? 'перевод' : LANGS[langs.term]?.adv || 'термин';
  const speakBtn = learnTerm() ? `<button class="icon-btn" data-act="learn-speak" title="Произнести">${icon('volume')}</button>` : '';
  let body;
  if (q.stage === 1) {
    body = '<div class="learn-choices">' + q.choices.map((c, i) => {
      let cls = '';
      if (fb) cls = c === q.answer ? ' right' : i === fb.choice ? ' wrong' : ' dim';
      return `<button class="learn-choice${cls}" data-act="learn-choice" data-i="${i}"${fb ? ' disabled' : ''}>` +
        `<kbd>${i + 1}</kbd><span>${escapeHtml(c)}</span></button>`;
    }).join('') + '</div>';
  } else if (!fb) {
    body = '<form id="learn-form" class="learn-form">' +
      `<input id="learn-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${target[0].toUpperCase() + target.slice(1)}">` +
      '<button class="primary-btn">Ответить</button>' +
      '<button type="button" class="pill-btn" data-act="learn-skip">Не знаю</button></form>';
  } else body = '';

  // После ответа: «Верно / Неверно» не пишем — подсказывают цвета. Только при вводе с ошибкой
  // показываем правильный ответ. Кнопка «Продолжить» выезжает из-под карточки с заданием
  let verdict = '';
  let next = '';
  if (fb) {
    const right = `<b>${escapeHtml(q.answer)}</b>`;
    const yours = fb.given && fb.result !== 'correct' ? `<small>Ваш ответ: ${escapeHtml(fb.given)}</small>` : '';
    const head = q.stage === 2 ? {
      almost: `<span class="learn-almost">≈ Почти! Правильно: ${right}</span>`,
      wrong: `<span class="dict-bad">Правильно: ${right}</span>`,
    }[fb.result] : '';
    const extra = flashSides(q.card).extra;
    if (head || extra) {
      verdict = `<div class="learn-feedback ${fb.result}">${head ? `<div class="learn-verdict">${head}${yours}</div>` : ''}${extra}</div>`;
    }
    next = `<div class="learn-next-bar ${fb.result}"><div class="learn-next">` +
      (q.stage === 2 && fb.result === 'wrong' ? '<button class="pill-btn" data-act="learn-override">Я был прав</button>' : '') +
      '<button class="primary-btn" data-act="learn-next">Продолжить <kbd>Enter</kbd></button></div></div>';
  }

  $('page-body').innerHTML = `<div class="flash">${bar}<div class="learn-card${fb ? ` fb-${fb.result}` : ''}">` +
    `<div class="learn-head"><small>${what} ${target}</small>${speakBtn}</div>` +
    `<div class="learn-prompt"><div class="flash-text${q.prompt.length > 40 ? ' long' : ''}">${escapeHtml(q.prompt)}</div>${cardImage(q.card)}</div>` +
    `${body}${verdict}</div>${next}</div>`;
  if (q.stage === 2 && !fb) $('learn-input').focus();
}

function learnRespond(result, given, choice) {
  learn.feedback = { result, given, choice };
  renderLearn();
  if (learn.state.question.direction === 'ru-en') learnAutoSpeak();
}

// Дальше: ответ засчитывается («почти» — тоже верно) и занятие переходит к следующему вопросу
function learnContinue(ok = learn.feedback.result !== 'wrong') {
  core.recordAnswer(learn.state.question.card.id, learn.state.question.direction, ok);
  learn.state = KlavaCore.learnAnswer(learn.state, ok);
  learn.feedback = null;
  renderLearn();
  learnAutoSpeak();
  if (learn.state.done && learn.state.total) celebrate();
}

function onLearnAction(act, btn) {
  const q = learn.state.question;
  if (act === 'learn-choice' && !learn.feedback) {
    const i = Number(btn.dataset.i);
    learnRespond(q.choices[i] === q.answer ? 'correct' : 'wrong', q.choices[i], i);
  } else if (act === 'learn-skip') learnRespond('wrong', '');
  else if (act === 'learn-next') learnContinue();
  else if (act === 'learn-override') learnContinue(true);
  else if (act === 'learn-speak') speakText(learnTerm(), learnTermLang());
  else if (act === 'learn-restart') startLearn(learn.moduleId);
  else if (act === 'learn-dir') { store.set('learn-dir', btn.dataset.dir); startLearn(learn.moduleId); }
}

function onLearnSubmit(e) {
  if (e.target.id !== 'learn-form') return;
  e.preventDefault();
  const given = $('learn-input').value;
  if (!given.trim()) { $('learn-input').focus(); return; }
  learnRespond(KlavaCore.checkAnswer(given, learn.state.question.answer), given.trim());
}

function onLearnKey(e) {
  if (parseRoute().screen !== 'learn' || e.ctrlKey || e.metaKey || e.altKey || learn.state.done) return;
  // в поле ввода и на кнопках клавиши работают как обычно
  if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(e.target.tagName)) return;
  if (learn.feedback && e.key === 'Enter') { e.preventDefault(); learnContinue(); return; }
  const i = Number(e.key) - 1;
  const q = learn.state.question;
  if (!learn.feedback && q.stage === 1 && i >= 0 && i < q.choices.length) {
    e.preventDefault();
    onLearnAction('learn-choice', document.querySelector(`.learn-choice[data-i="${i}"]`));
  }
}

// ---------- Режим «Тест» ----------
// #/module/<id>/test и #/today/test: настройка → все вопросы на одной странице → оценка и разбор ошибок.
// Число вопросов и типы запоминаются, направление общее с «Карточками»
const quiz = { deckId: null, questions: null, graded: null };
const TEST_TYPE_NAMES = { choice: 'Выбор из вариантов', truefalse: 'Верно / неверно', written: 'Ввод ответа' };
const testTypes = () => store.get('test-types', Object.keys(TEST_TYPE_NAMES));

function startTest(deckId) {
  quiz.deckId = deckId;
  quiz.questions = null;
  quiz.graded = null;
  renderTest();
}

function renderTest() {
  if (!quiz.questions) { $('page-body').innerHTML = renderTestSetup(); return; }
  $('page-body').innerHTML = quiz.graded ? renderTestResult() : renderTestQuestions();
}

function renderTestSetup() {
  const total = deckCards(quiz.deckId).length;
  const dir = flashDir();
  const radio = (value, label) =>
    `<label class="radio"><input type="radio" name="test-dir" value="${value}"${dir === value ? ' checked' : ''}><span>${label}</span></label>`;
  const types = testTypes();
  return '<div class="form test-setup"><h1>Тест</h1>' +
    `<label class="field"><span>Вопросов (карточек в наборе: ${total})</span>` +
    `<input type="number" id="test-count" min="1" max="${total}" value="${Math.min(store.get('test-count', 10), total)}"></label>` +
    `<fieldset><legend>Направление</legend>${radio('en-ru', dirLabels(quiz.deckId)['en-ru'])}${radio('ru-en', dirLabels(quiz.deckId)['ru-en'])}</fieldset>` +
    '<fieldset><legend>Типы вопросов</legend>' + Object.entries(TEST_TYPE_NAMES).map(([t, name]) =>
      `<label class="radio"><input type="checkbox" name="test-type" value="${t}"${types.includes(t) ? ' checked' : ''}><span>${name}</span></label>`).join('') +
    '</fieldset>' +
    `<button class="primary-btn" data-act="test-start"${total ? '' : ' disabled'}>Начать тест</button></div>`;
}

function renderTestQuestions() {
  const qs = quiz.questions;
  const body = qs.map((q, i) => {
    const head = `<div class="test-q-head"><span>${i + 1} / ${qs.length}</span><small>${TEST_TYPE_NAMES[q.type]}</small></div>`;
    let answer;
    if (q.type === 'choice') {
      answer = '<div class="test-options">' + q.choices.map((c, k) =>
        `<label class="test-option"><input type="radio" name="tq${i}" value="${k}"><span>${escapeHtml(c)}</span></label>`).join('') + '</div>';
    } else if (q.type === 'truefalse') {
      answer = `<p class="test-shown">${escapeHtml(q.shown)}</p><div class="test-options two">` +
        `<label class="test-option"><input type="radio" name="tq${i}" value="true"><span>Верно</span></label>` +
        `<label class="test-option"><input type="radio" name="tq${i}" value="false"><span>Неверно</span></label></div>`;
    } else {
      answer = `<input class="test-input" name="tq${i}" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Ваш ответ">`;
    }
    return `<section class="test-q">${head}<div class="learn-prompt"><div class="test-prompt">${escapeHtml(q.prompt)}</div>${cardImage(q.card)}</div>${answer}</section>`;
  }).join('');
  return `<div class="test">${body}<div class="test-submit"><button class="primary-btn" data-act="test-check">Проверить ответы</button></div></div>`;
}

// Ответы со страницы: вариант, true/false или текст; без ответа — undefined
function readTestResponses() {
  return quiz.questions.map((q, i) => {
    if (q.type === 'written') return document.querySelector(`[name="tq${i}"]`).value;
    const picked = document.querySelector(`[name="tq${i}"]:checked`);
    if (!picked) return undefined;
    return q.type === 'choice' ? q.choices[Number(picked.value)] : picked.value === 'true';
  });
}

function renderTestResult() {
  const g = quiz.graded;
  const verdict = g.percent >= 90 ? 'Отлично!' : g.percent >= 70 ? 'Хорошо' : g.percent >= 50 ? 'Неплохо' : 'Есть над чем поработать';
  const shownAnswer = (q, r) => {
    if (r === undefined || r === '') return '<i>нет ответа</i>';
    if (q.type === 'truefalse') return r ? 'Верно' : 'Неверно';
    return escapeHtml(String(r));
  };
  const items = quiz.questions.map((q, i) => {
    const res = g.results[i];
    const mark = { correct: '✓', almost: '≈', wrong: '✗' }[res];
    const right = q.type === 'truefalse'
      ? `Показано: ${escapeHtml(q.shown)} — ${q.isTrue ? 'верно' : `неверно. Правильно: <b>${escapeHtml(q.answer)}</b>`}`
      : `Правильно: <b>${escapeHtml(q.answer)}</b>`;
    return `<li class="test-r ${res}"><span class="test-mark">${mark}</span><div>` +
      `<div class="test-prompt small">${escapeHtml(q.prompt)}</div>` +
      `<div>${right}</div>` +
      (res === 'correct' ? '' : `<div class="test-given">Ваш ответ: ${shownAnswer(q, g.responses[i])}</div>`) +
      '</div></li>';
  });
  // сначала ошибки, потом остальное
  const order = g.results.map((r, i) => i).sort((a, b) => (g.results[a] === 'wrong' ? 0 : 1) - (g.results[b] === 'wrong' ? 0 : 1));
  return '<div class="test">' +
    `<div class="flash-done test-score"><h2>${g.correct} из ${g.total} · ${g.percent}%</h2><p>${verdict}` +
    `${g.mistakes.length ? ` Ошибок: <b class="dict-bad">${g.mistakes.length}</b>` : ''}</p>` +
    '<div class="page-actions"><button class="primary-btn" data-act="test-again">Ещё раз</button>' +
    '<button class="pill-btn" data-act="test-setup">Другие настройки</button>' +
    `<a class="pill-btn" href="${deckHref(quiz.deckId)}">Назад</a></div></div>` +
    `<ol class="test-results">${order.map((i) => items[i]).join('')}</ol></div>`;
}

function testStart() {
  const types = [...document.querySelectorAll('[name="test-type"]:checked')].map((x) => x.value);
  if (!types.length) { alert('Выберите хотя бы один тип вопросов'); return; }
  const count = Math.max(1, Number($('test-count').value) || 10);
  store.set('test-count', count);
  store.set('test-types', types);
  store.set('cards-dir', document.querySelector('[name="test-dir"]:checked').value);
  quiz.settings = { count, types, direction: flashDir() };
  makeTest();
}

function makeTest() {
  quiz.questions = KlavaCore.buildTest(deckCards(quiz.deckId), quiz.settings);
  quiz.graded = null;
  renderTest();
  scrollTo(0, 0);
}

function testCheck() {
  const responses = readTestResponses();
  const empty = responses.filter((r) => r === undefined || r === '').length;
  if (empty) {
    openDialog({ title: 'Проверить тест?', text: `Без ответа: ${plural(empty, 'вопрос', 'вопроса', 'вопросов')}.`, ok: 'Проверить' })
      .then((yes) => { if (yes) gradeTestNow(responses); });
    return;
  }
  gradeTestNow(responses);
}

function gradeTestNow(responses) {
  quiz.graded = { ...KlavaCore.gradeTest(quiz.questions, responses), responses };
  // каждый ответ — в повторение
  quiz.questions.forEach((q, i) => core.recordAnswer(q.card.id, quiz.settings.direction, quiz.graded.results[i] !== 'wrong'));
  renderTest();
  scrollTo(0, 0);
  if (quiz.graded.percent >= 80) celebrate();
}

function onTestAction(act) {
  if (act === 'test-start') testStart();
  else if (act === 'test-check') testCheck();
  else if (act === 'test-again') makeTest();
  else if (act === 'test-setup') startTest(quiz.deckId);
}

// ---------- Подбор пар ----------
// #/module/<id>/match и #/today/match. Таймер идёт с первого клика по «Начать»;
// за ошибку — штраф 1 секунда. Верно соединённая пара — верный ответ «англ → рус» в повторении
const match = { deckId: null, game: null, startedAt: 0, timer: 0, finished: null };
const secs = (ms) => (ms / 1000).toFixed(1).replace('.', ',');

function startMatch(deckId) {
  stopMatchTimer();
  match.deckId = deckId;
  match.game = null;
  match.finished = null;
  renderMatch();
}

function stopMatchTimer() {
  clearInterval(match.timer);
  match.timer = 0;
}

function matchBegin() {
  match.game = KlavaCore.matchGame(deckCards(match.deckId));
  match.finished = null;
  match.startedAt = performance.now();
  stopMatchTimer();
  match.timer = setInterval(updateMatchClock, 100);
  renderMatch();
}

function updateMatchClock() {
  const el = $('match-clock');
  if (el && match.game) el.textContent = secs(KlavaCore.matchTime(match.game, performance.now() - match.startedAt));
}

function renderMatch() {
  const g = match.game;
  const record = match.deckId === 'today' ? null : core.matchRecord(match.deckId);
  const recordText = record != null ? `Рекорд: ${secs(record)} с` : 'Рекорда пока нет';
  if (!g) {
    const pairs = KlavaCore.matchGame(deckCards(match.deckId)).pairs;
    $('page-body').innerHTML = '<div class="flash"><div class="flash-done">' +
      '<h2>Подбор пар</h2>' +
      (pairs ? `<p>Соедините ${plural(pairs, 'термин', 'термина', 'терминов')} с переводами как можно быстрее. ` +
        `Ошибка — плюс секунда.</p><p class="empty">${recordText}</p>` +
        '<div class="page-actions"><button class="primary-btn" data-act="match-start">Начать</button></div>'
        : '<p>В наборе нет карточек с переводом.</p>') +
      '</div></div>';
    return;
  }
  if (match.finished) {
    const f = match.finished;
    $('page-body').innerHTML = '<div class="flash"><div class="flash-done">' +
      `<h2>${secs(f.total)} с</h2>` +
      `<p>${f.mistakes ? `Игра ${secs(f.elapsed)} с + штраф ${f.mistakes} с (${plural(f.mistakes, 'ошибка', 'ошибки', 'ошибок')})` : 'Без ошибок!'}</p>` +
      (match.deckId === 'today' ? '' : `<p>${f.record ? `${icon('trophy')} Новый рекорд!` : recordText}</p>`) +
      '<div class="page-actions"><button class="primary-btn" data-act="match-start">Ещё раз</button>' +
      `<a class="pill-btn" href="${deckHref(match.deckId)}">Назад</a></div></div></div>`;
    return;
  }
  const missed = g.last?.result === 'miss' ? g.last.tiles : [];
  $('page-body').innerHTML = '<div class="flash">' +
    `<div class="flash-bar"><span class="match-clock" id="match-clock">0,0</span>` +
    `<span class="flash-progress">Пар: ${g.matched.length} из ${g.pairs}${g.mistakes ? ` · ошибок: ${g.mistakes}` : ''}</span></div>` +
    '<div class="match-grid">' + g.tiles.map((t) => {
      const cls = g.matched.includes(t.cardId) ? ' gone' : t.id === g.selected ? ' selected' : missed.includes(t.id) ? ' miss' : '';
      return `<button class="match-tile ${t.side}${cls}" data-act="match-pick" data-tile="${escapeAttr(t.id)}"${cls === ' gone' ? ' disabled' : ''}>` +
        `${escapeHtml(t.text)}</button>`;
    }).join('') + '</div></div>';
  updateMatchClock();
}

function matchTap(tileId) {
  match.game = KlavaCore.matchPick(match.game, tileId);
  const last = match.game.last;
  if (last?.result === 'match') core.recordAnswer(last.cardIds[0], 'en-ru', true);
  if (match.game.done) {
    stopMatchTimer();
    const elapsed = performance.now() - match.startedAt;
    const total = KlavaCore.matchTime(match.game, elapsed);
    const record = match.deckId !== 'today' && core.saveMatchTime(match.deckId, Math.round(total));
    match.finished = { elapsed, total, mistakes: match.game.mistakes, record };
  }
  renderMatch();
  if (match.finished?.record) celebrate();
}

function onMatchAction(act, btn) {
  if (act === 'match-start') matchBegin();
  else if (act === 'match-pick') matchTap(btn.dataset.tile);
}

function onFlashKey(e) {
  if (parseRoute().screen !== 'cards' || e.ctrlKey || e.metaKey || e.altKey) return;
  // пробел и Enter на кнопках и полях работают как обычно
  if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(e.target.tagName)) return;
  const act = { ' ': 'flash-flip', Enter: 'flash-flip', ArrowRight: 'flash-yes', ArrowLeft: 'flash-no' }[e.key];
  if (!act || flashcards.session.done) return;
  e.preventDefault();
  onFlashAction(act);
}

// Выбор папки для своего модуля: свои папки, потом встроенные
// Последний пункт — «+ Новая папка…»: создаёт папку и сразу выбирает её (см. initPickers)
const NEW_FOLDER = '__new-folder__';
const folderSelect = (id, selected) =>
  `<select id="${id}">${moduleFolders().map((f) =>
    `<option value="${escapeAttr(f.id)}"${f.id === selected ? ' selected' : ''}>${escapeHtml(f.title)}</option>`).join('')}` +
  `<option value="${NEW_FOLDER}">+ Новая папка…</option></select>`;

function renderNewModule(folderId) {
  const selected = folderId || moduleFolders()[0].id;
  return '<form id="new-module" class="form form-card">' +
    '<h1>Новый модуль</h1>' +
    '<label class="field"><span>Название</span><input id="new-title" required placeholder="Например, «Слова из сериала»"></label>' +
    `<label class="field"><span>Папка</span>${folderSelect('new-folder', selected)}</label>` +
    langFields('new', store.get('new-langs', DEFAULT_LANGS)) +
    `<button class="primary-btn form-submit">Создать и добавить карточки${icon('arrow')}</button></form>`;
}

// ---------- Импорт ----------
// #/import — в новый модуль, #/import/folder/<папка> — в новый модуль этой папки,
// #/import/module/<модуль> — дописать в свой модуль
const ownModules = () => core.modules().filter((m) => !m.builtIn);

function renderImport({ folderId, moduleId }) {
  const radio = (name, value, label, checked) =>
    `<label class="radio"><input type="radio" name="${name}" value="${value}"${checked ? ' checked' : ''}><span>${label}</span></label>`;
  const own = ownModules();
  const toExisting = Boolean(moduleId);
  // Варианты «Куда» — блоками: поля варианта видны, только когда он выбран (см. .imp-option в style.css)
  return '<div id="import-form" class="form">' +
    '<h1>Импорт карточек</h1>' +
    '<section class="form-card">' +
    '<label class="field"><span>Список</span><textarea id="imp-text" rows="7" ' +
    'placeholder="Каждая карточка на своей строке, термин и определение через Tab — так копируют Quizlet («Экспорт») и таблицы"></textarea></label>' +
    '<div class="choice-group"><span class="group-title">Между термином и определением</span><div class="chips">' +
    radio('imp-term', 'tab', 'Tab', true) + radio('imp-term', 'comma', 'Запятая') + radio('imp-term', 'semicolon', 'Точка с запятой') +
    radio('imp-term', 'dash', 'Тире') + radio('imp-term', 'custom', 'Свой') + '<input id="imp-term-custom" class="sep-input" maxlength="10" aria-label="Свой разделитель">' +
    '</div></div>' +
    '<div class="choice-group"><span class="group-title">Между карточками</span><div class="chips">' +
    radio('imp-card', 'newline', 'Новая строка', true) + radio('imp-card', 'semicolon', 'Точка с запятой') +
    radio('imp-card', 'custom', 'Свой') + '<input id="imp-card-custom" class="sep-input" maxlength="10" aria-label="Свой разделитель">' +
    '</div></div></section>' +
    '<section class="form-card imp-target"><span class="group-title">Куда</span>' +
    `<div class="imp-option">${radio('imp-target', 'new', 'Новый модуль', !toExisting)}<div class="imp-fields">` +
    '<label class="field"><span>Название</span><input id="imp-title" placeholder="Например, «Слова из сериала»"></label>' +
    `<label class="field"><span>Папка</span>${folderSelect('imp-folder', folderId || moduleFolders()[0].id)}</label>` +
    `${langFields('imp', store.get('new-langs', DEFAULT_LANGS))}</div></div>` +
    (own.length ? `<div class="imp-option">${radio('imp-target', 'existing', 'Добавить в свой модуль', toExisting)}<div class="imp-fields">` +
      `<label class="field"><span>Модуль</span><select id="imp-module">${own.map((m) =>
        `<option value="${escapeAttr(m.id)}"${m.id === moduleId ? ' selected' : ''}>${escapeHtml(m.title)}</option>`).join('')}</select></label></div></div>` : '') +
    '<label class="check"><input type="checkbox" id="imp-skip" checked><span>Пропустить повторы</span></label>' +
    '</section>' +
    '<div id="imp-preview" class="imp-preview"></div>' +
    `<button class="primary-btn form-submit" data-act="import-go" disabled>Импортировать${icon('download')}</button></div>`;
}

// Настройки импорта из формы и разобранный список
function readImport() {
  const val = (name) => document.querySelector(`[name="${name}"]:checked`)?.value;
  const termSep = val('imp-term') === 'custom' ? $('imp-term-custom').value : val('imp-term');
  const cardSep = val('imp-card') === 'custom' ? $('imp-card-custom').value : val('imp-card');
  const target = val('imp-target');
  const moduleId = target === 'existing' ? $('imp-module').value : null;
  const existingTerms = moduleId ? core.module(moduleId).cards.map((c) => c.term) : [];
  const parsed = KlavaCore.parseImport($('imp-text').value, { termSep, cardSep, existingTerms });
  const skip = $('imp-skip').checked;
  const toAdd = parsed.cards.filter((c) => !(skip && c.duplicate));
  return { parsed, toAdd, moduleId };
}

function updateImportPreview() {
  const { parsed, toAdd } = readImport();
  const dups = parsed.cards.filter((c) => c.duplicate).length;
  const badge = { module: 'уже в модуле', paste: 'повтор' };
  const summary = [plural(parsed.cards.length, 'карточка', 'карточки', 'карточек'),
    dups && plural(dups, 'повтор', 'повтора', 'повторов'),
    parsed.unparsed.length && plural(parsed.unparsed.length, 'строка не разобрана', 'строки не разобраны', 'строк не разобрано'),
  ].filter(Boolean).join(' · ');
  $('imp-preview').innerHTML = !parsed.cards.length && !parsed.unparsed.length ? '' :
    `<p class="imp-summary">${summary}</p>` +
    (parsed.cards.length ? `<ol class="card-list">${parsed.cards.map((c) =>
      `<li class="${c.duplicate ? 'dup' : ''}"><span class="card-term">${escapeHtml(c.term)}` +
      `${c.duplicate ? ` <small class="dup-badge">${badge[c.duplicate]}</small>` : ''}</span>` +
      `<span class="card-def">${escapeHtml(c.definition || '— переведётся автоматически')}</span></li>`).join('')}</ol>` : '') +
    (parsed.unparsed.length ? '<p class="imp-summary">Не разобраны — нет разделителя или термина:</p>' +
      `<ul class="imp-unparsed">${parsed.unparsed.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>` : '');
  const go = document.querySelector('[data-act="import-go"]');
  go.disabled = !toAdd.length;
  go.textContent = toAdd.length ? `Импортировать ${plural(toAdd.length, 'карточку', 'карточки', 'карточек')}` : 'Импортировать';
}

function onImportInput(e) {
  if (!e.target.closest('#import-form')) return;
  // ввели свой разделитель — выбираем вариант «Свой»
  const custom = { 'imp-term-custom': 'imp-term', 'imp-card-custom': 'imp-card' }[e.target.id];
  if (custom) document.querySelector(`[name="${custom}"][value="custom"]`).checked = true;
  if (e.target.id === 'imp-title' || e.target.id === 'imp-folder') document.querySelector('[name="imp-target"][value="new"]').checked = true;
  if (e.target.id === 'imp-module') document.querySelector('[name="imp-target"][value="existing"]').checked = true;
  updateImportPreview();
}

async function doImport() {
  const { toAdd, moduleId: target } = readImport();
  let moduleId = target;
  if (!moduleId) {
    const title = $('imp-title');
    if (!title.value.trim()) { title.value = ''; title.required = true; title.reportValidity(); return; }
    const langs = readLangs('imp');
    store.set('new-langs', langs);
    moduleId = core.createModule({ title: title.value, folderId: $('imp-folder').value, langs }).id;
  }
  const added = core.addCards(moduleId, toAdd.map(({ term, definition }) => ({ term, definition })));
  // пустые определения заполняем переводом, как в редакторе, и ждём его, чтобы модуль открылся уже с ним
  const empty = added.filter((x) => !x.definition).slice(0, 100);
  if (empty.length) {
    const go = document.querySelector('[data-act="import-go"]');
    go.disabled = true;
    go.textContent = 'Перевожу…';
    await Promise.all(empty.map((c) => fillTranslation(moduleId, c.id, c.term)));
  }
  location.hash = `#/module/${moduleId}`;
  toast(`Импортировано: ${plural(added.length, 'карточка', 'карточки', 'карточек')}`, 'download');
}

// Строка карточки в редакторе. Без карточки — пустая строка внизу для новой
// moveTo — свои модули, куда карточку можно перенести
// Квадрат «Изображение»: картинка карточки или приглашение добавить
const imageBox = (c) => (c?.image
  ? `<div class="image-box has-image" data-act="card-image" title="Заменить картинку"><img src="${escapeAttr(c.image)}" alt="">` +
    `<button class="image-remove" data-act="card-image-remove" title="Убрать картинку">${icon('x')}</button></div>`
  : `<div class="image-box" data-act="card-image" tabindex="0" title="Выбрать файл, перетащить или вставить Ctrl+V">${icon('image')}<span>Изображение</span></div>`);

// Карточка в редакторе. Без карточки — пустая внизу для новой: та же разметка, инструменты спрятаны,
// чтобы после ввода термина строка стала карточкой на месте и фокус не сбился
function editCardRow(c, i, moveTo = []) {
  // многострочное поле в одну строку высотой: длинный текст переносится вниз, поле растёт (см. autosize)
  const input = (field, label, value = '') =>
    `<label class="field big"><textarea data-field="${field}" rows="1" autocomplete="off">${escapeHtml(value || '')}</textarea><span>${label}</span></label>`;
  const hasMore = c && (c.example || c.exampleTranslation || c.explanation);
  // без карточки — черновик: выглядит как обычная карточка и сохраняется, когда введён термин
  return `<li class="edit-card${c ? '' : ' draft'}"${c ? ` data-card="${escapeAttr(c.id)}"` : ''}>` +
    '<div class="edit-card-head">' +
    `<span class="edit-num">${i + 1}</span>` +
    '<span class="edit-tools">' +
    `<button class="icon-btn drag-handle" title="Перетащить">${icon('grip')}</button>` +
    `<button class="icon-btn" data-act="card-delete" title="Удалить карточку">${icon('trash')}</button></span></div>` +
    '<div class="edit-card-body">' +
    `<div class="edit-main">${input('term', 'Термин', c?.term)}${input('definition', 'Определение', c?.definition)}` +
    '<div class="tr-suggest" hidden></div></div>' +
    `${imageBox(c)}</div>` +
    `<details class="edit-more"${hasMore ? ' open' : ''}><summary>${moveTo.length ? 'Пример, объяснение, перенос' : 'Пример и объяснение'}</summary>` +
    `<div class="edit-more-grid">${input('example', 'Пример', c?.example)}${input('exampleTranslation', 'Перевод примера', c?.exampleTranslation)}</div>` +
    `<label class="field big"><textarea data-field="explanation" rows="2">${escapeHtml(c?.explanation || '')}</textarea><span>Объяснение</span></label>` +
    (moveTo.length ? '<label class="field"><span>Перенести в модуль</span><select data-move><option value="">—</option>' +
      `${moveTo.map((m) => `<option value="${escapeAttr(m.id)}">${escapeHtml(m.title)}</option>`).join('')}</select></label>` : '') +
    '</details></li>';
}

const moveTargets = (moduleId) => ownModules().filter((m) => m.id !== moduleId);
// Карточки модуля; у пустого модуля — одна пустая карточка, чтобы сразу начать. Новые добавляет сам человек
const editCardList = (m) => {
  const moveTo = moveTargets(m.id);
  return m.cards.length ? m.cards.map((c, i) => editCardRow(c, i, moveTo)).join('') : editCardRow(null, 0);
};
const renumberCards = () => $('edit-cards').querySelectorAll('.edit-card').forEach((r, i) => {
  r.querySelector('.edit-num').textContent = i + 1;
});

// «+ Добавить карточку» и Enter в определении: каждый раз новая пустая карточка в конце, курсор — в её термин.
// Пустые карточки не сохраняются: уйдёте со страницы — их не станет
function addCardRow() {
  const list = $('edit-cards');
  list.insertAdjacentHTML('beforeend', editCardRow(null, list.children.length));
  const row = list.lastElementChild;
  row.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
  row.querySelector('[data-field="term"]').focus({ preventScroll: true });
}

// ---------- Сохранение в редакторе ----------
// Правки применяются сразу (их видно, и они не пропадут при сбое связи), но до «Сохранить изменения»
// считаются черновыми: при входе в редактор запоминаем снимок модуля. Ушли, не сохранив, и выбрали
// «Не сохранять» — модуль возвращается к снимку
const editSession = { id: null, snapshot: null, dirty: false };
const saveButton = () => `<button type="button" class="primary-btn edit-save${editSession.dirty ? ' dirty' : ''}" data-act="edit-save">` +
  `${editSession.dirty ? `${icon('check')}Сохранить изменения` : 'Готово'}</button>`;

function startEditSession(id) {
  if (editSession.id !== id) Object.assign(editSession, { id, snapshot: core.moduleSnapshot(id), dirty: false });
}
const endEditSession = () => Object.assign(editSession, { id: null, snapshot: null, dirty: false });

function markDirty() {
  if (!editSession.id || editSession.dirty) return;
  editSession.dirty = true;
  for (const b of document.querySelectorAll('[data-act="edit-save"]')) b.outerHTML = saveButton();
}

function saveEdits() {
  document.activeElement?.blur?.(); // дописать поле, в котором стоит курсор (событие change)
  const { id, dirty } = editSession;
  endEditSession();
  location.hash = `#/module/${id}`;
  if (dirty) toast('Изменения сохранены', 'check');
}

// Уходят из редактора с несохранёнными правками: остаёмся на месте и спрашиваем.
// Возвращает true, если переход отложен до ответа
function guardEdits(r) {
  if (!editSession.id || (r.screen === 'edit' && r.id === editSession.id)) return false;
  if (!editSession.dirty) { endEditSession(); return false; }
  const target = location.hash;
  history.replaceState(null, '', `#/module/${editSession.id}/edit`);
  openDialog({
    title: 'Сохранить изменения?', text: 'Вы изменили модуль, но не сохранили правки.',
    ok: 'Сохранить', cancelLabel: 'Не сохранять',
  }).then((choice) => {
    if (choice === null) return; // передумали уходить
    if (!choice) {
      try { core.restoreModule(editSession.snapshot); } catch {}
      toast('Изменения отменены', 'x');
    } else toast('Изменения сохранены', 'check');
    endEditSession();
    location.hash = target;
  });
  return true;
}

function renderEditModule(id) {
  const m = core.module(id);
  return `<div class="form" data-module="${escapeAttr(id)}">` +
    `<div class="edit-head"><h1>Изменение модуля</h1>${saveButton()}</div>` +
    `<label class="field"><span>Название</span><input id="edit-title" value="${escapeAttr(m.title)}"></label>` +
    `<label class="field"><span>Папка</span>${folderSelect('edit-folder', m.folderId)}</label>` +
    langFields('edit', m.langs || DEFAULT_LANGS) +
    '<div class="edit-cards-head"><h2 class="edit-cards-title">Карточки</h2>' +
    '<small>Карточка сохраняется, когда введён термин; пустые карточки не сохраняются. Если языки сторон разные, под определением появятся варианты перевода — нажмите нужные</small></div>' +
    `<ol id="edit-cards" class="edit-cards">${editCardList(m)}</ol>` +
    `<button type="button" class="add-card" data-act="card-add">${icon('plus')}Добавить карточку<kbd>Enter</kbd></button>` +
    `<div class="edit-footer">${saveButton()}</div></div>`;
}

// Хлебные крошки под шапкой: Главная › папка › модуль. На самой главной их нет
function renderCrumbs(items) {
  const home = `<a class="crumb-home" href="#/">${icon('home')}Главная</a>`;
  $('crumbs').innerHTML = items.length ? home + items.map(([href, title]) =>
    '<span class="crumb-sep">›</span>' +
    (href ? `<a href="${href}">${escapeHtml(title)}</a>` : `<span>${escapeHtml(title)}</span>`)).join('') : '';
}

// Режимы-страницы по колоде (модулю или «Сегодня»)
const MODE_NAMES = { cards: 'Карточки', learn: 'Заучивание', test: 'Тест', match: 'Подбор пар' };
function startMode(screen, deckId) {
  ({ cards: startFlash, learn: startLearn, test: startTest, match: startMatch })[screen](deckId);
}

function parseRoute() {
  const [screen, id, mode] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  if (screen === 'folder' && folderOf(id)) return { screen, id };
  if (screen === 'module' && id !== 'custom' && lessonInfo(id)) {
    if (mode === 'type') return { screen: 'trainer', id };
    if (mode === 'edit' && isOwnModule(id)) return { screen: 'edit', id };
    if (MODE_NAMES[mode]) return { screen: mode, id };
    return { screen: 'module', id };
  }
  if (screen === 'new') return { screen, id: moduleFolders().some((f) => f.id === id) ? id : null };
  if (screen === 'import') {
    return {
      screen,
      folderId: id === 'folder' && moduleFolders().some((f) => f.id === mode) ? mode : null,
      moduleId: id === 'module' && isOwnModule(mode) ? mode : null,
    };
  }
  if (screen === 'custom') return { screen: 'trainer', id: 'custom' };
  if (screen === 'today') {
    if (id === 'type') return { screen: 'trainer', id: 'today' };
    if (MODE_NAMES[id]) return { screen: id, id: 'today' };
    return { screen: 'today' };
  }
  return { screen: 'home' };
}

let onTrainer = false; // открыт ли тренажёр — иначе клавиши набора не обрабатываются

function route() {
  const r = parseRoute();
  document.activeElement?.blur?.(); // дописать поле редактора до проверки несохранённых правок
  if (guardEdits(r)) return;
  if (r.screen === 'home' && location.hash.replace(/^#\/?/, '')) history.replaceState(null, '', '#/');
  if (onTrainer) leaveTrainer();
  stopMatchTimer();
  // без входа — только главная с рассказом о платформе, любой адрес ведёт на неё
  const guest = !cloud.user;
  document.body.classList.toggle('guest', guest);
  $('page-body').classList.toggle('landing-page', guest);
  onTrainer = !guest && r.screen === 'trainer';
  $('trainer').hidden = !onTrainer;
  $('page').hidden = onTrainer;
  scrollTo(0, 0);
  renderModeSwitch(!guest && !onTrainer && MODE_NAMES[r.screen] ? r.id : null, r.screen);
  if (guest) {
    if (location.hash.replace(/^#\/?/, '')) history.replaceState(null, '', '#/');
    renderCrumbs([]);
    $('page-body').innerHTML = renderLanding();
    initLanding();
    return;
  }
  if (onTrainer) { openTrainer(r.id); return; }

  if (r.screen === 'today') {
    renderCrumbs([[null, 'Сегодня']]);
    $('page-body').innerHTML = renderToday();
  } else if (r.id === 'today') {
    // режим по очереди «Сегодня»
    renderCrumbs([['#/today', 'Сегодня'], [null, MODE_NAMES[r.screen]]]);
    startMode(r.screen, 'today');
  } else if (r.screen === 'module' || r.screen === 'edit' || MODE_NAMES[r.screen]) {
    core.markOpened(r.id);
    const l = lessonInfo(r.id);
    const folderCrumb = [`#/folder/${l.group}`, folderOf(l.group).title];
    if (MODE_NAMES[r.screen]) {
      renderCrumbs([folderCrumb, [`#/module/${r.id}`, l.title], [null, MODE_NAMES[r.screen]]]);
      startMode(r.screen, r.id);
    } else if (r.screen === 'edit') {
      startEditSession(r.id);
      renderCrumbs([folderCrumb, [`#/module/${r.id}`, l.title], [null, 'Изменение']]);
      $('page-body').innerHTML = renderEditModule(r.id);
      autosizeEditor();
    } else {
      renderCrumbs([folderCrumb, [null, l.title]]);
      $('page-body').innerHTML = renderModule(r.id);
    }
  } else if (r.screen === 'import') {
    renderCrumbs([[null, 'Импорт']]);
    $('page-body').innerHTML = renderImport(r);
    $('imp-text').focus();
  } else if (r.screen === 'new') {
    renderCrumbs([[null, 'Новый модуль']]);
    $('page-body').innerHTML = renderNewModule(r.id);
    $('new-title').focus();
  } else if (r.screen === 'folder') {
    renderCrumbs([[null, folderOf(r.id).title]]);
    $('page-body').innerHTML = renderFolder(r.id);
  } else {
    renderCrumbs([]);
    $('page-body').innerHTML = renderHome();
  }
}

// Под карточками, заучиванием, тестом и подбором пар — остальные режимы той же колоды.
// Блок можно скрыть; выбор запоминается
const MODES = [
  ['cards', 'cards', 'Карточки', 'Переворачивать и отмечать «знаю / не знаю»'],
  ['learn', 'target', 'Заучивание', 'Выбор из вариантов, потом ввод ответа'],
  ['test', 'test', 'Тест', 'Вопросы разных типов и оценка в конце'],
  ['match', 'match', 'Подбор пар', 'Соединить термины с переводами на время'],
  ['type', 'keyboard', 'Набор', 'Печатать слова и фразы, диктант, перевод на английский'],
];
// el — куда рисовать: под занятием на странице или в тренажёре набора
function renderModeSwitch(deckId, current, el = $('mode-switch')) {
  el.hidden = !deckId;
  if (!deckId) { el.innerHTML = ''; return; }
  const hidden = store.get('other-modes-hidden', false);
  const modes = MODES.filter(([m]) => m !== current && (m !== 'type' || canTypeDeck(deckId)));
  el.innerHTML = '<div class="mode-switch-head">' + (hidden ? '' : '<h2>Другие режимы</h2>') +
    `<button class="pill-btn" data-act="toggle-modes">${icon(hidden ? 'eye' : 'eye-off')} ${hidden ? 'Показать другие режимы' : 'Скрыть другие режимы'}</button></div>` +
    (hidden ? '' : '<div class="modes">' + modes.map(([m, iconName, title, sub]) =>
      `<a class="mode-btn" data-mode="${m}" href="${deckHref(deckId)}/${m}"><span class="mode-icon">${icon(iconName)}</span>` +
      `<span class="tile-text"><b>${title}</b><small>${sub}</small></span></a>`).join('') + '</div>');
  el.classList.toggle('collapsed', hidden);
}

function openTrainer(id) {
  state.lessonId = id;
  if (!SPECIAL[id]) core.markOpened(id);
  const l = lessonInfo(id);
  $('lesson-icon').innerHTML = lessonBadge(id);
  $('lesson-group').textContent = l.group ? folderOf(l.group).title : 'Повторение';
  $('lesson-title').textContent = l.title;
  $('back').href = id === 'custom' ? '#/' : deckHref(id);
  $('back').title = { custom: 'На главную', today: 'К повторению' }[id] || 'К модулю';
  renderModeSwitch(id === 'custom' ? null : id, 'type', $('trainer-modes'));
  startLesson();
}

// ---------- Действия на страницах: папки, модули, редактор карточек ----------
// Редактор сохраняет каждое поле сразу при выходе из него (событие change)
const editorModule = () => $('page-body').querySelector('[data-module]')?.dataset.module;
const cardRow = (cardId) => $('edit-cards').querySelector(`[data-card="${CSS.escape(cardId)}"]`);

function renderEditCrumbs(id) {
  const l = lessonInfo(id);
  renderCrumbs([[`#/folder/${l.group}`, folderOf(l.group).title], [`#/module/${id}`, l.title], [null, 'Изменение']]);
}

// Пустое определение заполняем переводом термина, если пользователь не успел ввести своё
// Автоперевод — только между разными языками: у модуля терминов определение пишет сам человек
function fillTranslation(moduleId, cardId, term) {
  const langs = langsOf(moduleId);
  if (langs.term === langs.definition) return Promise.resolve();
  return translate(term, langs.term, langs.definition).then((tr) => {
    const card = tr && core.module(moduleId)?.cards.find((c) => c.id === cardId);
    if (!card || card.definition) return;
    const input = editorModule() === moduleId && cardRow(cardId)?.querySelector('[data-field="definition"]');
    if (input && input.value.trim()) return;
    core.updateCard(moduleId, cardId, { definition: tr });
    if (input) input.value = tr;
  });
}

// ---------- Варианты перевода в редакторе ----------
// Ввели термин — под определением появляются варианты из Google Переводчика (главный перевод и словарные
// значения по частям речи). Нажатие добавляет вариант в определение через запятую, повторное — убирает.
// Сами в определение ничего не вставляем
const variantsCache = {};
function translateVariants(word, from, to) {
  const key = `${from}>${to}:${word}`;
  variantsCache[key] ??= fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&dt=bd&q=` +
    encodeURIComponent(word))
    .then((r) => r.json())
    .then((j) => {
      const main = (j[0] || []).map((x) => x[0]).join('').trim();
      // словарь: [часть речи, [слова], [[слово, обратные переводы, _, частота], …]]; берём по 3 самых частых
      const dict = (j[1] || []).flatMap(([pos, , entries]) => (entries || [])
        .filter((e) => e[3] === undefined || e[3] >= 0.0005).slice(0, 3).map((e) => ({ text: e[0], pos })));
      const seen = new Set();
      return [{ text: main, pos: '' }, ...dict].filter((v) => {
        const k = v.text.toLowerCase();
        if (!v.text || seen.has(k)) return false;
        seen.add(k);
        return true;
      }).slice(0, 9);
    })
    .catch(() => { delete variantsCache[key]; return []; });
  return variantsCache[key];
}

const defParts = (text) => text.split(/\s*[,;]\s*/).map((x) => x.trim()).filter(Boolean);

function drawSuggest(row, variants) {
  const box = row.querySelector('.tr-suggest');
  const chosen = new Set(defParts(row.querySelector('[data-field="definition"]').value).map((x) => x.toLowerCase()));
  box.hidden = !variants.length;
  box.innerHTML = variants.length ? '<small>Варианты перевода</small><div class="tr-chips">' + variants.map((v) =>
    `<button type="button" class="tr-chip${chosen.has(v.text.toLowerCase()) ? ' on' : ''}" data-act="tr-pick" ` +
    `data-text="${escapeAttr(v.text)}"${v.pos ? ` title="${escapeAttr(v.pos)}"` : ''}>${escapeHtml(v.text)}</button>`).join('') + '</div>' : '';
}

let suggestTimer = 0;
function suggestTranslations(row, delay = 0) {
  clearTimeout(suggestTimer);
  const id = editorModule();
  const term = row.querySelector('[data-field="term"]').value.trim();
  const langs = langsOf(id);
  if (!term || langs.term === langs.definition) { drawSuggest(row, []); return; }
  suggestTimer = setTimeout(() => {
    // первую букву делаем строчной: Monitor → «монитор», а не «Монитор»; имена собственные Google оставит с большой
    translateVariants(term[0].toLowerCase() + term.slice(1), langs.term, langs.definition).then((variants) => {
      // пока ждали ответа, термин могли поменять
      if (row.isConnected && row.querySelector('[data-field="term"]').value.trim() === term) {
        // варианты показываем у одной карточки — той, с которой работают
        for (const other of $('edit-cards').querySelectorAll('.tr-suggest:not([hidden])')) if (!row.contains(other)) other.hidden = true;
        drawSuggest(row, variants);
      }
    });
  }, delay);
}

// нажатие на вариант: добавить в определение или убрать из него
function pickVariant(btn) {
  const row = btn.closest('.edit-card');
  const def = row.querySelector('[data-field="definition"]');
  const text = btn.dataset.text;
  const parts = defParts(def.value);
  const at = parts.findIndex((x) => x.toLowerCase() === text.toLowerCase());
  if (at >= 0) parts.splice(at, 1); else parts.push(text);
  def.value = parts.join(', ');
  autosize(def);
  def.dispatchEvent(new Event('input', { bubbles: true }));
  def.dispatchEvent(new Event('change', { bubbles: true }));
  btn.classList.toggle('on', at < 0);
}

// Поля карточек растут по высоте вместе с текстом; переносы строк из вставки заменяем пробелами
function autosize(el) {
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}
const autosizeEditor = () => document.querySelectorAll('.edit-card .field.big textarea').forEach(autosize);

// Черновик становится карточкой на месте, без перерисовки: фокус остаётся там, куда его перевёл человек.
// Карточка встаёт в модуле туда же, где стоит в списке
function promoteDraft(moduleId, row, card) {
  row.classList.remove('draft');
  row.dataset.card = card.id;
  const index = [...$('edit-cards').querySelectorAll('.edit-card[data-card]')].indexOf(row);
  if (index !== core.module(moduleId).cards.length - 1) core.moveCard(moduleId, card.id, index);
}

function onEditorChange(e) {
  const id = editorModule();
  const el = e.target;
  if (!id) return;
  if (el.id === 'edit-title') {
    if (!el.value.trim()) { el.value = core.module(id).title; return; }
    core.updateModule(id, { title: el.value });
    renderEditCrumbs(id);
    return;
  }
  if (el.id === 'edit-term-lang' || el.id === 'edit-def-lang') {
    core.updateModule(id, { langs: { [el.id === 'edit-term-lang' ? 'term' : 'definition']: el.value } });
    store.set('new-langs', core.module(id).langs);
    return;
  }
  if (el.id === 'edit-folder') {
    core.updateModule(id, { folderId: el.value });
    renderEditCrumbs(id);
    return;
  }
  const row = el.closest('.edit-card');
  if ('move' in el.dataset && el.value) {
    core.moveCardTo(id, row.dataset.card, el.value);
    $('edit-cards').innerHTML = editCardList(core.module(id));
    autosizeEditor();
    return;
  }
  const field = el.dataset.field;
  if (!field || !row) return;
  const defInput = row.querySelector('[data-field="definition"]');

  if (row.classList.contains('draft')) {
    // карточка сохраняется, когда введён термин; остальные поля черновика — вместе с ней
    const term = row.querySelector('[data-field="term"]').value;
    if (!term.trim()) return;
    const fields = { term };
    for (const input of row.querySelectorAll('[data-field]')) if (input.value.trim()) fields[input.dataset.field] = input.value;
    const card = core.addCard(id, fields);
    promoteDraft(id, row, card);
    if (!card.definition) suggestTranslations(row);
    return;
  }

  const cardId = row.dataset.card;
  if (field === 'term' && !el.value.trim()) {
    // без термина карточки не бывает: возвращаем прежний, удалить — кнопкой ✕
    el.value = core.module(id).cards.find((c) => c.id === cardId).term;
    return;
  }
  core.updateCard(id, cardId, { [field]: el.value });
  if (field === 'term') suggestTranslations(row);
}

function onEditorCardAction(act, cardId, row) {
  const id = editorModule();
  if (!cardId) {
    // черновик: удалить — просто убрать из списка; картинку — после термина
    if (act === 'card-delete') { row.remove(); renumberCards(); }
    else if (act === 'card-image') toast('Сначала введите термин', 'image');
    return;
  }
  if (act === 'card-delete') {
    markDirty();
    core.deleteCard(id, cardId);
    $('edit-cards').innerHTML = editCardList(core.module(id));
    autosizeEditor();
  } else if (act === 'card-image') {
    pickImage(id, cardId);
  } else if (act === 'card-image-remove') {
    markDirty();
    core.updateCard(id, cardId, { image: '' });
    refreshImageBox(id, cardId);
  }
}

// ---------- Картинки карточек ----------
// Картинку уменьшаем до 480 px по длинной стороне и сжимаем в WebP (около 20–40 КБ):
// она хранится прямо в карточке — в браузере, а после входа — в облаке
async function compressImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Не удалось открыть картинку'));
      el.src = url;
    });
    const scale = Math.min(1, 480 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    let quality = 0.8;
    let data = canvas.toDataURL('image/webp', quality);
    if (!data.startsWith('data:image/webp')) data = canvas.toDataURL('image/jpeg', quality); // браузер без WebP
    while (data.length > 60000 && quality > 0.4) {
      quality -= 0.1;
      data = canvas.toDataURL(data.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg', quality);
    }
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function setCardImage(moduleId, cardId, file) {
  if (!file || !file.type.startsWith('image/')) { toast('Это не картинка', 'alert'); return; }
  try {
    core.updateCard(moduleId, cardId, { image: await compressImage(file) });
    markDirty();
    refreshImageBox(moduleId, cardId);
    toast('Картинка добавлена', 'image');
  } catch (e) {
    toast(e.message, 'alert');
  }
}

function refreshImageBox(moduleId, cardId) {
  const box = cardRow(cardId)?.querySelector('.image-box');
  if (box) box.outerHTML = imageBox(core.module(moduleId).cards.find((c) => c.id === cardId));
}

function pickImage(moduleId, cardId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = () => setCardImage(moduleId, cardId, input.files[0]);
  input.click();
}

// Картинку можно перетащить из папки на квадрат или вставить Ctrl+V, пока курсор в карточке
function initImageInput() {
  const body = $('page-body');
  // пока над окном тащат файл, поля «Изображение» становятся крупнее — в них проще попасть
  let depth = 0;
  const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
  const stopFileDrag = () => { depth = 0; document.body.classList.remove('dragging-files'); };
  document.addEventListener('dragenter', (e) => {
    if (!hasFiles(e)) return;
    depth++;
    document.body.classList.add('dragging-files');
  });
  document.addEventListener('dragleave', (e) => {
    if (hasFiles(e) && --depth <= 0) stopFileDrag();
  });
  // файл бросили мимо поля — не открывать его вместо сайта
  document.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
  document.addEventListener('drop', (e) => { if (hasFiles(e)) e.preventDefault(); stopFileDrag(); });
  body.addEventListener('dragover', (e) => {
    const box = e.target.closest('.edit-card .image-box');
    if (!box) return;
    e.preventDefault();
    box.classList.add('drop');
  });
  body.addEventListener('dragleave', (e) => e.target.closest('.image-box')?.classList.remove('drop'));
  body.addEventListener('drop', (e) => {
    const box = e.target.closest('.edit-card .image-box');
    if (!box) return;
    e.preventDefault();
    box.classList.remove('drop');
    const row = box.closest('.edit-card');
    if (!row.dataset.card) { toast('Сначала введите термин', 'image'); return; }
    setCardImage(editorModule(), row.dataset.card, e.dataTransfer.files[0]);
  });
  document.addEventListener('paste', (e) => {
    const row = document.activeElement?.closest?.('.edit-card[data-card]');
    const file = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith('image/'));
    if (!row || !file) return;
    e.preventDefault();
    setCardImage(editorModule(), row.dataset.card, file);
  });
}

// ---------- Перетаскивание карточек в редакторе ----------
// Тянем за ручку: карточка едет за указателем (мышь или палец), остальные расступаются; отпустили — порядок сохранён
// Тянем за ручку: карточка плавно едет за указателем (мышь или палец), остальные мягко расступаются;
// отпустили — карточка встаёт на место, порядок сохранён
const SLIDE = 'transform .22s cubic-bezier(.2, .8, .2, 1)';

// Перестановка с плавным сдвигом (FLIP): запоминаем, где карточки были, меняем порядок,
// и каждая едет со старого места на новое
function slideRows(rows, change) {
  const was = new Map(rows.map((r) => [r, r.getBoundingClientRect().top]));
  change();
  for (const r of rows) {
    const dy = was.get(r) - r.getBoundingClientRect().top;
    if (!dy) continue;
    r.style.transition = 'none';
    r.style.transform = `translateY(${dy}px)`;
    r.getBoundingClientRect(); // применить сдвиг до начала анимации
    r.style.transition = reducedMotion() ? 'none' : SLIDE;
    r.style.transform = '';
  }
}

function initCardDrag() {
  $('page-body').addEventListener('pointerdown', (e) => {
    const handle = e.target.closest('.edit-card[data-card] .drag-handle');
    if (!handle) return;
    e.preventDefault();
    const row = handle.closest('.edit-card');
    const list = row.parentElement;
    const moduleId = editorModule();
    const saved = () => [...list.querySelectorAll('.edit-card[data-card]')];
    const startIndex = saved().indexOf(row);
    const grabY = e.clientY + scrollY;
    const startTop = row.offsetTop;
    let lastY = e.clientY;
    let scrollTimer = 0;
    row.classList.add('dragging');
    row.style.transition = 'none';
    try { handle.setPointerCapture(e.pointerId); } catch {}

    // карточка под указателем; место в списке меняем, когда её середина прошла середину соседней
    const follow = () => {
      const top = startTop + (lastY + scrollY - grabY);
      const mid = top + row.offsetHeight / 2;
      const others = saved().filter((r) => r !== row);
      const before = others.find((r) => mid < r.offsetTop + r.offsetHeight / 2) || null;
      const target = before || list.querySelector('.edit-card.draft');
      if (row.nextElementSibling !== target && !(target === null && !row.nextElementSibling)) {
        slideRows([...list.children].filter((r) => r !== row), () => list.insertBefore(row, target));
      }
      row.style.transform = `translateY(${top - row.offsetTop}px) scale(1.02)`;
    };
    // у края экрана — прокручиваем, пока держат
    const autoScroll = () => {
      const step = lastY < 80 ? -12 : lastY > innerHeight - 80 ? 12 : 0;
      if (step) { scrollBy(0, step); follow(); }
      scrollTimer = requestAnimationFrame(autoScroll);
    };
    const move = (ev) => { lastY = ev.clientY; follow(); };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      cancelAnimationFrame(scrollTimer);
      row.style.transition = reducedMotion() ? 'none' : SLIDE;
      row.style.transform = '';
      const done = () => { row.classList.remove('dragging'); row.style.transition = ''; };
      if (reducedMotion()) done(); else setTimeout(done, 230);
      const index = saved().indexOf(row);
      if (index !== startIndex) { core.moveCard(moduleId, row.dataset.card, index); markDirty(); }
      renumberCards();
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
    scrollTimer = requestAnimationFrame(autoScroll);
  });
}

function onPageAction(e) {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const act = btn.dataset.act;
  const r = parseRoute();
  if (act === 'voice-settings') {
    openVoiceDialog();
  } else if (act.startsWith('flash-')) {
    onFlashAction(act, btn);
  } else if (act.startsWith('learn-')) {
    onLearnAction(act, btn);
  } else if (act.startsWith('test-')) {
    onTestAction(act);
  } else if (act.startsWith('term-')) {
    onTermAction(act, btn.closest('.term-row'));
  } else if (act === 'study-filter') {
    const only = store.get('starred-only', {});
    store.set('starred-only', { ...only, [r.id]: btn.dataset.only === 'true' });
    refreshStudyFilter(r.id);
  } else if (act.startsWith('match-')) {
    onMatchAction(act, btn);
  } else if (act === 'new-folder') {
    askText('Новая папка', { placeholder: 'Например, «Английский B1»', ok: 'Создать' }).then((name) => {
      if (!name) return;
      location.hash = `#/folder/${core.createFolder(name).id}`;
      toast('Папка создана', 'folder');
    });
  } else if (act === 'rename-folder') {
    renameFolder(r.id);
  } else if (act === 'delete-folder') {
    deleteFolder(r.id);
  } else if (act === 'delete-module') {
    deleteModule(r.id);
  } else if (act === 'copy-module') {
    copyModule(r.id);
  } else if (act === 'hide-module') {
    hideModule(r.id);
  } else if (act === 'show-module') {
    core.showModule(r.id);
    route();
    toast('Модуль снова в папке', 'eye');
  } else if (act === 'import-go') {
    doImport();
  } else if (act === 'tr-pick') {
    pickVariant(btn);
  } else if (act === 'edit-save') {
    saveEdits();
  } else if (act === 'card-add') {
    addCardRow();
  } else if (act.startsWith('card-')) {
    const row = btn.closest('.edit-card');
    onEditorCardAction(act, row.dataset.card, row);
  }
}

// ---------- Действия с модулями и папками ----------
// Вызываются кнопками на странице модуля или папки и из меню плитки. Если удалили то, что сейчас открыто, —
// уходим на уровень выше, иначе просто перерисовываем страницу
const viewing = (id) => parseRoute().id === id;

function renameFolder(id) {
  askText('Переименовать папку', { value: folderOf(id).title, ok: 'Сохранить' }).then((name) => {
    if (name) { core.renameFolder(id, name); route(); }
  });
}

function deleteFolder(id) {
  const n = core.modules(id).length;
  const remove = () => {
    core.deleteFolder(id);
    if (viewing(id)) location.hash = '#/'; else route();
    toast('Папка удалена', 'trash');
  };
  if (!n) remove();
  else askConfirm(`Удалить папку «${folderOf(id).title}»?`, `Вместе с ней удалятся ${plural(n, 'модуль', 'модуля', 'модулей')}.`)
    .then((yes) => { if (yes) remove(); });
}

function deleteModule(id) {
  const l = lessonInfo(id);
  askConfirm(`Удалить модуль «${l.title}»?`, 'Все карточки модуля удалятся.').then((yes) => {
    if (!yes) return;
    core.deleteModule(id);
    if (viewing(id)) location.hash = `#/folder/${l.group}`; else route();
    toast('Модуль удалён', 'trash');
  });
}

function copyModule(id) {
  location.hash = `#/module/${core.copyModule(id).id}/edit`;
  toast('Копия создана — можно править', 'copy');
}

function hideModule(id) {
  core.hideModule(id);
  if (viewing(id)) location.hash = `#/folder/${lessonInfo(id).group}`; else route();
  toast('Модуль скрыт — он внизу папки', 'eye-off');
}

function moveModule(id) {
  const m = core.module(id);
  openDialog({
    title: `Переместить «${m.title}»`, text: 'В какую папку?', ok: 'Переместить',
    choices: [...moduleFolders().map((f) => [f.id, f.title]), [NEW_FOLDER, '+ Новая папка…']], value: m.folderId,
  }).then((folderId) => {
    if (!folderId || folderId === m.folderId) return;
    core.updateModule(id, { folderId });
    route();
    toast(`Модуль в папке «${folderOf(folderId).title}»`, 'folder');
  });
}

// ---------- Выпадающие списки: свои вместо системных ----------
// Настоящий <select> остаётся в разметке и хранит значение (код читает .value и слушает change),
// а видна кнопка со всплывающим списком. Подключаются сами ко всем спискам в формах и окнах
const PICKER_SELECTS = '.form select, .dialog select';
const picker = { list: null, select: null, button: null };

function enhanceSelect(sel) {
  sel.dataset.enhanced = '1';
  sel.dataset.prev = sel.value;
  sel.classList.add('picker-native');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'picker';
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');
  const label = sel.closest('label')?.querySelector(':scope > span, :scope > small')?.textContent;
  if (label) btn.setAttribute('aria-label', label);
  sel.after(btn);
  const sync = () => {
    btn.innerHTML = `<span>${escapeHtml(sel.selectedOptions[0]?.textContent || '')}</span>${icon('chevron')}`;
  };
  sync();
  sel.addEventListener('change', () => { sel.dataset.prev = sel.value; sync(); });
  sel.addEventListener('picker-sync', sync);
  btn.addEventListener('click', (e) => {
    e.preventDefault(); // кнопка внутри <label> — не передавать нажатие спрятанному списку
    if (picker.select === sel) closePicker();
    else openPicker(sel, btn);
  });
}

function closePicker(focusButton = false) {
  if (!picker.list) return;
  picker.list.remove();
  picker.button.setAttribute('aria-expanded', 'false');
  if (focusButton) picker.button.focus();
  Object.assign(picker, { list: null, select: null, button: null });
}

function openPicker(sel, btn) {
  closePicker();
  const list = document.createElement('div');
  list.className = 'picker-list';
  list.setAttribute('role', 'listbox');
  list.innerHTML = [...sel.options].map((o, i) => {
    const isNew = o.value === NEW_FOLDER;
    return `<button type="button" role="option" class="picker-option${o.selected ? ' selected' : ''}${isNew ? ' new' : ''}" ` +
      `data-i="${i}" aria-selected="${o.selected}">${isNew ? icon('plus') : ''}<span>${escapeHtml(isNew ? 'Новая папка…' : o.textContent)}</span>` +
      `${o.selected ? icon('check', 'check') : ''}</button>`;
  }).join('');
  // в открытом окне список кладём внутрь окна — иначе окно перекроет его
  (sel.closest('dialog') || document.body).append(list);
  const r = btn.getBoundingClientRect();
  const width = Math.max(r.width, 200);
  list.style.width = `${width}px`;
  list.style.left = `${Math.min(r.left, innerWidth - width - 8)}px`;
  const below = innerHeight - r.bottom - 8;
  const h = Math.min(list.scrollHeight, 300);
  if (below >= h || below >= r.top) { list.style.top = `${r.bottom + 6}px`; list.style.maxHeight = `${Math.max(120, below - 6)}px`; }
  else { list.style.bottom = `${innerHeight - r.top + 6}px`; list.style.maxHeight = `${Math.max(120, r.top - 14)}px`; }
  list.addEventListener('click', (e) => {
    const opt = e.target.closest('[data-i]');
    if (!opt) return;
    const value = sel.options[Number(opt.dataset.i)].value;
    closePicker(true);
    if (value === sel.value) return;
    sel.value = value;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  list.addEventListener('keydown', (e) => {
    const items = [...list.querySelectorAll('[data-i]')];
    const at = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      items[(at + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus();
    } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePicker(true); }
    else if (e.key === 'Tab') closePicker();
  });
  Object.assign(picker, { list, select: sel, button: btn });
  btn.setAttribute('aria-expanded', 'true');
  (list.querySelector('.selected') || list.querySelector('[data-i]'))?.focus({ preventScroll: true });
  list.querySelector('.selected')?.scrollIntoView({ block: 'nearest' });
}

function initPickers() {
  let queued = false;
  const enhanceAll = () => {
    queued = false;
    for (const sel of document.querySelectorAll(PICKER_SELECTS)) if (!sel.dataset.enhanced) enhanceSelect(sel);
  };
  new MutationObserver(() => {
    if (!queued) { queued = true; queueMicrotask(enhanceAll); }
  }).observe(document.body, { childList: true, subtree: true });
  enhanceAll();
  document.addEventListener('pointerdown', (e) => {
    if (picker.list && !picker.list.contains(e.target) && !picker.button.contains(e.target)) closePicker();
  }, true);
  addEventListener('resize', () => closePicker());
  addEventListener('scroll', (e) => { if (picker.list && !picker.list.contains(e.target)) closePicker(); }, true);
  addEventListener('hashchange', () => closePicker());

  // «+ Новая папка…» в любом списке папок: спросить название, создать, добавить во все списки папок и выбрать.
  // Перехватываем до остальных обработчиков, чтобы они не увидели служебное значение
  document.addEventListener('change', (e) => {
    const sel = e.target;
    if (sel.tagName !== 'SELECT' || sel.value !== NEW_FOLDER) return;
    e.stopImmediatePropagation();
    sel.value = sel.dataset.prev && sel.dataset.prev !== NEW_FOLDER ? sel.dataset.prev : sel.options[0].value;
    sel.dispatchEvent(new Event('picker-sync'));
    askText('Новая папка', { placeholder: 'Например, «Английский B1»', ok: 'Создать' }).then((name) => {
      if (!name) return;
      const f = core.createFolder(name);
      for (const other of document.querySelectorAll('select')) {
        const last = [...other.options].find((o) => o.value === NEW_FOLDER);
        if (last) last.before(new Option(f.title, f.id));
      }
      sel.value = f.id;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      toast(`Папка «${f.title}» создана`, 'folder');
    });
  }, true);
}

// ---------- Меню плитки: правая кнопка мыши, на телефоне — долгое касание ----------
function tileMenuItems(el) {
  const moduleId = el.dataset.tileModule;
  const folderId = el.dataset.tileFolder;
  if (moduleId) {
    const m = core.module(moduleId);
    if (!m) return null;
    if (!m.builtIn) {
      return [['open', 'arrow', 'Открыть'], ['edit', 'pen', 'Изменить'], ['move', 'folder', 'Переместить'],
        ['copy', 'copy', 'Скопировать'], ...(moduleId === 'mine' ? [] : [['delete', 'trash', 'Удалить']])];
    }
    return [['open', 'arrow', 'Открыть'], ['copy', 'copy', 'Скопировать и изменить'],
      core.isHidden(moduleId) ? ['show', 'eye', 'Вернуть в папку'] : ['hide', 'eye-off', 'Скрыть']];
  }
  if (folderId) {
    const f = folderOf(folderId);
    if (!f) return null;
    return [['open', 'arrow', 'Открыть'], ['new-here', 'plus', 'Новый модуль здесь'],
      ...(f.builtIn ? [] : [['rename', 'pen', 'Переименовать'], ['delete', 'trash', 'Удалить']])];
  }
  return null;
}

function runTileAction(act, el) {
  const moduleId = el.dataset.tileModule;
  const folderId = el.dataset.tileFolder;
  if (act === 'open') location.hash = el.getAttribute('href');
  else if (moduleId) {
    ({
      edit: () => { location.hash = `#/module/${moduleId}/edit`; },
      move: () => moveModule(moduleId),
      copy: () => copyModule(moduleId),
      delete: () => deleteModule(moduleId),
      hide: () => hideModule(moduleId),
      show: () => { core.showModule(moduleId); route(); toast('Модуль снова в папке', 'eye'); },
    })[act]?.();
  } else if (folderId) {
    ({
      'new-here': () => { location.hash = `#/new/${folderId}`; },
      rename: () => renameFolder(folderId),
      delete: () => deleteFolder(folderId),
    })[act]?.();
  }
}

const tileMenu = { el: null, tile: null };
function closeTileMenu() {
  tileMenu.el?.remove();
  tileMenu.el = null;
  tileMenu.tile?.classList.remove('menu-open');
  tileMenu.tile = null;
}

function openTileMenu(el, x, y) {
  const items = tileMenuItems(el);
  if (!items) return false;
  closeTileMenu();
  const menu = document.createElement('div');
  menu.className = 'ctx-menu';
  menu.setAttribute('role', 'menu');
  menu.innerHTML = items.map(([act, iconName, label]) =>
    `<button role="menuitem" class="ctx-item${act === 'delete' ? ' danger' : ''}" data-ctx="${act}">${icon(iconName)}${label}</button>`).join('');
  document.body.append(menu);
  // не вылезать за край экрана
  const w = menu.offsetWidth;
  const h = menu.offsetHeight;
  menu.style.left = `${Math.max(8, Math.min(x, innerWidth - w - 8))}px`;
  menu.style.top = `${Math.max(8, Math.min(y, innerHeight - h - 8))}px`;
  menu.addEventListener('click', (e) => {
    const act = e.target.closest('[data-ctx]')?.dataset.ctx;
    if (!act) return;
    const target = tileMenu.tile;
    closeTileMenu();
    runTileAction(act, target);
  });
  tileMenu.el = menu;
  tileMenu.tile = el;
  el.classList.add('menu-open');
  menu.querySelector('button').focus({ preventScroll: true });
  return true;
}

function initTileMenu() {
  const body = $('page-body');
  const tileAt = (target) => target.closest?.('[data-tile-module], [data-tile-folder]');
  body.addEventListener('contextmenu', (e) => {
    const el = tileAt(e.target);
    if (el && openTileMenu(el, e.clientX, e.clientY)) e.preventDefault();
  });
  // долгое касание: на iPhone браузер не присылает contextmenu для ссылок
  let press = null;
  let suppressClick = false;
  body.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    const el = tileAt(e.target);
    if (!el) return;
    press = { x: e.clientX, y: e.clientY, timer: setTimeout(() => {
      if (openTileMenu(el, press.x, press.y)) { suppressClick = true; navigator.vibrate?.(10); }
    }, 500) };
  });
  const cancelPress = () => { if (press) clearTimeout(press.timer); press = null; };
  body.addEventListener('pointermove', (e) => {
    if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) cancelPress();
  });
  body.addEventListener('pointerup', cancelPress);
  body.addEventListener('pointercancel', cancelPress);
  // касание, открывшее меню, не должно ещё и открыть плитку
  body.addEventListener('click', (e) => {
    if (!suppressClick) return;
    suppressClick = false;
    if (tileAt(e.target)) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  document.addEventListener('pointerdown', (e) => { if (tileMenu.el && !tileMenu.el.contains(e.target)) closeTileMenu(); }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeTileMenu(); });
  addEventListener('scroll', closeTileMenu, { passive: true });
  addEventListener('resize', closeTileMenu);
  addEventListener('hashchange', closeTileMenu);
}

function onNewModule(e) {
  if (e.target.id !== 'new-module') return;
  e.preventDefault();
  const titleInput = $('new-title');
  if (!titleInput.value.trim()) { titleInput.value = ''; titleInput.reportValidity(); return; }
  const langs = readLangs('new');
  store.set('new-langs', langs); // следующий модуль — с теми же языками
  const m = core.createModule({ title: titleInput.value, folderId: $('new-folder').value, langs });
  location.hash = `#/module/${m.id}/edit`;
}

function initPages() {
  initFlashSwipe();
  initTileMenu();
  initPickers();
  for (const box of [$('mode-switch'), $('trainer-modes')]) {
    box.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act="toggle-modes"]');
      if (!btn) return;
      btn.blur(); // в тренажёре клавиши должны уходить в набор, а не в кнопку
      store.set('other-modes-hidden', !store.get('other-modes-hidden', false));
      const r = parseRoute();
      if (onTrainer) renderModeSwitch(state.lessonId, 'type', $('trainer-modes'));
      else renderModeSwitch(r.id, r.screen);
    });
  }
  $('page-body').addEventListener('change', onTermInput);
  $('page-body').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !e.target.closest('.term-input')) return;
    e.target.blur();
    redrawTermRow(e.target.closest('.term-row'));
  });
  initCardDrag();
  initImageInput();
  $('page-body').addEventListener('keydown', (e) => {
    const field = e.key === 'Enter' && !e.isComposing && e.target.closest?.('.edit-main [data-field]');
    if (!field) return;
    e.preventDefault();
    const row = field.closest('.edit-card');
    if (field.dataset.field === 'term') { row.querySelector('[data-field="definition"]').focus(); return; }
    field.blur(); // сохранить поле (событие change)
    const next = row.nextElementSibling;
    if (next) next.querySelector('[data-field="term"]').focus();
    else addCardRow();
  });
  $('page-body').addEventListener('click', onPageAction);
  document.addEventListener('keydown', onFlashKey);
  document.addEventListener('keydown', onLearnKey);
  $('page-body').addEventListener('submit', onLearnSubmit);
  $('page-body').addEventListener('change', (e) => {
    if (e.target.id !== 'flash-shuffle') return;
    store.set('cards-shuffle', e.target.checked);
    e.target.blur();
    startFlash(flashcards.moduleId, { fresh: true });
  });
  $('page-body').addEventListener('change', onEditorChange);
  $('page-body').addEventListener('input', (e) => {
    const el = e.target;
    if (!el.matches?.('.edit-card .field.big textarea')) return;
    if (el.dataset.field !== 'explanation' && /\n/.test(el.value)) el.value = el.value.replace(/\s*\n\s*/g, ' ');
    autosize(el);
    if (el.dataset.field === 'term') suggestTranslations(el.closest('.edit-card'), 450);
  });
  addEventListener('resize', () => { if (editorModule()) autosizeEditor(); });
  $('page-body').addEventListener('focusin', (e) => {
    const row = e.target.closest?.('.edit-card');
    if (row && e.target.matches('[data-field="definition"]') && row.querySelector('.tr-suggest').hidden) suggestTranslations(row);
  });
  // любой ввод в редакторе — несохранённая правка
  for (const type of ['input', 'change']) {
    $('page-body').addEventListener(type, (e) => { if (e.target.closest?.('[data-module]')) markDirty(); });
  }
  $('page-body').addEventListener('change', onImportInput);
  $('page-body').addEventListener('input', onImportInput);
  $('page-body').addEventListener('submit', onNewModule);
}

// Ушли из тренажёра: замолчать и убрать всплывающее
function leaveTrainer() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  speakPending = false;
  $('result').hidden = true;
  state.lookup = null;
  hideTools();
}

// ---------- Озвучка ----------
function speak() {
  const chunk = state.chunks[state.index];
  if (chunk && !translateMode()) speakText(chunk.text); // в «Переводе» озвучка выключена
}

// В режиме «Перевод» озвучка выключена целиком: переключатель «Озвучка» неактивен
// и показан выключенным (сохранённое значение не трогаем), кнопка озвучки скрыта
function syncVoiceUi() {
  const tr = translateMode();
  const box = $('auto-read');
  box.disabled = tr;
  box.checked = tr ? false : store.get('auto-read', true);
  box.closest('.opt').classList.toggle('disabled', tr);
  $('speak').hidden = tr;
}

// Английские голоса браузера. По умолчанию берём самый живой:
// «Natural»/«Neural»/«Online» (Edge, Windows 11) → голоса Google (Chrome) → остальные
let voices = [];

// На iPhone и Mac среди голосов есть «шуточные» (Bad News, Bubbles, Zarvox…) и роботы Eloquence (Eddy, Flo,
// Grandpa…) — раньше при равных очках первым по алфавиту оказывался Albert или Bad News. Теперь они в самом конце,
// а впереди — улучшенные (Premium, Enhanced, Natural) и известные хорошие голоса
const JOKE_VOICES = /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Fred|Good News|Hysterical|Jester|Junior|Kathy|Organ|Pipe Organ|Ralph|Superstar|Trinoids|Whisper|Wobble|Zarvox|Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley)\b/i;
const GOOD_VOICES = /^(Samantha|Ava|Allison|Susan|Zoe|Evan|Nathan|Tom|Joelle|Noelle|Daniel|Serena|Kate|Oliver|Arthur|Martha|Karen|Lee|Moira|Tessa|Rishi|Milena|Yuri|Katya|Anu|Kert|Aria|Jenny|Guy|Libby|Sonia|Ryan|Svetlana|Dmitry)\b/i;
function voiceScore(v) {
  const id = `${v.name} ${v.voiceURI}`;
  let s = 0;
  if (JOKE_VOICES.test(v.name)) s -= 20;
  if (/natural|neural|online|premium/i.test(id)) s += 6;
  if (/enhanced/i.test(id)) s += 5;
  if (/compact/i.test(id)) s -= 2; // сжатый голос iPhone — самый простой
  if (GOOD_VOICES.test(v.name.replace(/^(Microsoft|Google|Apple)\s+/, ''))) s += 4;
  if (/google/i.test(v.name)) s += 3;
  if (/^en[-_](US|GB)/i.test(v.lang)) s += 1;
  if (/^en[-_]US/i.test(v.lang)) s += 1; // при прочих равных — американский: Samantha, а не Daniel
  if (v.default) s += 1;
  return s;
}

// Голоса языка, лучшие — первыми
const voicesFor = (lang) => speechSynthesis.getVoices()
  .filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(`${lang}-`) || v.lang.toLowerCase() === lang)
  .sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name));
// Выбранный голос языка хранится в настройках (английский — под прежним ключом voice)
const voiceKey = (lang) => (lang === 'en' ? 'voice' : `voice-${lang}`);
const voiceName = (v) => v.name.replace(/^(Microsoft|Google|Apple)\s+/, '').replace(/\s*[-–]\s*(English|Russian|Estonian).*$/i, '');

// Онлайн-голос Google: живее встроенных голосов iPhone, и есть эстонский. Выбран по умолчанию.
// Сервер отказывает запросам с адресом чужой страницы — поэтому в index.html стоит meta referrer no-referrer.
// Нет связи или сервер не ответил — читаем голосом браузера
const ONLINE_VOICE = 'online';
const ttsAudio = new Audio();
const onlineUrl = (text, lang) =>
  `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=${lang}&q=${encodeURIComponent(text.slice(0, 200))}`;

// Голос языка: 'online' или голос браузера, выбранный в окне «Озвучка» (английский — ещё и в настройках набора)
function voiceChoice(lang) {
  const saved = store.get(voiceKey(lang), ONLINE_VOICE);
  if (saved === ONLINE_VOICE) return ONLINE_VOICE;
  return voicesFor(lang).find((v) => v.name === saved) || ONLINE_VOICE;
}
// Голос браузера для языка: выбранный, иначе лучший
function systemVoice(lang) {
  const choice = voiceChoice(lang);
  return choice === ONLINE_VOICE ? voicesFor(lang)[0] || null : choice;
}

// Список голосов в настройках набора: онлайн-голос и английские голоса браузера
function loadVoices() {
  voices = voicesFor('en');
  const select = $('voice');
  select.innerHTML = '<option value="online">Google — онлайн</option>' + voices.map((v) =>
    `<option value="${escapeHtml(v.name)}">${escapeHtml(voiceName(v))} · ${v.lang.replace('_', '-')}</option>`).join('');
  const choice = voiceChoice('en');
  select.value = choice === ONLINE_VOICE ? ONLINE_VOICE : choice.name;
}

// Окно «Озвучка»: голос для каждого языка, кнопка прослушать и скорость
const VOICE_SAMPLES = { en: 'Hello! This is how I sound.', ru: 'Привет! Вот так я звучу.', et: 'Tere! Nii ma kõlan.' };
function openVoiceDialog() {
  const d = document.createElement('dialog');
  d.className = 'dialog';
  const row = (lang) => {
    const choice = voiceChoice(lang);
    const option = (value, label) => `<option value="${escapeAttr(value)}"${(choice === ONLINE_VOICE ? ONLINE_VOICE : choice.name) === value ? ' selected' : ''}>${escapeHtml(label)}</option>`;
    return `<div class="voice-row"><span class="voice-lang">${LANGS[lang].name}</span>` +
      `<select data-voice-lang="${lang}">${option(ONLINE_VOICE, 'Google — онлайн')}` +
      (('speechSynthesis' in window) ? voicesFor(lang).map((v) => option(v.name, voiceName(v))).join('') : '') + '</select>' +
      `<button type="button" class="icon-btn voice-play" data-voice-play="${lang}" title="Прослушать">${icon('play')}</button></div>`;
  };
  d.innerHTML = '<div class="dialog-body"><h2>Озвучка</h2>' +
    Object.keys(LANGS).map(row).join('') +
    `<label class="voice-rate"><span>Скорость</span><input type="range" min="0.6" max="1.2" step="0.05" value="${store.get('rate', 0.9)}"></label>` +
    '<p class="voice-tip">«Google — онлайн» звучит живее всего и умеет эстонский, но нужен интернет. ' +
    'Остальные голоса — из телефона или компьютера: на iPhone улучшенные скачиваются в Настройки → Универсальный доступ → ' +
    'Устный контент → Голоса.</p>' +
    '<div class="dialog-actions"><button type="button" class="primary-btn" data-dialog="close">Готово</button></div></div>';
  document.body.append(d);
  const close = () => { d.close(); d.remove(); if ('speechSynthesis' in window) loadVoices(); };
  d.addEventListener('change', (e) => {
    const lang = e.target.dataset.voiceLang;
    if (lang) { store.set(voiceKey(lang), e.target.value); speakText(VOICE_SAMPLES[lang], lang); }
    if (e.target.type === 'range') { store.set('rate', Number(e.target.value)); speakText(VOICE_SAMPLES.en); }
  });
  d.addEventListener('click', (e) => {
    const lang = e.target.closest('[data-voice-play]')?.dataset.voicePlay;
    if (lang) speakText(VOICE_SAMPLES[lang], lang);
    else if (e.target.closest('[data-dialog="close"]') || e.target === d) close();
  });
  d.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  d.showModal();
}

// auto — озвучка сама по себе, а не по нажатию: без голоса нужного языка молчим без предупреждения
function speakText(text, lang = 'en', auto = false) {
  if (!text) return;
  if (voiceChoice(lang) !== ONLINE_VOICE) { speakSystem(text, lang, auto); return; }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  let failed = false;
  const fallback = () => { if (!failed) { failed = true; speakSystem(text, lang, auto); } };
  ttsAudio.onerror = fallback;
  ttsAudio.src = onlineUrl(text, lang);
  ttsAudio.playbackRate = store.get('rate', 0.9);
  ttsAudio.play().catch((e) => { if (e.name !== 'AbortError') fallback(); }); // AbortError — следующее слово прервало это
}

// Голос браузера. Чужой голос прочитал бы, например, эстонский с английским акцентом — поэтому честно говорим, что голоса нет
const warnedNoVoice = new Set();
function speakSystem(text, lang, auto) {
  if (!('speechSynthesis' in window)) return;
  ttsAudio.pause();
  const voice = systemVoice(lang);
  if (!voice && lang !== 'en' && speechSynthesis.getVoices().length) {
    if (!auto && !warnedNoVoice.has(lang)) {
      warnedNoVoice.add(lang);
      toast(`Нет связи с онлайн-голосом, а в этом браузере нет голоса для языка «${LANGS[lang]?.name || lang}»`, 'volume');
    }
    return;
  }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.lang = voice ? voice.lang : LANGS[lang]?.speech || 'en-US';
  u.rate = store.get('rate', 0.9);
  // Chrome иногда «проглатывает» фразу, если speak вызвать сразу после cancel
  setTimeout(() => speechSynthesis.speak(u), 60);
}

// iPhone разрешает звук только после касания: при первом касании «будим» плеер беззвучной записью,
// чтобы потом слова звучали и сами — например, при показе новой карточки
function unlockAudio() {
  ttsAudio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
  ttsAudio.play().catch(() => {});
}

function initVoice() {
  document.addEventListener('pointerdown', unlockAudio, { once: true, capture: true });
  if (!('speechSynthesis' in window)) { $('voice-box').hidden = true; return; }
  loadVoices();
  speechSynthesis.addEventListener('voiceschanged', loadVoices); // в Chrome голоса приходят не сразу

  const rate = $('rate');
  const showRate = () => { $('rate-val').textContent = `${Number(rate.value).toFixed(2).replace(/0$/, '')}×`; };
  rate.value = store.get('rate', 0.9);
  showRate();
  rate.addEventListener('input', () => { store.set('rate', Number(rate.value)); showRate(); });
  rate.addEventListener('change', () => { rate.blur(); speakText('Hello! This is how I sound.'); });

  $('voice').addEventListener('change', (e) => {
    store.set('voice', e.target.value);
    e.target.blur();
    speakText('Hello! This is how I sound.');
  });
  $('voice-test').addEventListener('click', (e) => {
    e.currentTarget.blur();
    const chunk = state.chunks[state.index];
    speakText(chunk ? chunk.text : 'Hello! This is how I sound.');
  });
}

// Автоматически читать новую строку. Сразу после открытия страницы браузер не даёт
// говорить, пока человек ничего не нажал, — тогда первая строка прочитается по первому нажатию
let speakPending = false;

function maybeSpeak() {
  if (translateMode()) return; // в «Переводе» озвучка выдала бы ответ — фраза звучит после проверки
  if (!$('auto-read').checked && !dictation()) return; // в диктанте фраза звучит всегда
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) speakPending = true;
  else speak();
}

function speakIfPending() {
  if (!speakPending) return;
  speakPending = false;
  if (!translateMode() && ($('auto-read').checked || dictation())) speak();
}

// ---------- Тема и настройки ----------
function toggleKeyboard(show) {
  $('show-kb').checked = show;
  $('keyboard').hidden = !show;
  store.set('show-kb', show);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  for (const btn of document.querySelectorAll('.theme-btn')) {
    btn.innerHTML = icon(theme === 'dark' ? 'sun' : 'moon');
    btn.title = theme === 'dark' ? 'Светлая тема' : 'Тёмная тема';
  }
}

// ---------- Вход через Google и облако (Supabase) ----------
// Гость работает с данными браузера. После входа данные читаются из Supabase и пишутся туда же;
// без связи — плашка внизу и повторные попытки, несохранённое не теряется
const SUPABASE_URL = 'https://hjryxrwypwawtkdbokkj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_x858jAMB1jdLRHtnjsysiQ_CF0wWlyY'; // публичный ключ: защиту дают правила доступа в базе
const cloud = { client: null, user: null, storage: null, error: null, retryTimer: 0 };

const withTimeout = (promise, ms) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error('Сервер не отвечает')), ms)),
]);

// Подключение при запуске: вернулись ли со входа Google, есть ли сохранённая сессия, загрузка данных
async function connectCloud() {
  if (!window.supabase) return; // библиотека не загрузилась (нет сети) — работаем как гость
  cloud.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { flowType: 'pkce' } });
  const authError = cleanAuthUrl();
  let session = null;
  try {
    ({ data: { session } } = await withTimeout(cloud.client.auth.getSession(), 10000));
  } catch (e) {
    cloud.error = e;
  }
  if (authError) cloud.error = new Error(authError);
  if (!session) return;
  cloud.user = session.user;
  try {
    const rows = await withTimeout(KlavaCloud.loadRows(cloud.client), 15000);
    cloud.storage = KlavaCloud.cloudStorage({ client: cloud.client, userId: cloud.user.id, rows, onStatus: onCloudStatus });
    cloud.migrated = migrateBrowserData(rows);
    storage.backend = cloud.storage;
    core = makeCore(OWNER_EMAILS.includes(cloud.user.email)); // на новом хранилище: заводит «Мои слова», если их ещё нет
  } catch (e) {
    cloud.error = e; // остаёмся на данных браузера, плашка об этом скажет
  }
}

// Первый вход на этом устройстве: данные браузера (модули, прогресс, «Мои слова», рекорды)
// сливаются с облачными и записываются в облако. Данные браузера остаются как были — для работы без входа.
// Возвращает число перенесённых записей
function migrateBrowserData(rows) {
  const flag = `klava-migrated:${cloud.user.id}`;
  let local = {};
  try {
    if (localStorage.getItem(flag)) return 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k.startsWith('klava:')) continue;
      try { local[k.slice(6)] = JSON.parse(localStorage.getItem(k)); } catch {}
    }
    localStorage.setItem(flag, '1');
  } catch {
    local = {};
  }
  const merged = KlavaCore.mergeData(local, rows);
  let changed = 0;
  for (const [key, value] of Object.entries(merged)) {
    if (JSON.stringify(value) === JSON.stringify(rows[key])) continue;
    cloud.storage.set(key, value);
    changed++;
  }
  return changed;
}

// После возврата от Google в адресе остаются ?code=… или ?error=… — убираем их, адрес экрана (#/…) сохраняем
function cleanAuthUrl() {
  const params = new URLSearchParams(location.search);
  if (!params.has('code') && !params.has('error')) return null;
  const error = params.get('error_description') || params.get('error');
  history.replaceState(null, '', location.pathname + location.hash);
  return error;
}

function signIn() {
  cloud.client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: location.origin + location.pathname },
  });
}

async function signOut() {
  if (cloud.storage?.pending()) await cloud.storage.flush();
  await cloud.client.auth.signOut();
  location.reload();
}

function renderAccount() {
  const el = $('account');
  if (!cloud.user || !cloud.storage) {
    el.innerHTML = '<button class="pill-btn" data-act="sign-in">Войти через Google</button>';
    return;
  }
  el.innerHTML = `<span class="account-email" title="${escapeAttr(cloud.user.email || '')} — данные хранятся в облаке">${icon('cloud')} <span class="email-text">${escapeHtml(cloud.user.email || '')}</span></span>` +
    '<span id="sync-status" class="sync-status"></span>' +
    '<button class="pill-btn" data-act="sign-out">Выйти</button>';
}

function showCloudBanner(html) {
  const el = $('cloud-banner');
  el.hidden = !html;
  el.innerHTML = html || '';
}

// Состояние отправки в облако: «сохраняю…», «сохранено» или ошибка с кнопкой «Повторить»
function onCloudStatus(status) {
  const el = $('sync-status');
  if (el) el.textContent = { pending: '…', saving: 'сохраняю…', saved: '✓ сохранено', error: 'не сохранено' }[status];
  clearTimeout(cloud.retryTimer);
  if (status === 'error') {
    showCloudBanner(`${icon('alert')}<span>Нет связи с облаком — изменения пока только на этом устройстве. ' +
      'Если сервер «заснул», его будят в панели Supabase.</span><button class="pill-btn" data-act="cloud-retry">Повторить</button>`);
    cloud.retryTimer = setTimeout(() => cloud.storage.flush(), 15000);
  } else if (status === 'saved') {
    showCloudBanner('');
  }
}

// Ошибка при запуске: вход не удался или данные не загрузились — работаем с данными браузера
function showStartupCloudError() {
  if (!cloud.error) return;
  const signedIn = cloud.user && !cloud.storage;
  showCloudBanner(`${icon('alert')}<span>${signedIn ? 'Не удалось загрузить данные из облака' : 'Вход не удался'}: ${escapeHtml(cloud.error.message)}. ` +
    'Сейчас открыты данные этого браузера.</span><button class="pill-btn" data-act="cloud-reload">Повторить</button>');
}

function initCloud() {
  renderAccount();
  showStartupCloudError();
  if (cloud.migrated) toast('Данные этого браузера перенесены в облако', 'cloud');
  document.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'sign-in' && cloud.client) signIn();
    else if (act === 'sign-in') toast('Вход сейчас недоступен: нет связи с сервером. Обновите страницу', 'alert');
    else if (act === 'sign-out') signOut();
    else if (act === 'cloud-retry') cloud.storage?.flush();
    else if (act === 'cloud-reload') location.reload();
  });
  // свернули вкладку — отправляем сразу; закрывают с несохранённым — браузер переспросит
  document.addEventListener('visibilitychange', () => { if (document.hidden) cloud.storage?.flush(); });
  addEventListener('beforeunload', (e) => { if (cloud.storage?.pending()) e.preventDefault(); });
}

function init() {
  // значки в разметке index.html: <button data-icon="volume">
  for (const el of document.querySelectorAll('[data-icon]')) el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon));
  buildKeyboard();
  initWordTools();
  initVoice();

  $('custom-text').value = store.get('customText', '');
  $('custom-start').addEventListener('click', () => {
    store.set('customText', $('custom-text').value);
    startLesson();
    document.activeElement.blur();
  });

  $('restart').addEventListener('click', (e) => { e.currentTarget.blur(); startLesson(); });
  $('again').addEventListener('click', startLesson);
  $('speak').addEventListener('click', (e) => { e.currentTarget.blur(); speak(); });

  for (const id of ['show-tr', 'show-explain', 'auto-read', 'keep-errors', 'hardcore', 'dictation', 'translate-mode']) {
    const box = $(id);
    box.checked = store.get(id, box.checked);
    box.addEventListener('change', () => { store.set(id, box.checked); box.blur(); render(); });
  }

  toggleKeyboard(store.get('show-kb', true));
  $('show-kb').addEventListener('change', (e) => { toggleKeyboard(e.target.checked); e.target.blur(); });

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(store.get('theme', prefersDark ? 'dark' : 'light'));
  for (const btn of document.querySelectorAll('.theme-btn')) {
    btn.addEventListener('click', (e) => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      store.set('theme', next);
      applyTheme(next);
      e.currentTarget.blur();
    });
  }

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', (e) => {
    if (e.key !== 'Control' || !ctrlAlone) return;
    ctrlAlone = false;
    if (onTrainer && !isFormField(e.target)) onCtrl();
  });
  window.addEventListener('blur', () => { ctrlAlone = false; }); // Ctrl+Tab и т. п.

  // Клик в поле ввода ставит курсор в это место (в диктанте и в режиме «Не исправлять ошибки»)
  $('typed').addEventListener('mousedown', (e) => {
    const chunk = state.chunks[state.index];
    const caret = document.caretRangeFromPoint?.(e.clientX, e.clientY);
    if (!chunk || state.finished || !caret || !$('typed').contains(caret.startContainer)) return;
    const off = textOffset($('typed'), caret.startContainer, caret.startOffset);
    if (off < 0) return;
    if (freeMode() && !state.dict.checked) {
      state.dict.caret = Math.min(off, state.dict.input.length);
    } else if (!freeMode() && $('keep-errors').checked) {
      state.edit = off >= state.pos ? -1 : off;
    } else return;
    e.preventDefault();
    render();
  });

  // Первое нажатие клавиши или клик «разрешает» звук — дочитываем отложенную строку
  document.addEventListener('keydown', speakIfPending, true);
  document.addEventListener('pointerdown', speakIfPending, true);
  // Включили озвучку — сразу читаем текущую строку
  $('auto-read').addEventListener('change', (e) => { if (e.target.checked) speak(); });
  // Диктант: начинаем текущую фразу заново и сразу её произносим
  // «Диктант» и «Перевод» — взаимоисключающие режимы: включили один — другой выключается.
  // Текущую фразу начинаем заново; в диктанте сразу её произносим
  const modes = ['dictation', 'translate-mode'];
  if (dictation() && translateMode()) { $('translate-mode').checked = false; store.set('translate-mode', false); }
  for (const id of modes) {
    $(id).addEventListener('change', (e) => {
      if (e.target.checked) {
        for (const other of modes) if (other !== id) { $(other).checked = false; store.set(other, false); }
      }
      state.dict = newDict();
      state.lookup = null;
      state.lineStart = 0;
      syncVoiceUi();
      render();
      if (e.target.checked && id === 'dictation') speak();
    });
  }
  syncVoiceUi();

  initPages();
  initCloud();
  addEventListener('hashchange', route);
  route();
}

// Сначала решаем, откуда данные (браузер или облако), потом рисуем сайт
connectCloud().finally(init);

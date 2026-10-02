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

// Уроки, «Мои слова» и настройки — через ядро обучения (core.js)
const { normalize, compareDictation } = KlavaCore;
const core = KlavaCore.createCore({
  lessons: LESSONS, groups: GROUPS, notes: NOTES,
  storage: KlavaCore.browserStorage(() => localStorage, 'klava:'),
  newId: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
  now: () => Date.now(),
});
const store = core.settings;

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
  const mod = core.module(lessonId);
  const isWords = mod.kind === 'words';
  return shuffle(mod.cards).slice(0, isWords ? 20 : 10).map(({ id: cardId, term: en, definition: ru, explanation }) => ({
    cardId, text: en, ru, note: explanation, parts: [{ from: 0, to: en.length, tr: isWords ? `${en} — ${ru || '?'}` : ru }],
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
  el.innerHTML = `<span class="explain-icon">📘</span><div class="explain-body">${noteHtml(note)}</div>`;
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
      $('text').innerHTML = '<span class="dict-hint">🎧 Слушайте и печатайте · <kbd>Enter</kbd> — проверить · <kbd>Ctrl+Space</kbd> — повторить</span>';
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
  if (record) store.set('best', speed);
  $('result-text').innerHTML =
    `Скорость: <b>${speed}</b> зн/мин (≈${Math.round(speed / 5)} слов/мин)<br>` +
    `Точность: <b>${accuracy()}%</b>, ошибок: <b>${state.errors}</b>` +
    (record ? '<br>🏆 Новый рекорд!' : '');
  $('result').hidden = false;
  $('again').focus();
}

// ---------- Слово по Ctrl и «Мои слова» ----------
// Первый Ctrl — выделить слово под курсором и показать предложение с ним и перевод предложения,
// второй — сохранить слово (с переводом) в «Мои слова»
const dict = core.wordTranslations(); // перевод слов из уроков: слово -> перевод
const trCache = {};   // текст -> Promise с переводом

function translate(word) {
  if (dict[word]) return Promise.resolve(dict[word]);
  trCache[word] ??= fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ru&dt=t&q=' + encodeURIComponent(word))
    .then((r) => r.json())
    .then((j) => j[0].map((x) => x[0]).join('').trim() || null)
    .catch(() => { delete trCache[word]; return null; });
  return trCache[word];
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
  core.addMyWord({ term: en, definition: definition || '', example: example?.en, exampleTranslation: example?.ru || '' });
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
  custom: { title: 'Свой текст', group: 'own', icon: '📝' },
};
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

const tile = (href, icon, title, sub) =>
  `<a class="tile" href="${href}"><span class="tile-icon">${icon}</span>` +
  `<span class="tile-text"><b>${escapeHtml(title)}</b><small>${sub}</small></span></a>`;
const lessonTile = (id) => { const l = lessonInfo(id); return tile(lessonHref(id), l.icon, l.title, lessonCount(id)); };
const folderTile = (f) => {
  const ids = folderLessons(f.id);
  const icons = ids.slice(0, 4).map((id) => lessonInfo(id).icon).join(' ');
  return tile(`#/folder/${f.id}`, f.builtIn ? '📁' : '🗂️', f.title,
    plural(ids.length, 'модуль', 'модуля', 'модулей') + (icons ? ` · ${icons}` : ''));
};
const tilesSection = (title, tiles, actions = '') =>
  `<section class="tiles-section"><div class="section-head"><h2>${escapeHtml(title)}</h2>${actions}</div>` +
  `<div class="tiles">${tiles.join('')}</div></section>`;
const actionBtn = (act, label, cls = '') => `<button class="pill-btn ${cls}" data-act="${act}">${label}</button>`;
const actionLink = (href, label) => `<a class="pill-btn" href="${href}">${label}</a>`;

function renderHome() {
  const recent = core.recent().filter((id) => lessonInfo(id) && !core.isHidden(id));
  return (recent.length ? tilesSection('Недавние', recent.map(lessonTile)) : '') +
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

function renderModule(id) {
  const l = lessonInfo(id);
  const cards = lessonCards(id);
  const own = isOwnModule(id);
  const emptyText = id === 'mine'
    ? 'Пока пусто. Во время набора нажмите Ctrl на слове, а затем Ctrl ещё раз — оно сохранится сюда.'
    : 'В модуле пока нет карточек.';
  // у каждой карточки — точка состояния: новая, изучается, выучена; рамка — пора повторить
  const states = core.cardStates(id);
  const stateTitle = { new: 'Новая', learning: 'Изучается', learned: 'Выучена' };
  const dot = (c) => {
    const st = states[c.id];
    return `<span class="card-dot ${st.state}${st.due ? ' due' : ''}" title="${stateTitle[st.state]}${st.due ? ' · пора повторить' : ''}"></span>`;
  };
  const list = cards.length
    ? `<ol class="card-list with-dots">${cards.map((c) =>
      `<li>${dot(c)}<span class="card-term">${escapeHtml(c.term)}</span><span class="card-def">${escapeHtml(c.definition || '—')}</span></li>`).join('')}</ol>`
    : `<p class="empty">${emptyText}</p>`;
  const stats = core.moduleStats(id);
  const statsLine = stats.seen
    ? ` · выучено ${Math.round((stats.learned / stats.total) * 100)}%` +
      (stats.due ? ` · <span class="due-count">ждут повторения: ${stats.due}</span>` : '')
    : '';
  const hiddenNow = core.isHidden(id);
  const actions = '<div class="page-actions">' + (own
    ? actionLink(`#/module/${id}/edit`, '✏️ Изменить') + actionLink(`#/import/module/${id}`, 'Импорт') +
      actionBtn('copy-module', 'Скопировать') + (id === 'mine' ? '' : actionBtn('delete-module', 'Удалить', 'danger'))
    : actionBtn('copy-module', 'Скопировать и изменить') +
      (hiddenNow ? actionBtn('show-module', 'Вернуть в папку') : actionBtn('hide-module', 'Скрыть'))) + '</div>';
  const hiddenNote = hiddenNow ? '<p class="empty">Модуль скрыт: в папке его не видно.</p>' : '';
  const mode = (path, icon, title, sub) => {
    const inner = `<span class="mode-icon">${icon}</span><span class="tile-text"><b>${title}</b><small>${sub}</small></span>`;
    return cards.length ? `<a class="mode-btn" href="#/module/${id}/${path}">${inner}</a>` : `<span class="mode-btn disabled">${inner}</span>`;
  };
  return `<section class="module-head"><span class="lesson-icon module-icon">${l.icon}</span>` +
    `<div><h1>${escapeHtml(l.title)}</h1><small>${lessonCount(id)}${statsLine}</small></div>${actions}</section>${hiddenNote}` +
    '<div class="modes">' +
    mode('cards', '🃏', 'Карточки', 'Переворачивать и отмечать «знаю / не знаю»') +
    mode('learn', '🎯', 'Заучивание', 'Сначала выбор из вариантов, потом ввод ответа — пока не запомнится') +
    (canType() ? mode('type', '⌨️', 'Набор', 'Печатать слова и фразы. Диктант и перевод на английский — в настройках набора') : '') +
    `</div>${list}`;
}

// Режимы набора нужны физической клавиатуре: на сенсорном экране без мыши их не показываем
const canType = () => matchMedia('(any-pointer: fine)').matches;

// ---------- Режим «Карточки» ----------
// #/module/<id>/cards. Направление и «перемешать» запоминаются в настройках
const flashcards = { moduleId: null, session: null, flipped: false };
const flashDir = () => store.get('cards-dir', 'en-ru');
const flashOptions = () => ({ shuffle: store.get('cards-shuffle', false) });

function startFlash(moduleId, cards = core.module(moduleId).cards) {
  flashcards.moduleId = moduleId;
  flashcards.session = KlavaCore.flashSession(cards, flashOptions());
  flashcards.flipped = false;
  renderFlash();
  flashAutoSpeak();
}

// Лицевая и оборотная стороны: «англ → рус» — термин и определение, «рус → англ» — наоборот
function flashSides(card) {
  const term = escapeHtml(card.term);
  const def = escapeHtml(card.definition || '—');
  const extra =
    (card.example ? `<div class="flash-example"><span>${escapeHtml(card.example)}</span>` +
      `${card.exampleTranslation ? `<small>${escapeHtml(card.exampleTranslation)}</small>` : ''}</div>` : '') +
    (card.explanation ? `<div class="explain flash-explain"><span class="explain-icon">📘</span><div class="explain-body">${noteHtml(card.explanation)}</div></div>` : '');
  return flashDir() === 'en-ru' ? { front: term, back: def, extra } : { front: def, back: term, extra };
}

function renderFlash() {
  const s = flashcards.session;
  const dir = flashDir();
  const seg = (value, label) => `<button class="seg-btn${dir === value ? ' on' : ''}" data-act="flash-dir" data-dir="${value}">${label}</button>`;
  const bar = '<div class="flash-bar">' +
    `<div class="seg">${seg('en-ru', 'англ → рус')}${seg('ru-en', 'рус → англ')}</div>` +
    `<label class="radio"><input type="checkbox" id="flash-shuffle"${flashOptions().shuffle ? ' checked' : ''}><span>Перемешать</span></label>` +
    `<span class="flash-progress">${s.done ? s.total : s.position} / ${s.total}</span></div>` +
    `<div class="flash-track"><span style="width:${s.total ? (s.index / s.total) * 100 : 0}%"></span></div>`;

  if (s.done) {
    const n = s.unknown.length;
    $('page-body').innerHTML = `<div class="flash">${bar}<div class="flash-done">` +
      '<h2>Готово!</h2>' +
      `<p>Знаю: <b class="dict-ok">${s.known.length}</b> · Не знаю: <b class="dict-bad">${n}</b></p>` +
      '<div class="page-actions">' +
      (n ? `<button class="primary-btn" data-act="flash-retry">Повторить незнакомые (${n})</button>` : '') +
      '<button class="pill-btn" data-act="flash-restart">Начать заново</button>' +
      `<a class="pill-btn" href="#/module/${flashcards.moduleId}">К модулю</a></div></div></div>`;
    return;
  }

  const { front, back, extra } = flashSides(s.current);
  const long = (html) => (html.length > 40 ? ' long' : '');
  $('page-body').innerHTML = `<div class="flash">${bar}` +
    `<div class="flash-card${flashcards.flipped ? ' flipped' : ''}" data-act="flash-flip" role="button" tabindex="0" aria-label="Перевернуть карточку">` +
    '<div class="flash-inner">' +
    `<div class="face front"><span class="flash-text${long(front)}">${front}</span><small class="flash-hint">${canType() ? 'Нажмите, чтобы перевернуть · Пробел' : 'Коснитесь, чтобы перевернуть'}</small></div>` +
    `<div class="face back"><span class="flash-text${long(back)}">${back}</span>${extra}</div>` +
    '</div></div>' +
    '<div class="flash-actions">' +
    '<button class="flash-btn no" data-act="flash-no">✗ Не знаю <kbd>←</kbd></button>' +
    '<button class="flash-btn speak" data-act="flash-speak" title="Произнести">🔊</button>' +
    '<button class="flash-btn yes" data-act="flash-yes">✓ Знаю <kbd>→</kbd></button>' +
    '</div></div>';
}

// Английская сторона звучит сама, когда появляется, — если в настройках включена озвучка
function flashAutoSpeak() {
  const s = flashcards.session;
  if (s.done || !store.get('auto-read', true)) return;
  const englishShown = flashDir() === 'en-ru' ? !flashcards.flipped : flashcards.flipped;
  if (englishShown) speakText(s.current.term);
}

function flashFlip() {
  flashcards.flipped = !flashcards.flipped;
  document.querySelector('.flash-card')?.classList.toggle('flipped', flashcards.flipped);
  if (flashcards.flipped) flashAutoSpeak();
}

function flashMark(known) {
  core.recordAnswer(flashcards.session.current.id, flashDir(), known);
  flashcards.session = KlavaCore.flashAnswer(flashcards.session, known);
  flashcards.flipped = false;
  renderFlash();
  flashAutoSpeak();
}

function onFlashAction(act, btn) {
  const s = flashcards.session;
  if (act === 'flash-flip') flashFlip();
  else if (act === 'flash-yes' || act === 'flash-no') flashMark(act === 'flash-yes');
  else if (act === 'flash-speak' && s.current) speakText(s.current.term);
  else if (act === 'flash-retry') startFlash(flashcards.moduleId, s.unknown);
  else if (act === 'flash-restart') startFlash(flashcards.moduleId);
  else if (act === 'flash-dir') { store.set('cards-dir', btn.dataset.dir); startFlash(flashcards.moduleId); }
}

// ---------- Режим «Заучивание» ----------
// #/module/<id>/learn. Направление общее с «Карточками».
// После ответа показываем разбор; само занятие продвигается по «Продолжить» —
// так «Я был прав» может засчитать ответ заново, взяв состояние до ответа
const learn = { moduleId: null, state: null, feedback: null }; // feedback: { result, given, choice }

function startLearn(moduleId) {
  learn.moduleId = moduleId;
  learn.state = KlavaCore.learnSession(core.module(moduleId).cards, { direction: flashDir() });
  learn.feedback = null;
  renderLearn();
  learnAutoSpeak();
}

// Английская сторона: в «англ → рус» — вопрос, в «рус → англ» — ответ (звучит после ответа)
const learnEnglish = () => {
  const q = learn.state.question;
  if (!q) return null;
  if (flashDir() === 'en-ru') return q.prompt;
  return learn.feedback ? q.answer : null;
};
function learnAutoSpeak() {
  const en = learnEnglish();
  if (en && store.get('auto-read', true)) speakText(en);
}

function renderLearn() {
  const s = learn.state;
  const fb = learn.feedback;
  const dir = flashDir();
  const seg = (value, label) => `<button class="seg-btn${dir === value ? ' on' : ''}" data-act="learn-dir" data-dir="${value}">${label}</button>`;
  const bar = '<div class="flash-bar">' +
    `<div class="seg">${seg('en-ru', 'англ → рус')}${seg('ru-en', 'рус → англ')}</div>` +
    (s.done ? '' : `<span class="learn-round">Раунд ${s.round}</span>`) +
    `<span class="flash-progress">Освоено ${s.mastered} из ${s.total}</span></div>` +
    `<div class="flash-track"><span style="width:${s.total ? (s.mastered / s.total) * 100 : 0}%"></span></div>`;

  if (s.done) {
    $('page-body').innerHTML = `<div class="flash">${bar}<div class="flash-done">` +
      (s.total ? `<h2>Все ${plural(s.total, 'карточка освоена', 'карточки освоены', 'карточек освоено')}!</h2>`
        : '<h2>Нечего заучивать</h2><p>В этом направлении у карточек нет ответа.</p>') +
      '<div class="page-actions"><button class="primary-btn" data-act="learn-restart">Начать заново</button>' +
      `<a class="pill-btn" href="#/module/${learn.moduleId}/cards">Карточки</a>` +
      `<a class="pill-btn" href="#/module/${learn.moduleId}">К модулю</a></div></div></div>`;
    return;
  }

  const q = s.question;
  const what = q.stage === 1 ? 'Выберите' : 'Напишите';
  const target = dir === 'en-ru' ? 'перевод' : 'по-английски';
  const speakBtn = learnEnglish() ? '<button class="icon-btn" data-act="learn-speak" title="Произнести">🔊</button>' : '';
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
      `<input id="learn-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${dir === 'en-ru' ? 'Перевод' : 'По-английски'}">` +
      '<button class="primary-btn">Ответить</button>' +
      '<button type="button" class="pill-btn" data-act="learn-skip">Не знаю</button></form>';
  } else body = '';

  let verdict = '';
  if (fb) {
    const right = `<b>${escapeHtml(q.answer)}</b>`;
    const yours = fb.given && fb.result !== 'correct' ? `<small>Ваш ответ: ${escapeHtml(fb.given)}</small>` : '';
    const head = {
      correct: '<span class="dict-ok">✓ Верно!</span>',
      almost: `<span class="learn-almost">≈ Почти! Правильно: ${right}</span>`,
      wrong: `<span class="dict-bad">✗ Неверно. Правильно: ${right}</span>`,
    }[fb.result];
    verdict = `<div class="learn-feedback ${fb.result}"><div class="learn-verdict">${head}${yours}</div>` +
      flashSides(q.card).extra +
      '<div class="learn-next">' +
      (fb.result === 'wrong' ? '<button class="pill-btn" data-act="learn-override">Я был прав</button>' : '') +
      '<button class="primary-btn" data-act="learn-next">Продолжить <kbd>Enter</kbd></button></div></div>';
  }

  $('page-body').innerHTML = `<div class="flash">${bar}<div class="learn-card">` +
    `<div class="learn-head"><small>${what} ${target}</small>${speakBtn}</div>` +
    `<div class="flash-text${q.prompt.length > 40 ? ' long' : ''}">${escapeHtml(q.prompt)}</div>` +
    `${body}${verdict}</div></div>`;
  if (q.stage === 2 && !fb) $('learn-input').focus();
}

function learnRespond(result, given, choice) {
  learn.feedback = { result, given, choice };
  renderLearn();
  if (flashDir() === 'ru-en') learnAutoSpeak();
}

// Дальше: ответ засчитывается («почти» — тоже верно) и занятие переходит к следующему вопросу
function learnContinue(ok = learn.feedback.result !== 'wrong') {
  core.recordAnswer(learn.state.question.card.id, flashDir(), ok);
  learn.state = KlavaCore.learnAnswer(learn.state, ok);
  learn.feedback = null;
  renderLearn();
  learnAutoSpeak();
}

function onLearnAction(act, btn) {
  const q = learn.state.question;
  if (act === 'learn-choice' && !learn.feedback) {
    const i = Number(btn.dataset.i);
    learnRespond(q.choices[i] === q.answer ? 'correct' : 'wrong', q.choices[i], i);
  } else if (act === 'learn-skip') learnRespond('wrong', '');
  else if (act === 'learn-next') learnContinue();
  else if (act === 'learn-override') learnContinue(true);
  else if (act === 'learn-speak') speakText(learnEnglish());
  else if (act === 'learn-restart') startLearn(learn.moduleId);
  else if (act === 'learn-dir') { store.set('cards-dir', btn.dataset.dir); startLearn(learn.moduleId); }
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
const folderSelect = (id, selected) =>
  `<select id="${id}">${moduleFolders().map((f) =>
    `<option value="${escapeAttr(f.id)}"${f.id === selected ? ' selected' : ''}>${escapeHtml(f.title)}</option>`).join('')}</select>`;

function renderNewModule(folderId) {
  const selected = folderId || moduleFolders()[0].id;
  return '<form id="new-module" class="form">' +
    '<h1>Новый модуль</h1>' +
    '<label class="field"><span>Название</span><input id="new-title" required placeholder="Например, «Слова из сериала»"></label>' +
    `<label class="field"><span>Папка</span>${folderSelect('new-folder', selected)}</label>` +
    '<button class="primary-btn">Создать и добавить карточки</button></form>';
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
  return '<div id="import-form" class="form">' +
    '<h1>Импорт карточек</h1>' +
    '<label class="field"><span>Список</span><textarea id="imp-text" rows="8" ' +
    'placeholder="Каждая карточка на своей строке, термин и определение через Tab — так копируют Quizlet («Экспорт») и таблицы"></textarea></label>' +
    '<div class="imp-seps">' +
    '<fieldset><legend>Между термином и определением</legend>' +
    radio('imp-term', 'tab', 'Tab', true) + radio('imp-term', 'comma', 'Запятая') + radio('imp-term', 'semicolon', 'Точка с запятой') +
    radio('imp-term', 'dash', 'Тире') + radio('imp-term', 'custom', 'Свой:') + '<input id="imp-term-custom" class="sep-input" maxlength="10">' +
    '</fieldset>' +
    '<fieldset><legend>Между карточками</legend>' +
    radio('imp-card', 'newline', 'Новая строка', true) + radio('imp-card', 'semicolon', 'Точка с запятой') +
    radio('imp-card', 'custom', 'Свой:') + '<input id="imp-card-custom" class="sep-input" maxlength="10">' +
    '</fieldset></div>' +
    '<fieldset class="imp-target"><legend>Куда</legend>' +
    `<div class="imp-option">${radio('imp-target', 'new', 'Новый модуль', !toExisting)}` +
    '<input id="imp-title" placeholder="Название модуля">' +
    `${folderSelect('imp-folder', folderId || moduleFolders()[0].id)}</div>` +
    (own.length ? `<div class="imp-option">${radio('imp-target', 'existing', 'Добавить в модуль', toExisting)}` +
      `<select id="imp-module">${own.map((m) =>
        `<option value="${escapeAttr(m.id)}"${m.id === moduleId ? ' selected' : ''}>${escapeHtml(m.title)}</option>`).join('')}</select></div>` : '') +
    '</fieldset>' +
    '<label class="radio"><input type="checkbox" id="imp-skip" checked><span>Пропустить повторы</span></label>' +
    '<div id="imp-preview" class="imp-preview"></div>' +
    '<button class="primary-btn" data-act="import-go" disabled>Импортировать</button></div>';
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
    moduleId = core.createModule({ title: title.value, folderId: $('imp-folder').value }).id;
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
}

// Строка карточки в редакторе. Без карточки — пустая строка внизу для новой
// moveTo — свои модули, куда карточку можно перенести
function editCardRow(c, i, moveTo = []) {
  const input = (field, label, value = '') =>
    `<label class="field"><span>${label}</span><input data-field="${field}" value="${escapeAttr(value)}"></label>`;
  const main = `<div class="edit-main">${input('term', 'Термин', c?.term)}${input('definition', 'Определение', c?.definition)}</div>`;
  if (!c) {
    return `<li class="edit-card new"><span class="edit-num">+</span><div class="edit-fields">${main}` +
      '<small class="edit-hint">Введите термин — карточка сохранится сама, перевод подставится автоматически</small></div>' +
      '<div class="edit-tools"></div></li>';
  }
  const hasMore = c.example || c.exampleTranslation || c.explanation;
  return `<li class="edit-card" data-card="${escapeAttr(c.id)}"><span class="edit-num">${i + 1}</span>` +
    `<div class="edit-fields">${main}` +
    `<details${hasMore ? ' open' : ''}><summary>${moveTo.length ? 'Пример, объяснение, перенос' : 'Пример и объяснение'}</summary>` +
    `${input('example', 'Пример', c.example)}${input('exampleTranslation', 'Перевод примера', c.exampleTranslation)}` +
    `<label class="field"><span>Объяснение</span><textarea data-field="explanation" rows="2">${escapeHtml(c.explanation || '')}</textarea></label>` +
    (moveTo.length ? '<label class="field"><span>Перенести в модуль</span><select data-move><option value="">—</option>' +
      `${moveTo.map((m) => `<option value="${escapeAttr(m.id)}">${escapeHtml(m.title)}</option>`).join('')}</select></label>` : '') +
    '</details></div>' +
    '<div class="edit-tools">' +
    '<button class="icon-btn" data-act="card-up" title="Выше">↑</button>' +
    '<button class="icon-btn" data-act="card-down" title="Ниже">↓</button>' +
    '<button class="icon-btn" data-act="card-delete" title="Удалить карточку">✕</button></div></li>';
}

const moveTargets = (moduleId) => ownModules().filter((m) => m.id !== moduleId);
const editCardList = (m) => {
  const moveTo = moveTargets(m.id);
  return `${m.cards.map((c, i) => editCardRow(c, i, moveTo)).join('')}${editCardRow(null)}`;
};

function renderEditModule(id) {
  const m = core.module(id);
  return `<div class="form" data-module="${escapeAttr(id)}">` +
    '<div class="edit-head"><h1>Изменение модуля</h1>' +
    `<a class="primary-btn" href="#/module/${id}">Готово</a></div>` +
    `<label class="field"><span>Название</span><input id="edit-title" value="${escapeAttr(m.title)}"></label>` +
    `<label class="field"><span>Папка</span>${folderSelect('edit-folder', m.folderId)}</label>` +
    `<h2 class="edit-cards-title">Карточки</h2><ol id="edit-cards" class="edit-cards">${editCardList(m)}</ol></div>`;
}

// Хлебные крошки над страницей: папка › модуль
function renderCrumbs(items) {
  $('crumbs').innerHTML = items.map(([href, title], i) =>
    (i ? '<span class="crumb-sep">›</span>' : '') +
    (href ? `<a href="${href}">${escapeHtml(title)}</a>` : `<span>${escapeHtml(title)}</span>`)).join('');
}

function parseRoute() {
  const [screen, id, mode] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  if (screen === 'folder' && folderOf(id)) return { screen, id };
  if (screen === 'module' && id !== 'custom' && lessonInfo(id)) {
    if (mode === 'type') return { screen: 'trainer', id };
    if (mode === 'edit' && isOwnModule(id)) return { screen: 'edit', id };
    if (mode === 'cards') return { screen: 'cards', id };
    if (mode === 'learn') return { screen: 'learn', id };
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
  return { screen: 'home' };
}

let onTrainer = false; // открыт ли тренажёр — иначе клавиши набора не обрабатываются

function route() {
  const r = parseRoute();
  if (r.screen === 'home' && location.hash.replace(/^#\/?/, '')) history.replaceState(null, '', '#/');
  if (onTrainer) leaveTrainer();
  onTrainer = r.screen === 'trainer';
  $('trainer').hidden = !onTrainer;
  $('page').hidden = onTrainer;
  scrollTo(0, 0);
  if (onTrainer) { openTrainer(r.id); return; }

  if (['module', 'edit', 'cards', 'learn'].includes(r.screen)) {
    core.markOpened(r.id);
    const l = lessonInfo(r.id);
    const folderCrumb = [`#/folder/${l.group}`, folderOf(l.group).title];
    if (r.screen === 'cards') {
      renderCrumbs([folderCrumb, [`#/module/${r.id}`, l.title], [null, 'Карточки']]);
      startFlash(r.id);
    } else if (r.screen === 'learn') {
      renderCrumbs([folderCrumb, [`#/module/${r.id}`, l.title], [null, 'Заучивание']]);
      startLearn(r.id);
    } else if (r.screen === 'edit') {
      renderCrumbs([folderCrumb, [`#/module/${r.id}`, l.title], [null, 'Изменение']]);
      $('page-body').innerHTML = renderEditModule(r.id);
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

function openTrainer(id) {
  state.lessonId = id;
  if (id !== 'custom') core.markOpened(id);
  const l = lessonInfo(id);
  $('lesson-icon').textContent = l.icon;
  $('lesson-group').textContent = folderOf(l.group).title;
  $('lesson-title').textContent = l.title;
  $('back').href = id === 'custom' ? '#/' : `#/module/${id}`;
  $('back').title = id === 'custom' ? 'На главную' : 'К модулю';
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
function fillTranslation(moduleId, cardId, term) {
  return translate(term).then((tr) => {
    const card = tr && core.module(moduleId)?.cards.find((c) => c.id === cardId);
    if (!card || card.definition) return;
    const input = editorModule() === moduleId && cardRow(cardId)?.querySelector('[data-field="definition"]');
    if (input && input.value.trim()) return;
    core.updateCard(moduleId, cardId, { definition: tr });
    if (input) input.value = tr;
  });
}

// Пустая строка внизу превращается в карточку на месте, без перерисовки:
// фокус остаётся там, куда его перевёл пользователь
function promoteNewRow(row, card, index) {
  const tpl = document.createElement('template');
  tpl.innerHTML = editCardRow(card, index, moveTargets(editorModule()));
  const full = tpl.content.firstElementChild;
  row.classList.remove('new');
  row.dataset.card = card.id;
  row.querySelector('.edit-num').textContent = index + 1;
  row.querySelector('.edit-hint').replaceWith(full.querySelector('details'));
  row.querySelector('.edit-tools').replaceWith(full.querySelector('.edit-tools'));
  row.insertAdjacentHTML('afterend', editCardRow(null));
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
  if (el.id === 'edit-folder') {
    core.updateModule(id, { folderId: el.value });
    renderEditCrumbs(id);
    return;
  }
  const row = el.closest('.edit-card');
  if ('move' in el.dataset && el.value) {
    core.moveCardTo(id, row.dataset.card, el.value);
    $('edit-cards').innerHTML = editCardList(core.module(id));
    return;
  }
  const field = el.dataset.field;
  if (!field || !row) return;
  const defInput = row.querySelector('[data-field="definition"]');

  if (row.classList.contains('new')) {
    // новая карточка появляется, когда введён термин
    const term = row.querySelector('[data-field="term"]').value;
    if (!term.trim()) return;
    const card = core.addCard(id, { term, definition: defInput.value });
    promoteNewRow(row, card, core.module(id).cards.length - 1);
    if (!card.definition) fillTranslation(id, card.id, card.term);
    return;
  }

  const cardId = row.dataset.card;
  if (field === 'term' && !el.value.trim()) {
    // без термина карточки не бывает: возвращаем прежний, удалить — кнопкой ✕
    el.value = core.module(id).cards.find((c) => c.id === cardId).term;
    return;
  }
  core.updateCard(id, cardId, { [field]: el.value });
  if (field === 'term' && !defInput.value.trim()) fillTranslation(id, cardId, el.value.trim());
}

function onEditorCardAction(act, cardId) {
  const id = editorModule();
  const i = core.module(id).cards.findIndex((c) => c.id === cardId);
  if (act === 'card-up') core.moveCard(id, cardId, i - 1);
  if (act === 'card-down') core.moveCard(id, cardId, i + 1);
  if (act === 'card-delete') core.deleteCard(id, cardId);
  $('edit-cards').innerHTML = editCardList(core.module(id));
  if (act !== 'card-delete') cardRow(cardId)?.querySelector(`[data-act="${act}"]`)?.focus();
}

function onPageAction(e) {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const act = btn.dataset.act;
  const r = parseRoute();
  if (act.startsWith('flash-')) {
    onFlashAction(act, btn);
  } else if (act.startsWith('learn-')) {
    onLearnAction(act, btn);
  } else if (act === 'new-folder') {
    const name = prompt('Название новой папки');
    if (name && name.trim()) location.hash = `#/folder/${core.createFolder(name).id}`;
  } else if (act === 'rename-folder') {
    const name = prompt('Новое название папки', folderOf(r.id).title);
    if (name && name.trim()) { core.renameFolder(r.id, name); route(); }
  } else if (act === 'delete-folder') {
    const n = core.modules(r.id).length;
    if (n && !confirm(`Удалить папку «${folderOf(r.id).title}» и ${plural(n, 'модуль', 'модуля', 'модулей')} в ней?`)) return;
    core.deleteFolder(r.id);
    location.hash = '#/';
  } else if (act === 'delete-module') {
    const l = lessonInfo(r.id);
    if (!confirm(`Удалить модуль «${l.title}» со всеми карточками?`)) return;
    core.deleteModule(r.id);
    location.hash = `#/folder/${l.group}`;
  } else if (act === 'copy-module') {
    location.hash = `#/module/${core.copyModule(r.id).id}/edit`;
  } else if (act === 'hide-module') {
    core.hideModule(r.id);
    location.hash = `#/folder/${lessonInfo(r.id).group}`;
  } else if (act === 'show-module') {
    core.showModule(r.id);
    route();
  } else if (act === 'import-go') {
    doImport();
  } else if (act.startsWith('card-')) {
    onEditorCardAction(act, btn.closest('.edit-card').dataset.card);
  }
}

function onNewModule(e) {
  if (e.target.id !== 'new-module') return;
  e.preventDefault();
  const titleInput = $('new-title');
  if (!titleInput.value.trim()) { titleInput.value = ''; titleInput.reportValidity(); return; }
  const m = core.createModule({ title: titleInput.value, folderId: $('new-folder').value });
  location.hash = `#/module/${m.id}/edit`;
}

function initPages() {
  $('page-body').addEventListener('click', onPageAction);
  document.addEventListener('keydown', onFlashKey);
  document.addEventListener('keydown', onLearnKey);
  $('page-body').addEventListener('submit', onLearnSubmit);
  $('page-body').addEventListener('change', (e) => {
    if (e.target.id !== 'flash-shuffle') return;
    store.set('cards-shuffle', e.target.checked);
    e.target.blur();
    startFlash(flashcards.moduleId);
  });
  $('page-body').addEventListener('change', onEditorChange);
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
// и показан выключенным (сохранённое значение не трогаем), кнопка 🔊 скрыта
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

function voiceScore(v) {
  let s = 0;
  if (/natural|neural|online|premium|enhanced/i.test(v.name)) s += 4;
  if (/google/i.test(v.name)) s += 3;
  if (/^en[-_](US|GB)/i.test(v.lang)) s += 1;
  if (!v.localService) s += 1;
  return s;
}

function currentVoice() {
  return voices.find((v) => v.name === store.get('voice', '')) || voices[0] || null;
}

function loadVoices() {
  voices = speechSynthesis.getVoices()
    .filter((v) => /^en[-_]/i.test(v.lang))
    .sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name));
  const select = $('voice');
  const cur = currentVoice();
  select.innerHTML = voices.length
    ? voices.map((v) => {
      const name = v.name.replace(/^(Microsoft|Google)\s+/, '').replace(/\s*-\s*English.*$/, '');
      return `<option value="${escapeHtml(v.name)}">${escapeHtml(name)} · ${v.lang.replace('_', '-')}</option>`;
    }).join('')
    : '<option>Голоса не найдены</option>';
  if (cur) select.value = cur.name;
}

function speakText(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voice = currentVoice();
  if (voice) u.voice = voice;
  u.lang = voice ? voice.lang : 'en-US';
  u.rate = store.get('rate', 0.9);
  // Chrome иногда «проглатывает» фразу, если speak вызвать сразу после cancel
  setTimeout(() => speechSynthesis.speak(u), 60);
}

function initVoice() {
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
  for (const btn of document.querySelectorAll('.theme-btn')) btn.textContent = theme === 'dark' ? 'Светлая тема' : 'Тёмная тема';
}

function init() {
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
  addEventListener('hashchange', route);
  route();
}

init();

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

  if (lessonId === 'mine') {
    return shuffle(store.get('study', [])).slice(0, 20).map(([en, ru]) => ({
      text: en, ru, parts: [{ from: 0, to: en.length, tr: `${en} — ${ru || '?'}` }],
    }));
  }

  // Фразы — по 10 за урок, слова — по 20, в каждой строке одна фраза или одно слово
  const lesson = LESSONS[lessonId];
  const isWords = lesson.type === 'words';
  return shuffle(lesson.items).slice(0, isWords ? 20 : 10).map(([en, ru, note]) => ({
    text: en, ru, note, parts: [{ from: 0, to: en.length, tr: isWords ? `${en} — ${ru}` : ru }],
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

const store = {
  get(key, def) {
    try { return JSON.parse(localStorage.getItem('klava:' + key)) ?? def; } catch { return def; }
  },
  set(key, val) {
    try { localStorage.setItem('klava:' + key, JSON.stringify(val)); } catch {}
  },
};

function startLesson() {
  state.chunks = makeChunks(state.lessonId);
  state.index = 0;
  state.pos = 0;
  state.missed = new Set();
  state.chars = [];
  state.wrongKey = '';
  state.errors = 0;
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
    }[state.lessonId];
    textEl.innerHTML = empty ? `<span class="next">${empty}</span>` : '';
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
// В уроке у фразы третий элемент — ключ из NOTES или готовый текст; разметка **жирный** и `формула`.
// В «Диктанте» и «Переводе» показываем только после проверки, чтобы не подсказать ответ
function renderExplain(chunk) {
  const el = $('explain');
  const note = chunk && chunk.note && (NOTES[chunk.note] || chunk.note);
  const show = Boolean(note) && $('show-explain').checked && !textHidden();
  el.hidden = !show;
  if (!show) return;
  const html = escapeHtml(note).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>');
  el.innerHTML = `<span class="explain-icon">📘</span><div class="explain-body">${html}</div>`;
}

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

// Сравнение без учёта регистра, знаков препинания и лишних пробелов:
// на слух запятые и заглавные буквы не различить
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

  // Пока открыто меню уроков, набор не идёт; Esc закрывает меню
  if (menuOpen()) { if (e.key === 'Escape') toggleMenu(false); return; }
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

function nextChunk() {
  finishLine(state.chunks[state.index]);
  state.index++;
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
const dict = {};      // перевод слов из уроков: слово -> перевод
const trCache = {};   // текст -> Promise с переводом

function buildDict() {
  for (const [id, lesson] of Object.entries(LESSONS)) {
    if (lesson.type !== 'words') continue;
    for (const [en, ru] of lesson.items) {
      if (!en.includes(' ')) dict[en] = ru;
      // формы неправильных глаголов: «went» → «идти (go went gone)»
      else if (id === 'verbs') for (const form of en.split(' ')) dict[form] ??= `${ru} (${en})`;
      else dict[en.toLowerCase()] = ru; // устойчивые выражения — целиком: «make sense» → «иметь смысл»
    }
  }
}

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

const studyList = () => store.get('study', []);
const isSaved = (word) => studyList().some(([en]) => en === word);

// В слове только буквы и апостроф, поэтому экранировать нечего
const wordRe = (word) => new RegExp(`\\b${word}\\b`, 'i');
// Слово и его формы: exaggerate → exaggerates, exaggerated, exaggerating
const stemRe = (word, flags = 'i') =>
  new RegExp(word.length > 3 ? `\\b${word.replace(/e$/, '')}[a-z]*` : `\\b${word}\\b`, flags);

// Пример предложения со словом: { en, ru } или null.
// Ищем другое предложение, не ту строку, что сейчас набирается: сначала во фразах уроков,
// потом в Tatoeba; если ничего нет — показываем текущую фразу с переводом
async function findExample(word, chunk, from) {
  const phrases = Object.values(LESSONS).filter((l) => l.type === 'phrases').flatMap((l) => l.items);
  const found = shuffle(phrases).find(([en]) => en !== chunk.text && wordRe(word).test(en));
  if (found) return { en: found[0], ru: found[1] };
  return (await findOnlineExample(word, chunk.text)) || currentSentence(chunk, from);
}

// Предложение текущей строки, в котором стоит слово (для фраз и своего текста)
async function currentSentence(chunk, from) {
  if (LESSONS[state.lessonId]?.type === 'phrases') return { en: chunk.text, ru: chunk.parts[0].tr };
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

// Добавить слово или фразу в «Мои слова» вместе с переводом
async function addToStudy(en) {
  const tr = await translate(en);
  const list = studyList();
  if (!list.some(([w]) => w === en)) store.set('study', [...list, [en, tr || '']]);
  updateMineOption();
}

function saveLookup(lk) {
  if (lk.saved) return;
  lk.saved = true;
  renderLookup();
  addToStudy(lk.word);
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
  const local = shuffle(Object.values(LESSONS).filter((l) => l.type === 'phrases').flatMap((l) => l.items))
    .filter(([en]) => en !== skip && re.test(en))
    .map(([en, ru]) => ({ en, ru }));
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
    if (tools.target?.selected || menuOpen()) return;
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
      await addToStudy(target.text);
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

// ---------- Меню выбора урока ----------
const SPECIAL = {
  mine: { title: 'Мои слова', group: 'own', icon: '⭐' },
  custom: { title: 'Свой текст', group: 'own', icon: '📝' },
};
const MENU_GROUPS = [...GROUPS, { id: 'own', title: 'Своё' }];
const lessonInfo = (id) => LESSONS[id] || SPECIAL[id];

const plural = (n, one, few, many) => {
  const m10 = n % 10, m100 = n % 100;
  const w = m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
  return `${n} ${w}`;
};

function lessonCount(id) {
  if (id === 'custom') return 'любой текст';
  if (id === 'mine') return plural(studyList().length, 'слово', 'слова', 'слов');
  const l = LESSONS[id];
  return l.type === 'words' ? plural(l.items.length, 'слово', 'слова', 'слов') : plural(l.items.length, 'фраза', 'фразы', 'фраз');
}

function renderMenu() {
  const ids = [...Object.keys(LESSONS), ...Object.keys(SPECIAL)];
  $('lesson-menu').innerHTML = MENU_GROUPS.map((g) => {
    const items = ids.filter((id) => lessonInfo(id).group === g.id).map((id) => {
      const l = lessonInfo(id);
      const cur = id === state.lessonId ? ' current' : '';
      return `<button class="menu-item${cur}" data-id="${id}"><span class="menu-icon">${l.icon}</span>` +
        `<span class="menu-text"><b>${escapeHtml(l.title)}</b><small>${lessonCount(id)}</small></span></button>`;
    }).join('');
    return `<section class="menu-group"><h4>${g.title}</h4>${items}</section>`;
  }).join('');

  const l = lessonInfo(state.lessonId);
  $('lesson-icon').textContent = l.icon;
  $('lesson-group').textContent = MENU_GROUPS.find((g) => g.id === l.group).title;
  $('lesson-title').textContent = l.title;
}

const menuOpen = () => !$('lesson-menu').hidden;
function toggleMenu(open) {
  $('lesson-menu').hidden = !open;
  $('lesson-btn').classList.toggle('open', open);
  $('lesson-btn').setAttribute('aria-expanded', open);
}

function initMenu() {
  $('lesson-btn').addEventListener('click', (e) => { e.currentTarget.blur(); toggleMenu(!menuOpen()); });
  $('lesson-menu').addEventListener('click', (e) => {
    const item = e.target.closest('.menu-item');
    if (!item) return;
    state.lessonId = item.dataset.id;
    store.set('lesson', state.lessonId);
    item.blur();
    toggleMenu(false);
    renderMenu();
    startLesson();
  });
  document.addEventListener('mousedown', (e) => {
    if (menuOpen() && !e.target.closest('.lesson-picker')) toggleMenu(false);
  });
}

// Число «Мои слова» в меню меняется, когда слово добавлено
const updateMineOption = () => renderMenu();

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
  $('theme').textContent = theme === 'dark' ? 'Светлая тема' : 'Тёмная тема';
}

function init() {
  buildKeyboard();
  buildDict();
  initWordTools();
  initVoice();

  state.lessonId = store.get('lesson', 'a1');
  if (!lessonInfo(state.lessonId)) state.lessonId = 'a1';
  initMenu();
  renderMenu();

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
  $('theme').addEventListener('click', (e) => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    store.set('theme', next);
    applyTheme(next);
    e.currentTarget.blur();
  });

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', (e) => {
    if (e.key !== 'Control' || !ctrlAlone) return;
    ctrlAlone = false;
    if (!isFormField(e.target)) onCtrl();
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

  startLesson();
}

init();

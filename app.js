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
      text: en, parts: [{ from: 0, to: en.length, tr: `${en} — ${ru || '?'}` }],
    }));
  }

  // Фразы — по 10 за урок, слова — по 20, в каждой строке одна фраза или одно слово
  const lesson = LESSONS[lessonId];
  const isWords = lesson.type === 'words';
  return shuffle(lesson.items).slice(0, isWords ? 20 : 10).map(([en, ru]) => ({
    text: en, parts: [{ from: 0, to: en.length, tr: isWords ? `${en} — ${ru}` : ru }],
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
};

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
    return;
  }

  const t = chunk.text;

  // Строка ввода стоит над образцом символ в символ: пробелы на тех же местах,
  // а ненабранный остаток образца занимает место невидимым — поэтому переносы строк совпадают
  const cell = (ch, i, cls) => {
    if (ch !== t[i] && t[i] === ' ') return `<span class="${cls} gap"> </span>`; // лишний символ вместо пробела
    // пробел вместо буквы показываем «_»: той же ширины и без переноса строки в этом месте
    const shown = ch !== t[i] && ch === ' ' ? '_' : ch;
    return `<span class="${cls}">${escapeHtml(shown)}</span>`;
  };
  let typed = '';
  for (let i = 0; i < state.pos; i++) {
    typed += cell(state.chars[i] ?? t[i], i, state.missed.has(i) ? 'miss' : 'done');
  }
  if (!state.finished) typed += '<span class="caret"></span>';
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
  const keepErrors = $('keep-errors').checked;
  const atEnd = state.pos >= chunk.text.length;

  // Хардкор: Backspace или Delete стирает всю строку (ошибки остаются в счётчике)
  if ((e.key === 'Backspace' || e.key === 'Delete') && $('hardcore').checked) {
    e.preventDefault();
    for (let i = 0; i < state.pos; i++) if (state.chars[i] === chunk.text[i]) state.typed--;
    state.pos = 0;
    state.chars = [];
    state.missed = new Set();
    state.wrongKey = '';
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
      state.wrongKey = e.key;
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
    state.wrongKey = e.key;
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
  for (const lesson of Object.values(LESSONS)) {
    if (lesson.type !== 'words') continue;
    for (const [en, ru] of lesson.items) {
      if (!en.includes(' ')) dict[en] = ru;
      else for (const form of en.split(' ')) dict[form] ??= `${ru} (${en})`; // формы неправильных глаголов
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

function onCtrl() {
  const chunk = state.chunks[state.index];
  if (!chunk) return;
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
  if (!caret || !chunk || !$('text').contains(caret.startContainer)) return null;
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
  const inside = (node) => node && ($('text').contains(node) || $('lookup').contains(node));
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
  if (chunk) speakText(chunk.text);
}

function speakText(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.9;
  speechSynthesis.speak(u);
}

function maybeSpeak() {
  if ($('auto-speak').checked) speak();
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

  for (const id of ['show-tr', 'auto-speak', 'keep-errors', 'hardcore']) {
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

  startLesson();
}

init();

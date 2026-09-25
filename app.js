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
const keyByChar = {};   // символ -> { el, shift, hand }

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
      const hand = finger[0];
      if (base.length === 1) keyByChar[base] = { el, shift: false, hand };
      if (shifted) keyByChar[shifted] = { el, shift: true, hand };
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

  const lesson = LESSONS[lessonId];
  if (lesson.type === 'phrases') {
    return shuffle(lesson.items).slice(0, 10).map(([en, ru]) => ({
      text: en, parts: [{ from: 0, to: en.length, tr: ru }],
    }));
  }

  // Слова: по 6 слов в строке
  const items = shuffle(lesson.items).slice(0, 30);
  const sep = items.some(([en]) => en.includes(' ')) ? ', ' : ' ';
  const perLine = sep === ' ' ? 6 : 3;
  const chunks = [];
  for (let i = 0; i < items.length; i += perLine) {
    let text = '';
    const parts = [];
    for (const [en, ru] of items.slice(i, i + perLine)) {
      if (text) text += sep;
      parts.push({ from: text.length, to: text.length + en.length, tr: `${en} — ${ru}` });
      text += en;
    }
    chunks.push({ text, parts });
  }
  return chunks;
}

// ---------- Состояние ----------
const state = {
  lessonId: 'a1',
  chunks: [],
  index: 0,        // номер текущего фрагмента
  pos: 0,          // позиция в фрагменте
  missed: new Set(),
  wrongKey: '',    // последняя неверно нажатая клавиша
  errors: 0,
  typed: 0,        // верно набранных символов за урок
  startedAt: 0,
  finished: false,
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
  state.wrongKey = '';
  state.errors = 0;
  state.typed = 0;
  state.startedAt = 0;
  state.finished = false;
  $('result').hidden = true;
  const custom = state.lessonId === 'custom';
  $('custom-box').hidden = !custom || state.chunks.length > 0;
  render();
  if (!custom || state.chunks.length) maybeSpeak();
}

// ---------- Отрисовка ----------
const escapeHtml = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function render() {
  const chunk = state.chunks[state.index];
  const textEl = $('text');

  if (!chunk) {
    textEl.innerHTML = state.lessonId === 'custom' ? '<span class="next">Вставьте текст ниже</span>' : '';
    $('typed').innerHTML = '';
    $('translation').textContent = '';
    highlightTarget(null);
    renderStats();
    return;
  }

  const t = chunk.text;

  // Строка ввода: набранные символы (с ошибками — красным) и неверно нажатая клавиша
  let typed = '';
  for (let i = 0; i < state.pos; i++) {
    typed += `<span class="${state.missed.has(i) ? 'miss' : 'done'}">${escapeHtml(t[i])}</span>`;
  }
  if (state.wrongKey) typed += `<span class="wrong">${escapeHtml(state.wrongKey === ' ' ? '␣' : state.wrongKey)}</span>`;
  if (!state.finished) typed += '<span class="caret"></span>';
  $('typed').innerHTML = typed;

  // Образец: пройденная часть приглушена, текущий символ подчёркнут
  let html = `<span class="passed">${escapeHtml(t.slice(0, state.pos))}</span>`;
  const cur = $('show-next').checked ? 'cur' : '';
  if (state.pos < t.length) html += `<span class="${cur}">${escapeHtml(t[state.pos])}</span>` + escapeHtml(t.slice(state.pos + 1));
  const next = state.chunks[state.index + 1];
  if (next) html += `\n<span class="next">${escapeHtml(next.text)}</span>`;
  textEl.innerHTML = html;

  const part = chunk.parts.find((p) => state.pos >= p.from && state.pos <= p.to) || chunk.parts[0];
  $('translation').textContent = $('show-tr').checked && part ? part.tr : '';

  highlightTarget(t[state.pos]);
  renderStats();
}

function highlightTarget(ch) {
  document.querySelectorAll('.key.target').forEach((el) => el.classList.remove('target'));
  const info = ch && $('show-next').checked && keyByChar[ch];
  if (!info) return;
  info.el.classList.add('target');
  // Shift нажимается мизинцем противоположной руки
  if (info.shift) keyByCode[info.hand === 'l' ? 'ShiftRight' : 'ShiftLeft'].classList.add('target');
}

function cpm() {
  if (!state.startedAt) return 0;
  const minutes = (Date.now() - state.startedAt) / 60000;
  return minutes > 0.02 ? Math.round(state.typed / minutes) : 0;
}

function accuracy() {
  const total = state.typed + state.errors;
  return total ? Math.round((state.typed / total) * 1000) / 10 : 100;
}

function renderStats() {
  const speed = cpm();
  $('cpm').textContent = speed || '—';
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

function onKeyDown(e) {
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

  if (e.key === 'Escape') { startLesson(); return; }
  if (e.ctrlKey && e.code === 'Space') { e.preventDefault(); speak(); return; }
  if (e.ctrlKey && e.code === 'KeyK') { e.preventDefault(); toggleKeyboard(!$('show-kb').checked); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  flash(keyByCode[e.code], 'pressed');

  const chunk = state.chunks[state.index];
  if (!chunk || state.finished || e.key.length !== 1) return;
  e.preventDefault(); // чтобы пробел не прокручивал страницу

  $('layout-warn').hidden = !/[а-яё]/i.test(e.key);

  if (!state.startedAt) state.startedAt = Date.now();

  if (e.key !== chunk.text[state.pos]) {
    state.errors++;
    state.missed.add(state.pos);
    state.wrongKey = e.key;
    flash(keyByCode[e.code], 'wrong');
    render();
    return;
  }

  state.wrongKey = '';
  state.typed++;
  state.pos++;
  if (state.pos >= chunk.text.length) nextChunk();
  render();
}

function nextChunk() {
  state.index++;
  state.pos = 0;
  state.missed = new Set();
  if (state.index >= state.chunks.length) finish();
  else maybeSpeak();
}

function finish() {
  state.index = state.chunks.length - 1;
  state.pos = state.chunks[state.index].text.length;
  state.finished = true;
  const speed = cpm();
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

// ---------- Озвучка ----------
function speak() {
  const chunk = state.chunks[state.index];
  if (!chunk || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(chunk.text);
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

  const select = $('lesson');
  for (const [id, lesson] of Object.entries(LESSONS)) select.add(new Option(lesson.title, id));
  select.add(new Option('Свой текст', 'custom'));
  state.lessonId = store.get('lesson', 'a1');
  if (!LESSONS[state.lessonId] && state.lessonId !== 'custom') state.lessonId = 'a1';
  select.value = state.lessonId;

  select.addEventListener('change', () => {
    state.lessonId = select.value;
    store.set('lesson', state.lessonId);
    select.blur();
    startLesson();
  });

  $('custom-text').value = store.get('customText', '');
  $('custom-start').addEventListener('click', () => {
    store.set('customText', $('custom-text').value);
    startLesson();
    document.activeElement.blur();
  });

  $('restart').addEventListener('click', (e) => { e.currentTarget.blur(); startLesson(); });
  $('again').addEventListener('click', startLesson);
  $('speak').addEventListener('click', (e) => { e.currentTarget.blur(); speak(); });

  for (const id of ['show-tr', 'auto-speak', 'show-next']) {
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
  setInterval(() => { if (state.startedAt && !state.finished) renderStats(); }, 1000);

  startLesson();
}

init();

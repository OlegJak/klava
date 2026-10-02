// Тесты ядра обучения: запуск — `node --test` из корня проекта
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const KlavaCore = require('../core.js');

const { createCore, memoryStorage, normalize, compareDictation } = KlavaCore;

// Небольшой набор уроков в формате data.js
const fixture = () => ({
  groups: [{ id: 'words', title: 'Слова' }, { id: 'grammar', title: 'Грамматика' }],
  notes: { cond1: '**First conditional**' },
  lessons: {
    basic: {
      title: 'Базовый уровень', group: 'words', icon: '🌱', type: 'words',
      items: [['time', 'время'], ['make sense', 'иметь смысл']],
    },
    verbs: {
      title: 'Неправильные глаголы', group: 'words', icon: '🔁', type: 'words',
      items: [['go went gone', 'идти']],
    },
    cond: {
      title: 'Conditionals', group: 'grammar', icon: '🔀', type: 'phrases',
      items: [
        ['If it rains, we will stay home.', 'Если пойдёт дождь, мы останемся дома.', 'cond1'],
        ['I wish I knew.', 'Жаль, что я не знаю.', 'Готовое объяснение'],
        ['See you.', 'Увидимся.'],
      ],
    },
  },
});

const makeCore = (overrides = {}) => createCore({ ...fixture(), storage: memoryStorage(), ...overrides });

// ---------- Каталог ----------

test('встроенные папки повторяют группы меню', () => {
  assert.deepEqual(makeCore().folders(), [
    { id: 'words', title: 'Слова', builtIn: true },
    { id: 'grammar', title: 'Грамматика', builtIn: true },
  ]);
});

test('встроенные модули повторяют уроки и лежат в папках своих групп', () => {
  const core = makeCore();
  assert.deepEqual(core.modules().map((m) => m.id), ['basic', 'verbs', 'cond']);
  assert.deepEqual(core.modules('words').map((m) => m.id), ['basic', 'verbs']);
  const basic = core.module('basic');
  assert.equal(basic.title, 'Базовый уровень');
  assert.equal(basic.icon, '🌱');
  assert.equal(basic.folderId, 'words');
  assert.equal(basic.kind, 'words');
  assert.equal(basic.builtIn, true);
  assert.deepEqual(basic.langs, { term: 'en', definition: 'ru' });
  assert.equal(core.module('nope'), null);
});

test('карточки встроенного модуля: термин, определение и объяснение', () => {
  const cards = makeCore().module('cond').cards;
  assert.deepEqual(cards.map((c) => [c.term, c.definition, c.explanation]), [
    ['If it rains, we will stay home.', 'Если пойдёт дождь, мы останемся дома.', '**First conditional**'],
    ['I wish I knew.', 'Жаль, что я не знаю.', 'Готовое объяснение'],
    ['See you.', 'Увидимся.', undefined],
  ]);
});

test('id встроенной карточки не зависит от её места в уроке', () => {
  const before = makeCore().module('basic').cards;
  const data = fixture();
  data.lessons.basic.items.unshift(['year', 'год']);
  data.lessons.basic.items.splice(2, 0, ['day', 'день']);
  const after = createCore({ ...data, storage: memoryStorage() }).module('basic').cards;
  for (const card of before) {
    assert.equal(after.find((c) => c.term === card.term).id, card.id);
  }
  assert.equal(new Set(after.map((c) => c.id)).size, after.length);
});

test('id карточек уникальны, даже если термин в уроке повторяется', () => {
  const data = fixture();
  data.lessons.basic.items.push(['time', 'раз']);
  const cards = createCore({ ...data, storage: memoryStorage() }).module('basic').cards;
  assert.equal(new Set(cards.map((c) => c.id)).size, cards.length);
});

test('одинаковый термин в разных модулях — разные карточки', () => {
  const data = fixture();
  data.lessons.cond.items.push(['time', 'время']);
  const core = createCore({ ...data, storage: memoryStorage() });
  const a = core.module('basic').cards.find((c) => c.term === 'time');
  const b = core.module('cond').cards.find((c) => c.term === 'time');
  assert.notEqual(a.id, b.id);
});

test('словарь перевода слов: слова, формы неправильных глаголов, устойчивые выражения', () => {
  const dict = makeCore().wordTranslations();
  assert.equal(dict.time, 'время');
  assert.equal(dict['make sense'], 'иметь смысл');
  assert.equal(dict.went, 'идти (go went gone)');
  assert.equal(dict.gone, 'идти (go went gone)');
  assert.equal(dict['See you.'], undefined); // фразы в словарь не попадают
});

test('фразы всех фразовых модулей — для поиска примеров', () => {
  const phrases = makeCore().phrases();
  assert.equal(phrases.length, 3);
  assert.deepEqual(phrases[2], { term: 'See you.', definition: 'Увидимся.' });
});

test('настоящие уроки из data.js загружаются в каталог', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'data.js'), 'utf8');
  const data = vm.runInNewContext(`${src}\n;({ LESSONS, GROUPS, NOTES })`);
  const core = createCore({ lessons: data.LESSONS, groups: data.GROUPS, notes: data.NOTES, storage: memoryStorage() });
  const folderIds = new Set(core.folders().map((f) => f.id));
  const modules = core.modules();
  assert.ok(modules.length > 0);
  for (const m of modules) {
    assert.ok(folderIds.has(m.folderId), `папка модуля ${m.id}`);
    assert.ok(m.cards.length > 0, `карточки модуля ${m.id}`);
    assert.equal(new Set(m.cards.map((c) => c.id)).size, m.cards.length, `уникальные id в ${m.id}`);
    for (const c of m.cards) {
      // ключ объяснения, которого нет в NOTES, означал бы опечатку в data.js
      if (c.explanation) assert.ok(!/^[a-z0-9_]+$/.test(c.explanation), `объяснение «${c.explanation}» в ${m.id}`);
    }
  }
});

// ---------- «Мои слова» и настройки ----------

test('«Мои слова»: добавление без дублей и сохранение в хранилище', () => {
  const storage = memoryStorage();
  const core = makeCore({ storage });
  assert.deepEqual(core.myWords(), []);
  assert.equal(core.addMyWord('exaggerate', 'преувеличивать'), true);
  assert.equal(core.addMyWord('exaggerate', 'другой перевод'), false);
  assert.equal(core.hasMyWord('exaggerate'), true);
  assert.equal(core.hasMyWord('time'), false);
  // новое ядро с тем же хранилищем видит сохранённое слово
  assert.deepEqual(makeCore({ storage }).myWords(), [{ term: 'exaggerate', definition: 'преувеличивать' }]);
});

test('«Мои слова» читают список, сохранённый прежней версией сайта', () => {
  const storage = memoryStorage({ study: [['tide', 'прилив'], ['ebb', '']] });
  assert.deepEqual(makeCore({ storage }).myWords(), [
    { term: 'tide', definition: 'прилив' },
    { term: 'ebb', definition: '' },
  ]);
});

test('настройки читаются и пишутся через хранилище', () => {
  const storage = memoryStorage({ theme: 'dark' });
  const core = makeCore({ storage });
  assert.equal(core.settings.get('theme', 'light'), 'dark');
  assert.equal(core.settings.get('rate', 0.9), 0.9);
  core.settings.set('rate', 1.1);
  assert.equal(makeCore({ storage }).settings.get('rate', 0.9), 1.1);
});

// ---------- Нормализация и диктант ----------

test('нормализация заменяет «умные» знаки и убирает лишнее', () => {
  assert.equal(normalize('  It’s “fine” — really…  '), 'It\'s "fine" - really...');
  assert.equal(normalize('Привет, world\n\nagain'), ', world again');
});

test('диктант: без ошибок, если отличаются только регистр, знаки и пробелы', () => {
  const r = compareDictation('if it rains  we will stay home', 'If it rains, we will stay home.');
  assert.equal(r.errs, 0);
  assert.equal(r.matched, 'ifitrainswewillstayhome'.length + 6);
});

test('диктант: пропущенное слово — одна ошибка, отмечено как missing', () => {
  const target = 'I will call you later.';
  const r = compareDictation('I call you later', target);
  assert.equal(r.errs, 1);
  const missing = [...target].map((c, i) => (r.tCls[i] === 'missing' ? c : '')).join('').trim();
  assert.equal(missing, 'will');
});

test('диктант: лишнее слово во вводе — ошибка, отмечено как extra', () => {
  const input = 'I like green tea';
  const r = compareDictation(input, 'I like tea.');
  assert.equal(r.errs, 1);
  assert.equal([...input].filter((c, i) => r.inCls[i] === 'extra').join('').trim(), 'green');
});

test('диктант: опечатка в слове — ошибка в этом слове', () => {
  const r = compareDictation('I lke tea', 'I like tea.');
  assert.equal(r.errs, 1);
});

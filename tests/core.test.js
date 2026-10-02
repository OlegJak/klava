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

// Предсказуемые id для своих папок, модулей и карточек
const counter = () => { let n = 0; return () => String(++n); };
const makeCore = (overrides = {}) => createCore({ ...fixture(), storage: memoryStorage(), newId: counter(), ...overrides });

// ---------- Каталог ----------

test('встроенные папки повторяют группы меню, в конце — системная папка «Своё»', () => {
  assert.deepEqual(makeCore().folders(), [
    { id: 'words', title: 'Слова', builtIn: true },
    { id: 'grammar', title: 'Грамматика', builtIn: true },
    { id: 'own', title: 'Своё', builtIn: true },
  ]);
});

test('встроенные модули повторяют уроки и лежат в папках своих групп', () => {
  const core = makeCore();
  assert.deepEqual(core.modules().filter((m) => m.builtIn).map((m) => m.id), ['basic', 'verbs', 'cond']);
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
  const modules = core.modules().filter((m) => m.builtIn);
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

// ---------- Свои папки и модули ----------

test('своя папка: создать, переименовать; появляется после встроенных', () => {
  const core = makeCore();
  const f = core.createFolder('  Работа  ');
  assert.equal(f.title, 'Работа');
  assert.equal(f.builtIn, false);
  assert.deepEqual(core.folders().map((x) => x.id), ['words', 'grammar', 'own', f.id]);
  core.renameFolder(f.id, 'Работа и учёба');
  assert.equal(core.folders().find((x) => x.id === f.id).title, 'Работа и учёба');
});

test('папке и модулю нужно непустое название', () => {
  const core = makeCore();
  assert.throws(() => core.createFolder('   '));
  const f = core.createFolder('Папка');
  assert.throws(() => core.renameFolder(f.id, ''));
  assert.throws(() => core.createModule({ title: ' ', folderId: f.id }));
});

test('встроенные папки и модули менять нельзя', () => {
  const core = makeCore();
  assert.throws(() => core.renameFolder('words', 'X'));
  assert.throws(() => core.deleteFolder('words'));
  assert.throws(() => core.updateModule('basic', { title: 'X' }));
  assert.throws(() => core.deleteModule('basic'));
  assert.throws(() => core.addCard('basic', { term: 'dog', definition: 'собака' }));
  assert.throws(() => core.deleteCard('basic', core.module('basic').cards[0].id));
});

test('свой модуль: создать в своей или встроенной папке', () => {
  const core = makeCore();
  const f = core.createFolder('Работа');
  const m = core.createModule({ title: 'Встречи', folderId: f.id });
  assert.deepEqual(
    { title: m.title, folderId: m.folderId, builtIn: m.builtIn, langs: m.langs, cards: m.cards },
    { title: 'Встречи', folderId: f.id, builtIn: false, langs: { term: 'en', definition: 'ru' }, cards: [] },
  );
  assert.deepEqual(core.modules(f.id).map((x) => x.id), [m.id]);
  const g = core.createModule({ title: 'Мои времена', folderId: 'grammar' });
  assert.deepEqual(core.modules('grammar').map((x) => x.id), ['cond', g.id]);
  assert.throws(() => core.createModule({ title: 'X', folderId: 'nope' }));
});

test('свой модуль: переименовать, перенести в другую папку, удалить', () => {
  const core = makeCore();
  const a = core.createFolder('A');
  const b = core.createFolder('B');
  const m = core.createModule({ title: 'Модуль', folderId: a.id });
  core.updateModule(m.id, { title: 'Новое имя', folderId: b.id });
  assert.equal(core.module(m.id).title, 'Новое имя');
  assert.deepEqual(core.modules(a.id), []);
  assert.deepEqual(core.modules(b.id).map((x) => x.id), [m.id]);
  assert.throws(() => core.updateModule(m.id, { folderId: 'nope' }));
  core.deleteModule(m.id);
  assert.equal(core.module(m.id), null);
});

test('удаление папки удаляет и её модули', () => {
  const core = makeCore();
  const f = core.createFolder('Папка');
  const m = core.createModule({ title: 'Модуль', folderId: f.id });
  const other = core.createModule({ title: 'Другой', folderId: 'words' });
  core.deleteFolder(f.id);
  assert.equal(core.folders().some((x) => x.id === f.id), false);
  assert.equal(core.module(m.id), null);
  assert.notEqual(core.module(other.id), null);
});

test('карточки своего модуля: добавить, изменить, удалить', () => {
  const core = makeCore();
  const m = core.createModule({ title: 'Модуль', folderId: 'words' });
  const c = core.addCard(m.id, {
    term: ' dog ', definition: 'собака', example: 'The dog barks.', exampleTranslation: 'Собака лает.', explanation: 'Существительное',
  });
  assert.deepEqual(core.module(m.id).cards, [{
    id: c.id, term: 'dog', definition: 'собака', example: 'The dog barks.', exampleTranslation: 'Собака лает.', explanation: 'Существительное',
  }]);
  core.updateCard(m.id, c.id, { definition: 'пёс', example: '' });
  const [updated] = core.module(m.id).cards;
  assert.equal(updated.definition, 'пёс');
  assert.equal(updated.example, undefined); // пустое необязательное поле не хранится
  assert.equal(updated.term, 'dog');
  core.deleteCard(m.id, c.id);
  assert.deepEqual(core.module(m.id).cards, []);
});

test('у карточки обязателен термин', () => {
  const core = makeCore();
  const m = core.createModule({ title: 'Модуль', folderId: 'words' });
  assert.throws(() => core.addCard(m.id, { term: '  ', definition: 'пусто' }));
  const c = core.addCard(m.id, { term: 'cat' });
  assert.equal(core.module(m.id).cards[0].definition, '');
  assert.throws(() => core.updateCard(m.id, c.id, { term: '' }));
});

test('карточки своего модуля можно переставлять', () => {
  const core = makeCore();
  const m = core.createModule({ title: 'Модуль', folderId: 'words' });
  const [a, b, c] = ['a', 'b', 'c'].map((term) => core.addCard(m.id, { term }));
  core.moveCard(m.id, c.id, 0);
  assert.deepEqual(core.module(m.id).cards.map((x) => x.term), ['c', 'a', 'b']);
  core.moveCard(m.id, c.id, 99);
  assert.deepEqual(core.module(m.id).cards.map((x) => x.term), ['a', 'b', 'c']);
  assert.notEqual(a.id, b.id);
});

test('вид своего модуля: фразы, если больше половины терминов — из трёх слов и длиннее', () => {
  const core = makeCore();
  const m = core.createModule({ title: 'Модуль', folderId: 'words' });
  assert.equal(core.module(m.id).kind, 'words');
  core.addCard(m.id, { term: 'make sense' });
  core.addCard(m.id, { term: 'I have never been there.' });
  assert.equal(core.module(m.id).kind, 'words');
  core.addCard(m.id, { term: 'See you later, alligator.' });
  assert.equal(core.module(m.id).kind, 'phrases');
});

test('свои папки и модули сохраняются в хранилище', () => {
  const storage = memoryStorage();
  const core = makeCore({ storage });
  const f = core.createFolder('Папка');
  const m = core.createModule({ title: 'Модуль', folderId: f.id });
  core.addCard(m.id, { term: 'dog', definition: 'собака' });
  const again = makeCore({ storage, newId: counter() });
  assert.equal(again.folders().find((x) => x.id === f.id).title, 'Папка');
  assert.deepEqual(again.module(m.id).cards.map((c) => c.term), ['dog']);
});

test('id своих папок, модулей и карточек не пересекаются со встроенными', () => {
  const core = makeCore({ newId: () => 'basic' });
  const f = core.createFolder('Папка');
  assert.notEqual(f.id, 'basic');
  const m = core.createModule({ title: 'Модуль', folderId: f.id });
  assert.notEqual(m.id, 'basic');
});

// ---------- Скрыть и скопировать ----------

test('скрытый встроенный модуль не показывается в папке, но доступен по id и возвращается', () => {
  const storage = memoryStorage();
  const core = makeCore({ storage });
  core.hideModule('verbs');
  assert.deepEqual(core.modules('words').map((m) => m.id), ['basic']);
  assert.equal(core.modules().some((m) => m.id === 'verbs'), false);
  assert.deepEqual(core.hiddenModules('words').map((m) => m.id), ['verbs']);
  assert.equal(core.isHidden('verbs'), true);
  assert.equal(core.module('verbs').id, 'verbs');
  assert.equal(makeCore({ storage }).isHidden('verbs'), true); // сохраняется
  core.showModule('verbs');
  assert.deepEqual(core.modules('words').map((m) => m.id), ['basic', 'verbs']);
  assert.deepEqual(core.hiddenModules(), []);
});

test('скрыть можно только встроенный модуль', () => {
  const core = makeCore();
  const m = core.createModule({ title: 'Свой', folderId: 'words' });
  assert.throws(() => core.hideModule(m.id));
  assert.throws(() => core.hideModule('nope'));
});

test('копия встроенного модуля — свой модуль с теми же карточками и id исходного', () => {
  const core = makeCore();
  const copy = core.copyModule('cond');
  assert.equal(copy.builtIn, false);
  assert.equal(copy.sourceId, 'cond');
  assert.equal(copy.title, 'Conditionals (копия)');
  assert.equal(copy.folderId, 'grammar');
  const orig = core.module('cond').cards;
  assert.deepEqual(copy.cards.map((c) => [c.term, c.definition, c.explanation]), orig.map((c) => [c.term, c.definition, c.explanation]));
  assert.equal(copy.cards.some((c) => orig.some((o) => o.id === c.id)), false); // у карточек копии свои id
  assert.deepEqual(core.module(copy.id).cards, copy.cards);
});

test('правка копии не меняет оригинал', () => {
  const core = makeCore();
  const copy = core.copyModule('basic', { folderId: 'own' });
  assert.equal(copy.folderId, 'own');
  core.updateCard(copy.id, copy.cards[0].id, { definition: 'пора' });
  core.deleteCard(copy.id, copy.cards[1].id);
  assert.deepEqual(core.module('basic').cards.map((c) => c.definition), ['время', 'иметь смысл']);
});

test('свой модуль тоже можно скопировать', () => {
  const core = makeCore();
  const m = core.createModule({ title: 'Свой', folderId: 'words' });
  core.addCard(m.id, { term: 'dog', definition: 'собака', example: 'A dog.' });
  const copy = core.copyModule(m.id);
  assert.equal(copy.sourceId, m.id);
  assert.deepEqual(copy.cards.map((c) => [c.term, c.example]), [['dog', 'A dog.']]);
  assert.throws(() => core.copyModule('nope'));
});

// ---------- Импорт ----------

const { parseImport } = KlavaCore;

test('импорт: формат Quizlet — термин Tab определение, карточка на строке', () => {
  const r = parseImport('dog\tсобака\ncat\tкошка, кот\r\n');
  assert.deepEqual(r.cards, [
    { term: 'dog', definition: 'собака', duplicate: null },
    { term: 'cat', definition: 'кошка, кот', duplicate: null },
  ]);
  assert.deepEqual(r.unparsed, []);
});

test('импорт: разделитель делит строку только по первому вхождению', () => {
  const r = parseImport('way, путь, способ', { termSep: 'comma' });
  assert.deepEqual(r.cards.map((c) => [c.term, c.definition]), [['way', 'путь, способ']]);
});

test('импорт: точка с запятой и тире; дефис внутри слова — не разделитель', () => {
  assert.deepEqual(parseImport('dog; собака', { termSep: 'semicolon' }).cards[0].term, 'dog');
  const r = parseImport('well-known — известный\nup-to-date - современный\ntake off–взлетать', { termSep: 'dash' });
  assert.deepEqual(r.cards.map((c) => [c.term, c.definition]), [
    ['well-known', 'известный'], ['up-to-date', 'современный'], ['take off', 'взлетать'],
  ]);
});

test('импорт: свои разделители термина и карточек', () => {
  const r = parseImport('dog = собака | cat = кошка', { termSep: '=', cardSep: '|' });
  assert.deepEqual(r.cards.map((c) => [c.term, c.definition]), [['dog', 'собака'], ['cat', 'кошка']]);
  const s = parseImport('dog\tсобака;cat\tкошка', { cardSep: 'semicolon' });
  assert.equal(s.cards.length, 2);
});

test('импорт: пустые строки пропускаются, строки без разделителя — в неразобранные', () => {
  const r = parseImport('\ndog\tсобака\n\n   \njust a line\n\tбез термина\n');
  assert.deepEqual(r.cards.map((c) => c.term), ['dog']);
  assert.deepEqual(r.unparsed, ['just a line', '\tбез термина'.trim()]);
});

test('импорт: термин без определения — карточка с пустым определением', () => {
  const r = parseImport('dog\t');
  assert.deepEqual(r.cards.map((c) => [c.term, c.definition]), [['dog', '']]);
});

test('импорт: повторы — термин уже есть в модуле или встречается во вставке раньше', () => {
  const r = parseImport('Dog\tсобака\ncat\tкошка\ndog\tпёс', { existingTerms: ['cat'] });
  assert.deepEqual(r.cards.map((c) => c.duplicate), [null, 'module', 'paste']);
});

test('добавление нескольких карточек сразу', () => {
  const core = makeCore();
  const m = core.createModule({ title: 'Модуль', folderId: 'words' });
  core.addCard(m.id, { term: 'dog', definition: 'собака' });
  const added = core.addCards(m.id, [{ term: 'cat', definition: 'кошка' }, { term: 'fox', definition: '' }]);
  assert.equal(added.length, 2);
  assert.deepEqual(core.module(m.id).cards.map((c) => c.term), ['dog', 'cat', 'fox']);
  assert.throws(() => core.addCards('basic', [{ term: 'x' }]));
});

// ---------- «Мои слова» и настройки ----------

const terms = (core, id) => core.module(id).cards.map((c) => [c.term, c.definition]);

test('«Мои слова» — свой модуль в папке «Своё», он есть всегда', () => {
  const m = makeCore().module('mine');
  assert.equal(m.title, 'Мои слова');
  assert.equal(m.icon, '⭐');
  assert.equal(m.folderId, 'own');
  assert.equal(m.builtIn, false);
  assert.deepEqual(m.cards, []);
});

test('«Мои слова» нельзя удалить, но можно править как обычный модуль', () => {
  const core = makeCore();
  assert.throws(() => core.deleteModule('mine'));
  core.addCard('mine', { term: 'tide', definition: 'прилив' });
  assert.deepEqual(terms(core, 'mine'), [['tide', 'прилив']]);
});

test('«Мои слова»: добавление с переводом и примером, без повторов', () => {
  const storage = memoryStorage();
  const core = makeCore({ storage });
  assert.equal(core.addMyWord({
    term: 'exaggerate', definition: 'преувеличивать', example: 'Don\'t exaggerate.', exampleTranslation: 'Не преувеличивай.',
  }), true);
  assert.equal(core.addMyWord({ term: 'exaggerate', definition: 'другой перевод' }), false);
  assert.equal(core.hasMyWord('exaggerate'), true);
  assert.equal(core.hasMyWord('time'), false);
  const [card] = makeCore({ storage }).module('mine').cards;
  assert.deepEqual(
    [card.term, card.definition, card.example, card.exampleTranslation],
    ['exaggerate', 'преувеличивать', 'Don\'t exaggerate.', 'Не преувеличивай.'],
  );
});

test('список «Мои слова» прежней версии сайта переносится в модуль один раз, без повторов', () => {
  const storage = memoryStorage({ study: [['tide', 'прилив'], ['ebb', '']] });
  const core = makeCore({ storage });
  assert.deepEqual(terms(core, 'mine'), [['tide', 'прилив'], ['ebb', '']]);
  // прежний список очищен, повторный запуск ничего не дублирует
  assert.deepEqual(storage.get('study', []), []);
  assert.deepEqual(terms(makeCore({ storage, newId: () => 'x' }), 'mine'), [['tide', 'прилив'], ['ebb', '']]);
});

test('перенос: слово из старого списка, которое уже есть в модуле, не дублируется', () => {
  const storage = memoryStorage();
  makeCore({ storage }).addMyWord({ term: 'tide', definition: 'прилив' });
  storage.set('study', [['tide', 'другое'], ['ebb', 'отлив']]);
  assert.deepEqual(terms(makeCore({ storage, newId: () => 'y' }), 'mine'), [['tide', 'прилив'], ['ebb', 'отлив']]);
});

test('карточку можно перенести в другой свой модуль', () => {
  const core = makeCore();
  const target = core.createModule({ title: 'Море', folderId: 'words' });
  core.addMyWord({ term: 'tide', definition: 'прилив' });
  core.addMyWord({ term: 'ebb', definition: 'отлив' });
  const card = core.module('mine').cards[0];
  core.moveCardTo('mine', card.id, target.id);
  assert.deepEqual(terms(core, 'mine'), [['ebb', 'отлив']]);
  assert.deepEqual(core.module(target.id).cards, [card]);
  assert.throws(() => core.moveCardTo('mine', core.module('mine').cards[0].id, 'basic'));
  assert.throws(() => core.moveCardTo('mine', 'nope', target.id));
});

test('настройки читаются и пишутся через хранилище', () => {
  const storage = memoryStorage({ theme: 'dark' });
  const core = makeCore({ storage });
  assert.equal(core.settings.get('theme', 'light'), 'dark');
  assert.equal(core.settings.get('rate', 0.9), 0.9);
  core.settings.set('rate', 1.1);
  assert.equal(makeCore({ storage }).settings.get('rate', 0.9), 1.1);
});

test('недавние модули: последний открытый первым, без повторов, не больше шести', () => {
  const storage = memoryStorage();
  const core = makeCore({ storage });
  assert.deepEqual(core.recent(), []);
  for (const id of ['a', 'b', 'c', 'a', 'd', 'e', 'f', 'g']) core.markOpened(id);
  assert.deepEqual(core.recent(), ['g', 'f', 'e', 'd', 'a', 'c']);
  assert.deepEqual(makeCore({ storage }).recent(), ['g', 'f', 'e', 'd', 'a', 'c']);
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

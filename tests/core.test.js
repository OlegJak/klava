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
// «Сейчас» для ядра: полдень заданного дня октября 2026 года (по местному времени)
const clock = (day = 1) => { const c = { day, now: () => new Date(2026, 9, c.day, 12).getTime() }; return c; };
const makeCore = (overrides = {}) =>
  createCore({ ...fixture(), storage: memoryStorage(), newId: counter(), now: clock().now, ...overrides });

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

// ---------- Режим «Карточки» ----------

const { flashSession, flashAnswer, flashRetry } = KlavaCore;
const deck = ['a', 'b', 'c', 'd'].map((t) => ({ id: t, term: t, definition: t.toUpperCase() }));
const ids = (list) => list.map((c) => c.id);

test('карточки: по порядку, «знаю / не знаю» двигают дальше, в конце — итог', () => {
  let s = flashSession(deck);
  assert.equal(s.current.id, 'a');
  assert.equal(s.done, false);
  s = flashAnswer(s, true);
  s = flashAnswer(s, false);
  assert.equal(s.current.id, 'c');
  assert.deepEqual([s.position, s.total], [3, 4]);
  s = flashAnswer(flashAnswer(s, false), true);
  assert.equal(s.done, true);
  assert.equal(s.current, null);
  assert.deepEqual(ids(s.known), ['a', 'd']);
  assert.deepEqual(ids(s.unknown), ['b', 'c']);
});

test('карточки: занятие не меняется на месте — каждый ответ даёт новое состояние', () => {
  const s = flashSession(deck);
  flashAnswer(s, true);
  assert.equal(s.current.id, 'a');
  assert.deepEqual(s.known, []);
});

test('карточки: ответ после конца ничего не меняет', () => {
  let s = flashSession(deck.slice(0, 1));
  s = flashAnswer(s, true);
  assert.deepEqual(flashAnswer(s, false), s);
});

test('карточки: перемешивание использует переданный источник случайности', () => {
  const s = flashSession(deck, { shuffle: true, random: () => 0 });
  assert.deepEqual(ids(s.cards), ['b', 'c', 'd', 'a']);
  assert.deepEqual(ids(flashSession(deck, { shuffle: false }).cards), ['a', 'b', 'c', 'd']);
});

test('карточки: «повторить незнакомые» — новое занятие только из них', () => {
  let s = flashSession(deck);
  for (const known of [true, false, true, false]) s = flashAnswer(s, known);
  const again = flashRetry(s);
  assert.deepEqual(ids(again.cards), ['b', 'd']);
  assert.deepEqual([again.position, again.total, again.done], [1, 2, false]);
});

test('карточки: пустой модуль — занятие сразу закончено', () => {
  const s = flashSession([]);
  assert.equal(s.done, true);
  assert.equal(s.total, 0);
});

// ---------- Проверка ответа ----------

const { checkAnswer } = KlavaCore;

test('проверка: регистр, знаки препинания, лишние пробелы и «ё/е» не важны', () => {
  assert.equal(checkAnswer('  ПРИВЕТ,   мир! ', 'привет мир'), 'correct');
  assert.equal(checkAnswer('еще', 'ещё'), 'correct');
  assert.equal(checkAnswer('dont', "don't"), 'correct');
  assert.equal(checkAnswer('I am here.', 'i am here'), 'correct');
});

test('проверка: подходит любой вариант через запятую, точку с запятой или слэш', () => {
  for (const v of ['путь', 'способ', 'метод']) assert.equal(checkAnswer(v, 'путь, способ; метод'), 'correct');
  assert.equal(checkAnswer('car', 'car/auto'), 'correct');
  assert.equal(checkAnswer('путь, способ', 'путь, способ'), 'correct');
  assert.equal(checkAnswer('дорога', 'путь, способ'), 'wrong');
});

test('проверка: текст в скобках необязателен', () => {
  assert.equal(checkAnswer('go', '(to) go'), 'correct');
  assert.equal(checkAnswer('to go', '(to) go'), 'correct');
  assert.equal(checkAnswer('работа', 'работа (место)'), 'correct');
});

test('проверка: опечатка в одну букву — «почти», если в варианте от 4 букв', () => {
  assert.equal(checkAnswer('hous', 'house'), 'almost');      // пропуск
  assert.equal(checkAnswer('hoyse', 'house'), 'almost');     // замена
  assert.equal(checkAnswer('housee', 'house'), 'almost');    // лишняя
  assert.equal(checkAnswer('cat', 'car'), 'wrong');          // короткое слово — строго
  assert.equal(checkAnswer('hoyce', 'house'), 'wrong');      // две ошибки
  assert.equal(checkAnswer('spedd', 'speed, rate'), 'almost');
});

test('проверка: пустой ответ — неверно', () => {
  assert.equal(checkAnswer('   ', 'house'), 'wrong');
  assert.equal(checkAnswer('!!!', 'house'), 'wrong');
});

// ---------- Режим «Заучивание» ----------

const { learnSession, learnAnswer } = KlavaCore;
const words = Array.from({ length: 9 }, (_, i) => ({ id: `w${i}`, term: `term${i}`, definition: `опр${i}` }));
// Ответить на текущий вопрос верно или неверно
const answer = (s, ok) => learnAnswer(s, ok);
// Пройти целый раунд одним и тем же ответом
const answerRound = (s, ok) => { const r = s.round; while (s.round === r && !s.done) s = answer(s, ok); return s; };

test('заучивание: раунд — до 7 карточек, сначала выбор из 4 вариантов', () => {
  const s = learnSession(words, { random: () => 0.5 });
  assert.equal(s.round, 1);
  assert.equal(s.roundSize, 7);
  const q = s.question;
  assert.equal(q.stage, 1);
  assert.equal(q.card.id, 'w0');
  assert.equal(q.prompt, 'term0');
  assert.equal(q.answer, 'опр0');
  assert.equal(q.choices.length, 4);
  assert.ok(q.choices.includes('опр0'));
  assert.equal(new Set(q.choices).size, 4);
  for (const c of q.choices) assert.match(c, /^опр\d$/); // неверные — из того же модуля
});

test('заучивание: «рус → англ» — спрашивается определение, отвечать термином', () => {
  const q = learnSession(words, { direction: 'ru-en' }).question;
  assert.equal(q.prompt, 'опр0');
  assert.equal(q.answer, 'term0');
  assert.ok(q.choices.every((c) => /^term\d$/.test(c)));
});

test('заучивание: верный выбор переводит на ввод, освоено после двух верных вводов подряд', () => {
  let s = learnSession(words.slice(0, 2));
  s = answerRound(s, true);              // раунд 1: выбор
  assert.equal(s.round, 2);
  assert.equal(s.question.stage, 2);
  assert.equal(s.question.choices, null);
  s = answerRound(s, true);              // раунд 2: первый верный ввод
  assert.equal(s.mastered, 0);
  s = answerRound(s, true);              // раунд 3: второй верный ввод
  assert.equal(s.mastered, 2);
  assert.equal(s.done, true);
  assert.equal(s.question, null);
});

test('заучивание: ошибка при вводе возвращает карточку на выбор в следующем раунде', () => {
  let s = learnSession(words.slice(0, 1));
  s = answer(s, true);                   // выбор
  s = answer(s, true);                   // ввод: 1 из 2
  s = answer(s, false);                  // ошибка при вводе
  assert.equal(s.question.stage, 1);
  s = answer(answer(s, true), true);     // снова выбор и один ввод — ещё не освоено
  assert.equal(s.mastered, 0);
  s = answer(s, true);
  assert.equal(s.done, true);
});

test('заучивание: ошибка при выборе оставляет карточку на выборе', () => {
  let s = learnSession(words.slice(0, 1));
  s = answer(s, false);
  assert.equal(s.question.stage, 1);
});

test('заучивание: освоенные уступают место следующим карточкам модуля', () => {
  let s = learnSession(words);           // 9 карточек, раунд — 7
  assert.deepEqual(s.question.card.id, 'w0');
  for (let i = 0; i < 3; i++) s = answerRound(s, true);
  // первые 7 освоены — в раунде оставшиеся две
  assert.equal(s.mastered, 7);
  assert.equal(s.roundSize, 2);
  assert.equal(s.question.card.id, 'w7');
  assert.equal(s.total, 9);
});

test('заучивание: карточки без ответа в выбранном направлении пропускаются', () => {
  const s = learnSession([{ id: 'x', term: 'x', definition: '' }, ...words.slice(0, 1)]);
  assert.equal(s.total, 1);
  assert.equal(s.question.card.id, 'w0');
});

test('заучивание: вариантов меньше четырёх, если в модуле мало карточек', () => {
  const q = learnSession(words.slice(0, 2)).question;
  assert.equal(q.choices.length, 2);
});

// ---------- Повторение (коробки Лейтнера) ----------

// Ядро с часами, которые можно переводить по дням
const timed = () => { const c = clock(1); return { c, core: makeCore({ now: c.now }) }; };
const card = (core, i = 0) => core.module('basic').cards[i].id;

test('повторение: невстреченные карточки — без прогресса и не ждут повторения', () => {
  const { core } = timed();
  assert.deepEqual(core.cardProgress(card(core)), {});
  assert.deepEqual(core.moduleStats('basic'), { total: 2, seen: 0, learned: 0, due: 0 });
});

test('повторение: первый ответ заносит карточку в коробку 1, повтор завтра', () => {
  const { c, core } = timed();
  core.recordAnswer(card(core), 'en-ru', true);
  const p = core.cardProgress(card(core))['en-ru'];
  assert.deepEqual([p.box, p.due - p.last], [1, 1]);
  assert.equal(core.moduleStats('basic').due, 0);
  c.day = 2;
  assert.equal(core.moduleStats('basic').due, 1);
});

test('повторение: верные ответы в срок — коробки 1→5 с интервалами 1, 3, 7, 14, 30 дней, из пятой — снова 30', () => {
  const { c, core } = timed();
  const id = card(core);
  const seen = [];
  for (let i = 0; i < 6; i++) {
    core.recordAnswer(id, 'en-ru', true);
    const p = core.cardProgress(id)['en-ru'];
    seen.push([p.box, p.due - p.last]);
    c.day += p.due - p.last; // приходим ровно в срок
  }
  assert.deepEqual(seen, [[1, 1], [2, 3], [3, 7], [4, 14], [5, 30], [5, 30]]);
});

test('повторение: верный ответ до срока коробку не меняет', () => {
  const { c, core } = timed();
  const id = card(core);
  core.recordAnswer(id, 'en-ru', true);
  core.recordAnswer(id, 'en-ru', true); // в тот же день, ещё рано
  assert.equal(core.cardProgress(id)['en-ru'].box, 1);
  c.day = 2;
  core.recordAnswer(id, 'en-ru', true);
  assert.equal(core.cardProgress(id)['en-ru'].box, 2);
});

test('повторение: неверный ответ — коробка 1 и повтор завтра, даже до срока', () => {
  const { c, core } = timed();
  const id = card(core);
  for (const d of [1, 2, 5]) { c.day = d; core.recordAnswer(id, 'en-ru', true); }
  assert.equal(core.cardProgress(id)['en-ru'].box, 3);
  c.day = 6;
  core.recordAnswer(id, 'en-ru', false);
  const p = core.cardProgress(id)['en-ru'];
  assert.deepEqual([p.box, p.due - p.last], [1, 1]);
});

test('повторение: направления «англ → рус» и «рус → англ» независимы', () => {
  const { core } = timed();
  const id = card(core);
  core.recordAnswer(id, 'en-ru', true);
  assert.equal(core.cardProgress(id)['ru-en'], undefined);
  core.recordAnswer(id, 'ru-en', false);
  assert.equal(core.cardProgress(id)['en-ru'].box, 1);
  assert.equal(core.cardProgress(id)['ru-en'].box, 1);
});

test('повторение: слово выучено, когда оба направления в коробке 3 и выше', () => {
  const { c, core } = timed();
  const id = card(core);
  for (const d of [1, 2, 5]) { c.day = d; core.recordAnswer(id, 'en-ru', true); }
  assert.equal(core.moduleStats('basic').learned, 0);
  for (const d of [5, 6, 9]) { c.day = d; core.recordAnswer(id, 'ru-en', true); }
  assert.deepEqual(core.moduleStats('basic'), { total: 2, seen: 1, learned: 1, due: 0 });
});

test('повторение: ждут — карточки, у которых срок хотя бы одного направления наступил', () => {
  const { c, core } = timed();
  core.recordAnswer(card(core, 0), 'en-ru', true);
  core.recordAnswer(card(core, 1), 'ru-en', true);
  c.day = 2;
  core.recordAnswer(card(core, 1), 'ru-en', true); // вторая ушла на 3 дня
  assert.equal(core.moduleStats('basic').due, 1);
  assert.equal(core.isDue(card(core, 0)), true);
  assert.equal(core.isDue(card(core, 1)), false);
});

test('повторение: состояние каждой карточки модуля — новая, изучается, выучена; ждёт ли повторения', () => {
  const { c, core } = timed();
  const [a, b] = [card(core, 0), card(core, 1)];
  for (const d of [1, 2, 5]) { c.day = d; core.recordAnswer(a, 'en-ru', true); core.recordAnswer(a, 'ru-en', true); }
  core.recordAnswer(b, 'en-ru', false);
  c.day = 6;
  assert.deepEqual(core.cardStates('basic'), {
    [a]: { state: 'learned', due: false },
    [b]: { state: 'learning', due: true },
  });
  const m = core.createModule({ title: 'Свой', folderId: 'words' });
  const x = core.addCard(m.id, { term: 'x' });
  assert.deepEqual(core.cardStates(m.id), { [x.id]: { state: 'new', due: false } });
});

test('«Сегодня»: пусто, пока ничего не встречено или срок не наступил', () => {
  const { core } = timed();
  assert.deepEqual(core.dueCards(), []);
  core.recordAnswer(card(core), 'en-ru', true);
  assert.deepEqual(core.dueCards(), []);
  assert.equal(core.dueCount(), 0);
});

test('«Сегодня»: карточки с наступившим сроком из всех модулей, самые просроченные первыми', () => {
  const { c, core } = timed();
  const m = core.createModule({ title: 'Свой', folderId: 'grammar' });
  const own = core.addCard(m.id, { term: 'dog', definition: 'собака' });
  const cond = core.module('cond').cards[0].id;
  core.recordAnswer(card(core, 1), 'ru-en', true);  // день 1 → срок 2
  c.day = 2;
  core.recordAnswer(own.id, 'en-ru', false);         // день 2 → срок 3
  core.recordAnswer(cond, 'en-ru', true);            // день 2 → срок 3
  c.day = 5;
  assert.deepEqual(core.dueCards().map((x) => [x.card.id, x.moduleId]), [
    [card(core, 1), 'basic'],
    [cond, 'cond'],
    [own.id, m.id],
  ]);
  assert.equal(core.dueCount(), 3);
  assert.equal(core.dueCount('grammar'), 2);
  assert.equal(core.dueCount('words'), 1);
});

test('«Сегодня»: скрытые модули в очередь не попадают', () => {
  const { c, core } = timed();
  core.recordAnswer(core.module('verbs').cards[0].id, 'en-ru', true);
  c.day = 3;
  assert.equal(core.dueCount(), 1);
  core.hideModule('verbs');
  assert.deepEqual(core.dueCards(), []);
  assert.equal(core.dueCount('words'), 0);
});

test('повторение: прогресс сохраняется в хранилище', () => {
  const storage = memoryStorage();
  const c = clock(1);
  const core = makeCore({ storage, now: c.now });
  core.recordAnswer(card(core), 'en-ru', true);
  assert.equal(makeCore({ storage, now: c.now }).cardProgress(card(core))['en-ru'].box, 1);
});

test('повторение: копия встроенного модуля получает его прогресс', () => {
  const { core } = timed();
  core.recordAnswer(card(core, 1), 'ru-en', true);
  const copy = core.copyModule('basic');
  assert.deepEqual(core.cardProgress(copy.cards[1].id), core.cardProgress(card(core, 1)));
  assert.deepEqual(core.cardProgress(copy.cards[0].id), {});
});

// ---------- Режим «Тест» ----------

const { buildTest, gradeTest } = KlavaCore;
const six = words.slice(0, 6);

test('тест: столько вопросов, сколько просили, но не больше карточек', () => {
  assert.equal(buildTest(six, { count: 4 }).length, 4);
  assert.equal(buildTest(six, { count: 50 }).length, 6);
  const withEmpty = [...six, { id: 'e', term: 'empty', definition: '' }];
  assert.equal(buildTest(withEmpty, { count: 50 }).length, 6); // без ответа в направлении — не спрашиваем
});

test('тест: выбранные типы вопросов распределяются поровну', () => {
  const qs = buildTest(six, { count: 6, types: ['choice', 'truefalse', 'written'] });
  const n = (t) => qs.filter((q) => q.type === t).length;
  assert.deepEqual([n('choice'), n('truefalse'), n('written')], [2, 2, 2]);
  assert.ok(buildTest(six, { count: 6, types: ['written'] }).every((q) => q.type === 'written'));
});

test('тест: каждая карточка спрашивается один раз, направление как задано', () => {
  const qs = buildTest(six, { count: 6, direction: 'ru-en', types: ['written'] });
  assert.equal(new Set(qs.map((q) => q.card.id)).size, 6);
  for (const q of qs) assert.deepEqual([q.prompt, q.answer], [q.card.definition, q.card.term]);
});

test('тест: выбор — до 4 разных вариантов, среди них правильный', () => {
  for (const q of buildTest(six, { count: 6, types: ['choice'] })) {
    assert.ok(q.choices.includes(q.answer));
    assert.equal(new Set(q.choices).size, q.choices.length);
    assert.ok(q.choices.length <= 4);
  }
});

test('тест: «верно / неверно» показывает правильный ответ или чужой', () => {
  const yes = buildTest(six, { count: 1, types: ['truefalse'], random: () => 0.1 })[0];
  assert.equal(yes.shown, yes.answer);
  assert.equal(yes.isTrue, true);
  const no = buildTest(six, { count: 1, types: ['truefalse'], random: () => 0.9 })[0];
  assert.notEqual(no.shown, no.answer);
  assert.equal(no.isTrue, false);
  assert.match(no.shown, /^опр\d$/);
});

test('тест: оценка — верные ответы, процент и список ошибок', () => {
  const [c, t, w1, w2] = buildTest(six.slice(0, 4), { count: 4, types: ['choice', 'truefalse', 'written', 'written'] })
    .sort((a, b) => ['choice', 'truefalse', 'written'].indexOf(a.type) - ['choice', 'truefalse', 'written'].indexOf(b.type));
  const responses = [c.answer, !t.isTrue, w1.answer.slice(0, -1) + 'ъ', 'совсем не то'];
  const r = gradeTest([c, t, w1, w2], responses);
  assert.deepEqual(r.results, ['correct', 'wrong', w1.answer.length >= 4 ? 'almost' : 'wrong', 'wrong']);
  assert.equal(r.total, 4);
  assert.equal(r.correct, r.results.filter((x) => x !== 'wrong').length);
  assert.equal(r.percent, Math.round((r.correct / 4) * 100));
  assert.deepEqual(r.mistakes.map((m) => m.index), r.results.flatMap((x, i) => (x === 'wrong' ? [i] : [])));
});

test('тест: без ответа на вопрос — ошибка', () => {
  const qs = buildTest(six.slice(0, 3), { count: 3, types: ['choice', 'truefalse', 'written'] });
  const r = gradeTest(qs, [undefined, undefined, '']);
  assert.deepEqual(r.results, ['wrong', 'wrong', 'wrong']);
  assert.equal(r.percent, 0);
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

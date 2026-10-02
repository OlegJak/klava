// Тесты хранилища Supabase: запуск — `node --test` из корня проекта
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadRows, cloudStorage } = require('../cloud.js');

// Поддельный клиент Supabase: таблица kv в памяти и управляемые ошибки
function fakeClient({ rows = [], failUpserts = 0 } = {}) {
  const table = new Map(rows.map((r) => [r.key, r.value]));
  const calls = [];
  let fails = failUpserts;
  return {
    calls,
    table,
    from(name) {
      assert.equal(name, 'kv');
      return {
        select: async () => ({ data: [...table].map(([key, value]) => ({ key, value })), error: null }),
        upsert: async (payload) => {
          calls.push(payload);
          if (fails > 0) { fails--; return { error: new Error('network') }; }
          for (const r of payload) table.set(r.key, r.value);
          return { error: null };
        },
      };
    },
  };
}

// Ручной таймер: отложенные вызовы выполняются по команде
function manualTimer() {
  let fn = null;
  return { set: (f) => { fn = f; return 1; }, clear: () => { fn = null; }, run: async () => { const f = fn; fn = null; if (f) await f(); } };
}

test('загрузка: записи пользователя превращаются в объект ключ → значение', async () => {
  const client = fakeClient({ rows: [{ key: 'own', value: { folders: [] } }, { key: 'theme', value: 'dark' }] });
  assert.deepEqual(await loadRows(client), { own: { folders: [] }, theme: 'dark' });
});

test('чтение: из загруженного, копией; нет ключа — значение по умолчанию', () => {
  const s = cloudStorage({ client: fakeClient(), userId: 'u', rows: { recent: ['a'] } });
  const r = s.get('recent', []);
  r.push('b');
  assert.deepEqual(s.get('recent', []), ['a']);
  assert.equal(s.get('nope', 42), 42);
});

test('запись: сразу видна при чтении, в Supabase уходит одной пачкой после паузы', async () => {
  const client = fakeClient();
  const timer = manualTimer();
  const statuses = [];
  const s = cloudStorage({ client, userId: 'u1', rows: {}, setTimer: timer.set, clearTimer: timer.clear, onStatus: (st) => statuses.push(st) });
  s.set('progress', { a: 1 });
  s.set('progress', { a: 2 });
  s.set('theme', 'dark');
  assert.deepEqual(s.get('progress', null), { a: 2 });
  assert.equal(client.calls.length, 0);
  assert.equal(s.pending(), true);
  await timer.run();
  assert.equal(client.calls.length, 1);
  assert.deepEqual(client.calls[0], [
    { user_id: 'u1', key: 'progress', value: { a: 2 } },
    { user_id: 'u1', key: 'theme', value: 'dark' },
  ]);
  assert.equal(s.pending(), false);
  assert.equal(statuses.at(-1), 'saved');
});

test('ошибка сети: несохранённое не теряется, повтор отправляет его снова', async () => {
  const client = fakeClient({ failUpserts: 1 });
  const statuses = [];
  const s = cloudStorage({ client, userId: 'u', rows: {}, setTimer: () => 0, clearTimer: () => {}, onStatus: (st) => statuses.push(st) });
  s.set('own', { x: 1 });
  assert.equal(await s.flush(), false);
  assert.equal(statuses.at(-1), 'error');
  assert.equal(s.pending(), true);
  assert.equal(await s.flush(), true);
  assert.deepEqual(client.table.get('own'), { x: 1 });
  assert.equal(s.pending(), false);
});

test('запись во время отправки уходит следующей пачкой', async () => {
  const client = fakeClient();
  const s = cloudStorage({ client, userId: 'u', rows: {}, setTimer: () => 0, clearTimer: () => {} });
  s.set('a', 1);
  const first = s.flush();
  s.set('b', 2);
  await first;
  await s.flush();
  assert.deepEqual(client.calls.map((c) => c.map((r) => r.key)), [['a'], ['b']]);
});

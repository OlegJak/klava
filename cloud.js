// Хранилище ядра в Supabase: те же ключи, что в браузере, в таблице kv (см. supabase/schema.sql и docs/adr/0001).
// При входе все записи читаются в память, ядро работает с памятью синхронно,
// изменения уходят в Supabase пачкой после короткой паузы. Если отправка не удалась — ключи остаются
// несохранёнными до следующей попытки.
// На сайте — глобальный объект KlavaCloud, в Node (тесты) — module.exports
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KlavaCloud = api;
})(this, function () {
  const copy = (v) => JSON.parse(JSON.stringify(v));

  // Все записи пользователя: { ключ: значение }. Чужие строки отсекают правила доступа в Supabase
  async function loadRows(client) {
    const { data, error } = await client.from('kv').select('key, value');
    if (error) throw error;
    return Object.fromEntries(data.map((r) => [r.key, r.value]));
  }

  // onStatus(status, error): 'pending' — есть несохранённое, 'saving', 'saved', 'error'.
  // setTimer / clearTimer — для тестов
  function cloudStorage({
    client, userId, rows, delay = 400, onStatus = () => {}, setTimer = setTimeout, clearTimer = clearTimeout,
  }) {
    const cache = copy(rows);
    const dirty = new Set();
    let timer = 0;
    let sending = null;

    async function flush() {
      clearTimer(timer);
      timer = 0;
      if (sending) await sending.catch(() => {}); // по очереди: одна отправка за раз
      if (!dirty.size) return true;
      const keys = [...dirty];
      dirty.clear();
      onStatus('saving');
      sending = Promise.resolve(client.from('kv').upsert(keys.map((key) => ({ user_id: userId, key, value: cache[key] }))))
        .then(({ error }) => { if (error) throw error; });
      try {
        await sending;
        onStatus(dirty.size ? 'pending' : 'saved');
        return true;
      } catch (e) {
        for (const k of keys) dirty.add(k);
        onStatus('error', e);
        return false;
      } finally {
        sending = null;
      }
    }

    return {
      get: (key, def) => (key in cache ? copy(cache[key]) : def),
      set(key, val) {
        cache[key] = copy(val);
        dirty.add(key);
        onStatus('pending');
        clearTimer(timer);
        timer = setTimer(flush, delay);
      },
      flush,
      pending: () => dirty.size > 0 || Boolean(sending),
    };
  }

  return { loadRows, cloudStorage };
});

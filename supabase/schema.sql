-- Klava: данные владельца в Supabase.
-- Выполнить один раз: Supabase → SQL Editor → New query → вставить весь файл → Run.
-- Повторный запуск безопасен: всё создаётся «если нет», политики пересоздаются.

-- ---------- Данные: одна таблица «ключ — значение» ----------
-- Ядро сайта хранит всё в нескольких JSON-записях по ключу (own — свои папки, модули и карточки,
-- progress — прогресс повторения, hidden, recent, настройки). Здесь — те же записи, у каждой свой владелец.
create table if not exists public.kv (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  key        text        not null,
  value      jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- updated_at обновляется при каждой записи
create or replace function public.kv_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists kv_touch on public.kv;
create trigger kv_touch before update on public.kv
  for each row execute function public.kv_touch();

-- Доступ — только владельцу своих строк. Без входа (роль anon) — никакого доступа
alter table public.kv enable row level security;

drop policy if exists "kv: владелец читает" on public.kv;
drop policy if exists "kv: владелец добавляет" on public.kv;
drop policy if exists "kv: владелец меняет" on public.kv;
drop policy if exists "kv: владелец удаляет" on public.kv;

create policy "kv: владелец читает" on public.kv
  for select to authenticated using (user_id = auth.uid());
create policy "kv: владелец добавляет" on public.kv
  for insert to authenticated with check (user_id = auth.uid());
create policy "kv: владелец меняет" on public.kv
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "kv: владелец удаляет" on public.kv
  for delete to authenticated using (user_id = auth.uid());

revoke all on public.kv from anon;
grant select, insert, update, delete on public.kv to authenticated;

-- ---------- Картинки карточек: приватное хранилище ----------
-- Файлы лежат по пути <id владельца>/<файл>; читать и писать можно только свою папку
insert into storage.buckets (id, name, public)
values ('images', 'images', false)
on conflict (id) do nothing;

drop policy if exists "images: владелец читает" on storage.objects;
drop policy if exists "images: владелец добавляет" on storage.objects;
drop policy if exists "images: владелец меняет" on storage.objects;
drop policy if exists "images: владелец удаляет" on storage.objects;

create policy "images: владелец читает" on storage.objects
  for select to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "images: владелец добавляет" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "images: владелец меняет" on storage.objects
  for update to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "images: владелец удаляет" on storage.objects
  for delete to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);

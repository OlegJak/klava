# Настройка Supabase для Klava

Нужно один раз, чтобы сайт мог хранить ваши модули, прогресс и картинки в облаке и показывать их на телефоне и компьютере.
Всё делается в браузере, займёт минут 20. Расположение кнопок в панелях Supabase и Google со временем меняется —
если что-то называется иначе, ищите по смыслу.

Что получится в конце: **адрес проекта** (`https://xxxx.supabase.co`) и **публичный ключ** (anon / publishable key).
Их можно спокойно прислать в чат: они и так окажутся в коде сайта, а защиту дают правила доступа из `supabase/schema.sql`.
Пароль базы данных и секрет Google (Client secret) **никому не присылайте**.

## 1. Проект Supabase

1. Зайдите на https://supabase.com и войдите (удобно — через GitHub).
2. **New project**:
   - Name: `klava`
   - Database password: придумайте и сохраните в менеджере паролей (сайту он не нужен)
   - Region: ближайший к вам, например *Central EU (Frankfurt)*
   - тариф Free
3. Дождитесь, пока проект запустится (1–2 минуты).

## 2. Таблица и правила доступа

1. В проекте слева — **SQL Editor** → **New query**.
2. Откройте файл [`supabase/schema.sql`](../supabase/schema.sql) из репозитория, скопируйте его целиком, вставьте и нажмите **Run**.
3. Должно появиться *Success. No rows returned*. Проверка: **Table Editor** → таблица `kv` с замком (RLS включён);
   **Storage** → бакет `images` с пометкой *Private*.

## 3. Вход через Google

### 3.1. Адрес для Google

В Supabase: **Authentication** → **Sign In / Providers** (или **Providers**) → **Google**.
Скопируйте оттуда **Callback URL** — вида `https://xxxx.supabase.co/auth/v1/callback`. Вкладку не закрывайте.

### 3.2. Приложение в Google Cloud

1. Откройте https://console.cloud.google.com и создайте проект `Klava` (меню выбора проекта вверху → **New project**).
2. **APIs & Services** → **OAuth consent screen** (в новой панели — **Google Auth Platform**):
   - App name: `Klava`, support email — ваш;
   - Audience / User type: **External**;
   - статус публикации оставьте **Testing** и в **Test users** добавьте свой Gmail.
     Так войти через Google сможете только вы — это нам и нужно.
3. **Credentials** (или **Clients**) → **Create credentials** → **OAuth client ID**:
   - Application type: **Web application**, name: `Klava`;
   - **Authorized JavaScript origins**: `https://olegjak.github.io` и `http://localhost:8765`;
   - **Authorized redirect URIs**: Callback URL из шага 3.1.
4. Нажмите **Create** — появятся **Client ID** и **Client secret**.

### 3.3. Включить Google в Supabase

Вернитесь на вкладку из шага 3.1: включите **Enable Sign in with Google**, вставьте Client ID и Client secret, **Save**.

### 3.4. Куда возвращаться после входа

**Authentication** → **URL Configuration**:

- **Site URL**: `https://olegjak.github.io/klava/`
- **Redirect URLs** → добавьте два адреса:
  - `https://olegjak.github.io/klava/**`
  - `http://localhost:8765/**` (для проверки на компьютере до публикации)

## 4. Адрес и ключ для сайта

**Project Settings** (шестерёнка) → **API** (или **Data API** / **API Keys**):

- **Project URL** — `https://xxxx.supabase.co`;
- **anon public** key (в новых проектах — **Publishable key**, начинается с `sb_publishable_`).

Пришлите оба значения в чат.

## 5. Закрыть регистрацию — после первого входа

Сейчас войти может только ваш Gmail (Google-приложение в режиме Testing). Чтобы никто не мог завести аккаунт
другим способом, регистрацию новых пользователей отключаем — но **только после того, как вы один раз войдёте**
на сайте (это будет в задаче #13), иначе не сможете создать свой аккаунт:

**Authentication** → **Sign In / Providers** → выключить **Allow new users to sign up** → **Save**.

## Если проект «заснул»

Бесплатный проект Supabase останавливается после 7 дней без активности. Сайт тогда покажет, что сервер недоступен.
Зайдите на https://supabase.com/dashboard, откройте проект и нажмите **Restore** / **Resume** — через пару минут всё работает.

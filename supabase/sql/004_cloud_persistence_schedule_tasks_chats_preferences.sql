-- AulaIA: persistencia en la nube para horarios, tareas, chats y preferencias.
-- Ejecutar en Supabase > SQL Editor DESPUÉS de los scripts 001, 002 y 003.

create extension if not exists pgcrypto;

-- =========================================================
-- 1. HORARIOS DE CLASES
-- =========================================================
create table if not exists public.class_schedules (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  subject_name text not null,
  teacher text,
  color text default '#2563EB',
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_schedule_valid_range check (end_time > start_time)
);

create index if not exists idx_class_schedules_user_day
  on public.class_schedules(user_id, day_of_week, start_time);
create index if not exists idx_class_schedules_subject
  on public.class_schedules(subject_id);

-- =========================================================
-- 2. TAREAS DETECTADAS POR IA
-- =========================================================
create table if not exists public.class_tasks (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  subject_name text not null,
  subject_color text,
  audio_note_id uuid not null references public.audios(id) on delete cascade,
  class_title text not null,
  title text not null,
  details text,
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  due_at timestamptz,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_class_tasks_user_pending
  on public.class_tasks(user_id, completed, due_at);
create index if not exists idx_class_tasks_audio
  on public.class_tasks(audio_note_id);
create unique index if not exists uq_class_task_audio_title
  on public.class_tasks(user_id, audio_note_id, lower(title));

-- =========================================================
-- 3. SESIONES DE CHAT DEL TUTOR IA
-- =========================================================
create table if not exists public.chat_sessions (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  audio_note_id uuid not null references public.audios(id) on delete cascade,
  class_title text,
  title text not null default 'Nueva conversación',
  content_type text not null default 'general',
  ai_provider text not null default 'gemini' check (ai_provider in ('gemini', 'openai')),
  web_search_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_chat_sessions_user_updated
  on public.chat_sessions(user_id, updated_at desc);
create index if not exists idx_chat_sessions_subject_audio
  on public.chat_sessions(subject_id, audio_note_id);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.chat_sessions(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sender text not null check (sender in ('user', 'bot')),
  content text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_session_position
  on public.chat_messages(session_id, position);

-- =========================================================
-- 4. PREFERENCIAS DEL USUARIO
-- =========================================================
create table if not exists public.user_preferences (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  theme_mode text not null default 'light' check (theme_mode in ('light', 'dark')),
  onboarding_seen boolean not null default false,
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 5. ROW LEVEL SECURITY
-- =========================================================
alter table public.class_schedules enable row level security;
alter table public.class_tasks enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.user_preferences enable row level security;

-- Horarios
DROP POLICY IF EXISTS class_schedules_select_own ON public.class_schedules;
DROP POLICY IF EXISTS class_schedules_insert_own ON public.class_schedules;
DROP POLICY IF EXISTS class_schedules_update_own ON public.class_schedules;
DROP POLICY IF EXISTS class_schedules_delete_own ON public.class_schedules;
create policy class_schedules_select_own on public.class_schedules
  for select to authenticated using (user_id = auth.uid());
create policy class_schedules_insert_own on public.class_schedules
  for insert to authenticated with check (user_id = auth.uid());
create policy class_schedules_update_own on public.class_schedules
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy class_schedules_delete_own on public.class_schedules
  for delete to authenticated using (user_id = auth.uid());

-- Tareas
DROP POLICY IF EXISTS class_tasks_select_own ON public.class_tasks;
DROP POLICY IF EXISTS class_tasks_insert_own ON public.class_tasks;
DROP POLICY IF EXISTS class_tasks_update_own ON public.class_tasks;
DROP POLICY IF EXISTS class_tasks_delete_own ON public.class_tasks;
create policy class_tasks_select_own on public.class_tasks
  for select to authenticated using (user_id = auth.uid());
create policy class_tasks_insert_own on public.class_tasks
  for insert to authenticated with check (user_id = auth.uid());
create policy class_tasks_update_own on public.class_tasks
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy class_tasks_delete_own on public.class_tasks
  for delete to authenticated using (user_id = auth.uid());

-- Chats
DROP POLICY IF EXISTS chat_sessions_select_own ON public.chat_sessions;
DROP POLICY IF EXISTS chat_sessions_insert_own ON public.chat_sessions;
DROP POLICY IF EXISTS chat_sessions_update_own ON public.chat_sessions;
DROP POLICY IF EXISTS chat_sessions_delete_own ON public.chat_sessions;
create policy chat_sessions_select_own on public.chat_sessions
  for select to authenticated using (user_id = auth.uid());
create policy chat_sessions_insert_own on public.chat_sessions
  for insert to authenticated with check (user_id = auth.uid());
create policy chat_sessions_update_own on public.chat_sessions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy chat_sessions_delete_own on public.chat_sessions
  for delete to authenticated using (user_id = auth.uid());

DROP POLICY IF EXISTS chat_messages_select_own ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_insert_own ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_update_own ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_delete_own ON public.chat_messages;
create policy chat_messages_select_own on public.chat_messages
  for select to authenticated using (user_id = auth.uid());
create policy chat_messages_insert_own on public.chat_messages
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.chat_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );
create policy chat_messages_update_own on public.chat_messages
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy chat_messages_delete_own on public.chat_messages
  for delete to authenticated using (user_id = auth.uid());

-- Preferencias
DROP POLICY IF EXISTS user_preferences_select_own ON public.user_preferences;
DROP POLICY IF EXISTS user_preferences_insert_own ON public.user_preferences;
DROP POLICY IF EXISTS user_preferences_update_own ON public.user_preferences;
DROP POLICY IF EXISTS user_preferences_delete_own ON public.user_preferences;
create policy user_preferences_select_own on public.user_preferences
  for select to authenticated using (user_id = auth.uid());
create policy user_preferences_insert_own on public.user_preferences
  for insert to authenticated with check (user_id = auth.uid());
create policy user_preferences_update_own on public.user_preferences
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy user_preferences_delete_own on public.user_preferences
  for delete to authenticated using (user_id = auth.uid());

-- Permisos API
revoke all on public.class_schedules from anon;
revoke all on public.class_tasks from anon;
revoke all on public.chat_sessions from anon;
revoke all on public.chat_messages from anon;
revoke all on public.user_preferences from anon;

grant select, insert, update, delete on public.class_schedules to authenticated;
grant select, insert, update, delete on public.class_tasks to authenticated;
grant select, insert, update, delete on public.chat_sessions to authenticated;
grant select, insert, update, delete on public.chat_messages to authenticated;
grant select, insert, update, delete on public.user_preferences to authenticated;

notify pgrst, 'reload schema';

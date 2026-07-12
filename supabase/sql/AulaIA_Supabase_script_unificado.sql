-- =============================================================
-- AulaIA / Tutor Inteligente
-- SCRIPT ÚNICO DE CONFIGURACIÓN DE SUPABASE
-- =============================================================
-- Integra:
--   1. Estructura base, perfiles, materias, audios, integrantes e invitaciones
--   2. Correcciones de integrantes, QR, enlaces y caché de PostgREST
--   3. Campo deberes en audios
--   4. Horarios, tareas IA, chats, mensajes y preferencias en la nube
--
-- Uso:
--   Supabase > SQL Editor > New query > pegar todo > Run
--
-- El script usa CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS
-- y políticas recreadas de forma controlada para poder ejecutarse sobre
-- una base existente.
-- =============================================================

-- Tutor Inteligente / AulaIA
-- Configuración Supabase SIN embeddings, con contexto directo, integrantes, QR/enlace e invitaciones.
-- Ejecutar en Supabase → SQL Editor → New query → Run.

create extension if not exists pgcrypto;

-- =========================================================
-- 1) Perfiles
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  university text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists university text;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, university)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'university'
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    university = coalesce(excluded.university, public.profiles.university);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

-- =========================================================
-- 2) Materias / aulas
-- =========================================================
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  teacher text,
  description text,
  color text default '#2563EB',
  icon text default '📚',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.subjects add column if not exists teacher text;
alter table public.subjects add column if not exists description text;
alter table public.subjects add column if not exists color text default '#2563EB';
alter table public.subjects add column if not exists icon text default '📚';

-- =========================================================
-- 3) Audios / apuntes procesados SIN embeddings
-- El chat usa summary + transcript como contexto directo.
-- =========================================================
create table if not exists public.audios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null,
  audio_url text,
  audio_path text,
  duration_seconds integer default 0,
  transcript text,
  transcription text,
  summary text,
  structured_summary jsonb,
  content_type text not null default 'general',
  status text default 'processed',
  auto_title text,
  manual_title text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.audios add column if not exists audio_url text;
alter table public.audios add column if not exists audio_path text;
alter table public.audios add column if not exists duration_seconds integer default 0;
alter table public.audios add column if not exists transcript text;
alter table public.audios add column if not exists transcription text;
alter table public.audios add column if not exists summary text;
alter table public.audios add column if not exists structured_summary jsonb;
alter table public.audios add column if not exists content_type text not null default 'general';
alter table public.audios add column if not exists status text default 'processed';
alter table public.audios add column if not exists auto_title text;
alter table public.audios add column if not exists manual_title text;

update public.audios
set transcript = transcription
where transcript is null and transcription is not null;

-- =========================================================
-- 4) Integrantes por aula
-- =========================================================
create table if not exists public.subject_members (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'student',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(subject_id, user_id),
  constraint valid_subject_member_role check (role in ('owner', 'admin', 'teacher', 'student'))
);

create table if not exists public.subject_invites (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  invited_email text not null default 'enlace-compartido',
  role text not null default 'student',
  status text not null default 'pending',
  created_by uuid not null references auth.users(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  invite_type text not null default 'email',
  max_uses integer not null default 1,
  uses_count integer not null default 0,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  accepted_at timestamp with time zone,
  constraint valid_subject_invite_role check (role in ('admin', 'teacher', 'student')),
  constraint valid_subject_invite_status check (status in ('pending', 'accepted', 'rejected', 'expired')),
  constraint valid_subject_invite_type check (invite_type in ('email', 'link', 'qr'))
);

alter table public.subject_invites add column if not exists token text unique default encode(gen_random_bytes(16), 'hex');
alter table public.subject_invites add column if not exists invite_type text not null default 'email';
alter table public.subject_invites add column if not exists max_uses integer not null default 1;
alter table public.subject_invites add column if not exists uses_count integer not null default 0;
alter table public.subject_invites add column if not exists expires_at timestamp with time zone;

-- Creador queda como owner automáticamente.
create or replace function public.handle_new_subject_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subject_members (subject_id, user_id, role)
  values (new.id, new.user_id, 'owner')
  on conflict (subject_id, user_id) do update set role = 'owner';
  return new;
end;
$$;

drop trigger if exists on_subject_created_owner on public.subjects;
create trigger on_subject_created_owner
after insert on public.subjects
for each row execute function public.handle_new_subject_owner();

insert into public.subject_members (subject_id, user_id, role)
select id, user_id, 'owner'
from public.subjects
on conflict (subject_id, user_id) do update set role = 'owner';

-- =========================================================
-- 5) Funciones auxiliares de roles y unión por token
-- =========================================================
create or replace function public.is_subject_member(p_subject_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subject_members sm
    where sm.subject_id = p_subject_id
      and sm.user_id = auth.uid()
  );
$$;

create or replace function public.has_subject_role(p_subject_id uuid, p_roles text[])
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subject_members sm
    where sm.subject_id = p_subject_id
      and sm.user_id = auth.uid()
      and sm.role = any(p_roles)
  );
$$;

drop function if exists public.join_subject_by_invite_token(text);

create or replace function public.join_subject_by_invite_token(p_token text)
returns table (
  r_subject_id uuid,
  r_joined_role text,
  r_message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_record public.subject_invites%rowtype;
  current_user_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Usuario no autenticado';
  end if;

  select *
  into invite_record
  from public.subject_invites
  where token = p_token
  limit 1;

  if invite_record.id is null then
    raise exception 'Invitación no encontrada';
  end if;

  if invite_record.status not in ('pending') then
    raise exception 'Invitación no disponible';
  end if;

  if invite_record.expires_at is not null and invite_record.expires_at < now() then
    update public.subject_invites set status = 'expired' where id = invite_record.id;
    raise exception 'La invitación expiró';
  end if;

  if invite_record.uses_count >= invite_record.max_uses then
    raise exception 'La invitación ya alcanzó el límite de usos';
  end if;

  insert into public.subject_members (subject_id, user_id, role)
  values (invite_record.subject_id, current_user_id, invite_record.role)
  on conflict (subject_id, user_id) do update set role = excluded.role;

  update public.subject_invites
  set uses_count = uses_count + 1,
      status = case when uses_count + 1 >= max_uses then 'accepted' else status end,
      accepted_at = now()
  where id = invite_record.id;

  return query
  select invite_record.subject_id, invite_record.role, 'Te uniste correctamente al aula'::text;
end;
$$;

-- =========================================================
-- 6) Archivos de chat
-- =========================================================
create table if not exists public.session_files (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  audio_id uuid references public.audios(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_type text not null default 'other',
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  extracted_text text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  constraint valid_session_file_type check (file_type in ('image', 'pdf', 'document', 'audio', 'other'))
);

insert into storage.buckets (id, name, public)
values ('chat-uploads', 'chat-uploads', false)
on conflict (id) do nothing;

-- =========================================================
-- 7) RLS robusto sin recursión
-- =========================================================
alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.audios enable row level security;
alter table public.subject_members enable row level security;
alter table public.subject_invites enable row level security;
alter table public.session_files enable row level security;

-- Limpiar políticas anteriores de estas tablas para evitar conflictos o recursión.
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'subjects', 'audios', 'subject_members', 'subject_invites', 'session_files')
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;

create policy profiles_select_authenticated on public.profiles
for select to authenticated using (true);

create policy profiles_insert_own on public.profiles
for insert to authenticated with check (auth.uid() = id);

create policy profiles_update_own on public.profiles
for update to authenticated using (auth.uid() = id);

create policy subjects_select_member on public.subjects
for select to authenticated using (
  auth.uid() = user_id or public.is_subject_member(id)
);

create policy subjects_insert_own on public.subjects
for insert to authenticated with check (auth.uid() = user_id);

create policy subjects_update_owner_admin on public.subjects
for update to authenticated using (
  auth.uid() = user_id or public.has_subject_role(id, array['owner', 'admin'])
);

create policy subjects_delete_owner on public.subjects
for delete to authenticated using (
  auth.uid() = user_id or public.has_subject_role(id, array['owner'])
);

create policy audios_select_member on public.audios
for select to authenticated using (public.is_subject_member(subject_id));

create policy audios_insert_member on public.audios
for insert to authenticated with check (
  auth.uid() = user_id and public.is_subject_member(subject_id)
);

create policy audios_update_organizer on public.audios
for update to authenticated using (
  auth.uid() = user_id or public.has_subject_role(subject_id, array['owner', 'admin', 'teacher'])
);

create policy audios_delete_organizer on public.audios
for delete to authenticated using (
  auth.uid() = user_id or public.has_subject_role(subject_id, array['owner', 'admin'])
);

create policy members_select_same_subject on public.subject_members
for select to authenticated using (public.is_subject_member(subject_id));

create policy members_insert_owner_admin on public.subject_members
for insert to authenticated with check (public.has_subject_role(subject_id, array['owner', 'admin']));

create policy members_update_owner_admin on public.subject_members
for update to authenticated using (public.has_subject_role(subject_id, array['owner', 'admin']));

create policy members_delete_owner_admin on public.subject_members
for delete to authenticated using (public.has_subject_role(subject_id, array['owner', 'admin']));

create policy invites_select_organizer on public.subject_invites
for select to authenticated using (public.is_subject_member(subject_id));

create policy invites_insert_organizer on public.subject_invites
for insert to authenticated with check (
  created_by = auth.uid() and public.has_subject_role(subject_id, array['owner', 'admin', 'teacher'])
);

create policy invites_update_organizer on public.subject_invites
for update to authenticated using (public.has_subject_role(subject_id, array['owner', 'admin', 'teacher']));

create policy invites_delete_organizer on public.subject_invites
for delete to authenticated using (public.has_subject_role(subject_id, array['owner', 'admin']));

create policy session_files_select_member on public.session_files
for select to authenticated using (public.is_subject_member(subject_id));

create policy session_files_insert_member on public.session_files
for insert to authenticated with check (
  uploaded_by = auth.uid() and public.is_subject_member(subject_id)
);

-- Storage policies para bucket chat-uploads.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='chat_uploads_insert_authenticated') then
    create policy "chat_uploads_insert_authenticated" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'chat-uploads');
  end if;

  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='chat_uploads_select_authenticated') then
    create policy "chat_uploads_select_authenticated" on storage.objects
    for select to authenticated
    using (bucket_id = 'chat-uploads');
  end if;
end $$;

notify pgrst, 'reload schema';


alter table public.audios add column if not exists deberes text;

-- =============================================================
-- PARTE 2: CORRECCIONES DE INTEGRANTES, INVITACIONES Y QR
-- =============================================================

-- Tutor Inteligente - corrección de integrantes, invitaciones QR/enlace y caché de Supabase/PostgREST.
-- Ejecutar en Supabase > SQL Editor > New query > Run.

create extension if not exists pgcrypto;

-- Asegura columnas nuevas usadas por la app para invitaciones por correo, QR y enlace.
alter table public.subject_invites add column if not exists token text;
alter table public.subject_invites add column if not exists invite_type text not null default 'email';
alter table public.subject_invites add column if not exists max_uses integer not null default 1;
alter table public.subject_invites add column if not exists uses_count integer not null default 0;
alter table public.subject_invites add column if not exists expires_at timestamp with time zone;
alter table public.subject_invites add column if not exists accepted_at timestamp with time zone;

update public.subject_invites
set token = encode(gen_random_bytes(16), 'hex')
where token is null;

alter table public.subject_invites alter column token set default encode(gen_random_bytes(16), 'hex');

-- Índice único seguro para tokens no nulos.
create unique index if not exists subject_invites_token_key on public.subject_invites(token);

-- Crea la relación que PostgREST necesita para poder hacer select profiles:user_id(...).
-- El código actualizado también trae perfiles con fallback, pero esta relación evita el error de schema cache.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subject_members_user_id_profiles_fkey'
  ) then
    alter table public.subject_members
      add constraint subject_members_user_id_profiles_fkey
      foreign key (user_id)
      references public.profiles(id)
      on delete cascade;
  end if;
exception
  when foreign_key_violation then
    raise notice 'No se pudo crear la FK subject_members -> profiles porque hay usuarios sin perfil. Abre la app con esos usuarios o crea sus perfiles primero.';
end $$;

-- Función para unirse por token. Reemplaza versiones antiguas si existían.
drop function if exists public.join_subject_by_invite_token(text);

create or replace function public.join_subject_by_invite_token(p_token text)
returns table (
  r_subject_id uuid,
  r_joined_role text,
  r_message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_record public.subject_invites%rowtype;
  current_user_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Usuario no autenticado';
  end if;

  select *
  into invite_record
  from public.subject_invites
  where token = p_token
  limit 1;

  if invite_record.id is null then
    raise exception 'Invitación no encontrada';
  end if;

  if invite_record.status not in ('pending') then
    raise exception 'Invitación no disponible';
  end if;

  if invite_record.expires_at is not null and invite_record.expires_at < now() then
    update public.subject_invites set status = 'expired' where id = invite_record.id;
    raise exception 'La invitación expiró';
  end if;

  if coalesce(invite_record.uses_count, 0) >= coalesce(invite_record.max_uses, 1) then
    raise exception 'La invitación ya alcanzó el límite de usos';
  end if;

  insert into public.subject_members (subject_id, user_id, role)
  values (invite_record.subject_id, current_user_id, invite_record.role)
  on conflict (subject_id, user_id) do update set role = excluded.role;

  update public.subject_invites
  set uses_count = coalesce(uses_count, 0) + 1,
      status = case when coalesce(uses_count, 0) + 1 >= coalesce(max_uses, 1) then 'accepted' else status end,
      accepted_at = now()
  where id = invite_record.id;

  return query
  select invite_record.subject_id, invite_record.role, 'Te uniste correctamente al aula'::text;
end;
$$;

-- Asegura columnas usadas para apuntes/clases.
alter table public.audios add column if not exists transcript text;
alter table public.audios add column if not exists transcription text;
alter table public.audios add column if not exists summary text;
alter table public.audios add column if not exists content_type text not null default 'general';
alter table public.audios add column if not exists status text default 'processed';

update public.audios
set transcript = transcription
where transcript is null and transcription is not null;

-- Permisos: creador de audio, owner, admin o teacher pueden editar; owner/admin o creador pueden eliminar.
drop policy if exists audios_update_organizer on public.audios;
create policy audios_update_organizer on public.audios
for update to authenticated using (
  auth.uid() = user_id or public.has_subject_role(subject_id, array['owner', 'admin', 'teacher'])
);

drop policy if exists audios_delete_organizer on public.audios;
create policy audios_delete_organizer on public.audios
for delete to authenticated using (
  auth.uid() = user_id or public.has_subject_role(subject_id, array['owner', 'admin'])
);

-- Recargar caché de PostgREST para que deje de salir: "Could not find ... in the schema cache".
notify pgrst, 'reload schema';

-- =============================================================
-- PARTE 3: PERSISTENCIA EN LA NUBE
-- Horarios, tareas, chats, mensajes y preferencias
-- =============================================================

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

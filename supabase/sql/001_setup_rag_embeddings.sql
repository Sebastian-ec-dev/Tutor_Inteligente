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

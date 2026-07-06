-- Tutor Inteligente / AulaIA - Configuración Supabase + RAG con pgvector
-- Ejecutar en Supabase → SQL Editor → New query → Run.
-- Base usada por Supabase: PostgreSQL. No se crea otra base; se crean tablas públicas.

create extension if not exists vector;
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- 1) Perfil público relacionado con auth.users.
-- auth.users se crea automáticamente por Supabase Auth.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  university text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

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

-- 2) Materias. Este formulario viene del prototipo de Figma Maker:
-- nombre, docente, descripción y color.
create table if not exists public.subjects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
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

-- 3) Audios / apuntes procesados.
create table if not exists public.audios (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  title text not null,
  audio_url text,
  transcript text,
  summary text,
  content_type text not null default 'general',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.audios add column if not exists audio_url text;
alter table public.audios add column if not exists transcript text;
alter table public.audios add column if not exists summary text;
alter table public.audios add column if not exists content_type text not null default 'general';

-- 4) Embeddings para RAG.
create table if not exists public.audio_embeddings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  audio_id uuid not null references public.audios (id) on delete cascade,
  content text not null,
  embedding vector(768),
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

create index if not exists audio_embeddings_embedding_idx
on public.audio_embeddings
using hnsw (embedding vector_cosine_ops);

-- 5) Función RAG usada por SupabaseAudioNoteRepository.searchSimilar().
-- OJO: este es el FROM correcto solicitado.
-- Los vectores están en audio_embeddings, pero se hace JOIN con audios para filtrar por materia.
create or replace function public.match_audio_embeddings (
  query_embedding vector,
  match_threshold float,
  match_count int,
  p_user_id uuid,
  p_subject_id uuid
)
returns table (
  id uuid,
  audio_id uuid,
  content text,
  similarity float
)
language sql stable
as $$
  select
    e.id,
    e.audio_id,
    e.content,
    1 - (e.embedding <=> query_embedding) as similarity
  from public.audio_embeddings e
  join public.audios a on e.audio_id = a.id
  where e.user_id = p_user_id
    and a.subject_id = p_subject_id
    and 1 - (e.embedding <=> query_embedding) > match_threshold
  order by similarity desc, a.created_at desc
  limit match_count;
$$;

-- 6) Seguridad RLS. Cada usuario solo accede a sus propios datos.
alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.audios enable row level security;
alter table public.audio_embeddings enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_select_own') then
    create policy "profiles_select_own" on public.profiles
    for select using (auth.uid() = id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_insert_own') then
    create policy "profiles_insert_own" on public.profiles
    for insert with check (auth.uid() = id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_update_own') then
    create policy "profiles_update_own" on public.profiles
    for update using (auth.uid() = id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'subjects' and policyname = 'subjects_select_own') then
    create policy "subjects_select_own" on public.subjects
    for select using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'subjects' and policyname = 'subjects_insert_own') then
    create policy "subjects_insert_own" on public.subjects
    for insert with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'subjects' and policyname = 'subjects_update_own') then
    create policy "subjects_update_own" on public.subjects
    for update using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'subjects' and policyname = 'subjects_delete_own') then
    create policy "subjects_delete_own" on public.subjects
    for delete using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'audios' and policyname = 'audios_select_own') then
    create policy "audios_select_own" on public.audios
    for select using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'audios' and policyname = 'audios_insert_own') then
    create policy "audios_insert_own" on public.audios
    for insert with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'audios' and policyname = 'audios_update_own') then
    create policy "audios_update_own" on public.audios
    for update using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'audios' and policyname = 'audios_delete_own') then
    create policy "audios_delete_own" on public.audios
    for delete using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'audio_embeddings' and policyname = 'audio_embeddings_select_own') then
    create policy "audio_embeddings_select_own" on public.audio_embeddings
    for select using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'audio_embeddings' and policyname = 'audio_embeddings_insert_own') then
    create policy "audio_embeddings_insert_own" on public.audio_embeddings
    for insert with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'audio_embeddings' and policyname = 'audio_embeddings_delete_own') then
    create policy "audio_embeddings_delete_own" on public.audio_embeddings
    for delete using (auth.uid() = user_id);
  end if;
end $$;

-- =========================================================
-- 7) Colaboración por aula: integrantes, amigos e invitaciones
-- =========================================================

alter table public.audios add column if not exists duration_seconds integer default 0;
alter table public.audios add column if not exists audio_path text;
alter table public.audios add column if not exists status text default 'processed';
alter table public.audios add column if not exists structured_summary jsonb;
alter table public.audios add column if not exists auto_title text;
alter table public.audios add column if not exists manual_title text;

create table if not exists public.subject_members (
  id uuid default gen_random_uuid() primary key,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'student',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(subject_id, user_id),
  constraint valid_subject_member_role check (role in ('owner', 'admin', 'teacher', 'student'))
);

create table if not exists public.subject_invites (
  id uuid default gen_random_uuid() primary key,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  invited_email text not null,
  role text not null default 'student',
  status text not null default 'pending',
  created_by uuid not null references auth.users(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  accepted_at timestamp with time zone,
  constraint valid_subject_invite_role check (role in ('admin', 'teacher', 'student')),
  constraint valid_subject_invite_status check (status in ('pending', 'accepted', 'rejected', 'expired'))
);

-- Cuando se crea una materia, el creador queda registrado como owner del aula.
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

-- Asegura membresía owner para materias ya existentes.
insert into public.subject_members (subject_id, user_id, role)
select id, user_id, 'owner'
from public.subjects
on conflict (subject_id, user_id) do update set role = 'owner';

alter table public.subject_members enable row level security;
alter table public.subject_invites enable row level security;

-- Permite leer materias propias o compartidas por membresía.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='subjects' and policyname='subjects_select_as_member') then
    create policy "subjects_select_as_member" on public.subjects
    for select using (
      auth.uid() = user_id
      or exists (
        select 1 from public.subject_members sm
        where sm.subject_id = subjects.id
        and sm.user_id = auth.uid()
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='subject_members' and policyname='members_select_same_subject') then
    create policy "members_select_same_subject" on public.subject_members
    for select using (
      exists (
        select 1 from public.subject_members sm
        where sm.subject_id = subject_members.subject_id
        and sm.user_id = auth.uid()
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='subject_members' and policyname='members_update_by_owner_admin') then
    create policy "members_update_by_owner_admin" on public.subject_members
    for update using (
      exists (
        select 1 from public.subject_members sm
        where sm.subject_id = subject_members.subject_id
        and sm.user_id = auth.uid()
        and sm.role in ('owner', 'admin')
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='subject_invites' and policyname='invites_select_by_member') then
    create policy "invites_select_by_member" on public.subject_invites
    for select using (
      exists (
        select 1 from public.subject_members sm
        where sm.subject_id = subject_invites.subject_id
        and sm.user_id = auth.uid()
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='subject_invites' and policyname='invites_insert_by_organizer') then
    create policy "invites_insert_by_organizer" on public.subject_invites
    for insert with check (
      created_by = auth.uid()
      and exists (
        select 1 from public.subject_members sm
        where sm.subject_id = subject_invites.subject_id
        and sm.user_id = auth.uid()
        and sm.role in ('owner', 'admin', 'teacher')
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='subject_invites' and policyname='invites_update_by_organizer') then
    create policy "invites_update_by_organizer" on public.subject_invites
    for update using (
      exists (
        select 1 from public.subject_members sm
        where sm.subject_id = subject_invites.subject_id
        and sm.user_id = auth.uid()
        and sm.role in ('owner', 'admin', 'teacher')
      )
    );
  end if;
end $$;

notify pgrst, 'reload schema';

-- Permite ver nombre/correo de integrantes que comparten aula.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_select_shared_classroom') then
    create policy "profiles_select_shared_classroom" on public.profiles
    for select using (
      id = auth.uid()
      or exists (
        select 1
        from public.subject_members my_member
        join public.subject_members other_member on other_member.subject_id = my_member.subject_id
        where my_member.user_id = auth.uid()
        and other_member.user_id = profiles.id
      )
    );
  end if;
end $$;

notify pgrst, 'reload schema';

-- =========================================================
-- 8) Archivos del chat: imágenes, PDFs, documentos y audios
-- =========================================================

create table if not exists public.session_files (
  id uuid default gen_random_uuid() primary key,
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

alter table public.session_files enable row level security;

-- Bucket usado por el chat. También puedes crearlo desde Supabase → Storage.
insert into storage.buckets (id, name, public)
values ('chat-uploads', 'chat-uploads', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='session_files' and policyname='session_files_select_by_member') then
    create policy "session_files_select_by_member" on public.session_files
    for select using (
      exists (
        select 1 from public.subject_members sm
        where sm.subject_id = session_files.subject_id
        and sm.user_id = auth.uid()
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='session_files' and policyname='session_files_insert_by_member') then
    create policy "session_files_insert_by_member" on public.session_files
    for insert with check (
      uploaded_by = auth.uid()
      and exists (
        select 1 from public.subject_members sm
        where sm.subject_id = session_files.subject_id
        and sm.user_id = auth.uid()
      )
    );
  end if;

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

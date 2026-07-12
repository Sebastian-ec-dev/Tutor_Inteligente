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

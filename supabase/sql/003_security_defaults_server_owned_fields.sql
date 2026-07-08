-- AulaIA - seguridad para campos de autorización controlados por Supabase/RLS.
-- Ejecutar en Supabase SQL Editor.
-- Objetivo: que el cliente no tenga que enviar user_id, created_by o uploaded_by en inserts.

alter table public.profiles
  alter column id set default auth.uid();

alter table public.subjects
  alter column user_id set default auth.uid();

alter table public.audios
  alter column user_id set default auth.uid();

alter table public.subject_invites
  alter column created_by set default auth.uid();

alter table public.session_files
  alter column uploaded_by set default auth.uid();

-- Mantiene las validaciones RLS con auth.uid().
drop policy if exists subjects_insert_own on public.subjects;
create policy subjects_insert_own on public.subjects
for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists audios_insert_member on public.audios;
create policy audios_insert_member on public.audios
for insert to authenticated with check (
  auth.uid() = user_id and public.is_subject_member(subject_id)
);

drop policy if exists invites_insert_organizer on public.subject_invites;
create policy invites_insert_organizer on public.subject_invites
for insert to authenticated with check (
  created_by = auth.uid() and public.has_subject_role(subject_id, array['owner', 'admin', 'teacher'])
);

drop policy if exists session_files_insert_member on public.session_files;
create policy session_files_insert_member on public.session_files
for insert to authenticated with check (
  uploaded_by = auth.uid() and public.is_subject_member(subject_id)
);

notify pgrst, 'reload schema';

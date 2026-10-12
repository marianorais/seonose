-- ============================================================================
--  04 · Administración con login
--
--  Hasta ahora /preguntas y /configuraciones escribían con la anon key: cualquiera
--  podía editar preguntas, respuestas y la configuración del juego. Desde acá
--  sólo un usuario de Supabase Auth registrado en `administradores` puede.
--
--  APLICAR DESPUÉS de:
--   1. Publicar el frontend nuevo (trae la pantalla de login de administración).
--   2. Activar el proveedor Email en Authentication > Providers y crear el
--      usuario administrador en Authentication > Users.
--   3. Registrar ese usuario (reemplazar el email):
--        insert into public.administradores (user_id)
--        select id from auth.users where email = 'tu-email@ejemplo.com';
--      (se puede correr después de esta migración: la tabla se crea acá)
--
--  También cierra la lectura pública de `mejoras`, que exponía nombre y
--  teléfono de quien dejó una sugerencia.
-- ============================================================================

begin;

create table if not exists public.administradores (
  user_id uuid primary key,
  creado_en timestamptz not null default now()
);

alter table public.administradores enable row level security;
revoke all on public.administradores from public, anon, authenticated;

create or replace function public.es_admin() returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
     and exists (select 1 from public.administradores where user_id = auth.uid())
$$;

revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- questions: escritura sólo administradores. La lectura pública sigue hasta la
-- migración 05 (la necesita el frontend viejo mientras quede alguno abierto).
-- ---------------------------------------------------------------------------
drop policy if exists "Allow insert questions" on public.questions;
drop policy if exists "Allow public insert" on public.questions;
drop policy if exists "Allow update questions" on public.questions;

drop policy if exists questions_select_admin on public.questions;
create policy questions_select_admin on public.questions
  for select to authenticated using (public.es_admin());

drop policy if exists questions_insert_admin on public.questions;
create policy questions_insert_admin on public.questions
  for insert to authenticated with check (public.es_admin());

drop policy if exists questions_update_admin on public.questions;
create policy questions_update_admin on public.questions
  for update to authenticated using (public.es_admin()) with check (public.es_admin());

revoke insert, update, delete on public.questions from anon;
grant select, insert, update on public.questions to authenticated;

-- ---------------------------------------------------------------------------
-- game_settings: lectura pública (colores y fuente), edición sólo admin.
-- ---------------------------------------------------------------------------
drop policy if exists "Allow update game settings" on public.game_settings;

drop policy if exists game_settings_update_admin on public.game_settings;
create policy game_settings_update_admin on public.game_settings
  for update to authenticated using (public.es_admin()) with check (public.es_admin());

revoke insert, update, delete on public.game_settings from anon;
grant select, update on public.game_settings to authenticated;

-- ---------------------------------------------------------------------------
-- categories: edición sólo admin (lectura pública desde la migración 01).
-- ---------------------------------------------------------------------------
drop policy if exists categories_insert_admin on public.categories;
create policy categories_insert_admin on public.categories
  for insert to authenticated with check (public.es_admin());

drop policy if exists categories_update_admin on public.categories;
create policy categories_update_admin on public.categories
  for update to authenticated using (public.es_admin()) with check (public.es_admin());

grant select, insert, update on public.categories to authenticated;

-- ---------------------------------------------------------------------------
-- daily_quiz: lectura sólo admin (revela qué preguntas tocan cada día).
-- ---------------------------------------------------------------------------
drop policy if exists daily_quiz_select on public.daily_quiz;

drop policy if exists daily_quiz_select_admin on public.daily_quiz;
create policy daily_quiz_select_admin on public.daily_quiz
  for select to authenticated using (public.es_admin());

revoke select on public.daily_quiz from anon;

-- ---------------------------------------------------------------------------
-- mejoras: cualquiera puede enviar una sugerencia; sólo admin puede leerlas.
-- ---------------------------------------------------------------------------
drop policy if exists mejoras_select on public.mejoras;

drop policy if exists mejoras_select_admin on public.mejoras;
create policy mejoras_select_admin on public.mejoras
  for select to authenticated using (public.es_admin());

revoke select on public.mejoras from anon;

commit;

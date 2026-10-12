-- ============================================================================
--  01 · Seguridad inmediata
--
--  Cierra los agujeros que permiten a cualquiera con la anon key (que es
--  pública: viaja en el JavaScript) borrar o modificar datos. Es compatible con
--  el frontend publicado HOY: no le quita nada de lo que usa.
--
--  Antes:
--   - game_sessions, game_answers y questions tenían RLS desactivado y `anon`
--     tenía DELETE/UPDATE/TRUNCATE: se podía borrar el historial completo o
--     cambiar puntajes con una sola llamada.
--   - daily_quiz permitía insert/update/delete públicos.
--   - player_aliases tenía una policy de insert que no exigía `grupo = playerid`
--     y que, combinada con la otra (se suman con OR), dejaba meterse en el grupo
--     de otra persona.
--   - categories tenía RLS sin ninguna policy: la app no podía leerla.
--
--  Qué queda pendiente a propósito (porque rompería el panel de preguntas
--  actual): el UPDATE/INSERT público sobre `questions` y `game_settings`. Lo
--  cierra la migración 04, después de publicar el login de administración.
--
--  Idempotente: se puede correr más de una vez.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Nadie fuera del dueño necesita TRUNCATE, TRIGGER ni REFERENCES. TRUNCATE en
-- particular ignora RLS.
-- ---------------------------------------------------------------------------
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;

-- ---------------------------------------------------------------------------
-- game_sessions: sólo leer e insertar (lo único que hace el frontend actual).
-- La reparación de identidad pasa por `reclamar_partida`, que es SECURITY
-- DEFINER y no necesita UPDATE directo.
-- ---------------------------------------------------------------------------
alter table public.game_sessions enable row level security;
revoke update, delete on public.game_sessions from anon, authenticated;

drop policy if exists game_sessions_select_publico on public.game_sessions;
create policy game_sessions_select_publico on public.game_sessions
  for select to anon, authenticated using (true);

drop policy if exists game_sessions_insert_publico on public.game_sessions;
create policy game_sessions_insert_publico on public.game_sessions
  for insert to anon, authenticated
  with check (totalquestions between 1 and 30 and correctanswers between 0 and totalquestions);

-- ---------------------------------------------------------------------------
-- game_answers: ídem.
-- ---------------------------------------------------------------------------
alter table public.game_answers enable row level security;
revoke update, delete on public.game_answers from anon, authenticated;

drop policy if exists game_answers_select_publico on public.game_answers;
create policy game_answers_select_publico on public.game_answers
  for select to anon, authenticated using (true);

drop policy if exists game_answers_insert_publico on public.game_answers;
create policy game_answers_insert_publico on public.game_answers
  for insert to anon, authenticated with check (true);

-- ---------------------------------------------------------------------------
-- questions: se activa RLS conservando las policies que ya existen (lectura,
-- alta y edición públicas, que el panel actual necesita). Lo que se gana ya:
-- sin policy de DELETE, nadie puede borrar preguntas.
-- ---------------------------------------------------------------------------
alter table public.questions enable row level security;
revoke delete on public.questions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- daily_quiz: el frontend no la usa. Las escrituras quedan sólo para las
-- funciones del servidor (migración 02).
-- ---------------------------------------------------------------------------
drop policy if exists daily_quiz_insert on public.daily_quiz;
drop policy if exists daily_quiz_update on public.daily_quiz;
drop policy if exists daily_quiz_delete on public.daily_quiz;
revoke insert, update, delete on public.daily_quiz from anon, authenticated;

-- ---------------------------------------------------------------------------
-- categories: tenía RLS pero ninguna policy, así que la app no podía leerla
-- (fallaba en silencio y mostraba los íconos por defecto). Lectura pública,
-- escritura cerrada.
-- ---------------------------------------------------------------------------
drop policy if exists categories_select_publico on public.categories;
create policy categories_select_publico on public.categories
  for select to anon, authenticated using (true);
revoke insert, update, delete on public.categories from anon, authenticated;

-- ---------------------------------------------------------------------------
-- player_aliases: queda sólo la policy de insert que exige grupo propio. El
-- frontend siempre inserta con `grupo = playerid`, así que no cambia nada.
-- ---------------------------------------------------------------------------
drop policy if exists player_aliases_insert on public.player_aliases;
revoke update, delete on public.player_aliases from anon, authenticated;

-- ---------------------------------------------------------------------------
-- El backup de la unificación tiene playerid + IP: nadie de afuera lo necesita.
-- ---------------------------------------------------------------------------
revoke all on public.game_sessions_backup_unificacion from anon, authenticated;

-- ---------------------------------------------------------------------------
-- mejoras y game_settings: se cierran borrados y altas que nadie usa. El
-- UPDATE de game_settings sigue abierto hasta la migración 04.
-- ---------------------------------------------------------------------------
revoke update, delete on public.mejoras from anon, authenticated;
revoke insert, delete on public.game_settings from anon, authenticated;

commit;

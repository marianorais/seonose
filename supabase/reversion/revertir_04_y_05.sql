-- ============================================================================
--  REVERTIR las migraciones 04 y 05
--
--  Deja los permisos como quedaron después de la 01, que es lo que necesita el
--  sitio publicado hoy:
--   - el juego vuelve a leer preguntas y a guardar partidas;
--   - el ranking vuelve a leer partidas y alias;
--   - el panel de preguntas y la configuración vuelven a poder guardar;
--   - /mejoras vuelve a listar las sugerencias.
--
--  NO borra datos. Funciona tanto si las migraciones 02 y 03 están aplicadas
--  como si no. Se puede correr más de una vez.
--
--  Lo que queda sin revertir, a propósito (no molesta a nadie): la tabla
--  `administradores` y la función `es_admin()`. Cuando se publique el código
--  nuevo se vuelven a correr la 04 y la 05 tal cual.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Revertir 05
-- ---------------------------------------------------------------------------

-- Partidas y respuestas: leer e insertar (igual que después de la 01).
grant select, insert on public.game_sessions to anon, authenticated;

drop policy if exists game_sessions_select_publico on public.game_sessions;
create policy game_sessions_select_publico on public.game_sessions
  for select to anon, authenticated using (true);

drop policy if exists game_sessions_insert_publico on public.game_sessions;
create policy game_sessions_insert_publico on public.game_sessions
  for insert to anon, authenticated
  with check (totalquestions between 1 and 30 and correctanswers between 0 and totalquestions);

grant select, insert on public.game_answers to anon, authenticated;

drop policy if exists game_answers_select_publico on public.game_answers;
create policy game_answers_select_publico on public.game_answers
  for select to anon, authenticated using (true);

drop policy if exists game_answers_insert_publico on public.game_answers;
create policy game_answers_insert_publico on public.game_answers
  for insert to anon, authenticated with check (true);

-- Preguntas: lectura pública.
grant select on public.questions to anon, authenticated;

drop policy if exists "Allow public read" on public.questions;
create policy "Allow public read" on public.questions for select to public using (true);

drop policy if exists "Allow select questions" on public.questions;
create policy "Allow select questions" on public.questions for select to public using (true);

-- Alias: lectura pública.
grant select on public.player_aliases to anon, authenticated;

drop policy if exists player_aliases_select on public.player_aliases;
create policy player_aliases_select on public.player_aliases for select to anon, authenticated using (true);

drop policy if exists player_aliases_select_publico on public.player_aliases;
create policy player_aliases_select_publico on public.player_aliases for select to anon, authenticated using (true);

-- Reparación de partidas sin dueño (la usa el sitio publicado).
grant execute on function public.reclamar_partida(bigint, text) to public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Revertir 04
-- ---------------------------------------------------------------------------

-- Preguntas: alta y edición públicas (las usa el panel publicado, sin login).
drop policy if exists questions_select_admin on public.questions;
drop policy if exists questions_insert_admin on public.questions;
drop policy if exists questions_update_admin on public.questions;

grant insert, update on public.questions to anon, authenticated;

drop policy if exists "Allow insert questions" on public.questions;
create policy "Allow insert questions" on public.questions for insert to public with check (true);

drop policy if exists "Allow public insert" on public.questions;
create policy "Allow public insert" on public.questions for insert to public with check (true);

drop policy if exists "Allow update questions" on public.questions;
create policy "Allow update questions" on public.questions for update to public using (true);

-- Configuración del juego: edición pública (la usa /configuraciones publicado).
drop policy if exists game_settings_update_admin on public.game_settings;

grant update on public.game_settings to anon, authenticated;

drop policy if exists "Allow update game settings" on public.game_settings;
create policy "Allow update game settings" on public.game_settings for update to public using (true);

-- Categorías: sólo lectura, como después de la 01.
drop policy if exists categories_insert_admin on public.categories;
drop policy if exists categories_update_admin on public.categories;
revoke insert, update on public.categories from authenticated;

-- daily_quiz: lectura pública, como después de la 01.
drop policy if exists daily_quiz_select_admin on public.daily_quiz;

grant select on public.daily_quiz to anon, authenticated;

drop policy if exists daily_quiz_select on public.daily_quiz;
create policy daily_quiz_select on public.daily_quiz for select to public using (true);

-- Sugerencias: lectura pública, como antes (la usa /mejoras publicado).
-- OJO: esto vuelve a dejar visibles nombre y teléfono de quien dejó una
-- sugerencia. Si no usás /mejoras, podés borrar estas 4 líneas antes de correr.
drop policy if exists mejoras_select_admin on public.mejoras;
grant select on public.mejoras to anon, authenticated;
drop policy if exists mejoras_select on public.mejoras;
create policy mejoras_select on public.mejoras for select to public using (true);

commit;

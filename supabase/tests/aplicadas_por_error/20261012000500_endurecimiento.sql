-- ============================================================================
--  05 · Endurecimiento final
--
--  APLICAR cuando el frontend nuevo lleve publicado al menos un día (para que
--  no queden pestañas viejas abiertas guardando partidas por el camino viejo).
--
--  Desde acá el navegador ya no puede leer ni escribir partidas, respuestas,
--  preguntas ni alias directamente: todo pasa por las RPC de las migraciones
--  02 y 03. Con esto:
--   - Ya no se puede insertar una partida con un puntaje inventado.
--   - Ya no se pueden descargar las preguntas (ni las respuestas) de días
--     futuros.
--   - Ya no son públicos los playerid ni las IP: nadie puede hacerse pasar por
--     otro jugador ni ver desde dónde se conecta.
--
--  El alta de alias sigue siendo un insert directo (policy de la migración 01:
--  sólo se puede crear el grupo propio).
-- ============================================================================

begin;

-- game_sessions / game_answers: sin acceso directo.
drop policy if exists game_sessions_select_publico on public.game_sessions;
drop policy if exists game_sessions_insert_publico on public.game_sessions;
revoke all on public.game_sessions from anon, authenticated;

drop policy if exists game_answers_select_publico on public.game_answers;
drop policy if exists game_answers_insert_publico on public.game_answers;
revoke all on public.game_answers from anon, authenticated;

-- questions: lectura sólo admin. El juego las recibe por obtener_desafio().
drop policy if exists "Allow public read" on public.questions;
drop policy if exists "Allow select questions" on public.questions;
revoke select on public.questions from anon;

-- player_aliases: alta propia sí, lectura no (exponía playerid e IP).
drop policy if exists player_aliases_select on public.player_aliases;
drop policy if exists player_aliases_select_publico on public.player_aliases;
revoke select on public.player_aliases from anon, authenticated;

-- El frontend nuevo ya no repara partidas sin dueño: registrar_partida siempre
-- guarda la identidad. Se deja la función, pero no invocable desde la API.
revoke execute on function public.reclamar_partida(bigint, text) from public, anon, authenticated;

commit;

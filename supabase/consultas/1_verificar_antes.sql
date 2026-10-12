-- ============================================================================
--  Verificar ANTES de correr los scripts nuevos. Sólo lectura.
-- ============================================================================

-- 1) El sitio publicado tiene los permisos que necesita (la reversión de 04 y
--    05 está aplicada). ESPERADO: las 4 columnas en true.
--    Si alguna da false: correr supabase/reversion/revertir_04_y_05.sql.
select has_table_privilege('anon', 'public.questions', 'SELECT')      as lee_preguntas,
       has_table_privilege('anon', 'public.game_sessions', 'INSERT')  as guarda_partidas,
       has_table_privilege('anon', 'public.game_sessions', 'SELECT')  as lee_partidas,
       has_table_privilege('anon', 'public.player_aliases', 'SELECT') as lee_alias;

-- 2) La configuración es de 8 preguntas.
select questionspergame, secondsperquestion from public.game_settings order by id limit 1;

-- 3) ¿Ya se corrió algún script nuevo? (para no confundirse) La primera vez:
--    ninguna fila.
select column_name from information_schema.columns
 where table_name = 'game_sessions' and column_name in ('fecha_desafio', 'es_anterior');

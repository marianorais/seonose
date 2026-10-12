-- ============================================================================
--  Verificar DESPUÉS de correr los scripts 02 y 03. Sólo lectura.
-- ============================================================================

-- 1) Todas las partidas tienen fecha. ESPERADO: 0.
select count(*) as sin_fecha from public.game_sessions where fecha_desafio is null;

-- 2) Las últimas partidas del sitio publicado siguen entrando, con fecha.
--    Mirá que aparezcan partidas de hoy después de la hora en que corriste 02.
select id, completedat, fecha_desafio, es_anterior, totalquestions
  from public.game_sessions order by id desc limit 5;

-- 3) Desafíos anteriores disponibles. ESPERADO: fechas desde ayer hacia atrás.
select public.desafios_anteriores('verificacion', null, 5);

-- 4) Preguntas de ayer. ESPERADO: 8 preguntas.
select jsonb_array_length(
  public.obtener_desafio_anterior(((now() at time zone 'America/Argentina/Buenos_Aires')::date - 1))->'preguntas'
) as preguntas_de_ayer;

-- 5) Funciones de salas. ESPERADO: 7 filas.
select proname from pg_proc
 where proname in ('crear_sala', 'ver_sala', 'unirse_sala', 'salir_sala', 'eliminar_sala', 'ranking_sala', 'mis_salas')
 order by proname;

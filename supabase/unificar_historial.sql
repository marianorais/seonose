-- ============================================================================
--  Se o NoSe - Unificación del historial previo
--
--  Objetivo: que las partidas que quedaron identificadas por una IP suelta
--  ("datos al aire") pasen a contar para el alias que realmente les corresponde.
--
--  Por qué hay partidas sueltas: hasta el fix, el jugador se identificaba por su
--  IP pública. En celular esa IP rota todo el tiempo —IPv6 temporal, CGNAT y,
--  sobre todo, iCloud Private Relay— así que un mismo teléfono dejó partidas
--  repartidas entre varias IPs, y ninguna coincide con el identificador estable
--  que tiene hoy.
--
--  NO se ejecuta de corrido: los pasos 1 y 2 son de diagnóstico y el 4 requiere
--  que completes a mano qué grupo va a qué alias.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- PASO 1 - Diagnóstico: qué identidades hay y cuáles están sueltas
-- ----------------------------------------------------------------------------
-- Cada fila es un "jugador" tal como lo ve el ranking hoy. Las que dicen
-- (sin alias) son las que hay que repartir entre los alias reales.
-- Mirá `primera`/`ultima` y `useragent` para reconocer de quién es cada grupo.
select s.playerid,
       coalesce(a.alias, '(sin alias)') as alias,
       count(*)                        as partidas,
       sum(s.correctanswers)           as puntos,
       min(s.completedat)              as primera,
       max(s.completedat)              as ultima,
       count(distinct s.userip)        as ips_distintas,
       max(s.useragent)                as useragent
  from public.game_sessions s
  left join public.player_aliases a on a.playerid = s.playerid
 group by s.playerid, a.alias
 order by ultima desc;


-- ----------------------------------------------------------------------------
-- PASO 2 - Detalle de las partidas sueltas
-- ----------------------------------------------------------------------------
-- Para desempatar por fecha y hora cuando el useragent no alcanza.
select s.id,
       s.completedat,
       s.correctanswers,
       s.totalquestions,
       s.userip,
       s.playerid,
       s.useragent
  from public.game_sessions s
  left join public.player_aliases a on a.playerid = s.playerid
 where a.alias is null
 order by s.completedat desc;


-- ----------------------------------------------------------------------------
-- PASO 3 - Backup (obligatorio antes de tocar nada)
-- ----------------------------------------------------------------------------
create table if not exists public.game_sessions_backup_unificacion as
select id, playerid, userip, completedat
  from public.game_sessions;


-- ----------------------------------------------------------------------------
-- PASO 4 - Unificar
-- ----------------------------------------------------------------------------
-- Completá con los datos del paso 1. El destino es el `playerid` del alias, tal
-- como está en `player_aliases` (no lo inventes ni lo cambies: es el que tiene
-- guardado el dispositivo de esa persona).
--
-- Para "MR Iphone" el destino es su UUID:
--     0409e557-eafb-4b7d-93fd-e0c6df8c905e
-- Para los alias heredados el destino es su propio 'ip:<IP>', por ejemplo:
--     ip:181.95.216.60   (Mariano Rais)

-- 4.a) MIRÁ primero qué vas a cambiar. Nunca corras el update sin este select.
select s.id, s.completedat, s.correctanswers, s.userip, s.playerid
  from public.game_sessions s
 where s.playerid in (
         -- pegá acá los playerid '(sin alias)' que identificaste como del iPhone
         'ip:REEMPLAZAR-1',
         'ip:REEMPLAZAR-2'
       )
 order by s.completedat;

-- 4.b) Si la lista es correcta, unificá.
update public.game_sessions
   set playerid = '0409e557-eafb-4b7d-93fd-e0c6df8c905e'   -- destino: MR Iphone
 where playerid in (
         'ip:REEMPLAZAR-1',
         'ip:REEMPLAZAR-2'
       );

-- Repetí 4.a y 4.b para cada alias que tenga partidas sueltas
-- (Mariano Rais, Marian Rais Celu, Marcos, SebaRais).


-- ----------------------------------------------------------------------------
-- PASO 5 - Verificar
-- ----------------------------------------------------------------------------
-- Cada alias debería aparecer una sola vez, con todas sus partidas.
select coalesce(a.alias, '(sin alias)') as jugador,
       count(*)                        as partidas,
       sum(s.correctanswers)           as puntos,
       max(s.completedat)              as ultima
  from public.game_sessions s
  left join public.player_aliases a on a.playerid = s.playerid
 group by a.alias
 order by puntos desc;

-- Ninguna partida sin identidad:
select count(*) as sin_identidad from public.game_sessions where playerid is null;


-- ----------------------------------------------------------------------------
-- REVERTIR, si algo quedó mal
-- ----------------------------------------------------------------------------
-- update public.game_sessions s
--    set playerid = b.playerid
--   from public.game_sessions_backup_unificacion b
--  where s.id = b.id;


-- ----------------------------------------------------------------------------
-- OPCIONAL - Alias del mismo dueño en varios dispositivos
-- ----------------------------------------------------------------------------
-- Si querés que "Mariano Rais", "Marian Rais Celu" y "MR Iphone" sean UN solo
-- jugador en el ranking en lugar de tres, además de unificar las partidas hay
-- que borrar los alias que sobran (si no, quedan filas de alias sin partidas):
--
--   update public.game_sessions
--      set playerid = '0409e557-eafb-4b7d-93fd-e0c6df8c905e'
--    where playerid in ('ip:181.95.216.60', 'ip:104.28.63.16');
--
--   delete from public.player_aliases
--    where playerid in ('ip:181.95.216.60', 'ip:104.28.63.16');
--
-- Cuidado: los dispositivos de esos alias tienen guardado localmente su
-- identidad vieja, así que dejarían de reconocerse hasta que vuelvan a elegir
-- alias. Sólo hacelo si querés unificarte en un único jugador.

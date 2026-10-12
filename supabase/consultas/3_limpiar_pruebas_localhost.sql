-- ============================================================================
--  Limpieza de lo que creaste probando en localhost (OPCIONAL).
--
--  En localhost sos otro jugador (el navegador guarda otra identidad que en
--  www.seonose.com.ar). Todo lo que hiciste ahí quedó en producción: partidas,
--  alias, salas. Este script lo borra.
--
--  1. En localhost, abrí la consola del navegador (F12) y ejecutá:
--        localStorage.getItem('seonose-player-id')
--  2. Reemplazá TU-PLAYER-ID-DE-LOCALHOST abajo (en los dos lugares).
--  3. Corré primero el bloque A (sólo mira). Si es lo que esperás, corré el B.
-- ============================================================================


-- A) VISTA PREVIA: qué se va a borrar.
select 'partidas' as que, count(*) from public.game_sessions where playerid = 'TU-PLAYER-ID-DE-LOCALHOST'
union all
select 'salas creadas', count(*) from public.salas where propietario = 'TU-PLAYER-ID-DE-LOCALHOST'
union all
select 'membresías', count(*) from public.sala_miembros where playerid = 'TU-PLAYER-ID-DE-LOCALHOST'
union all
select 'alias', count(*) from public.player_aliases where playerid = 'TU-PLAYER-ID-DE-LOCALHOST';


-- B) BORRADO (en una transacción: si algo falla, no se borra nada).
begin;

-- Las salas que creaste, con sus integrantes (on delete cascade).
delete from public.salas where propietario = 'TU-PLAYER-ID-DE-LOCALHOST';
delete from public.sala_miembros where playerid = 'TU-PLAYER-ID-DE-LOCALHOST';

delete from public.game_answers
 where gamesessionid in (select id from public.game_sessions where playerid = 'TU-PLAYER-ID-DE-LOCALHOST');
delete from public.game_sessions where playerid = 'TU-PLAYER-ID-DE-LOCALHOST';

-- El alias sólo si no es el grupo de otro dispositivo.
delete from public.player_aliases
 where playerid = 'TU-PLAYER-ID-DE-LOCALHOST'
   and not exists (
     select 1 from public.player_aliases otro
      where otro.grupo = 'TU-PLAYER-ID-DE-LOCALHOST' and otro.playerid <> 'TU-PLAYER-ID-DE-LOCALHOST'
   );

commit;

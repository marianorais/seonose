-- ============================================================================
--  04 · Las salas suman los desafíos anteriores desde su creación
--
--  Corrige el puntaje de las salas. Antes, `_tabla_sala` descartaba toda
--  partida jugada como "desafío anterior", así que recuperar un día no sumaba
--  nunca, aunque ese día fuera posterior a la creación de la sala.
--
--  Regla (una sola, para miembros originales y para quienes se suman tarde):
--   - Suma toda partida cuya FECHA DEL DESAFÍO (fecha_desafio, día argentino)
--     sea igual o posterior al día en que se creó la sala. No importa cuándo se
--     jugó ni cuándo se unió la persona.
--   - No suman las partidas de días anteriores a la creación de la sala (siguen
--     contando en los rankings generales, que no dependen de esto).
--   - Una sola partida por persona y día (la primera que guardó): repetir o
--     tener varios dispositivos no duplica puntos. Un día jugado en vivo no se
--     puede volver a jugar como desafío anterior (lo impide la base).
--
--  Sólo reemplaza una función interna. No toca datos ni el sitio publicado.
--  Requiere el script 03 (salas). Se puede correr más de una vez.
-- ============================================================================

begin;

create or replace function public._tabla_sala(p_sala_id bigint)
returns table (persona text, puntos integer, partidas integer, correctas integer, total integer,
               victorias integer, jugo_hoy boolean, posicion integer)
language sql stable
as $$
  with personas as (
    select distinct public._persona(m.playerid) as persona
      from public.sala_miembros m where m.sala_id = p_sala_id
  ),
  dispositivos as (
    -- Todos los dispositivos de cada persona.
    select pa.playerid, p.persona from personas p join public.player_aliases pa on pa.grupo = p.persona
    union
    select p.persona, p.persona from personas p
  ),
  primeras as (
    -- Una partida por persona y fecha de desafío (la primera guardada), sea del
    -- día o un desafío anterior, desde el día en que se creó la sala.
    select distinct on (d.persona, s.fecha_desafio)
           d.persona, s.fecha_desafio, s.correctanswers, s.totalquestions
      from public.game_sessions s
      join dispositivos d on d.playerid = s.playerid
     where s.completedat is not null
       and s.fecha_desafio >= (select (creada_en at time zone 'America/Argentina/Buenos_Aires')::date
                                 from public.salas where id = p_sala_id)
     order by d.persona, s.fecha_desafio, s.completedat, s.id
  ),
  mejor_del_dia as (
    select fecha_desafio, max(correctanswers) as mejor, count(*) as jugadores
      from primeras group by fecha_desafio
  ),
  totales as (
    select p.persona,
           coalesce(sum(x.correctanswers), 0)::integer as puntos,
           count(x.fecha_desafio)::integer as partidas,
           coalesce(sum(x.totalquestions), 0)::integer as total,
           count(*) filter (where m.jugadores >= 2 and x.correctanswers = m.mejor)::integer as victorias,
           bool_or(x.fecha_desafio = public._hoy_ar()) as jugo_hoy
      from personas p
      left join primeras x on x.persona = p.persona
      left join mejor_del_dia m on m.fecha_desafio = x.fecha_desafio
     group by p.persona
  )
  select persona, puntos, partidas, puntos, total, victorias, coalesce(jugo_hoy, false),
         row_number() over (
           order by puntos desc, victorias desc,
                    case when total > 0 then puntos::numeric / total else 0 end desc,
                    partidas desc, lower(coalesce(public._alias(persona), '')), persona
         )::integer
    from totales
$$;

revoke all on function public._tabla_sala(bigint) from public, anon, authenticated;

commit;

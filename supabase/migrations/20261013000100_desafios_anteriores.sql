-- ============================================================================
--  02 · Desafíos anteriores
--
--  Qué agrega:
--   1. Dos columnas en game_sessions:
--        fecha_desafio : de qué día es el desafío jugado (hora argentina).
--        es_anterior   : true si se jugó como "desafío anterior".
--   2. Un control al guardar: un desafío anterior se juega una sola vez por
--      dispositivo, nunca uno que ya se jugó ese día, y nunca hoy o el futuro.
--   3. Dos funciones de sólo lectura:
--        preguntas_de_fecha(fecha) : las preguntas que se jugaron ese día.
--        desafios_anteriores(...)  : la lista de días, con el estado para
--                                    este dispositivo.
--
--  Las preguntas de un día anterior son las que efectivamente se jugaron ese
--  día (la secuencia más repetida en game_answers). No se guarda nada nuevo
--  para eso: se calcula al pedirlo.
--
--  Compatible con el sitio publicado: sigue guardando igual y la fecha se
--  completa sola. No borra ni cambia datos existentes. Se puede correr más de
--  una vez.
-- ============================================================================

begin;

-- 1. Columnas ---------------------------------------------------------------
alter table public.game_sessions add column if not exists fecha_desafio date;
alter table public.game_sessions add column if not exists es_anterior boolean not null default false;

-- Partidas existentes: la fecha en que se jugaron, en hora argentina.
update public.game_sessions
   set fecha_desafio = (coalesce(completedat, startedat) at time zone 'America/Argentina/Buenos_Aires')::date
 where fecha_desafio is null;

-- Un desafío anterior, una sola vez por dispositivo y fecha.
create unique index if not exists game_sessions_anterior_unico
  on public.game_sessions (playerid, fecha_desafio) where es_anterior;

create index if not exists game_sessions_fecha_idx on public.game_sessions (fecha_desafio);
create index if not exists game_answers_gamesessionid_idx on public.game_answers (gamesessionid);

-- 2. Control al guardar -----------------------------------------------------

-- Reloj del servidor. Las pruebas pueden fijarlo con `seonose.ahora`.
create or replace function public._ahora() returns timestamptz
language sql stable
as $$ select coalesce(nullif(current_setting('seonose.ahora', true), '')::timestamptz, now()) $$;

-- "Hoy" en Argentina.
create or replace function public._hoy_ar() returns date
language sql stable
as $$ select (public._ahora() at time zone 'America/Argentina/Buenos_Aires')::date $$;

create or replace function public._completar_partida() returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  -- Partida del día (la que guarda el sitio de siempre): la fecha es hoy.
  if new.fecha_desafio is null or not new.es_anterior then
    new.fecha_desafio := (coalesce(new.completedat, new.startedat, now()) at time zone 'America/Argentina/Buenos_Aires')::date;
    new.es_anterior := false;
    return new;
  end if;

  -- Desafío anterior.
  if new.playerid is null or new.fecha_desafio >= public._hoy_ar() then
    raise exception 'desafio-anterior-invalido' using errcode = '22023';
  end if;

  if exists (select 1 from game_sessions where playerid = new.playerid and fecha_desafio = new.fecha_desafio) then
    raise exception 'desafio-ya-jugado' using errcode = '23505';
  end if;

  return new;
end
$$;

drop trigger if exists game_sessions_completar on public.game_sessions;
create trigger game_sessions_completar
  before insert on public.game_sessions
  for each row execute function public._completar_partida();

-- 3. Funciones de lectura ---------------------------------------------------

-- Ids de las preguntas que se jugaron un día, en orden. NULL si ese día no se
-- jugó con la cantidad de preguntas vigente (no se inventan preguntas).
create or replace function public.preguntas_de_fecha(p_fecha date) returns bigint[]
language sql stable security definer
set search_path = public, pg_temp
as $$
  with secuencias as (
    select array_agg(a.questionid order by a.id) as ids
      from game_sessions s
      join game_answers a on a.gamesessionid = s.id
     where s.fecha_desafio = p_fecha and not s.es_anterior
     group by s.id
  )
  select ids
    from secuencias
   where cardinality(ids) = (select questionspergame from game_settings order by id limit 1)
   group by ids
   order by count(*) desc
   limit 1
$$;

-- El desafío de un día anterior, listo para jugar.
create or replace function public.obtener_desafio_anterior(p_fecha date) returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_ids bigint[];
begin
  if p_fecha is null or p_fecha >= public._hoy_ar() or p_fecha < date '2026-08-05' then
    return null;
  end if;

  v_ids := public.preguntas_de_fecha(p_fecha);

  if v_ids is null then
    return null;
  end if;

  return jsonb_build_object(
    'fecha', p_fecha,
    'segundos_por_pregunta', (select secondsperquestion from game_settings order by id limit 1),
    'preguntas', (
      select jsonb_agg(jsonb_build_object(
               'id', q.id, 'question', q.question, 'answer', q.answer,
               'choices', coalesce(q.choices, '[]'::jsonb),
               'categoryid', q.categoryid, 'categoryname', c.name, 'categoryicon', c.icon
             ) order by u.pos)
        from unnest(v_ids) with ordinality as u(id, pos)
        join questions q on q.id = u.id
        left join categories c on c.id = q.categoryid
    )
  );
end
$$;

-- Días anteriores (del más reciente al más viejo) y si este dispositivo ya
-- jugó cada uno. Desde el 05/08, cuando el juego pasó a 8 preguntas.
create or replace function public.desafios_anteriores(
  p_playerid text,
  p_antes_de date default null,
  p_limite integer default 10
) returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  with dias as (
    select distinct s.fecha_desafio as fecha
      from game_sessions s
     where not s.es_anterior
       and s.totalquestions = (select questionspergame from game_settings order by id limit 1)
       and s.fecha_desafio >= date '2026-08-05'
       and s.fecha_desafio < public._hoy_ar()
       and (p_antes_de is null or s.fecha_desafio < p_antes_de)
     order by s.fecha_desafio desc
     limit least(greatest(coalesce(p_limite, 10), 1), 30) + 1
  ),
  pagina as (
    select fecha from dias order by fecha desc limit least(greatest(coalesce(p_limite, 10), 1), 30)
  )
  select jsonb_build_object(
    'hay_mas', (select count(*) from dias) > (select count(*) from pagina),
    'fechas', coalesce((
      select jsonb_agg(jsonb_build_object(
               'fecha', p.fecha,
               'jugada', mia.id is not null,
               'jugada_en_vivo', mia.id is not null and not mia.es_anterior,
               'correctas', mia.correctanswers,
               'total', mia.totalquestions
             ) order by p.fecha desc)
        from pagina p
        left join lateral (
          select s.id, s.es_anterior, s.correctanswers, s.totalquestions
            from game_sessions s
           where s.playerid = p_playerid and s.fecha_desafio = p.fecha
           order by s.completedat
           limit 1
        ) mia on true
    ), '[]'::jsonb)
  )
$$;

-- Permisos: las funciones internas no se llaman desde la app.
revoke all on function public._ahora() from public, anon, authenticated;
revoke all on function public._hoy_ar() from public, anon, authenticated;
revoke all on function public._completar_partida() from public, anon, authenticated;
revoke all on function public.preguntas_de_fecha(date) from public, anon, authenticated;
grant execute on function public.obtener_desafio_anterior(date) to anon, authenticated;
grant execute on function public.desafios_anteriores(text, date, integer) to anon, authenticated;

commit;

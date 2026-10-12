-- ============================================================================
--  03 · Salas
--
--  Qué agrega:
--   - Tabla `salas`: nombre, código de invitación y quién la administra.
--   - Tabla `sala_miembros`: quién está en cada sala.
--   - 7 funciones que usa la app: crear_sala, ver_sala, unirse_sala,
--     salir_sala, eliminar_sala, ranking_sala, mis_salas.
--
--  Las tablas no se pueden leer ni escribir desde el navegador: sólo a través
--  de las funciones, que validan todo (si no, cualquiera podría meterse en una
--  sala ajena o borrarla).
--
--  Ranking de la sala (se calcula al pedirlo, no se guarda nada aparte):
--   - Puntos: respuestas correctas de la primera partida de cada día, desde el
--     día en que se creó la sala. Repetir no suma. Los desafíos anteriores no
--     suman.
--   - Victoria: el mejor resultado del día entre los integrantes que jugaron
--     (si jugaron al menos 2). Empate: ganan todos los empatados.
--   - Desempate: victorias, % de aciertos, partidas jugadas, alias.
--   - Varios dispositivos de una misma persona (player_aliases.grupo) cuentan
--     como una sola.
--
--  Requiere el script 02 (columna fecha_desafio). No toca nada de lo que usa
--  el sitio publicado. Se puede correr más de una vez.
-- ============================================================================

begin;

create table if not exists public.salas (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  nombre text not null check (char_length(nombre) between 1 and 40),
  propietario text not null,
  creada_en timestamptz not null default now()
);

create table if not exists public.sala_miembros (
  sala_id bigint not null references public.salas(id) on delete cascade,
  playerid text not null,
  unido_en timestamptz not null default now(),
  primary key (sala_id, playerid)
);

create index if not exists sala_miembros_playerid_idx on public.sala_miembros (playerid);

alter table public.salas enable row level security;
alter table public.sala_miembros enable row level security;
revoke all on public.salas from public, anon, authenticated;
revoke all on public.sala_miembros from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Funciones internas
-- ---------------------------------------------------------------------------

-- La persona dueña de un dispositivo (agrupamiento de alias).
create or replace function public._persona(p_playerid text) returns text
language sql stable
as $$ select coalesce((select grupo from public.player_aliases where playerid = p_playerid), p_playerid) $$;

create or replace function public._alias(p_persona text) returns text
language sql stable
as $$ select alias from public.player_aliases where playerid = p_persona and alias is not null $$;

-- Identificador público de una persona: nunca se muestra el playerid.
create or replace function public._clave(p_persona text) returns text
language sql immutable
as $$ select 'p' || substr(md5('seonose:' || p_persona), 1, 12) $$;

create or replace function public._sala(p_codigo text) returns public.salas
language sql stable
as $$ select * from public.salas where codigo = lower(btrim(coalesce(p_codigo, ''))) $$;

create or replace function public._es_integrante(p_sala_id bigint, p_playerid text) returns boolean
language sql stable
as $$
  select exists (
    select 1 from public.sala_miembros
     where sala_id = p_sala_id and public._persona(playerid) = public._persona(p_playerid)
  )
$$;

create or replace function public._integrantes(p_sala_id bigint) returns integer
language sql stable
as $$ select count(distinct public._persona(playerid))::integer from public.sala_miembros where sala_id = p_sala_id $$;

-- Tabla de posiciones de una sala.
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
    -- La primera partida de cada persona en cada día, desde que existe la sala.
    select distinct on (d.persona, s.fecha_desafio)
           d.persona, s.fecha_desafio, s.correctanswers, s.totalquestions
      from public.game_sessions s
      join dispositivos d on d.playerid = s.playerid
     where not s.es_anterior
       and s.completedat is not null
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

-- ---------------------------------------------------------------------------
-- Funciones que usa la app. Todas devuelven {"estado": "ok", ...} o
-- {"estado": "<motivo>"}.
-- ---------------------------------------------------------------------------

create or replace function public.crear_sala(p_playerid text, p_nombre text) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_nombre text := regexp_replace(btrim(coalesce(p_nombre, '')), '\s+', ' ', 'g');
  v_codigo text;
  v_sala_id bigint;
begin
  if coalesce(char_length(p_playerid), 0) < 8 then
    return jsonb_build_object('estado', 'invalida');
  end if;

  if v_nombre = '' or char_length(v_nombre) > 40 or v_nombre ~ '[<>[:cntrl:]]' then
    return jsonb_build_object('estado', 'nombre-invalido');
  end if;

  if public._alias(public._persona(p_playerid)) is null then
    return jsonb_build_object('estado', 'sin-alias');
  end if;

  if (select count(*) from salas where propietario = p_playerid and creada_en > public._ahora() - interval '1 day') >= 5 then
    return jsonb_build_object('estado', 'limite-creacion');
  end if;

  if (select count(*) from sala_miembros where playerid = p_playerid) >= 20 then
    return jsonb_build_object('estado', 'limite-salas');
  end if;

  -- Código de 10 caracteres al azar (sin 0, 1, l ni o para que no se confundan).
  loop
    v_codigo := (
      select string_agg(substr('abcdefghijkmnpqrstuvwxyz23456789', (get_byte(b, i) % 32) + 1, 1), '' order by i)
        from (select decode(md5(gen_random_uuid()::text), 'hex') as b) azar, generate_series(0, 9) i
    );
    exit when not exists (select 1 from salas where codigo = v_codigo);
  end loop;

  insert into salas (codigo, nombre, propietario, creada_en) values (v_codigo, v_nombre, p_playerid, public._ahora())
  returning id into v_sala_id;

  insert into sala_miembros (sala_id, playerid, unido_en) values (v_sala_id, p_playerid, public._ahora());

  return jsonb_build_object('estado', 'ok', 'codigo', v_codigo, 'nombre', v_nombre);
end
$$;

-- Lo que ve quien abre una invitación (sin el ranking).
create or replace function public.ver_sala(p_codigo text, p_playerid text) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_sala salas;
begin
  v_sala := public._sala(p_codigo);

  if v_sala.id is null then
    return jsonb_build_object('estado', 'no-existe');
  end if;

  return jsonb_build_object(
    'estado', 'ok',
    'codigo', v_sala.codigo,
    'nombre', v_sala.nombre,
    'integrantes', public._integrantes(v_sala.id),
    'creada_por', public._alias(public._persona(v_sala.propietario)),
    'es_integrante', public._es_integrante(v_sala.id, p_playerid)
  );
end
$$;

create or replace function public.unirse_sala(p_codigo text, p_playerid text) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_sala salas;
begin
  v_sala := public._sala(p_codigo);

  if v_sala.id is null or coalesce(char_length(p_playerid), 0) < 8 then
    return jsonb_build_object('estado', 'no-existe');
  end if;

  if public._es_integrante(v_sala.id, p_playerid) then
    return jsonb_build_object('estado', 'ok');
  end if;

  if public._alias(public._persona(p_playerid)) is null then
    return jsonb_build_object('estado', 'sin-alias');
  end if;

  if public._integrantes(v_sala.id) >= 50 then
    return jsonb_build_object('estado', 'sala-llena');
  end if;

  if (select count(*) from sala_miembros where playerid = p_playerid) >= 20 then
    return jsonb_build_object('estado', 'limite-salas');
  end if;

  insert into sala_miembros (sala_id, playerid, unido_en) values (v_sala.id, p_playerid, public._ahora())
  on conflict do nothing;

  return jsonb_build_object('estado', 'ok');
end
$$;

create or replace function public.salir_sala(p_codigo text, p_playerid text) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_sala salas;
  v_heredero text;
begin
  v_sala := public._sala(p_codigo);

  if v_sala.id is null or not public._es_integrante(v_sala.id, p_playerid) then
    return jsonb_build_object('estado', 'no-existe');
  end if;

  -- Se va la persona, con todos sus dispositivos.
  delete from sala_miembros
   where sala_id = v_sala.id and public._persona(playerid) = public._persona(p_playerid);

  -- Si administraba la sala, la hereda el integrante más antiguo; si no queda
  -- nadie, la sala se borra.
  if public._persona(v_sala.propietario) = public._persona(p_playerid) then
    select playerid into v_heredero from sala_miembros where sala_id = v_sala.id order by unido_en limit 1;

    if v_heredero is null then
      delete from salas where id = v_sala.id;
    else
      update salas set propietario = v_heredero where id = v_sala.id;
    end if;
  end if;

  return jsonb_build_object('estado', 'ok');
end
$$;

-- Sólo quien administra. Borra la sala y sus integrantes; las partidas de cada
-- uno no se tocan.
create or replace function public.eliminar_sala(p_codigo text, p_playerid text) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_sala salas;
begin
  v_sala := public._sala(p_codigo);

  if v_sala.id is null then
    return jsonb_build_object('estado', 'no-existe');
  end if;

  if public._persona(v_sala.propietario) <> public._persona(p_playerid) then
    return jsonb_build_object('estado', 'no-autorizado');
  end if;

  delete from salas where id = v_sala.id;

  return jsonb_build_object('estado', 'ok');
end
$$;

-- Ranking y actividad. Sólo para integrantes.
create or replace function public.ranking_sala(p_codigo text, p_playerid text) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_sala salas;
  v_persona text := public._persona(p_playerid);
begin
  v_sala := public._sala(p_codigo);

  if v_sala.id is null then
    return jsonb_build_object('estado', 'no-existe');
  end if;

  if not public._es_integrante(v_sala.id, p_playerid) then
    return jsonb_build_object('estado', 'no-integrante');
  end if;

  return jsonb_build_object(
    'estado', 'ok',
    'sala', jsonb_build_object(
      'codigo', v_sala.codigo,
      'nombre', v_sala.nombre,
      'desde', (v_sala.creada_en at time zone 'America/Argentina/Buenos_Aires')::date,
      'integrantes', public._integrantes(v_sala.id),
      'soy_propietario', public._persona(v_sala.propietario) = v_persona
    ),
    'tabla', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'clave', public._clave(t.persona),
               'alias', public._alias(t.persona),
               'puntos', t.puntos, 'partidas', t.partidas, 'correctas', t.correctas, 'total', t.total,
               'victorias', t.victorias,
               'porcentaje', case when t.total > 0 then round(t.correctas * 100.0 / t.total, 1) else 0 end,
               'posicion', t.posicion, 'jugo_hoy', t.jugo_hoy,
               'es_actual', t.persona = v_persona
             ) order by t.posicion), '[]'::jsonb)
        from public._tabla_sala(v_sala.id) t
    ),
    'actividad', (
      -- Últimas 20 partidas del grupo: sólo resultados, nunca respuestas.
      select coalesce(jsonb_agg(item order by completada desc), '[]'::jsonb)
        from (
          select jsonb_build_object(
                   'clave', public._clave(public._persona(s.playerid)),
                   'alias', public._alias(public._persona(s.playerid)),
                   'fecha', s.fecha_desafio,
                   'es_anterior', s.es_anterior,
                   'correctas', s.correctanswers,
                   'total', s.totalquestions,
                   'completada_en', s.completedat
                 ) as item,
                 s.completedat as completada
            from game_sessions s
           where s.completedat >= v_sala.creada_en
             and public._persona(s.playerid) in (
               select public._persona(m.playerid) from sala_miembros m where m.sala_id = v_sala.id
             )
           order by s.completedat desc
           limit 20
        ) ultimas
    )
  );
end
$$;

create or replace function public.mis_salas(p_playerid text) returns jsonb
language sql security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object('estado', 'ok', 'salas', coalesce(jsonb_agg(jsonb_build_object(
           'codigo', s.codigo,
           'nombre', s.nombre,
           'integrantes', public._integrantes(s.id),
           'soy_propietario', public._persona(s.propietario) = public._persona(p_playerid),
           'mi_posicion', (select t.posicion from public._tabla_sala(s.id) t
                            where t.persona = public._persona(p_playerid))
         ) order by s.creada_en desc), '[]'::jsonb))
    from salas s
   where public._es_integrante(s.id, p_playerid)
$$;

-- ---------------------------------------------------------------------------
-- Permisos: las internas (con _) no se llaman desde la app.
-- ---------------------------------------------------------------------------
revoke all on function public._persona(text) from public, anon, authenticated;
revoke all on function public._alias(text) from public, anon, authenticated;
revoke all on function public._clave(text) from public, anon, authenticated;
revoke all on function public._sala(text) from public, anon, authenticated;
revoke all on function public._es_integrante(bigint, text) from public, anon, authenticated;
revoke all on function public._integrantes(bigint) from public, anon, authenticated;
revoke all on function public._tabla_sala(bigint) from public, anon, authenticated;

grant execute on function public.crear_sala(text, text) to anon, authenticated;
grant execute on function public.ver_sala(text, text) to anon, authenticated;
grant execute on function public.unirse_sala(text, text) to anon, authenticated;
grant execute on function public.salir_sala(text, text) to anon, authenticated;
grant execute on function public.eliminar_sala(text, text) to anon, authenticated;
grant execute on function public.ranking_sala(text, text) to anon, authenticated;
grant execute on function public.mis_salas(text) to anon, authenticated;

commit;

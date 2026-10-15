begin;

alter table public.player_aliases
  add column if not exists avatar text;

create or replace function public.guardar_perfil_jugador(
  p_playerid text,
  p_alias text,
  p_avatar text
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_grupo text;
  v_alias text := btrim(coalesce(p_alias, ''));
  v_avatar text := coalesce(nullif(btrim(p_avatar), ''), '👤');
begin
  if p_playerid is null or btrim(p_playerid) = '' then
    return jsonb_build_object('estado', 'alias-invalido');
  end if;

  if char_length(v_alias) not between 1 and 30 then
    return jsonb_build_object('estado', 'alias-invalido');
  end if;

  if v_avatar not in (
    '👤', '🎮', '🦊', '🐼', '🐸', '🐯', '🐙', '🦉', '🐬', '🦄', '🐧', '🤖', '🌟',
    '🐻', '🐰', '🐹', '🐮', '🐷', '🐵', '🐔', '🦁', '🐺', '🦋', '🌈', '⚽', '🚀'
  ) then
    return jsonb_build_object('estado', 'avatar-invalido');
  end if;

  select grupo into v_grupo
    from public.player_aliases
   where playerid = p_playerid;

  v_grupo := coalesce(v_grupo, p_playerid);

  update public.player_aliases
     set alias = v_alias,
         avatar = v_avatar
   where playerid = v_grupo;

  if not found then
    insert into public.player_aliases (playerid, alias, grupo, avatar)
    values (v_grupo, v_alias, v_grupo, v_avatar);
  end if;

  return jsonb_build_object('estado', 'ok', 'alias', v_alias, 'avatar', v_avatar);
exception
  when unique_violation then
    return jsonb_build_object('estado', 'duplicado');
end
$$;

create or replace function public._avatar(p_persona text) returns text
language sql stable
as $$
  select avatar from public.player_aliases
   where playerid = p_persona and avatar is not null
$$;

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
               'avatar', public._avatar(t.persona),
               'puntos', t.puntos, 'partidas', t.partidas, 'correctas', t.correctas, 'total', t.total,
               'victorias', t.victorias,
               'porcentaje', case when t.total > 0 then round(t.correctas * 100.0 / t.total, 1) else 0 end,
               'posicion', t.posicion, 'jugo_hoy', t.jugo_hoy,
               'es_actual', t.persona = v_persona
             ) order by t.posicion), '[]'::jsonb)
        from public._tabla_sala(v_sala.id) t
    ),
    'actividad', (
      select coalesce(jsonb_agg(item order by completada desc), '[]'::jsonb)
        from (
          select jsonb_build_object(
                   'clave', public._clave(public._persona(s.playerid)),
                   'alias', public._alias(public._persona(s.playerid)),
                   'avatar', public._avatar(public._persona(s.playerid)),
                   'fecha', s.fecha_desafio,
                   'es_anterior', s.es_anterior,
                   'correctas', s.correctanswers,
                   'total', s.totalquestions,
                   'completada_en', s.completedat
                 ) as item,
                 s.completedat as completada
            from public.game_sessions s
           where s.completedat >= v_sala.creada_en
             and public._persona(s.playerid) in (
               select public._persona(m.playerid) from public.sala_miembros m where m.sala_id = v_sala.id
             )
           order by s.completedat desc
           limit 20
        ) ultimas
    )
  );
end
$$;

revoke all on function public._avatar(text) from public, anon, authenticated;
revoke all on function public.guardar_perfil_jugador(text, text, text) from public, anon, authenticated;
grant execute on function public.guardar_perfil_jugador(text, text, text) to anon, authenticated;

commit;

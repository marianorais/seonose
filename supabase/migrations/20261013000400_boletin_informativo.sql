-- ============================================================================
--  04 · Boletín Informativo
--
--  Qué agrega:
--   - Tabla `public.boletines`: contiene los comunicados del sistema.
--   - Índice para consultar los activos ordenados por fecha más reciente.
--   - Trigger que actualiza `fecha_actualizacion` al editar un registro.
--
--  Convenciones:
--   - Se usa `text` + `timestamptz` para conservar Unicode, emojis, fechas con
--     zona horaria y compatibilidad con la base de datos de Supabase.
--   - La vista pública sólo expone los boletines activos.
--   - Si el proyecto agrega autenticación y roles administrativos en el futuro,
--     conviene replantear las políticas de escritura.
-- ============================================================================

begin;

create table if not exists public.boletines (
  id bigint generated always as identity primary key,
  titulo text not null check (btrim(titulo) <> ''),
  descripcion text not null check (btrim(descripcion) <> ''),
  activo boolean not null default true,
  fecha_creacion timestamptz not null default now(),
  fecha_actualizacion timestamptz not null default now()
);

create index if not exists boletines_activos_fecha_idx
  on public.boletines (activo, fecha_creacion desc);

create or replace function public.set_boletin_fecha_actualizacion()
returns trigger
language plpgsql
as $$
begin
  new.fecha_actualizacion = now();
  return new;
end;
$$;

drop trigger if exists trg_boletin_fecha_actualizacion on public.boletines;
create trigger trg_boletin_fecha_actualizacion
before update on public.boletines
for each row
execute function public.set_boletin_fecha_actualizacion();

alter table public.boletines enable row level security;
revoke all on public.boletines from public, anon, authenticated;
grant select, insert, update, delete on public.boletines to anon, authenticated;

drop policy if exists "boletines_lec_activos" on public.boletines;
drop policy if exists "boletines_escritura_publica" on public.boletines;
drop policy if exists "boletines_actualizacion_publica" on public.boletines;
drop policy if exists "boletines_borrado_publico" on public.boletines;

create policy "boletines_lec_activos" on public.boletines
for select
to anon, authenticated
using (activo = true);

create policy "boletines_escritura_publica" on public.boletines
for insert to anon, authenticated
with check (true);

create policy "boletines_actualizacion_publica" on public.boletines
for update to anon, authenticated
using (true)
with check (true);

create policy "boletines_borrado_publico" on public.boletines
for delete to anon, authenticated
using (true);

commit;

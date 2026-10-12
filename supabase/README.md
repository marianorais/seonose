# Base de datos de Se o NoSe

Todo corre dentro de Postgres en Supabase (plan gratuito): no hay servidores
ni funciones pagas. Las salas y los desafíos anteriores agregan muy pocos datos.

## Scripts

| Archivo | Estado | Qué hace |
|---|---|---|
| `migrations/20261012000100_seguridad_inmediata.sql` | **Aplicado** | Nadie puede borrar ni modificar partidas desde afuera. |
| `reversion/revertir_04_y_05.sql` | Aplicar si 04/05 se corrieron | Devuelve los permisos que necesita el sitio publicado. |
| `migrations/20261013000100_desafios_anteriores.sql` | Pendiente | 2 columnas en `game_sessions` (`fecha_desafio`, `es_anterior`), un control al guardar y 2 funciones de lectura. |
| `migrations/20261013000200_salas.sql` | Pendiente | Tablas `salas` y `sala_miembros` y 7 funciones. |

Los dos scripts pendientes son compatibles con el sitio publicado hoy: no le
quitan permisos ni cambian cómo guarda. Se pueden correr más de una vez.

`tests/aplicadas_por_error/` guarda las migraciones 04 y 05 que se corrieron
antes de tiempo, sólo para probar la reversión. **No volver a correrlas.**

## Cómo funciona

- **Desafío del día:** igual que siempre (el navegador elige las preguntas y
  guarda la partida). La base sólo le completa `fecha_desafio`.
- **Desafío anterior:** sus preguntas son las que más se jugaron ese día
  (`preguntas_de_fecha`). Se guarda como cualquier partida, con
  `es_anterior = true`. La base rechaza un segundo intento del mismo
  dispositivo, un día que ya se jugó en vivo, y hoy o el futuro. Suma al
  ranking general del Mes y del Año (en el período en que se juega), no al de
  Hoy. En las salas no suma.
- **Salas:** las tablas no se tocan desde el navegador; todo pasa por las
  funciones. Puntos = aciertos de la primera partida de cada día desde que se
  creó la sala. Los desafíos anteriores y las repeticiones no suman.

## Pruebas

`npm run test:db` corre todos los scripts sobre una copia del esquema de
producción en un Postgres en memoria. No toca Supabase.

## Métricas (SQL Editor)

```sql
-- Salas creadas por semana
select date_trunc('week', creada_en)::date as semana, count(*) from salas group by 1 order by 1 desc;

-- Integrantes por sala
select s.nombre, count(m.*) as integrantes from salas s join sala_miembros m on m.sala_id = s.id group by s.id order by 2 desc;

-- Desafíos anteriores jugados por semana
select date_trunc('week', completedat)::date as semana, count(*) from game_sessions where es_anterior group by 1 order by 1 desc;
```

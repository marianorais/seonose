/**
 * Tablero semanal a partir de las partidas guardadas en Supabase.
 *
 *   node scripts/metricas-semanales.mjs [semanas=6]
 *
 * Lee `game_sessions` con la anon key del `.env` (la misma que usa la web) y
 * muestra sólo agregados: no imprime IPs ni identificadores.
 *
 * Qué mide y qué no:
 *  - "Jugadores" = dispositivos distintos (`playerid`) que TERMINARON una
 *    partida. Otro navegador, incógnito o borrar datos cuenta como otro jugador.
 *  - No ve a quien entró y no terminó: eso sale de GA (`game_start`).
 *  - D1: de los jugadores nuevos de la semana, cuántos jugaron al día siguiente
 *    de su primera partida. Retorno 7d: cuántos volvieron dentro de los 7 días.
 *    Las cohortes con menos de 7 días de antigüedad todavía no están cerradas.
 */
import fs from 'node:fs'

const semanas = Number(process.argv[2] ?? 6)
const env = Object.fromEntries(
  fs
    .readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)

const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY
if (!url || !key) throw new Error('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en .env')

const filas = []
for (let desde = 0; ; desde += 1000) {
  const r = await fetch(`${url}/rest/v1/game_sessions?select=completedat,playerid,es_anterior&order=id.asc`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${desde}-${desde + 999}` },
  })
  if (!r.ok) throw new Error(`Supabase respondió ${r.status}: ${await r.text()}`)
  const lote = await r.json()
  filas.push(...lote)
  if (lote.length < 1000) break
}

const formato = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
const dia = (v) => formato.format(new Date(v))
const sumar = (d, n) => {
  const f = new Date(`${d}T12:00:00Z`)
  f.setUTCDate(f.getUTCDate() + n)
  return f.toISOString().slice(0, 10)
}
const hoy = formato.format(new Date())

const porDia = new Map()
const diasPorJugador = new Map()
for (const f of filas) {
  if (!f.completedat) continue
  const d = dia(f.completedat)
  if (!porDia.has(d)) porDia.set(d, { partidas: 0, jugadores: new Set() })
  porDia.get(d).partidas++
  if (f.playerid) {
    porDia.get(d).jugadores.add(f.playerid)
    if (!diasPorJugador.has(f.playerid)) diasPorJugador.set(f.playerid, new Set())
    diasPorJugador.get(f.playerid).add(d)
  }
}
const primerDia = new Map([...diasPorJugador].map(([id, dias]) => [id, [...dias].sort()[0]]))

const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '—')
const tabla = []

// Semanas cerradas de lunes a domingo, la más reciente primero (incluye la actual, parcial).
const diaSemana = (new Date(`${hoy}T12:00:00Z`).getUTCDay() + 6) % 7
const lunesActual = sumar(hoy, -diaSemana)

for (let s = 0; s < semanas; s++) {
  const inicio = sumar(lunesActual, -7 * s)
  const dias = Array.from({ length: 7 }, (_, i) => sumar(inicio, i)).filter((d) => d <= hoy)
  const unicos = new Set()
  let partidas = 0
  let jugadoresDia = 0
  for (const d of dias) {
    const o = porDia.get(d)
    if (!o) continue
    partidas += o.partidas
    jugadoresDia += o.jugadores.size
    o.jugadores.forEach((j) => unicos.add(j))
  }
  const nuevos = [...unicos].filter((j) => dias.includes(primerDia.get(j)))
  const d1Cerrados = nuevos.filter((j) => sumar(primerDia.get(j), 1) < hoy)
  const d1 = d1Cerrados.filter((j) => diasPorJugador.get(j).has(sumar(primerDia.get(j), 1)))
  const r7Cerrados = nuevos.filter((j) => sumar(primerDia.get(j), 7) < hoy)
  const r7 = r7Cerrados.filter((j) => [1, 2, 3, 4, 5, 6, 7].some((n) => diasPorJugador.get(j).has(sumar(primerDia.get(j), n))))

  tabla.push({
    semana: `${inicio}${dias.length < 7 ? ' (parcial)' : ''}`,
    'jugadores/día': (jugadoresDia / dias.length).toFixed(1),
    partidas,
    'únicos': unicos.size,
    nuevos: nuevos.length,
    D1: `${pct(d1.length, d1Cerrados.length)} (${d1.length}/${d1Cerrados.length})`,
    'retorno 7d': `${pct(r7.length, r7Cerrados.length)} (${r7.length}/${r7Cerrados.length})`,
  })
}

console.table(tabla)

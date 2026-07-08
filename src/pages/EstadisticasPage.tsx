/**
 * Pantalla /estadisticas (ruta discreta, sin link visible en la UI).
 * Muestra métricas relevantes calculadas a partir de los datos ya
 * existentes en Supabase. No modifica ni escribe en la base.
 */
import { useEffect, useState } from 'react'

import Header from '../components/Header'
import Sidebar from '../components/Sidebar'

import { loadThemeConfig } from '../lib/themeConfig'
import { obtenerEstadisticas } from '../lib/statsHelpers'
import type { Estadisticas, PreguntaStat } from '../lib/statsHelpers'

const Tarjeta = ({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{titulo}</p>
    <p className="mt-2 text-3xl font-bold text-slate-900">{valor}</p>
    {detalle && <p className="mt-1 text-sm text-slate-500">{detalle}</p>}
  </div>
)

const BarraHorizontal = ({
  etiqueta,
  valor,
  maximo,
  sufijo = '',
}: {
  etiqueta: string
  valor: number
  maximo: number
  sufijo?: string
}) => {
  const porcentaje = maximo > 0 ? Math.round((valor / maximo) * 100) : 0

  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-right text-xs font-medium text-slate-500">{etiqueta}</span>
      <div className="h-6 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className="flex h-full items-center justify-end rounded-full bg-slate-900 px-2 text-[11px] font-semibold text-white transition-all"
          style={{ width: `${Math.max(porcentaje, valor > 0 ? 8 : 0)}%` }}
          role="img"
          aria-label={`${etiqueta}: ${valor}${sufijo}`}
        >
          {valor > 0 ? `${valor}${sufijo}` : ''}
        </div>
      </div>
    </div>
  )
}

const ListaPreguntas = ({ titulo, items, color }: { titulo: string; items: PreguntaStat[]; color: string }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h3 className="text-lg font-bold text-slate-900">{titulo}</h3>
    {items.length === 0 ? (
      <p className="mt-3 text-sm text-slate-500">Aún no hay suficientes respuestas.</p>
    ) : (
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item.questionid} className="flex items-start justify-between gap-3">
            <span className="text-sm text-slate-700">{item.texto}</span>
            <span className="shrink-0 text-right">
              <span className={`block text-sm font-bold ${color}`}>{item.porcentaje}%</span>
              <span className="block text-xs text-slate-400">{item.intentos} resp.</span>
            </span>
          </li>
        ))}
      </ul>
    )}
  </div>
)

function EstadisticasPage() {
  const [showSidebar, setShowSidebar] = useState(false)
  const [themeConfig] = useState(() => loadThemeConfig())
  const [stats, setStats] = useState<Estadisticas | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let activo = true

    const cargar = async () => {
      try {
        const data = await obtenerEstadisticas()
        if (activo) setStats(data)
      } catch (exception) {
        console.error(exception)
        if (activo) setError(true)
      } finally {
        if (activo) setLoading(false)
      }
    }

    cargar()

    return () => {
      activo = false
    }
  }, [])

  const maxPartidasDia = stats ? Math.max(1, ...stats.partidasPorDia.map((d) => d.cantidad)) : 1
  const maxDistribucion = stats ? Math.max(1, ...stats.distribucionPuntajes.map((d) => d.cantidad)) : 1

  return (
    <div
      className="min-h-screen text-slate-900"
      style={{
        backgroundColor: themeConfig.backgroundColor ?? '#f8fafc',
        fontFamily: themeConfig.fontFamily ?? 'sans-serif',
      }}
    >
      <Header
        onOpenSidebar={() => setShowSidebar(true)}
        onOpenSettings={() => {}}
        onOpenStats={() => {}}
      />

      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Estadísticas</h1>
          <p className="mt-2 text-sm text-slate-500">Resumen de uso y desempeño de Se o NoSe.</p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">
            Cargando estadísticas...
          </div>
        ) : error || !stats ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700 shadow-sm">
            No se pudieron cargar las estadísticas.
          </div>
        ) : stats.totalPartidas === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">
            Todavía no hay partidas registradas.
          </div>
        ) : (
          <div className="space-y-8">
            {/* KPIs principales */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Tarjeta titulo="Jugadores únicos" valor={stats.jugadoresUnicos.toLocaleString('es-AR')} detalle="Por IP, hasta la fecha" />
              <Tarjeta titulo="Partidas jugadas" valor={stats.totalPartidas.toLocaleString('es-AR')} detalle={`${stats.partidasHoy} hoy · ${stats.partidasUltimos7} en Total`} />
              <Tarjeta titulo="Tasa de acierto" valor={`${stats.tasaAciertoGlobal}%`} detalle="Sobre todas las respuestas" />
              <Tarjeta titulo="Aciertos por partida" valor={String(stats.aciertosPromedio)} detalle="Promedio" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Tarjeta titulo="Respuestas totales" valor={stats.totalRespuestas.toLocaleString('es-AR')} />
              <Tarjeta titulo="Tiempo por respuesta" valor={`${stats.tiempoRespuestaPromedio}s`} detalle="Promedio" />
            </div>

            {/* Partidas por día */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Partidas por día</h3>
              <p className="mt-1 text-sm text-slate-500">Últimos 14 días</p>
              <div className="mt-4 space-y-2">
                {stats.partidasPorDia.map((dia) => (
                  <BarraHorizontal key={dia.dia} etiqueta={dia.dia.slice(5)} valor={dia.cantidad} maximo={maxPartidasDia} />
                ))}
              </div>
            </div>

            {/* Distribución de puntajes */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Distribución de puntajes</h3>
              <p className="mt-1 text-sm text-slate-500">Cantidad de partidas por aciertos obtenidos</p>
              <div className="mt-4 space-y-2">
                {stats.distribucionPuntajes.map((item) => (
                  <BarraHorizontal
                    key={item.puntaje}
                    etiqueta={`${item.puntaje} ✓`}
                    valor={item.cantidad}
                    maximo={maxDistribucion}
                  />
                ))}
              </div>
            </div>

            {/* Preguntas difíciles / fáciles */}
            <div className="grid gap-4 lg:grid-cols-2">
              <ListaPreguntas titulo="Preguntas más difíciles" items={stats.preguntasDificiles} color="text-red-600" />
              <ListaPreguntas titulo="Preguntas más fáciles" items={stats.preguntasFaciles} color="text-emerald-600" />
            </div>

            <p className="text-center text-xs text-slate-400">
              Los jugadores únicos se estiman por IP a partir de las partidas completadas.
            </p>
          </div>
        )}
      </main>

      <Sidebar isOpen={showSidebar} onClose={() => setShowSidebar(false)} />
    </div>
  )
}

export default EstadisticasPage

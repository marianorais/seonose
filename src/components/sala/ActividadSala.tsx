import { formatearHaceCuanto } from '../../lib/fechas'
import type { ActividadSala as Actividad } from '../../lib/salas'

/**
 * Últimas partidas del grupo. Sólo resultados (aciertos sobre total), nunca
 * preguntas ni respuestas: no se le arruina el desafío a nadie que todavía no
 * jugó.
 */
const ActividadSala = ({ actividad }: { actividad: Actividad[] }) => {
  if (actividad.length === 0) return null

  return (
    <section aria-labelledby="titulo-actividad" className="space-y-3">
      <h2 id="titulo-actividad" className="text-lg font-bold text-slate-900">
        Actividad reciente
      </h2>

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-200 bg-white">
        {actividad.map((item) => (
          <li key={`${item.clave}-${item.completadaEn}`} className="flex items-center gap-3 px-4 py-3">
            <span className="text-xl" aria-hidden>
              {item.modo === 'historico' ? '📅' : '🧠'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-900">
                <span className="font-semibold">{item.alias}</span>{' '}
                {item.modo === 'historico' ? (
                  <>
                    jugó el desafío anterior #{item.numero} <span className="text-slate-500">(no suma)</span>
                  </>
                ) : (
                  <>jugó el desafío #{item.numero}</>
                )}
              </p>
              <p className="text-xs text-slate-500">{formatearHaceCuanto(item.completadaEn)}</p>
            </div>
            <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900">
              {item.correctas}/{item.total}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default ActividadSala

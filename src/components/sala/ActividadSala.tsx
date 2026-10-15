import { formatearHaceCuanto } from '../../lib/fechas'
import { construirIdentidad } from '../../lib/rankingHelpers'
import type { ActividadSala as Actividad } from '../../lib/salas'
import AvatarJugador from '../AvatarJugador'

/**
 * Últimas partidas del grupo. Sólo resultados (aciertos sobre total), nunca
 * preguntas ni respuestas: no se le arruina el desafío a nadie que todavía no
 * jugó.
 *
 * Sólo se muestran desafíos de la sala: los de fecha igual o posterior a su
 * creación (`desde`), que son los que suman. Un desafío anterior a la sala no
 * aparece.
 */
const ActividadSala = ({ actividad, desde }: { actividad: Actividad[]; desde: string }) => {
  const deLaSala = actividad.filter((item) => item.fecha >= desde)

  if (deLaSala.length === 0) return null

  return (
    <section aria-labelledby="titulo-actividad" className="space-y-3">
      <h2 id="titulo-actividad" className="text-lg font-bold text-slate-900">
        Actividad reciente
      </h2>

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-200 bg-white">
        {deLaSala.map((item) => (
          <li key={`${item.clave}-${item.completadaEn}`} className="flex items-center gap-3 px-4 py-3">
            <AvatarJugador
              avatar={item.avatar}
              predeterminado={construirIdentidad(item.clave).emoji}
              color={`hsl(${construirIdentidad(item.clave).hue} 85% 92%)`}
              className="h-9 w-9 text-lg"
            />
            <span className="text-xl" aria-hidden>
              {item.modo === 'historico' ? '📅' : '🧠'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-900">
                <span className="font-semibold">{item.alias}</span>{' '}
                {item.modo === 'historico' ? <>jugó el desafío anterior #{item.numero}</> : <>jugó el desafío #{item.numero}</>}
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

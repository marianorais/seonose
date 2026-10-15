import { useState } from 'react'

import { construirIdentidad } from '../../lib/rankingHelpers'
import { VISTAS_RANKING_SALA, ordenarTablaSala } from '../../lib/salas'
import type { FilaSala, VistaRankingSala } from '../../lib/salas'
import AvatarJugador from '../AvatarJugador'

type FilaOrdenada = FilaSala & { puesto: number }

const MEDALLAS: Record<number, { medalla: string; nombre: string; borde: string; fondo: string; texto: string }> = {
  1: { medalla: '🥇', nombre: 'Oro', borde: 'border-amber-300', fondo: 'from-amber-50 to-white', texto: 'text-amber-700' },
  2: { medalla: '🥈', nombre: 'Plata', borde: 'border-slate-300', fondo: 'from-slate-50 to-white', texto: 'text-slate-600' },
  3: { medalla: '🥉', nombre: 'Bronce', borde: 'border-orange-300', fondo: 'from-orange-50 to-white', texto: 'text-orange-700' },
}

const valorPrincipal = (fila: FilaSala, vista: VistaRankingSala) => {
  if (vista === 'victorias') return `${fila.victorias} ${fila.victorias === 1 ? 'victoria' : 'victorias'}`
  if (vista === 'porcentaje') return `${fila.porcentaje.toLocaleString('es-AR')}%`
  return `${fila.puntos} ${fila.puntos === 1 ? 'pt' : 'pts'}`
}

const detalle = (fila: FilaSala) =>
  `${fila.partidas} ${fila.partidas === 1 ? 'partida' : 'partidas'} · ${fila.correctas}/${fila.total} · ${fila.porcentaje.toLocaleString('es-AR')}%`

const Avatar = ({ clave, avatar, grande = false }: { clave: string; avatar: string | null; grande?: boolean }) => {
  const { emoji, hue } = construirIdentidad(clave)

  return (
    <AvatarJugador
      avatar={avatar}
      predeterminado={emoji}
      color={`hsl(${hue} 85% 92%)`}
      className={grande ? 'h-12 w-12 text-2xl' : 'h-9 w-9 text-lg'}
    />
  )
}

const Vos = () => (
  <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-white">Vos</span>
)

const TarjetaPodio = ({ fila, vista, lugar }: { fila: FilaOrdenada; vista: VistaRankingSala; lugar: 1 | 2 | 3 }) => {
  const estilo = MEDALLAS[lugar]
  const campeon = lugar === 1

  return (
    <li
      className={`relative flex items-center gap-3 rounded-[1.5rem] border bg-gradient-to-b p-3 shadow-md sm:flex-col sm:gap-2 sm:p-4 sm:text-center ${estilo.borde} ${estilo.fondo} ${
        campeon ? 'sm:order-2 sm:-mt-3' : lugar === 2 ? 'sm:order-1' : 'sm:order-3'
      } ${fila.esActual ? 'ring-2 ring-sky-500 ring-offset-2' : ''}`}
    >
      <span className={`shrink-0 leading-none ${campeon ? 'text-3xl' : 'text-2xl'}`} role="img" aria-label={`Puesto ${lugar}`}>
        {estilo.medalla}
      </span>
      <Avatar clave={fila.clave} avatar={fila.avatar} grande={campeon} />
      <div className="min-w-0 flex-1 sm:w-full">
        <div className="flex items-center gap-2 sm:justify-center">
          <p className="truncate font-bold text-slate-900">{fila.alias}</p>
          {fila.esActual && <Vos />}
        </div>
        <p className="text-xs text-slate-500">{detalle(fila)}</p>
      </div>
      <div className="shrink-0 text-right sm:text-center">
        <p className={`font-bold tabular-nums ${campeon ? 'text-xl' : 'text-lg'} ${estilo.texto}`}>{valorPrincipal(fila, vista)}</p>
      </div>
    </li>
  )
}

const FilaLista = ({ fila, vista }: { fila: FilaOrdenada; vista: VistaRankingSala }) => (
  <li
    className={`flex items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-white px-3 py-2.5 ${
      fila.esActual ? 'ring-2 ring-sky-500' : ''
    }`}
  >
    <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-slate-500">{fila.puesto}</span>
    <Avatar clave={fila.clave} avatar={fila.avatar} />
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">{fila.alias}</p>
        {fila.esActual && <Vos />}
      </div>
      <p className="truncate text-xs text-slate-500">{fila.partidas > 0 ? detalle(fila) : 'Todavía no jugó'}</p>
    </div>
    <div className="shrink-0 text-right">
      <p className="text-base font-bold tabular-nums text-slate-900">{valorPrincipal(fila, vista)}</p>
    </div>
  </li>
)

/**
 * Ranking de la sala. La pestaña "Puntos" es la posición oficial (la calcula
 * el servidor); "Victorias" y "% aciertos" responden otras preguntas y se
 * presentan como tales, con su criterio explicado.
 */
const TablaSala = ({ tabla }: { tabla: FilaSala[] }) => {
  const [vista, setVista] = useState<VistaRankingSala>('puntos')

  const filas = ordenarTablaSala(tabla, vista)
  const conPartidas = filas.filter((fila) => fila.partidas > 0)
  const podio = conPartidas.slice(0, 3)
  const resto = filas.filter((fila) => !podio.includes(fila))
  const definicion = VISTAS_RANKING_SALA.find((item) => item.id === vista)

  return (
    <section aria-labelledby="titulo-ranking-sala" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="titulo-ranking-sala" className="text-lg font-bold text-slate-900">
          Ranking
        </h2>

        <div role="tablist" aria-label="Qué ranking ver" className="inline-flex rounded-2xl bg-slate-100 p-1">
          {VISTAS_RANKING_SALA.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={vista === item.id}
              onClick={() => setVista(item.id)}
              className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                vista === item.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.etiqueta}
            </button>
          ))}
        </div>
      </div>

      {podio.length > 0 && (
        <ol aria-label="Podio" className="grid gap-3 sm:grid-cols-3 sm:items-end">
          {podio.map((fila, indice) => (
            <TarjetaPodio key={fila.clave} fila={fila} vista={vista} lugar={(indice + 1) as 1 | 2 | 3} />
          ))}
        </ol>
      )}

      {resto.length > 0 && (
        <ol aria-label="Resto de la tabla" className="space-y-2">
          {resto.map((fila) => (
            <FilaLista key={fila.clave} fila={fila} vista={vista} />
          ))}
        </ol>
      )}

      {definicion && <p className="text-xs text-slate-500">{definicion.explicacion}</p>}
    </section>
  )
}

export default TablaSala

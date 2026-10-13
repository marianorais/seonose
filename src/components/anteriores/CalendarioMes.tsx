import { Link } from 'react-router-dom'

import { DIAS_SEMANA, celdasDelMes, estadoDelDia, tituloMes } from '../../lib/calendario'
import type { CeldaDia, DiaArchivo, EstadoDia } from '../../lib/calendario'
import { formatearFechaLarga } from '../../lib/fechas'

interface CalendarioMesProps {
  /** `YYYY-MM` */
  mes: string
  hoy: string
  archivo: ReadonlyMap<string, DiaArchivo>
  enCurso: (fecha: string) => boolean
}

/** Base común: mismo tamaño para todas las celdas (superficie táctil cómoda). */
const BASE =
  'relative flex min-h-[3.25rem] w-full flex-col items-center justify-center rounded-xl border px-0.5 py-1 text-center sm:min-h-[3.75rem] sm:rounded-2xl'

const INTERACTIVO =
  'motion-safe:transition hover:-translate-y-px hover:shadow-md active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2'

const ESTILOS: Record<EstadoDia, string> = {
  disponible: `${INTERACTIVO} border-slate-300 bg-white text-slate-900 shadow-sm hover:border-sky-500 hover:bg-sky-50`,
  'en-curso': `${INTERACTIVO} border-amber-400 bg-amber-50 text-amber-950 shadow-sm hover:bg-amber-100`,
  completado: `${INTERACTIVO} border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-400`,
  hoy: `${INTERACTIVO} border-slate-900 bg-slate-900 text-white shadow-md hover:bg-slate-800`,
  futuro: 'border-dashed border-slate-200 bg-transparent text-slate-300',
  'sin-desafio': 'border-transparent bg-slate-100 text-slate-400',
}

const NUMERO: Record<EstadoDia, string> = {
  disponible: 'text-slate-500',
  'en-curso': 'text-amber-800',
  completado: 'text-emerald-700',
  hoy: 'text-amber-300',
  futuro: 'text-slate-300',
  'sin-desafio': 'text-slate-400',
}

/** Texto para lectores de pantalla: el estado nunca depende sólo del color. */
const describir = (celda: CeldaDia) => {
  const fecha = formatearFechaLarga(celda.fecha)
  const desafio = celda.numero ? `, desafío #${celda.numero}` : ''

  switch (celda.estado) {
    case 'disponible':
      return `Jugar el desafío del ${fecha}${desafio}`
    case 'en-curso':
      return `Continuar el desafío del ${fecha}${desafio}: en curso`
    case 'completado': {
      const resultado =
        celda.detalle?.correctas != null ? `, ${celda.detalle.correctas} de ${celda.detalle.total} correctas` : ''
      return `${fecha}${desafio}: ${celda.detalle?.jugadaEnVivo ? 'lo jugaste ese día' : 'completado'}${resultado}`
    }
    case 'hoy':
      return `Hoy, ${fecha}${desafio}: ir al desafío del día`
    case 'futuro':
      return `${fecha}: todavía no salió`
    case 'sin-desafio':
      return `${fecha}: sin desafío para jugar`
  }
}

/** Marca chica en la esquina: refuerza el estado además del color. */
const Marca = ({ estado }: { estado: EstadoDia }) => {
  if (estado === 'completado') {
    return (
      <span className="absolute right-1 top-0.5 text-[0.6rem] font-bold text-emerald-600 sm:right-1.5 sm:top-1 sm:text-xs" aria-hidden>
        ✓
      </span>
    )
  }

  if (estado === 'en-curso') {
    return <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-500 sm:right-1.5 sm:top-1.5 sm:h-2 sm:w-2" aria-hidden />
  }

  return null
}

const Contenido = ({ celda }: { celda: CeldaDia }) => (
  <>
    <Marca estado={celda.estado} />
    <span className="text-sm font-bold leading-none tabular-nums sm:text-base">{celda.dia}</span>
    <span className={`mt-1 font-mono text-[0.6rem] leading-none sm:text-xs ${NUMERO[celda.estado]}`}>
      {celda.estado === 'hoy' ? 'Hoy' : celda.numero ? `#${celda.numero}` : celda.estado === 'sin-desafio' ? '—' : ' '}
    </span>
  </>
)

const Dia = ({ celda }: { celda: CeldaDia }) => {
  const clases = `${BASE} ${ESTILOS[celda.estado]}`
  const etiqueta = describir(celda)

  if (celda.estado === 'futuro' || celda.estado === 'sin-desafio') {
    return (
      <div className={clases} role="img" aria-label={etiqueta} aria-disabled="true">
        <Contenido celda={celda} />
      </div>
    )
  }

  // Hoy se juega desde el inicio; el resto, con el flujo de desafío anterior
  // (un completado abre su resultado, sin permitir otra partida).
  const destino = celda.estado === 'hoy' ? '/' : `/anteriores/${celda.fecha}`

  return (
    <Link to={destino} className={clases} aria-label={etiqueta} aria-current={celda.estado === 'hoy' ? 'date' : undefined}>
      <Contenido celda={celda} />
    </Link>
  )
}

/**
 * Un mes del archivo: tarjeta con el mes arriba, los días de la semana
 * (domingo primero) y la grilla de días, cada uno en su columna real.
 */
const CalendarioMes = ({ mes, hoy, archivo, enCurso }: CalendarioMesProps) => {
  const celdas = celdasDelMes(mes).map((fecha) => (fecha ? estadoDelDia(fecha, hoy, archivo, enCurso) : null))
  const porJugar = celdas.filter((celda) => celda?.estado === 'disponible' || celda?.estado === 'en-curso').length
  const jugados = celdas.filter((celda) => celda?.estado === 'completado').length
  const titulo = tituloMes(mes)

  return (
    <section aria-labelledby={`mes-${mes}`} className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
      <header className="mb-3 text-center sm:mb-4">
        <h2 id={`mes-${mes}`} className="text-lg font-bold text-slate-900 sm:text-xl">
          {titulo}
        </h2>
        {(porJugar > 0 || jugados > 0) && (
          <p className="mt-0.5 text-xs text-slate-500">
            {porJugar > 0 && `${porJugar} para jugar`}
            {porJugar > 0 && jugados > 0 && ' · '}
            {jugados > 0 && `${jugados} ${jugados === 1 ? 'jugado' : 'jugados'}`}
          </p>
        )}
      </header>

      <div className="grid grid-cols-7 gap-1 sm:gap-2" aria-hidden>
        {DIAS_SEMANA.map((dia) => (
          <abbr key={dia.largo} title={dia.largo} className="pb-1 text-center text-xs font-semibold text-slate-500 no-underline sm:text-sm">
            {dia.corto}
          </abbr>
        ))}
      </div>

      <ol className="grid grid-cols-7 gap-1 sm:gap-2" aria-label={`Días de ${titulo}`}>
        {celdas.map((celda, indice) => (
          <li key={celda?.fecha ?? `hueco-${indice}`} className={celda ? '' : 'pointer-events-none'} aria-hidden={celda ? undefined : true}>
            {celda && <Dia celda={celda} />}
          </li>
        ))}
      </ol>
    </section>
  )
}

export default CalendarioMes

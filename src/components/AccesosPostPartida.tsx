import { Link } from 'react-router-dom'

interface Acceso {
  to: string
  icono: string
  etiqueta: string
  titulo: string
  descripcion: string
}

/**
 * Lo siguiente para hacer después de terminar: competir con amigos o
 * recuperar días perdidos. Es el momento de mayor interés, así que va justo
 * debajo del resultado.
 */
const AccesosPostPartida = ({ esHistorico }: { esHistorico: boolean }) => {
  const accesos: Acceso[] = esHistorico
    ? [
        {
          to: '/anteriores',
          icono: '📅',
          etiqueta: 'Desafíos anteriores',
          titulo: 'Jugá otro día',
          descripcion: 'Todavía te quedan fechas por recuperar.',
        },
        {
          to: '/',
          icono: '🧠',
          etiqueta: 'Hoy',
          titulo: 'Volvé al desafío de hoy',
          descripcion: 'Es el que suma para el ranking de hoy.',
        },
      ]
    : [
        {
          to: '/salas',
          icono: '👥',
          etiqueta: 'Salas',
          titulo: 'Desafiá a tus amigos',
          descripcion: 'Creá una sala y descubrí quién sabe más.',
        },
        {
          to: '/anteriores',
          icono: '📅',
          etiqueta: 'Desafíos anteriores',
          titulo: '¿Te perdiste algún día?',
          descripcion: 'Todavía podés jugarlo.',
        },
      ]

  return (
    <nav aria-label="Qué hacer ahora" className="grid gap-3 sm:grid-cols-2">
      {accesos.map((acceso) => (
        <Link
          key={acceso.to}
          to={acceso.to}
          className="group flex items-center gap-4 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
        >
          <span className="text-3xl" aria-hidden>
            {acceso.icono}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-slate-500">
              {acceso.etiqueta}
            </span>
            <span className="block text-base font-bold text-slate-900">{acceso.titulo}</span>
            <span className="block text-sm text-slate-600">{acceso.descripcion}</span>
          </span>
          <span className="shrink-0 text-xl text-slate-400 transition group-hover:translate-x-1" aria-hidden>
            →
          </span>
        </Link>
      ))}
    </nav>
  )
}

export default AccesosPostPartida

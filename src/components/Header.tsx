import { Link, useLocation } from 'react-router-dom'

import { MOSTRAR_ACCESO_RANKING } from '../lib/featureFlags'

/** Props para el componente `Header`. Son callbacks que controlan modales/sidebars. */
interface HeaderProps {
  onOpenSidebar: () => void
  onOpenSettings: () => void
  onOpenStats: () => void
  /**
   * Modo compacto para usar durante una partida: misma barra y los MISMOS
   * controles, pero en una sola fila baja (~53px en lugar de ~113px). No se
   * mueve ni se esconde ninguna función: sólo dejan de comerse la pantalla
   * cuando lo que importa es la pregunta.
   */
  compacto?: boolean
}

/**
 * `Header` - Barra superior con logo y accesos a menús.
 * Recibe handlers externos; no mantiene estado interno.
 *
 * El acceso al ranking vive acá y no en cada pantalla porque este header lo usan
 * todas: así queda disponible en el inicio y en todos los módulos con un solo
 * punto de definición.
 */
const Header = ({ onOpenSidebar, onOpenSettings, onOpenStats, compacto = false }: HeaderProps) => {
  const { pathname } = useLocation()
  const enRanking = pathname === '/ranking'

  // Un solo lugar donde cambia la densidad: el resto del markup es idéntico.
  const d = compacto
    ? {
        header: 'px-3 py-2 header-compacto md:px-4',
        logo: 'h-20',
        control: 'px-2.5 py-1.5 text-sm',
        gap: 'gap-2',
      }
    : {
        header: 'px-4 py-4 md:px-6',
        logo: 'h-20',
        control: 'px-3 py-2',
        gap: 'gap-2 sm:gap-3',
      }

  return (
    <header
      className={`sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-sm ${d.header}`}
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 md:gap-4">
        <button
          type="button"
          onClick={onOpenSidebar}
          className={`rounded-2xl border border-slate-200 bg-white/90 text-slate-700 shadow-sm transition hover:bg-slate-100 ${d.control}`}
          aria-label="Abrir menú"
        >
          ☰
        </button>

        <div className="flex flex-1 items-center justify-center text-center">
          <Link to="/">
            <img
              src={new URL('../assets/logo.png', import.meta.url).href}
              alt="Logo de la aplicación"
              className={`w-auto cursor-pointer object-contain transition hover:opacity-90 ${d.logo}`}
            />
          </Link>
        </div>

        <div className={`flex items-center ${d.gap}`}>
          {/*
            Acceso al ranking. Va primero del grupo —el lugar más visible— y con
            acento ámbar para diferenciarlo de los controles utilitarios: es una
            invitación a competir, no un ajuste. El texto aparece desde `sm`; en
            celular queda sólo el ícono para no apretar la barra.
          */}
          {MOSTRAR_ACCESO_RANKING && (
            <Link
              to="/ranking"
              aria-label="Ver el ranking general"
              aria-current={enRanking ? 'page' : undefined}
              title="Ranking general"
              className={`inline-flex items-center gap-2 rounded-2xl border font-semibold shadow-sm transition ${d.control} ${
                enRanking
                  ? 'border-amber-400 bg-amber-100 text-amber-900'
                  : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <span aria-hidden>🏆</span>
              {!compacto && <span className="hidden text-sm sm:inline">Ranking</span>}
            </Link>
          )}

          {!compacto && (
            <span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">👤</span>
          )}

          <button
            type="button"
            className={`rounded-2xl border border-slate-200 bg-white/90 text-slate-700 shadow-sm transition hover:bg-slate-100 ${d.control}`}
            aria-label="Resultados"
            onClick={onOpenStats}
          >
            📊
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className={`rounded-2xl border border-slate-200 bg-white/90 text-slate-700 shadow-sm transition hover:bg-slate-100 ${d.control}`}
            aria-label="Ajustes"
          >
            ⚙️
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header

import { useState } from 'react'
import type { ReactNode } from 'react'

import Header from './Header'
import Sidebar from './Sidebar'
import SettingsModal from './SettingsModal'
import StatsModal from './StatsModal'

import { loadThemeConfig } from '../lib/themeConfig'
import { useConfiguracionJuego } from '../lib/configuracionJuego'

interface PaginaBaseProps {
  children: ReactNode
  /** Clases extra del contenedor (por ejemplo, el alto fijo durante una partida). */
  className?: string
  /** Clases del `<main>`. Por defecto, el ancho y los márgenes de las páginas. */
  mainClassName?: string
}

/**
 * Armado común de las páginas secundarias: header, menú, ajustes y
 * estadísticas. Es el mismo que repetía cada página (ver `RankingPage`), en un
 * solo lugar para las nuevas.
 */
const PaginaBase = ({ children, className = 'min-h-screen', mainClassName = 'mx-auto w-full max-w-3xl px-4 py-5 sm:py-8' }: PaginaBaseProps) => {
  const [showSidebar, setShowSidebar] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [themeConfig] = useState(() => loadThemeConfig())
  const settings = useConfiguracionJuego()

  return (
    <div
      className={`text-slate-900 ${className}`}
      style={{
        backgroundColor: themeConfig.backgroundColor ?? '#f8fafc',
        fontFamily: themeConfig.fontFamily ?? 'sans-serif',
      }}
    >
      <Header
        onOpenSidebar={() => setShowSidebar(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenStats={() => setShowStats(true)}
      />

      <main className={mainClassName}>{children}</main>

      <Sidebar isOpen={showSidebar} onClose={() => setShowSidebar(false)} />

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} settings={settings} />

      {showStats && <StatsModal onClose={() => setShowStats(false)} />}
    </div>
  )
}

/** Encabezado oscuro de las páginas, igual al del ranking. */
export const Portada = ({
  etiqueta,
  icono,
  titulo,
  bajada,
  children,
}: {
  etiqueta: string
  icono: string
  titulo: string
  bajada?: ReactNode
  children?: ReactNode
}) => (
  <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 px-5 py-5 shadow-lg sm:px-7 sm:py-6">
    <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-amber-400/20 blur-2xl" aria-hidden />
    <div className="relative">
      <p className="text-[0.65rem] uppercase tracking-[0.3em] text-amber-300 sm:text-xs">{etiqueta}</p>
      <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-white sm:text-3xl">
        <span aria-hidden>{icono}</span>
        <span className="min-w-0 break-words">{titulo}</span>
      </h1>
      {bajada && <p className="mt-2 text-sm text-slate-300 sm:text-base">{bajada}</p>}
      {children}
    </div>
  </div>
)

export default PaginaBase

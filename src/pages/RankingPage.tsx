/**
 * Pantalla /ranking - Podio de jugadores por día, mes y año.
 * Sigue el mismo armado que las otras páginas (header + main + sidebar) y sólo
 * lee datos ya existentes en Supabase; no escribe nada.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'

import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import SettingsModal from '../components/SettingsModal'
import StatsModal from '../components/StatsModal'
import RankingBoard from '../components/RankingBoard'

import { loadThemeConfig } from '../lib/themeConfig'
import { loadCustomSettings } from '../lib/appHelpers'

function RankingPage() {
  const [showSidebar, setShowSidebar] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [themeConfig] = useState(() => loadThemeConfig())
  const [settings] = useState(() => loadCustomSettings())

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
        onOpenSettings={() => setShowSettings(true)}
        onOpenStats={() => setShowStats(true)}
      />

      <main className="mx-auto w-full max-w-3xl px-4 py-5 sm:py-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 px-5 py-5 shadow-lg sm:px-7 sm:py-6">
          <div
            className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-amber-400/20 blur-2xl"
            aria-hidden
          />
          <div className="relative">
            <p className="text-[0.65rem] uppercase tracking-[0.3em] text-amber-300 sm:text-xs">Ranking</p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-white sm:text-3xl">
              <span aria-hidden>🏆</span>
              <span>Los mejores de Se o NoSe</span>
            </h1>
            <p className="mt-2 text-xs text-slate-300 sm:text-sm">
              Quién respondió mejor y cuánto tardó en promedio.
            </p>
          </div>
        </div>

        <div className="mt-5 sm:mt-6">
          <RankingBoard />
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            ← Volver al juego
          </Link>
        </div>
      </main>

      <Sidebar isOpen={showSidebar} onClose={() => setShowSidebar(false)} />

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} settings={settings} />

      {showStats && <StatsModal onClose={() => setShowStats(false)} />}
    </div>
  )
}

export default RankingPage

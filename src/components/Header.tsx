interface HeaderProps {
  onOpenSidebar: () => void
  onOpenSettings: () => void
  onOpenStats: () => void
}

const Header = ({ onOpenSidebar, onOpenSettings, onOpenStats }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-4 py-4 shadow-sm md:px-6">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-slate-700 shadow-sm transition hover:bg-slate-100"
          aria-label="Abrir menú"
        >
          ☰
        </button>

        <div className="flex flex-1 flex-col items-center text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Juego diario</p>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">SEONOSE</h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">👤</span>
          <button
            type="button"
            className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-slate-700 shadow-sm transition hover:bg-slate-100"
            aria-label="Resultados"
            onClick={onOpenStats}
          >
            📊
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-slate-700 shadow-sm transition hover:bg-slate-100"
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

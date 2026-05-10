import { useEffect, useState } from 'react'

interface Result {
  date: string
  total: number
  correct: number
  percentage: number
}

interface StatsModalProps {
  onClose: () => void
}

const StatsModal = ({ onClose }: StatsModalProps) => {
  const [stats, setStats] = useState({ totalGames: 0, totalCorrect: 0, avgPercentage: 0 })

  useEffect(() => {
    try {
      const history = JSON.parse(window.localStorage.getItem('seonose-results-history') ?? '[]')
      if (history.length === 0) {
        setStats({ totalGames: 0, totalCorrect: 0, avgPercentage: 0 })
        return
      }
      
      const totalGames = history.length
      const totalCorrect = history.reduce((sum: number, r: Result) => sum + r.correct, 0)
      const avgPercentage = Math.round(history.reduce((sum: number, r: Result) => sum + r.percentage, 0) / history.length)
      
      setStats({ totalGames, totalCorrect, avgPercentage })
    } catch {
      setStats({ totalGames: 0, totalCorrect: 0, avgPercentage: 0 })
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Estadísticas</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">Resumen del juego</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        {stats.totalGames === 0 ? (
          <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
            Aún no hay partidas guardadas. Juega para ver tus estadísticas en este panel.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-2xl font-bold text-slate-900 sm:text-3xl">{stats.totalGames}</p>
              <p className="mt-2 text-xs text-slate-600 sm:text-sm">Partidas</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-2xl font-bold text-slate-900 sm:text-3xl">{stats.totalCorrect}</p>
              <p className="mt-2 text-xs text-slate-600 sm:text-sm">Aciertos</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-2xl font-bold text-slate-900 sm:text-3xl">{stats.avgPercentage}%</p>
              <p className="mt-2 text-xs text-slate-600 sm:text-sm">Exactitud</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StatsModal

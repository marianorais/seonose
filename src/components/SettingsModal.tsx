import type { QuestionSettings } from '../types'

type VisualTheme = 'light' | 'dark' | 'black' | 'blue' | 'sepia'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  settings: QuestionSettings | null
  visualTheme: VisualTheme
  onChangeTheme: (theme: VisualTheme) => void
}

const SettingsModal = ({ isOpen, onClose, settings, visualTheme, onChangeTheme }: SettingsModalProps) => {
  if (!isOpen) return null

  const themes = [
    { id: 'light', label: 'Claro', description: 'Limpio y fresco', style: 'bg-white text-gray-900' },
    { id: 'dark', label: 'Oscuro', description: 'Moderno y suave', style: 'bg-slate-900 text-slate-100' },
    { id: 'black', label: 'Negro', description: 'Contraste total', style: 'bg-black text-white' },
    { id: 'blue', label: 'Azul', description: 'Fresco y relajado', style: 'bg-sky-100 text-slate-950' },
    { id: 'sepia', label: 'Sepia', description: 'Cálido y suave', style: 'bg-[#f7ede2] text-slate-950' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Ajustes visuales</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">Tema y estilo</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
            aria-label="Cerrar ajustes"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Tema de pantalla</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => onChangeTheme(theme.id as VisualTheme)}
                  className={`group flex flex-col items-start gap-3 rounded-[1.5rem] border px-4 py-4 text-left transition hover:border-sky-400 ${
                    visualTheme === theme.id ? 'border-sky-600 bg-sky-50 shadow-sm' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className={`flex h-10 w-full items-center justify-center rounded-2xl border ${theme.style}`}>{theme.label}</div>
                  <p className="text-sm text-slate-600 group-hover:text-slate-900">{theme.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Detalles del día</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Elige un tema para adaptar la experiencia a tu estilo. El modo sepia es ideal para lectura prolongada en pantalla.</p>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Configuración actual</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{settings?.questionsPerDay ?? '-'} preguntas · {settings?.secondsPerQuestion ?? '-'}s</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal

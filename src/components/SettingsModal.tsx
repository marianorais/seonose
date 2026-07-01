import type { QuestionSettings } from '../types'

type VisualTheme = 'light' | 'dark' | 'black' | 'blue' | 'sepia'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  settings: QuestionSettings | null
  visualTheme: VisualTheme
  onChangeTheme: (theme: VisualTheme) => void
}

const SettingsModal = ({ isOpen, onClose, settings }: SettingsModalProps) => {
  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-slate-950/30 backdrop-blur-sm"
        onClick={onClose}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-3xl max-h-[90vh] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_35px_90px_rgba(15,23,42,0.15)]" style={{ height: '-webkit-fill-available' }}>
          <div className="relative border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5 text-center">
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Ajustes</h2>
            <p className="mt-2 text-sm text-slate-500">Juego diario: {settings?.questionsPerDay ?? 5} preguntas · {settings?.secondsPerQuestion ?? 30}s por pregunta</p>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 sm:right-6 sm:top-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-slate-700 transition hover:bg-slate-200 hover:text-slate-900"
              aria-label="Cerrar ajustes"
            >
              ×
            </button>
          </div>

          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="space-y-6 px-6 py-6 sm:px-8 sm:py-8">
            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 sm:p-6">
              <div className="grid gap-4">
                <div className="rounded-[18px] border border-slate-200 bg-white p-4 sm:p-5">
                  <p className="text-sm font-medium text-slate-900">Cómo se juega</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-500">
                    <li className="flex gap-2"><span className="text-emerald-600">•</span> Cada día hay una nueva tanda de preguntas.</li>
                    <li className="flex gap-2"><span className="text-emerald-600">•</span> Tenés un tiempo limitado para responder cada una.</li>
                    <li className="flex gap-2"><span className="text-emerald-600">•</span> Sumá aciertos y volvé mañana por más.</li>
                    <li className="flex gap-2"><span className="text-emerald-600">•</span> No te olvides de compartirlo y competir con tus amigos.</li>
                  </ul>
                </div>

                <div className="rounded-[18px] border border-slate-200 bg-white p-4 sm:p-5">
                  <p className="text-sm font-medium text-slate-900">Sobre Se o NoSe</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Un juego de preguntas diarias para poner a prueba cuánto sabés. Nuevas preguntas todos los días.
                  </p>
                </div>
              </div>
            </div>
          </div>
          </div>

          <div className="border-t border-slate-200 px-4 py-4 sm:px-6 text-center text-xs text-slate-400">
            <span className="text-slate-400"></span>
          </div>
        </div>
      </div>
    </>
  )
}

export default SettingsModal

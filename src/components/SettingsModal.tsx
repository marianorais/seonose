import { useState } from 'react'
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
  const [colorBlind, setColorBlind] = useState(false)
  const [accessibilityHelp, setAccessibilityHelp] = useState(false)
  const [animations, setAnimations] = useState(true)
  const [exportCode, setExportCode] = useState('')
  const [importCode, setImportCode] = useState('')

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
                <div className="grid gap-2 rounded-[18px] border border-slate-200 bg-white p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Cambiar tema</p>
                    </div>
                    <select
                      value={visualTheme}
                      onChange={(event) => onChangeTheme(event.target.value as VisualTheme)}
                      className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    >
                      <option value="light">Sistema</option>
                      <option value="dark">Oscuro</option>
                      <option value="black">Negro</option>
                      <option value="blue">Azul</option>
                      <option value="sepia">Sepia</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-2 rounded-[18px] border border-slate-200 bg-white p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Modo para Daltónicos</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setColorBlind((value) => !value)}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full border transition ${
                        colorBlind ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-slate-200'
                      }`}
                    >
                      <span className={`inline-block h-6 w-6 rounded-full bg-white shadow transition ${colorBlind ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>

                <div className="grid gap-2 rounded-[18px] border border-slate-200 bg-white p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Ayudas de accesibilidad</p>
                      <p className="mt-1 text-sm text-slate-500">Dar click en las letras muestra el estado. Letras más grandes.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAccessibilityHelp((value) => !value)}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full border transition ${
                        accessibilityHelp ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-slate-200'
                      }`}
                    >
                      <span className={`inline-block h-6 w-6 rounded-full bg-white shadow transition ${accessibilityHelp ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>

                <div className="grid gap-2 rounded-[18px] border border-slate-200 bg-white p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Animaciones en el tablero</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAnimations((value) => !value)}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full border transition ${
                        animations ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-slate-200'
                      }`}
                    >
                      <span className={`inline-block h-6 w-6 rounded-full bg-white shadow transition ${animations ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>

                <div className="rounded-[18px] border border-slate-200 bg-white p-4 sm:p-5">
                  <p className="text-sm font-medium text-slate-900">Exportar / Migrar Estadísticas</p>
                  <p className="mt-1 text-sm text-slate-500">Genera un código para mover tus estadísticas a la app o a otro dispositivo.</p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      value={exportCode}
                      onChange={(event) => setExportCode(event.target.value)}
                      placeholder="Haz clic en 'Generar'"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                    <button
                      type="button"
                      className="inline-flex h-11 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      Generar
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-emerald-500 bg-white px-5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                    >
                      Código QR
                    </button>
                  </div>
                </div>

                <div className="rounded-[18px] border border-slate-200 bg-white p-4 sm:p-5">
                  <p className="text-sm font-medium text-slate-900">Importar Estadísticas</p>
                  <p className="mt-1 text-sm text-slate-500">Pega el código que generaste en tu otro dispositivo.</p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      value={importCode}
                      onChange={(event) => setImportCode(event.target.value)}
                      placeholder="Pega el código aquí..."
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                    <button
                      type="button"
                      className="inline-flex h-11 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      Importar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>

          <div className="border-t border-slate-200 px-4 py-4 sm:px-6 text-center text-xs text-slate-400">
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <a href="#" className="underline decoration-slate-300 underline-offset-4 transition hover:text-slate-700">Política de privacidad</a>
              <a href="#" className="underline decoration-slate-300 underline-offset-4 transition hover:text-slate-700">Opciones de cookies y privacidad</a>
              <span className="text-slate-400">v574</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default SettingsModal

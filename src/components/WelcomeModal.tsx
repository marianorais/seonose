import { useEffect, useRef } from 'react'

interface WelcomeModalProps {
  questionsCount: number
  secondsPerQuestion: number
  challengeLabel: string
  onStart: () => void
  onClose: () => void
}

const WelcomeModal = ({
  questionsCount,
  secondsPerQuestion,
  challengeLabel,
  onStart,
  onClose,
}: WelcomeModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const startButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const closeOnEscape = (event: Event) => {
      event.preventDefault()
      onClose()
    }

    if (typeof dialog.showModal === 'function') {
      dialog.showModal()
    } else {
      dialog.setAttribute('open', '')
    }
    dialog.addEventListener('cancel', closeOnEscape)
    startButtonRef.current?.focus()

    return () => {
      dialog.removeEventListener('cancel', closeOnEscape)
      if (dialog.open && typeof dialog.close === 'function') dialog.close()
    }
  }, [onClose])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="welcome-title"
      aria-describedby="welcome-description"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      className="welcome-dialog fixed inset-0 m-auto max-h-[min(94dvh,36rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-[1.75rem] border border-slate-200 bg-white p-0 text-slate-900 shadow-[0_35px_90px_rgba(15,23,42,0.25)]"
    >
      <div className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-sky-200/60 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-indigo-200/50 blur-3xl" />

        <div className="relative px-5 pb-4 pt-5 sm:px-7 sm:pb-5 sm:pt-6">
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar bienvenida"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-2xl leading-none text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4959a6]/30"
          >
            <span aria-hidden="true">×</span>
          </button>
          <div className="text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-sky-800">
              <span aria-hidden="true">✦</span>
              {challengeLabel}
            </p>
            <h1 id="welcome-title" className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              SE<span className="text-[#4959a6]">o</span>NOSE
            </h1>
            <p id="welcome-description" className="mx-auto mt-1 max-w-sm text-sm font-medium leading-snug text-slate-600 sm:text-base">
              ¿Cuánto sabés? Poné a prueba tus conocimientos.
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-sky-100 bg-white/85 px-4 py-3 text-center shadow-sm">
            <p className="text-sm font-semibold leading-relaxed text-slate-700">
              Respondé, sumá aciertos y jugá contra el reloj.
            </p>
          </div>

          <p className="mt-3 text-center text-xs leading-relaxed text-slate-500 sm:text-sm">
            De Historia y Geografía a Música, Deportes y mucho más.
          </p>

          <ul className="mt-4 grid grid-cols-3 gap-2" aria-label="Cómo se juega">
            <li className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white/90 px-2 py-2.5 text-center">
              <span aria-hidden="true" className="text-lg leading-none">🧠</span>
              <span className="text-xs font-semibold leading-tight text-slate-700">
                Elegí tu respuesta
              </span>
            </li>
            <li className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white/90 px-2 py-2.5 text-center">
              <span aria-hidden="true" className="text-lg leading-none">⏱️</span>
              <span className="text-xs font-semibold leading-tight text-slate-700">
                <strong className="text-slate-900">{secondsPerQuestion} s</strong> por pregunta
              </span>
            </li>
            <li className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white/90 px-2 py-2.5 text-center">
              <span aria-hidden="true" className="text-lg leading-none">🎯</span>
              <span className="text-xs font-semibold leading-tight text-slate-700">
                <strong className="text-slate-900">{questionsCount}</strong> preguntas
              </span>
            </li>
          </ul>
        </div>

        <div className="border-t border-slate-100 bg-white/95 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-7 sm:py-4">
          <button
            ref={startButtonRef}
            type="button"
            onClick={onStart}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#4959a6] px-6 py-3 text-base font-bold text-white shadow-lg shadow-[#4959a6]/25 transition hover:-translate-y-0.5 hover:bg-[#3f4c8f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4959a6]/40 active:translate-y-0 motion-reduce:transition-none"
          >
            ¡JUGAR AHORA! <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </dialog>
  )
}

export default WelcomeModal

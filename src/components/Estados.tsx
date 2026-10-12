import { useState } from 'react'
import type { ReactNode } from 'react'

/** Estado de carga. Lleva texto para lectores de pantalla, no sólo una animación. */
export const Cargando = ({ texto = 'Cargando…' }: { texto?: string }) => (
  <div role="status" className="flex items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-8 text-slate-600">
    <span className="h-5 w-5 rounded-full border-2 border-slate-300 border-t-slate-700 motion-safe:animate-spin" aria-hidden />
    <span>{texto}</span>
  </div>
)

/** Error con opción de reintentar. */
export const MensajeError = ({ mensaje, onReintentar }: { mensaje: string; onReintentar?: () => void }) => (
  <div role="alert" className="rounded-3xl border border-red-200 bg-red-50 px-5 py-5 text-red-800">
    <p className="font-semibold">
      <span aria-hidden>⚠️ </span>
      {mensaje}
    </p>
    {onReintentar && (
      <button
        type="button"
        onClick={onReintentar}
        className="mt-3 rounded-2xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800"
      >
        Probar de nuevo
      </button>
    )}
  </div>
)

/** Estado vacío: ícono, mensaje y, si corresponde, una acción. */
export const EstadoVacio = ({ icono, titulo, children }: { icono: string; titulo: string; children?: ReactNode }) => (
  <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
    <p className="text-4xl" aria-hidden>
      {icono}
    </p>
    <p className="mt-3 text-lg font-bold text-slate-900">{titulo}</p>
    {children && <div className="mt-2 text-sm text-slate-600">{children}</div>}
  </div>
)

/**
 * Botón de acción destructiva con confirmación en el lugar (sin ventanas
 * emergentes del navegador): el primer toque pide confirmar, el segundo ejecuta.
 */
export const BotonConfirmado = ({
  etiqueta,
  pregunta,
  confirmar,
  onConfirmar,
  ocupado = false,
}: {
  etiqueta: string
  pregunta: string
  confirmar: string
  onConfirmar: () => void
  ocupado?: boolean
}) => {
  const [preguntando, setPreguntando] = useState(false)

  if (!preguntando) {
    return (
      <button
        type="button"
        onClick={() => setPreguntando(true)}
        className="w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
      >
        {etiqueta}
      </button>
    )
  }

  return (
    <div role="group" aria-label={pregunta} className="rounded-2xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-semibold text-red-900">{pregunta}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setPreguntando(false)}
          disabled={ocupado}
          className="rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirmar}
          disabled={ocupado}
          className="rounded-2xl bg-red-700 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-50"
        >
          {ocupado ? 'Un momento…' : confirmar}
        </button>
      </div>
    </div>
  )
}

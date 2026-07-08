/**
 * Vista interna /mejoras (ruta discreta, sin link visible en la UI).
 * Lista todas las mejoras/sugerencias enviadas por los usuarios.
 */
import { useEffect, useState } from 'react'

import Header from '../components/Header'
import Sidebar from '../components/Sidebar'

import { loadThemeConfig } from '../lib/themeConfig'
import { fetchMejoras } from '../lib/mejorasHelpers'
import type { Mejora } from '../lib/mejorasHelpers'

const formatearFecha = (iso: string) => {
  try {
    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Argentina/Buenos_Aires',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function MejorasPage() {
  const [showSidebar, setShowSidebar] = useState(false)
  const [themeConfig] = useState(() => loadThemeConfig())
  const [mejoras, setMejoras] = useState<Mejora[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let activo = true

    const cargar = async () => {
      try {
        const data = await fetchMejoras()
        if (activo) setMejoras(data)
      } catch {
        if (activo) setError(true)
      } finally {
        if (activo) setLoading(false)
      }
    }

    cargar()

    return () => {
      activo = false
    }
  }, [])

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
        onOpenSettings={() => {}}
        onOpenStats={() => {}}
      />

      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Mejoras enviadas</h1>
          <p className="mt-2 text-sm text-slate-500">
            Sugerencias de los usuarios desde el formulario de contacto.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">
            Cargando mejoras...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700 shadow-sm">
            No se pudieron cargar las mejoras.
          </div>
        ) : mejoras.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">
            Todavía no hay mejoras enviadas.
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">{mejoras.length} mejora(s)</p>

            {mejoras.map((mejora) => (
              <div key={mejora.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="whitespace-pre-wrap text-slate-900">{mejora.texto}</p>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>{formatearFecha(mejora.created_at)}</span>
                  {mejora.nombre && <span>· {mejora.nombre}</span>}
                  {mejora.telefono && (
                    <a href={`tel:${mejora.telefono}`} className="text-sky-600 hover:underline">
                      📞 {mejora.telefono}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Sidebar isOpen={showSidebar} onClose={() => setShowSidebar(false)} />
    </div>
  )
}

export default MejorasPage

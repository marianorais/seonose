import { useEffect, useState } from 'react'

import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import SettingsModal from '../components/SettingsModal'
import StatsModal from '../components/StatsModal'

import { loadThemeConfig } from '../lib/themeConfig'
import { fetchBoletinesActivos, type Boletin } from '../lib/boletinesHelpers'

const renderizarDescripcion = (texto: string) => {
  const formato =
    /\*\*(.+?)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>()]+)|@([A-Za-z0-9._]{1,30})/g
  const nodos: React.ReactNode[] = []
  let inicio = 0
  let coincidencia: RegExpExecArray | null

  while ((coincidencia = formato.exec(texto)) !== null) {
    const esMencion = coincidencia[5] !== undefined
    const caracterAnterior = texto.charAt(coincidencia.index - 1)
    if (esMencion && /[A-Za-z0-9_.+-]/.test(caracterAnterior)) {
      continue
    }

    if (coincidencia.index > inicio) {
      nodos.push(texto.slice(inicio, coincidencia.index))
    }

    let finCoincidencia = formato.lastIndex
    if (coincidencia[1] !== undefined) {
      nodos.push(<strong key={coincidencia.index}>{coincidencia[1]}</strong>)
    } else {
      const urlMarkdown = coincidencia[3]
      const urlDirecta = coincidencia[4]
      const handleInstagram = coincidencia[5]
      const url = urlMarkdown ?? (
        urlDirecta
          ? urlDirecta.replace(/[.,!?;:]+$/, '')
          : `https://www.instagram.com/${handleInstagram}/`
      )
      const textoEnlace = coincidencia[2] ?? (
        urlDirecta
          ? urlDirecta.slice(0, url.length)
          : `@${handleInstagram}`
      )
      if (urlDirecta) {
        finCoincidencia = coincidencia.index + url.length
      }

      nodos.push(
        <a
          key={coincidencia.index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-700 underline decoration-sky-400 underline-offset-2 hover:text-sky-900"
        >
          {textoEnlace}
        </a>
      )
    }

    inicio = finCoincidencia
  }

  if (inicio < texto.length) {
    nodos.push(texto.slice(inicio))
  }

  return nodos
}

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

function BoletinInformativoPage() {
  const [showSidebar, setShowSidebar] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [themeConfig] = useState(() => loadThemeConfig())

  const [boletines, setBoletines] = useState<Boletin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let activo = true

    const cargar = async () => {
      try {
        const data = await fetchBoletinesActivos()
        if (activo) setBoletines(data)
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
        onOpenSettings={() => setShowSettings(true)}
        onOpenStats={() => setShowStats(true)}
      />

      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Boletín Informativo</h1>
          <p className="mt-2 text-sm text-slate-500">
            Novedades, mejoras y anuncios del sistema.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">
            Cargando novedades...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700 shadow-sm">
            No se pudieron cargar las novedades.
          </div>
        ) : boletines.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">
            Todavía no hay novedades disponibles.
          </div>
        ) : (
          <div className="space-y-4">
            {boletines.map((boletin) => (
              <article
                key={boletin.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-xl font-bold text-slate-900">{boletin.titulo}</h2>
                  <time className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {formatearFecha(boletin.fecha_creacion)}
                  </time>
                </div>

                <div className="whitespace-pre-wrap break-words text-base leading-7 text-slate-700">
                  {renderizarDescripcion(boletin.descripcion)}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <Sidebar isOpen={showSidebar} onClose={() => setShowSidebar(false)} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} settings={null} />
      {showStats && <StatsModal onClose={() => setShowStats(false)} />}
    </div>
  )
}

export default BoletinInformativoPage

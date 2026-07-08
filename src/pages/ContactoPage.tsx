/**
 * Pantalla /contacto: formulario para que los usuarios envíen sugerencias
 * de mejora. Se guardan en la tabla `mejoras` de Supabase.
 */
import { useState } from 'react'

import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import SettingsModal from '../components/SettingsModal'
import StatsModal from '../components/StatsModal'

import { loadThemeConfig } from '../lib/themeConfig'
import { enviarMejora } from '../lib/mejorasHelpers'
import { getClientInfo } from '../lib/userSession'

function ContactoPage() {
  const [showSidebar, setShowSidebar] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [themeConfig] = useState(() => loadThemeConfig())

  const [texto, setTexto] = useState('')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setError('')
    setSuccess(false)

    if (texto.trim().length === 0) {
      setError('Escribí tu mejora antes de enviar.')
      return
    }

    try {
      setLoading(true)

      const clientInfo = await getClientInfo()

      const { error: insertError } = await enviarMejora({
        texto,
        nombre,
        telefono,
        userip: clientInfo.ip,
        useragent: clientInfo.userAgent,
      })

      if (insertError) {
        console.error(insertError)
        setError('No se pudo enviar. Intentá de nuevo en un momento.')
        return
      }

      setSuccess(true)
      setTexto('')
      setNombre('')
      setTelefono('')
    } catch (exception) {
      console.error(exception)
      setError('Ocurrió un error inesperado.')
    } finally {
      setLoading(false)
    }
  }

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

      <main className="mx-auto w-full max-w-2xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Contáctenos</h1>
          <p className="mt-2 text-sm text-slate-500">
            ¿Tenés una idea para mejorar Se o NoSe? Contanos y la revisamos.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {success ? (
            <div className="space-y-4 text-center">
              <p className="text-lg font-semibold text-emerald-600">¡Gracias por tu mensaje! 🎉</p>
              <p className="text-sm text-slate-600">Recibimos tu sugerencia. La vamos a tener en cuenta.</p>
              <button
                type="button"
                onClick={() => setSuccess(false)}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Enviar otra
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium">Tu mejora o sugerencia *</label>
                <textarea
                  value={texto}
                  onChange={(event) => setTexto(event.target.value)}
                  rows={5}
                  maxLength={2000}
                  placeholder="Contanos qué te gustaría mejorar..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
                />
                <p className="mt-1 text-right text-xs text-slate-400">{texto.length}/2000</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Nombre (opcional)</label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(event) => setNombre(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Teléfono (opcional)</label>
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(event) => setTelefono(event.target.value)}
                    placeholder="Para poder responderte"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Enviar mejora'}
              </button>
            </form>
          )}
        </div>
      </main>

      <Sidebar isOpen={showSidebar} onClose={() => setShowSidebar(false)} />

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} settings={null} />

      {showStats && <StatsModal onClose={() => setShowStats(false)} />}
    </div>
  )
}

export default ContactoPage

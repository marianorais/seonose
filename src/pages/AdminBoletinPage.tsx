import { useEffect, useState } from 'react'

import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import SettingsModal from '../components/SettingsModal'
import StatsModal from '../components/StatsModal'

import { loadThemeConfig } from '../lib/themeConfig'
import {
  createBoletin,
  deleteBoletin,
  fetchBoletinesAdmin,
  updateBoletin,
  type Boletin,
} from '../lib/boletinesHelpers'

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

function AdminBoletinPage() {
  const [showSidebar, setShowSidebar] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [themeConfig] = useState(() => loadThemeConfig())

  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [activo, setActivo] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [boletines, setBoletines] = useState<Boletin[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const cargarBoletines = async () => {
    try {
      const data = await fetchBoletinesAdmin()
      setBoletines(data)
    } catch {
      setError('No se pudieron cargar los boletines.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void cargarBoletines()
  }, [])

  const resetForm = () => {
    setTitulo('')
    setDescripcion('')
    setActivo(true)
    setEditingId(null)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    const tituloLimpio = titulo.trim()
    const descripcionLimpia = descripcion.trim()

    if (!tituloLimpio || !descripcionLimpia) {
      setError('Título y descripción son obligatorios.')
      return
    }

    try {
      setSaving(true)

      if (editingId !== null) {
        await updateBoletin(editingId, { titulo: tituloLimpio, descripcion: descripcionLimpia, activo })
        setSuccess('Boletín actualizado correctamente.')
      } else {
        await createBoletin({ titulo: tituloLimpio, descripcion: descripcionLimpia, activo })
        setSuccess('Boletín creado correctamente.')
      }

      resetForm()
      await cargarBoletines()
    } catch (exception) {
      const detalle = exception instanceof Error ? exception.message : 'Sin detalle disponible.'
      console.error('No se pudo guardar el boletín:', detalle)
      setError(`No se pudo guardar el boletín. Reintentá en unos segundos. ${detalle}`)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (boletin: Boletin) => {
    setEditingId(boletin.id)
    setTitulo(boletin.titulo)
    setDescripcion(boletin.descripcion)
    setActivo(boletin.activo)
    setError('')
    setSuccess('')
  }

  const handleToggle = async (boletin: Boletin) => {
    try {
      await updateBoletin(boletin.id, { activo: !boletin.activo })
      await cargarBoletines()
      setSuccess(`El boletín “${boletin.titulo}” quedó ${!boletin.activo ? 'activo' : 'inactivo'}.`)
    } catch (exception) {
      const detalle = exception instanceof Error ? exception.message : 'Sin detalle disponible.'
      console.error('No se pudo cambiar el estado del boletín:', detalle)
      setError(`No se pudo cambiar el estado del boletín. ${detalle}`)
    }
  }

  const handleDelete = async (boletin: Boletin) => {
    const confirmar = window.confirm(`¿Querés eliminar “${boletin.titulo}”?`)
    if (!confirmar) return

    try {
      await deleteBoletin(boletin.id)
      if (editingId === boletin.id) resetForm()
      await cargarBoletines()
      setSuccess('Boletín eliminado correctamente.')
    } catch (exception) {
      const detalle = exception instanceof Error ? exception.message : 'Sin detalle disponible.'
      console.error('No se pudo eliminar el boletín:', detalle)
      setError(`No se pudo eliminar el boletín. ${detalle}`)
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

      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Administración de boletines</h1>
          <p className="mt-2 text-sm text-slate-500">
            Crear, editar y publicar novedades para los usuarios.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="titulo" className="mb-2 block text-sm font-medium">
                Título
              </label>
              <input
                id="titulo"
                type="text"
                value={titulo}
                onChange={(event) => setTitulo(event.target.value)}
                placeholder="Ej: Novedades del mes"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
              />
            </div>

            <div>
              <label htmlFor="descripcion" className="mb-2 block text-sm font-medium">
                Descripción
              </label>
              <textarea
                id="descripcion"
                value={descripcion}
                onChange={(event) => setDescripcion(event.target.value)}
                rows={10}
                placeholder="Escribí el contenido del boletín, con listas, emojis y párrafos..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">Activo</p>
                <p className="text-xs text-slate-500">Los boletines inactivos no se muestran a usuarios comunes.</p>
              </div>

              <button
                type="button"
                aria-pressed={activo}
                onClick={() => setActivo((valor) => !valor)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${activo ? 'bg-slate-900' : 'bg-slate-300'}`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white transition ${activo ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : editingId !== null ? 'Guardar cambios' : 'Guardar boletín'}
              </button>

              {editingId !== null && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancelar edición
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold">Boletines existentes</h2>
            <span className="text-sm text-slate-500">{boletines.length} registro(s)</span>
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-slate-600">
              Cargando boletines...
            </div>
          ) : boletines.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-slate-600">
              No hay boletines creados todavía.
            </div>
          ) : (
            <div className="space-y-3">
              {boletines.map((boletin) => (
                <div
                  key={boletin.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">{boletin.titulo}</h3>
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${boletin.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                          {boletin.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">{formatearFecha(boletin.fecha_creacion)}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(boletin)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggle(boletin)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        {boletin.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(boletin)}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Sidebar isOpen={showSidebar} onClose={() => setShowSidebar(false)} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} settings={null} />
      {showStats && <StatsModal onClose={() => setShowStats(false)} />}
    </div>
  )
}

export default AdminBoletinPage

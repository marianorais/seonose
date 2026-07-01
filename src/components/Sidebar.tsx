import { Link } from 'react-router-dom'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed left-0 top-0 z-50 h-full w-72 overflow-y-auto border-r border-gray-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-lg font-bold text-gray-900">Menú</h2>
          <button type="button" onClick={onClose} className="text-gray-600 hover:text-gray-900" aria-label="Cerrar menú">
            ✕
          </button>
        </div>

        <div className="space-y-6 p-4">
          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-widest text-gray-500">Navegación</h3>
            <div className="space-y-2">
              <Link
                to="/"
                onClick={onClose}
                className="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm font-medium text-gray-800 transition hover:bg-gray-50"
              >
                🏠 Inicio
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-widest text-gray-500">Sobre el juego</h3>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
              <p>Se o NoSe es un juego de preguntas diarias para poner a prueba cuánto sabés.</p>
              <p className="mt-2">Nuevas preguntas todos los días. ¡Compartilo y competí con tus amigos!</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar

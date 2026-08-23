import { Link, useLocation } from 'react-router-dom'

import { MOSTRAR_ACCESO_RANKING } from '../lib/featureFlags'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface EnlaceNavProps {
  to: string
  onClose: () => void
  /** `ranking` usa el acento ámbar, el mismo que el acceso del header. */
  tono?: 'neutro' | 'ranking'
  activo: boolean
  children: React.ReactNode
}

/**
 * Fila de navegación del menú. Se extrajo porque los tres enlaces compartían la
 * misma lista de clases; acá se define una sola vez y cada uno elige su tono.
 */
const EnlaceNav = ({ to, onClose, tono = 'neutro', activo, children }: EnlaceNavProps) => {
  const estilos = {
    neutro: activo
      ? 'border-gray-300 bg-gray-100 text-gray-900'
      : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50',
    ranking: activo
      ? 'border-amber-400 bg-amber-100 text-amber-900'
      : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100',
  }[tono]

  return (
    <Link
      to={to}
      onClick={onClose}
      aria-current={activo ? 'page' : undefined}
      className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition ${estilos}`}
    >
      {children}
    </Link>
  )
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { pathname } = useLocation()

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
              <EnlaceNav to="/" onClose={onClose} activo={pathname === '/'}>
                🏠 Inicio
              </EnlaceNav>

              {/*
                El ranking es un destino, así que va en Navegación y no al final.
                Lleva el mismo acento ámbar que el acceso del header: mismo color,
                mismo lugar al que se llega.
              */}
              {MOSTRAR_ACCESO_RANKING && (
                <>
                  <EnlaceNav to="/ranking" onClose={onClose} tono="ranking" activo={pathname === '/ranking'}>
                    🏆 Ranking general
                  </EnlaceNav>
                  <p className="text-xs text-gray-500">Mirá en qué puesto estás y quién te está ganando.</p>
                </>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-widest text-gray-500">Sobre el juego</h3>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
              <p>Se o NoSe es un juego de preguntas diarias para poner a prueba cuánto sabés.</p>
              <p className="mt-2">Nuevas preguntas todos los días. ¡Compartilo y competí con tus amigos!</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-widest text-gray-500">Contacto</h3>
            <EnlaceNav to="/contacto" onClose={onClose} activo={pathname === '/contacto'}>
              ✉️ Contáctenos
            </EnlaceNav>
            <p className="text-xs text-gray-500">Envianos tus sugerencias de mejora.</p>
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar
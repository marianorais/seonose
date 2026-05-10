const sections = [
  {
    title: 'Modos de juego',
    items: [
      { label: 'Normal', href: '/' },
      { label: 'Frase', href: '/frase' },
      { label: 'Países', href: '/paises' },
      { label: 'Pasaporte', href: '/paises/pasaporte' },
      { label: 'Raíz', href: '/raiz' },
      { label: 'Tildes', href: '/tildes' },
      { label: 'Científica', href: '/ciencia' },
      { label: 'Contrarreloj', href: '/contrarreloj' },
      { label: 'Medallero', href: '/medallero' },
      { label: 'Crear', href: '/crear' },
    ],
  },
  {
    title: 'Archivo',
    items: [
      { label: 'Archivo Normal', href: '/archivo/normal' },
      { label: 'Archivo Países', href: '/archivo/paises' },
      { label: 'Archivo Tildes', href: '/archivo/tildes' },
      { label: 'Archivo Científico', href: '/archivo/ciencia' },
      { label: 'Archivo Frase', href: '/archivo/frase' },
      { label: 'Archivo Raíz', href: '/archivo/raiz' },
    ],
  },
  {
    title: 'Información',
    items: [
      { label: 'Cómo jugar', href: '/como-jugar' },
      { label: 'Cómo jugar - Frase', href: '/como-jugar-frase' },
      { label: 'Cómo jugar - Países', href: '/como-jugar-paises' },
    ],
  },
]

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
          {sections.map((section) => (
            <div key={section.title} className="space-y-3">
              <h3 className="text-xs uppercase tracking-widest text-gray-500">{section.title}</h3>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    disabled
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-left text-sm text-gray-500 opacity-70 transition"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default Sidebar
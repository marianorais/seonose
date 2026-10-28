import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { SITE_URL } from '../lib/siteConfig'

/** Mismo contenido que la portada: consolidan en ella. */
const ALIAS_DE_PORTADA = ['/repetir']

/** Pantallas de administración y salas privadas: no tienen nada que buscar en Google. */
const SIN_INDEXAR = ['/preguntas', '/adminBoletin', '/configuraciones', '/sala/']

/**
 * El servidor entrega el mismo `index.html` para todas las rutas, con el
 * canonical de la portada. Al navegar se ajusta a la ruta actual, siempre sin
 * query string: `/?c=wa` (link compartido) y `/` son la misma página.
 */
const CanonicalRuta = () => {
  const { pathname } = useLocation()

  useEffect(() => {
    const ruta = ALIAS_DE_PORTADA.includes(pathname) ? '/' : pathname

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = `${SITE_URL}${ruta}`

    const noIndexar = SIN_INDEXAR.some((prefijo) => pathname === prefijo || pathname.startsWith(prefijo))
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')

    if (noIndexar) {
      if (!robots) {
        robots = document.createElement('meta')
        robots.name = 'robots'
        document.head.appendChild(robots)
      }
      robots.content = 'noindex'
    } else {
      robots?.remove()
    }
  }, [pathname])

  return null
}

export default CanonicalRuta

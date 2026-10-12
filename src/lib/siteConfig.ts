/**
 * Datos del sitio que se repiten en metadatos, links compartidos y JSON-LD.
 *
 * Están en UN solo lugar a propósito: antes convivían dos dominios distintos
 * (`sitemap.xml` y `robots.txt` declaraban `www.seonose.com.ar`, mientras que
 * `og:url` decía `seonose.com.ar` sin www). Para Google eso son dos sitios, y
 * la autoridad de los links se reparte entre ambos en lugar de sumarse.
 *
 * Se unificó en la versión CON www, que es la que ya estaba publicada en el
 * sitemap y en Search Console. Lo importante no es cuál de las dos gane, sino
 * que sea siempre la misma y que la otra redirija con un 301 (ver `vercel.json`).
 */

/** Dominio canónico, sin barra final. Se puede pisar por entorno en previews. */
export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? 'https://www.seonose.com.ar').replace(/\/+$/, '')

export const SITE_NAME = 'Se o NoSe'

/**
 * El origen a usar al armar links para compartir.
 *
 * En producción es `SITE_URL`. En desarrollo (`localhost`) conviene el origen
 * real del navegador: un link a `www.seonose.com.ar` sería imposible de probar
 * desde la máquina local.
 */
export const obtenerOrigenParaCompartir = (): string => {
  if (typeof window === 'undefined') return SITE_URL

  const { origin, hostname } = window.location

  const esLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local')

  return esLocal ? origin : SITE_URL
}

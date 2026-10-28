/**
 * Texto y acciones para compartir el resultado de una partida.
 *
 * El texto es el principal canal de adquisición del juego: casi todos los
 * jugadores nuevos llegan por el resultado que les mandó alguien. Por eso:
 *
 *  - invita a competir ("¿Podés superarme?") en lugar de sólo informar;
 *  - muestra aciertos y errores con cuadraditos, nunca las respuestas;
 *  - el link va al dominio canónico, marcado con el canal (ver `analytics`);
 *  - el de un desafío anterior lleva a ESE desafío, para comparar con lo mismo.
 */

import { formatearFechaLarga } from './fechas'
import { marcarLinkCompartido, type CanalCompartir } from './analytics'
import { obtenerOrigenParaCompartir } from './siteConfig'

interface DatosResultado {
  numero: number
  aciertos: boolean[]
  /** Fecha del desafío si es uno anterior (AAAA-MM-DD). */
  fechaAnterior?: string
}

export const textoResultado = ({ numero, aciertos, fechaAnterior }: DatosResultado, canal: CanalCompartir): string => {
  const correctas = aciertos.filter(Boolean).length
  const total = aciertos.length
  const ruta = fechaAnterior ? `/anteriores/${fechaAnterior}` : '/'
  const link = marcarLinkCompartido(`${obtenerOrigenParaCompartir()}${ruta}`, canal)

  return [
    `🧠 SEoNOSE #${numero} · ${correctas}/${total}`,
    aciertos.map((ok) => (ok ? '🟩' : '🟥')).join(''),
    ...(fechaAnterior ? [`📅 Desafío del ${formatearFechaLarga(fechaAnterior)}`] : []),
    correctas === total && total > 0 ? '¡Perfecto! ¿Podés igualarme?' : '¿Podés superarme?',
    `👉 ${link}`,
  ].join('\n')
}

/**
 * Copia al portapapeles. `navigator.clipboard` no existe en los navegadores
 * internos de Instagram, Facebook y algunos Android viejos, justo por donde
 * llega mucha gente desde un link: ahí se usa el método clásico.
 */
export const copiarTexto = async (texto: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto)
      return true
    }
  } catch {
    // Permiso denegado: se intenta el método clásico.
  }

  try {
    const area = document.createElement('textarea')
    area.value = texto
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}

export const puedeCompartirNativo = (): boolean => typeof navigator !== 'undefined' && typeof navigator.share === 'function'

/**
 * Hoja de compartir del sistema (móviles). Devuelve `false` si no está
 * disponible o falló por otro motivo que no sea que el usuario la cerró, para
 * que quien llama ofrezca las alternativas.
 */
export const compartirNativo = async (texto: string): Promise<boolean> => {
  if (!puedeCompartirNativo()) return false

  try {
    await navigator.share({ text: texto })
    return true
  } catch (error) {
    // Cerrar la hoja sin elegir nada no es un error: no hay que abrir nada más.
    return error instanceof DOMException && error.name === 'AbortError'
  }
}

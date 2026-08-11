
/**
 * Manejo simple de sesión de usuario en localStorage.
 * Estas utilidades mantienen sus nombres exportados para no romper imports.
 */
const USER_ID_KEY = 'seonose-user-id'

export const getLocalUserId = () => {
  const raw = localStorage.getItem(USER_ID_KEY)

  if (!raw) {
    return null
  }

  return Number(raw)
}

export const saveLocalUserId = (userId: number) => {
  localStorage.setItem(USER_ID_KEY, String(userId))
}

/**
 * Cuánto se espera como máximo la IP pública.
 *
 * `api.ipify.org` está en las listas de los bloqueadores de contenido, muy
 * habituales en Safari de iOS. Un bloqueador puede dejar la request colgada en
 * lugar de rechazarla, y sin este límite el `await` no resolvía nunca: la
 * partida quedaba sin guardarse. La IP es un dato accesorio —la identidad del
 * jugador no depende de ella—, así que nunca debe bloquear nada.
 */
const TIMEOUT_IP_MS = 2500

/** Cachea el resultado: es el mismo durante toda la carga de la página. */
let clientInfoEnCurso: Promise<{ ip: string | null; userAgent: string }> | null = null

/**
 * Obtiene información del cliente (IP pública y userAgent).
 * Si la petición externa falla, la bloquean o tarda demasiado, devuelve la
 * userAgent y `ip: null`. Nunca lanza y nunca queda colgada.
 */
export const getClientInfo = () => {
  if (clientInfoEnCurso) return clientInfoEnCurso

  clientInfoEnCurso = (async () => {
    const userAgent = navigator.userAgent

    try {
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), TIMEOUT_IP_MS)

      try {
        const response = await fetch('https://api.ipify.org?format=json', {
          signal: controller.signal,
        })

        if (!response.ok) return { ip: null, userAgent }

        const data = await response.json()
        const ip = typeof data?.ip === 'string' && data.ip ? data.ip : null

        return { ip, userAgent }
      } finally {
        window.clearTimeout(timeout)
      }
    } catch {
      return { ip: null, userAgent }
    }
  })()

  return clientInfoEnCurso
}
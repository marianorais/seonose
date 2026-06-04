
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
 * Obtiene información del cliente (IP pública y userAgent).
 * Si falla la petición externa, devuelve la userAgent y `ip: null`.
 */
export const getClientInfo = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json')

    const data = await response.json()

    return {
      ip: data.ip as string,
      userAgent: navigator.userAgent,
    }
  } catch {
    return {
      ip: null,
      userAgent: navigator.userAgent,
    }
  }
}
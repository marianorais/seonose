import { supabase } from './supabase'

const USER_ID_KEY = 'seonose-user-id'

export const getLocalUserId = () => {
  const raw = localStorage.getItem(USER_ID_KEY)

  if (!raw) {
    return null
  }

  return Number(raw)
}

export const saveLocalUserId = (
  userId: number
) => {
  localStorage.setItem(
    USER_ID_KEY,
    String(userId)
  )
}

export const getClientInfo =
  async () => {
    try {
      const response = await fetch(
        'https://api.ipify.org?format=json'
      )

      const data = await response.json()

      return {
        ip: data.ip as string,
        userAgent:
          navigator.userAgent,
      }
    } catch {
      return {
        ip: null,
        userAgent:
          navigator.userAgent,
      }
    }
  }

export const getOrCreateUser =
  async () => {
    const existingUserId =
      getLocalUserId()

    /**
     * Si ya existe en localStorage,
     * reutilizarlo.
     */
    if (existingUserId) {
      return existingUserId
    }

    const clientInfo =
      await getClientInfo()

    /**
     * Si no hay IP,
     * NO crear usuario.
     */
    if (!clientInfo.ip) {
      console.warn(
        'No se pudo obtener IP'
      )

      return null
    }

    /**
     * Buscar usuario existente por IP
     */
    const {
      data: existingUser,
    } = await supabase
      .from('user_profiles')
      .select('id')
      .eq(
        'userip',
        clientInfo.ip
      )
      .maybeSingle()

    /**
     * Si existe,
     * reutilizar.
     */
    if (existingUser?.id) {
      saveLocalUserId(
        existingUser.id
      )

      return existingUser.id
    }

    /**
     * Crear nuevo usuario
     */
    const randomNumber =
      Math.floor(
        Math.random() * 100000
      )

    const {
      data: newUser,
      error,
    } = await supabase
      .from('user_profiles')
      .insert({
        username: `Jugador_${randomNumber}`,

        createdat:
          new Date().toISOString(),

        totalgamesplayed: 0,

        userip: clientInfo.ip,
      })
      .select()
      .single()

    if (error || !newUser) {
      console.error(
        'Error creando usuario',
        error
      )

      return null
    }

    saveLocalUserId(
      newUser.id
    )

    return newUser.id
  }

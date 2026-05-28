import { supabase } from './supabase'

const USER_ID_KEY = 'seonose-user-id'

interface ClientInfo {
  ip: string
  userAgent: string
}

export const getClientInfo =
  async (): Promise<ClientInfo> => {
    try {
      const response = await fetch(
        'https://api.ipify.org?format=json'
      )

      const data = await response.json()

      return {
        ip: data.ip ?? 'unknown',
        userAgent: navigator.userAgent,
      }
    } catch {
      return {
        ip: 'unknown',
        userAgent: navigator.userAgent,
      }
    }
  }

export const getLocalUserId =
  (): number | null => {
    const raw =
      localStorage.getItem(
        USER_ID_KEY
      )

    if (!raw) return null

    const parsed = Number(raw)

    return Number.isNaN(parsed)
      ? null
      : parsed
  }

export const ensureUserProfile =
  async (): Promise<number | null> => {
    try {
      const existingUserId =
        getLocalUserId()

      if (existingUserId) {
        return existingUserId
      }

      const clientInfo = await getClientInfo()

      if ( !clientInfo.ip || clientInfo.ip === 'unknown' || clientInfo.ip === 'null' ) 
      {
        console.error(
          'IP inválida. No se crea user profile.'
        )
        return null
      }
      /**
       * Busca usuario por IP
       */
      const {
        data: existingUser,
      } = await supabase
        .from('user_profiles')
        .select('*')
        .eq(
          'userip',
          clientInfo.ip
        )
        .maybeSingle()

      /**
       * Ya existe
       */
      if (existingUser) {
        localStorage.setItem(
          USER_ID_KEY,
          String(existingUser.id)
        )

        return existingUser.id
      }

      /**
       * Crear usuario
       */
      const { data, error } =
        await supabase
          .from('user_profiles')
          .insert({
            username: `Jugador-${Math.floor(
              Math.random() *
                100000
            )}`,

            createdat:
              new Date().toISOString(),

            totalgamesplayed: 0,

            userip:
              clientInfo.ip,
          })
          .select()
          .single()

      if (error) {
        console.error(error)

        return null
      }

      localStorage.setItem(
        USER_ID_KEY,
        String(data.id)
      )

      return data.id
    } catch (error) {
      console.error(error)

      return null
    }
  }
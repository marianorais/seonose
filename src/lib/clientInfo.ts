export interface ClientInfo {
  ip: string
  userAgent: string
}

export const getClientInfo =
  async (): Promise<ClientInfo> => {
    let ip = 'unknown'

    try {
      const response = await fetch(
        'https://api.ipify.org?format=json'
      )

      const data: { ip: string } =
        await response.json()

      ip = data.ip
    } catch {
      console.error(
        'No se pudo obtener IP'
      )
    }

    return {
      ip,
      userAgent: navigator.userAgent,
    }
  }
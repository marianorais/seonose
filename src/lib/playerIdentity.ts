/**
 * Identidad estable del jugador.
 *
 * Por qué existe: antes el jugador se identificaba por su IP pública
 * (`api.ipify.org`), y en redes móviles esa IP no es estable. Cambia por
 * rotación de direcciones IPv6 temporales (RFC 4941/8981, activas por defecto
 * en Android e iOS), porque el teléfono sale unas veces por IPv4 y otras por
 * IPv6, por rotación de CGNAT de la operadora, o al pasar de wifi a datos. Cada
 * cambio hacía aparecer al mismo usuario como un jugador nuevo: perdía el alias
 * y sus partidas.
 *
 * Acá el identificador es un UUID anónimo generado en el dispositivo. Se
 * resuelve de forma sincrónica (sin red, sin esperas, sin carreras) y se guarda
 * en dos canales independientes —`localStorage` y una cookie propia— porque en
 * móvil cada uno falla por motivos distintos: iOS en navegación privada puede
 * hacer fallar la escritura en `localStorage`, y las cookies pueden vencer o ser
 * limpiadas. Si un canal sobrevive, la identidad sobrevive; al leer se repara el
 * canal que se haya perdido.
 *
 * El UUID no identifica a una persona: no se deriva de ningún dato del
 * dispositivo y no se comparte entre sitios.
 */

const CLAVE_PLAYER_ID = 'seonose-player-id'
/** Marca que el id se acaba de crear y todavía puede heredar una identidad. */
const CLAVE_ADOPCION_PENDIENTE = 'seonose-adopcion-pendiente'

const DIAS_COOKIE = 3650

const leerStorage = (clave: string) => {
  try {
    return window.localStorage.getItem(clave)
  } catch {
    return null
  }
}

const escribirStorage = (clave: string, valor: string) => {
  try {
    window.localStorage.setItem(clave, valor)
  } catch {
    // Ignore storage errors
  }
}

const borrarStorage = (clave: string) => {
  try {
    window.localStorage.removeItem(clave)
  } catch {
    // Ignore storage errors
  }
}

const leerCookie = (clave: string) => {
  try {
    const prefijo = `${encodeURIComponent(clave)}=`

    const encontrada = document.cookie
      .split('; ')
      .find((cookie) => cookie.startsWith(prefijo))

    return encontrada ? decodeURIComponent(encontrada.slice(prefijo.length)) : null
  } catch {
    return null
  }
}

const escribirCookie = (clave: string, valor: string) => {
  try {
    const maxAge = DIAS_COOKIE * 24 * 60 * 60

    document.cookie = `${encodeURIComponent(clave)}=${encodeURIComponent(
      valor
    )}; path=/; max-age=${maxAge}; SameSite=Lax`
  } catch {
    // Ignore cookie errors
  }
}

/**
 * `crypto.randomUUID` sólo existe en contextos seguros (https o localhost).
 * El fallback usa `getRandomValues` y, si tampoco está, `Math.random`: para un
 * identificador de ranking la colisión es despreciable y nunca es un secreto.
 */
const generarUuid = () => {
  const cryptoApi = globalThis.crypto

  if (typeof cryptoApi?.randomUUID === 'function') {
    return cryptoApi.randomUUID()
  }

  const bytes = new Uint8Array(16)

  if (typeof cryptoApi?.getRandomValues === 'function') {
    cryptoApi.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256)
    }
  }

  // Marca la versión 4 y la variante, para que sea un UUID válido.
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** Última red de contención: si ningún canal persiste, al menos la pestaña es coherente. */
let idEnMemoria: string | null = null

const persistir = (id: string) => {
  escribirStorage(CLAVE_PLAYER_ID, id)
  escribirCookie(CLAVE_PLAYER_ID, id)
  idEnMemoria = id
}

const leerIdGuardado = () => leerStorage(CLAVE_PLAYER_ID) ?? leerCookie(CLAVE_PLAYER_ID)

/**
 * Identificador del jugador. Siempre devuelve un valor: la primera vez lo crea.
 * Es sincrónico a propósito, para que quien lo necesite no tenga que esperar red.
 */
export const obtenerPlayerId = (): string => {
  const guardado = leerIdGuardado()

  if (guardado) {
    // Reescribe los dos canales: repara el que se haya perdido.
    persistir(guardado)
    return guardado
  }

  if (idEnMemoria) {
    persistir(idEnMemoria)
    return idEnMemoria
  }

  const nuevo = generarUuid()

  persistir(nuevo)
  // Recién creado: todavía puede heredar la identidad previa de esta conexión.
  escribirStorage(CLAVE_ADOPCION_PENDIENTE, '1')
  escribirCookie(CLAVE_ADOPCION_PENDIENTE, '1')

  return nuevo
}

/**
 * Identificador de las partidas anteriores a este esquema, derivado de la IP con
 * la que se guardaron. Tiene que coincidir con el backfill de la migración
 * (`'ip:' || userip`).
 */
export const idLegadoDeIp = (ip: string) => `ip:${ip}`

export const esIdLegado = (playerId: string) => playerId.startsWith('ip:')

/** IP embutida en un id heredado, para poder derivar el alias generado de antes. */
export const ipDeIdLegado = (playerId: string) =>
  esIdLegado(playerId) ? playerId.slice(3) : playerId

export const adopcionPendiente = () =>
  (leerStorage(CLAVE_ADOPCION_PENDIENTE) ?? leerCookie(CLAVE_ADOPCION_PENDIENTE)) === '1'

/**
 * Cierra la ventana de adopción. Se llama al intentarla y también al guardar la
 * primera partida: una vez que hay partidas con este id, cambiarlo las dejaría
 * huérfanas.
 */
export const cerrarAdopcion = () => {
  borrarStorage(CLAVE_ADOPCION_PENDIENTE)
  escribirCookie(CLAVE_ADOPCION_PENDIENTE, '')
}

/**
 * Reemplaza el id local por una identidad heredada. Sólo se usa una vez por
 * dispositivo, mientras la adopción esté pendiente.
 */
export const adoptarPlayerId = (playerId: string) => {
  persistir(playerId)
  cerrarAdopcion()
}

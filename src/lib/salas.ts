/**
 * Salas: un grupo que compara sus partidas oficiales del desafío diario.
 *
 * Todo lo que importa (quién es integrante, cuántos puntos tiene cada uno,
 * límites) lo decide el servidor. Acá están las validaciones para avisar
 * antes de enviar (las mismas reglas que aplica la base), el armado de links
 * y textos para compartir, y la traducción de las respuestas de las RPC.
 */
import { llamarRpc } from './rpc'
import type { ResultadoRpc } from './rpc'
import { numeroDeDesafio } from './fechas'
import { obtenerOrigenParaCompartir } from './siteConfig'

export const LARGO_MAXIMO_NOMBRE_SALA = 40

/** Mismo alfabeto que `privado.nuevo_codigo_sala()`: sin l, o, 0 ni 1. */
const PATRON_CODIGO = /^[a-km-np-z2-9]{10}$/

export type ErrorNombreSala = 'vacio' | 'largo' | 'caracteres'

/** Limpia el nombre como lo hace el servidor (espacios de más) y lo valida. */
export const validarNombreSala = (
  nombre: string
): { ok: true; nombre: string } | { ok: false; error: ErrorNombreSala } => {
  const limpio = nombre.trim().replace(/\s+/g, ' ')

  if (!limpio) return { ok: false, error: 'vacio' }
  if (limpio.length > LARGO_MAXIMO_NOMBRE_SALA) return { ok: false, error: 'largo' }
  // eslint-disable-next-line no-control-regex
  if (/[<>\u0000-\u001f\u007f]/.test(limpio)) return { ok: false, error: 'caracteres' }

  return { ok: true, nombre: limpio }
}

export const MENSAJES_NOMBRE_SALA: Record<ErrorNombreSala, string> = {
  vacio: 'Ponele un nombre a la sala.',
  largo: `El nombre puede tener hasta ${LARGO_MAXIMO_NOMBRE_SALA} caracteres.`,
  caracteres: 'El nombre no puede tener los símbolos < ni >.',
}

/**
 * Código de sala a partir de lo que pegó el usuario: el código solo o el link
 * completo (como llega por WhatsApp). `null` si no hay un código válido.
 */
export const extraerCodigoSala = (entrada: string): string | null => {
  const texto = entrada.trim().toLowerCase()
  const desdeLink = texto.match(/\/sala\/([a-z0-9]+)/)
  const candidato = desdeLink ? desdeLink[1] : texto

  return PATRON_CODIGO.test(candidato) ? candidato : null
}

export const esCodigoSalaValido = (codigo: string | undefined): codigo is string =>
  Boolean(codigo && PATRON_CODIGO.test(codigo.toLowerCase()))

export const construirLinkSala = (codigo: string) => `${obtenerOrigenParaCompartir()}/sala/${codigo}`

export const construirTextoInvitacion = (nombre: string, link: string) =>
  [`🧠 Te invito a mi sala "${nombre}" en Se o NoSe.`, 'Jugamos el desafío del día y vemos quién sabe más 🏆', link].join(
    '\n'
  )

const MEDALLAS = ['🥇', '🥈', '🥉']

/**
 * Ranking para compartir: sólo alias y puntos de los tres primeros. Nunca
 * preguntas ni respuestas.
 */
export const construirTextoRanking = (nombre: string, tabla: FilaSala[], link: string) => {
  const podio = tabla
    .slice(0, 3)
    .map((fila, indice) => `${MEDALLAS[indice]} ${fila.alias} · ${fila.puntos} ${fila.puntos === 1 ? 'pt' : 'pts'}`)

  return [`🏆 Ranking de "${nombre}" en Se o NoSe`, ...podio, '¿Quién se anima a superarlos?', link].join('\n')
}

/* -------------------------------------------------------------------------- */
/* Tipos                                                                      */
/* -------------------------------------------------------------------------- */

export interface VistaPreviaSala {
  codigo: string
  nombre: string
  integrantes: number
  creadaPor: string | null
  esIntegrante: boolean
}

export interface FilaSala {
  clave: string
  alias: string
  puntos: number
  partidas: number
  correctas: number
  total: number
  victorias: number
  porcentaje: number
  posicion: number
  jugoHoy: boolean
  esActual: boolean
}

export interface ActividadSala {
  clave: string
  alias: string
  fecha: string
  numero: number
  modo: 'diario' | 'historico'
  correctas: number
  total: number
  completadaEn: string
}

export interface DetalleSala {
  codigo: string
  nombre: string
  desde: string
  integrantes: number
  soyPropietario: boolean
  hoy: string
  tabla: FilaSala[]
  actividad: ActividadSala[]
}

export interface ResumenSala {
  codigo: string
  nombre: string
  integrantes: number
  soyPropietario: boolean
  miPosicion: number | null
}

/** Estados de negocio que puede devolver el servidor (además de 'ok'). */
export type EstadoSala =
  | 'no-existe'
  | 'no-integrante'
  | 'sin-alias'
  | 'sala-llena'
  | 'limite-salas'
  | 'limite-creacion'
  | 'nombre-invalido'
  | 'no-autorizado'
  | 'invalida'

export type Respuesta<T> = { estado: 'ok'; datos: T } | { estado: EstadoSala }

export const MENSAJES_ESTADO_SALA: Record<EstadoSala, string> = {
  'no-existe': 'Esta sala no existe o fue eliminada. Pedile a quien te invitó que te pase el link de nuevo.',
  'no-integrante': 'Todavía no sos parte de esta sala.',
  'sin-alias': 'Elegí un alias para que los demás sepan quién sos.',
  'sala-llena': 'La sala está llena: ya tiene 50 integrantes.',
  'limite-salas': 'Ya estás en 20 salas, el máximo. Salí de alguna para sumarte a otra.',
  'limite-creacion': 'Ya creaste 5 salas hoy. Probá de nuevo mañana.',
  'nombre-invalido': 'Ese nombre no sirve. Usá entre 1 y 40 caracteres, sin < ni >.',
  'no-autorizado': 'Sólo quien administra la sala puede hacer eso.',
  invalida: 'No pudimos procesar el pedido. Recargá la página y probá de nuevo.',
}

/* -------------------------------------------------------------------------- */
/* RPC                                                                        */
/* -------------------------------------------------------------------------- */

type Fila = Record<string, unknown> & { estado: string }

const traducir = <T>(
  respuesta: ResultadoRpc<Fila>,
  mapear: (fila: Fila) => T
): ResultadoRpc<Respuesta<T>> => {
  if (!respuesta.ok) return respuesta

  const fila = respuesta.datos

  if (fila.estado === 'ok') return { ok: true, datos: { estado: 'ok', datos: mapear(fila) } }

  const estado = (fila.estado in MENSAJES_ESTADO_SALA ? fila.estado : 'invalida') as EstadoSala

  return { ok: true, datos: { estado } }
}

export const crearSala = async (playerId: string, nombre: string) =>
  traducir(
    await llamarRpc<Fila>('crear_sala', { p_playerid: playerId, p_nombre: nombre }),
    (fila) => ({ codigo: String(fila.codigo), nombre: String(fila.nombre) })
  )

export const verSala = async (codigo: string, playerId: string) =>
  traducir(
    await llamarRpc<Fila>('ver_sala', { p_codigo: codigo, p_playerid: playerId }),
    (fila): VistaPreviaSala => ({
      codigo: String(fila.codigo),
      nombre: String(fila.nombre),
      integrantes: Number(fila.integrantes),
      creadaPor: (fila.creada_por as string | null) ?? null,
      esIntegrante: Boolean(fila.es_integrante),
    })
  )

export const unirseASala = async (codigo: string, playerId: string) =>
  traducir(await llamarRpc<Fila>('unirse_sala', { p_codigo: codigo, p_playerid: playerId }), () => null)

export const salirDeSala = async (codigo: string, playerId: string) =>
  traducir(await llamarRpc<Fila>('salir_sala', { p_codigo: codigo, p_playerid: playerId }), () => null)

export const eliminarSala = async (codigo: string, playerId: string) =>
  traducir(await llamarRpc<Fila>('eliminar_sala', { p_codigo: codigo, p_playerid: playerId }), () => null)

const aFila = (fila: Record<string, unknown>): FilaSala => ({
  clave: String(fila.clave),
  alias: String(fila.alias ?? 'Sin alias'),
  puntos: Number(fila.puntos),
  partidas: Number(fila.partidas),
  correctas: Number(fila.correctas),
  total: Number(fila.total),
  victorias: Number(fila.victorias),
  porcentaje: Number(fila.porcentaje),
  posicion: Number(fila.posicion),
  jugoHoy: Boolean(fila.jugo_hoy),
  esActual: Boolean(fila.es_actual),
})

const aActividad = (fila: Record<string, unknown>): ActividadSala => ({
  clave: String(fila.clave),
  alias: String(fila.alias ?? 'Sin alias'),
  fecha: String(fila.fecha),
  numero: numeroDeDesafio(String(fila.fecha)),
  modo: fila.es_anterior ? 'historico' : 'diario',
  correctas: Number(fila.correctas),
  total: Number(fila.total),
  completadaEn: String(fila.completada_en),
})

export const obtenerRankingSala = async (codigo: string, playerId: string) =>
  traducir(await llamarRpc<Fila>('ranking_sala', { p_codigo: codigo, p_playerid: playerId }), (fila): DetalleSala => {
    const sala = fila.sala as Record<string, unknown>

    return {
      codigo: String(sala.codigo),
      nombre: String(sala.nombre),
      desde: String(sala.desde),
      integrantes: Number(sala.integrantes),
      soyPropietario: Boolean(sala.soy_propietario),
      hoy: String(fila.hoy),
      tabla: ((fila.tabla as Record<string, unknown>[]) ?? []).map(aFila),
      actividad: ((fila.actividad as Record<string, unknown>[]) ?? []).map(aActividad),
    }
  })

export const obtenerMisSalas = async (playerId: string) =>
  traducir(await llamarRpc<Fila>('mis_salas', { p_playerid: playerId }), (fila): ResumenSala[] =>
    ((fila.salas as Record<string, unknown>[]) ?? []).map((sala) => ({
      codigo: String(sala.codigo),
      nombre: String(sala.nombre),
      integrantes: Number(sala.integrantes),
      soyPropietario: Boolean(sala.soy_propietario),
      miPosicion: sala.mi_posicion == null ? null : Number(sala.mi_posicion),
    }))
  )

/* -------------------------------------------------------------------------- */
/* Rankings alternativos                                                      */
/* -------------------------------------------------------------------------- */

export type VistaRankingSala = 'puntos' | 'victorias' | 'porcentaje'

export const VISTAS_RANKING_SALA: { id: VistaRankingSala; etiqueta: string; explicacion: string }[] = [
  {
    id: 'puntos',
    etiqueta: 'Puntos',
    explicacion:
      'Un punto por cada respuesta correcta en el desafío del día, jugado ese mismo día. A igual puntaje, desempatan las victorias y después el % de aciertos.',
  },
  {
    id: 'victorias',
    etiqueta: 'Victorias',
    explicacion:
      'Una victoria por cada día en que sacaste el mejor resultado de la sala (con al menos 2 jugadores ese día). Si hay empate, ganan todos los empatados.',
  },
  {
    id: 'porcentaje',
    etiqueta: '% aciertos',
    explicacion: 'Porcentaje de respuestas correctas sobre las preguntas jugadas. Sólo entra quien jugó al menos una vez.',
  },
]

/**
 * Reordena la tabla para la vista elegida. La posición oficial (por puntos) la
 * calcula el servidor; las otras vistas responden otras preguntas y se
 * numeran aparte, sin pisar esa posición.
 */
export const ordenarTablaSala = (tabla: FilaSala[], vista: VistaRankingSala): (FilaSala & { puesto: number })[] => {
  if (vista === 'puntos') return tabla.map((fila) => ({ ...fila, puesto: fila.posicion }))

  const filas = vista === 'porcentaje' ? tabla.filter((fila) => fila.partidas > 0) : [...tabla]

  const orden = (a: FilaSala, b: FilaSala) =>
    vista === 'victorias'
      ? b.victorias - a.victorias || b.puntos - a.puntos || a.posicion - b.posicion
      : b.porcentaje - a.porcentaje || b.partidas - a.partidas || a.posicion - b.posicion

  return filas.sort(orden).map((fila, indice) => ({ ...fila, puesto: indice + 1 }))
}

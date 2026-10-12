/**
 * Desafíos de días anteriores.
 *
 * Las preguntas de un día anterior son las que efectivamente se jugaron ese
 * día (las calcula la base). La partida se guarda igual que la del día, con
 * `fecha_desafio` y `es_anterior`; la base controla que sea una sola vez por
 * dispositivo (ver supabase/migrations/20261013000100_desafios_anteriores.sql).
 */
import type { QuestionItem } from '../types'
import { CLAVE_ORDEN_OPCIONES, aplicarOrdenDeOpciones, ensureThreeChoices } from './appHelpers'
import { numeroDeDesafio } from './fechas'
import { CLAVE_ESTADO_QUIZ, cargarEstadoGuardado } from './quizHelpers'
import { llamarRpc } from './rpc'
import type { ResultadoRpc } from './rpc'

export interface DesafioAnteriorCargado {
  fecha: string
  numero: number
  segundosPorPregunta: number
  preguntas: QuestionItem[]
}

interface PreguntaRpc {
  id: number
  question: string
  answer: string
  choices: unknown
  categoryid: number | null
  categoryname: string | null
  categoryicon: string | null
}

const aPregunta = (pregunta: PreguntaRpc): QuestionItem => ({
  id: pregunta.id,
  question: pregunta.question,
  answer: pregunta.answer,
  choices: Array.isArray(pregunta.choices)
    ? pregunta.choices.filter((opcion): opcion is string => typeof opcion === 'string')
    : [],
  enabled: true,
  categoryId: pregunta.categoryid,
  categoryName: pregunta.categoryname,
  categoryIcon: pregunta.categoryicon,
})

/** Las preguntas de un día anterior. `datos: null` si ese día no se puede jugar. */
export const obtenerDesafioAnterior = async (
  fecha: string
): Promise<ResultadoRpc<DesafioAnteriorCargado | null>> => {
  const respuesta = await llamarRpc<{ fecha: string; segundos_por_pregunta: number; preguntas: PreguntaRpc[] } | null>(
    'obtener_desafio_anterior',
    { p_fecha: fecha }
  )

  if (!respuesta.ok) return respuesta
  if (!respuesta.datos?.preguntas?.length) return { ok: true, datos: null }

  const preguntas = respuesta.datos.preguntas.map(aPregunta).map(ensureThreeChoices)

  return {
    ok: true,
    datos: {
      fecha,
      numero: numeroDeDesafio(fecha),
      segundosPorPregunta: respuesta.datos.segundos_por_pregunta,
      // Orden de opciones aparte del de hoy: así no se reacomodan las del día.
      preguntas: aplicarOrdenDeOpciones(preguntas, fecha, `${CLAVE_ORDEN_OPCIONES}-anteriores`),
    },
  }
}

export interface DesafioAnterior {
  fecha: string
  numero: number
  /** Este dispositivo ya lo jugó (ese día o como desafío anterior). */
  jugada: boolean
  jugadaEnVivo: boolean
  correctas: number | null
  total: number | null
}

export interface PaginaAnteriores {
  fechas: DesafioAnterior[]
  hayMas: boolean
}

interface FilaRpc {
  fecha: string
  jugada: boolean
  jugada_en_vivo: boolean
  correctas: number | null
  total: number | null
}

export const TAMANIO_PAGINA_ANTERIORES = 10

/** Una página de días anteriores, del más reciente al más viejo. */
export const listarDesafiosAnteriores = async (
  playerId: string,
  antesDe?: string
): Promise<ResultadoRpc<PaginaAnteriores>> => {
  const respuesta = await llamarRpc<{ fechas?: FilaRpc[]; hay_mas?: boolean }>('desafios_anteriores', {
    p_playerid: playerId,
    p_antes_de: antesDe ?? null,
    p_limite: TAMANIO_PAGINA_ANTERIORES,
  })

  if (!respuesta.ok) return respuesta

  return {
    ok: true,
    datos: {
      hayMas: Boolean(respuesta.datos.hay_mas),
      fechas: (respuesta.datos.fechas ?? []).map((fila) => ({
        fecha: fila.fecha,
        numero: numeroDeDesafio(fila.fecha),
        jugada: fila.jugada,
        jugadaEnVivo: fila.jugada_en_vivo,
        correctas: fila.correctas,
        total: fila.total,
      })),
    },
  }
}

/** Cada desafío anterior guarda su progreso aparte (no pisa la partida de hoy). */
export const claveEstadoAnterior = (fecha: string) => `${CLAVE_ESTADO_QUIZ}-anterior-${fecha}`

/** Progreso guardado en este navegador; `null` si nunca se empezó acá. */
export const progresoLocalAnterior = (fecha: string) =>
  cargarEstadoGuardado<{ finished?: boolean; answers?: unknown[] }>(fecha, claveEstadoAnterior(fecha))

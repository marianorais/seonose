import { llamarRpc } from './rpc'
import type { ResultadoRpc } from './rpc'

export interface CampeonMensual {
  mes: string
  empiezaEn: string
  terminaEn: string
  campeones: { playerId: string; alias: string; puntaje: number }[]
}

export interface TrofeoJugador {
  tipo: 'sala' | 'mensual'
  salaId: number | null
  salaNombre: string | null
  mes: string | null
  empiezaEn: string
  terminaEn: string
  puntaje: number
}

type Fila = Record<string, unknown>

const aCampeonMensual = (fila: Fila): CampeonMensual => ({
  mes: String(fila.mes),
  empiezaEn: String(fila.empieza_en),
  terminaEn: String(fila.termina_en),
  campeones: ((fila.campeones as Fila[] | undefined) ?? []).map((campeon) => ({
    playerId: String(campeon.playerid),
    alias: String(campeon.alias ?? 'Jugador'),
    puntaje: Number(campeon.puntaje),
  })),
})

export const obtenerCampeonesMensuales = async () => {
  const respuesta = await llamarRpc<Fila>('cerrar_campeonatos_mensuales', {})

  if (!respuesta.ok) throw new Error(`No se pudieron cargar los campeones mensuales (${respuesta.error}).`)
  if (!respuesta.datos || respuesta.datos.estado !== 'ok') {
    throw new Error('La base no pudo cerrar los campeonatos mensuales.')
  }

  return {
    cierraMesActual: String(respuesta.datos.cierra_mes_actual),
    diasRestantes: Number(respuesta.datos.dias_restantes),
    campeones: ((respuesta.datos.campeones as Fila[] | undefined) ?? []).map(aCampeonMensual),
  }
}

export const obtenerTrofeosJugador = async (playerId: string): Promise<ResultadoRpc<TrofeoJugador[]>> => {
  const respuesta = await llamarRpc<Fila>('obtener_palmares_jugador', { p_playerid: playerId })

  if (!respuesta.ok) return respuesta
  if (!respuesta.datos || respuesta.datos.estado !== 'ok') {
    console.error('La base rechazó la carga del palmarés:', respuesta.datos?.estado ?? 'respuesta vacía')
    return { ok: false, error: 'servidor' }
  }

  return {
    ok: true,
    datos: ((respuesta.datos.trofeos as Fila[] | undefined) ?? []).map((fila) => ({
      tipo: fila.tipo === 'mensual' ? 'mensual' : 'sala',
      salaId: fila.sala_id == null ? null : Number(fila.sala_id),
      salaNombre: typeof fila.sala_nombre === 'string' ? fila.sala_nombre : null,
      mes: typeof fila.mes === 'string' ? fila.mes : null,
      empiezaEn: String(fila.empieza_en),
      terminaEn: String(fila.termina_en),
      puntaje: Number(fila.puntaje),
    })),
  }
}

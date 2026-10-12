/**
 * Configuración vigente del juego (preguntas por partida y segundos por
 * pregunta), leída de `game_settings`, que es la que usa el servidor.
 *
 * Antes las páginas secundarias mostraban la configuración guardada en el
 * navegador (5 preguntas por defecto) aunque el juego fuera de 8.
 */
import { useEffect, useState } from 'react'

import type { QuestionSettings } from '../types'
import { loadCustomSettings } from './appHelpers'
import { supabase } from './supabase'

let enCurso: Promise<QuestionSettings> | null = null

export const obtenerConfiguracionJuego = (): Promise<QuestionSettings> => {
  if (enCurso) return enCurso

  enCurso = (async () => {
    const local = loadCustomSettings()

    try {
      const { data, error } = await supabase
        .from('game_settings')
        .select('questionspergame, secondsperquestion')
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (error || !data) {
        if (error) console.warn('No se pudo leer game_settings:', error.message)
        enCurso = null
        return local
      }

      return {
        questionsPerDay: Number(data.questionspergame) || local.questionsPerDay,
        secondsPerQuestion: Number(data.secondsperquestion) || local.secondsPerQuestion,
      }
    } catch (error) {
      console.warn('No se pudo leer game_settings:', error)
      enCurso = null
      return local
    }
  })()

  return enCurso
}

/** `null` mientras carga. */
export const useConfiguracionJuego = () => {
  const [configuracion, setConfiguracion] = useState<QuestionSettings | null>(null)

  useEffect(() => {
    let vigente = true

    void obtenerConfiguracionJuego().then((valor) => {
      if (vigente) setConfiguracion(valor)
    })

    return () => {
      vigente = false
    }
  }, [])

  return configuracion
}

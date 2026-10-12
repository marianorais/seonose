/**
 * Medición de tráfico y del embudo de crecimiento (Google Analytics 4).
 *
 * El script se carga desde el código y no desde `index.html` por dos motivos:
 *
 *  1. Sin `VITE_GA_MEASUREMENT_ID` definido no se carga NADA. En desarrollo no
 *     se ensucian los datos con nuestras propias pruebas, y el repo no queda
 *     atado a una cuenta concreta.
 *  2. Se carga después del primer render, así que no compite por ancho de banda
 *     con la primera pregunta. La velocidad de carga es parte del producto acá:
 *     la promesa es "entrás y jugás", y además Google la usa para rankear.
 *
 * Todas las funciones son seguras de llamar aunque GA nunca se haya cargado:
 * en ese caso no hacen nada en lugar de romper la partida.
 */

const ID_MEDICION = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined

type ParametrosEvento = Record<string, string | number | boolean | undefined>

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

let iniciado = false

/**
 * Carga GA4 una sola vez. Llamar de más es inofensivo.
 *
 * `anonymize_ip` va activado: para entender de dónde viene el tráfico alcanza
 * con el país y la ciudad, no hace falta guardar la IP completa de cada
 * jugador. Es la configuración que pide el RGPD y no cuesta nada de precisión
 * para lo que necesitamos medir.
 */
export const iniciarAnalitica = (): void => {
  if (iniciado || !ID_MEDICION || typeof window === 'undefined') return

  iniciado = true

  window.dataLayer = window.dataLayer || []

  // `gtag` DEBE usar `arguments`: GA lee el objeto arguments tal cual, y una
  // función flecha con rest params le cambia la forma a lo que recibe.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments)
  }

  window.gtag('js', new Date())
  window.gtag('config', ID_MEDICION, { anonymize_ip: true })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${ID_MEDICION}`
  document.head.appendChild(script)
}

/** Registra un evento. Si GA no está configurado, no hace nada. */
export const registrarEvento = (nombre: string, parametros: ParametrosEvento = {}): void => {
  if (!ID_MEDICION || typeof window === 'undefined' || !window.gtag) return

  window.gtag('event', nombre, parametros)
}

/**
 * Eventos del embudo, nombrados en un solo lugar.
 *
 * Con estos cinco se puede responder la única pregunta que importa para
 * duplicar usuarios: de cada 100 que entran, cuántos terminan la partida,
 * cuántos comparten, y cuántos visitantes nuevos trae cada uno que comparte.
 * Ese último número —visitantes por comparte— es el coeficiente viral: si pasa
 * de 1, la app crece sola.
 */
export const EVENTOS = {
  /** Arrancó a responder la primera pregunta. */
  partidaIniciada: 'partida_iniciada',
  /** Llegó a la pantalla de resultados. */
  partidaTerminada: 'partida_terminada',
  /** Abrió el menú de compartir (intención). */
  compartirAbierto: 'compartir_abierto',
  /** Eligió un canal concreto (WhatsApp, X, Telegram, imagen...). */
  compartido: 'resultado_compartido',
  /** Entró por el link de reto de otra persona. */
  retoRecibido: 'reto_recibido',

  /*
   * Salas y desafíos anteriores. Ningún evento lleva identificadores, alias ni
   * códigos de sala: sólo lo necesario para medir el embudo (crear → invitar →
   * alguien entra por el link → se une → juega).
   */
  /** Creó una sala. */
  salaCreada: 'sala_creada',
  /** Compartió o copió la invitación de una sala (parámetro `canal`). */
  salaInvitacionCompartida: 'sala_invitacion_compartida',
  /** Abrió un link de invitación sin ser integrante. */
  salaInvitacionAbierta: 'sala_invitacion_abierta',
  /** Se unió a una sala por invitación. */
  salaUnido: 'sala_unido',
  /** Compartió el ranking de una sala. */
  salaRankingCompartido: 'sala_ranking_compartido',
  /** Empezó un desafío anterior (parámetro `fecha`). */
  historicoIniciado: 'historico_iniciado',
  /** Terminó un desafío anterior (parámetro `fecha`). */
  historicoCompletado: 'historico_completado',
} as const

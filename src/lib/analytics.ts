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

import { getTodayKey } from './appHelpers'
import { CLAVE_HISTORIAL_RESULTADOS } from './quizHelpers'
import { SITE_URL } from './siteConfig'

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
 * Sólo se mide en el dominio de producción. Los builds de preview de Vercel
 * también son de producción y pueden tener la variable definida: sin este
 * control, cada prueba en un preview sumaría usuarios y partidas falsas.
 */
const esDominioProduccion = (): boolean => {
  if (!import.meta.env.PROD) return false

  const canonico = new URL(SITE_URL).hostname.replace(/^www\./, '')

  return window.location.hostname.replace(/^www\./, '') === canonico
}

/*
 * Atribución de los links compartidos.
 *
 * WhatsApp, Telegram y la mayoría de las apps no mandan referrer: sin marca, el
 * amigo que entra por el resultado de otro aparece como tráfico "directo" y no
 * hay forma de saber cuánto crece el juego por boca en boca. Los UTM resuelven
 * eso, pero un link con tres parámetros largos queda feo en un mensaje entre
 * amigos y se comparte menos. Por eso el link lleva sólo `?c=wa` y acá se
 * traduce a UTM antes de que GA lea la URL.
 *
 * Cuando el canal no se conoce (compartir nativo o copiar, que pueden terminar
 * en cualquier app) la fuente es `compartido`: no se inventa un destino.
 */
export const PARAMETRO_CANAL = 'c'

export type CanalCompartir = 'whatsapp' | 'x' | 'telegram' | 'email' | 'nativo' | 'copiar'

const CODIGO_CANAL: Record<CanalCompartir, string> = {
  whatsapp: 'wa',
  x: 'x',
  telegram: 'tg',
  email: 'em',
  nativo: 'n',
  copiar: 'cp',
}

const FUENTE_POR_CODIGO: Record<string, { fuente: string; canal: CanalCompartir }> = {
  wa: { fuente: 'whatsapp', canal: 'whatsapp' },
  x: { fuente: 'x', canal: 'x' },
  tg: { fuente: 'telegram', canal: 'telegram' },
  em: { fuente: 'email', canal: 'email' },
  n: { fuente: 'compartido', canal: 'nativo' },
  cp: { fuente: 'compartido', canal: 'copiar' },
}

/** Link al sitio marcado con el canal por el que se compartió. */
export const marcarLinkCompartido = (url: string, canal: CanalCompartir): string => {
  const destino = new URL(url)
  destino.searchParams.set(PARAMETRO_CANAL, CODIGO_CANAL[canal])
  return destino.toString()
}

/** Canal del link compartido por el que se llegó, si se llegó por uno. */
const leerLlegadaCompartida = (): { fuente: string; canal: CanalCompartir } | null => {
  const codigo = new URLSearchParams(window.location.search).get(PARAMETRO_CANAL)
  return codigo ? FUENTE_POR_CODIGO[codigo] ?? null : null
}

/**
 * URL que se le informa a GA: la real, más los UTM si se llegó por un link
 * compartido. No se toca la barra de direcciones; sólo lo que ve GA. Si la URL
 * ya trae UTM propios (una campaña manual), se respetan.
 */
const urlParaAnalitica = (llegada: { fuente: string; canal: CanalCompartir } | null): string => {
  const url = new URL(window.location.href)

  if (llegada && !url.searchParams.has('utm_source')) {
    url.searchParams.set('utm_source', llegada.fuente)
    url.searchParams.set('utm_medium', 'share')
    url.searchParams.set('utm_campaign', 'resultado')
    url.searchParams.set('utm_content', llegada.canal)
  }

  return url.toString()
}

/**
 * Carga GA4 una sola vez. Llamar de más es inofensivo.
 *
 * `anonymize_ip` va activado: para entender de dónde viene el tráfico alcanza
 * con el país y la ciudad, no hace falta guardar la IP completa de cada
 * jugador. Es la configuración que pide el RGPD y no cuesta nada de precisión
 * para lo que necesitamos medir.
 *
 * Con `?ga_debug=1` en la URL los eventos aparecen en DebugView de GA, para
 * comprobar la medición en producción sin esperar a los informes.
 */
export const iniciarAnalitica = (): void => {
  if (iniciado || !ID_MEDICION || typeof window === 'undefined' || !esDominioProduccion()) return

  iniciado = true

  window.dataLayer = window.dataLayer || []

  // `gtag` DEBE usar `arguments`: GA lee el objeto arguments tal cual, y una
  // función flecha con rest params le cambia la forma a lo que recibe.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments)
  }

  const llegada = leerLlegadaCompartida()
  const debug = new URLSearchParams(window.location.search).get('ga_debug') === '1'

  window.gtag('js', new Date())
  window.gtag('config', ID_MEDICION, {
    anonymize_ip: true,
    page_location: urlParaAnalitica(llegada),
    ...(debug ? { debug_mode: true } : {}),
  })

  if (llegada) registrarEvento(EVENTOS.visitaCompartida, { canal: llegada.canal })

  registrarVisitaRecurrente()

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

const CLAVE_ULTIMA_VISITA = 'seonose-ultima-visita'

/** Fecha (AAAA-MM-DD) de la última partida guardada en el historial local. */
const ultimaPartidaLocal = (): string | null => {
  try {
    const historial = JSON.parse(window.localStorage.getItem(CLAVE_HISTORIAL_RESULTADOS) ?? '[]') as { date?: string }[]
    const ultima = historial.at(-1)?.date
    return ultima
      ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(ultima))
      : null
  } catch {
    return null
  }
}

const diasEntre = (desde: string, hasta: string): number =>
  Math.round((Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / 86_400_000)

/**
 * `return_visit`: este dispositivo vuelve en un día distinto al de su visita
 * anterior. Como mucho una vez por día, con los días transcurridos.
 *
 * GA ya distingue usuarios nuevos y recurrentes, pero "recurrente" incluye
 * volver a la hora; lo que importa en un juego diario es volver OTRO día. No se
 * guarda ningún identificador: sólo la fecha de la última visita. Si todavía no
 * hay fecha (dispositivos que jugaron antes de este cambio), se toma la de la
 * última partida del historial local, para no tratarlos como nuevos.
 *
 * Límite conocido: es por navegador. Otro dispositivo, modo incógnito o borrar
 * los datos del sitio cuentan como primera visita.
 */
const registrarVisitaRecurrente = (): void => {
  try {
    const hoy = getTodayKey()
    const anterior = window.localStorage.getItem(CLAVE_ULTIMA_VISITA) ?? ultimaPartidaLocal()

    window.localStorage.setItem(CLAVE_ULTIMA_VISITA, hoy)

    if (anterior && anterior < hoy) {
      registrarEvento(EVENTOS.visitaRecurrente, { dias_desde_ultima: diasEntre(anterior, hoy) })
    }
  } catch {
    // Sin localStorage no se puede saber si volvió: no se registra nada.
  }
}

/**
 * Eventos del embudo, nombrados en un solo lugar.
 *
 * Con estos se puede responder la única pregunta que importa para crecer: de
 * cada 100 que entran, cuántos terminan la partida, cuántos comparten, cuántos
 * visitantes nuevos trae cada uno que comparte y cuántos vuelven otro día.
 * Visitantes por comparte es el coeficiente viral: si pasa de 1, la app crece
 * sola.
 *
 * Los parámetros nunca llevan respuestas, alias ni identificadores: sólo el
 * tipo de partida (`diario` / `repetir` / `anterior`), el puntaje y el canal.
 */
export const EVENTOS = {
  /** Empezó una partida (confirmó la bienvenida). */
  partidaIniciada: 'game_start',
  /** Llegó a la pantalla de resultados. Una vez por partida. */
  partidaTerminada: 'game_complete',
  /** Tocó un canal para compartir el resultado (parámetro `canal`). */
  compartido: 'share_click',
  /** Entró por el link compartido de otra persona (parámetro `canal`). */
  visitaCompartida: 'shared_link_visit',
  /** Volvió otro día (parámetro `dias_desde_ultima`). */
  visitaRecurrente: 'return_visit',

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

import { useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_METRIC,
  METRIC_DEFINITIONS,
  METRIC_ORDER,
  PERIOD_DEFINITIONS,
  PERIOD_ORDER,
  construirMensajeProgreso,
  construirRanking,
  obtenerRanking,
} from '../lib/rankingHelpers'
import type {
  PeriodDefinition,
  RankingData,
  RankingEntry,
  RankingMetric,
  RankingPeriod,
  RankingResult,
} from '../lib/rankingHelpers'
import {
  intentarVincularIdentidad,
  obtenerAliasDePlayer,
  obtenerAliasLocal,
} from '../lib/aliasHelpers'
import { obtenerPlayerId } from '../lib/playerIdentity'
import AliasPrompt from './AliasPrompt'

/** Paleta y medalla de cada puesto del podio. */
const PODIUM_STYLES = {
  1: {
    name: 'Oro',
    medal: '🥇',
    gradient: 'from-amber-200 via-amber-400 to-amber-600',
    panel: 'from-amber-50 to-white',
    border: 'border-amber-300',
    text: 'text-amber-700',
    glow: 'shadow-amber-200/60',
  },
  2: {
    name: 'Plata',
    medal: '🥈',
    gradient: 'from-slate-100 via-slate-300 to-slate-500',
    panel: 'from-slate-50 to-white',
    border: 'border-slate-300',
    text: 'text-slate-600',
    glow: 'shadow-slate-200/60',
  },
  3: {
    name: 'Bronce',
    medal: '🥉',
    gradient: 'from-orange-200 via-orange-400 to-orange-700',
    panel: 'from-orange-50 to-white',
    border: 'border-orange-300',
    text: 'text-orange-700',
    glow: 'shadow-orange-200/60',
  },
} as const

type Podium = keyof typeof PODIUM_STYLES

const esPodio = (position: number): position is Podium => position >= 1 && position <= 3

/** Medalla del puesto. Es el único indicador de podio, en los tres lugares donde aparece. */
const Medalla = ({ place, className = '' }: { place: Podium; className?: string }) => (
  <span className={className} role="img" aria-label={`Medalla de ${PODIUM_STYLES[place].name}`}>
    {PODIUM_STYLES[place].medal}
  </span>
)

/** Avatar con emoji y color derivados del alias, para reconocerse de un vistazo. */
const PlayerAvatar = ({ entry, size = 'md' }: { entry: RankingEntry; size?: 'sm' | 'md' | 'lg' }) => {
  const dimensions = {
    sm: 'h-9 w-9 text-lg',
    md: 'h-11 w-11 text-xl',
    lg: 'h-14 w-14 text-2xl sm:h-16 sm:w-16 sm:text-3xl',
  }[size]

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ring-2 ring-white ${dimensions}`}
      style={{ backgroundColor: `hsl(${entry.hue} 85% 92%)` }}
      aria-hidden
    >
      {entry.emoji}
    </span>
  )
}

const YouChip = () => (
  <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-white">
    Vos
  </span>
)

/** Barra de progreso relativa al líder (o al 100% en modo porcentaje). */
const MetricBar = ({ progress, place }: { progress: number; place?: Podium }) => (
  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80" aria-hidden>
    <div
      className={`h-full rounded-full bg-gradient-to-r ${place ? PODIUM_STYLES[place].gradient : 'from-sky-400 to-sky-600'}`}
      style={{ width: `${Math.max(4, Math.min(100, progress))}%` }}
    />
  </div>
)

/**
 * Valor del jugador en la métrica activa. Es el único dato numérico que se
 * muestra: ni tiempos, ni partidas, ni identificadores.
 */
const MetricValue = ({
  entry,
  metric,
  isChampion,
  align,
}: {
  entry: RankingEntry
  metric: RankingMetric
  isChampion: boolean
  align: 'right' | 'center'
}) => (
  <div className={align === 'right' ? 'text-right' : 'text-center'}>
    <p
      className={`font-black tabular-nums leading-none text-slate-900 ${
        isChampion ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
      }`}
    >
      {METRIC_DEFINITIONS[metric].formatear(entry)}
    </p>
  </div>
)

/**
 * Tarjeta de podio con dos disposiciones: en celular es una fila compacta (los
 * tres puestos entran sin scroll), y desde `sm` es una columna que forma el
 * podio 2-1-3 con el campeón elevado.
 */
const PodiumCard = ({
  entry,
  place,
  metric,
  leader,
}: {
  entry: RankingEntry
  place: Podium
  metric: RankingMetric
  leader: RankingEntry
}) => {
  const style = PODIUM_STYLES[place]
  const isChampion = place === 1
  const progress = METRIC_DEFINITIONS[metric].progreso(entry, leader)

  return (
    <div
      className={`relative flex items-center gap-3 rounded-[1.5rem] border bg-gradient-to-b p-3 shadow-lg ${style.border} ${style.panel} ${style.glow} sm:flex-col sm:items-center sm:gap-2 sm:p-4 ${
        isChampion ? 'sm:-mt-4 sm:pb-6' : ''
      } ${entry.isCurrentPlayer ? 'ring-2 ring-sky-500 ring-offset-2' : ''}`}
    >
      <span
        className={`absolute -top-3 left-3 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[0.65rem] font-bold shadow-sm ${style.text} sm:left-1/2 sm:-translate-x-1/2`}
      >
        {place}º {style.name}
      </span>

      <Medalla place={place} className={`shrink-0 leading-none ${isChampion ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'}`} />

      <PlayerAvatar entry={entry} size={isChampion ? 'lg' : 'md'} />

      <div className="min-w-0 flex-1 sm:w-full sm:flex-none sm:text-center">
        <div className="flex items-center gap-2 sm:justify-center">
          <p className={`truncate font-bold text-slate-900 ${isChampion ? 'text-base sm:text-lg' : 'text-sm sm:text-base'}`}>
            {entry.alias}
          </p>
          {entry.isCurrentPlayer && <YouChip />}
        </div>

        {/* Desde sm la cifra va debajo del nombre, centrada en la columna. */}
        <div className="hidden sm:mt-1 sm:block">
          <MetricValue entry={entry} metric={metric} isChampion={isChampion} align="center" />
        </div>

        <MetricBar progress={progress} place={place} />
      </div>

      {/* En celular la cifra va a la derecha para que la fila sea baja. */}
      <div className="shrink-0 sm:hidden">
        <MetricValue entry={entry} metric={metric} isChampion={isChampion} align="right" />
      </div>
    </div>
  )
}

/** Fila del 4º en adelante. */
const RankingRow = ({
  entry,
  metric,
  leader,
}: {
  entry: RankingEntry
  metric: RankingMetric
  leader: RankingEntry
}) => (
  <li
    className={`flex items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-white px-3 py-2.5 ${
      entry.isCurrentPlayer ? 'ring-2 ring-sky-500' : ''
    }`}
  >
    <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-slate-500">{entry.position}</span>

    <PlayerAvatar entry={entry} size="sm" />

    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">{entry.alias}</p>
        {entry.isCurrentPlayer && <YouChip />}
      </div>
      <MetricBar progress={METRIC_DEFINITIONS[metric].progreso(entry, leader)} />
    </div>

    <div className="shrink-0 text-right">
      <p className="text-base font-bold tabular-nums text-slate-900 sm:text-lg">
        {METRIC_DEFINITIONS[metric].formatear(entry)}
      </p>
    </div>
  </li>
)

/**
 * `TuPosicionCard` - Bloque destacado con la posición del jugador que está
 * mirando. Se muestra siempre, incluso si entró al podio: es el que sostiene la
 * sensación de progreso, así que tiene que estar aunque las noticias sean
 * buenas.
 *
 * Cubre los tres estados posibles: ya está en el ranking, jugó pero todavía no
 * llega al mínimo de partidas, o no jugó en el período.
 */
const TuPosicionCard = ({
  result,
  definition,
  metric,
}: {
  result: RankingResult
  definition: PeriodDefinition
  metric: RankingMetric
}) => {
  const { currentPlayer } = result

  const contenido = () => {
    if (currentPlayer) {
      const place = esPodio(currentPlayer.position) ? currentPlayer.position : null

      return (
        <>
          <div className="mt-3 flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-white/10">
              {place ? (
                <>
                  <Medalla place={place} className="text-2xl leading-none" />
                  <span className="mt-1 text-[0.6rem] font-bold uppercase tracking-wider text-white/80">
                    {PODIUM_STYLES[place].name}
                  </span>
                </>
              ) : (
                <span className="text-2xl font-black tabular-nums text-white">#{currentPlayer.position}</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="break-words text-lg font-bold text-white sm:text-xl">{currentPlayer.alias}</p>
              <p className="mt-1 text-base font-semibold text-amber-200">
                ⭐ {METRIC_DEFINITIONS[metric].formatear(currentPlayer)}
              </p>
            </div>
          </div>

          <p className="mt-3 rounded-[1.25rem] bg-white/10 px-4 py-3 text-sm font-semibold text-amber-100">
            {construirMensajeProgreso(currentPlayer, result.playerAbove, metric)}
          </p>
        </>
      )
    }

    if (result.gamesToQualify !== null && result.gamesToQualify > 0) {
      const faltantes = result.gamesToQualify

      return (
        <div className="mt-3">
          <p className="text-lg font-bold text-white">
            Jugaste {result.currentPlayerGames} {result.currentPlayerGames === 1 ? 'partida' : 'partidas'}
          </p>
          <p className="mt-2 rounded-[1.25rem] bg-white/10 px-4 py-3 text-sm font-semibold text-amber-100">
            ⬆️ Te {faltantes === 1 ? 'falta' : 'faltan'} {faltantes} {faltantes === 1 ? 'partida' : 'partidas'} para
            entrar al ranking de este período.
          </p>
        </div>
      )
    }

    return (
      <div className="mt-3">
        <p className="text-lg font-bold text-white">Todavía no estás en este ranking</p>
        <p className="mt-2 rounded-[1.25rem] bg-white/10 px-4 py-3 text-sm font-semibold text-amber-100">
          🎯 Jugá la partida de hoy
          {definition.minGames > 1 ? ` y sumá ${definition.minGames} partidas en el período para entrar.` : ' y entrá al ranking.'}
        </p>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-[1.5rem] border-2 border-sky-500 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-4 shadow-lg sm:p-5">
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-sky-400/20 blur-2xl"
        aria-hidden
      />

      <div className="relative">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-sky-300">👤 Tu posición</p>
        {contenido()}
      </div>
    </div>
  )
}

const PeriodTabs = ({
  period,
  onChange,
}: {
  period: RankingPeriod
  onChange: (next: RankingPeriod) => void
}) => (
  <div role="tablist" aria-label="Período del ranking" className="flex gap-1 rounded-full bg-slate-100 p-1">
    {PERIOD_ORDER.map((option) => {
      const isActive = option === period

      return (
        <button
          key={option}
          type="button"
          role="tab"
          aria-selected={isActive}
          onClick={() => onChange(option)}
          className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold capitalize transition sm:text-base ${
            isActive ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-white hover:text-slate-900'
          }`}
        >
          {option}
        </button>
      )
    })}
  </div>
)

/** Filtro de métrica. Mismo lenguaje visual que `PeriodTabs`, un nivel más abajo. */
const MetricTabs = ({
  metric,
  onChange,
}: {
  metric: RankingMetric
  onChange: (next: RankingMetric) => void
}) => (
  <div role="tablist" aria-label="Criterio del ranking" className="flex gap-1 rounded-full border border-slate-200 bg-white p-1">
    {METRIC_ORDER.map((option) => {
      const isActive = option === metric

      return (
        <button
          key={option}
          type="button"
          role="tab"
          aria-selected={isActive}
          onClick={() => onChange(option)}
          className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
            isActive ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          {METRIC_DEFINITIONS[option].label}
        </button>
      )
    })}
  </div>
)

const SkeletonBoard = () => (
  <div className="animate-pulse space-y-3">
    <div className="grid gap-3 sm:grid-cols-3">
      {[0, 1, 2].map((index) => (
        <div key={index} className="h-24 rounded-[1.5rem] bg-slate-100 sm:h-44" />
      ))}
    </div>
    {[0, 1, 2, 3].map((index) => (
      <div key={index} className="h-14 rounded-[1.25rem] bg-slate-100" />
    ))}
  </div>
)

type BoardState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: RankingData }

/**
 * Se monta con `key={period}`: al cambiar de período React lo reinicia y el
 * estado arranca en "loading" sin necesidad de un setState síncrono dentro del
 * efecto.
 *
 * La métrica NO forma parte de la key: los datos del período se traen una sola
 * vez y alternar entre "Puntos" y "% de aciertos" sólo los reordena en memoria.
 */
const PeriodBoard = ({ period, metric }: { period: RankingPeriod; metric: RankingMetric }) => {
  const [state, setState] = useState<BoardState>({ status: 'loading' })

  useEffect(() => {
    let active = true

    obtenerRanking(period)
      .then((data) => {
        if (active) setState({ status: 'ready', data })
      })
      .catch((error: unknown) => {
        if (!active) return

        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'No se pudo cargar el ranking.',
        })
      })

    return () => {
      active = false
    }
  }, [period])

  const data = state.status === 'ready' ? state.data : null

  const result = useMemo(
    () => (data ? construirRanking(data, metric) : null),
    [data, metric]
  )

  if (state.status === 'loading') return <SkeletonBoard />

  if (state.status === 'error') {
    return (
      <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-5 text-center">
        <p className="text-sm font-semibold text-red-700">No pudimos cargar el ranking</p>
        <p className="mt-1 text-xs text-red-600">{state.message}</p>
      </div>
    )
  }

  if (!result) return <SkeletonBoard />

  const definition = PERIOD_DEFINITIONS[period]

  const podium = result.entries.slice(0, 3)
  const rest = result.entries.slice(3)
  const hayPodio = result.entries.length > 0
  const leader = result.entries[0]

  // En celular se apila 1-2-3; desde `sm` se reordena a 2-1-3 como un podio real.
  const podiumOrder = ['sm:order-2', 'sm:order-1', 'sm:order-3']

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-700 sm:text-base">{result.rangeLabel}</p>
        <p className="text-xs text-slate-500 sm:text-sm">
          {result.totalPlayers} {result.totalPlayers === 1 ? 'jugador' : 'jugadores'} en el ranking
        </p>
      </div>

      {hayPodio ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3 sm:items-end sm:gap-3 sm:pt-4">
            {podium.map((entry, index) => (
              <div key={entry.playerKey} className={podiumOrder[index]}>
                <PodiumCard entry={entry} place={(index + 1) as Podium} metric={metric} leader={leader} />
              </div>
            ))}
          </div>

          {rest.length > 0 && (
            <ul className="space-y-2">
              {rest.map((entry) => (
                <RankingRow key={entry.playerKey} entry={entry} metric={metric} leader={leader} />
              ))}
            </ul>
          )}
        </>
      ) : (
        <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <p className="text-3xl" aria-hidden>
            🏆
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-800">Todavía no hay podio para este período</p>
          <p className="mt-1 text-xs text-slate-600">
            {definition.minGames > 1
              ? `Se necesitan al menos ${definition.minGames} partidas en el período para entrar al ranking.`
              : 'Jugá la partida de hoy y sé el primero en aparecer acá.'}
          </p>
        </div>
      )}

      <TuPosicionCard result={result} definition={definition} metric={metric} />

      <p className="text-center text-[0.7rem] text-slate-500 sm:text-xs">
        {METRIC_DEFINITIONS[metric].criterio}
        {definition.minGames > 1 && ` Mínimo ${definition.minGames} partidas en el período.`}
      </p>
    </div>
  )
}

/**
 * `RankingBoard` - Selector de período + podio. No define layout de pantalla
 * (padding, fondo, ancho máximo): eso lo pone la página que lo usa.
 */
const RankingBoard = () => {
  const [period, setPeriod] = useState<RankingPeriod>('diario')
  const [metric, setMetric] = useState<RankingMetric>(DEFAULT_METRIC)
  // Cambia al guardar el alias para que el podio se recargue y lo muestre.
  const [recarga, setRecarga] = useState(0)
  // Identidad a la que pedirle alias. `null` mientras se averigua o si ya tiene.
  const [playerSinAlias, setPlayerSinAlias] = useState<string | null>(null)

  /**
   * Al entrar al ranking se revisa si este jugador ya tiene alias. Si no lo
   * tiene se le pide, y se le vuelve a pedir en cada visita hasta que ponga uno:
   * no hay marca de "no volver a preguntar".
   *
   * Antes de preguntar se intenta heredar la identidad previa de esta conexión,
   * para no pedirle alias de nuevo a quien ya lo había elegido con el esquema
   * anterior (y para no perderle las partidas).
   */
  useEffect(() => {
    let activo = true

    const revisarAlias = async () => {
      // Si ya se sabe localmente que hay alias, no se molesta ni se consulta.
      if (obtenerAliasLocal()) return

      const playerId = obtenerPlayerId()

      const consulta = await obtenerAliasDePlayer(playerId)

      if (!activo) return

      // Si no se pudo consultar, no se pregunta: no queremos ofrecer algo que
      // después no se va a poder guardar.
      if (!consulta.ok) return

      if (consulta.alias) return

      const heredado = await intentarVincularIdentidad(playerId)

      if (!activo) return

      if (heredado) {
        // Recuperó su alias y su historial: hay que repintar el podio.
        setRecarga((valor) => valor + 1)
        return
      }

      setPlayerSinAlias(playerId)
    }

    revisarAlias()

    return () => {
      activo = false
    }
  }, [])

  return (
    <div className="space-y-4 sm:space-y-5">
      <PeriodTabs period={period} onChange={setPeriod} />
      <MetricTabs metric={metric} onChange={setMetric} />
      <PeriodBoard key={`${period}-${recarga}`} period={period} metric={metric} />

      {playerSinAlias && (
        <AliasPrompt
          isOpen
          playerId={playerSinAlias}
          onClose={() => setPlayerSinAlias(null)}
          onSaved={() => setRecarga((valor) => valor + 1)}
        />
      )}
    </div>
  )
}

export default RankingBoard

import { useEffect, useState } from 'react'
import { PERIOD_DEFINITIONS, PERIOD_ORDER, obtenerRanking } from '../lib/rankingHelpers'
import type { RankingEntry, RankingPeriod, RankingResult } from '../lib/rankingHelpers'

/** Paleta de cada puesto del podio. */
const PODIUM_STYLES = {
  1: {
    name: 'Oro',
    gradient: 'from-amber-200 via-amber-400 to-amber-600',
    panel: 'from-amber-50 to-white',
    border: 'border-amber-300',
    text: 'text-amber-700',
    glow: 'shadow-amber-200/60',
    stops: ['#FEF3C7', '#F59E0B', '#B45309'],
  },
  2: {
    name: 'Plata',
    gradient: 'from-slate-100 via-slate-300 to-slate-500',
    panel: 'from-slate-50 to-white',
    border: 'border-slate-300',
    text: 'text-slate-600',
    glow: 'shadow-slate-200/60',
    stops: ['#F8FAFC', '#CBD5E1', '#64748B'],
  },
  3: {
    name: 'Bronce',
    gradient: 'from-orange-200 via-orange-400 to-orange-700',
    panel: 'from-orange-50 to-white',
    border: 'border-orange-300',
    text: 'text-orange-700',
    glow: 'shadow-orange-200/60',
    stops: ['#FDE4CF', '#EA9A5B', '#92400E'],
  },
} as const

type Podium = keyof typeof PODIUM_STYLES

/** Corona del podio. El degradé lleva el puesto en el id para no colisionar. */
const CrownIcon = ({ place, className = '' }: { place: Podium; className?: string }) => {
  const [from, via, to] = PODIUM_STYLES[place].stops
  const gradientId = `corona-${place}`

  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-label={`Medalla de ${PODIUM_STYLES[place].name}`}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="55%" stopColor={via} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <path d="M3.6 15.8 2.2 7.9a.9.9 0 0 1 1.4-.9l4 2.9 3.5-5.2a.9.9 0 0 1 1.5 0l3.5 5.2 4-2.9a.9.9 0 0 1 1.4.9l-1.4 7.9z" fill={`url(#${gradientId})`} />
      <rect x="3.4" y="17.2" width="17.2" height="3.1" rx="1.1" fill={`url(#${gradientId})`} />
      <circle cx="12" cy="12.4" r="1.15" fill="#fff" fillOpacity="0.75" />
      <circle cx="6.4" cy="12.9" r="0.85" fill="#fff" fillOpacity="0.6" />
      <circle cx="17.6" cy="12.9" r="0.85" fill="#fff" fillOpacity="0.6" />
    </svg>
  )
}

const ClockIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5l3 1.8" strokeLinecap="round" />
  </svg>
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

const AccuracyBar = ({ accuracy, place }: { accuracy: number; place?: Podium }) => (
  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80" aria-hidden>
    <div
      className={`h-full rounded-full bg-gradient-to-r ${place ? PODIUM_STYLES[place].gradient : 'from-sky-400 to-sky-600'}`}
      style={{ width: `${Math.max(4, Math.min(100, accuracy))}%` }}
    />
  </div>
)

const formatearTiempo = (seconds: number | null) => (seconds === null ? '—' : `${seconds}s`)

/** Exactitud, aciertos y tiempo. Se reusa en las dos disposiciones del podio. */
const PodiumStats = ({
  entry,
  isChampion,
  align,
}: {
  entry: RankingEntry
  isChampion: boolean
  align: 'right' | 'center'
}) => (
  <div className={align === 'right' ? 'text-right' : 'text-center'}>
    <p className={`font-black tabular-nums leading-none text-slate-900 ${isChampion ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}>
      {entry.accuracy}%
    </p>
    <p className="mt-1 text-[0.7rem] text-slate-600 sm:text-xs">
      {entry.correct}/{entry.total} aciertos
    </p>
    <div
      className={`mt-0.5 flex items-center gap-1 text-[0.7rem] font-semibold text-slate-600 sm:text-xs ${
        align === 'right' ? 'justify-end' : 'justify-center'
      }`}
    >
      <ClockIcon className="h-3.5 w-3.5" />
      <span className="tabular-nums">{formatearTiempo(entry.avgResponseTime)}</span>
      <span className="font-normal text-slate-500">prom.</span>
    </div>
  </div>
)

/**
 * Tarjeta de podio con dos disposiciones: en celular es una fila compacta (los
 * tres puestos entran sin scroll), y desde `sm` es una columna que forma el
 * podio 2-1-3 con el campeón elevado.
 */
const PodiumCard = ({ entry, place }: { entry: RankingEntry; place: Podium }) => {
  const style = PODIUM_STYLES[place]
  const isChampion = place === 1

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

      <CrownIcon place={place} className={`shrink-0 ${isChampion ? 'h-8 w-8 sm:h-11 sm:w-11' : 'h-7 w-7 sm:h-9 sm:w-9'}`} />

      <PlayerAvatar entry={entry} size={isChampion ? 'lg' : 'md'} />

      <div className="min-w-0 flex-1 sm:w-full sm:flex-none sm:text-center">
        <div className="flex items-center gap-2 sm:justify-center">
          <p className={`truncate font-bold text-slate-900 ${isChampion ? 'text-base sm:text-lg' : 'text-sm sm:text-base'}`}>
            {entry.alias}
          </p>
          {entry.isCurrentPlayer && <YouChip />}
        </div>
        <p className="text-[0.7rem] text-slate-500">#{entry.code}</p>

        {/* Desde sm las cifras van debajo del nombre, centradas en la columna. */}
        <div className="hidden sm:mt-1 sm:block">
          <PodiumStats entry={entry} isChampion={isChampion} align="center" />
        </div>

        <AccuracyBar accuracy={entry.accuracy} place={place} />
      </div>

      {/* En celular las cifras van a la derecha para que la fila sea baja. */}
      <div className="shrink-0 sm:hidden">
        <PodiumStats entry={entry} isChampion={isChampion} align="right" />
      </div>
    </div>
  )
}

/** Fila del 4º en adelante. */
const RankingRow = ({ entry }: { entry: RankingEntry }) => (
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
      <AccuracyBar accuracy={entry.accuracy} />
    </div>

    <div className="shrink-0 text-right">
      <p className="text-base font-bold tabular-nums text-slate-900 sm:text-lg">{entry.accuracy}%</p>
      <p className="flex items-center justify-end gap-1 text-[0.7rem] text-slate-500">
        <ClockIcon className="h-3 w-3" />
        <span className="tabular-nums">{formatearTiempo(entry.avgResponseTime)}</span>
      </p>
    </div>
  </li>
)

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
  | { status: 'ready'; result: RankingResult }

/**
 * Se monta con `key={period}`: al cambiar de período React lo reinicia y el
 * estado arranca en "loading" sin necesidad de un setState síncrono dentro del
 * efecto.
 */
const PeriodBoard = ({ period }: { period: RankingPeriod }) => {
  const [state, setState] = useState<BoardState>({ status: 'loading' })

  useEffect(() => {
    let active = true

    obtenerRanking(period)
      .then((result) => {
        if (active) setState({ status: 'ready', result })
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

  if (state.status === 'loading') return <SkeletonBoard />

  if (state.status === 'error') {
    return (
      <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-5 text-center">
        <p className="text-sm font-semibold text-red-700">No pudimos cargar el ranking</p>
        <p className="mt-1 text-xs text-red-600">{state.message}</p>
      </div>
    )
  }

  const { result } = state
  const definition = PERIOD_DEFINITIONS[period]

  if (result.entries.length === 0) {
    return (
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
    )
  }

  const podium = result.entries.slice(0, 3)
  const rest = result.entries.slice(3)
  const currentOutsideTop =
    result.currentPlayer && !result.entries.some((entry) => entry.isCurrentPlayer)
      ? result.currentPlayer
      : null

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

      <div className="grid gap-4 sm:grid-cols-3 sm:items-end sm:gap-3 sm:pt-4">
        {podium.map((entry, index) => (
          <div key={entry.playerKey} className={podiumOrder[index]}>
            <PodiumCard entry={entry} place={(index + 1) as Podium} />
          </div>
        ))}
      </div>

      {rest.length > 0 && (
        <ul className="space-y-2">
          {rest.map((entry) => (
            <RankingRow key={entry.playerKey} entry={entry} />
          ))}
        </ul>
      )}

      {currentOutsideTop && (
        <div className="space-y-2">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-slate-400">Tu posición</p>
          <ul>
            <RankingRow entry={currentOutsideTop} />
          </ul>
        </div>
      )}

      <p className="text-center text-[0.7rem] text-slate-500 sm:text-xs">
        Se ordena por exactitud; a igual exactitud, gana quien respondió más rápido.
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

  return (
    <div className="space-y-4 sm:space-y-5">
      <PeriodTabs period={period} onChange={setPeriod} />
      <PeriodBoard key={period} period={period} />
    </div>
  )
}

export default RankingBoard

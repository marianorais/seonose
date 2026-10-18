/**
 * /sala/:codigo - Una sala.
 *
 * Quien llega por un link de invitación ve el nombre de la sala, quién la creó
 * y cuántos son, y puede unirse con un toque (si no tiene alias, se lo pide).
 * Los integrantes ven el ranking, la actividad reciente y las opciones para
 * invitar, salir o administrar.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import PaginaBase, { Portada } from '../components/PaginaBase'
import AliasPrompt from '../components/AliasPrompt'
import { BotonConfirmado, Cargando, EstadoVacio, MensajeError } from '../components/Estados'
import CompartirSala from '../components/sala/CompartirSala'
import TablaSala from '../components/sala/TablaSala'
import ActividadSala from '../components/sala/ActividadSala'
import { EVENTOS, registrarEvento } from '../lib/analytics'
import { formatearFechaCorta } from '../lib/fechas'
import { obtenerPlayerId } from '../lib/playerIdentity'
import { mensajeDeError } from '../lib/rpc'
import type { ErrorRpc } from '../lib/rpc'
import {
  MENSAJES_ESTADO_SALA,
  construirLinkSala,
  construirTextoInvitacion,
  construirTextoRanking,
  eliminarSala,
  esCodigoSalaValido,
  obtenerRankingSala,
  salirDeSala,
  unirseASala,
  verSala,
} from '../lib/salas'
import type { DetalleSala, VistaPreviaSala } from '../lib/salas'

type Vista =
  | { tipo: 'cargando' }
  | { tipo: 'error'; error: ErrorRpc }
  | { tipo: 'no-existe' }
  | { tipo: 'invitacion'; sala: VistaPreviaSala }
  | { tipo: 'sala'; sala: DetalleSala }

const VolverASalas = () => (
  <div className="mt-6 text-center">
    <Link
      to="/salas"
      className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
    >
      ← Mis salas
    </Link>
  </div>
)

/* -------------------------------------------------------------------------- */
/* Invitación                                                                 */
/* -------------------------------------------------------------------------- */

const Invitacion = ({
  sala,
  uniendo,
  error,
  onUnirse,
}: {
  sala: VistaPreviaSala
  uniendo: boolean
  error: string | null
  onUnirse: () => void
}) => (
  <div className="overflow-hidden rounded-[2rem] bg-white shadow-lg ring-1 ring-slate-200">
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 px-6 py-7 text-center text-white">
      <p className="text-xs uppercase tracking-[0.3em] text-amber-300">Te invitaron a una sala</p>
      <h1 className="mt-2 break-words text-3xl font-bold">{sala.nombre}</h1>
      <p className="mt-2 text-sm text-slate-300">
        {sala.creadaPor ? `Creada por ${sala.creadaPor} · ` : ''}
        {sala.integrantes} {sala.integrantes === 1 ? 'integrante' : 'integrantes'}
      </p>
    </div>

    <div className="space-y-4 px-6 py-6">
      <p className="text-center text-base text-slate-700">
        Todos los días hay un desafío de preguntas de cultura general. Jugalo y compará tu resultado con el resto de la
        sala.
      </p>

      {error && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onUnirse}
        disabled={uniendo}
        className="w-full rounded-2xl bg-slate-900 px-6 py-4 text-base font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
      >
        {uniendo ? 'Uniéndote…' : 'Unirme a la sala'}
      </button>

      <Link to="/" className="block text-center text-sm font-semibold text-slate-600 underline-offset-4 hover:underline">
        Ahora no, quiero jugar
      </Link>
    </div>
  </div>
)

/* -------------------------------------------------------------------------- */
/* Opciones                                                                   */
/* -------------------------------------------------------------------------- */

const OpcionesSala = ({
  sala,
  playerId,
  onSalir,
}: {
  sala: DetalleSala
  playerId: string
  onSalir: () => void
}) => {
  const [ocupado, setOcupado] = useState(false)
  const [mensaje, setMensaje] = useState<{ tono: 'ok' | 'error'; texto: string } | null>(null)

  const ejecutar = async (accion: () => Promise<{ ok: boolean; texto?: string }>) => {
    if (ocupado) return
    setOcupado(true)
    setMensaje(null)
    const resultado = await accion()
    setOcupado(false)
    if (resultado.texto) setMensaje({ tono: resultado.ok ? 'ok' : 'error', texto: resultado.texto })
  }

  const salirOEliminar = (eliminar: boolean) =>
    void ejecutar(async () => {
      const respuesta = eliminar ? await eliminarSala(sala.codigo, playerId) : await salirDeSala(sala.codigo, playerId)

      if (!respuesta.ok) return { ok: false, texto: mensajeDeError(respuesta.error) }
      if (respuesta.datos.estado !== 'ok') return { ok: false, texto: MENSAJES_ESTADO_SALA[respuesta.datos.estado] }

      onSalir()
      return { ok: true }
    })

  return (
    <details className="group rounded-3xl border border-slate-200 bg-white px-5 py-4">
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700">
        <span aria-hidden>⚙️ </span>Opciones de la sala
        <span className="float-right text-slate-400 transition group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>

      <div className="mt-4 space-y-4">
        {mensaje && (
          <p
            role={mensaje.tono === 'error' ? 'alert' : 'status'}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
              mensaje.tono === 'error' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'
            }`}
          >
            {mensaje.texto}
          </p>
        )}

        <BotonConfirmado
          etiqueta="Salir de la sala"
          pregunta={
            sala.soyPropietario
              ? '¿Seguro que querés salir? La sala pasa a quien esté hace más tiempo. Tus partidas no se borran.'
              : '¿Seguro que querés salir? Tus partidas no se borran y podés volver con el mismo link.'
          }
          confirmar="Sí, salir"
          ocupado={ocupado}
          onConfirmar={() => salirOEliminar(false)}
        />

        {sala.soyPropietario && (
          <BotonConfirmado
            etiqueta="Eliminar la sala"
            pregunta="¿Eliminar la sala para todos? El link deja de funcionar. Las partidas de cada uno no se borran."
            confirmar="Sí, eliminar"
            ocupado={ocupado}
            onConfirmar={() => salirOEliminar(true)}
          />
        )}
      </div>
    </details>
  )
}

/* -------------------------------------------------------------------------- */
/* Sala                                                                       */
/* -------------------------------------------------------------------------- */

const mensajeInvitar = (integrantes: number) => {
  if (integrantes <= 1) return 'Por ahora estás solo. Invitá a tu grupo: la gracia es competir.'
  if (integrantes === 2) return 'Una sala se pone buena con 3 o más. Sumá a alguien más.'
  return 'Cuantos más, mejor. Pasale el link a quien quieras.'
}

const fechaCompetencia = (fecha: string) =>
  new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' }).format(
    new Date(fecha)
  )

const VistaSala = ({
  sala,
  esNueva,
  playerId,
  onSalir,
}: {
  sala: DetalleSala
  esNueva: boolean
  playerId: string
  onSalir: () => void
}) => {
  const link = construirLinkSala(sala.codigo)
  const yo = sala.tabla.find((fila) => fila.esActual) ?? null
  const alguienJugo = sala.tabla.some((fila) => fila.partidas > 0)
  const destacarInvitacion = esNueva || sala.integrantes < 3
  const diasRestantes = sala.temporada.diasRestantes
  const cierreReciente = sala.cierres[sala.cierres.length - 1] ?? null
  const campeonAnterior = sala.historial[0] ?? null

  const invitacion = (
    <section aria-labelledby="titulo-invitar" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 id="titulo-invitar" className="text-lg font-bold text-slate-900">
        <span aria-hidden>📣 </span>Invitá a tu grupo
      </h2>
      <p className="mt-1 text-sm text-slate-600">{mensajeInvitar(sala.integrantes)}</p>
      <div className="mt-4">
        <CompartirSala
          texto={construirTextoInvitacion(sala.nombre, link)}
          link={link}
          titulo={`Sala ${sala.nombre} en Se o NoSe`}
          destacado={destacarInvitacion}
        />
      </div>
    </section>
  )

  return (
    <div className="space-y-5">
      <Portada
        etiqueta="Sala"
        icono="👥"
        titulo={sala.nombre}
        bajada={`${sala.integrantes} ${sala.integrantes === 1 ? 'integrante' : 'integrantes'} · los puntos cuentan desde el ${formatearFechaCorta(sala.desde)}`}
      >
        {yo && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white">
            {yo.partidas > 0 ? (
              <>
                <span aria-hidden>📍</span> Vas {yo.posicion}º de {sala.tabla.length} con {yo.puntos}{' '}
                {yo.puntos === 1 ? 'punto' : 'puntos'}
              </>
            ) : (
              <>
                <span aria-hidden>📍</span> Todavía no sumaste puntos
              </>
            )}
          </p>
        )}
      </Portada>

      <section className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm" aria-label="Temporada actual">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-700">Competencia de sala</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">Temporada de 30 días</h2>
            <p className="mt-1 text-sm text-slate-600">
              {fechaCompetencia(sala.temporada.empiezaEn)} – {fechaCompetencia(sala.temporada.terminaEn)}
            </p>
          </div>
          <p className="rounded-full bg-white px-4 py-2 text-sm font-bold text-indigo-900 ring-1 ring-indigo-200">
            {diasRestantes === 0 ? 'Cierre pendiente' : `Quedan ${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'}`}
          </p>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          Al cerrar se conservan las partidas y se reinician sólo los puntos de competencia. Cada campeón suma una copa permanente.
        </p>
        {campeonAnterior && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-bold text-amber-950">🏆 Campeón de la temporada anterior</p>
            <p className="mt-1 text-sm text-slate-800">
              {campeonAnterior.campeones.length
                ? campeonAnterior.campeones.map((campeon) => `${campeon.alias} · ${campeon.puntaje} pts`).join(' / ')
                : 'Esta temporada terminó sin puntos válidos.'}
            </p>
          </div>
        )}
      </section>

      {cierreReciente && (
        <section role="status" className="rounded-3xl border border-amber-300 bg-amber-50 px-5 py-4 shadow-sm">
          <p className="font-bold text-amber-950">🎉 ¡Terminó una temporada y ya empezó otra!</p>
          <p className="mt-1 text-sm text-slate-700">
            {cierreReciente.campeones.length
              ? `La copa de sala es para ${cierreReciente.campeones.map((campeon) => `${campeon.alias} (${campeon.puntaje} pts)`).join(' y ')}.`
              : 'No hubo partidas con puntos válidos; esta vez no se otorgó una copa.'}
            {' '}Las partidas y los trofeos anteriores siguen guardados.
          </p>
        </section>
      )}

      {esNueva && (
        <p role="status" className="rounded-3xl bg-emerald-50 px-5 py-4 text-center text-base font-semibold text-emerald-900">
          <span aria-hidden>🎉 </span>¡Listo, tu sala está creada! Ahora invitá a tu grupo.
        </p>
      )}

      {destacarInvitacion && invitacion}

      {yo && !yo.jugoHoy ? (
        <Link
          to="/"
          className="group flex items-center justify-between gap-4 rounded-3xl bg-slate-900 px-5 py-4 text-white shadow-lg transition hover:bg-slate-800"
        >
          <span>
            <span className="block text-[0.65rem] uppercase tracking-[0.3em] text-amber-300">Hoy</span>
            <span className="block text-base font-bold sm:text-lg">Jugá el desafío de hoy y sumá puntos</span>
          </span>
          <span className="text-xl text-amber-300 transition group-hover:translate-x-1" aria-hidden>
            →
          </span>
        </Link>
      ) : (
        yo && (
          <p className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-900">
            <span aria-hidden>✓ </span>Ya jugaste hoy. Volvé mañana para defender tu puesto.
          </p>
        )
      )}

      {!alguienJugo && (
        <EstadoVacio icono="🏁" titulo="El ranking arranca con el próximo desafío">
          <p>Suma cada desafío desde el día en que se creó la sala, aunque lo juegues después. ¡Que empiece la competencia!</p>
        </EstadoVacio>
      )}

      <TablaSala tabla={sala.tabla} />

      {alguienJugo && (
        <details className="rounded-3xl border border-slate-200 bg-white px-5 py-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">
            <span aria-hidden>🏆 </span>Compartir el ranking
          </summary>
          <p className="mt-2 text-sm text-slate-600">Se comparten sólo los tres primeros con sus puntos.</p>
          <div className="mt-3">
            <CompartirSala
              texto={construirTextoRanking(sala.nombre, sala.tabla, link)}
              link={link}
              titulo={`Ranking de ${sala.nombre}`}
              evento={EVENTOS.salaRankingCompartido}
            />
          </div>
        </details>
      )}

      <ActividadSala actividad={sala.actividad} desde={sala.desde} />

      {sala.historial.length > 0 && (
        <details className="rounded-3xl border border-slate-200 bg-white px-5 py-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">
            <span aria-hidden>🏆 </span>Historial de temporadas
          </summary>
          <ol className="mt-3 space-y-2">
            {sala.historial.map((periodo) => (
              <li key={periodo.empiezaEn} className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold text-slate-600">
                  {fechaCompetencia(periodo.empiezaEn)} – {fechaCompetencia(periodo.terminaEn)}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {periodo.campeones.length
                    ? periodo.campeones.map((campeon) => `${campeon.alias} · ${campeon.puntaje} pts`).join(' / ')
                    : 'Temporada sin campeón'}
                </p>
              </li>
            ))}
          </ol>
        </details>
      )}

      {!destacarInvitacion && invitacion}

      <OpcionesSala sala={sala} playerId={playerId} onSalir={onSalir} />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Página                                                                     */
/* -------------------------------------------------------------------------- */

function SalaPage() {
  const { codigo: codigoParam } = useParams()
  const [parametros] = useSearchParams()
  const navigate = useNavigate()

  const codigo = codigoParam?.toLowerCase()
  const codigoValido = esCodigoSalaValido(codigo)
  const esNueva = parametros.get('nueva') === '1'
  const playerId = useMemo(() => obtenerPlayerId(), [])

  const [vista, setVista] = useState<Vista>(() => (codigoValido ? { tipo: 'cargando' } : { tipo: 'no-existe' }))
  const [intento, setIntento] = useState(0)
  const [uniendo, setUniendo] = useState(false)
  const [errorUnirse, setErrorUnirse] = useState<string | null>(null)
  const [pedirAlias, setPedirAlias] = useState(false)
  const invitacionRegistrada = useRef(false)

  useEffect(() => {
    if (!codigoValido || !codigo) return

    let vigente = true

    const cargar = async () => {
      const previa = await verSala(codigo, playerId)

      if (!vigente) return
      if (!previa.ok) return setVista({ tipo: 'error', error: previa.error })
      if (previa.datos.estado !== 'ok') return setVista({ tipo: 'no-existe' })

      if (!previa.datos.datos.esIntegrante) {
        if (!invitacionRegistrada.current) {
          invitacionRegistrada.current = true
          registrarEvento(EVENTOS.salaInvitacionAbierta)
        }

        return setVista({ tipo: 'invitacion', sala: previa.datos.datos })
      }

      const detalle = await obtenerRankingSala(codigo, playerId)

      if (!vigente) return
      if (!detalle.ok) return setVista({ tipo: 'error', error: detalle.error })
      if (detalle.datos.estado !== 'ok') return setVista({ tipo: 'no-existe' })

      setVista({ tipo: 'sala', sala: detalle.datos.datos })
    }

    void cargar()

    return () => {
      vigente = false
    }
  }, [codigo, codigoValido, playerId, intento])

  const recargar = useCallback(() => {
    setVista({ tipo: 'cargando' })
    setIntento((valor) => valor + 1)
  }, [])

  const unirse = useCallback(async () => {
    if (!codigo || uniendo) return

    setUniendo(true)
    setErrorUnirse(null)

    const respuesta = await unirseASala(codigo, playerId)

    setUniendo(false)

    if (!respuesta.ok) {
      setErrorUnirse(mensajeDeError(respuesta.error))
      return
    }

    if (respuesta.datos.estado === 'sin-alias') {
      setPedirAlias(true)
      return
    }

    if (respuesta.datos.estado !== 'ok') {
      setErrorUnirse(MENSAJES_ESTADO_SALA[respuesta.datos.estado])
      return
    }

    registrarEvento(EVENTOS.salaUnido)
    recargar()
  }, [codigo, playerId, recargar, uniendo])

  return (
    <PaginaBase>
      {vista.tipo === 'cargando' && <Cargando texto="Abriendo la sala…" />}

      {vista.tipo === 'error' && <MensajeError mensaje={mensajeDeError(vista.error)} onReintentar={recargar} />}

      {vista.tipo === 'no-existe' && (
        <>
          <EstadoVacio icono="🔍" titulo="No encontramos esta sala">
            <p>{MENSAJES_ESTADO_SALA['no-existe']}</p>
            <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
              <Link to="/salas" className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700">
                Creá tu sala
              </Link>
              <Link
                to="/"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Jugá el desafío de hoy
              </Link>
            </div>
          </EstadoVacio>
        </>
      )}

      {vista.tipo === 'invitacion' && (
        <Invitacion sala={vista.sala} uniendo={uniendo} error={errorUnirse} onUnirse={() => void unirse()} />
      )}

      {vista.tipo === 'sala' && (
        <>
          <VistaSala
            sala={vista.sala}
            esNueva={esNueva}
            playerId={playerId}
            onSalir={() => navigate('/salas', { replace: true })}
          />
          <VolverASalas />
        </>
      )}

      <AliasPrompt
        isOpen={pedirAlias}
        playerId={playerId}
        onClose={() => setPedirAlias(false)}
        onSaved={() => {
          setPedirAlias(false)
          void unirse()
        }}
      />
    </PaginaBase>
  )
}

export default SalaPage

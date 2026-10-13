// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}))

const { default: DesafiosAnterioresPage } = await import('./DesafiosAnterioresPage')

/** Archivo simulado: todos los días desde el 05/08 hasta ayer, salvo el 20/09. */
const ARCHIVO = (() => {
  const filas: Record<string, unknown>[] = []
  for (let dia = new Date(Date.UTC(2026, 9, 11)); dia >= new Date(Date.UTC(2026, 7, 5)); dia.setUTCDate(dia.getUTCDate() - 1)) {
    const fecha = dia.toISOString().slice(0, 10)
    if (fecha === '2026-09-20') continue
    filas.push({
      fecha,
      jugada: fecha === '2026-10-08' || fecha === '2026-10-05',
      jugada_en_vivo: fecha === '2026-10-05',
      correctas: fecha === '2026-10-08' ? 6 : fecha === '2026-10-05' ? 4 : null,
      total: fecha === '2026-10-08' || fecha === '2026-10-05' ? 8 : null,
    })
  }
  return filas
})()

/** Igual que la función de la base: del más reciente al más viejo, paginado. */
const desafiosAnteriores = (parametros: { p_antes_de: string | null; p_limite: number }) => {
  const candidatas = ARCHIVO.filter((fila) => !parametros.p_antes_de || String(fila.fecha) < parametros.p_antes_de)
  return {
    data: { fechas: candidatas.slice(0, parametros.p_limite), hay_mas: candidatas.length > parametros.p_limite },
    error: null,
  }
}

const renderizar = () =>
  render(
    <MemoryRouter>
      <DesafiosAnterioresPage />
    </MemoryRouter>
  )

/**
 * IntersectionObserver simulado: la prueba decide cuándo el final de la lista
 * "aparece en pantalla" (como si el usuario bajara).
 */
let observadores: { callback: IntersectionObserverCallback; nodos: Element[] }[] = []

class ObservadorFalso {
  callback: IntersectionObserverCallback
  nodos: Element[] = []
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    observadores.push(this)
  }
  observe(nodo: Element) {
    this.nodos.push(nodo)
  }
  disconnect() {
    observadores = observadores.filter((observador) => observador !== this)
  }
  unobserve() {}
  takeRecords() {
    return []
  }
}

/** Simula bajar hasta el final de la lista. */
const bajarHastaElFinal = () => {
  for (const observador of [...observadores]) {
    observador.callback(
      observador.nodos.map((target) => ({ isIntersecting: true, target }) as IntersectionObserverEntry),
      observador as unknown as IntersectionObserver
    )
  }
}

const mes = (titulo: string) => within(screen.getByRole('heading', { name: titulo }).closest('section') as HTMLElement)

beforeEach(() => {
  rpc.mockReset()
  rpc.mockImplementation(async (_nombre: string, parametros: { p_antes_de: string | null; p_limite: number }) =>
    desafiosAnteriores(parametros)
  )
  window.localStorage.clear()
  observadores = []
  vi.stubGlobal('IntersectionObserver', ObservadorFalso)
  // Hoy: 12/10/2026 al mediodía en Argentina. Sólo se simula la fecha.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-12T15:00:00Z'))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('archivo en calendario', () => {
  it('arranca con el mes actual y el anterior, con el encabezado de las otras pantallas', async () => {
    renderizar()

    expect(screen.getByRole('heading', { name: 'Desafíos anteriores' })).toBeTruthy()
    expect(screen.queryByText('Archivo')).toBeNull()
    expect(screen.queryByText(/Te perdiste algún día/)).toBeNull()
    expect(screen.queryByRole('list', { name: 'Referencias' })).toBeNull()
    expect(await screen.findByRole('heading', { name: 'Octubre 2026' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Septiembre 2026' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Agosto 2026' })).toBeNull()
  })

  it('cada día muestra su estado real, no sólo con color', async () => {
    // Partida a medias del 09/10 en este navegador.
    window.localStorage.setItem('seonose-quiz-state-anterior-2026-10-09', JSON.stringify({ dayKey: '2026-10-09', currentIndex: 2 }))

    renderizar()
    const octubre = mes(await screen.findByRole('heading', { name: 'Octubre 2026' }).then((h) => h.textContent ?? ''))

    // Disponible: se puede jugar, con el número real del desafío.
    const disponible = octubre.getByRole('link', { name: /Jugar el desafío del sábado, 10 de octubre, desafío #96/ })
    expect(disponible.getAttribute('href')).toBe('/anteriores/2026-10-10')
    expect(within(disponible).getByText('#96')).toBeTruthy()

    // En curso.
    expect(octubre.getByRole('link', { name: /Continuar el desafío del viernes, 9 de octubre.*en curso/ })).toBeTruthy()

    // Completado (como desafío anterior) y jugado en vivo: muestran el resultado.
    expect(octubre.getByRole('link', { name: /8 de octubre, desafío #94: completado, 6 de 8 correctas/ })).toBeTruthy()
    expect(octubre.getByRole('link', { name: /5 de octubre, desafío #91: lo jugaste ese día, 4 de 8 correctas/ })).toBeTruthy()

    // Hoy: lleva al desafío del día.
    const deHoy = octubre.getByRole('link', { name: /Hoy, lunes, 12 de octubre/ })
    expect(deHoy.getAttribute('href')).toBe('/')
    expect(deHoy.getAttribute('aria-current')).toBe('date')

    // Futuro: no se puede elegir y no inventa número de desafío.
    const futuro = octubre.getByRole('img', { name: /13 de octubre: todavía no salió/ })
    expect(futuro.getAttribute('aria-disabled')).toBe('true')
    expect(futuro.textContent).not.toContain('#')
  })

  it('un día sin desafío no es jugable', async () => {
    renderizar()
    const septiembre = mes(await screen.findByRole('heading', { name: 'Septiembre 2026' }).then((h) => h.textContent ?? ''))

    expect(septiembre.getByRole('img', { name: /20 de septiembre: sin desafío para jugar/ })).toBeTruthy()
    expect(septiembre.queryByRole('link', { name: /20 de septiembre/ })).toBeNull()
  })

  it('los días caen en su columna: octubre de 2026 arranca un jueves', async () => {
    renderizar()
    const octubre = (await screen.findByRole('heading', { name: 'Octubre 2026' })).closest('section') as HTMLElement
    // Los huecos están ocultos para lectores de pantalla: se cuentan por estructura.
    const celdas = Array.from(octubre.querySelectorAll('ol > li'))

    // Domingo a miércoles vacíos, el 1 en la quinta columna (jueves).
    expect(celdas.slice(0, 4).every((celda) => celda.textContent === '')).toBe(true)
    expect(celdas[4].textContent).toContain('1')
    expect(celdas).toHaveLength(4 + 31)
  })

  it('al bajar se cargan solos los meses anteriores, en orden, hasta el inicio del archivo', async () => {
    renderizar()
    await screen.findByRole('heading', { name: 'Septiembre 2026' })

    // No hay botón: se carga bajando.
    expect(screen.queryByRole('button', { name: /Ver meses/ })).toBeNull()

    bajarHastaElFinal()

    expect(await screen.findByRole('heading', { name: 'Agosto 2026' })).toBeTruthy()

    // Del más reciente al más viejo.
    expect(screen.getAllByRole('heading', { level: 2 }).map((titulo) => titulo.textContent)).toEqual([
      'Octubre 2026',
      'Septiembre 2026',
      'Agosto 2026',
    ])

    // Agosto es el primer mes del archivo: no queda nada más para cargar.
    await waitFor(() => expect(observadores).toHaveLength(0))

    const agosto = mes('Agosto 2026')
    expect(agosto.getByRole('img', { name: /4 de agosto: sin desafío para jugar/ })).toBeTruthy()
    expect(agosto.getByRole('link', { name: /Jugar el desafío del miércoles, 5 de agosto/ })).toBeTruthy()

    // Siempre se pide desde la fecha más vieja ya cargada: nada se pide dos veces.
    const cursores = rpc.mock.calls.map(([, parametros]) => parametros.p_antes_de)
    expect(new Set(cursores).size).toBe(cursores.length)
  })

  it('error de conexión con reintento', async () => {
    rpc.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    renderizar()

    fireEvent.click(await screen.findByRole('button', { name: 'Probar de nuevo' }))

    expect(await screen.findByRole('heading', { name: 'Octubre 2026' })).toBeTruthy()
  })

  it('sin ningún desafío anterior, lo explica', async () => {
    rpc.mockImplementation(async () => ({ data: { fechas: [], hay_mas: false }, error: null }))

    renderizar()

    expect(await screen.findByText('Todavía no hay desafíos anteriores')).toBeTruthy()
  })
})

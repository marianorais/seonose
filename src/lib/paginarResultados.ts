const PAGE_SIZE = 1000

interface PageResult<T> {
  data: T[] | null
  error: { message: string } | null
}

export const cargarTodasLasPaginas = async <T>(
  cargarPagina: (desde: number, hasta: number) => Promise<PageResult<T>>
): Promise<T[]> => {
  const filas: T[] = []

  for (let desde = 0; ; desde += PAGE_SIZE) {
    const { data, error } = await cargarPagina(desde, desde + PAGE_SIZE - 1)

    if (error) {
      throw error
    }

    if (!data || data.length === 0) {
      return filas
    }

    filas.push(...data)

    if (data.length < PAGE_SIZE) {
      return filas
    }
  }
}

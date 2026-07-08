/**
 * Acceso a la tabla `mejoras` de Supabase.
 * - enviarMejora: alta desde el formulario de contacto.
 * - fetchMejoras: listado para la vista interna /mejoras.
 */
import { supabase } from './supabase'

export interface Mejora {
  id: number
  texto: string
  nombre: string | null
  telefono: string | null
  created_at: string
}

export interface NuevaMejora {
  texto: string
  nombre?: string
  telefono?: string
  userip?: string | null
  useragent?: string
}

export const enviarMejora = async (input: NuevaMejora) =>
  supabase.from('mejoras').insert({
    texto: input.texto.trim(),
    nombre: input.nombre?.trim() || null,
    telefono: input.telefono?.trim() || null,
    userip: input.userip ?? null,
    useragent: input.useragent ?? null,
  })

export const fetchMejoras = async (): Promise<Mejora[]> => {
  const { data, error } = await supabase
    .from('mejoras')
    .select('id, texto, nombre, telefono, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error cargando mejoras:', error)
    throw error
  }

  return (data ?? []) as Mejora[]
}

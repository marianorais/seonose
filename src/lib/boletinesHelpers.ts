/**
 * Acceso a la tabla `boletines` de Supabase.
 * Mantiene la lectura pública de los boletines activos y la gestión
 * administrativa desde la ruta oculta `/adminBoletin`.
 */
import { supabase } from './supabase'

export interface Boletin {
  id: number
  titulo: string
  descripcion: string
  activo: boolean
  fecha_creacion: string
  fecha_actualizacion: string | null
}

export interface DatosBoletin {
  titulo: string
  descripcion: string
  activo?: boolean
}

export const fetchBoletinesActivos = async (): Promise<Boletin[]> => {
  const { data, error } = await supabase
    .from('boletines')
    .select('id, titulo, descripcion, activo, fecha_creacion, fecha_actualizacion')
    .eq('activo', true)
    .order('fecha_creacion', { ascending: false })

  if (error) {
    console.error('Error cargando boletines activos:', error)
    throw error
  }

  return (data ?? []) as Boletin[]
}

export const fetchBoletinesAdmin = async (): Promise<Boletin[]> => {
  const { data, error } = await supabase
    .from('boletines')
    .select('id, titulo, descripcion, activo, fecha_creacion, fecha_actualizacion')
    .order('fecha_creacion', { ascending: false })

  if (error) {
    console.error('Error cargando boletines para administración:', error)
    throw error
  }

  return (data ?? []) as Boletin[]
}

export const createBoletin = async (input: DatosBoletin) => {
  const { data, error } = await supabase
    .from('boletines')
    .insert({
      titulo: input.titulo.trim(),
      descripcion: input.descripcion,
      activo: input.activo ?? true,
    })
    .select('id, titulo, descripcion, activo, fecha_creacion, fecha_actualizacion')
    .single()

  if (error) {
    console.error('Error creando boletín:', error)
    throw error
  }

  return data as Boletin
}

export const updateBoletin = async (id: number, input: Partial<DatosBoletin>) => {
  const payload: Record<string, unknown> = {}

  if (input.titulo !== undefined) {
    payload.titulo = input.titulo.trim()
  }

  if (input.descripcion !== undefined) {
    payload.descripcion = input.descripcion
  }

  if (input.activo !== undefined) {
    payload.activo = input.activo
  }

  const { data, error } = await supabase
    .from('boletines')
    .update(payload)
    .eq('id', id)
    .select('id, titulo, descripcion, activo, fecha_creacion, fecha_actualizacion')
    .single()

  if (error) {
    console.error('Error actualizando boletín:', error)
    throw error
  }

  return data as Boletin
}

export const deleteBoletin = async (id: number) => {
  const { error } = await supabase
    .from('boletines')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error eliminando boletín:', error)
    throw error
  }
}

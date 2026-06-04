import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase compartido por la aplicación.
 * Mantiene la exportación `supabase` para compatibilidad con imports.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
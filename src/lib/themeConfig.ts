/**
 * Helper para persistir la configuración de apariencia del juego.
 * Se usa para aplicar el fondo y la tipografía en todas las pantallas.
 */
export const THEME_BACKGROUND_KEY = 'seonose-background-color'
export const THEME_FONT_KEY = 'seonose-font-family'

export interface ThemeConfig {
  backgroundColor?: string
  fontFamily?: string
}

export const loadThemeConfig = (): ThemeConfig => {
  try {
    return {
      backgroundColor: window.localStorage.getItem(THEME_BACKGROUND_KEY) ?? undefined,
      fontFamily: window.localStorage.getItem(THEME_FONT_KEY) ?? undefined,
    }
  } catch {
    return {}
  }
}

export const saveThemeConfig = (config: ThemeConfig) => {
  try {
    if (config.backgroundColor !== undefined) {
      window.localStorage.setItem(THEME_BACKGROUND_KEY, config.backgroundColor)
    }

    if (config.fontFamily !== undefined) {
      window.localStorage.setItem(THEME_FONT_KEY, config.fontFamily)
    }
  } catch {
    // Ignore storage errors.
  }
}

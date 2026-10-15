export const AVATAR_PREDEFINIDOS = [
  '👤',
  '🎮',
  '🦊',
  '🐼',
  '🐸',
  '🐯',
  '🐙',
  '🦉',
  '🐬',
  '🦄',
  '🐧',
  '🤖',
  '🌟',
  '🐻',
  '🐰',
  '🐹',
  '🐮',
  '🐷',
  '🐵',
  '🐔',
  '🦁',
  '🐺',
  '🦋',
  '🌈',
  '⚽',
  '🚀',
] as const

export type AvatarPredefinido = (typeof AVATAR_PREDEFINIDOS)[number]

export const AVATAR_PREDETERMINADO: AvatarPredefinido = '👤'

export const esAvatarPredefinido = (avatar: string | null | undefined): avatar is AvatarPredefinido =>
  AVATAR_PREDEFINIDOS.some((opcion) => opcion === avatar)

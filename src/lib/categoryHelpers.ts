export interface QuestionCategoryMeta {
  id: number
  name: string
  icon: string
  badgeClassName: string
}

export const QUESTION_CATEGORY_OPTIONS: QuestionCategoryMeta[] = [
  { id: 1, name: 'Historia', icon: '⏳', badgeClassName: 'border-amber-200 bg-amber-50 text-amber-700' },
  { id: 2, name: 'Ciencias Naturales', icon: '🌿', badgeClassName: 'border-green-200 bg-green-50 text-green-700' },
  { id: 3, name: 'Física y Matemáticas', icon: '📐', badgeClassName: 'border-sky-200 bg-sky-50 text-sky-700' },
  { id: 4, name: 'Geografía', icon: '🌍', badgeClassName: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  { id: 5, name: 'Literatura', icon: '🖋️', badgeClassName: 'border-rose-200 bg-rose-50 text-rose-700' },
  { id: 6, name: 'Deportes', icon: '🏆', badgeClassName: 'border-violet-200 bg-violet-50 text-violet-700' },
  { id: 7, name: 'Derecho', icon: '⚖️', badgeClassName: 'border-indigo-200 bg-indigo-50 text-indigo-700' },
  { id: 8, name: 'Música', icon: '🎼', badgeClassName: 'border-pink-200 bg-pink-50 text-pink-700' },
]

const DEFAULT_CATEGORY_META: QuestionCategoryMeta = {
  id: 0,
  name: 'Sin categoría',
  icon: '🧩',
  badgeClassName: 'border-slate-200 bg-slate-100 text-slate-600',
}

const CATEGORY_ALIASES: Record<string, string> = {
  historia: 'Historia',
  'ciencias naturales': 'Ciencias Naturales',
  cienciasnaturales: 'Ciencias Naturales',
  'fisica y matematicas': 'Física y Matemáticas',
  fisicaymatematicas: 'Física y Matemáticas',
  fisica: 'Física y Matemáticas',
  matematica: 'Física y Matemáticas',
  geografia: 'Geografía',
  literatura: 'Literatura',
  deportes: 'Deportes',
  derecho: 'Derecho',
  musica: 'Música',
  'sin categoria': 'Sin categoría',
  general: 'Sin categoría',
}

export const getCategoryMeta = (
  categoryId?: number | null,
  categoryName?: string | null,
  categoryIcon?: string | null,
): QuestionCategoryMeta => {
  if (typeof categoryId === 'number' && categoryId > 0) {
    const directMatch = QUESTION_CATEGORY_OPTIONS.find((option) => option.id === categoryId)
    if (directMatch) {
      return {
        ...directMatch,
        icon: categoryIcon ?? directMatch.icon,
      }
    }
  }

  const rawName = (categoryName ?? '').trim()

  if (!rawName) {
    return DEFAULT_CATEGORY_META
  }

  const normalizedName = rawName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  const matchedName = CATEGORY_ALIASES[normalizedName] ?? rawName
  const namedMeta = QUESTION_CATEGORY_OPTIONS.find((option) => option.name === matchedName)

  return namedMeta
    ? {
        ...namedMeta,
        icon: categoryIcon ?? namedMeta.icon,
      }
    : DEFAULT_CATEGORY_META
}

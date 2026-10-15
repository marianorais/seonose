import { AVATAR_PREDETERMINADO, esAvatarPredefinido } from '../lib/avatarConfig'

interface AvatarJugadorProps {
  avatar?: string | null
  predeterminado?: string
  color?: string
  className: string
}

const AvatarJugador = ({
  avatar,
  predeterminado = AVATAR_PREDETERMINADO,
  color,
  className,
}: AvatarJugadorProps) => {
  const icono = esAvatarPredefinido(avatar) ? avatar : predeterminado

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ring-2 ring-white ${className}`}
      style={color ? { backgroundColor: color } : undefined}
      role="img"
      aria-label="Avatar del jugador"
    >
      {icono}
    </span>
  )
}

export default AvatarJugador

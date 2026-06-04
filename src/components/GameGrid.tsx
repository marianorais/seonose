/**
 * `GameGrid` - Componente presentación del tablero de juego.
 * Genera una cuadrícula 6x5 de celdas vacías para mostrar letras.
 * No altera el estado ni la lógica del juego; es puramente visual.
 */
const GameGrid = () => {
  const filas = Array.from({ length: 6 }, () => Array.from({ length: 5 }, () => ''))

  return (
    <div className="space-y-3">
      {filas.map((fila, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-2 md:gap-3">
          {fila.map((letra, letterIndex) => (
            <div key={letterIndex} className="tile-card">
              {letra}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default GameGrid
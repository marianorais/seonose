/**
 * Componente teclado virtual. Variables internas renombradas a castellano
 * para mejorar la legibilidad sin alterar la UI ni eventos.
 */
const Keyboard = () => {
  const fila1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P']
  const fila2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ']
  const fila3 = ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK']

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-center gap-2">
        {fila1.map((tecla) => (
          <button key={tecla} type="button" className="keyboard-key">
            {tecla}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {fila2.map((tecla) => (
          <button key={tecla} type="button" className="keyboard-key">
            {tecla}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {fila3.map((tecla) => (
          <button
            key={tecla}
            type="button"
            className={`keyboard-key ${tecla === 'ENTER' || tecla === 'BACK' ? 'keyboard-key-special' : ''}`}
          >
            {tecla}
          </button>
        ))}
      </div>
    </div>
  )
}

export default Keyboard
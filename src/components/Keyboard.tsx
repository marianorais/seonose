const Keyboard = () => {
  const row1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P']
  const row2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ']
  const row3 = ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK']

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-center gap-2">
        {row1.map((key) => (
          <button key={key} type="button" className="keyboard-key">
            {key}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {row2.map((key) => (
          <button key={key} type="button" className="keyboard-key">
            {key}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {row3.map((key) => (
          <button
            key={key}
            type="button"
            className={`keyboard-key ${key === 'ENTER' || key === 'BACK' ? 'keyboard-key-special' : ''}`}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  )
}

export default Keyboard
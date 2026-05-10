const GameGrid = () => {
  const rows = Array.from({ length: 6 }, () => Array.from({ length: 5 }, () => ''))

  return (
    <div className="space-y-3">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-2 md:gap-3">
          {row.map((letter, letterIndex) => (
            <div key={letterIndex} className="tile-card">
              {letter}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default GameGrid
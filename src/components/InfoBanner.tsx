const InfoBanner = () => {
  return (
    <div className="glass-panel p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Juego diario</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">SeONose - Palabra del día</h2>
        </div>
        <div className="rounded-3xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-300">
          Nuevo desafío cada día
        </div>
      </div>
      <p className="mt-4 text-slate-400">
        Una interfaz inspirada en el estilo del sitio original. Utiliza seis intentos para adivinar la palabra de cinco letras.
      </p>
    </div>
  )
}

export default InfoBanner
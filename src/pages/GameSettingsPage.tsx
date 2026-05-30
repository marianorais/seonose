import { useEffect, useState } from 'react'

import Header from '../components/Header'
import Sidebar from '../components/Sidebar'

import { supabase } from '../lib/supabase'

function GameSettingsPage() {
  const [showSidebar, setShowSidebar] =
    useState(false)

  const [questionsPerGame, setQuestionsPerGame] =
    useState(5)

  const [secondsPerQuestion, setSecondsPerQuestion] =
    useState(30)

  const [backgroundColor, setBackgroundColor] =
    useState('#0f172a')

  const [fontFamily, setFontFamily] =
    useState('Inter')

  const [loading, setLoading] =
    useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      const { data, error } =
        await supabase
          .from('game_settings')
          .select('*')
          .eq('id', 1)
          .single()

      if (error || !data) {
        console.error(error)
        return
      }

      setQuestionsPerGame(
        data.questionspergame
      )

      setSecondsPerQuestion(
        data.secondsperquestion
      )

      setBackgroundColor(
        data.backgroundcolor
      )

      setFontFamily(
        data.fontfamily
      )
    }

    loadSettings()
  }, [])

  const handleSave =
    async () => {
      try {
        setLoading(true)

        const { error } =
          await supabase
            .from('game_settings')
            .update({
              questionspergame:
                questionsPerGame,

              secondsperquestion:
                secondsPerQuestion,

              backgroundcolor:
                backgroundColor,

              fontfamily:
                fontFamily,

              updatedat:
                new Date().toISOString(),
            })
            .eq('id', 1)

        if (error) {
          console.error(error)
          return
        }

        alert(
          'Configuración guardada'
        )
      } finally {
        setLoading(false)
      }
    }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header
        onOpenSidebar={() =>
          setShowSidebar(true)
        }
        onOpenSettings={() => {}}
        onOpenStats={() => {}}
      />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Configuración del juego
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Personalización global de las partidas.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Cantidad máxima de preguntas
              </label>

              <input
                type="number"
                value={questionsPerGame}
                onChange={(event) =>
                  setQuestionsPerGame(
                    Number(
                      event.target.value
                    )
                  )
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Segundos por pregunta
              </label>

              <input
                type="number"
                value={
                  secondsPerQuestion
                }
                onChange={(event) =>
                  setSecondsPerQuestion(
                    Number(
                      event.target.value
                    )
                  )
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Color de fondo
              </label>

              <input
                type="color"
                value={
                  backgroundColor
                }
                onChange={(event) =>
                  setBackgroundColor(
                    event.target.value
                  )
                }
                className="h-14 w-full rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Tipografía
              </label>

              <select
                value={fontFamily}
                onChange={(event) =>
                  setFontFamily(event.target.value)
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              >
                <option value="Inter">
                  Inter (Moderna)
                </option>

                <option value="Poppins">
                  Poppins
                </option>

                <option value="Roboto">
                  Roboto
                </option>

                <option value="Open Sans">
                  Open Sans
                </option>

                <option value="Montserrat">
                  Montserrat
                </option>

                <option value="Nunito">
                  Nunito
                </option>

                <option value="Lato">
                  Lato
                </option>

                <option value="Ubuntu">
                  Ubuntu
                </option>

                <option value="Arial">
                  Arial
                </option>

                <option value="Verdana">
                  Verdana
                </option>

                <option value="Tahoma">
                  Tahoma
                </option>

                <option value="Trebuchet MS">
                  Trebuchet MS
                </option>

                <option value="Georgia">
                  Georgia
                </option>

                <option value="Times New Roman">
                  Times New Roman
                </option>

                <option value="Courier New">
                  Courier New
                </option>

                <option value="Comic Sans MS">
                  Comic Sans MS
                </option>

                <option value="Bangers">
                  Bangers (Gaming)
                </option>

                <option value="Press Start 2P">
                  Press Start 2P (Retro)
                </option>

                <option value="Orbitron">
                  Orbitron (Futurista)
                </option>

                <option value="Audiowide">
                  Audiowide
                </option>

                <option value="Exo 2">
                  Exo 2
                </option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {loading
                ? 'Guardando...'
                : 'Guardar configuración'}
            </button>
          </div>
        </div>
      </main>

      <Sidebar
        isOpen={showSidebar}
        onClose={() =>
          setShowSidebar(false)
        }
      />
    </div>
  )
}

export default GameSettingsPage
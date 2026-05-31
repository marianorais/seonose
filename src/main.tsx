import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  BrowserRouter,
  Routes,
  Route,
} from 'react-router-dom'

import './index.css'

import App from './App.tsx'
import AdminPreguntasPage from './pages/PanelAdministracionPreguntas.tsx'
import GameSettingsPage from './pages/GameSettingsPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<App />}
        />
        <Route
          path="/repetir"
          element={<App />}
        />

        <Route
          path="/preguntas"
          element={<AdminPreguntasPage />}
        />
        <Route
          path="/configuraciones"
          element={<GameSettingsPage />}
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
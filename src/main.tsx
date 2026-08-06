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
import EstadisticasPage from './pages/EstadisticasPage.tsx'
import ContactoPage from './pages/ContactoPage.tsx'
import MejorasPage from './pages/MejorasPage.tsx'
import RankingPage from './pages/RankingPage.tsx'

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
          path="/ranking"
          element={<RankingPage />}
        />
        <Route
          path="/configuraciones"
          element={<GameSettingsPage />}
        />
        <Route
          path="/estadisticas"
          element={<EstadisticasPage />}
        />
        <Route
          path="/contacto"
          element={<ContactoPage />}
        />
        <Route
          path="/mejoras"
          element={<MejorasPage />}
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
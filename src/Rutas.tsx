import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'

import App from './App.tsx'
import EstadisticasPage from './pages/EstadisticasPage.tsx'
import ContactoPage from './pages/ContactoPage.tsx'
import RankingPage from './pages/RankingPage.tsx'
import PerfilPage from './pages/PerfilPage.tsx'

// Se cargan recién cuando se visitan: el desafío diario no tiene que esperar
// a descargar pantallas que la mayoría no abre en esa visita.
const SalasPage = lazy(() => import('./pages/SalasPage.tsx'))
const SalaPage = lazy(() => import('./pages/SalaPage.tsx'))
const DesafiosAnterioresPage = lazy(() => import('./pages/DesafiosAnterioresPage.tsx'))
const DesafioAnteriorPage = lazy(() => import('./pages/DesafioAnteriorPage.tsx'))
const AdminPreguntasPage = lazy(() => import('./pages/PanelAdministracionPreguntas.tsx'))
const BoletinInformativoPage = lazy(() => import('./pages/BoletinInformativoPage.tsx'))
const AdminBoletinPage = lazy(() => import('./pages/AdminBoletinPage.tsx'))
const GameSettingsPage = lazy(() => import('./pages/GameSettingsPage.tsx'))
const MejorasPage = lazy(() => import('./pages/MejorasPage.tsx'))

const Cargando = () => (
  <p role="status" className="p-8 text-center text-slate-600">
    Cargando…
  </p>
)

const Rutas = () => (
  <Suspense fallback={<Cargando />}>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/repetir" element={<App />} />

      <Route
        path="/preguntas"
        element={<AdminPreguntasPage />}
      />
      <Route path="/ranking" element={<RankingPage />} />
      <Route path="/perfil" element={<PerfilPage />} />
      <Route
        path="/configuraciones"
        element={<GameSettingsPage />}
      />
      <Route path="/estadisticas" element={<EstadisticasPage />} />
      <Route path="/boletin" element={<BoletinInformativoPage />} />
      <Route path="/contacto" element={<ContactoPage />} />
      <Route path="/salas" element={<SalasPage />} />
      <Route path="/adminBoletin" element={<AdminBoletinPage />} />
      <Route path="/sala/:codigo" element={<SalaPage />} />
      <Route path="/anteriores" element={<DesafiosAnterioresPage />} />
      <Route path="/anteriores/:fecha" element={<DesafioAnteriorPage />} />
      <Route
        path="/mejoras"
        element={<MejorasPage />}
      />
    </Routes>
  </Suspense>
)

export default Rutas

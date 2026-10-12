import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import './index.css'

import Rutas from './Rutas.tsx'
import { iniciarAnalitica } from './lib/analytics'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Rutas />
    </BrowserRouter>
  </StrictMode>,
)

// Sólo carga Google Analytics si VITE_GA_MEASUREMENT_ID está definido.
iniciarAnalitica()

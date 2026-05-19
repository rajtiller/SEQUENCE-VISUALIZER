import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { GraphView } from './GraphView.tsx'
import { isGraphViewRoute } from './lib/graphExport.ts'

const root = document.getElementById('root')!

createRoot(root).render(
  <StrictMode>
    {isGraphViewRoute() ? <GraphView /> : <App />}
  </StrictMode>,
)

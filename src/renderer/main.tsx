import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Root } from './app/Root'
import './assets/index.css'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('root_element_missing')

createRoot(rootEl).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)

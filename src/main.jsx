import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './glass-ui.css'
import './excel-spreadsheet.css'
import App from './App.jsx'

// Fix keyboard empty space on Android WebView.
// visualViewport.height = visible area EXCLUDING keyboard.
// We write this to --app-height and lock the app container to it.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

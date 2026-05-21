import React    from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App      from './App'
import './i18n'
import './index.css'

// Aplicar tema guardado antes del primer render (evita flash)
const theme = localStorage.getItem('pycore_theme')
if (theme === 'dark') {
  document.documentElement.classList.add('dark')
}

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string ?? ''

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
)

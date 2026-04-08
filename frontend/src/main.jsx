import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { GroupTimerProvider } from './context/GroupTimerContext'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'missing-google-client-id'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <GroupTimerProvider>
          <App />
        </GroupTimerProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)

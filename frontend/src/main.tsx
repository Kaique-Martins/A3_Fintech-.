import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles/index.css'
// Initialize global axios base URL from Vite env (VITE_API_URL)
import './services/apiClient'

const container = document.getElementById('root');
if (container) {
  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  )
}

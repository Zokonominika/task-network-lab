import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import AppKanban from './AppKanban'
import LoginScreen from './components/LoginScreen'

import ErrorBoundary from './components/ErrorBoundary'

const isKanban = localStorage.getItem('is_kanban') === 'true';
const token = localStorage.getItem('auth_token');
const onLogin = () => {
  window.location.reload();
};

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    {isKanban ? (
      token ? <AppKanban /> : <LoginScreen onLoginSuccess={onLogin} theme="light" />
    ) : (
      token ? <App /> : <LoginScreen onLoginSuccess={onLogin} theme="dark" />
    )}
  </ErrorBoundary>
)

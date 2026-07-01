import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { ContentModalProvider } from './context/ContentModalContext.jsx';
import { CreativeStudioProvider } from './context/CreativeStudioContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { BillingProvider } from './context/BillingContext.jsx';
import App from './App.jsx';
import { shouldUseHashRouter } from './lib/runtime.js';
import './styles/global.css';
import './styles/auth.css';

const Router = shouldUseHashRouter() ? HashRouter : BrowserRouter;

const rootEl = document.getElementById('root');

if (!rootEl) {
  document.body.innerHTML =
    '<pre style="color:red;padding:2rem">Errore: elemento #root non trovato in index.html</pre>';
} else {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <Router>
        <AuthProvider>
          <BillingProvider>
            <ContentModalProvider>
              <CreativeStudioProvider>
                <App />
              </CreativeStudioProvider>
            </ContentModalProvider>
          </BillingProvider>
        </AuthProvider>
      </Router>
    </React.StrictMode>
  );
}

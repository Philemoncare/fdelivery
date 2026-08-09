import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './lib/auth/auth-store';
import { ToastProvider } from './components/ui/toast';
import './index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Failed to find the root element');
}

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <AppProvider>
          <RouterProvider router={router} />
        </AppProvider>
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
);

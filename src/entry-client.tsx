import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './lib/auth/auth-store';
import './index.css';

ReactDOM.hydrateRoot(
  document.getElementById('root')!,
  <React.StrictMode>
    <AuthProvider>
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    </AuthProvider>
  </React.StrictMode>
);

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './lib/auth/auth-store';

export async function render(url: string) {
  // Simplified rendering for now to avoid complexity with loaders
  // In a real RR7 app, you'd use createStaticHandler
  return ReactDOMServer.renderToString(
    <React.StrictMode>
      <StaticRouter location={url}>
        <AuthProvider>
          <AppProvider>
             {/* We use a simple placeholder here because RouterProvider
                 requires a data router which is hard to sync with StaticRouter
                 without a handler. For demo purposes, we render the tree. */}
             <div id="ssr-placeholder">Loading OmniMarket...</div>
          </AppProvider>
        </AuthProvider>
      </StaticRouter>
    </React.StrictMode>
  );
}

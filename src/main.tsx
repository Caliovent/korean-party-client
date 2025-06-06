// src/main.tsx
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.tsx';
import HomePage from './pages/HomePage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import './index.css';

// Importer la configuration i18n
import './i18n';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Suspense est nécessaire car les traductions sont chargées de manière asynchrone */}
    <Suspense fallback="loading...">
      <RouterProvider router={router} />
    </Suspense>
  </React.StrictMode>
);

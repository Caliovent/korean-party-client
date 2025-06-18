// src/main.tsx (corrigé pour fonctionner avec le routeur)


import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.tsx';
import HomePage from './pages/HomePage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import ProfilePage from './pages/ProfilePage.tsx';
import LobbyPage from './pages/LobbyPage.tsx';
import WaitingRoomPage from './pages/WaitingRoomPage.tsx'; // Importer la nouvelle page
import GamePage from './pages/GamePage.tsx';
import HubPage from './pages/HubPage.tsx'; // + Import HubPage
import ProtectedRoute from './components/ProtectedRoute.tsx';
import './index.css';
import './i18n';
import AuthProvider from './hooks/useAuth.tsx';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'profile', element: <ProfilePage /> },
          { path: 'hub', element: <HubPage /> }, // + Add HubPage route
          // AJOUT : La nouvelle route pour la salle d'attente
          { path: 'waiting-room/:gameId', element: <WaitingRoomPage /> },
          { path: 'game/:gameId', element: <GamePage /> },
        ],
      },
    ],
  },
]);

import { ToastProvider } from './contexts/ToastContext'; // Import ToastProvider

// La correction est ici : on enveloppe le RouterProvider
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={<div>Loading...</div>}>
      <AuthProvider>
        <ToastProvider> {/* Wrap with ToastProvider */}
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthProvider>
    </Suspense>
  </React.StrictMode>,
);
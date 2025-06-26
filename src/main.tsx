// src/main.tsx (corrigé pour fonctionner avec le routeur)


import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.tsx';
// import HomePage from './pages/HomePage.tsx';
// import LoginPage from './pages/LoginPage.tsx';
// import ProfilePage from './pages/ProfilePage.tsx';
// import WaitingRoomPage from './pages/WaitingRoomPage.tsx'; // Importer la nouvelle page
// import GamePage from './pages/GamePage.tsx';
// import HubPage from './pages/HubPage.tsx'; // + Import HubPage
import ProtectedRoute from './components/ProtectedRoute.tsx';

// Lazy load page components
const HomePage = lazy(() => import('./pages/HomePage.tsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.tsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.tsx'));
const WaitingRoomPage = lazy(() => import('./pages/WaitingRoomPage.tsx'));
const GamePage = lazy(() => import('./pages/GamePage.tsx'));
const HubPage = lazy(() => import('./pages/HubPage.tsx'));
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
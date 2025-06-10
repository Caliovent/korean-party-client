// src/main.tsx (corrigé pour fonctionner avec le routeur)

import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.tsx';
import HomePage from './pages/HomePage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import ProfilePage from './pages/ProfilePage.tsx';
import LobbyPage from './pages/LobbyPage.tsx';
import GamePage from './pages/GamePage.tsx';
import HubPage from './pages/HubPage.tsx'; // + Import HubPage
import ProtectedRoute from './components/ProtectedRoute.tsx';
import './index.css';
import './i18n';
import AuthProvider from './hooks/useAuth.tsx'; // L'importation est correcte

// La définition de votre routeur reste inchangée
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      {
        element: <ProtectedRoute />, // Les routes à l'intérieur seront protégées
        children: [
          { path: 'profile', element: <ProfilePage /> },
          { path: 'lobby', element: <LobbyPage /> },
          { path: 'hub', element: <HubPage /> }, // + Add HubPage route
          { path: 'game/:gameId', element: <GamePage /> },
        ],
      },
    ],
  },
]);

// La correction est ici : on enveloppe le RouterProvider
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={<div>Loading...</div>}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </Suspense>
  </React.StrictMode>,
);
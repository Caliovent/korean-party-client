// src/main.tsx
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.tsx';
import HomePage from './pages/HomePage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import ProfilePage from './pages/ProfilePage.tsx';
import LobbyPage from './pages/LobbyPage.tsx';
import GamePage from './pages/GamePage.tsx';
import ProtectedRoute from './components/ProtectedRoute.tsx'; // Importer le composant
import './index.css';
import './i18n';

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
          { path: 'lobby', element: <LobbyPage /> }, // Exemple de page protégée
          { path: 'game/:gameId', element: <GamePage /> }, // Page de jeu protégée
        ],
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback="loading...">
      <RouterProvider router={router} />
    </Suspense>
  </React.StrictMode>
);

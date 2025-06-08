import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged, type User } from 'firebase/auth';

const ProtectedRoute: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Écoute les changements de statut de connexion
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    // Nettoyer l'écouteur
    return () => unsubscribe();
  }, []);

  if (loading) {
    // Affiche un message pendant la vérification
    return <div>Chargement de la session...</div>;
  }

  // Si l'utilisateur est bien connecté (pas anonyme), on affiche la page demandée
  if (user && !user.isAnonymous) {
    return <Outlet />;
  }

  // Sinon, on le redirige vers la page de connexion
  return <Navigate to="/login" replace />;
};

export default ProtectedRoute;

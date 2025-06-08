import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { auth } from './firebaseConfig';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import './App.css';

function App() {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation(); // Hook pour obtenir la page actuelle

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    signOut(auth).catch(error => console.error("Erreur de déconnexion", error));
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  // Fonction pour afficher le statut de connexion de manière propre
  const renderAuthStatus = () => {
    if (loading) {
      return <p>{t('loading', 'Chargement...')}</p>;
    }

    const isUserLoggedIn = user && !user.isAnonymous;

    if (isUserLoggedIn) {
      return (
        <div className="user-info">
          <p>{user.email}</p>
          <Link to="/profile" className="profile-link">{t('profilePageTitle', 'Mon Profil')}</Link>
          <button onClick={handleLogout} className="logout-button">{t('logout', 'Déconnexion')}</button>
        </div>
      );
    }

    // N'affiche pas le bouton "Connexion" si on est déjà sur la page de connexion
    if (location.pathname === '/login') {
      return null;
    }

    return <Link to="/login">{t('loginPageTitle', 'Connexion')}</Link>;
  };

  return (
    <div className="App">
      <header className="app-header">
        <div>
          <button onClick={() => changeLanguage('fr')}>FR</button>
          <button onClick={() => changeLanguage('en')}>EN</button>
        </div>
        <Link to="/" style={{textDecoration: 'none'}}><h2>{t('appTitle')}</h2></Link>
        <div className="firebase-status">
          {renderAuthStatus()}
        </div>
      </header>

      <main className="app-content">
        <Outlet />
      </main>

      <footer className="app-footer">
        <p>{t('footerText')}</p>
      </footer>
    </div>
  );
}

export default App;

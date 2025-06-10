import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'; // + useNavigate
import { useTranslation } from 'react-i18next';
import { auth } from './firebaseConfig';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import './App.css';

function App() {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation(); // Hook pour obtenir la page actuelle
  const navigate = useNavigate(); // + useNavigate

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      // + Redirect if user is logged in and on a non-protected, non-game page
      if (currentUser && !currentUser.isAnonymous) {
        if (location.pathname === '/' || location.pathname === '/login') {
          navigate('/hub');
        }
      } else if (currentUser && currentUser.isAnonymous) {
        if (location.pathname === '/' || location.pathname === '/login') {
          navigate('/hub');
        }
      }
    });
    return () => unsubscribe();
  }, [navigate, location.pathname]); // + Add dependencies

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
          <Link to="/profile" className="profile-link">{t('nav.profile')}</Link>
          <button onClick={handleLogout} className="logout-button">{t('nav.logout')}</button>
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
        <Link to="/" style={{textDecoration: 'none'}}><h2>{t('nav.home')}</h2></Link>
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

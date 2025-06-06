import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // Import
import { auth } from './firebaseConfig';
import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
import './App.css';

function App() {
  const { t, i18n } = useTranslation(); // Use the hook
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
       signInAnonymously(auth).catch((error) => {
        console.error("Erreur de connexion anonyme:", error);
      });
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="App">
      <header className="app-header">
        <div>
          <button onClick={() => changeLanguage('fr')}>FR</button>
          <button onClick={() => changeLanguage('en')}>EN</button>
        </div>
        <h2>{t('appTitle')}</h2>
        <div className="firebase-status">
          {loading ? (
            <p>{t('loading')}</p>
          ) : user ? (
            <p>{t('statusConnected')} ({user.isAnonymous ? t('userAnonymous') : t('userIdentified')})</p>
          ) : (
            <p>{t('statusNotConnected')}</p>
          )}
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

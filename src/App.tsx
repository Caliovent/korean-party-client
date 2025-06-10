import { useEffect, useState, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'; // + useNavigate
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import { useTranslation } from 'react-i18next';
import Phaser from 'phaser';
import GuildManagementModal from './components/GuildManagementModal'; // Import the modal
import { game } from './phaser/game'; // Assuming 'game' is your Phaser game instance
import { auth } from './firebaseConfig';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import './App.css';
import ToastContainer from './components/ToastNotification'; // Import ToastContainer
import { useToasts } from './contexts/ToastContext'; // Import useToasts
import soundService, { SOUND_DEFINITIONS } from './services/soundService'; // Adjust path if needed

function App() {
  const { t, i18n } = useTranslation();
  const { toasts, dismissToast } = useToasts(); // Get toasts and dismiss function
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuildModalOpen, setIsGuildModalOpen] = useState(false); // State for modal visibility
  const location = useLocation(); // Hook pour obtenir la page actuelle
  const navigate = useNavigate(); // + useNavigate
  const gameInstanceRef = useRef<Phaser.Game | null>(null); // Ref to hold the game instance

  useEffect(() => {
    // Initialize Phaser game instance
    if (!gameInstanceRef.current && location.pathname.includes('/hub')) {
      gameInstanceRef.current = game;
    }

    const handleOpenGuildModal = () => {
      console.log('App.tsx: openGuildManagementModal event received');
      soundService.playSound('ui_modal_open');
      setIsGuildModalOpen(true);
    };

    const currentGameInstance = gameInstanceRef.current;
    if (currentGameInstance) {
      currentGameInstance.events.on('openGuildManagementModal', handleOpenGuildModal);
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
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

    return () => {
      unsubscribe();
      if (currentGameInstance) {
        currentGameInstance.events.off('openGuildManagementModal', handleOpenGuildModal);
      }
    };
  }, [navigate, location.pathname]);

  useEffect(() => {
    // Preload all sounds
    soundService.loadSounds(SOUND_DEFINITIONS)
      .then(() => {
        console.log("All sounds preloaded via App.tsx");
      })
      .catch(error => console.error("Error preloading sounds:", error));

    // Unlock audio context on first user interaction
    const unlockAudio = () => {
      soundService.unlockAudio();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      console.log("Audio context unlocked by user interaction.");
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      // Optional: soundService.stopAllSounds(); // if sounds should stop when App unmounts
    };
  }, []); // Empty dependency array ensures this runs once on mount

  const handleLogout = () => {
    soundService.playSound('ui_click');
    signOut(auth).catch(error => console.error("Erreur de déconnexion", error));
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    soundService.playSound('ui_click');
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
      <ToastContainer toasts={toasts} dismissToast={dismissToast} /> {/* Render ToastContainer */}
      <header className="app-header">
        <div>
          <button onClick={() => changeLanguage('fr')}>FR</button>
          <button onClick={() => changeLanguage('en')}>EN</button>
        </div>
        {/* Link itself is not a button, but if it were styled as one and had an action other than navigation, it would need sound */}
        <Link to="/" style={{textDecoration: 'none'}}><h2>{t('nav.home')}</h2></Link>
        <div className="firebase-status">
          {renderAuthStatus()}
        </div>
      </header>

      <TransitionGroup>
        <CSSTransition
          key={location.key}
          classNames="fade"
          timeout={300}
        >
          <main className="app-content">
            <Outlet />
          </main>
        </CSSTransition>
      </TransitionGroup>

      {isGuildModalOpen && (
        <GuildManagementModal
          isOpen={isGuildModalOpen}
          onClose={() => {
            soundService.playSound('ui_modal_close');
            setIsGuildModalOpen(false);
          }}
        />
      )}

      <footer className="app-footer">
        <p>{t('footerText')}</p>
      </footer>
    </div>
  );
}

export default App;

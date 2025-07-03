import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import { useTranslation } from 'react-i18next';
import Phaser from 'phaser';
import GuildManagementModal from './components/GuildManagementModal';
import LoadingScreen from './components/LoadingScreen'; // Import LoadingScreen
import { ContentProvider, useContent } from './contexts/ContentContext'; // Import ContentProvider and useContent
import { game } from './phaser/game';
import { auth, functions } from './firebaseConfig'; // Import functions
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions'; // Import httpsCallable
import './App.css';
import ToastContainer from './components/ToastNotification';
import { useToasts } from './contexts/ToastContext';
import soundService, { SOUND_DEFINITIONS } from './services/soundService';
import { getSyncQueueItems, deleteFromSyncQueue } from './services/dbService'; // Import IndexedDB sync functions, removed SyncQueueItem

// Wrapper component to use useContent hook
const AppContent: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { toasts, dismissToast, addToast } = useToasts(); // addToast from useToasts
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true); // Renamed from 'loading' for clarity
  const [isGuildModalOpen, setIsGuildModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const gameInstanceRef = useRef<Phaser.Game | null>(null);
  const mainNodeRef = useRef<HTMLElement>(null);
  const isSyncingRef = useRef(false);
  const [lastSyncAttemptWasEmpty, setLastSyncAttemptWasEmpty] = useState(false);
  const onlineSyncDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  const { gameData, isLoading: isContentLoading, error: contentError } = useContent();

  const updateReviewItemCallable = httpsCallable(functions, 'updateReviewItem');

  const processSyncQueue = useCallback(async (currentUser: User) => {
    if (!currentUser || !currentUser.uid) {
      console.log("Sync: User not available, skipping queue processing.");
      return;
    }
    if (isSyncingRef.current) {
      console.log("Sync: Already in progress (ref lock), skipping.");
      return;
    }
    if (!navigator.onLine) {
      console.log("Sync: Offline, skipping queue processing.");
      setLastSyncAttemptWasEmpty(false);
      return;
    }

    isSyncingRef.current = true;
    console.log(`Sync: Processing sync queue for user ${currentUser.uid}`);

    try {
      const itemsToSync = await getSyncQueueItems(currentUser.uid);
      if (itemsToSync.length === 0) {
        console.log("Sync: Queue is empty.");
        if (!lastSyncAttemptWasEmpty) {
          addToast('Aucun progrès local à synchroniser.', 'info');
        }
        setLastSyncAttemptWasEmpty(true);
        return;
      }

      addToast('Synchronisation du progres hors-ligne en cours...', 'info');
      setLastSyncAttemptWasEmpty(false);

      console.log(`Sync: Found ${itemsToSync.length} items to sync.`);
      let successCount = 0;
      let failureCount = 0;

      for (const item of itemsToSync) {
        try {
          await updateReviewItemCallable({ itemId: item.itemId, isCorrect: item.isCorrect });
          await deleteFromSyncQueue(item.id!);
          successCount++;
          console.log(`Sync: Item ${item.itemId} (ID: ${item.id}) synced and removed from queue.`);
        } catch (error) {
          failureCount++;
          console.error(`Sync: Failed to sync item ${item.itemId} (ID: ${item.id}). Error:`, error);
        }
      }

      if (successCount > 0) {
        addToast(`${successCount} élément(s) de progrès synchronisé(s) avec succès.`, 'success');
        setLastSyncAttemptWasEmpty(false);
      }
      if (failureCount > 0) {
        addToast(`${failureCount} élément(s) n'ont pas pu être synchronisés. Ils seront réessayés plus tard.`, 'warning');
      } else if (successCount === 0 && failureCount === 0 && itemsToSync.length > 0) {
        addToast('File de synchronisation traitée, aucun changement majeur.', 'info');
      }

    } catch (error) {
      console.error("Sync: Error processing sync queue:", error);
      addToast('Erreur majeure lors de la synchronisation du progrès local.', 'error');
      setLastSyncAttemptWasEmpty(false);
    } finally {
      isSyncingRef.current = false;
      console.log("Sync: Queue processing finished.");
    }
  }, [addToast, updateReviewItemCallable, lastSyncAttemptWasEmpty, setLastSyncAttemptWasEmpty]);

  const handleOnline = useCallback(() => {
    addToast('Connexion internet rétablie.', 'info');
    if (user && !user.isAnonymous && !isSyncingRef.current) {
      if (onlineSyncDebounceTimer.current) {
        clearTimeout(onlineSyncDebounceTimer.current);
      }
      onlineSyncDebounceTimer.current = setTimeout(() => {
        if (!isSyncingRef.current) {
          processSyncQueue(user);
        } else {
          console.log("Sync: Debounced online sync skipped, another sync is already in progress (ref lock).");
        }
      }, 5000);
    } else if (isSyncingRef.current) {
      console.log("Sync: Online event received, but a sync is already in progress (ref lock). Ignoring.");
    }
  }, [user, processSyncQueue, addToast]);

  const handleOffline = useCallback(() => {
    addToast('Connexion internet perdue. Le progrès sera sauvegardé localement.', 'warning');
    if (onlineSyncDebounceTimer.current) {
      clearTimeout(onlineSyncDebounceTimer.current);
    }
  }, [addToast]);

  useEffect(() => {
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

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false); // Auth state determined
      if (currentUser && !currentUser.isAnonymous) {
        if (location.pathname === '/' || location.pathname === '/login') {
          navigate('/hub');
        }
        if (navigator.onLine && !isSyncingRef.current) {
          processSyncQueue(currentUser);
        } else if (isSyncingRef.current) {
          console.log("Sync: Login sync attempt skipped, another sync is already in progress (ref lock).");
        }
      } else if (currentUser && currentUser.isAnonymous) {
        if (location.pathname === '/' || location.pathname === '/login') {
          navigate('/hub');
        }
      }
    });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribeAuth();
      if (currentGameInstance) {
        currentGameInstance.events.off('openGuildManagementModal', handleOpenGuildModal);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (onlineSyncDebounceTimer.current) {
        clearTimeout(onlineSyncDebounceTimer.current);
      }
    };
  }, [navigate, location.pathname, user, addToast, handleOffline, handleOnline, processSyncQueue]);

  useEffect(() => {
    soundService.loadSounds(SOUND_DEFINITIONS)
      .then(() => console.log("All sounds preloaded via App.tsx"))
      .catch(error => console.error("Error preloading sounds:", error));

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
    };
  }, []);

  const handleLogout = () => {
    soundService.playSound('ui_click');
    signOut(auth).catch(error => console.error("Erreur de déconnexion", error));
  };

  const renderAuthRelatedStatus = () => {
    // This function is now only for user info / login/logout button
    // The global loading/error screen is handled outside
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

    if (location.pathname === '/login') {
      return null;
    }
    return <Link to="/login">{t('loginPageTitle', 'Connexion')}</Link>;
  };

  // Global loading and error display
  if (authLoading) {
    return <LoadingScreen message={t('loadingAuth', 'Vérification de l’identité magique...')} />;
  }
  if (isContentLoading) {
    return <LoadingScreen message={t('loadingContent', 'Invocation des parchemins de connaissance...')} />;
  }
  if (contentError) {
    return (
      <div className="app-error-screen">
        <h1>{t('error.title', 'Erreur de Chargement Cosmique')}</h1>
        <p>{t('error.message', 'Un flux de mana instable a interrompu le chargement du contenu de l’Observatoire.')}</p>
        <p><i>{contentError.message}</i></p>
        <button onClick={() => window.location.reload()}>{t('error.reloadButton', 'Réessayer')}</button>
      </div>
    );
  }
  // Only render the main app if auth is resolved AND content is loaded AND no content error
  return (
    <div className="App">
      <ToastContainer toasts={toasts} dismissToast={dismissToast} />
      <header className="app-header">
        <Link to="/" style={{textDecoration: 'none'}}><h2>{t('nav.home')}</h2></Link>
        <Link to="/hub" style={{textDecoration: 'none', marginLeft: '1rem'}}><h2>{t('nav.hub', 'Hub')}</h2></Link>
        <Link to="/lost-poem" style={{textDecoration: 'none', marginLeft: '1rem'}}><h2>{t('nav.lostPoem', 'Poème Perdu')}</h2></Link>
        <Link to="/food-feast" style={{textDecoration: 'none', marginLeft: '1rem'}}><h2>{t('nav.foodFeast', 'Festin des Mots')}</h2></Link>
        <div className="firebase-status">
          {renderAuthRelatedStatus()}
        </div>
      </header>

      <TransitionGroup>
        <CSSTransition
          key={location.key}
          nodeRef={mainNodeRef}
          classNames="fade"
          timeout={300}
          unmountOnExit
          mountOnEnter
        >
          <main ref={mainNodeRef} className="app-content">
            <Suspense fallback={<div className="page-loading-fallback">Chargement de la page...</div>}>
              {/* Ensure gameData is available before rendering Outlet if needed by routes,
                  or let individual routes/components handle missing gameData if they can function without it.
                  For now, assuming Outlet and its children will use useContent() and handle gameData being potentially null initially
                  if not all data is critical for all routes.
                  However, the global loading screen should prevent rendering Outlet until gameData is loaded.
              */}
              <Outlet />
            </Suspense>
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
};

// The main App component now simply provides the ContentContext
function App() {
  return (
    <ContentProvider>
      <AppContent />
    </ContentProvider>
  );
}

export default App;

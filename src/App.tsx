import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import { useTranslation } from 'react-i18next';
import Phaser from 'phaser';
import GuildManagementModal from './components/GuildManagementModal';
import { game } from './phaser/game';
import { auth, functions } from './firebaseConfig'; // Import functions
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions'; // Import httpsCallable
import './App.css';
import ToastContainer from './components/ToastNotification';
import { useToasts } from './contexts/ToastContext';
import soundService, { SOUND_DEFINITIONS } from './services/soundService';
import { getSyncQueueItems, deleteFromSyncQueue } from './services/dbService'; // Import IndexedDB sync functions, removed SyncQueueItem

function App() {
  const { t, i18n } = useTranslation();
  const { toasts, dismissToast, addToast } = useToasts(); // addToast from useToasts
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuildModalOpen, setIsGuildModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const gameInstanceRef = useRef<Phaser.Game | null>(null);
  const mainNodeRef = useRef<HTMLElement>(null);
  const isSyncingRef = useRef(false); // Use ref for sync lock
  const [lastSyncAttemptWasEmpty, setLastSyncAttemptWasEmpty] = useState(false); // New state for controlling toast repetition
  const onlineSyncDebounceTimer = useRef<NodeJS.Timeout | null>(null); // For debouncing online sync

  // Define updateReviewItemCallable here as it's used by the sync service
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
      // When offline, reset the flag so that "Aucun progrès" can be shown when coming back online if queue is empty.
      setLastSyncAttemptWasEmpty(false);
      return;
    }

    isSyncingRef.current = true;
    console.log(`Sync: Processing sync queue for user ${currentUser.uid}`);

    try {
      const itemsToSync = await getSyncQueueItems(currentUser.uid);
      if (itemsToSync.length === 0) {
        console.log("Sync: Queue is empty.");
        if (!lastSyncAttemptWasEmpty) { // Only show this toast if the last attempt wasn't also empty
          addToast('Aucun progrès local à synchroniser.', 'info');
        }
        setLastSyncAttemptWasEmpty(true); // Mark that this attempt found an empty queue
        // No setIsSyncing(false) here, will be handled by finally block
        return;
      }

      // If we've reached here, it means itemsToSync.length > 0.
      // Show "in progress" toast only if there are items.
      addToast('Synchronisation du progres hors-ligne en cours...', 'info');
      // So, the previous attempt (if any) was not empty, or this is a new situation.
      // Reset the flag to allow "Aucun progrès..." if the next attempt is empty.
      setLastSyncAttemptWasEmpty(false);

      console.log(`Sync: Found ${itemsToSync.length} items to sync.`);
      let successCount = 0;
      let failureCount = 0;

      for (const item of itemsToSync) {
        try {
          await updateReviewItemCallable({ itemId: item.itemId, isCorrect: item.isCorrect });
          await deleteFromSyncQueue(item.id!); // id will be defined for items from DB
          successCount++;
          console.log(`Sync: Item ${item.itemId} (ID: ${item.id}) synced and removed from queue.`);
        } catch (error) {
          failureCount++;
          console.error(`Sync: Failed to sync item ${item.itemId} (ID: ${item.id}). Error:`, error);
          // Item remains in queue for next attempt
        }
      }

      if (successCount > 0) {
        addToast(`${successCount} élément(s) de progrès synchronisé(s) avec succès.`, 'success');
        // After a successful sync, the next "empty" message is relevant if the queue becomes empty again.
        setLastSyncAttemptWasEmpty(false);
      }
      if (failureCount > 0) {
        addToast(`${failureCount} élément(s) n'ont pas pu être synchronisés. Ils seront réessayés plus tard.`, 'warning');
      } else if (successCount === 0 && failureCount === 0 && itemsToSync.length > 0) {
        // This case should ideally not happen if itemsToSync.length > 0
        // but if it does, it means no actual data changed, so it's like an empty sync in terms of user feedback.
        addToast('File de synchronisation traitée, aucun changement majeur.', 'info');
      }
       // TODO: Consider triggering a refresh of runesToReviewCount in GrimoireVivant
       // This might require a global state or event bus, or simply rely on the next Firestore snapshot.

    } catch (error) {
      console.error("Sync: Error processing sync queue:", error);
      addToast('Erreur majeure lors de la synchronisation du progrès local.', 'error');
      // In case of a major error, allow the "empty" message next time, as the state is uncertain.
      setLastSyncAttemptWasEmpty(false);
    } finally {
      isSyncingRef.current = false; // Release lock
      console.log("Sync: Queue processing finished.");
    }
  }, [addToast, updateReviewItemCallable, setLastSyncAttemptWasEmpty]); // Removed isSyncing and lastSyncAttemptWasEmpty

  const handleOnline = useCallback(() => {
    addToast('Connexion internet rétablie.', 'info');
    // Only proceed if a user is logged in and not anonymous, AND not currently syncing (ref check).
    if (user && !user.isAnonymous && !isSyncingRef.current) {
      if (onlineSyncDebounceTimer.current) {
        clearTimeout(onlineSyncDebounceTimer.current);
      }
      onlineSyncDebounceTimer.current = setTimeout(() => {
        // Double check isSyncingRef.current again inside setTimeout
        if (!isSyncingRef.current) {
          processSyncQueue(user);
        } else {
          console.log("Sync: Debounced online sync skipped, another sync is already in progress (ref lock).");
        }
      }, 5000); // Debounce for 5 seconds
    } else if (isSyncingRef.current) {
      console.log("Sync: Online event received, but a sync is already in progress (ref lock). Ignoring.");
    }
  }, [user, processSyncQueue, addToast]); // Removed isSyncing from dependencies

  const handleOffline = useCallback(() => {
    addToast('Connexion internet perdue. Le progrès sera sauvegardé localement.', 'warning');
    // Clear any pending debounced sync if we go offline
    if (onlineSyncDebounceTimer.current) {
      clearTimeout(onlineSyncDebounceTimer.current);
    }
  }, [addToast]);

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

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser && !currentUser.isAnonymous) {
        if (location.pathname === '/' || location.pathname === '/login') {
          navigate('/hub');
        }
        // Attempt to sync when user logs in and is online
        if (navigator.onLine && !isSyncingRef.current) { // Check ref lock
          processSyncQueue(currentUser);
        } else if (isSyncingRef.current) {
          console.log("Sync: Login sync attempt skipped, another sync is already in progress (ref lock).");
        }
      } else if (currentUser && currentUser.isAnonymous) {
        // Handle anonymous user login, typically no user-specific data to sync from a previous session
        if (location.pathname === '/' || location.pathname === '/login') {
          navigate('/hub');
        }
      }
    });

    // Listen for online event to trigger sync
    // const handleOnline = useCallback(() => { // Will be moved outside and wrapped with useCallback
    //   addToast('Connexion internet rétablie.', 'info');
    //   if (user && !user.isAnonymous) { // Ensure user is logged in
    //     if (onlineSyncDebounceTimer.current) {
    //       clearTimeout(onlineSyncDebounceTimer.current);
    //     }
    //     onlineSyncDebounceTimer.current = setTimeout(() => {
    //       processSyncQueue(user);
    //     }, 5000); // Debounce for 5 seconds
    //   }
    // }, [user, processSyncQueue, addToast]);

    // const handleOffline = () => { // Will be moved outside and wrapped with useCallback
    //   addToast('Connexion internet perdue. Le progrès sera sauvegardé localement.', 'warning');
    //   // Clear any pending debounced sync if we go offline
    //   if (onlineSyncDebounceTimer.current) {
    //     clearTimeout(onlineSyncDebounceTimer.current);
    //   }
    // };

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
        clearTimeout(onlineSyncDebounceTimer.current); // Cleanup timer on unmount
      }
    };
  }, [navigate, location.pathname, user, addToast, handleOffline, handleOnline, processSyncQueue]);

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
          nodeRef={mainNodeRef} // Add nodeRef
          classNames="fade"
          timeout={300}
          unmountOnExit // Optional: good practice for CSSTransition with routes
          mountOnEnter // Optional: good practice for CSSTransition with routes
        >
          <main ref={mainNodeRef} className="app-content"> {/* Add ref */}
            <Suspense fallback={<div className="page-loading-fallback">Chargement de la page...</div>}>
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
}

export default App;

import React, { useState, useEffect, useCallback } from 'react';
import { db, functions } from '../firebaseConfig';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import type { SpellMasteryData } from '../types/game';
import './GrimoireVivant.css';
import ReviewSession from './ReviewSession';
import { httpsCallable } from 'firebase/functions';
import { saveReviewItems, getStoredReviewItems, clearReviewItems } from '../services/dbService'; // Import IndexedDB functions
import { useToasts } from '../contexts/ToastContext'; // Import useToasts

const GrimoireVivant: React.FC = () => {
  const [runes, setRunes] = useState<SpellMasteryData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [runesToReviewCount, setRunesToReviewCount] = useState<number>(0);
  const { user } = useAuth();
  const { addToast } = useToasts();

  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewItems, setReviewItems] = useState<SpellMasteryData[]>([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const getReviewItemsCallable = httpsCallable(functions, 'getReviewItems');

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      addToast({ type: 'info', message: 'Vous êtes de nouveau en ligne.' });
    };
    const handleOffline = () => {
      setIsOffline(true);
      addToast({ type: 'warning', message: 'Vous êtes actuellement hors-ligne.' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [addToast]);

  const fetchAndStoreReviewItems = useCallback(async () => {
    if (!user || !navigator.onLine) return;

    console.log("Attempting to fetch review items from server for pre-loading...");
    try {
      const result = await getReviewItemsCallable();
      const items = result.data as SpellMasteryData[];
      if (items && items.length > 0) {
        await saveReviewItems(items, user.uid);
        console.log(`${items.length} review items pre-loaded and stored locally.`);
        addToast({ type: 'success', message: 'Données de révision pré-chargées pour utilisation hors-ligne.' });
      } else {
        // S'il n'y a pas d'items à réviser en ligne, on vide aussi le cache local
        // pour éviter d'utiliser des données obsolètes en mode hors-ligne.
        await clearReviewItems();
        console.log("No review items to pre-load. Local cache cleared.");
      }
    } catch (error) {
      console.error("Failed to fetch or store review items:", error);
      addToast({ type: 'error', message: 'Erreur lors du pré-chargement des données de révision.' });
    }
  }, [user, getReviewItemsCallable, addToast]);


  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const spellMasteryRef = collection(db, `playerLearningProfiles/${user.uid}/spellMasteryStatus`);
    const q = query(spellMasteryRef);

    const unsubscribe = onSnapshot(q, async (querySnapshot) => { // Make async for pre-loading
      const fetchedRunes: SpellMasteryData[] = [];
      let reviewCount = 0;
      const now = Date.now();

      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<SpellMasteryData, 'spellId'> & { nextReviewDate?: number | { seconds: number, nanoseconds: number }, word?: string };
        const rune: SpellMasteryData = {
          spellId: doc.id,
          masteryLevel: data.masteryLevel || 0,
          successfulCasts: data.successfulCasts || 0,
          failedCasts: data.failedCasts || 0,
          ...(data.nextReviewDate && {
            nextReviewDate: typeof data.nextReviewDate === 'number'
              ? data.nextReviewDate
              : data.nextReviewDate.seconds * 1000 + data.nextReviewDate.nanoseconds / 1000000
          }),
          ...(data.word && { word: data.word }),
        };
        fetchedRunes.push(rune);
        if (rune.nextReviewDate && rune.nextReviewDate <= now) {
          reviewCount++;
        }
      });

      setRunes(fetchedRunes);
      setRunesToReviewCount(reviewCount);
      setIsLoading(false);

      // Pre-load review items if online and there are items to review
      if (navigator.onLine && reviewCount > 0) {
        await fetchAndStoreReviewItems();
      } else if (navigator.onLine && reviewCount === 0) {
        // If online and no items to review, clear local cache
        await clearReviewItems();
        console.log("Online and no items to review, cleared local review items cache.");
      }

    }, (error) => {
      console.error("Error fetching spell mastery data:", error);
      setIsLoading(false);
      addToast({ type: 'error', message: 'Erreur de connexion au Grimoire.' });
    });

    // Initial check for offline data if user is already offline
    if (!navigator.onLine && user) {
      console.log("App started offline. Attempting to load review items from local storage.");
      getStoredReviewItems(user.uid).then(storedItems => {
        if (storedItems.length > 0) {
          // We don't set reviewItems here, but we can update the count if needed
          // For now, the main `runesToReviewCount` comes from Firestore snapshot or is 0 if offline at start
          // This logic might need refinement based on how `runesToReviewCount` should behave offline.
          // The button will be enabled if `runesToReviewCount > 0` (from Firestore cache)
          // OR if `storedItems.length > 0` when we try to start the review.
          console.log(`Found ${storedItems.length} items in local storage.`);
        }
      });
    }


    return () => unsubscribe();
  }, [user, fetchAndStoreReviewItems, addToast]); // Added fetchAndStoreReviewItems and addToast

  const handleStartReview = async () => {
    if (!user) {
      addToast({ type: 'error', message: 'Utilisateur non connecté.' });
      return;
    }
    console.log("Lancement de la session de révision...");
    // DEV NOTE: Trigger sound effect here: playSound('forge-start')

    if (navigator.onLine) {
      console.log("Mode en ligne: récupération des runes depuis le serveur.");
      try {
        const result = await getReviewItemsCallable();
        const items = result.data as SpellMasteryData[];

        if (items && items.length > 0) {
          setReviewItems(items);
          setIsReviewing(true);
          // Also save to local storage for potential offline use during the session or next time
          await saveReviewItems(items, user.uid);
        } else {
          addToast({ type: 'info', message: "Toutes vos runes sont déjà solides ! Aucune révision nécessaire." });
          console.log("Aucune rune à réviser.");
          await clearReviewItems(); // Clear local cache if no items online
        }
      } catch (error) {
        console.error("Impossible de récupérer les runes à réviser (en ligne):", error);
        addToast({ type: 'error', message: "Erreur lors de la préparation de la forge. Tentative avec les données locales." });
        // Fallback to local data if online fetch fails
        await loadItemsFromLocalDB();
      }
    } else {
      console.log("Mode hors-ligne: récupération des runes depuis IndexedDB.");
      await loadItemsFromLocalDB();
    }
  };

  const loadItemsFromLocalDB = async () => {
    if (!user) return;
    const storedItems = await getStoredReviewItems(user.uid);
    if (storedItems && storedItems.length > 0) {
      setReviewItems(storedItems);
      setIsReviewing(true);
      addToast({ type: 'info', message: 'Session de révision lancée avec les données hors-ligne.' });
    } else {
      addToast({ type: 'info', message: "Aucune rune n'est disponible pour révision hors-ligne. Connectez-vous pour les télécharger." });
      console.log("Aucune rune à réviser stockée localement.");
    }
  };


  if (isLoading) {
    return <p>Gravure des runes en cours...</p>;
  }

  if (isReviewing) {
    return (
      <ReviewSession
        reviewItems={reviewItems}
        onSessionEnd={() => {
          setIsReviewing(false);
          // Optionally, refresh rune counts or data here if review affects it immediately
          // For example, by re-fetching or adjusting runesToReviewCount based on the review.
          // For now, just closing the session.
          console.log("Session de révision terminée, retour au Grimoire.");
        }}
      />
    );
  }

  return (
    <div className="grimoire-container">
      <div className="grimoire-controls">
        {/* TODO: Ajouter des filtres et tris ici */}
        <button
          className="review-button"
          onClick={handleStartReview}
          disabled={runesToReviewCount === 0 && !isLoading} // Also disable if loading to prevent multiple clicks
        >
          {isLoading ? 'Chargement...' : `Forger les Runes (${runesToReviewCount} à réviser)`}
        </button>
      </div>
      <div className="runes-grid">
        {runes.map((rune) => (
          <div key={rune.spellId} className={`rune-item mastery-${rune.masteryLevel}`}>
            <span className="rune-word">{rune.word || rune.spellId}</span>
            <span className="rune-mastery-label">Maîtrise Nv. {rune.masteryLevel}</span>
          </div>
        ))}
        {runes.length === 0 && !isLoading && (
          <p>Aucune rune n'a encore été apprise. Explorez le monde pour en découvrir !</p>
        )}
      </div>
    </div>
  );
};

export default GrimoireVivant;

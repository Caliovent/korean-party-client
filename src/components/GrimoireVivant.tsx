import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db, functions } from '../firebaseConfig'; // Added functions
import { collection, onSnapshot, query, Timestamp } from 'firebase/firestore'; // Added Timestamp
import { useAuth } from '../hooks/useAuth';
import type { SpellMasteryData } from '../types/game';
import type { SpellId } from '../data/spells'; // Import SpellId
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
  const [_isOffline, setIsOffline] = useState(!navigator.onLine); // Prefixed isOffline

  const getReviewItemsCallable = httpsCallable(functions, 'getReviewItems');

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      addToast('Vous êtes de nouveau en ligne.', 'info');
    };
    const handleOffline = () => {
      setIsOffline(true);
      addToast('Vous êtes actuellement hors-ligne.', 'warning');
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
        addToast('Données de révision pré-chargées pour utilisation hors-ligne.', 'success');
      } else {
        // S'il n'y a pas d'items à réviser en ligne, on vide aussi le cache local
        // pour éviter d'utiliser des données obsolètes en mode hors-ligne.
        await clearReviewItems();
        console.log("No review items to pre-load. Local cache cleared.");
      }
    } catch (error) {
      console.error("Failed to fetch or store review items:", error);
      addToast('Erreur lors du pré-chargement des données de révision.', 'error');
    }
  }, [user, getReviewItemsCallable, addToast]);

  // Sorting and Filtering States
  const [sortBy, setSortBy] = useState<string>('word-asc'); // 'word-asc', 'word-desc', 'mastery-asc', 'mastery-desc'
  const [filterMastery, setFilterMastery] = useState<string>('all'); // 'all', '0', '1', '2', '3', '4'

  // Firebase function callable getReviewItemsCallable is already initialized above

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
        const rawData = doc.data() as { [key: string]: any; nextReviewDate?: number | Timestamp | { seconds: number, nanoseconds: number }; word?: string; masteryLevel?: number; successfulCasts?: number; failedCasts?: number; };

        let nextReviewDateMs: number | undefined = undefined;
        if (rawData.nextReviewDate) {
          if (typeof rawData.nextReviewDate === 'number') {
            nextReviewDateMs = rawData.nextReviewDate;
          } else if (rawData.nextReviewDate instanceof Timestamp) { // Check if it's a Firestore Timestamp
            nextReviewDateMs = rawData.nextReviewDate.toMillis();
          } else if (typeof rawData.nextReviewDate === 'object' && 'seconds' in rawData.nextReviewDate && 'nanoseconds' in rawData.nextReviewDate) {
            // Handle plain object case (if data comes like that, e.g. from non-Timestamp Firebase field)
            nextReviewDateMs = rawData.nextReviewDate.seconds * 1000 + rawData.nextReviewDate.nanoseconds / 1000000;
          }
        }

        const rune: SpellMasteryData = {
          spellId: doc.id as SpellId,
          masteryLevel: rawData.masteryLevel || 0,
          successfulCasts: rawData.successfulCasts || 0,
          failedCasts: rawData.failedCasts || 0,
          word: rawData.word,
          nextReviewDate: nextReviewDateMs,
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
      addToast('Erreur de connexion au Grimoire.', 'error');
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

  const processedRunes = useMemo(() => {
    let filteredAndSortedRunes = [...runes];

    // Filtering
    if (filterMastery !== 'all') {
      filteredAndSortedRunes = filteredAndSortedRunes.filter(
        (rune) => rune.masteryLevel === parseInt(filterMastery, 10)
      );
    }

    // Sorting
    switch (sortBy) {
      case 'word-asc':
        filteredAndSortedRunes.sort((a, b) => (a.word || a.spellId).localeCompare(b.word || b.spellId));
        break;
      case 'word-desc':
        filteredAndSortedRunes.sort((a, b) => (b.word || b.spellId).localeCompare(a.word || a.spellId));
        break;
      case 'mastery-asc':
        filteredAndSortedRunes.sort((a, b) => a.masteryLevel - b.masteryLevel);
        break;
      case 'mastery-desc':
        filteredAndSortedRunes.sort((a, b) => b.masteryLevel - a.masteryLevel);
        break;
      default:
        break;
    }

    return filteredAndSortedRunes;
  }, [runes, sortBy, filterMastery]);

  const handleStartReview = async () => {
    if (!user) {
      addToast('Utilisateur non connecté.', 'error');
      return;
    }
    console.log("Lancement de la session de révision...");
    // DEV NOTE: Trigger sound effect here: playSound('forge-start')
    alert("playSound('forge-start')"); // Placeholder for sound

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
          addToast("Toutes vos runes sont déjà solides ! Aucune révision nécessaire.", 'info');
          console.log("Aucune rune à réviser.");
          await clearReviewItems(); // Clear local cache if no items online
        }
      } catch (error) {
        console.error("Impossible de récupérer les runes à réviser (en ligne):", error);
        addToast("Erreur lors de la préparation de la forge. Tentative avec les données locales.", 'error');
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
      addToast('Session de révision lancée avec les données hors-ligne.', 'info');
    } else {
      addToast("Aucune rune n'est disponible pour révision hors-ligne. Connectez-vous pour les télécharger.", 'info');
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
          // The onSnapshot listener for spellMasteryStatus should automatically update the runes
          // and runesToReviewCount when changes are made by the ReviewSession.
          console.log("Session de révision terminée, retour au Grimoire.");
        }}
      />
    );
  }

  return (
    <div className="grimoire-container">
      <div className="grimoire-controls">
        <div className="filter-sort-controls">
          <label htmlFor="sort-by">Trier par :</label>
          <select id="sort-by" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="word-asc">Nom (A-Z)</option>
            <option value="word-desc">Nom (Z-A)</option>
            <option value="mastery-asc">Maîtrise (Croissant)</option>
            <option value="mastery-desc">Maîtrise (Décroissant)</option>
          </select>

          <label htmlFor="filter-mastery">Filtrer par Maîtrise :</label>
          <select id="filter-mastery" value={filterMastery} onChange={(e) => setFilterMastery(e.target.value)}>
            <option value="all">Tous les Niveaux</option>
            <option value="0">Niveau 0 (Découverte)</option>
            <option value="1">Niveau 1 (Découverte)</option>
            <option value="2">Niveau 2 (Apprentissage)</option>
            <option value="3">Niveau 3 (Maîtrise)</option>
            <option value="4">Niveau 4 (Gravure)</option>
          </select>
        </div>
        <button
          className="review-button"
          onClick={handleStartReview}
          disabled={runesToReviewCount === 0 && !isLoading} // Also disable if loading to prevent multiple clicks
        >
          {isLoading ? 'Chargement...' : `Forger les Runes (${runesToReviewCount} à réviser)`}
        </button>
      </div>
      <div className="runes-grid">
        {processedRunes.map((rune) => (
          <div key={rune.spellId} className={`rune-item mastery-${rune.masteryLevel}`}>
            <span className="rune-word">{rune.word || rune.spellId}</span>
            <span className="rune-mastery-label">Maîtrise Nv. {rune.masteryLevel}</span>
          </div>
        ))}
        {processedRunes.length === 0 && runes.length > 0 && !isLoading && (
          <p>Aucune rune ne correspond à vos critères de filtre actuels.</p>
        )}
        {runes.length === 0 && !isLoading && (
          <p>Aucune rune n'a encore été apprise. Explorez le monde pour en découvrir !</p>
        )}
      </div>
    </div>
  );
};

export default GrimoireVivant;

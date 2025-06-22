import React, { useState, useEffect, useMemo } from 'react';
import { db, functions } from '../firebaseConfig'; // Added functions
import { collection, onSnapshot, query } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import type { SpellMasteryData } from '../types/game';
import './GrimoireVivant.css';
import ReviewSession from './ReviewSession'; // Import ReviewSession
import { httpsCallable } from 'firebase/functions'; // Import httpsCallable

const GrimoireVivant: React.FC = () => {
  const [runes, setRunes] = useState<SpellMasteryData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [runesToReviewCount, setRunesToReviewCount] = useState<number>(0);
  const { user } = useAuth();

  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewItems, setReviewItems] = useState<SpellMasteryData[]>([]);

  // Sorting and Filtering States
  const [sortBy, setSortBy] = useState<string>('word-asc'); // 'word-asc', 'word-desc', 'mastery-asc', 'mastery-desc'
  const [filterMastery, setFilterMastery] = useState<string>('all'); // 'all', '0', '1', '2', '3', '4'

  // Initialize Firebase function callable
  const getReviewItems = httpsCallable(functions, 'getReviewItems');

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const spellMasteryRef = collection(db, `playerLearningProfiles/${user.uid}/spellMasteryStatus`);
    const q = query(spellMasteryRef);

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
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
    }, (error) => {
      console.error("Error fetching spell mastery data:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

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
    console.log("Lancement de la session de révision...");
    // DEV NOTE: Trigger sound effect here: playSound('forge-start')
    alert("playSound('forge-start')"); // Placeholder for sound

    try {
      const result = await getReviewItems();
      // Ensure correct typing for result.data. Adjust if your Cloud Function returns a different structure.
      const items = result.data as SpellMasteryData[];

      if (items && items.length > 0) {
        setReviewItems(items);
        setIsReviewing(true);
      } else {
        // Consider using a more integrated notification system if available
        alert("Toutes vos runes sont déjà solides ! Aucune révision nécessaire pour le moment.");
        console.log("Aucune rune à réviser.");
      }
    } catch (error) {
      console.error("Impossible de récupérer les runes à réviser:", error);
      // Potentially show a user-facing error message here
      alert("Erreur lors de la préparation de la forge des runes. Veuillez réessayer.");
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

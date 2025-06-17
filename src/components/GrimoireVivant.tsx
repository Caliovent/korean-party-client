import React, { useState, useEffect } from 'react';
import { db, functions } from '../firebaseConfig'; // Added functions
import { collection, onSnapshot, query, DocumentData } from 'firebase/firestore';
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

  const handleStartReview = async () => {
    console.log("Lancement de la session de révision...");
    // DEV NOTE: Trigger sound effect here: playSound('forge-start')

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

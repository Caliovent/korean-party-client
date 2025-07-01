import React, { useState, useEffect } from 'react';
import type { SpellMasteryData } from '../types/game';
import { functions } from '../firebaseConfig';
import { httpsCallable } from 'firebase/functions';
import './ReviewSession.css';
import { addToSyncQueue } from '../services/dbService'; // Import addToSyncQueue
import { useAuth } from '../hooks/useAuth'; // Import useAuth to get current user ID
import { useToasts } from '../contexts/ToastContext'; // Import useToasts

interface ReviewSessionProps {
  reviewItems: SpellMasteryData[];
  onSessionEnd: () => void;
}

const ReviewSession: React.FC<ReviewSessionProps> = ({ reviewItems, onSessionEnd }) => {
  const [currentItemIndex, setCurrentItemIndex] = useState<number>(0);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { user } = useAuth(); // Get user for user.uid
  const { addToast } = useToasts();

  const updateReviewItemCallable = httpsCallable(functions, 'updateReviewItem');

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const currentItem = reviewItems[currentItemIndex];

  const handleResponse = async (isCorrect: boolean) => {
    if (!currentItem || !user) {
      addToast('Erreur: Item ou utilisateur non défini.', 'error');
      return;
    }

    // DEV NOTE: Trigger sound effect here: playSound('review-response')
    alert(`playSound('review-response-${isCorrect ? 'correct' : 'incorrect'}')`); // Placeholder for sound
    console.log(`Response for ${currentItem.spellId}: ${isCorrect ? 'Correct' : 'Incorrect'}`);

    if (isOffline) {
      console.log(`Mode hors-ligne: Ajout de la réponse pour ${currentItem.spellId} à la file de synchronisation.`);
      try {
        await addToSyncQueue({
          itemId: currentItem.spellId,
          isCorrect,
          userId: user.uid, // Pass userId
        });
        addToast(`Progrès sauvegardé localement pour ${currentItem.word || currentItem.spellId}.`, 'info');
      } catch (error) {
        console.error("Erreur lors de l'ajout à la file de synchronisation:", error);
        addToast("Échec de la sauvegarde locale du progrès.", 'error');
      }
    } else {
      console.log(`Mode en ligne: Mise à jour de ${currentItem.spellId} sur le serveur.`);
      try {
        await updateReviewItemCallable({
          itemId: currentItem.spellId,
          isCorrect
        });
        console.log(`Review item ${currentItem.spellId} updated on server.`);
        addToast(`Progrès synchronisé pour ${currentItem.word || currentItem.spellId}.`, 'success');
      } catch (error) {
        console.error("Erreur lors de la mise à jour de l'item (en ligne):", error);
        addToast(`Échec de la synchronisation pour ${currentItem.word || currentItem.spellId}. Sauvegardé localement.`, 'warning');
        // Fallback: add to sync queue if online update fails
        try {
          await addToSyncQueue({
            itemId: currentItem.spellId,
            isCorrect,
            userId: user.uid,
          });
        } catch (syncError) {
          console.error("Erreur lors de l'ajout à la file de synchronisation (fallback):", syncError);
          addToast("Échec critique: Impossible de sauvegarder le progrès.", 'error');
        }
      }
    }

    setIsRevealed(false);

    if (currentItemIndex < reviewItems.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
    } else {
      // DEV NOTE: Trigger sound effect here: playSound('session-complete')
      alert("playSound('session-complete')"); // Placeholder for sound
      console.log("Session terminée!");
      onSessionEnd();
    }
  };

  if (!currentItem) {
    // This case should ideally be handled by the parent component (e.g., not rendering ReviewSession if reviewItems is empty)
    // but it's a good fallback.
    return <p>Aucune rune à forger pour le moment. Session terminée ou items non disponibles.</p>;
  }

  return (
    <div className="review-session-container">
      <div className="review-card">
        <div className="review-prompt">
          {/* Assuming currentItem.word exists. If not, currentItem.spellId or another property might be used. */}
          {currentItem.word || currentItem.spellId || 'Mot/Sort à réviser'}
        </div>
        <div className={`review-answer ${isRevealed ? 'visible' : ''}`}>
          {currentItem.definition ? (
            <p>{currentItem.definition}</p>
          ) : (
            <p>Définition non disponible.</p>
          )}
        </div>

        {!isRevealed ? (
          <button onClick={() => setIsRevealed(true)} className="reveal-btn">
            Révéler
          </button>
        ) : (
          <div className="response-buttons">
            <button className="correct-btn" onClick={() => handleResponse(true)}>
              Je savais
            </button>
            <button className="incorrect-btn" onClick={() => handleResponse(false)}>
              Oublié
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewSession;

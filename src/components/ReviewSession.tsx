import React, { useState } from 'react';
import type { SpellMasteryData } from '../types/game'; // Ensure this path is correct
import { functions } from '../firebaseConfig'; // Assuming 'functions' is exported from firebaseConfig
import { httpsCallable } from 'firebase/functions';
import './ReviewSession.css';

interface ReviewSessionProps {
  reviewItems: SpellMasteryData[];
  onSessionEnd: () => void;
}

const ReviewSession: React.FC<ReviewSessionProps> = ({ reviewItems, onSessionEnd }) => {
  const [currentItemIndex, setCurrentItemIndex] = useState<number>(0);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);

  // It's good practice to ensure functions is initialized before using it.
  // Depending on your firebaseConfig setup, it might already be initialized.
  // If not, you might need: const functions = getFunctions(app); or similar.
  const updateReviewItem = httpsCallable(functions, 'updateReviewItem');

  const currentItem = reviewItems[currentItemIndex];

  const handleResponse = async (isCorrect: boolean) => {
    if (!currentItem) return; // Should not happen if component is rendered

    // DEV NOTE: Trigger sound effect here: playSound('review-response')
    alert(`playSound('review-response-${isCorrect ? 'correct' : 'incorrect'}')`); // Placeholder for sound
    console.log(`Response for ${currentItem.spellId}: ${isCorrect ? 'Correct' : 'Incorrect'}`);

    try {
      await updateReviewItem({
        itemId: currentItem.spellId, // Assuming 'spellId' is the correct ID for the backend
        isCorrect
      });
      console.log(`Review item ${currentItem.spellId} updated.`);
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'item:", error);
      // Optionally, provide user feedback here
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
          {/* This is a placeholder. The actual "answer" would depend on what needs to be recalled.
              For a spell, it might be its effect, components, or incantation.
              For now, we'll just use a generic placeholder. */}
          <p>Signification/Détails de la rune : "{currentItem.word || currentItem.spellId}"</p>
          {/* Example: <p>Effet: {currentItem.effectDescription}</p> */}
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

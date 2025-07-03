import React, { useState, useEffect } from 'react';
import type { PoemPuzzle, PoemLine, PoemSubmitResult } from './poemApi'; // Assuming poemApi.ts is in the same directory
import { getPoemPuzzleData, submitPoemResults } from './poemApi'; // Assuming poemApi.ts is in the same directory
import type { Game } from './src/types/game'; // Import Game type
import { broadcastAction } from './src/services/gameService'; // Import broadcastAction

interface LostPoemSceneProps {
  onFinish: (score?: number, total?: number) => Promise<void>; // Adjusted for consistency, score/total optional here
  isSpectator?: boolean;
  game?: Game;
}

const LostPoemScene: React.FC<LostPoemSceneProps> = ({ onFinish, isSpectator = false, game }) => {
  const [poemData, setPoemData] = useState<PoemPuzzle | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filledSlots, setFilledSlots] = useState<(string | null)[]>([]);
  const [selectedWord, setSelectedWord] = useState<{ word: string; fromBank: boolean; originalIndex?: number } | null>(null);
  const [feedback, setFeedback] = useState<('correct' | 'incorrect' | 'empty' | null)[]>([]);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [submitResult, setSubmitResult] = useState<PoemSubmitResult | null>(null);
  const [spectatorMessage, setSpectatorMessage] = useState<string | null>(null);

  const activePlayer = game?.players.find(p => p.uid === game.currentPlayerId);
  const activePlayerName = activePlayer ? activePlayer.displayName : 'Joueur actif';

  useEffect(() => {
    getPoemPuzzleData()
      .then(data => {
        setPoemData(data);
        setFilledSlots(new Array(data.lines.length).fill(null));
        setFeedback(new Array(data.lines.length).fill(null));
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load poem data:", err);
        setError("Impossible de charger le poème. Veuillez réessayer.");
        setLoading(false);
      });
  }, []);

  // Effect for spectator mode
  useEffect(() => {
    if (isSpectator && game?.miniGameLiveState) {
      const { lastAction, payload } = game.miniGameLiveState;
      if (lastAction === 'POEM_SLOT_FILLED' && payload?.filledSlots) {
        setFilledSlots(payload.filledSlots);
        setSpectatorMessage(`${activePlayerName} a placé des mots.`);
      } else if (lastAction === 'POEM_SUBMITTED' && payload?.submitResult && payload?.finalFeedback) {
        setSubmitted(true);
        setFeedback(payload.finalFeedback);
        setSubmitResult(payload.submitResult);
        setSpectatorMessage(`${activePlayerName} a soumis le poème. Score: ${payload.submitResult.score}%`);
        // onFinish might be called by GamePage based on game state, not directly here for spectator
      }
    }
  }, [isSpectator, game?.miniGameLiveState, activePlayerName]);


  if (loading) {
    return <div aria-live="polite">Chargement du poème...</div>;
  }

  if (error) {
    return <div role="alert" style={{ color: 'red' }}>{error}</div>;
  }

  if (!poemData) {
    return <div>Aucun poème disponible.</div>;
  }

  const handleWordBankClick = (word: string) => {
    if (isSpectator || submitted) return;
    if (selectedWord?.word === word && selectedWord.fromBank) {
      setSelectedWord(null);
    } else {
      setSelectedWord({ word, fromBank: true });
    }
  };

  const handleSlotClick = (slotIndex: number) => {
    if (isSpectator || submitted) return;

    let newFilledSlots = [...filledSlots]; // Create a mutable copy

    if (selectedWord) {
      const wordToPlace = selectedWord.word;
      if (!selectedWord.fromBank && typeof selectedWord.originalIndex === 'number') {
        newFilledSlots[selectedWord.originalIndex] = null; // Clear original slot if moving
      }
      newFilledSlots[slotIndex] = wordToPlace; // Place new word
      setFilledSlots(newFilledSlots);
      setSelectedWord(null);
    } else if (filledSlots[slotIndex]) { // Pick up word from slot
      const wordInSlot = filledSlots[slotIndex]!;
      setSelectedWord({ word: wordInSlot, fromBank: false, originalIndex: slotIndex });
      // To make it feel like picking up, clear the slot immediately
      newFilledSlots[slotIndex] = null;
      setFilledSlots(newFilledSlots);
    }

    if (game?.id && !isSpectator) { // Broadcast action if active player
        broadcastAction({
            gameId: game.id,
            action: 'POEM_SLOT_FILLED',
            payload: { filledSlots: newFilledSlots, slotIndexClicked: slotIndex },
        }).catch(console.error);
    }
  };

  const handleSubmit = async () => {
    if (!poemData || isSpectator || submitted) return;

    setSubmitted(true);
    setSelectedWord(null);

    const newFeedback = poemData.lines.map((line, index) => {
      if (filledSlots[index] === null || filledSlots[index] === undefined) return 'empty';
      return filledSlots[index] === line.correctWord ? 'correct' : 'incorrect';
    });
    setFeedback(newFeedback);

    try {
      const result = await submitPoemResults(poemData.id, filledSlots);
      setSubmitResult(result);
      if (game?.id && !isSpectator) {
        broadcastAction({
          gameId: game.id,
          action: 'POEM_SUBMITTED',
          payload: { submitResult: result, finalFeedback: newFeedback, filledSlots },
        }).catch(console.error);
      }
      onFinish(result.score, 100); // Pass score and total (assuming 100%)
    } catch (e) {
      console.error("Failed to submit poem results:", e);
      const errorResult = { score: 0, message: "Erreur lors de la soumission." };
      setSubmitResult(errorResult);
       if (game?.id && !isSpectator) { // Also broadcast error submission if needed
        broadcastAction({
          gameId: game.id,
          action: 'POEM_SUBMITTED',
          payload: { submitResult: errorResult, finalFeedback: newFeedback, filledSlots },
        }).catch(console.error);
      }
      onFinish(errorResult.score, 100); // Still call onFinish, perhaps with error score
    }
  };


  const renderPoemLine = (line: PoemLine, index: number) => {
    const currentWordInSlot = filledSlots[index]; // Spectator will see this updated from game state
    const slotFeedback = feedback[index];
    const isSlotSelectedForPickup = selectedWord?.fromBank === false && selectedWord?.originalIndex === index;

    let slotStyle: React.CSSProperties = {
      display: 'inline-block',
      minWidth: '80px',
      minHeight: '24px',
      border: '1px dashed #007bff',
      padding: '2px 8px',
      margin: '0 5px',
      cursor: submitted ? 'default' : 'pointer',
      fontWeight: filledSlots[index] ? 'bold' : 'normal',
      borderRadius: '4px',
      textAlign: 'center',
      backgroundColor: '#f0f0f0', // Default
    };

    if (submitted) {
      if (slotFeedback === 'correct') slotStyle.borderColor = 'green';
      else if (slotFeedback === 'incorrect') slotStyle.borderColor = 'red';
      else if (slotFeedback === 'empty') slotStyle.borderColor = 'orange';

      if (slotFeedback === 'correct') slotStyle.backgroundColor = '#d4edda'; // Light green
      else if (slotFeedback === 'incorrect') slotStyle.backgroundColor = '#f8d7da'; // Light red
      else if (slotFeedback === 'empty') slotStyle.backgroundColor = '#fff3cd'; // Light yellow for empty

    } else { // Not submitted yet
      if (selectedWord && !filledSlots[index]) slotStyle.backgroundColor = '#e0e0e0'; // Slot is a potential target
      else if (isSlotSelectedForPickup) slotStyle.backgroundColor = '#add8e6'; // Slot is selected for word pickup
      else if (filledSlots[index]) slotStyle.backgroundColor = '#lightblue'; // Slot has a word
    }


    return (
      <p key={line.id} className="poem-line" style={{ margin: '10px 0', fontSize: '1.1em' }}>
        {line.textBefore}
        <span
          data-testid={`drop-zone-${index}`}
          onClick={(!submitted && !isSpectator) ? () => handleSlotClick(index) : undefined}
          style={{...slotStyle, cursor: (submitted || isSpectator) ? 'default' : 'pointer', pointerEvents: (isSpectator) ? 'none' : 'auto'}}
        >
          {currentWordInSlot || '______'}
        </span>
        {line.textAfter}
      </p>
    );
  };


  return (
    <div className="lost-poem-scene" style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: 'auto' }}>
      {isSpectator && (
        <div style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '5px', marginBottom: '15px', border: '1px solid #ccc', textAlign: 'center' }}>
          Vous observez {activePlayerName}...
        </div>
      )}
      <h2 style={{ textAlign: 'center', color: '#333' }}>{poemData.title}</h2>

      <div data-testid="poem-text-container" style={{ margin: '20px 0', border: '1px solid #eee', padding: '20px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
        {poemData.lines.map(renderPoemLine)}
      </div>
      {isSpectator && spectatorMessage && <p style={{ fontStyle: 'italic', marginTop: '10px', textAlign: 'center' }}>{spectatorMessage}</p>}

      {!submitted && !isSpectator && (
        <div data-testid="word-bank-container" style={{ marginTop: '30px', padding: '15px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#555' }}>Banque de mots :</h3>
          {selectedWord && <p style={{fontStyle: 'italic', color: '#007bff'}}>Mot sélectionné : <strong>{selectedWord.word}</strong> (Cliquez sur un espace vide pour le placer)</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {poemData.wordBank.map((word, idx) => (
              <button
                key={idx}
                data-testid={`word-bank-word-${word}`}
                onClick={() => handleWordBankClick(word)}
                disabled={isSpectator || submitted || (filledSlots.includes(word) && selectedWord?.word !== word)}
                style={{
                  padding: '8px 15px',
                  border: selectedWord?.word === word && selectedWord.fromBank && !submitted && !isSpectator ? '2px solid #007bff' : '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: (isSpectator || submitted) ? 'default' : 'pointer',
                  backgroundColor: (isSpectator || submitted || filledSlots.includes(word)) ? '#d3d3d3' : (selectedWord?.word === word && selectedWord.fromBank ? '#cce7ff' : 'white'),
                  color: (isSpectator || submitted || filledSlots.includes(word)) ? '#777' : '#333',
                  fontWeight: selectedWord?.word === word && selectedWord.fromBank && !submitted && !isSpectator ? 'bold' : 'normal',
                  opacity: (isSpectator || submitted || (filledSlots.includes(word) && !(selectedWord?.word === word && !selectedWord.fromBank))) ? 0.6 : 1,
                   pointerEvents: isSpectator ? 'none' : 'auto',
                }}
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* For spectators, the word bank might be hidden or shown as read-only if desired by design */}
      {/* Example: Show read-only word bank for spectator if the game is not submitted yet */}
      {isSpectator && !submitted && poemData.wordBank && (
         <div data-testid="word-bank-container-spectator" style={{ marginTop: '30px', padding: '15px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#e9e9e9', opacity: 0.7 }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#555' }}>Banque de mots (Observation) :</h3>
           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {poemData.wordBank.map((word, idx) => (
              <span key={idx} style={{ padding: '8px 15px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: filledSlots.includes(word) ? '#d3d3d3' : 'white', color: filledSlots.includes(word) ? '#777' : '#333' }}>
                {word}
              </span>
            ))}
          </div>
        </div>
      )}


      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        {!submitted ? (
          <button
            data-testid="verify-button"
            onClick={handleSubmit}
            disabled={isSpectator}
            style={{
              padding: '12px 25px',
              fontSize: '16px',
              backgroundColor: (isSpectator) ? '#ccc' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: (isSpectator) ? 'default' : 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              pointerEvents: isSpectator ? 'none' : 'auto',
            }}
          >
            Vérifier
          </button>
        ) : (
          submitResult && (
            <div data-testid="submission-result" style={{ padding: '15px', border: `1px solid ${submitResult.score > 50 ? 'green' : 'orange'}`, borderRadius: '5px', backgroundColor: `${submitResult.score > 70 ? '#d4edda' : '#fff3cd'}` }}>
              <h3 style={{marginTop: 0}}>{isSpectator ? `Résultats de ${activePlayerName}` : "Résultats :"}</h3>
              <p>{submitResult.message}</p>
              <p>Score: {submitResult.score}%</p>
              {isSpectator && <p>Attente du retour au jeu principal...</p>}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default LostPoemScene;

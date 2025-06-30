import React, { useState, useEffect } from 'react';
import { PoemPuzzle, PoemLine, getPoemPuzzleData } from './poemApi'; // Assuming poemApi.ts is in the same directory

interface LostPoemSceneProps {
  // Props if any, e.g., onGameComplete
}

const LostPoemScene: React.FC<LostPoemSceneProps> = () => {
  const [poemData, setPoemData] = useState<PoemPuzzle | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filledSlots, setFilledSlots] = useState<(string | null)[]>([]);
  const [selectedWord, setSelectedWord] = useState<{ word: string; fromBank: boolean; originalIndex?: number } | null>(null);
  const [feedback, setFeedback] = useState<('correct' | 'incorrect' | 'empty' | null)[]>([]);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [submitResult, setSubmitResult] = useState<api.PoemSubmitResult | null>(null);


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
    // If this word is already placed in a slot, selecting it from bank effectively deselects it from slot for moving
    // For simplicity now, bank words are just sources. If a word is selected from a slot, it can be moved to another slot or back to bank.
    if (selectedWord?.word === word && selectedWord.fromBank) {
      setSelectedWord(null); // Deselect if clicking the same bank word
    } else {
      setSelectedWord({ word, fromBank: true });
    }
  };

  const handleSlotClick = (slotIndex: number) => {
    if (selectedWord) { // A word is selected (either from bank or another slot)
      const newFilledSlots = [...filledSlots];
      const wordToPlace = selectedWord.word;

      // If the target slot already has a word, and that word is the one currently selected (meaning we are moving it FROM this slot)
      // then this click should ideally be to pick it up, not place. But current selectedWord state handles this.

      // If the selected word was from another slot, clear that original slot
      if (!selectedWord.fromBank && typeof selectedWord.originalIndex === 'number') {
        newFilledSlots[selectedWord.originalIndex] = null;
      }

      // Place the new word in the target slot
      newFilledSlots[slotIndex] = wordToPlace;
      setFilledSlots(newFilledSlots);
      setSelectedWord(null); // Word has been placed
    } else if (filledSlots[slotIndex]) {
      // No word is selected, and the clicked slot has a word: pick it up
      const wordInSlot = filledSlots[slotIndex]!;
      setSelectedWord({ word: wordInSlot, fromBank: false, originalIndex: slotIndex });
      // Optionally, immediately clear it from the slot, or wait for it to be placed elsewhere.
      // For a "move" operation, clearing it now makes sense.
      // const newFilledSlots = [...filledSlots];
      // newFilledSlots[slotIndex] = null;
      // setFilledSlots(newFilledSlots);
    }
  };

  const handleSubmit = async () => {
    if (!poemData) return;
    setSubmitted(true);
    setSelectedWord(null); // Clear selection on submit

    const newFeedback = poemData.lines.map((line, index) => {
      if (filledSlots[index] === null || filledSlots[index] === undefined) {
        return 'empty';
      }
      return filledSlots[index] === line.correctWord ? 'correct' : 'incorrect';
    });
    setFeedback(newFeedback);

    try {
      const result = await api.submitPoemResults(poemData.id, filledSlots);
      setSubmitResult(result);
      // console.log("Poem submitted, result:", result);
    } catch (e) {
      console.error("Failed to submit poem results:", e);
      setSubmitResult({ score: 0, message: "Erreur lors de la soumission."});
    }
  };


  const renderPoemLine = (line: PoemLine, index: number) => {
    const currentWordInSlot = filledSlots[index];
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
          onClick={!submitted ? () => handleSlotClick(index) : undefined}
          style={slotStyle}
        >
          {currentWordInSlot || '______'}
        </span>
        {line.textAfter}
      </p>
    );
  };


  return (
    <div className="lost-poem-scene" style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: 'auto' }}>
      <h2 style={{ textAlign: 'center', color: '#333' }}>{poemData.title}</h2>

      <div data-testid="poem-text-container" style={{ margin: '20px 0', border: '1px solid #eee', padding: '20px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
        {poemData.lines.map(renderPoemLine)}
      </div>

      {!submitted && (
        <div data-testid="word-bank-container" style={{ marginTop: '30px', padding: '15px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#555' }}>Banque de mots :</h3>
          {selectedWord && <p style={{fontStyle: 'italic', color: '#007bff'}}>Mot sélectionné : <strong>{selectedWord.word}</strong> (Cliquez sur un espace vide pour le placer)</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {poemData.wordBank.map((word, idx) => (
              <button
                key={idx}
                data-testid={`word-bank-word-${word}`}
                onClick={() => handleWordBankClick(word)}
                disabled={submitted || (filledSlots.includes(word) && selectedWord?.word !== word)}
                style={{
                  padding: '8px 15px',
                  border: selectedWord?.word === word && selectedWord.fromBank && !submitted ? '2px solid #007bff' : '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: submitted ? 'default' : 'pointer',
                  backgroundColor: submitted || filledSlots.includes(word) ? '#d3d3d3' : (selectedWord?.word === word && selectedWord.fromBank ? '#cce7ff' : 'white'),
                  color: submitted || filledSlots.includes(word) ? '#777' : '#333',
                  fontWeight: selectedWord?.word === word && selectedWord.fromBank && !submitted ? 'bold' : 'normal',
                  opacity: submitted || (filledSlots.includes(word) && !(selectedWord?.word === word && !selectedWord.fromBank)) ? 0.6 : 1,
                }}
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        {!submitted ? (
          <button
            data-testid="verify-button"
            onClick={handleSubmit}
            style={{
              padding: '12px 25px',
              fontSize: '16px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            Vérifier
          </button>
        ) : (
          submitResult && (
            <div data-testid="submission-result" style={{ padding: '15px', border: `1px solid ${submitResult.score > 50 ? 'green' : 'orange'}`, borderRadius: '5px', backgroundColor: `${submitResult.score > 70 ? '#d4edda' : '#fff3cd'}` }}>
              <h3 style={{marginTop: 0}}>Résultats :</h3>
              <p>{submitResult.message}</p>
              <p>Score: {submitResult.score}%</p>
              {/* Could add a button to play again or go back */}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default LostPoemScene;

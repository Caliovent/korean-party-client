// DokkaebiSaysScene.tsx
import React, { useState } from 'react'; // Added useState for simple interaction

// Define the structure of the challenge data passed from GamePage
export interface DokkaebiSaysChallengeData {
  sequence: string[]; // Example: sequence of colors or actions
  totalRounds: number;
  // Add other relevant fields for the game logic
}

interface DokkaebiSaysSceneProps {
  // gameId is not directly used by the scene if challenge data is self-contained
  challengeData: DokkaebiSaysChallengeData;
  onFinish: (score: number, totalQuestions: number) => Promise<void>; // Consistent with FoodFeastScene
}

const DokkaebiSaysScene: React.FC<DokkaebiSaysSceneProps> = ({ challengeData, onFinish }) => {
  const [currentRound, setCurrentRound] = useState(0);
  const [playerScore, setPlayerScore] = useState(0);

  // Placeholder for game logic: Simulate player completing a round
  const handleSimulateRoundComplete = (success: boolean) => {
    if (success) {
      setPlayerScore(prev => prev + 1);
    }
    if (currentRound < challengeData.totalRounds - 1) {
      setCurrentRound(prev => prev + 1);
    } else {
      // Game over, call onFinish
      onFinish(playerScore, challengeData.totalRounds);
    }
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center', border: '2px dashed green', margin: '20px' }}>
      <h1>Dokkaebi Says Mini-Game</h1>
      <p>Instructions: Suivez la séquence du Dokkaebi!</p>

      {challengeData && challengeData.sequence && (
        <div>
          <p>Séquence actuelle (pour test): {challengeData.sequence.join(', ')}</p>
          <p>Round: {currentRound + 1} / {challengeData.totalRounds}</p>
          <p>Score: {playerScore}</p>
        </div>
      )}

      {currentRound < challengeData.totalRounds ? (
        <div style={{marginTop: '20px'}}>
          <p>Simulez le round:</p>
          <button
            onClick={() => handleSimulateRoundComplete(true)}
            style={{ padding: '10px 15px', fontSize: '14px', cursor: 'pointer', marginRight: '10px', backgroundColor: 'lightgreen' }}
          >
            Réussir le round
          </button>
          <button
            onClick={() => handleSimulateRoundComplete(false)}
            style={{ padding: '10px 15px', fontSize: '14px', cursor: 'pointer', backgroundColor: 'lightcoral' }}
          >
            Échouer le round
          </button>
        </div>
      ) : (
        <p style={{marginTop: '20px', fontWeight: 'bold'}}>Défi Dokkaebi terminé! En attente de la suite...</p>
      )}

      {/* The old direct finish button is replaced by game logic progression */}
      {/*
      <button
        onClick={() => onFinish(playerScore, challengeData.totalRounds)}
        style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', marginTop: '30px' }}
        disabled={currentRound < challengeData.totalRounds} // Disable if game not finished
      >
        Terminer le Mini-Jeu (Score Actuel)
      </button>
      */}
    </div>
  );
};

export default DokkaebiSaysScene;

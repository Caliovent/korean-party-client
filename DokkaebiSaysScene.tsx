// DokkaebiSaysScene.tsx
import React, { useState, useEffect } from 'react'; // Added useState and useEffect
import type { Game } from './src/types/game'; // Import Game type
import { broadcastAction } from './src/services/gameService'; // Import broadcastAction

// Define the structure of the challenge data passed from GamePage
export interface DokkaebiSaysChallengeData {
  sequence: string[]; // Example: sequence of colors or actions
  totalRounds: number;
  // Add other relevant fields for the game logic
}

interface DokkaebiSaysSceneProps {
  challengeData: DokkaebiSaysChallengeData;
  onFinish: (score: number, totalQuestions: number) => Promise<void>; // Consistent with FoodFeastScene
  isSpectator?: boolean;
  game?: Game;
}

const DokkaebiSaysScene: React.FC<DokkaebiSaysSceneProps> = ({ challengeData, onFinish, isSpectator = false, game }) => {
  const [currentRound, setCurrentRound] = useState(0);
  const [playerScore, setPlayerScore] = useState(0);
  const [spectatorMessage, setSpectatorMessage] = useState<string | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);


  const activePlayer = game?.players.find(p => p.uid === game.currentPlayerId);
  const activePlayerName = activePlayer ? activePlayer.displayName : 'Joueur actif';

  // Effect for spectator mode to react to live state changes
  useEffect(() => {
    if (isSpectator && game?.miniGameLiveState) {
      const { lastAction, payload } = game.miniGameLiveState;
      if (lastAction === 'SIMULATE_ROUND_DOKKAEBI') {
        setSpectatorMessage(`${activePlayerName} a ${payload.success ? 'réussi' : 'échoué'} le round ${payload.round + 1}.`);
        // Update local state to reflect observed progress
        setCurrentRound(payload.round + 1); // payload.round is 0-indexed round completed
        if (payload.isGameOver) {
          setIsGameOver(true);
          setSpectatorMessage(`${activePlayerName} a terminé le défi Dokkaebi Says! Score: ${payload.finalScore}/${challengeData.totalRounds}`);
        }
      }
    }
  }, [isSpectator, game?.miniGameLiveState, activePlayerName, challengeData.totalRounds]);

  // Placeholder for game logic: Simulate player completing a round
  const handleSimulateRoundComplete = async (success: boolean) => {
    if (isSpectator || isGameOver) return;

    let newScore = playerScore;
    if (success) {
      newScore = playerScore + 1;
      setPlayerScore(newScore);
    }

    const nextRound = currentRound + 1;
    const gameIsOver = nextRound >= challengeData.totalRounds;

    if (game?.id) {
      try {
        await broadcastAction({
          gameId: game.id,
          action: 'SIMULATE_ROUND_DOKKAEBI',
          payload: { success, round: currentRound, nextRound: nextRound, isGameOver: gameIsOver, score: newScore, finalScore: gameIsOver ? newScore : undefined },
        });
      } catch (error) {
        console.error("Error broadcasting action:", error);
      }
    }

    if (gameIsOver) {
      setIsGameOver(true);
      onFinish(newScore, challengeData.totalRounds);
    } else {
      setCurrentRound(nextRound);
    }
  };

  const displayRound = isSpectator && game?.miniGameLiveState?.payload?.nextRound !== undefined ? game.miniGameLiveState.payload.nextRound : currentRound;
  const displayScore = isSpectator && game?.miniGameLiveState?.payload?.score !== undefined ? game.miniGameLiveState.payload.score : playerScore;


  if (isGameOver) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', border: '2px dashed green', margin: '20px' }}>
        <h1>Dokkaebi Says Mini-Game Terminé!</h1>
        {isSpectator ? (
          <p>{spectatorMessage || `Défi terminé pour ${activePlayerName}. Score: ${game?.miniGameLiveState?.payload?.finalScore}/${challengeData.totalRounds}`}</p>
        ) : (
          <p>Votre score : {playerScore} / {challengeData.totalRounds}</p>
        )}
        <p>Retour au jeu principal...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', textAlign: 'center', border: '2px dashed green', margin: '20px' }}>
      {isSpectator && (
        <div style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '5px', marginBottom: '15px', border: '1px solid #ccc' }}>
          Vous observez {activePlayerName}...
        </div>
      )}
      <h1>Dokkaebi Says Mini-Game</h1>
      <p>Instructions: Suivez la séquence du Dokkaebi!</p>

      {challengeData && ( // Removed challengeData.sequence check as it's not used in display for this placeholder
        <div>
          {/* <p>Séquence actuelle (pour test): {challengeData.sequence.join(', ')}</p> */}
          <p>Round: {displayRound + 1} / {challengeData.totalRounds}</p>
          <p>Score: {displayScore}</p>
        </div>
      )}
      {isSpectator && spectatorMessage && <p style={{ fontStyle: 'italic', marginTop: '10px' }}>{spectatorMessage}</p>}

      {displayRound < challengeData.totalRounds && !isGameOver ? (
        <div style={{marginTop: '20px'}}>
          <p>Simulez le round:</p>
          <button
            onClick={() => handleSimulateRoundComplete(true)}
            style={{ padding: '10px 15px', fontSize: '14px', cursor: (isSpectator || isGameOver) ? 'default' : 'pointer', marginRight: '10px', backgroundColor: 'lightgreen', pointerEvents: (isSpectator || isGameOver) ? 'none' : 'auto' }}
            disabled={isSpectator || isGameOver}
          >
            Réussir le round
          </button>
          <button
            onClick={() => handleSimulateRoundComplete(false)}
            style={{ padding: '10px 15px', fontSize: '14px', cursor: (isSpectator || isGameOver) ? 'default' : 'pointer', backgroundColor: 'lightcoral', pointerEvents: (isSpectator || isGameOver) ? 'none' : 'auto' }}
            disabled={isSpectator || isGameOver}
          >
            Échouer le round
          </button>
        </div>
      ) : (
         !isGameOver && <p style={{marginTop: '20px', fontWeight: 'bold'}}>Défi Dokkaebi terminé! En attente de la suite...</p>
      )}
    </div>
  );
};

export default DokkaebiSaysScene;

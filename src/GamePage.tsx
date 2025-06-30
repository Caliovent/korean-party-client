import React, { useState, useEffect } from 'react';
import NamdaemunMarketScene from '../NamdaemunMarketScene';
import type { GameRoundData, Item } from './types';
import { getNamdaemunGameData, submitNamdaemunResults } from './gameData';

const TOTAL_ROUNDS_NAMDAEMUN = 5; // Example: 5 rounds for the mini-game
const ROUND_TIME_LIMIT_SECONDS = 15; // Example: 15 seconds per round

const GamePage: React.FC = () => {
  const [currentMiniGame, setCurrentMiniGame] = useState<'none' | 'namdaemun'>('none');
  const [namdaemunGameData, setNamdaemunGameData] = useState<GameRoundData | null>(null);
  const [namdaemunScore, setNamdaemunScore] = useState<number>(0);
  const [namdaemunRound, setNamdaemunRound] = useState<number>(0);
  const [showNamdaemunEndScreen, setShowNamdaemunEndScreen] = useState<boolean>(false);

  const loadNamdaemunRoundData = async (round: number) => {
    const data = await getNamdaemunGameData(round);
    setNamdaemunGameData(data);
  };

  const startNamdaemunGame = () => {
    setNamdaemunScore(0);
    setNamdaemunRound(0);
    setShowNamdaemunEndScreen(false);
    loadNamdaemunRoundData(0);
    setCurrentMiniGame('namdaemun');
  };

  const handleCorrectChoice = (_item: Item) => {
    setNamdaemunScore((prevScore) => prevScore + 1);
    // Sound effect could be triggered here or in NamdaemunMarketScene
    advanceToNextRound();
  };

  const handleIncorrectChoice = (_item: Item, _isTimeout?: boolean) => {
    // Potentially track errors if needed
    // Sound effect
    advanceToNextRound();
  };

  const handleRoundTimeout = () => {
    // Already handled by onIncorrectChoice with isTimeout flag if needed
    // but this callback signifies the timeout specifically.
    // advanceToNextRound(); // This might be redundant if onIncorrectChoice is always called on timeout
  };

  const advanceToNextRound = () => {
    if (namdaemunRound < TOTAL_ROUNDS_NAMDAEMUN - 1) {
      const nextRound = namdaemunRound + 1;
      setNamdaemunRound(nextRound);
      loadNamdaemunRoundData(nextRound);
    } else {
      // Game Over
      setCurrentMiniGame('none');
      setShowNamdaemunEndScreen(true);
      submitNamdaemunResults(namdaemunScore); // Submit final score
    }
  };

  const resetGamePage = () => {
    setCurrentMiniGame('none');
    setShowNamdaemunEndScreen(false);
    // Reset other game page states if any
  }

  if (currentMiniGame === 'namdaemun' && namdaemunGameData) {
    return (
      <NamdaemunMarketScene
        gameData={namdaemunGameData}
        score={namdaemunScore}
        onCorrectChoice={handleCorrectChoice}
        onIncorrectChoice={handleIncorrectChoice}
        roundTimeLimit={ROUND_TIME_LIMIT_SECONDS}
        onRoundTimeout={handleRoundTimeout} // Or directly call advanceToNextRound if that's the only action
      />
    );
  }

  return (
    <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ fontSize: '32px', color: '#333', marginBottom: '30px' }}>Le Festin des Mots Coréens - Game Hub</h1>

      {showNamdaemunEndScreen && (
        <div style={{ margin: '20px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9', maxWidth: '400px' }}>
          <h2 style={{ fontSize: '24px', color: 'green', marginBottom: '10px' }}>Namdaemun Market Terminé !</h2>
          <p style={{ fontSize: '18px' }}>Votre score final : <strong style={{ fontSize: '20px' }}>{namdaemunScore}</strong> / {TOTAL_ROUNDS_NAMDAEMUN}</p>
          <button
            onClick={resetGamePage}
            style={{ padding: '10px 20px', fontSize: '16px', color: 'white', backgroundColor: '#007bff', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '20px' }}
          >
            Retour au Hub
          </button>
        </div>
      )}

      {!showNamdaemunEndScreen && currentMiniGame === 'none' && (
        <div style={{ marginTop: '50px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>Choisissez un Mini-Jeu</h2>
          <button
            onClick={startNamdaemunGame}
            style={{
              padding: '15px 30px',
              fontSize: '18px',
              color: 'white',
              backgroundColor: '#28a745',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              transition: 'background-color 0.2s, transform 0.1s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#218838'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
          >
            Jouer au Marché Namdaemun
          </button>
          {/* Other mini-games could be added here */}
        </div>
      )}

      {/* Placeholder for other game page content if any */}
      {/* Example: A game board could be rendered here, and clicking a "Market" square could call startNamdaemunGame */}
      <div style={{marginTop: '50px', border: '1px dashed #ccc', padding: '20px', borderRadius: '8px'}}>
        <p style={{color: '#777'}}>Zone du Plateau de Jeu (Conceptuel)</p>
        <button
            onClick={startNamdaemunGame}
            disabled={currentMiniGame !== 'none' || showNamdaemunEndScreen}
            style={{ padding: '10px', margin: '5px', backgroundColor: (currentMiniGame !== 'none' || showNamdaemunEndScreen) ? '#ccc' : '#f0ad4e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
            Case "Marché"
        </button>
        {/* Other squares... */}
      </div>
    </div>
  );
};

export default GamePage;

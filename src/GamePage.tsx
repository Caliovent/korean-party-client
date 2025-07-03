import React, { useState, useEffect } from 'react';
import NamdaemunMarketScene from '../NamdaemunMarketScene';
import type { GameRoundData, Item } from './types';
import { getNamdaemunGameData, submitNamdaemunResults } from './gameData';
import { useContent } from './contexts/ContentContext'; // Import useContent

const TOTAL_ROUNDS_NAMDAEMUN = 5; // Example: 5 rounds for the mini-game
const ROUND_TIME_LIMIT_SECONDS = 15; // Example: 15 seconds per round

const GamePage: React.FC = () => {
  const { gameData, isLoading: isContentLoading, error: contentError } = useContent();
  const [currentMiniGame, setCurrentMiniGame] = useState<'none' | 'namdaemun'>('none');
  const [namdaemunGameData, setNamdaemunGameData] = useState<GameRoundData | null>(null);
  const [namdaemunScore, setNamdaemunScore] = useState<number>(0);
  const [namdaemunRound, setNamdaemunRound] = useState<number>(0);
  const [showNamdaemunEndScreen, setShowNamdaemunEndScreen] = useState<boolean>(false);
  const [namdaemunLoadingError, setNamdaemunLoadingError] = useState<string | null>(null);


  const loadNamdaemunRoundData = async (round: number) => {
    if (!gameData?.koreanVocabulary || gameData.koreanVocabulary.length === 0) {
      console.error("Namdaemun: koreanVocabulary non disponible dans le contexte ou vide.");
      setNamdaemunLoadingError("Le vocabulaire coréen n'a pas pu être chargé. Impossible de démarrer le mini-jeu.");
      setCurrentMiniGame('none'); // Arrêter le jeu si les données ne sont pas là
      return;
    }
    setNamdaemunLoadingError(null); // Réinitialiser l'erreur si les données sont là
    // Typage explicite pour koreanVocabulary pour plus de sécurité
    const vocabulary = gameData.koreanVocabulary as Item[];
    const data = await getNamdaemunGameData(vocabulary, round);
    if (data) {
      setNamdaemunGameData(data);
    } else {
      console.error(`Namdaemun: Impossible de générer les données pour le round ${round}.`);
      setNamdaemunLoadingError(`Impossible de préparer le round ${round + 1} du marché Namdaemun.`);
      setCurrentMiniGame('none');
    }
  };

  const startNamdaemunGame = () => {
    if (isContentLoading) {
      setNamdaemunLoadingError("Chargement du contenu du jeu en cours, veuillez patienter...");
      return;
    }
    if (contentError) {
      setNamdaemunLoadingError(`Erreur de chargement du contenu du jeu: ${contentError.message}`);
      return;
    }
    if (!gameData?.koreanVocabulary || gameData.koreanVocabulary.length === 0) {
      setNamdaemunLoadingError("Le vocabulaire pour Namdaemun n'est pas chargé. Réessayez plus tard.");
      console.warn("Tentative de démarrage de Namdaemun sans koreanVocabulary chargé.");
      return;
    }

    setNamdaemunScore(0);
    setNamdaemunRound(0);
    setShowNamdaemunEndScreen(false);
    setNamdaemunLoadingError(null);
    loadNamdaemunRoundData(0); // Les données de vocabulaire sont vérifiées à l'intérieur
    setCurrentMiniGame('namdaemun');
  };

  const handleCorrectChoice = (_item: Item) => {
    setNamdaemunScore((prevScore) => prevScore + 1);
    advanceToNextRound();
  };

  const handleIncorrectChoice = (_item: Item, _isTimeout?: boolean) => {
    advanceToNextRound();
  };

  const handleRoundTimeout = () => {
    // advanceToNextRound(); // Called by onIncorrectChoice if NamdaemunMarketScene handles timeout that way
  };

  const advanceToNextRound = () => {
    if (namdaemunRound < TOTAL_ROUNDS_NAMDAEMUN - 1) {
      const nextRound = namdaemunRound + 1;
      setNamdaemunRound(nextRound);
      loadNamdaemunRoundData(nextRound); // koreanVocabulary is already checked in start or will be re-checked
    } else {
      setCurrentMiniGame('none');
      setShowNamdaemunEndScreen(true);
      submitNamdaemunResults(namdaemunScore);
    }
  };

  const resetGamePage = () => {
    setCurrentMiniGame('none');
    setShowNamdaemunEndScreen(false);
    setNamdaemunLoadingError(null);
  }

  const handleNamdaemunFinish = async (): Promise<void> => {
    setCurrentMiniGame('none');
    setShowNamdaemunEndScreen(true);
    console.log("Namdaemun Market mini-game finished and onFinish called.");
  };

  if (currentMiniGame === 'namdaemun' && namdaemunGameData && !namdaemunLoadingError) {
    return (
      <NamdaemunMarketScene
        gameData={namdaemunGameData}
        score={namdaemunScore}
        onCorrectChoice={handleCorrectChoice}
        onIncorrectChoice={handleIncorrectChoice}
        roundTimeLimit={ROUND_TIME_LIMIT_SECONDS}
        onRoundTimeout={handleRoundTimeout}
        onFinish={handleNamdaemunFinish}
      />
    );
  }

  return (
    <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ fontSize: '32px', color: '#333', marginBottom: '30px' }}>Le Festin des Mots Coréens - Game Hub</h1>

      {namdaemunLoadingError && (
        <div style={{ margin: '20px auto', padding: '20px', border: '1px solid #f5c6cb', borderRadius: '8px', backgroundColor: '#f8d7da', color: '#721c24', maxWidth: '400px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>Erreur Namdaemun</h2>
          <p>{namdaemunLoadingError}</p>
          <button onClick={() => setNamdaemunLoadingError(null)} style={{ padding: '8px 15px', fontSize: '14px', marginTop: '10px'}}>OK</button>
        </div>
      )}

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

      {!showNamdaemunEndScreen && currentMiniGame === 'none' && !namdaemunLoadingError && (
        <div style={{ marginTop: '50px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>Choisissez un Mini-Jeu</h2>
          <button
            onClick={startNamdaemunGame}
            disabled={isContentLoading} // Désactiver si le contenu global est en cours de chargement
            style={{
              padding: '15px 30px',
              fontSize: '18px',
              color: 'white',
              backgroundColor: isContentLoading ? '#ccc' : '#28a745',
              border: 'none',
              borderRadius: '5px',
              cursor: isContentLoading ? 'default' : 'pointer',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              transition: 'background-color 0.2s, transform 0.1s'
            }}
            onMouseOver={(e) => { if (!isContentLoading) e.currentTarget.style.backgroundColor = '#218838'; }}
            onMouseOut={(e) => { if (!isContentLoading) e.currentTarget.style.backgroundColor = '#28a745'; }}
          >
            {isContentLoading ? 'Chargement du savoir...' : 'Jouer au Marché Namdaemun'}
          </button>
          {/* Other mini-games could be added here */}
        </div>
      )}

      <div style={{marginTop: '50px', border: '1px dashed #ccc', padding: '20px', borderRadius: '8px'}}>
        <p style={{color: '#777'}}>Zone du Plateau de Jeu (Conceptuel)</p>
        <button
            onClick={startNamdaemunGame}
            disabled={currentMiniGame !== 'none' || showNamdaemunEndScreen || isContentLoading}
            style={{
              padding: '10px', margin: '5px',
              backgroundColor: (currentMiniGame !== 'none' || showNamdaemunEndScreen || isContentLoading) ? '#ccc' : '#f0ad4e',
              color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'
            }}
        >
            Case "Marché" {isContentLoading ? '(Chargt...)' : ''}
        </button>
      </div>
    </div>
  );
};

export default GamePage;

// src/components/GameControls.tsx

import React, { useState, useEffect } from 'react';
import type { Game } from '../types/game';
import { useAuth } from '../hooks/useAuth';
import { rollDice, resolveTileAction } from '../services/gameService';
import './GameControls.css';

interface GameControlsProps {
  game: Game;
}

const GameControls: React.FC<GameControlsProps> = ({ game }) => {
  // =================================================================
  // ÉTAPE 1 : TOUS LES HOOKS DOIVENT ÊTRE DÉCLARÉS ICI, EN PREMIER.
  // =================================================================
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Cet effet se déclenche à chaque changement de tour,
    // ce qui réinitialise le bouton de chargement.
    setIsLoading(false);
  }, [game.turnState]);


  // =================================================================
  // ÉTAPE 2 : LES CONDITIONS DE SORTIE ANTICIPÉE (GUARDS) SONT PLACÉES APRÈS LES HOOKS.
  // =================================================================
  if (!user) {
    return null;
  }

  const isMyTurn = game.currentPlayerId === user.uid;

  const handleRollDice = async () => {
    if (isLoading || game.turnState !== 'AWAITING_ROLL') return;
    setIsLoading(true);
    await rollDice(game.id);
  };

  const handleResolveTile = async () => {
    if (isLoading || game.turnState !== 'RESOLVING_TILE') return;
    setIsLoading(true);
    await resolveTileAction(game.id);
  };

  if (!isMyTurn) {
    return (
      <div className="game-controls">
        <p>C'est au tour de {game.players.find(p => p.id === game.currentPlayerId)?.name}...</p>
      </div>
    );
  }

  // =================================================================
  // ÉTAPE 3 : LE JSX PRINCIPAL EST RETOURNÉ EN DERNIER.
  // =================================================================
  return (
    <div className="game-controls">
      {game.turnState === 'AWAITING_ROLL' && (
        <button onClick={handleRollDice} disabled={isLoading}>
          {isLoading ? (
            <>
              <span className="loading-spinner"></span> Lancement...
            </>
          ) : (
            'Lancer le dé'
          )}
        </button>
      )}
      {game.turnState === 'RESOLVING_TILE' && (
        <button onClick={handleResolveTile} disabled={isLoading}>
          {isLoading ? (
            <>
              <span className="loading-spinner"></span> Résolution...
            </>
          ) : (
            'Terminer le tour'
          )}
        </button>
      )}
    </div>
  );
};

export default GameControls;
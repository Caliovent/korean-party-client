// src/components/GameControls.tsx

import React, { useState } from 'react';
import type { Game } from '../types/game';
import { useAuth } from '../hooks/useAuth';
import { rollDice } from '../services/gameService';
import './GameControls.css';

interface GameControlsProps {
  game: Game;
}

const GameControls: React.FC<GameControlsProps> = ({ game }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  if (!user) return null;

  const isMyTurn = game.currentPlayerId === user.uid;
  const canRoll = isMyTurn && game.turnState === 'AWAITING_ROLL';

  const handleRollDice = async () => {
    if (!canRoll || isLoading) return;
    setIsLoading(true);
    await rollDice(game.id);
    // Le listener onSnapshot mettra automatiquement à jour l'état,
    // donc nous n'avons pas besoin de gérer la fin du chargement ici.
    // setIsLoading(false) sera géré par le changement de turnState.
  };

  // N'affiche les contrôles que si c'est le tour du joueur
  if (!isMyTurn) {
    return <div className="game-controls"><p>C'est au tour de {game.players.find(p => p.id === game.currentPlayerId)?.name}...</p></div>;
  }

  return (
    <div className="game-controls">
      <button onClick={handleRollDice} disabled={!canRoll || isLoading}>
        {isLoading ? 'Lancement...' : 'Lancer le dé'}
      </button>
      {/* Le bouton "Terminer le tour" sera ajouté ici plus tard */}
    </div>
  );
};

export default GameControls;
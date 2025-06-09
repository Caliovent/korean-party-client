// src/pages/GamePage.tsx (corrigé)

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth'; // Assurez-vous que le hook est importé correctement
import { db } from '../firebaseConfig';
import PhaserGame from '../components/PhaserGame';
import PlayerHUD from '../components/PlayerHUD';
import type { Game, Player } from '../types/game'; // Utiliser "import type"

const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth(); // Ceci va maintenant fonctionner
  const [game, setGame] = useState<Game | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);

  useEffect(() => {
    if (!gameId) return;

    const gameRef = doc(db, 'games', gameId);
    const unsubscribe = onSnapshot(gameRef, (doc) => {
      if (doc.exists()) {
        const gameData = doc.data() as Game;
        setGame(gameData);

        if (user) {
          const playerData = gameData.players.find(p => p.id === user.uid);
          setCurrentPlayer(playerData || null);
        }
      } else {
        console.error("Game not found!");
        setGame(null);
      }
    });

    return () => unsubscribe();
  }, [gameId, user]);

  if (!game || !gameId) { // Ajout de !gameId pour la robustesse
    return <div>Loading Game...</div>;
  }

  // TODO: Implémenter l'écran de victoire
  // if (game.status === 'finished') {
  //   return <div>Game Over! Winner is {game.winnerId}</div>;
  // }

  return (
    <div>
      <h1>{game.name}</h1>
      <p>Turn: {game.currentTurn}</p>
      <PlayerHUD player={currentPlayer} />
      {/* Passer le gameId requis au composant PhaserGame */}
      <PhaserGame gameId={gameId} />
    </div>
  );
};

export default GamePage;
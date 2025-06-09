// src/pages/GamePage.tsx (modifié)

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebaseConfig';
import PhaserGame from '../components/PhaserGame';
import PlayerHUD from '../components/PlayerHUD';
import GameControls from '../components/GameControls';
import type { Game, Player } from '../types/game';
import Spellbook from '../components/spellBook';
import type { SpellId } from '../data/spells'; // Importer le type SpellId


const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
    // AJOUT : Nouvel état pour gérer le sort sélectionné
  const [selectedSpellId, setSelectedSpellId] = useState<SpellId | null>(null);


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

  // AJOUT : Fonction pour gérer la sélection et la déselection d'un sort
  const handleSelectSpell = (spellId: SpellId) => {
    // Si on clique sur le sort déjà sélectionné, on le déselectionne. Sinon, on le sélectionne.
    setSelectedSpellId(prevSelected => prevSelected === spellId ? null : spellId);
  };
  if (!game || !gameId) {
    return <div>Loading Game...</div>;
  }

  const isMyTurn = user ? game.currentPlayerId === user.uid : false;

  return (
    <div>
      <PlayerHUD player={currentPlayer} />
      
      {isMyTurn && game.turnState === 'AWAITING_ROLL' && currentPlayer &&
        <Spellbook
          player={currentPlayer}
          selectedSpellId={selectedSpellId}
          onSelectSpell={handleSelectSpell}
        />
      }

      <PhaserGame game={game} />
      <GameControls game={game} />
    </div>
  );
};

export default GamePage;
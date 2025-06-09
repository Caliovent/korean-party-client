// src/pages/GamePage.tsx (modifié)

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebaseConfig';
import { castSpell } from '../services/gameService'; // Importer castSpell
import PhaserGame from '../components/PhaserGame';
import PlayerHUD from '../components/PlayerHUD';
import GameControls from '../components/GameControls';
import type { Game, Player } from '../types/game';
import Spellbook from '../components/spellBook';
import type { SpellId } from '../data/spells'; // Importer le type SpellId
import VictoryScreen from '../components/VictoryScreen'; // Importer l'écran de victoire


const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [selectedSpellId, setSelectedSpellId] = useState<SpellId | null>(null);
  // AJOUT : Nouvel état pour la cible
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);


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

  const handleSelectSpell = (spellId: SpellId) => {
    setSelectedSpellId(prev => (prev === spellId ? null : spellId));
    setSelectedTargetId(null); // Réinitialiser la cible si on change de sort
  };

  // AJOUT : Handler appelé par Phaser quand une cible est cliquée
  const handleTargetSelected = (targetId: string) => {
    console.log(`[React] Target selected from Phaser: ${targetId}`);
    setSelectedTargetId(targetId);
  };

    // AJOUT : useEffect qui déclenche le lancement du sort
  useEffect(() => {
    // Si nous avons toutes les infos nécessaires...
    if (game && selectedSpellId && selectedTargetId) {
      console.log(`[React] Casting spell ${selectedSpellId} on ${selectedTargetId} for game ${game.id}`);
      // On lance le sort !
      castSpell(game.id, selectedSpellId, selectedTargetId);
      
      // On réinitialise l'état pour terminer l'action
      setSelectedSpellId(null);
      setSelectedTargetId(null);
    }
  }, [selectedTargetId, selectedSpellId, game]); // Déclenché quand la cible est choisie


  if (!game || !gameId) {
    return <div>Loading Game...</div>;
  }

  // AJOUT : Vérifier si la partie est terminée
  if (game.status === 'finished') {
    const winner = game.players.find(p => p.id === game.winnerId);
    const winnerName = winner ? winner.name : 'Un sorcier mystérieux';
    
    return <VictoryScreen winnerName={winnerName} />;
  }

  const isMyTurn = user ? game.currentPlayerId === user.uid : false;


  // Le rendu normal du jeu si la partie n'est pas terminée
  return (
    <div>
      <PlayerHUD player={currentPlayer} />
      {isMyTurn && game.turnState === 'AWAITING_ROLL' && currentPlayer && (
        <Spellbook
          player={currentPlayer}
          selectedSpellId={selectedSpellId}
          onSelectSpell={handleSelectSpell}
        />
      )}
      <PhaserGame
        game={game}
        selectedSpellId={selectedSpellId}
        onTargetSelected={handleTargetSelected}
      />
      <GameControls game={game} />
    </div>
  );
};

export default GamePage;
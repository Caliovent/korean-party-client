// src/pages/WaitingRoomPage.tsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useAuth } from "../hooks/useAuth";
import { startGame } from "../services/gameService";
import type { Game, Player } from "../types/game";
import "./WaitingRoomPage.css";

const WaitingRoomPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!gameId) return;
    const gameRef = doc(db, "games", gameId);
    const unsubscribe = onSnapshot(gameRef, (doc) => {
      if (doc.exists()) {
        setGame({ id: doc.id, ...doc.data() } as Game);
      } else {
        console.error("Game not found, redirecting to lobby.");
        navigate("/lobby");
      }
    });
    return () => unsubscribe();
  }, [gameId, navigate]);

  useEffect(() => {
    // Redirection automatique quand le statut du jeu passe à 'playing'
    if (game?.status === "playing") {
      console.log("Game is starting! Navigating to game page...");
      navigate(`/game/${game.id}`);
    }
  }, [game, navigate]);

  const handleStartGame = async () => {
    if (!gameId || isLoading) return;
    setIsLoading(true);
    await startGame(gameId);
    setIsLoading(false); // Le useEffect ci-dessus s'occupera de la redirection
  };

  if (!game) {
    return <div>Chargement de la salle d'attente...</div>;
  }

  const isHost = user?.uid === game.hostId;

  return (
    <div className="waiting-room-container">
      <h2>Salle d'attente pour : {game.name}</h2>
      <p>Invitez vos amis avec l'ID de la partie : {game.id}</p>
      <div className="players-list">
        <h3>Joueurs présents ({game.players.length})</h3>
        <ul>
          {game.players.map((player: Player) => (
            <li key={player.uid}>
              {player.displayName} {player.uid === game.hostId && "(Hôte)"}
            </li>
          ))}
        </ul>
      </div>
      {isHost && (
        <button
          onClick={handleStartGame}
          disabled={isLoading || game.players.length < 1}
        >
          {isLoading
            ? "Lancement..."
            : `Démarrer la partie (${game.players.length} joueur(s))`}
        </button>
      )}
      {!isHost && <p>En attente que l'hôte lance la partie...</p>}
    </div>
  );
};

export default WaitingRoomPage;

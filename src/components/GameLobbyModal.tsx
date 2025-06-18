// src/components/GameLobbyModal.tsx
import React, { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore"; // Removed addDoc
import { db, functions } from "../firebaseConfig";
import { httpsCallable } from "firebase/functions";
import { useNavigate } from "react-router-dom";
import { createGame } from "../services/gameService"; // Added import
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import "./GameLobbyModal.css"; // Import the CSS

interface Game {
  id: string;
  name: string;
  hostId: string;
  hostPseudo: string;
  players: string[]; // Assuming players are stored by UID
  status: "waiting" | "in-progress" | "finished";
}

interface GameLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: (gameId: string) => void;
}

const GameLobbyModal: React.FC<GameLobbyModalProps> = ({ isOpen, onDelete, onClose }) => {
  const { t } = useTranslation();
  const { user } = useAuth(); // Make sure useAuth provides the user object with uid and displayName
  const [games, setGames] = useState<Game[]>([]);
  const [newGameName, setNewGameName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return; // Don't fetch games if modal is closed

    const q = collection(db, "games");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const gamesData = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Game)
      );
      setGames(gamesData);
    });

    return () => unsubscribe(); // Cleanup listener when modal closes or component unmounts
  }, [isOpen]); // Rerun effect if isOpen changes

  const handleCreateGame = async () => {
    if (newGameName.trim() === "" || !user) return;

    // Check if the user is already hosting a game
    const existingGamesQuery = query(
      collection(db, "games"),
      where("hostId", "==", user.uid)
    );
    const existingGamesSnapshot = await getDocs(existingGamesQuery);
    if (!existingGamesSnapshot.empty) {
      alert(t("lobby.already_hosting_error"));
      return;
    }

    // gameData is now created within the cloud function
    // const gameData = {
    //   name: newGameName,
    //   hostId: user.uid,
    //   hostPseudo: user.displayName || 'Anonymous Mage',
    //   players: [user.uid],
    //   status: 'waiting',
    //   createdAt: serverTimestamp(),
    // };

    try {
      // Call the createGame cloud function
      const result = await createGame(newGameName);
      console.log("Game creation result:", result);

      // Ensure result and result.data are defined and gameId is present
      if (result && result.data && (result.data as { gameId: string }).gameId) {
        const gameId = (result.data as { gameId: string }).gameId;
        setNewGameName("");
        onClose(); // Close modal after creating game
        navigate(`/game/${gameId}`);
      } else {
        // Handle cases where gameId is not in the result
        console.error(
          "Error creating game: Invalid result from createGame function",
          result
        );
        alert(
          t("lobby.create_game_error_invalid_result") ||
            "Error creating game: Could not retrieve game ID."
        ); // Provide a more specific error or fallback
      }
    } catch (error) {
      console.error("Error creating game:", error);
      // It's good practice to check the error type if possible, or log more details
      // For example, if (error instanceof FunctionsError && error.code === 'already-exists') { ... }
      alert(t("lobby.create_game_error"));
    }
  };

  const handleJoinGame = (gameId: string) => {
    // Logic for joining a game (e.g., updating Firestore) would typically be here or in a service
    // For now, it directly navigates. This might need adjustment based on gameService.tsx
    onClose(); // Close modal before navigating
    navigate(`/game/${gameId}`);
  };

  const deleteGameCallable = httpsCallable(functions, "deleteGame");

  const handleDeleteGame = async (gameId: string) => {
    if (!gameId) {
      console.error("Tentative de suppression sans gameId.");
      return;
    }
    try {
      console.log(`Requesting deletion for game: ${gameId}`);
      // On appelle la Cloud Function avec l'ID de la partie
      const result = await deleteGameCallable({ gameId });
      console.log("Game deleted successfully:", result.data);
      onDelete(gameId); // Pour mettre à jour l'UI localement
    } catch (error) {
      // L'erreur que vous verrez sera maintenant plus explicite si la logique serveur la refuse
      console.error("Error deleting game:", error);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{t("lobby.title")}</h2>
          <button onClick={onClose} className="modal-close-button">
            &times;
          </button>
        </div>
        <div className="modal-body">
          <div>
            <input
              type="text"
              value={newGameName}
              onChange={(e) => setNewGameName(e.target.value)}
              placeholder={t("lobby.game_name_label")}
            />
            <button onClick={handleCreateGame}>
              {t("lobby.create_game_button")}
            </button>
          </div>
          <ul>
            {games.length > 0 ? (
              games.map((game) => (
                <li key={game.id}>
                  <span>
                    {game.name} ({t("lobby.host_label")}: {game.hostPseudo}) -{" "}
                    {game.players.length}{" "}
                    {t("lobby.players_label", { count: game.players.length })}
                  </span>
                  <div>
                    <button onClick={() => handleJoinGame(game.id)}>
                      {t("lobby.join_button")}
                    </button>
                    {user && game.hostId === user.uid && (
                      <button
                        onClick={() => handleDeleteGame(game.id, game.hostId)}
                        style={{ backgroundColor: "#dc3545" }}
                      >
                        {t("lobby.delete_button")}
                      </button>
                    )}
                  </div>
                </li>
              ))
            ) : (
              <p>{t("lobby.no_games")}</p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GameLobbyModal;

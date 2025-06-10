// src/components/GameLobbyModal.tsx
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, serverTimestamp, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import './GameLobbyModal.css'; // Import the CSS

interface Game {
  id: string;
  name: string;
  hostId: string;
  hostPseudo: string;
  players: string[]; // Assuming players are stored by UID
  status: 'waiting' | 'in-progress' | 'finished';
}

interface GameLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GameLobbyModal: React.FC<GameLobbyModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { user } = useAuth(); // Make sure useAuth provides the user object with uid and displayName
  const [games, setGames] = useState<Game[]>([]);
  const [newGameName, setNewGameName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return; // Don't fetch games if modal is closed

    const q = collection(db, 'games');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const gamesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Game));
      setGames(gamesData);
    });

    return () => unsubscribe(); // Cleanup listener when modal closes or component unmounts
  }, [isOpen]); // Rerun effect if isOpen changes

  const handleCreateGame = async () => {
    if (newGameName.trim() === '' || !user) return;

    // Check if the user is already hosting a game
    const existingGamesQuery = query(collection(db, 'games'), where('hostId', '==', user.uid));
    const existingGamesSnapshot = await getDocs(existingGamesQuery);
    if (!existingGamesSnapshot.empty) {
      alert(t('lobby.already_hosting_error')); // Use translation
      return;
    }

    const gameData = {
      name: newGameName,
      hostId: user.uid,
      hostPseudo: user.displayName || 'Anonymous Mage', // Ensure user.displayName is available
      players: [user.uid], // Start with the host as a player
      status: 'waiting',
      createdAt: serverTimestamp(),
    };

    try {
      const docRef = await addDoc(collection(db, 'games'), gameData);
      setNewGameName('');
      onClose(); // Close modal after creating game
      navigate(`/game/${docRef.id}`);
    } catch (error) {
      console.error("Error creating game:", error);
      alert(t('lobby.create_game_error')); // Use translation
    }
  };

  const handleJoinGame = (gameId: string) => {
    // Logic for joining a game (e.g., updating Firestore) would typically be here or in a service
    // For now, it directly navigates. This might need adjustment based on gameService.tsx
    onClose(); // Close modal before navigating
    navigate(`/game/${gameId}`);
  };

  const handleDeleteGame = async (gameId: string, hostId: string) => {
    if (user && user.uid === hostId) {
      try {
        await deleteDoc(doc(db, "games", gameId));
      } catch (error) {
        console.error("Error deleting game:", error);
        alert(t('lobby.delete_game_error')); // Use translation
      }
    } else {
      alert(t('lobby.delete_permission_error')); // Use translation
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{t('lobby.title')}</h2>
          <button onClick={onClose} className="modal-close-button">&times;</button>
        </div>
        <div className="modal-body">
          <div>
            <input
              type="text"
              value={newGameName}
              onChange={(e) => setNewGameName(e.target.value)}
              placeholder={t('lobby.game_name_label')}
            />
            <button onClick={handleCreateGame}>{t('lobby.create_game_button')}</button>
          </div>
          <ul>
            {games.length > 0 ? games.map((game) => (
              <li key={game.id}>
                <span>
                  {game.name} ({t('lobby.host_label')}: {game.hostPseudo}) - {game.players.length} {t('lobby.players_label', { count: game.players.length })}
                </span>
                <div>
                  <button onClick={() => handleJoinGame(game.id)}>{t('lobby.join_button')}</button>
                  {user && game.hostId === user.uid && (
                    <button onClick={() => handleDeleteGame(game.id, game.hostId)} style={{backgroundColor: '#dc3545'}}>
                      {t('lobby.delete_button')}
                    </button>
                  )}
                </div>
              </li>
            )) : <p>{t('lobby.no_games')}</p>}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GameLobbyModal;

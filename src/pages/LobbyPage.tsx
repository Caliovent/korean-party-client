// src/pages/LobbyPage.tsx

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, serverTimestamp, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';

interface Game {
  id: string;
  name: string;
  hostId: string;
  hostPseudo: string;
  players: string[];
  status: 'waiting' | 'in-progress' | 'finished';
}

const LobbyPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [newGameName, setNewGameName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const q = collection(db, 'games');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const gamesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Game));
      setGames(gamesData);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateGame = async () => {
    if (newGameName.trim() === '' || !user) return;

    // Vérifier si l'utilisateur est déjà l'hôte d'une partie
    const existingGamesQuery = query(collection(db, 'games'), where('hostId', '==', user.uid));
    const existingGamesSnapshot = await getDocs(existingGamesQuery);
    if (!existingGamesSnapshot.empty) {
      alert("You are already hosting a game. Please close it before creating a new one.");
      return;
    }
    
    const newGame = {
      name: newGameName,
      hostId: user.uid,
      hostPseudo: user.displayName || 'Anonymous Mage',
      players: [user.uid],
      status: 'waiting',
      createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'games'), newGame);
    setNewGameName('');
    navigate(`/game/${docRef.id}`);
  };

  const handleJoinGame = (gameId: string) => {
    // La logique pour rejoindre une partie sera gérée par une Cloud Function
    // Pour l'instant, on navigue simplement vers la salle de jeu
    navigate(`/game/${gameId}`);
  };

  const handleDeleteGame = async (gameId: string) => {
    await deleteDoc(doc(db, "games", gameId));
  };


  return (
    <div>
      <h2>{t('lobby.title')}</h2>
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
            {game.name} (Hôte: {game.hostPseudo}) - {game.players.length} joueur(s)
            <button onClick={() => handleJoinGame(game.id)}>{t('lobby.join_button')}</button>
            {user && game.hostId === user.uid && (
              <button onClick={() => handleDeleteGame(game.id)}>Supprimer</button>
            )}
          </li>
        )) : <p>{t('lobby.no_games')}</p>}
      </ul>
    </div>
  );
};

export default LobbyPage;
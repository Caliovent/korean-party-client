// src/pages/LobbyPage.tsx (entièrement refactorisé)

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
// MODIFICATION : On importe nos fonctions de service
import { createGame, joinGame, leaveGame } from '../services/gameService';

interface Game {
  id: string;
  name: string;
  hostId: string;
  hostPseudo: string;
  players: unknown[]; // La structure exacte des joueurs est gérée par le serveur
  status: 'waiting' | 'in-progress' | 'finished';
}

const LobbyPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [newGameName, setNewGameName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, 'games'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const gamesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Game));
      setGames(gamesData);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateGame = async () => {
    if (!newGameName.trim() || !user || isLoading) return;
    setIsLoading(true);

    console.log('Appel de la Cloud Function "createGame"...');
    const result: any = await createGame(newGameName);
    
    if (result && result.data.gameId) {
      const newGameId = result.data.gameId;
      console.log(`Partie créée avec succès. ID: ${newGameId}. Navigation...`);
      setNewGameName('');
      navigate(`/game/${newGameId}`);
    } else {
      // Gérer le cas où la fonction échoue (erreur loggée dans le service)
      alert("Erreur: Impossible de créer la partie.");
    }
    setIsLoading(false);
  };

  const handleJoinGame = async (gameId: string) => {
    if (isLoading) return;
    setIsLoading(true);
    await joinGame(gameId);
    navigate(`/game/${gameId}`);
    // setIsLoading(false); // La navigation change la page, donc pas forcément nécessaire
  };

  const handleDeleteGame = async (gameId: string) => {
    if (isLoading) return;
    setIsLoading(true);
    // On quitte la partie, la logique serveur la supprimera si l'hôte part
    await leaveGame(gameId);
    setIsLoading(false);
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
          disabled={isLoading}
        />
        <button onClick={handleCreateGame} disabled={isLoading || !newGameName.trim()}>
          {isLoading ? 'Création...' : t('lobby.create_game_button')}
        </button>
      </div>
      <ul>
        {games.length > 0 ? games.map((game) => (
          <li key={game.id}>
            {game.name} (Hôte: {game.hostPseudo}) - {game.players.length} joueur(s)
            <button onClick={() => handleJoinGame(game.id)} disabled={isLoading}>{t('lobby.join_button')}</button>
            {user && game.hostId === user.uid && (
              <button onClick={() => handleDeleteGame(game.id)} disabled={isLoading}>Supprimer</button>
            )}
          </li>
        )) : <p>{t('lobby.no_games')}</p>}
      </ul>
    </div>
  );
};

export default LobbyPage;
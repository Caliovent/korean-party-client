// src/pages/LobbyPage.tsx (corrigé)

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { createGame, joinGame, leaveGame } from '../services/gameService';


interface Game {
  id: string;
  name: string;
  hostId: string;
  hostdisplayName: string;
  players: unknown[];
  status: 'waiting' | 'in-progress' | 'finished';
}

const LobbyPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [newGameName, setNewGameName] = useState('');
  // ÉTAPE 1 : Renommer 'isLoading' en 'isActionLoading' pour la clarté
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  // ÉTAPE 2 : AJOUTER un état pour le chargement de la liste
  const [isListLoading, setIsListLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    setIsListLoading(true); // On commence le chargement
    const q = query(collection(db, 'games'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const gamesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Game));
      setGames(gamesData);
      setIsListLoading(false); // On a reçu les données (du cache ou du serveur), on arrête de charger
    }, (error) => {
      // Gérer les erreurs d'écoute
      console.error("Erreur de l'écouteur Firestore:", error);
      setIsListLoading(false);
    });

    return () => unsubscribe();
  }, []); // L'array vide est correct ici, car on veut que l'écouteur persiste

  const handleCreateGame = async () => {
    if (!newGameName.trim() || !user || isActionLoading) return;
    setIsActionLoading(true);

    try {
        const result: any = await createGame(newGameName);
        if (result && result.data.gameId) {
            const newGameId = result.data.gameId;
            setNewGameName('');
            navigate(`/waiting-room/${newGameId}`);
        } else {
            alert("Erreur: Impossible de créer la partie.");
        }
    } catch (error) {
        console.error("Erreur lors de la création de la partie", error);
        alert("Erreur lors de la création de la partie.");
    } finally {
        setIsActionLoading(false);
    }
  };

  const handleJoinGame = async (gameId: string) => {
    if (isActionLoading) return;
    setIsActionLoading(true);
    try {
        await joinGame(gameId);
        navigate(`/waiting-room/${gameId}`);
    } catch (error) {
        console.error("Erreur pour rejoindre la partie", error);
        alert("Impossible de rejoindre la partie.");
    } finally {
        setIsActionLoading(false);
    }
  };
  
  const handleDeleteGame = async (gameId: string) => {
    if (isActionLoading) return;
    setIsActionLoading(true);
    await leaveGame(gameId);
    setIsActionLoading(false);
  };

// ÉTAPE 3 : Utiliser 'isListLoading' pour afficher un message
  const renderGameList = () => {
    if (isListLoading) {
        return <p>Chargement des parchemins de partie...</p>;
    }
    if (games.length === 0) {
        return <p>{t('lobby.no_games')}</p>;
    }
    return (
        <ul>
            {games.map((game) => (
              <li key={game.id}>
                {game.name} (Hôte: {game.hostdisplayName || 'N/A'}) - {game.players.length} joueur(s)
                <button onClick={() => handleJoinGame(game.id)} disabled={isActionLoading}>
                    {t('lobby.join_button')}
                </button>
                {user && game.hostId === user.uid && (
                  <button onClick={() => handleDeleteGame(game.id)} disabled={isActionLoading}>Supprimer</button>
                )}
              </li>
            ))}
        </ul>
    );
  }

  return (
    <div>
      <h2>{t('lobby.title')}</h2>
      <div>
        <input
          type="text"
          value={newGameName}
          onChange={(e) => setNewGameName(e.target.value)}
          placeholder={t('lobby.game_name_label')}
          disabled={isActionLoading}
        />
        <button onClick={handleCreateGame} disabled={isActionLoading || !newGameName.trim()}>
          {isActionLoading ? 'Création...' : t('lobby.create_game_button')}
        </button>
      </div>
      {renderGameList()}
    </div>
  );
};

export default LobbyPage;
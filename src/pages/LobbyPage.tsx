import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from "firebase/functions";
import { db, auth } from '../firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface Game {
  id: string;
  hostId: string;
  hostPseudo: string;
  players: string[];
  status: string;
}

const LobbyPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<{ type: string, id: string | null }>({ type: '', id: null });
  const [error, setError] = useState<string | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    setLoading(true);
    const gamesQuery = query(collection(db, "games"), where("status", "==", "waiting"));
    const unsubscribe = onSnapshot(gamesQuery, (querySnapshot) => {
      const availableGames = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Game));
      setGames(availableGames);
      setLoading(false);
    }, (err) => {
      console.error("Erreur d'écoute des parties:", err);
      setError(t('fetchGamesError', 'Impossible de charger les parties.'));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [t]);

  const userIsAlreadyHost = useMemo(() => {
    return games.some(game => game.hostId === currentUserId);
  }, [games, currentUserId]);

  const handleCreateGame = async () => {
    setActionInProgress({ type: 'create', id: null });
    setError(null);
    try {
      const functions = getFunctions();
      const createGame = httpsCallable(functions, 'createGame');
      const result = await createGame();
      const gameId = (result.data as { gameId: string }).gameId;
      navigate(`/game/${gameId}`);
    } catch (err: any) {
      setError(err.message || t('createGameError', 'Impossible de créer la partie.'));
    } finally {
      setActionInProgress({ type: '', id: null });
    }
  };

  const handleJoinGame = async (gameId: string) => {
    setActionInProgress({ type: 'join', id: gameId });
    setError(null);
    try {
      const functions = getFunctions();
      const joinGame = httpsCallable(functions, 'joinGame');
      await joinGame({ gameId: gameId });
      navigate(`/game/${gameId}`);
    } catch (err: any) {
      setError(err.message || t('joinGameError', 'Impossible de rejoindre la partie.'));
    } finally {
      setActionInProgress({ type: '', id: null });
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    setActionInProgress({ type: 'delete', id: gameId });
    setError(null);
    try {
      const functions = getFunctions();
      const deleteGame = httpsCallable(functions, 'deleteGame');
      await deleteGame({ gameId });
    } catch (err: any) {
      setError(err.message || t('deleteGameError', 'Impossible de supprimer la partie.'));
    } finally {
      setActionInProgress({ type: '', id: null });
    }
  };

  const handleReturnToGame = (gameId: string) => {
    navigate(`/game/${gameId}`);
  };

  return (
    <div className="lobby-container">
      <h2>{t('lobbyTitle', 'Salon des Parties')}</h2>
      <div className="lobby-actions">
        <button 
          onClick={handleCreateGame} 
          disabled={loading || userIsAlreadyHost || !!actionInProgress.type}
          title={userIsAlreadyHost ? t('alreadyHostingError', 'Vous avez déjà une partie en attente.') : ''}
        >
          {actionInProgress.type === 'create' ? t('creatingGame', 'Création...') : t('createGame', 'Créer une nouvelle partie')}
        </button>
      </div>
      {error && <p className="error-message">{error}</p>}
      
      <div className="game-list">
        <h3>{t('availableGames', 'Parties disponibles')}</h3>
        {loading && <p>{t('loading', 'Chargement...')}</p>}
        {!loading && games.length === 0 && <p>{t('noGamesAvailable', 'Aucune partie disponible pour le moment.')}</p>}
        <ul>
          {games.map(game => {
            const isHost = game.hostId === currentUserId;
            const isPlayer = game.players.includes(currentUserId || '');
            const isFull = game.players.length >= 4;
            const isActingOnThisGame = actionInProgress.id === game.id;
            
            return (
              <li key={game.id} className="game-item">
                <span>{t('gameHostedBy', `Partie de ${game.hostPseudo}`)}</span>
                <span>{game.players.length} / 4 joueurs</span>
                <div className="game-item-actions">
                  {isHost ? (
                    <>
                      <button onClick={() => handleReturnToGame(game.id)} disabled={!!actionInProgress.type}>
                        {t('goToGame', 'Accéder')}
                      </button>
                      <button onClick={() => handleDeleteGame(game.id)} className="delete-button" disabled={!!actionInProgress.type}>
                        {isActingOnThisGame && actionInProgress.type === 'delete' ? t('deleting', 'Suppression...') : t('deleteGame', 'Supprimer')}
                      </button>
                    </>
                  ) : isPlayer ? (
                    <button onClick={() => handleReturnToGame(game.id)} disabled={!!actionInProgress.type}>
                      {t('returnToGame', 'Retourner')}
                    </button>
                  ) : (
                    <button onClick={() => handleJoinGame(game.id)} disabled={isFull || !!actionInProgress.type}>
                      {isActingOnThisGame && actionInProgress.type === 'join' ? t('joining', 'Rejoignant...') : t('joinGame', 'Rejoindre')}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default LobbyPage;

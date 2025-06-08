import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db, auth } from '../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from "firebase/functions";
import PhaserGame from '../components/PhaserGame';

// --- Interfaces ---
interface PlayerDetails { pseudo: string; }
interface MiniGame { type: string; question: string; options: string[]; playerId: string; correctAnswer: string; }
interface GameEvent { type: string; title: string; message: string; playerId: string; }
interface LastDiceRoll { playerId: string; value: number; }
interface QuestStep { description: string; objective: string; completed: boolean; }
interface Quest { questId: string; title: string; currentStep: number; steps: QuestStep[]; }
interface Game {
  id: string; 
  hostId: string;
  hostPseudo?: string;
  players: string[]; 
  playerDetails: Record<string, PlayerDetails>;
  status: 'waiting' | 'in-progress' | 'finished'; 
  turnOrder: string[]; 
  currentPlayerId: string;
  playerPositions: Record<string, number>; 
  currentMiniGame?: MiniGame | null; 
  currentEvent?: GameEvent | null; 
  lastDiceRoll?: LastDiceRoll;
  boardLayout: { type: string }[];
  playerQuests: Record<string, Quest>;
}
interface UserProfile { pseudo: string; level: number; manaCurrent: number; manaMax: number; }


// --- Sous-composants d'UI ---
const PlayerHUD: React.FC<{ profile: UserProfile | null }> = ({ profile }) => {
    if (!profile) return <div className="player-hud"><span>Chargement...</span></div>;
    const manaPercentage = (profile.manaCurrent / profile.manaMax) * 100;
    return (
        <div className="player-hud">
            <div className="hud-item"><strong>Pseudo:</strong> {profile.pseudo}</div>
            <div className="hud-item"><strong>Niveau:</strong> {profile.level}</div>
            <div className="hud-item mana-bar-container">
                <strong>Mana:</strong>
                <div className="mana-bar">
                    <div className="mana-bar-fill" style={{ width: `${manaPercentage}%` }}></div>
                    <span>{profile.manaCurrent} / {profile.manaMax}</span>
                </div>
            </div>
        </div>
    );
};
const WaitingRoom: React.FC<{ game: Game; onStartGame: () => void; }> = ({ game, onStartGame }) => {
    const { t } = useTranslation();
    const isHost = game.hostId === auth.currentUser?.uid;
    const canStart = game.players.length >= 1; // On peut démarrer seul pour tester
    return (
        <>
            <h2>{t('gameRoomTitle', 'Salle d\'attente')}</h2>
            <p>{t('gameHostedBy', `Partie de ${game.hostPseudo}`)}</p>
            <div className="player-list">
                <h3>{t('players', 'Joueurs')} ({game.players.length} / 4)</h3>
                <ul>
                    {game.players.map(playerId => (
                        <li key={playerId} className="game-item">
                            <span>{game.playerDetails?.[playerId]?.pseudo || `Joueur...`}</span>
                        </li>
                    ))}
                </ul>
            </div>
            {isHost && (
                <div className="game-actions">
                    <button onClick={onStartGame} disabled={!canStart} title={!canStart ? t('needMorePlayers', 'En attente d\'autres joueurs...') : ''}>
                        {t('startGame', 'Lancer la partie')}
                    </button>
                </div>
            )}
            {!isHost && <p>{t('waitingForHost', 'En attente que l\'hôte lance la partie...')}</p>}
        </>
    );
};

const EventUI: React.FC<{ game: Game; }> = ({ game }) => {
  const { t } = useTranslation();
  const [isResolving, setIsResolving] = useState(false);
  if (!game.currentEvent) return null;

  const handleAcknowledge = async () => {
    setIsResolving(true);
    const functions = getFunctions();
    const resolveEvent = httpsCallable(functions, 'resolveEvent');
    try { await resolveEvent({ gameId: game.id }); } 
    catch (error) { console.error("Erreur de résolution de l'événement:", error); } 
    finally { setIsResolving(false); }
  };
  
  return (
    <div className="minigame-container">
      <h3>{game.currentEvent.title}</h3>
      <p>{game.currentEvent.message}</p>
      <button onClick={handleAcknowledge} disabled={isResolving}>
        {isResolving ? t('loading', 'Chargement...') : t('continue', 'Continuer')}
      </button>
    </div>
  );
};

const MiniGameUI: React.FC<{ game: Game; }> = ({ game }) => {
  const [submittingAnswer, setSubmittingAnswer] = useState<string | null>(null);
  if (!game.currentMiniGame) return null;

  const handleSubmit = async (answer: string) => {
    setSubmittingAnswer(answer);
    const functions = getFunctions();
    const submitResult = httpsCallable(functions, 'submitMiniGameResults');
    try { await submitResult({ gameId: game.id, answer }); } 
    catch (error) { console.error("Erreur de soumission:", error); } 
    finally { setSubmittingAnswer(null); }
  };

  return (
    <div className="minigame-container">
      <h4>{game.currentMiniGame.question}</h4>
      <div className="quiz-options">
        {game.currentMiniGame.options.map((option, index) => (
          <button key={index} onClick={() => handleSubmit(option)} disabled={!!submittingAnswer}>
            {submittingAnswer === option ? '...' : option}
          </button>
        ))}
      </div>
    </div>
  );
};

const QuestTracker: React.FC<{ quest: Quest | null }> = ({ quest }) => {
  const { t } = useTranslation();
  if (!quest) return null;

  const allStepsCompleted = quest.currentStep >= quest.steps.length;

  return (
    <div className={`quest-tracker ${allStepsCompleted ? 'completed' : ''}`}>
      <h4>{quest.title}</h4>
      {allStepsCompleted ? (
        <p>{t('questCompleted', 'Quête terminée !')}</p>
      ) : (
        <ul className="quest-steps-list">
          {quest.steps.map((step: QuestStep, index: number) => (
            <li key={index} className={step.completed ? 'completed' : ''}>
              {step.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const GameBoard: React.FC<{ game: Game }> = ({ game }) => {
  const { t } = useTranslation();
  const [isRolling, setIsRolling] = useState(false);
  const currentUserId = auth.currentUser?.uid;
  const isMyTurn = game.currentPlayerId === currentUserId;
  const myActiveEvent = isMyTurn && game.currentEvent;
  const myActiveMiniGame = isMyTurn && game.currentMiniGame;

  const handleTakeTurn = async () => {
    setIsRolling(true);
    try {
      const functions = getFunctions();
      const takeTurn = httpsCallable(functions, 'takeTurn');
      await takeTurn({ gameId: game.id });
    } catch (error) {
      console.error("Erreur lors du tour:", error);
    } finally {
      setIsRolling(false);
    }
  };

  return (
    <div className="game-board-layout">
      <div className="game-status-bar">
        <span>Tour de : <strong>{game.playerDetails[game.currentPlayerId]?.pseudo || '...'}</strong></span>
        {game.lastDiceRoll && (
          <span>Dernier lancer : {game.playerDetails[game.lastDiceRoll.playerId]?.pseudo} a fait un {game.lastDiceRoll.value} !</span>
        )}
      </div>
      
      <div className="phaser-game-container">
        {/* LA CORRECTION EST ICI : on passe bien game.id à PhaserGame */}
        <PhaserGame gameId={game.id} />
      </div>
      
      <div className="game-controls">
        {isMyTurn && !myActiveMiniGame && !myActiveEvent && (
          <button onClick={handleTakeTurn} disabled={isRolling}>
            {isRolling ? t('rolling', 'Lancement...') : t('rollDice', 'Lancer le dé')}
          </button>
        )}
        {myActiveMiniGame && <MiniGameUI game={game} />}
        {myActiveEvent && <EventUI game={game} />}
      </div>
    </div>
  );
};


// --- Composant Principal GamePage ---
const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [playerProfile, setPlayerProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    if (!gameId) {
      console.error("Aucun ID de partie trouvé dans l'URL, redirection vers le lobby.");
      navigate('/lobby');
      return;
    }
    const gameRef = doc(db, "games", gameId);
    const unsubscribe = onSnapshot(gameRef, (doc) => {
      if (doc.exists()) {
        setGame({ id: doc.id, ...doc.data() } as Game);
      } else {
        setError("Partie non trouvée. Elle a peut-être été supprimée.");
        navigate('/lobby');
      }
      setLoading(false);
    }, (err) => {
      console.error("Erreur d'écoute de la partie:", err);
      setError("Erreur de connexion à la partie.");
      setLoading(false);
    });
    return () => unsubscribe();
  }, [gameId, navigate]);
  
  useEffect(() => {
    if (!currentUserId) return;
    const profileRef = doc(db, "users", currentUserId);
    const unsubscribe = onSnapshot(profileRef, (doc) => {
      if (doc.exists()) {
        setPlayerProfile(doc.data() as UserProfile);
      }
    });
    return () => unsubscribe();
  }, [currentUserId]);

  const handleStartGame = async () => {
    if (!gameId) return;
    const functions = getFunctions();
    const startGame = httpsCallable(functions, 'startGame');
    try { await startGame({ gameId }); }
    catch(err) { console.error("Erreur lors du démarrage de la partie:", err); }
  };
  
  const activeQuest = game && currentUserId ? game.playerQuests?.[currentUserId] : null;

  if (loading) return <p>Chargement de la partie...</p>;
  if (error) return <p className="error-message">{error}</p>;
  if (!game) return <p>Partie non trouvée. Redirection...</p>;

  return (
    <div className="game-page-layout">
      <div className="left-panel">
        <PlayerHUD profile={playerProfile} />
        <QuestTracker quest={activeQuest} />
      </div>
      <div className="main-panel">
        {game.status === 'waiting' && <WaitingRoom game={game} onStartGame={handleStartGame} />}
        {game.status === 'in-progress' && <GameBoard game={game} />}
        {game.status === 'finished' && <h2>Partie terminée !</h2>}
      </div>
    </div>
  );
};

export default GamePage;
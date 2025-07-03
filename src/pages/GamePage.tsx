// src/pages/GamePage.tsx (modifié)

import React, { useEffect, useState, useRef } from 'react'; // +useRef
import { useParams, useNavigate } from 'react-router-dom'; // +useNavigate
import { CSSTransition } from 'react-transition-group'; // Import CSSTransition
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebaseConfig';
import { castSpell, finishMiniGame, prepareChallenge } from '../services/gameService'; // Importer castSpell, finishMiniGame, and prepareChallenge
import soundService from '../services/soundService'; // Import soundService
import { SPELL_DEFINITIONS, type SpellId } from '../data/spells'; // Importer le type SpellId, SpellType removed
import PhaserGame from '../components/PhaserGame';
import PlayerHUD from '../components/PlayerHUD';
import GameControls from '../components/GameControls';
import type { Game, Player, MiniGameId } from '../types/game'; // Added MiniGameId
import Spellbook from "../components/Spellbook";
// import type { SpellId } from '../data/spells'; // Importer le type SpellId - Already imported above
import VictoryScreen from '../components/VictoryScreen'; // Importer l'écran de victoire
import EventCardModal from '../components/EventCardModal'; // Import the modal
import OpponentTurnIndicator from '../components/OpponentTurnIndicator'; // Import OpponentTurnIndicator
import FocusModeButton from '../components/FocusModeButton'; // Import FocusModeButton

// Mini-game scene components
import FoodFeastScene from '../../FoodFeastScene';
import DokkaebiSaysScene from '../../DokkaebiSaysScene';
import LostPoemScene from '../../LostPoemScene';
import NamdaemunMarketScene from '../../NamdaemunMarketScene';
// import HangeulTyphoonScene from '../../HangeulTyphoonScene'; // Corrected path, assuming it's top-level like others

const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate(); // +useNavigate
  const [game, setGame] = useState<Game | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [selectedSpellId, setSelectedSpellId] = useState<SpellId | null>(null);
  const [isCastingSpell, setIsCastingSpell] = useState<boolean>(false); // Added for spell casting loading state
  // AJOUT : Nouvel état pour la cible
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const gameNotFoundTimerRef = useRef<NodeJS.Timeout | null>(null); // For delayed redirect
  const [currentEvent, setCurrentEvent] = useState<Game['lastEventCard'] | null>(null);
  const eventTimerRef = useRef<NodeJS.Timeout | null>(null);
  const playerControlsRef = useRef<HTMLDivElement>(null); // Ref for player controls (Spellbook and GameControls)
  const opponentIndicatorRef = useRef<HTMLDivElement>(null); // Ref for OpponentTurnIndicator
  const [isFocusMode, setIsFocusMode] = useState(false); // State for Focus Mode

  // Effect for game background music
  useEffect(() => {
    soundService.stopSound('music_hub'); // Stop hub music if it was playing
    soundService.playSound('music_game');
    // console.log("GamePage mounted, playing music_game.");

    return () => {
      soundService.stopSound('music_game');
      // console.log("GamePage unmounted, stopping music_game.");
      // Consider stopping other looping game-specific sounds here if any are added later
    };
  }, []); // Empty dependency array for mount/unmount logic

  useEffect(() => {
    if (!gameId) return;

    const gameRef = doc(db, 'games', gameId);
    const unsubscribe = onSnapshot(gameRef, (doc) => {
      if (doc.exists()) {
        const gameData = doc.data() as Game;
        setGame({ id: doc.id, ...doc.data() } as Game);

        if (user) {
          const playerData = gameData.players.find(p => p.uid === user.uid);
          setCurrentPlayer(playerData || null);
        }
      } else {
        console.error("Game not found!");
        setGame(null);
        // If game is not found, redirect to hub after a small delay
        // This prevents redirecting if game is just loading or if user quickly navigates away
        if (gameNotFoundTimerRef.current) clearTimeout(gameNotFoundTimerRef.current);
        gameNotFoundTimerRef.current = setTimeout(() => {
          navigate('/hub', { replace: true });
        }, 3000); // 3 second delay
      }
    });

    return () => {
      unsubscribe();
      if (gameNotFoundTimerRef.current) clearTimeout(gameNotFoundTimerRef.current); // Clear timer on unmount
    };
  }, [gameId, user, navigate]); // +navigate

  useEffect(() => {
    if (game?.lastEventCard) {
      // Check if it's genuinely a new card or different from the currently displayed one.
      // This comparison avoids re-setting the state and re-triggering sound/timer if the parent `game` object reference changes
      // but the actual `lastEventCard` data remains identical to what's already being shown.
      if (!currentEvent ||
          currentEvent.titleKey !== game.lastEventCard.titleKey ||
          currentEvent.descriptionKey !== game.lastEventCard.descriptionKey ||
          currentEvent.GfxUrl !== game.lastEventCard.GfxUrl) {

        setCurrentEvent(game.lastEventCard);
        soundService.playSound('action_event_card');

        if (eventTimerRef.current) {
          clearTimeout(eventTimerRef.current);
        }
        eventTimerRef.current = setTimeout(() => {
          setCurrentEvent(null);
        }, 7000); // 7 seconds
      }
    } else {
      // lastEventCard is null in Firestore, so ensure modal is hidden.
      if (currentEvent !== null) { // Only update if it's not already null
        setCurrentEvent(null);
        if (eventTimerRef.current) {
          clearTimeout(eventTimerRef.current);
        }
      }
    }

    // Cleanup timer on component unmount or if game/lastEventCard changes before timeout
    return () => {
      if (eventTimerRef.current) {
        clearTimeout(eventTimerRef.current);
      }
    };
  }, [game?.lastEventCard, currentEvent]); // currentEvent is needed because it's used in the condition

  // Effect to prepare challenge when mini-game is starting
  useEffect(() => {
    if (game && game.status === 'MINI_GAME_STARTING' && game.currentMiniGame && gameId && !game.currentChallengeData) {
      // Check if a challenge preparation is already underway (e.g., by a local state flag) to prevent multiple calls.
      // For now, we rely on `!game.currentChallengeData` but a dedicated state like `isPreparingChallenge` might be more robust.
      console.log(`[GamePage] Status is MINI_GAME_STARTING for ${game.currentMiniGame}. Preparing challenge.`);
      const payload = {
        gameId: gameId,
        miniGameType: game.currentMiniGame,
        difficulty: 'medium', // Placeholder difficulty
      };
      prepareChallenge(payload)
        .then(() => {
          console.log(`[GamePage] Challenge preparation requested for ${game.currentMiniGame}. Waiting for data...`);
          // The game document update via onSnapshot will handle the next steps.
        })
        .catch(error => {
          console.error(`[GamePage] Error preparing challenge for ${game.currentMiniGame}:`, error);
          // TODO: Handle error state in UI, e.g., show error message, allow retry, or transition game state.
        });
    }
  }, [game, gameId]); // Dependencies: game object and gameId

  const handleCloseEventModal = () => {
    soundService.playSound('ui_modal_close');
    setCurrentEvent(null);
    if (eventTimerRef.current) {
      clearTimeout(eventTimerRef.current); // Also clear timer if manually closed
    }
  };

  const handleSelectSpell = (spellId: SpellId) => {
    soundService.playSound('ui_click'); // Play click sound for spell selection
    const spellDefinition = SPELL_DEFINITIONS.find(s => s.id === spellId);
    if (!spellDefinition) {
      console.error(`Spell definition for ${spellId} not found!`);
      return;
    }

    if (selectedSpellId === spellId) {
      setSelectedSpellId(null);
      setSelectedTargetId(null);
      return;
    }

    // Handle self-cast spells immediately
    if (spellDefinition.type === "SELF") {
      if (game && user && !isCastingSpell) {
        console.log(`[React] Casting self-spell ${spellId} for game ${game.id}`);
        soundService.playSound('action_spell_cast_generic'); // Sound for casting
        setIsCastingSpell(true);
        castSpell(game.id, spellId, user.uid)
          .catch((error) => console.error(`Error casting self-spell ${spellId}:`, error))
          .finally(() => {
            setIsCastingSpell(false);
            setSelectedSpellId(null);
          });
      } else if (isCastingSpell) {
        console.log("Already casting a spell.");
      } else {
        console.error("Game or user not available for self-cast spell.");
      }
    } else {
      // For spells requiring a target, just select it. Sound will play when target is confirmed.
      setSelectedSpellId(spellId);
      setSelectedTargetId(null);
    }
  };

  // AJOUT : Handler appelé par Phaser quand une cible est cliquée
  const handleTargetSelected = (targetId: string) => {
    console.log(`[React] Target selected from Phaser: ${targetId}`);
    setSelectedTargetId(targetId);
  };

    // AJOUT : useEffect qui déclenche le lancement du sort
  useEffect(() => {
    // Si nous avons toutes les infos nécessaires...
    if (game && selectedSpellId && selectedTargetId && user) {
      const spellDefinition = SPELL_DEFINITIONS.find(s => s.id === selectedSpellId);
      // Ensure it's not a SELF spell trying to cast via target selection.
      if (spellDefinition && spellDefinition.type !== "SELF" && !isCastingSpell) {
        console.log(`[React] Casting targeted spell ${selectedSpellId} on ${selectedTargetId} for game ${game.id}`);
        soundService.playSound('action_spell_cast_generic'); // Sound for casting
        setIsCastingSpell(true);
        castSpell(game.id, selectedSpellId, selectedTargetId)
          .catch((error) => console.error(`Error casting spell ${selectedSpellId} on ${selectedTargetId}:`, error))
          .finally(() => {
            setIsCastingSpell(false);
            setSelectedSpellId(null);
            setSelectedTargetId(null);
          });
      } else if (isCastingSpell) {
        // This case might occur if state updates batch oddly, or if user somehow double-triggers.
        // Or if a self-cast spell was initiated while a targeted one was also trying to resolve.
        console.log("Already casting another spell or target selection occurred while casting.");
      }
    }
  }, [selectedTargetId, selectedSpellId, game, user, isCastingSpell]); // Added isCastingSpell to dependencies


  if (!game || !gameId) {
    return <div>Loading Game...</div>;
  }

  // AJOUT : Vérifier si la partie est terminée
  if (game.status === 'finished') {
    const winner = game.players.find(p => p.uid === game.winnerId);
    const winnerName = winner ? winner.displayName : 'Un sorcier mystérieux';
    
    return <VictoryScreen winnerName={winnerName} />;
  }

  const isMyTurn = user ? game.currentPlayerId === user.uid : false;
  const activePlayer = game.players.find(p => p.uid === game.currentPlayerId);
  const activePlayerName = activePlayer ? activePlayer.displayName : 'Adversaire inconnu';

  const handleMiniGameFinish = async (score?: number, totalQuestions?: number) => {
    if (!gameId) {
      console.error("No gameId available to finish mini-game.");
      return;
    }
    try {
      console.log(`[GamePage] Mini-game finished for game ${gameId}. Score: ${score}/${totalQuestions}. Calling backend...`);
      // The backend's `finishMiniGame` function will determine if it uses the score.
      // Currently, our `finishMiniGame` service only sends gameId.
      // If the backend needs the score, the `finishMiniGame` cloud function and service call would need an update.
      await finishMiniGame(gameId);
      // The backend will update the game state, and onSnapshot will refresh the UI.
    } catch (error) {
      console.error("Error finishing mini-game:", error);
      // Potentially show a toast to the user
    }
  };

  const renderMiniGame = () => {
    if (!game || !gameId) {
      return null;
    }

    // Display loading message if challenge data is not yet available
    if (game.status === 'MINI_GAME_STARTING' && !game.currentChallengeData) {
      return (
        <div style={{ textAlign: 'center', padding: '50px', fontSize: '1.5em' }}>
          <p>Le Maître des Runes prépare votre épreuve...</p>
          {/* TODO: Add a more visually appealing loading spinner/animation here */}
        </div>
      );
    }

    // Only render the mini-game if data is present and status is appropriate
    if (game.status !== 'MINI_GAME_STARTING' || !game.currentMiniGame || !game.currentChallengeData) {
      return null;
    }

    const isSpectator = user ? user.uid !== game.currentPlayerId : true; // Default to spectator if user is undefined for safety

    switch (game.currentMiniGame) {
      case 'FOOD_FEAST':
        if (!game.currentChallengeData || typeof game.currentChallengeData !== 'object' || !('questions' in game.currentChallengeData)) {
            console.error("FoodFeastScene: currentChallengeData is missing or not in the expected format.", game.currentChallengeData);
            return <div>Erreur: Données du défi pour FoodFeastScene sont invalides.</div>;
        }
        return (
          <FoodFeastScene
            challengeData={game.currentChallengeData as any}
            onFinish={handleMiniGameFinish}
            isSpectator={isSpectator}
            game={game}
          />
        );
      case 'DOKKAEBI_SAYS':
        if (!game.currentChallengeData) {
            console.error("DokkaebiSaysScene: currentChallengeData is missing.");
            return <div>Erreur: Données du défi pour DokkaebiSaysScene sont manquantes.</div>;
        }
        return (
          <DokkaebiSaysScene
            gameId={gameId} // Keep gameId if still needed by scene internally, though game object is preferred
            onFinish={handleMiniGameFinish}
            challengeData={game.currentChallengeData as any}
            isSpectator={isSpectator}
            game={game}
          />
        );
      case 'LOST_POEM':
        // LostPoemScene might not need specific challengeData if it fetches its own,
        // but it will need isSpectator and game for spectator mode.
        // Assuming onFinish signature is compatible or can be adapted.
        // The onFinish for LostPoemScene was onFinish: () => Promise<void>;
        // We are passing handleMiniGameFinish which is (score?: number, totalQuestions?: number) => Promise<void>
        // This should be compatible if LostPoemScene calls it without arguments or with undefined.
        return (
          <LostPoemScene
            onFinish={handleMiniGameFinish}
            isSpectator={isSpectator}
            game={game}
          />
        );
      case 'NAMDAEMUN_MARKET':
        // NamdaemunMarketScene requires specific props like gameData (for the round), score etc.
        // These would need to be part of game.currentChallengeData or passed differently.
        // For now, this is a placeholder assuming currentChallengeData contains what Namdaemun needs for its 'gameData' prop.
        // This part needs careful review based on NamdaemunMarketScene's actual data structure needs.
        if (!game.currentChallengeData || typeof game.currentChallengeData !== 'object') {
            console.error("NamdaemunMarketScene: currentChallengeData is missing or not in the expected object format.", game.currentChallengeData);
            return <div>Erreur: Données du défi pour NamdaemunMarketScene sont invalides.</div>;
        }
        // The NamdaemunMarketSceneProps expects: gameData, score, onCorrectChoice, onIncorrectChoice, roundTimeLimit, onRoundTimeout.
        // We need to ensure these are correctly mapped or provided.
        // For spectator mode, `score` should reflect active player's score.
        // `onCorrectChoice` and `onIncorrectChoice` are for the active player. Spectators don't trigger these.
        // The dummy data previously used will be replaced by actual challenge data.
        // It's crucial that `game.currentChallengeData` for NAMDAEMUN_MARKET contains the structure
        // that NamdaemunMarketScene expects for its `gameData` prop (customerRequest, choices, roundNumber etc.)
        // And also `roundTimeLimit`. The `score` prop will be from the main `game` state for the active player.

        // Placeholder for Namdaemun's specific props from currentChallengeData
        // This assumes currentChallengeData for Namdaemun is an object containing these fields.
        const namdaemunChallengeData = game.currentChallengeData as any; // Cast for now
        const activePlayerForNamdaemun = game.players.find(p => p.uid === game.currentPlayerId);

        return (
          <NamdaemunMarketScene
            onFinish={handleMiniGameFinish} // This is for when the entire mini-game sequence finishes
            gameData={namdaemunChallengeData.roundData} // Assuming roundData is part of currentChallengeData
            score={activePlayerForNamdaemun?.mana || 0} // Example: using mana as score, or get from specific game state
            // onCorrectChoice, onIncorrectChoice, onRoundTimeout are more complex:
            // These are callbacks that the active player's scene instance uses to report round outcomes.
            // GamePage needs to provide implementations that update game state via backend.
            // For simplicity in this step, passing console logs or basic handlers.
            // These should ideally trigger backend updates for round progression.
            onCorrectChoice={(item) => console.log(`[GamePage] Namdaemun Correct: ${item.name}`)}
            onIncorrectChoice={(item, timeout) => console.log(`[GamePage] Namdaemun Incorrect: ${item.name}, Timeout: ${timeout}`)}
            onRoundTimeout={() => console.log("[GamePage] Namdaemun Round Timeout")}
            roundTimeLimit={namdaemunChallengeData.timeLimit || 60} // Assuming timeLimit in challengeData
            isSpectator={isSpectator}
            game={game}
          />
        );
      // case 'HANGEUL_TYPHOON':
      //   return <HangeulTyphoonScene gameId={gameId} onFinish={handleMiniGameFinish} isSpectator={isSpectator} game={game} />;
      default:
        console.error("Unknown mini-game:", game.currentMiniGame);
        return <div>Error: Unknown Mini-Game ({game.currentMiniGame})</div>;
    }
  };

  // Le rendu normal du jeu si la partie n'est pas terminée
  return (
    <div>
      <FocusModeButton isFocus={isFocusMode} onClick={() => setIsFocusMode(!isFocusMode)} />

      {/* Persistent UI elements like HUD, Event Modals, etc. */}
      {!isFocusMode && (
        <>
          <EventCardModal eventCard={currentEvent} onClose={handleCloseEventModal} />
          {/* PlayerHUD might need context if mini-games also need to show some player info,
              or it's only relevant to the main board game state.
              Task states "HUD ... restent visibles". So it stays outside the main game/minigame switch.
          */}
          <PlayerHUD player={currentPlayer} />

          {/* Conditional rendering for elements specific to main game turn */}
          {game && game.status !== 'MINI_GAME_STARTING' && (
            <>
              <CSSTransition
                nodeRef={playerControlsRef}
                in={isMyTurn && game.turnState === 'AWAITING_ROLL' && !!currentPlayer}
                timeout={300}
                classNames="player-controls-transition"
                unmountOnExit
              >
                <div ref={playerControlsRef}> {/* Wrapper div for the ref */}
                  {isMyTurn && game.turnState === 'AWAITING_ROLL' && currentPlayer && (
                    <>
                      <Spellbook
                        player={currentPlayer}
                        selectedSpellId={selectedSpellId}
                        onSelectSpell={handleSelectSpell}
                        isCastingSpell={isCastingSpell}
                        castingSpellId={selectedSpellId} // Pass selectedSpellId as castingSpellId
                        isTargetingMode={selectedSpellId !== null && SPELL_DEFINITIONS.find(s => s.id === selectedSpellId)?.type !== "SELF"}
                      />
                      <GameControls game={game} />
                    </>
                  )}
                </div>
              </CSSTransition>
              <CSSTransition
                nodeRef={opponentIndicatorRef}
                in={!isMyTurn && game.status === 'playing'}
                timeout={300}
                classNames="opponent-indicator-transition"
                unmountOnExit
              >
                <div ref={opponentIndicatorRef}> {/* Wrapper div for the ref */}
                  {!isMyTurn && game.status === 'playing' && (
                    <OpponentTurnIndicator playerName={activePlayerName} />
                  )}
                </div>
              </CSSTransition>
            </>
          )}
        </>
      )}

      {/* Main content: either Mini-Game or PhaserGame (Main Board) */}
      {game && game.status === 'MINI_GAME_STARTING' ? (
        renderMiniGame()
      ) : (
        <PhaserGame
          game={game}
          selectedSpellId={selectedSpellId}
          onTargetSelected={handleTargetSelected}
        />
      )}
    </div>
  );
};

export default GamePage;
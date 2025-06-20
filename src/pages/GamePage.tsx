// src/pages/GamePage.tsx (modifié)

import React, { useEffect, useState, useRef } from 'react'; // +useRef
import { useParams, useNavigate } from 'react-router-dom'; // +useNavigate
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebaseConfig';
import { castSpell } from '../services/gameService'; // Importer castSpell
import soundService from '../services/soundService'; // Import soundService
import { SPELL_DEFINITIONS, SpellType, type SpellId } from '../data/spells'; // Importer le type SpellId
import PhaserGame from '../components/PhaserGame';
import PlayerHUD from '../components/PlayerHUD';
import GameControls from '../components/GameControls';
import type { Game, Player } from '../types/game';
import Spellbook from "../components/Spellbook";
// import type { SpellId } from '../data/spells'; // Importer le type SpellId - Already imported above
import VictoryScreen from '../components/VictoryScreen'; // Importer l'écran de victoire
import EventCardModal from '../components/EventCardModal'; // Import the modal


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
          const playerData = gameData.players.find(p => p.id === user.uid);
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
    if (game?.lastEventCard && game.lastEventCard !== currentEvent) { // Play sound only when a new event card appears
      setCurrentEvent(game.lastEventCard);
      soundService.playSound('action_event_card'); // Sound for new event card
      // Clear any existing timer
      if (eventTimerRef.current) {
        clearTimeout(eventTimerRef.current);
      }
      // Set a new timer
      eventTimerRef.current = setTimeout(() => {
        setCurrentEvent(null); // Hide modal after timeout
      }, 7000); // 7 seconds
    } else {
      // If lastEventCard becomes null from Firestore (e.g., another event replaced it or backend cleared it)
      setCurrentEvent(null);
      if (eventTimerRef.current) {
        clearTimeout(eventTimerRef.current);
      }
    }

    // Cleanup timer on component unmount or if game/lastEventCard changes before timeout
    return () => {
      if (eventTimerRef.current) {
        clearTimeout(eventTimerRef.current);
      }
    };
  }, [game?.lastEventCard]); // Effect runs when game.lastEventCard changes

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
    if (spellDefinition.type === SpellType.SELF) {
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
      if (spellDefinition && spellDefinition.type !== SpellType.SELF && !isCastingSpell) {
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
    const winner = game.players.find(p => p.id === game.winnerId);
    const winnerName = winner ? winner.name : 'Un sorcier mystérieux';
    
    return <VictoryScreen winnerName={winnerName} />;
  }

  const isMyTurn = user ? game.currentPlayerId === user.uid : false;


  // Le rendu normal du jeu si la partie n'est pas terminée
  return (
    <div>
      <EventCardModal eventCard={currentEvent} onClose={handleCloseEventModal} />
      <PlayerHUD player={currentPlayer} />
      {isMyTurn && game.turnState === 'AWAITING_ROLL' && currentPlayer && (
        <Spellbook
          player={currentPlayer}
          selectedSpellId={selectedSpellId}
          onSelectSpell={handleSelectSpell}
          isCastingSpell={isCastingSpell}
          castingSpellId={selectedSpellId} // Pass selectedSpellId as castingSpellId
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
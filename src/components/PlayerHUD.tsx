// src/components/PlayerHUD.tsx (corrigé)

import React, { useState, useEffect, useRef } from 'react';
import type { Player } from '../types/game'; // Utiliser "import type"
import './PlayerHUD.css';

interface FloatingText {
  id: number;
  text: string;
  type: 'gain' | 'loss';
  top: number; // For stacking multiple texts
}

interface PlayerHUDProps {
  player: Player | null;
}

const PlayerHUD: React.FC<PlayerHUDProps> = ({ player }) => {
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const prevManaRef = useRef<number | undefined>(undefined);
  // textTopPosition is used to cycle through a few vertical slots for new texts
  // to prevent them from perfectly overlapping if mana changes rapidly.
  const [textTopPositionKey, setTextTopPositionKey] = useState(0);

  useEffect(() => {
    // Initialize prevManaRef on first render or when player object itself changes (e.g. new game)
    if (player) {
      prevManaRef.current = player.mana;
      // Reset top position key for a new player or if player becomes null then valid again
      setTextTopPositionKey(0);
    } else {
      prevManaRef.current = undefined;
    }
  }, [player]); // Watch the whole player object for this initialization logic

  useEffect(() => {
    if (player && prevManaRef.current !== undefined && player.mana !== prevManaRef.current) {
      const diff = player.mana - prevManaRef.current;
      if (diff !== 0) {
        const newText: FloatingText = {
          id: Date.now(), // Simple unique ID
          text: `${diff > 0 ? '+' : ''}${diff}`,
          type: diff > 0 ? 'gain' : 'loss',
          // Cycle through 3 vertical slots (0px, 20px, 40px offset from the base 'top' in CSS)
          top: (textTopPositionKey % 3) * 20,
        };
        setFloatingTexts(currentTexts => [...currentTexts, newText]);
        setTextTopPositionKey(prevKey => prevKey + 1);

        // Remove the text after animation (e.g., 2 seconds)
        setTimeout(() => {
          setFloatingTexts(currentTexts => currentTexts.filter(ft => ft.id !== newText.id));
        }, 2000);
      }
    }
    // Update prevManaRef after processing potential changes
    if (player) {
      prevManaRef.current = player.mana;
    }
  }, [player?.mana]); // Rerun effect if player.mana changes (player itself is for initialization)


  if (!player) {
    return null;
  }

  return (
    <div className="player-hud">
      {/* Added Player Name and Guild Tag Display */}
      <div className="hud-item hud-player-info">
        <h3>Joueur</h3>
        <p>
          {player.displayName} {player.guildTag && `[${player.guildTag}]`}
        </p>
      </div>
      <div className="hud-item hud-mana"> {/* Added hud-item class for consistency if needed */}
        <h3>Mana</h3>
        <div className="mana-display-container"> {/* Wrapper for positioning floating texts */}
          <p>{player.mana}</p>
          {floatingTexts.map(ft => (
            <span
              key={ft.id}
              className={`floating-text ${ft.type}`}
              style={{ top: `-${ft.top}px` }} // Position above the mana value, adjusted by 'top'
            >
              {ft.text}
            </span>
          ))}
        </div>
      </div>
      <div className="hud-item hud-grimoires"> {/* Added hud-item class */}
        <h3>Grimoires</h3>
        {player.grimoires && player.grimoires.length > 0 ? (
          <ul>
            {player.grimoires.map(grimoire => (
              <li key={grimoire.id}>
                {grimoire.name}: {grimoire.progress} / {grimoire.target}
              </li>
            ))}
          </ul>
        ) : (
          <p>No grimoires</p> /* Handle empty grimoires array */
        )}
      </div>
      {/* Add other HUD elements like fragments if they exist in Player type */}
    </div>
  );
};

export default PlayerHUD;
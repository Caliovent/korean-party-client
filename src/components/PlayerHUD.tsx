// src/components/PlayerHUD.tsx (corrigé)

import React from 'react';
import type { Player } from '../types/game'; // Utiliser "import type"
import './PlayerHUD.css';

interface PlayerHUDProps {
  player: Player | null;
}

const PlayerHUD: React.FC<PlayerHUDProps> = ({ player }) => {
  if (!player) {
    return null;
  }

  return (
    <div className="player-hud">
      <div className="hud-mana">
        <h3>Mana</h3>
        <p>{player.mana}</p>
      </div>
      <div className="hud-grimoires">
        <h3>Grimoires</h3>
        <ul>
          {player.grimoires.map(grimoire => (
            <li key={grimoire.id}>
              {grimoire.name}: {grimoire.progress} / {grimoire.target}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default PlayerHUD;
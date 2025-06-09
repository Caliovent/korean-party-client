// src/components/Spellbook.tsx

import React from 'react';
import { SPELL_DEFINITIONS } from '../data/spells';
import type { Player } from '../types/game';
import './Spellbook.css';

interface SpellbookProps {
  player: Player;
  // TODO: Ajouter les fonctions pour la sélection et le ciblage plus tard
}

const Spellbook: React.FC<SpellbookProps> = ({ player }) => {
  return (
    <div className="spellbook-container">
      <h4>Grimoire de Sorts</h4>
      <ul className="spell-list">
        {SPELL_DEFINITIONS.map(spell => {
          const canCast = player.mana >= spell.manaCost;
          return (
            <li key={spell.id} className={`spell-item ${!canCast ? 'disabled' : ''}`}>
              <div className="spell-header">
                <span className="spell-name">{spell.name}</span>
                <span className="spell-cost">{spell.manaCost} Mana</span>
              </div>
              <p className="spell-description">{spell.description}</p>
              <button disabled={!canCast}>
                Lancer
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Spellbook;
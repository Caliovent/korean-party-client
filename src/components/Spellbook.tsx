// src/components/Spellbook.tsx (modifié)

import React from 'react';
import { useTranslation } from 'react-i18next'; // Importer le hook
import { SPELL_DEFINITIONS } from '../data/spells';
import type { Player } from '../types/game';
import './Spellbook.css';

interface SpellbookProps {
  player: Player;
}

const Spellbook: React.FC<SpellbookProps> = ({ player }) => {
  // Utiliser le hook pour obtenir la fonction de traduction 't'
  const { t } = useTranslation();

  return (
    <div className="spellbook-container">
      {/* On peut aussi traduire le titre */}
      <h4>{t('spellbook.title', 'Grimoire de Sorts')}</h4>
      <ul className="spell-list">
        {SPELL_DEFINITIONS.map(spell => {
          const canCast = player.mana >= spell.manaCost;
          return (
            <li key={spell.id} className={`spell-item ${!canCast ? 'disabled' : ''}`}>
              <div className="spell-header">
                {/* On utilise t() avec les clés */}
                <span className="spell-name">{t(spell.nameKey)}</span>
                <span className="spell-cost">{spell.manaCost} Mana</span>
              </div>
              <p className="spell-description">{t(spell.descriptionKey)}</p>
              <button disabled={!canCast}>
                {t('spellbook.cast_button', 'Lancer')}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Spellbook;
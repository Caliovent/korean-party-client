// src/components/Spellbook.tsx (modifié)

import React from 'react';
import { useTranslation } from 'react-i18next'; // Importer le hook
import { SPELL_DEFINITIONS, type SpellId } from '../data/spells';
import type { Player } from '../types/game';
import './Spellbook.css';

interface SpellbookProps {
  player: Player;
  selectedSpellId: SpellId | null; // La prop pour savoir quel sort est sélectionné
  onSelectSpell: (spellId: SpellId) => void; // La fonction à appeler au clic
}

const Spellbook: React.FC<SpellbookProps> = ({ player, selectedSpellId, onSelectSpell }) => {
  const { t } = useTranslation();

  return (
    <div className="spellbook-container">
      <h4>{t('spellbook.title', 'Grimoire de Sorts')}</h4>
      <ul className="spell-list">
        {SPELL_DEFINITIONS.map(spell => {
          const canCast = player.mana >= spell.manaCost;
          const isSelected = selectedSpellId === spell.id;

          return (
            // Appliquer la classe 'selected' si le sort est sélectionné
            <li key={spell.id} className={`spell-item ${!canCast ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`}>
              <div className="spell-header">
                <span className="spell-name">{t(spell.nameKey)}</span>
                <span className="spell-cost">{spell.manaCost} Mana</span>
              </div>
              <p className="spell-description">{t(spell.descriptionKey)}</p>
              <button
                disabled={!canCast && !isSelected} // On peut toujours annuler
                onClick={() => onSelectSpell(spell.id)}
              >
                {/* Changer le texte du bouton si le sort est sélectionné */}
                {isSelected ? t('spellbook.cancel_button', 'Annuler') : t('spellbook.cast_button', 'Lancer')}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Spellbook;
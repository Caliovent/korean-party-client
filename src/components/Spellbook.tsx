// src/components/Spellbook.tsx (modifié)

import React from 'react';
import { useTranslation } from 'react-i18next'; // Importer le hook
import { SPELL_DEFINITIONS, type SpellId } from '../data/spells';
import type { Player } from '../types/game';
import './Spellbook.css';

interface SpellbookProps {
  player: Player;
  selectedSpellId: SpellId | null;
  onSelectSpell: (spellId: SpellId) => void;
  isCastingSpell?: boolean;
  castingSpellId?: SpellId | null;
}

const Spellbook: React.FC<SpellbookProps> = (props) => {
  const { player, selectedSpellId, onSelectSpell, isCastingSpell, castingSpellId } = props;
  const { t } = useTranslation();

  return (
    <div className="spellbook-container">
      <h4>{t('spellbook.title', 'Grimoire de Sorts')}</h4>
      <ul className="spell-list">
        {SPELL_DEFINITIONS.map(spell => {
          const canCast = player.mana >= spell.manaCost;
          const isSelected = selectedSpellId === spell.id;
          const isThisSpellCasting = isCastingSpell && castingSpellId === spell.id;
          const isAnySpellCasting = !!isCastingSpell; // True if any spell is being cast

          let buttonText;
          if (isThisSpellCasting) {
            buttonText = (
              <>
                <span className="loading-spinner"></span> {t('spellbook.casting_button', 'Incantation...')}
              </>
            );
          } else if (isSelected) {
            buttonText = t('spellbook.cancel_button', 'Annuler');
          } else {
            buttonText = t('spellbook.cast_button', 'Lancer');
          }

          return (
            <li key={spell.id} className={`spell-item ${(!canCast && !isSelected) || isAnySpellCasting ? 'disabled' : ''} ${isSelected && !isThisSpellCasting ? 'selected' : ''} ${isThisSpellCasting ? 'casting' : ''}`}>
              <div className="spell-header">
                <span className="spell-name">{t(spell.nameKey)}</span>
                <span className="spell-cost">{spell.manaCost} Mana</span>
              </div>
              <p className="spell-description">{t(spell.descriptionKey)}</p>
              <button
                disabled={isAnySpellCasting || (!canCast && !isSelected)}
                onClick={() => onSelectSpell(spell.id)}
              >
                {buttonText}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Spellbook;
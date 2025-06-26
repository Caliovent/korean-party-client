// src/components/Spellbook.tsx (modifié)

import React from 'react';
import { useTranslation } from 'react-i18next';
import { SPELL_DEFINITIONS, type SpellId } from '../data/spells'; // SpellType removed
import type { Player } from '../types/game';
import './Spellbook.css';

interface SpellbookProps {
  player: Player;
  selectedSpellId: SpellId | null;
  onSelectSpell: (spellId: SpellId) => void;
  isCastingSpell?: boolean;
  castingSpellId?: SpellId | null;
  // Add a prop to indicate if game is in targeting mode for the selected spell
  isTargetingMode?: boolean;
}

const getEffectCategoryIcon = (category?: 'DEFENSIVE' | 'CHAOS' | 'TRAP' | 'OFFENSIVE' | 'UTILITY'): string => {
  if (!category) return '';
  switch (category) {
    case 'DEFENSIVE': return '🛡️'; // Shield icon
    case 'CHAOS': return '✨';     // Sparkles icon
    case 'TRAP': return '📍';      // Pin icon
    case 'OFFENSIVE': return '⚔️';  // Crossed swords icon
    case 'UTILITY': return '🛠️';   // Hammer and wrench icon
    default: return '';
  }
};

const Spellbook: React.FC<SpellbookProps> = (props) => {
  const { player, selectedSpellId, onSelectSpell, isCastingSpell, castingSpellId, isTargetingMode } = props;
  const { t } = useTranslation();

  return (
    <div className="spellbook-container">
      <h4>{t('spellbook.title', 'Grimoire de Sorts')}</h4>
      {isTargetingMode && selectedSpellId && (
        <p className="targeting-info">
          {t('spellbook.targeting_mode_active', 'Mode Ciblage Actif pour:')} {t(SPELL_DEFINITIONS.find(s => s.id === selectedSpellId)?.nameKey || '')}
        </p>
      )}
      <ul className="spell-list">
        {SPELL_DEFINITIONS.map(spell => {
          const canCast = player.mana >= spell.manaCost;
          const isSelected = selectedSpellId === spell.id;
          const isThisSpellCasting = isCastingSpell && castingSpellId === spell.id;
          const isAnySpellCasting = !!isCastingSpell;

          let buttonTextKey = 'spellbook.cast_button';
          if (isThisSpellCasting) {
            buttonTextKey = 'spellbook.casting_button';
          } else if (isSelected) {
            // If selected and targeting mode is active for this spell, show "Targeting..."
            // Otherwise, show "Cancel"
            const spellDefinition = SPELL_DEFINITIONS.find(s => s.id === spell.id);
            if (spellDefinition && spellDefinition.type !== "SELF" && isTargetingMode) {
              buttonTextKey = 'spellbook.targeting_button'; // New key: "Ciblage..."
            } else {
              buttonTextKey = 'spellbook.cancel_button';
            }
          }

          const buttonContent = isThisSpellCasting ? (
            <>
              <span className="loading-spinner"></span> {t(buttonTextKey, 'Incantation...')}
            </>
          ) : t(buttonTextKey, 'Lancer');

          const categoryIcon = getEffectCategoryIcon(spell.effectCategory);

          return (
            <li
              key={spell.id}
              className={`spell-item ${(!canCast && !isSelected && !isThisSpellCasting) || (isAnySpellCasting && !isThisSpellCasting) ? 'disabled' : ''} ${isSelected && !isThisSpellCasting ? 'selected' : ''} ${isThisSpellCasting ? 'casting' : ''}`}
            >
              <div className="spell-header">
                <span className="spell-name">
                  {categoryIcon && <span className="spell-category-icon" aria-label={spell.effectCategory}>{categoryIcon} </span>}
                  {t(spell.nameKey)}
                </span>
                <span className="spell-cost">{spell.manaCost} Mana</span>
              </div>
              <p className="spell-description">{t(spell.descriptionKey)}</p>
              <button
                disabled={(isAnySpellCasting && !isThisSpellCasting) || (!canCast && !isSelected && !isThisSpellCasting)}
                onClick={() => onSelectSpell(spell.id)}
              >
                {buttonContent}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Spellbook;
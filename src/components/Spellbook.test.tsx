import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import Spellbook from './Spellbook';
import { SPELL_DEFINITIONS, type SpellId } from '../data/spells'; // For test data
import type { Player } from '../types/game';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { manaCost?: number, description?: string, spellName?: string }) => {
      if (options?.manaCost !== undefined) return `${options.manaCost} Mana`;
      // Adjusted keys based on observed DOM output in previous test run
      if (key === 'spellbook.cast_button') return 'Lancer';
      if (key === 'spellbook.cancel_button') return 'Annuler';
      // For spell names and descriptions, SPELL_DEFINITIONS provides keys like "spells.mana_bolt.name"
      // The component likely uses t(spell.nameKey) and t(spell.descriptionKey).
      // The mock should return the key itself if no specific override is present.
      return key;
    },
  }),
}));

// Mock player data for testing
const mockPlayer: Player = {
  id: 'player-1',
  uid: 'player-1', // Added uid to match Player type
  name: 'Test Player',
  displayName: 'Test Player', // Added displayName
  hp: 100,
  mana: 100,
  position: 0,
  effects: [],
  spells: SPELL_DEFINITIONS.map(spell => spell.id), // Populate with all spell IDs for Spellbook to render them
  grimoires: [],
  influence: 0,
  gold: 0,
  inventory: [],
  quests: [],
  isProtected: false,
  skipNextTurn: false,
  extraRolls: 0,
  rollModifier: 0,
  luck: 0,
  lastDiceRoll: null,
  eventDeck: [],
  playedEventCardIds: [],
  guildId: null,
  avatarUrl: '',
  title: '',
  joinDate: new Date().toISOString(),
  lastLoginDate: new Date().toISOString(),
  stats: {
    gamesPlayed:0,
    gamesWon:0,
    damageDealt:0,
    manaSpent:0,
    spellsCast:0,
  }
};

describe('Spellbook', () => {
  it('should render spells correctly and allow selection', async () => {
    const user = userEvent.setup();
    const handleSelectSpell = vi.fn();
    const testSpell = SPELL_DEFINITIONS[0];

    render(
      <Spellbook
        player={mockPlayer}
        selectedSpellId={null}
        onSelectSpell={handleSelectSpell}
      />
    );

    // Check if spell names and mana costs are rendered
    expect(screen.getByText(testSpell.nameKey)).toBeInTheDocument();
    expect(screen.getByText(testSpell.descriptionKey)).toBeInTheDocument();
    expect(screen.getByText(`${testSpell.manaCost} Mana`)).toBeInTheDocument();

    // Find the button for the first spell.
    const castButton = screen.getAllByRole('button', { name: 'Lancer' })[0];
    await user.click(castButton);

    expect(handleSelectSpell).toHaveBeenCalledWith(testSpell.id);
  });

  it('should display "Annuler" for a selected spell and allow deselection', async () => {
    const user = userEvent.setup();
    const handleSelectSpell = vi.fn();
    const testSpell = SPELL_DEFINITIONS[0];

    render(
      <Spellbook
        player={mockPlayer}
        selectedSpellId={testSpell.id} // Spell is already selected
        onSelectSpell={handleSelectSpell}
      />
    );

    // Button text should now be "Annuler" (Cancel)
    const cancelButton = screen.getByRole('button', { name: 'Annuler' });
    await user.click(cancelButton);

    expect(handleSelectSpell).toHaveBeenCalledWith(testSpell.id); // Called to deselect
  });

  it('should disable cast button if player has insufficient mana', () => {
    const playerWithLowMana: Player = { ...mockPlayer, mana: 0 };
    const handleSelectSpell = vi.fn();
    // Find a spell that costs more than 0 mana
    const spellWithCost = SPELL_DEFINITIONS.find(s => s.manaCost > 0);
    if (!spellWithCost) throw new Error("Test requires at least one spell with manaCost > 0 in SPELL_DEFINITIONS.");

    render(
      <Spellbook
        player={playerWithLowMana}
        selectedSpellId={null}
        onSelectSpell={handleSelectSpell}
      />
    );

    const spellNameElement = screen.getByText(spellWithCost.nameKey);
    const listItem = spellNameElement.closest('li');
    expect(listItem).not.toBeNull();

    if (listItem) {
      // Query within the specific list item for its button
      const castButton = Array.from(listItem.querySelectorAll('button')).find(btn => btn.textContent === 'Lancer');
      expect(castButton).toBeDefined();
      expect(castButton).toBeDisabled();
    }
  });
});

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import HallOfFame from './HallOfFame';
import type { PlayerStats } from '../hooks/useAuth'; // Utiliser import type
import { achievementDefinitions } from '../data/achievementDefinitions'; // Importer les vraies définitions, removed AchievementDefinition type import

// Mock le module useAuth pour éviter l'initialisation de Firebase via firebaseConfig
vi.mock('../hooks/useAuth', () => ({
  // Le simple fait de mocker le module suffit généralement pour que les imports
  // de type fonctionnent et pour empêcher l'exécution du code du module.
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => {
      // Pour les clés d'achievement, simuler une traduction simple
      if (key.startsWith('achievements.')) {
        const parts = key.split('.'); // achievements.ID.name ou achievements.ID.description
        if (parts.length === 3) return `${parts[1]}_${parts[2]}`; // ex: ACH_FIRST_GAME_PLAYED_name
      }
      // Pour les clés de HallOfFame (stats, titres de section)
      if (key === 'hall_of_fame.stats_title') return 'Statistiques';
      if (key === 'hall_of_fame.achievements_title') return 'Hauts Faits';
      if (key === 'hall_of_fame.stats.games_played') return 'Parties Jouées';
      if (key === 'hall_of_fame.stats.spells_cast') return 'Sorts Lancés';
      if (key === 'hall_of_fame.stats.mana_spent') return 'Mana Dépensé';
      if (key === 'hall_of_fame.stats.duels_won') return 'Duels Gagnés';
      if (key === 'hall_of_fame.stats.quests_completed') return 'Quêtes Terminées';
      if (key === 'hall_of_fame.stats.runes_reviewed') return 'Runes Révisées';
      if (key === 'hall_of_fame.no_achievements') return 'Aucun haut fait débloqué pour le moment.';

      return options?.defaultValue || key;
    },
  }),
}));

// Mock partiel de achievementDefinitions si nécessaire pour contrôler les icônes, etc.
// Pour l'instant, on utilise les vraies définitions importées.

describe('<HallOfFame />', () => {
  const mockStats: PlayerStats = {
    gamesPlayed: 10,
    spellsCast: 150,
    manaSpent: 500,
    duelsWon: 5,
    questsCompleted: 20,
    runesReviewed: 100,
  };

  const mockAchievementsAll = achievementDefinitions; // Utiliser les vraies pour les tests d'affichage

  test('affiche correctement les statistiques du joueur', () => {
    render(<HallOfFame stats={mockStats} unlockedAchievements={[]} />);
    expect(screen.getByText('Statistiques')).toBeInTheDocument();
    expect(screen.getByText('Parties Jouées')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Sorts Lancés')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('Mana Dépensé')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('Duels Gagnés')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Quêtes Terminées')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('Runes Révisées')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  test('affiche correctement les hauts faits débloqués avec leurs détails', () => {
    const unlockedIds = [mockAchievementsAll[0].id, mockAchievementsAll[1].id]; // Débloquer les deux premiers
    render(<HallOfFame stats={mockStats} unlockedAchievements={unlockedIds} />);

    expect(screen.getByText('Hauts Faits')).toBeInTheDocument();

    const ach1Def = mockAchievementsAll[0];
    const ach2Def = mockAchievementsAll[1];

    // Vérifier le premier haut fait
    // nameKey: 'achievements.first_game_played.name' -> t() -> 'first_game_played_name'
    // descriptionKey: 'achievements.first_game_played.description' -> t() -> 'first_game_played_description'
    const expectedTitle1 = `first_game_played_name: first_game_played_description`;
    const ach1Element = screen.getByTitle(expectedTitle1);
    expect(ach1Element).toBeInTheDocument();
    if (ach1Def.icon) {
      const ach1Icon = screen.getByAltText(`first_game_played_name`);
      expect(ach1Icon).toHaveAttribute('src', `/assets/achievements/${ach1Def.icon}`);
    } else {
      expect(screen.getByText(`first_game_played_name`)).toBeInTheDocument();
    }

    // Vérifier le deuxième haut fait
    // nameKey: 'achievements.duels_won_1.name' -> t() -> 'duels_won_1_name'
    const expectedTitle2 = `duels_won_1_name: duels_won_1_description`;
    const ach2Element = screen.getByTitle(expectedTitle2);
    expect(ach2Element).toBeInTheDocument();
    if (ach2Def.icon) {
      const ach2Icon = screen.getByAltText(`duels_won_1_name`);
      expect(ach2Icon).toHaveAttribute('src', `/assets/achievements/${ach2Def.icon}`);
    } else {
      expect(screen.getByText(`duels_won_1_name`)).toBeInTheDocument();
    }
  });

  test('affiche un message si aucun haut fait n\'est débloqué', () => {
    render(<HallOfFame stats={mockStats} unlockedAchievements={[]} />);
    expect(screen.getByText('Aucun haut fait débloqué pour le moment.')).toBeInTheDocument();
  });

  test('gère les stats undefined en affichant des valeurs par défaut (0)', () => {
    render(<HallOfFame stats={undefined} unlockedAchievements={[]} />);

    // Vérifier chaque statistique explicitement
    const statsToCheck = [
      { label: 'Parties Jouées', expectedValue: '0' },
      { label: 'Sorts Lancés', expectedValue: '0' },
      { label: 'Mana Dépensé', expectedValue: '0' },
      { label: 'Duels Gagnés', expectedValue: '0' },
      { label: 'Quêtes Terminées', expectedValue: '0' },
      { label: 'Runes Révisées', expectedValue: '0' },
    ];

    statsToCheck.forEach(stat => {
      const labelElement = screen.getByText(stat.label);
      expect(labelElement).toBeInTheDocument();
      // Trouver l'élément de valeur associé. Le DOM est <span class="label">Label</span><span class="value">Value</span>
      // donc la valeur est le nextSibling du parent de l'élément label, ou le nextSibling de l'élément label si la structure est plate.
      // Dans notre cas, ils sont dans le même .hof-stat-item, mais le label et la valeur sont des spans séparés.
      // On cherche la valeur dans le même conteneur hof-stat-item.
      const statItemContainer = labelElement.closest('.hof-stat-item');
      expect(statItemContainer).not.toBeNull();
      if (statItemContainer) {
        const valueElement = statItemContainer.querySelector('.hof-stat-value');
        expect(valueElement).not.toBeNull();
        expect(valueElement?.textContent).toBe(stat.expectedValue);
      }
    });

    // S'assurer que la valeur mockée (non-zéro) n'est pas là
    const mockStatValue = screen.queryByText(mockStats.gamesPlayed.toString());
    expect(mockStatValue).not.toBeInTheDocument();
  });

  test('gère unlockedAchievements undefined en n\'affichant aucun haut fait (ou message)', () => {
    render(<HallOfFame stats={mockStats} unlockedAchievements={undefined} />);
    expect(screen.getByText('Aucun haut fait débloqué pour le moment.')).toBeInTheDocument();
  });
});

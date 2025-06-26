import React from 'react';
import { useTranslation } from 'react-i18next';
import type { PlayerStats } from '../hooks/useAuth'; // Corrigé
import { getAchievementDefinition } from '../data/achievementDefinitions'; // Corrigé, removed achievementDefinitions
import './HallOfFame.css';

interface HallOfFameProps {
  stats: PlayerStats | undefined;
  unlockedAchievements: string[] | undefined;
}

const HallOfFame: React.FC<HallOfFameProps> = ({ stats, unlockedAchievements }) => {
  const { t } = useTranslation();

  const defaultStats: PlayerStats = {
    gamesPlayed: 0,
    spellsCast: 0,
    manaSpent: 0,
    duelsWon: 0,
    questsCompleted: 0,
    runesReviewed: 0,
  };

  const currentStats = stats || defaultStats;
  const currentAchievements = unlockedAchievements || [];

  // Pour l'affichage, on peut vouloir toutes les définitions pour griser celles non débloquées
  // ou seulement afficher celles débloquées. Pour l'instant, affichons seulement les débloquées.
  const achievementsToDisplay = currentAchievements
    .map(id => getAchievementDefinition(id))
    .filter(ach => ach !== undefined);

  return (
    <div className="hall-of-fame">
      <section className="hof-stats-section">
        <h2>{t('hall_of_fame.stats_title') || 'Statistiques'}</h2>
        <div className="hof-stats-grid">
          <div className="hof-stat-item">
            <span className="hof-stat-label">{t('hall_of_fame.stats.games_played') || 'Parties Jouées'}</span>
            <span className="hof-stat-value">{currentStats.gamesPlayed}</span>
          </div>
          <div className="hof-stat-item">
            <span className="hof-stat-label">{t('hall_of_fame.stats.spells_cast') || 'Sorts Lancés'}</span>
            <span className="hof-stat-value">{currentStats.spellsCast}</span>
          </div>
          <div className="hof-stat-item">
            <span className="hof-stat-label">{t('hall_of_fame.stats.mana_spent') || 'Mana Dépensé'}</span>
            <span className="hof-stat-value">{currentStats.manaSpent}</span>
          </div>
          <div className="hof-stat-item">
            <span className="hof-stat-label">{t('hall_of_fame.stats.duels_won') || 'Duels Gagnés'}</span>
            <span className="hof-stat-value">{currentStats.duelsWon}</span>
          </div>
          <div className="hof-stat-item">
            <span className="hof-stat-label">{t('hall_of_fame.stats.quests_completed') || 'Quêtes Terminées'}</span>
            <span className="hof-stat-value">{currentStats.questsCompleted}</span>
          </div>
          <div className="hof-stat-item">
            <span className="hof-stat-label">{t('hall_of_fame.stats.runes_reviewed') || 'Runes Révisées'}</span>
            <span className="hof-stat-value">{currentStats.runesReviewed}</span>
          </div>
          {/* Ajouter d'autres statistiques ici si nécessaire */}
        </div>
      </section>

      <section className="hof-achievements-section">
        <h2>{t('hall_of_fame.achievements_title') || 'Hauts Faits'}</h2>
        {achievementsToDisplay.length > 0 ? (
          <div className="hof-achievements-grid">
            {achievementsToDisplay.map(ach => ach && ( // ach est vérifié non undefined par filter plus haut
              <div key={ach.id} className="hof-achievement-item" title={`${t(ach.nameKey)}: ${t(ach.descriptionKey)}`}>
                {ach.icon && <img src={`/assets/achievements/${ach.icon}`} alt={t(ach.nameKey)} className="hof-achievement-icon" />}
                {/* Fallback si pas d'icône ou pour affichage simple */}
                {!ach.icon && <span className="hof-achievement-name-fallback">{t(ach.nameKey)}</span>}
                {/* On pourrait afficher le nom sous l'icône aussi */}
                {/* <p className="hof-achievement-name">{t(ach.nameKey)}</p> */}
              </div>
            ))}
          </div>
        ) : (
          <p>{t('hall_of_fame.no_achievements') || 'Aucun haut fait débloqué pour le moment.'}</p>
        )}
      </section>
    </div>
  );
};

export default HallOfFame;

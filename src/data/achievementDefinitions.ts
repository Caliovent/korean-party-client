import { PlayerStats } from '../hooks/useAuth'; // Importer PlayerStats pour keyof

export interface AchievementDefinition {
  id: string;
  nameKey: string; // Clé i18n pour le nom
  descriptionKey: string; // Clé i18n pour la description
  icon?: string; // Nom d'un fichier d'icône ou chemin (ex: 'ach_first_win.png')
  statTied?: keyof PlayerStats; // La statistique suivie
  threshold?: number; // Le seuil à atteindre
  isSecret?: boolean; // Caché jusqu'au déblocage
  // Points de haut fait ou autre récompense pourrait être ajouté ici
}

export const achievementDefinitions: AchievementDefinition[] = [
  // Hauts Faits liés aux jeux et victoires
  {
    id: 'ACH_FIRST_GAME_PLAYED',
    nameKey: 'achievements.first_game_played.name',
    descriptionKey: 'achievements.first_game_played.description',
    icon: 'icon_game_played.png', // Placeholder
    statTied: 'gamesPlayed',
    threshold: 1,
  },
  {
    id: 'ACH_DUELS_WON_1',
    nameKey: 'achievements.duels_won_1.name',
    descriptionKey: 'achievements.duels_won_1.description',
    icon: 'icon_duel_won.png', // Placeholder
    statTied: 'duelsWon',
    threshold: 1,
  },
  {
    id: 'ACH_DUELS_WON_10',
    nameKey: 'achievements.duels_won_10.name',
    descriptionKey: 'achievements.duels_won_10.description',
    icon: 'icon_duel_won_10.png', // Placeholder
    statTied: 'duelsWon',
    threshold: 10,
  },
  // Hauts Faits liés aux sorts
  {
    id: 'ACH_FIRST_SPELL_CAST',
    nameKey: 'achievements.first_spell_cast.name',
    descriptionKey: 'achievements.first_spell_cast.description',
    icon: 'icon_spell_cast.png', // Placeholder
    statTied: 'spellsCast',
    threshold: 1,
  },
  {
    id: 'ACH_SPELLS_CAST_100',
    nameKey: 'achievements.spells_cast_100.name',
    descriptionKey: 'achievements.spells_cast_100.description',
    icon: 'icon_spell_cast_100.png', // Placeholder
    statTied: 'spellsCast',
    threshold: 100,
  },
  // Hauts Faits liés aux quêtes
  {
    id: 'ACH_QUESTS_COMPLETED_1',
    nameKey: 'achievements.quests_completed_1.name',
    descriptionKey: 'achievements.quests_completed_1.description',
    icon: 'icon_quest_completed.png', // Placeholder
    statTied: 'questsCompleted',
    threshold: 1,
  },
  {
    id: 'ACH_QUESTS_COMPLETED_10',
    nameKey: 'achievements.quests_completed_10.name',
    descriptionKey: 'achievements.quests_completed_10.description',
    icon: 'icon_quest_completed_10.png', // Placeholder
    statTied: 'questsCompleted',
    threshold: 10,
  },
  // Hauts Faits liés à la révision (SRS)
  {
    id: 'ACH_RUNES_REVIEWED_50',
    nameKey: 'achievements.runes_reviewed_50.name',
    descriptionKey: 'achievements.runes_reviewed_50.description',
    icon: 'icon_runes_reviewed.png', // Placeholder
    statTied: 'runesReviewed',
    threshold: 50,
  },
  // Exemple de Haut Fait "secret" ou non lié directement à une stat incrémentale simple
  // (pourrait être débloqué par un événement spécifique que la fonction checkAndGrantAchievements gérerait)
  // {
  //   id: 'ACH_SECRET_DISCOVERY',
  //   nameKey: 'achievements.secret_discovery.name',
  //   descriptionKey: 'achievements.secret_discovery.description',
  //   icon: 'icon_secret.png',
  //   isSecret: true,
  // },
];

// Helper pour récupérer une définition par ID
export const getAchievementDefinition = (id: string): AchievementDefinition | undefined => {
  return achievementDefinitions.find(ach => ach.id === id);
};

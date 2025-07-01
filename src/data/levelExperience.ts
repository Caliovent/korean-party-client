export interface LevelExperience {
  level: number;
  xpRequired: number; // Total XP required to reach this level from level 1 (0 XP)
  xpForNextLevel?: number; // XP needed to get from this level to the next
}

export const levelExperienceTable: LevelExperience[] = [
  { level: 1, xpRequired: 0 },
  { level: 2, xpRequired: 100 },
  { level: 3, xpRequired: 250 },
  { level: 4, xpRequired: 500 },
  { level: 5, xpRequired: 800 },
  { level: 6, xpRequired: 1200 },
  { level: 7, xpRequired: 1700 },
  { level: 8, xpRequired: 2300 },
  { level: 9, xpRequired: 3000 },
  { level: 10, xpRequired: 4000 },
  { level: 11, xpRequired: 5200 },
  { level: 12, xpRequired: 6600 },
  { level: 13, xpRequired: 8200 },
  { level: 14, xpRequired: 10000 },
  { level: 15, xpRequired: 12000 },
  { level: 16, xpRequired: 14200 },
  { level: 17, xpRequired: 16600 },
  { level: 18, xpRequired: 19200 },
  { level: 19, xpRequired: 22000 },
  { level: 20, xpRequired: 25000 },
  // Add more levels as needed
];

// Calculate xpForNextLevel for each entry
for (let i = 0; i < levelExperienceTable.length; i++) {
  if (i + 1 < levelExperienceTable.length) {
    levelExperienceTable[i].xpForNextLevel = levelExperienceTable[i+1].xpRequired - levelExperienceTable[i].xpRequired;
  } else {
    // For the last defined level, xpForNextLevel can be undefined or set to a high value/Infinity
    // or simply means "max level reached" if no further levels are planned.
    levelExperienceTable[i].xpForNextLevel = undefined;
  }
}

/**
 * Gets the experience details for a given wizard level.
 * @param level The wizard level.
 * @returns LevelExperience object or undefined if the level is not in the table.
 */
export const getExperienceForLevel = (level: number): LevelExperience | undefined => {
  return levelExperienceTable.find(l => l.level === level);
};

/**
 * Determines the wizard level based on total experience.
 * @param totalExperience The player's total experience points.
 * @returns The current wizard level.
 */
export const getLevelFromExperience = (totalExperience: number): number => {
  for (let i = levelExperienceTable.length - 1; i >= 0; i--) {
    if (totalExperience >= levelExperienceTable[i].xpRequired) {
      return levelExperienceTable[i].level;
    }
  }
  return 1; // Default to level 1 if somehow totalExperience is negative or table is empty
};

/**
 * Calculates the progress towards the next level.
 * @param totalExperience The player's total experience.
 * @param currentLevel The player's current wizard level.
 * @returns Object with currentXPInLevel, xpToNextLevel, and progressPercentage, or null if max level.
 */
export const getLevelProgress = (totalExperience: number, currentLevel: number): {
  currentXPInLevel: number;
  xpForThisLevelToNext: number;
  progressPercentage: number;
} | null => {
  const currentLevelData = getExperienceForLevel(currentLevel);
  if (!currentLevelData) return null;

  const xpRequiredForCurrentLevel = currentLevelData.xpRequired;

  if (currentLevelData.xpForNextLevel === undefined) { // Max level or next level not defined
    const xpInMaxLevel = totalExperience - xpRequiredForCurrentLevel;
    return {
      currentXPInLevel: xpInMaxLevel,
      xpForThisLevelToNext: 0, // Or indicate it's max level differently
      progressPercentage: 100, // Or handle as max level
    };
  }

  const xpForThisLevelToNext = currentLevelData.xpForNextLevel;
  const currentXPInLevel = totalExperience - xpRequiredForCurrentLevel;
  const progressPercentage = (currentXPInLevel / xpForThisLevelToNext) * 100;

  return {
    currentXPInLevel,
    xpForThisLevelToNext,
    progressPercentage: Math.min(100, Math.max(0, progressPercentage)), // Clamp between 0 and 100
  };
};

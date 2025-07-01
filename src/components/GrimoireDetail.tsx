import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, query, type DocumentData } from 'firebase/firestore';
import type { SpellMasteryData } from '../types/game';
import './GrimoireDetail.css'; // We will create this file next

// Define mastery levels and their corresponding labels and icons
// Updated icons to be more thematic
const MASTERY_LEVELS_CONFIG = [
  { level: 4, labelKey: 'grimoireDetail.engraved', icon: '💠', className: 'mastery-engraved' }, // Gravée (Engraved) - Diamond with a Dot
  { level: 3, labelKey: 'grimoireDetail.powerful', icon: '🌟', className: 'mastery-powerful' }, // Puissante (Powerful) - Glowing Star
  { level: 2, labelKey: 'grimoireDetail.awakened', icon: '🌱', className: 'mastery-awakened' }, // En Apprentissage (Awakened/In Learning) - Seedling
  { level: 1, labelKey: 'grimoireDetail.dormant', icon: '🌀', className: 'mastery-dormant' },  // Découverte (Dormant/Discovered) - Cyclone/Spiral
  { level: 0, labelKey: 'grimoireDetail.unknown', icon: '❓', className: 'mastery-unknown' }, // Inconnues (Unknown) - Question Mark
];

// Helper to get i18n text, replace with actual useTranslation if available globally or pass t function
// For now, a simple placeholder
const t = (key: string, fallback: string, options?: { count?: number, runes?: string }) => {
  // In a real app, this would use i18next instance
  let text = translations[key] || fallback;
  if (options?.count !== undefined) {
    text = text.replace('{{count}}', options.count.toString());
  }
  if (options?.runes !== undefined) {
    text = text.replace('{{runes}}', options.runes);
  }
  return text;
};

const translations: Record<string, string> = {
  'grimoireDetail.title': 'État de Votre Savoir Runique',
  'grimoireDetail.loading': 'Chargement des détails du grimoire...',
  'grimoireDetail.noRunes': 'Aucune rune trouvée dans votre grimoire.',
  'grimoireDetail.error': 'Erreur lors du chargement du grimoire.',
  'grimoireDetail.engraved': 'Runes Gravées',
  'grimoireDetail.powerful': 'Runes Puissantes',
  'grimoireDetail.awakened': 'Runes en Apprentissage',
  'grimoireDetail.dormant': 'Runes Découvertes',
  'grimoireDetail.unknown': 'Runes Inconnues',
  'grimoireDetail.runesAtLevelTitle': 'Runes {{runes}} ({{count}})',
  'grimoireDetail.closeDetailView': 'Fermer la vue détaillée',
  'grimoireDetail.noRunesAtThisLevel': 'Aucune rune spécifique à afficher pour ce niveau.',
};


interface RuneCollection {
  [masteryLevel: number]: SpellMasteryData[];
}

const GrimoireDetail: React.FC = () => {
  const { user } = useAuth();
  // Store all runes, grouped by mastery level
  const [allRunes, setAllRunes] = useState<RuneCollection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // State to manage which mastery level's details are shown
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);


  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const spellMasteryRef = collection(db, `playerLearningProfiles/${user.uid}/spellMasteryStatus`);
    const q = query(spellMasteryRef);

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedRunes: RuneCollection = {};
      MASTERY_LEVELS_CONFIG.forEach(config => fetchedRunes[config.level] = []); // Initialize arrays

      querySnapshot.forEach((doc) => {
        const data = doc.data() as SpellMasteryData;
        // Ensure spellId is part of the object if it's the document ID
        if (!data.spellId) {
            data.spellId = doc.id as any;
        }
        const level = data.masteryLevel;

        if (fetchedRunes[level]) {
          fetchedRunes[level].push(data);
        } else {
          // Group unexpected mastery levels under 'unknown' (level 0)
          fetchedRunes[0] = fetchedRunes[0] || [];
          fetchedRunes[0].push(data);
        }
      });

      setAllRunes(fetchedRunes);
      setIsLoading(false);
      setError(null);
    }, (err) => {
      console.error("Error fetching spell mastery status:", err);
      setError(t('grimoireDetail.error', 'Erreur lors du chargement du grimoire.'));
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSelectLevel = (level: number) => {
    setSelectedLevel(level);
  };

  const handleCloseDetailView = () => {
    setSelectedLevel(null);
  };

  if (isLoading) {
    return <p>{t('grimoireDetail.loading', 'Chargement des détails du grimoire...')}</p>;
  }

  if (error) {
    return <p className="error-message">{error}</p>;
  }

  if (!allRunes || Object.values(allRunes).every(runesAtLevel => runesAtLevel.length === 0)) {
    return <p>{t('grimoireDetail.noRunes', 'Aucune rune trouvée dans votre grimoire.')}</p>;
  }

  // If a level is selected, show the detailed view for that level
  if (selectedLevel !== null && allRunes[selectedLevel]) {
    const runesForLevel = allRunes[selectedLevel];
    const levelConfig = MASTERY_LEVELS_CONFIG.find(c => c.level === selectedLevel);
    const levelLabel = levelConfig ? t(levelConfig.labelKey, `Niveau ${selectedLevel}`) : `Niveau ${selectedLevel}`;

    return (
      <div className="grimoire-detail-container grimoire-detailed-view">
        <h3>
          {t('grimoireDetail.runesAtLevelTitle', 'Runes {{runes}} ({{count}})', {
            runes: levelLabel,
            count: runesForLevel.length
          })}
        </h3>
        {runesForLevel.length > 0 ? (
          <ul className="detailed-rune-list">
            {runesForLevel.map(rune => (
              <li key={rune.spellId} className="detailed-rune-item">
                {rune.word || rune.spellId}
                {/* Optionally display more info like successfulCasts, etc. */}
              </li>
            ))}
          </ul>
        ) : (
          <p>{t('grimoireDetail.noRunesAtThisLevel', 'Aucune rune spécifique à afficher pour ce niveau.')}</p>
        )}
        <button onClick={handleCloseDetailView} className="close-detail-button">
          {t('grimoireDetail.closeDetailView', 'Fermer la vue détaillée')}
        </button>
      </div>
    );
  }

  // Otherwise, show the summary view
  return (
    <div className="grimoire-detail-container">
      <h3>{t('grimoireDetail.title', 'État de Votre Savoir Runique')}</h3>
      <ul className="grimoire-summary-list">
        {MASTERY_LEVELS_CONFIG.map(config => {
          const runesAtLevel = allRunes[config.level] || [];
          const count = runesAtLevel.length;

          if (config.level === 0 && count === 0) return null;

          return (
            <li
              key={config.level}
              className={`grimoire-summary-item ${config.className} ${count > 0 ? 'interactive' : ''}`}
              onClick={() => count > 0 && handleSelectLevel(config.level)}
              role={count > 0 ? "button" : undefined}
              tabIndex={count > 0 ? 0 : undefined}
              onKeyPress={(e) => { if (e.key === 'Enter' && count > 0) handleSelectLevel(config.level)}}
            >
              <span className="rune-icon">{config.icon}</span>
              <span className="rune-label">{t(config.labelKey, `Niveau ${config.level}`)}:</span>
              <span className="rune-count">{count}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default GrimoireDetail;

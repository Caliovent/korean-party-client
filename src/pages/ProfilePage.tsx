import React, { useState, useEffect, useRef } from 'react'; // Ajout de useRef
import { useTranslation } from 'react-i18next';
import { db, app } from '../firebaseConfig'; // Added app
import { doc, onSnapshot, type DocumentData } from 'firebase/firestore';
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from '../hooks/useAuth'; // Import useAuth
import { getGuildById } from '../services/gameService'; // Import getGuildById
import GrimoireVivant from '../components/GrimoireVivant'; // Import GrimoireVivant
// Import the new GrimoireDetail component
import GrimoireDetail from '../components/GrimoireDetail'; // MODIFIED: Import GrimoireDetail
import HallOfFame from '../components/HallOfFame'; // Importer HallOfFame
import { useToasts } from '../contexts/useToasts'; // Importer useToast
import { getAchievementDefinition } from '../data/achievementDefinitions'; // Importer pour les détails des HF
// Import level calculation utilities
import { getLevelFromExperience, getLevelProgress, getExperienceForLevel } from '../data/levelExperience'; // MODIFIED: Import level utils
import './ProfilePage.css'; // Créez ou ajustez ce fichier CSS si nécessaire

// --- COMPOSANT PRINCIPAL DE LA PAGE DE PROFIL ---
const ProfilePage: React.FC = () => {
  const { t, i18n } = useTranslation(); // Added i18n
  const { user: authUser, loading: authLoading } = useAuth(); // Use useAuth hook
  const { addToast } = useToasts(); // Hook pour les toasts

  const previousAchievementsRef = useRef<string[] | undefined>(undefined);

  const [profile, setProfile] = useState<DocumentData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true); // Separate loading for profile doc
  const [isEditing, setIsEditing] = useState(false);
  const [newdisplayName, setNewdisplayName] = useState('');
  const [error, setError] = useState(''); // General errors for profile page

  // State for guild information
  const [guildName, setGuildName] = useState<string | null>(null);
  const [isLoadingGuildName, setIsLoadingGuildName] = useState<boolean>(false);
  const [guildNameError, setGuildNameError] = useState<string | null>(null);

  // State for calculated level and experience
  const [calculatedLevel, setCalculatedLevel] = useState<number | null>(null);
  const [calculatedExperience, setCalculatedExperience] = useState<number | null>(null);
  const [loadingCalculatedLevel, setLoadingCalculatedLevel] = useState<boolean>(true);
  const [levelCalculationError, setLevelCalculationError] = useState<string | null>(null);


  // Effet pour charger les données du profil de l'utilisateur en temps réel
  useEffect(() => {
    if (!authUser) {
        setLoadingProfile(false);
        setLoadingCalculatedLevel(false); // Also stop loading level if no authUser
        return;
    };
    const userDocRef = doc(db, "users", authUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            setProfile(data);
            setNewdisplayName(data.displayName || '');
            if (data.languagePreference) {
              // console.log("Profile language preference:", data.languagePreference);
            }
        } else {
            setError("Profil non trouvé.");
        }
        setLoadingProfile(false);
    }, (err) => {
        console.error("Error fetching profile snapshot:", err);
        setError("Erreur de chargement du profil.");
        setLoadingProfile(false);
    });

    // Call the Cloud Function to calculate level and XP
    setLoadingCalculatedLevel(true);
    setLevelCalculationError(null);
    const functions = getFunctions(app, 'europe-west1');
    if (import.meta.env.DEV) {
        functions.customDomain = `http://localhost:5173/functions-proxy`;
    }
    const calculatePlayerLevelFunction = httpsCallable(functions, 'calculatePlayerLevel');

    calculatePlayerLevelFunction()
      .then((result) => {
        const data = result.data as { totalExperience: number; sorcererLevel: number };
        setCalculatedExperience(data.totalExperience);
        setCalculatedLevel(data.sorcererLevel);
      })
      .catch((err) => {
        console.error("Error calling calculatePlayerLevel function:", err);
        setLevelCalculationError(t('profilePage.errors.levelCalculationFailed', "Erreur lors du calcul du niveau."));
        // Set to default/fallback values or handle error display appropriately
        setCalculatedExperience(0); // Fallback
        setCalculatedLevel(1);      // Fallback
      })
      .finally(() => {
        setLoadingCalculatedLevel(false);
      });

    return () => unsubscribe();
  }, [authUser, t, app]); // Add app and t to dependencies

  // Effect to fetch guild name when user's guildId changes
  useEffect(() => {
    if (authUser && authUser.guildId) {
      setIsLoadingGuildName(true);
      setGuildName(null); // Reset previous guild name
      setGuildNameError(null);
      getGuildById(authUser.guildId)
        .then(guildDetails => {
          if (guildDetails) {
            setGuildName(guildDetails.name);
          } else {
            setGuildNameError("Maison non trouvée ou détails indisponibles.");
          }
        })
        .catch(err => {
          console.error("Error fetching guild details for profile:", err);
          setGuildNameError("Erreur lors de la récupération des détails de la maison.");
        })
        .finally(() => {
          setIsLoadingGuildName(false);
        });
    } else if (authUser && !authUser.guildId) {
      // User is loaded but has no guild
      setGuildName(null);
      setIsLoadingGuildName(false);
      setGuildNameError(null);
    }
  }, [authUser, authUser?.guildId]); // Depend on authUser and specifically guildId

  // Effet pour détecter les nouveaux hauts faits débloqués
  useEffect(() => {
    if (authUser && authUser.unlockedAchievements) {
      const currentAchievements = authUser.unlockedAchievements;
      const previousAchievements = previousAchievementsRef.current;

      // Si c'est la première fois après l'initialisation de la page que l'on voit des achievements,
      // on les stocke comme "vus" sans déclencher de toast pour eux.
      if (previousAchievements === undefined) {
        previousAchievementsRef.current = [...currentAchievements];
        return;
      }

      // Maintenant, previousAchievements est défini (il a été initialisé au cycle précédent ou au montage).
      // On compare pour trouver les réellement nouveaux.
      if (currentAchievements.length > previousAchievements.length) {
        const newAchievements = currentAchievements.filter(achId => !previousAchievements.includes(achId));

        if (newAchievements.length > 0) {
          newAchievements.forEach(achId => {
            const definition = getAchievementDefinition(achId);
            if (definition) {
              addToast(
                (t('hall_of_fame.achievement_unlocked_title') || 'Haut Fait Débloqué !') + ': ' + t(definition.nameKey),
                'success',
                7000
              );
            }
          });
        }
      }
      // Toujours mettre à jour la référence avec la liste actuelle pour la prochaine comparaison.
      previousAchievementsRef.current = [...currentAchievements];

    } else if (authUser && (!authUser.unlockedAchievements || authUser.unlockedAchievements.length === 0)) {
      // Si l'utilisateur est chargé mais n'a pas d'achievements (ou une liste vide)
      previousAchievementsRef.current = []; // Marquer comme vide pour la prochaine comparaison
    }
    // Si authUser est null, previousAchievementsRef reste undefined, ce qui est géré au prochain chargement d'authUser.
  }, [authUser, authUser?.unlockedAchievements, addToast, t]);


  // Fonction pour gérer la mise à jour du displayName
  const handleUpdatedisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newdisplayName.length < 3) {
      setError("Le displayName doit contenir au moins 3 caractères.");
      return;
    }
    setError('');

    let functions;
    if (import.meta.env.DEV) {
      functions = getFunctions(app, 'europe-west1');
      functions.customDomain = `http://localhost:5173/functions-proxy`;
    } else {
      functions = getFunctions(app, 'europe-west1');
    }
    const updateUserProfile = httpsCallable(functions, 'updateUserProfile');
    try {
      await updateUserProfile({ displayName: newdisplayName });
      setIsEditing(false); // Ferme le formulaire après succès
    } catch (err: unknown) {
      console.error("Erreur de mise à jour du profil:", err);
      setError((err as Error).message || "Impossible de mettre à jour le displayName.");
    }
  };

  // Fonction pour gérer le changement de langue
  const handleLanguageChange = async (lang: string) => {
    if (!authUser) {
      addToast(t('profilePage.errors.notLoggedInForLanguage', 'Vous devez être connecté pour changer la langue.'), 'error');
      return;
    }

    let functionsInstance; // Corrected variable name
    if (import.meta.env.DEV) {
      functionsInstance = getFunctions(app, 'europe-west1'); // Corrected variable name
      functionsInstance.customDomain = `http://localhost:5173/functions-proxy`;
    } else {
      functionsInstance = getFunctions(app, 'europe-west1'); // Corrected variable name
    }
    const updateUserProfile = httpsCallable(functionsInstance, 'updateUserProfile');

    try {
      await updateUserProfile({ languagePreference: lang });
      i18n.changeLanguage(lang); // Change language in UI
      addToast(t('profilePage.languageChanged', 'Langue mise à jour avec succès !'), 'success');
      // Force re-render or update profile state if necessary, though i18n change should trigger it for texts
      // For the button's active state, we might need to ensure ProfilePage re-renders if i18n.language isn't directly making it happen.
      // However, i18n.changeLanguage should cause components using useTranslation to re-render.
    } catch (err: unknown) {
      console.error("Erreur de mise à jour de la langue:", err);
      addToast(t('profilePage.errors.languageUpdateFailed', "Impossible de mettre à jour la préférence linguistique."), 'error');
    }
  };

  if (authLoading || loadingProfile || (authUser && loadingCalculatedLevel)) {
    return <div>{t('loading', 'Chargement...')}</div>;
  }
  // Error from auth hook (e.g. not logged in) might be handled by a redirect in App.tsx or useAuth itself
  if (!authUser) return <div>{t('notLoggedIn', 'Veuillez vous connecter pour voir votre profil.')}</div>;
  if (error && !profile) return <div className="error-message">{error}</div>; // Error fetching profile document
  if (!profile) return <div>{t('profileNotFound', "Profil de l'utilisateur non trouvé.")}</div>;

  // Use calculated level and experience
  const displayExperience = calculatedExperience ?? 0;
  const displayWizardLevel = calculatedLevel ?? 1;

  const levelProgress = getLevelProgress(displayExperience, displayWizardLevel);
  // const currentLevelData = getExperienceForLevel(displayWizardLevel); // currentLevelData is not directly used in JSX below

  return (
    <div className="profile-page-container"> {/* Updated class name */}
      <header className="profile-header">
        <h1>{t('profilePage.title', 'Mon Grimoire Vivant')}</h1>
        <p>{t('profilePage.description', "Consultez et gérez la maîtrise de vos sortilèges.")}</p>
      </header>

      {/* --- SECTION D'AFFICHAGE ET D'ÉDITION DU PROFIL --- */}
      <section className="profile-details profile-section">
        <h2>{t('profilePage.userProfileTitle', 'Mon Profil de Sorcier')}</h2>
        <p><strong>{t('profilePage.emailLabel', 'Email')}:</strong> {profile.email}</p>
        <p><strong>{t('profilePage.displayNameLabel', 'Nom d\'Invocateur')}:</strong> {profile.displayName}</p>

        {/* Wizard Level Display */}
        <p>
          <strong>{t('profilePage.wizardLevelLabel', 'Niveau de Sorcier')}:</strong> {loadingCalculatedLevel ? t('loading', 'Chargement...') : displayWizardLevel}
        </p>

        {/* XP Progress Bar */}
        {levelCalculationError && <p className="error-message">{levelCalculationError}</p>}

        {!loadingCalculatedLevel && levelProgress && (
          <div className="xp-progress-section">
            <p>
              {t('profilePage.xpProgressLabel', 'Progression vers le prochain niveau')}:
              ({t('profilePage.totalExperience', 'Expérience totale')}: {Math.floor(displayExperience)})
            </p>
            <div className="xp-bar-container">
              <div
                className="xp-bar-fill"
                style={{ width: `${levelProgress.progressPercentage}%` }}
              >
                <span className="xp-bar-text">
                  {`${Math.floor(levelProgress.currentXPInLevel)} / ${levelProgress.xpForThisLevelToNext} XP`}
                </span>
              </div>
            </div>
            {levelProgress.xpForThisLevelToNext === 0 && ( // Max level reached or next level not defined
                 <p>{t('profilePage.maxLevelReached', 'Niveau maximum atteint pour le moment !')}</p>
            )}
          </div>
        )}

        {/* Guild Information Display */}
        {authUser.guildId && (
          isLoadingGuildName ? (
            <p>{t('loadingGuildName', 'Chargement du nom de la maison...')}</p>
          ) : guildNameError ? (
            <p style={{ color: 'red' }}>{guildNameError}</p>
          ) : guildName ? (
            <p><strong>{t('guildMembership', 'Membre de la Maison')}:</strong> {guildName}</p>
          ) : (
            <p>{t('guildDetailsUnavailable', 'Détails de la maison non disponibles.')}</p>
          )
        )}
        {!authUser.guildId && !isLoadingGuildName && (
          <p>{t('noGuildAffiliation', "N'appartient à aucune maison.")}</p>
        )}
      </section>

      <button onClick={() => setIsEditing(!isEditing)} className="profile-edit-button">
        {isEditing ? t('cancel', 'Annuler') : t('editdisplayName', 'Modifier le Nom d\'Invocateur')}
      </button>

      {isEditing && (
        <form onSubmit={handleUpdatedisplayName} className="profile-edit-form" style={{marginTop: '1.5rem'}}>
          <div className="form-group">
            <label htmlFor="displayName">{t('newdisplayName', 'Nouveau displayName')}</label>
            <input 
              type="text" 
              id="displayName"
              value={newdisplayName}
              onChange={(e) => setNewdisplayName(e.target.value)} 
            />
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit">{t('save', 'Enregistrer')}</button>
        </form>
      )}

      {/* --- SECTION PRÉFÉRENCES LINGUISTIQUES --- */}
      <section className="language-preferences-section profile-section">
        <h2>{t('profilePage.languagePreferencesTitle', 'Préférences Linguistiques')}</h2>
        <div className="language-buttons">
          <button
            onClick={() => handleLanguageChange('fr')}
            className={i18n.language.startsWith('fr') ? 'active' : ''}
          >
            {t('language.french', 'Français')}
          </button>
          <button
            onClick={() => handleLanguageChange('en')}
            className={i18n.language.startsWith('en') ? 'active' : ''}
          >
            {t('language.english', 'English')}
          </button>
        </div>
      </section>

      {/* --- SECTION DU GRIMOIRE VIVANT (DÉTAIL DES RUNES) --- */}
      <section className="grimoire-detail-section profile-section">
        {/* This is where the new GrimoireDetail component goes */}
        <GrimoireDetail />
      </section>

      {/* --- SECTION DU GRIMOIRE VIVANT (SESSION DE RÉVISION - CONSERVÉE) --- */}
      {/* Assuming GrimoireVivant is the component for starting review sessions etc. */}
      <section className="grimoire-review-section profile-section">
         <h2>{t('profilePage.grimoireReviewTitle', 'Forgeron de Runes')}</h2>
        <GrimoireVivant />
      </section>

      {/* --- SECTION STATS ET HAUTS FAITS --- */}
      <section className="hall-of-fame-section profile-section">
        <h2>{t('profilePage.hallOfFameTitle', 'Mon Palmarès')}</h2>
        <HallOfFame
          stats={authUser.stats}
          unlockedAchievements={authUser.unlockedAchievements}
        />
      </section>
    </div>
  );
};

export default ProfilePage;

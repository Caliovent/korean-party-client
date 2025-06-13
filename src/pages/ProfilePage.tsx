import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { auth, db, app } from '../firebaseConfig'; // Added app
import { doc, onSnapshot, type DocumentData } from 'firebase/firestore';
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from '../hooks/useAuth'; // Import useAuth
import { getGuildById } from '../services/gameService'; // Import getGuildById

// --- SOUS-COMPOSANT POUR LA SESSION DE RÉVISION (SRS) ---
const ReviewSession: React.FC<{ items: any[], onFinish: () => void }> = ({ items, onFinish }) => {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentItem = items[currentIndex];

  const handleSelectResult = async (wasCorrect: boolean) => {
    setIsSubmitting(true);
    let functions;
    if (import.meta.env.DEV) {
      functions = getFunctions(app, 'us-central1');
      functions.customDomain = `http://localhost:5173/functions-proxy`;
    } else {
      functions = getFunctions(app, 'us-central1');
    }
    const submitSrsReview = httpsCallable(functions, 'submitSrsReview');
    
    try {
      await submitSrsReview({ itemId: currentItem.id, wasCorrect });
    } catch (error) {
      console.error("Erreur de soumission de la révision:", error);
    } finally {
      // Passer à la carte suivante ou terminer la session
      if (currentIndex < items.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setIsFlipped(false);
      } else {
        onFinish();
      }
      setIsSubmitting(false);
    }
  };

  if (!currentItem) return null;

  return (
    <div className="review-session-container">
      <div className={`flashcard ${isFlipped ? 'is-flipped' : ''}`} onClick={() => !isFlipped && setIsFlipped(true)}>
        <div className="flashcard-face flashcard-front">
          {/* Affiche la question/le mot */}
          {currentItem.id} 
        </div>
        <div className="flashcard-face flashcard-back">
          {/* Ici, on afficherait la vraie réponse. Pour l'instant, c'est un placeholder. */}
          Réponse : {currentItem.id}
        </div>
      </div>
      
      {isFlipped && !isSubmitting && (
        <div className="review-actions">
          <button onClick={() => handleSelectResult(false)} className="delete-button">{t('incorrect', 'Incorrect')}</button>
          <button onClick={() => handleSelectResult(true)}>{t('correct', 'Correct')}</button>
        </div>
      )}
    </div>
  );
};


// --- COMPOSANT PRINCIPAL DE LA PAGE DE PROFIL ---
const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { user: authUser, loading: authLoading } = useAuth(); // Use useAuth hook

  const [profile, setProfile] = useState<DocumentData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true); // Separate loading for profile doc
  const [isEditing, setIsEditing] = useState(false);
  const [newPseudo, setNewPseudo] = useState('');
  const [error, setError] = useState(''); // General errors for profile page
  const [reviewItems, setReviewItems] = useState<any[] | null>(null);
  const [isLoadingReview, setIsLoadingReview] = useState(false);

  // State for guild information
  const [guildName, setGuildName] = useState<string | null>(null);
  const [isLoadingGuildName, setIsLoadingGuildName] = useState<boolean>(false);
  const [guildNameError, setGuildNameError] = useState<string | null>(null);

  // Effet pour charger les données du profil de l'utilisateur en temps réel
  useEffect(() => {
    // Note: auth.currentUser might be initially null, use authUser from hook instead for reliability
    if (!authUser) {
        setLoadingProfile(false);
        // Error can be set if needed, or rely on auth hook to redirect/handle
        return;
    };
    const userDocRef = doc(db, "users", authUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            setProfile(doc.data());
            setNewPseudo(doc.data().pseudo || ''); // Ensure pseudo is not undefined
        } else {
            setError("Profil non trouvé."); // This error is for the Firestore profile document
        }
        setLoadingProfile(false);
    }, (err) => {
        console.error("Error fetching profile snapshot:", err);
        setError("Erreur de chargement du profil.");
        setLoadingProfile(false);
    });
    return () => unsubscribe();
  }, [authUser]); // Depend on authUser from useAuth

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

  // Fonction pour gérer la mise à jour du pseudo
  const handleUpdatePseudo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPseudo.length < 3) {
      setError("Le pseudo doit contenir au moins 3 caractères.");
      return;
    }
    setError('');

    let functions;
    if (import.meta.env.DEV) {
      functions = getFunctions(app, 'us-central1');
      functions.customDomain = `http://localhost:5173/functions-proxy`;
    } else {
      functions = getFunctions(app, 'us-central1');
    }
    const updateUserProfile = httpsCallable(functions, 'updateUserProfile');
    try {
      await updateUserProfile({ pseudo: newPseudo });
      setIsEditing(false); // Ferme le formulaire après succès
    } catch (err: any) {
      console.error("Erreur de mise à jour du profil:", err);
      setError(err.message || "Impossible de mettre à jour le pseudo.");
    }
  };

  // Fonction pour démarrer une session de révision SRS
  const handleStartReviewSession = async () => {
    setIsLoadingReview(true);
    setReviewItems(null); // Réinitialise au cas où
    let functions;
    if (import.meta.env.DEV) {
      functions = getFunctions(app, 'us-central1');
      functions.customDomain = `http://localhost:5173/functions-proxy`;
    } else {
      functions = getFunctions(app, 'us-central1');
    }
    const getReviewItems = httpsCallable(functions, 'getReviewItems');
    try {
      const result = await getReviewItems();
      setReviewItems((result.data as { items: any[] }).items);
    } catch (err) {
      console.error("Erreur de récupération des items:", err);
      setError("Impossible de charger la session de révision.");
    } finally {
      setIsLoadingReview(false);
    }
  };

  // Fonction pour terminer et quitter la session de révision
  const handleFinishReview = () => {
    setReviewItems(null);
  };

  if (authLoading || loadingProfile) return <div>{t('loading', 'Chargement...')}</div>;
  // Error from auth hook (e.g. not logged in) might be handled by a redirect in App.tsx or useAuth itself
  if (!authUser) return <div>{t('notLoggedIn', 'Veuillez vous connecter pour voir votre profil.')}</div>;
  if (error && !profile) return <div className="error-message">{error}</div>; // Error fetching profile document
  if (!profile) return <div>{t('profileNotFound', "Profil de l'utilisateur non trouvé.")}</div>;

  return (
    <div className="profile-container">
      {/* --- SECTION D'AFFICHAGE ET D'ÉDITION DU PROFIL --- */}
      <div className="profile-details">
        <h2>{t('profilePageTitle', 'Mon Profil de Sorcier')}</h2>
        <p><strong>Email:</strong> {profile.email}</p>
        <p><strong>Pseudo:</strong> {profile.pseudo}</p>
        <p><strong>Niveau:</strong> {profile.level}</p>
        <p><strong>XP:</strong> {profile.xp}</p>
        {/* Guild Information Display */}
        {authUser.guildId && (
          isLoadingGuildName ? (
            <p>{t('loadingGuildName', 'Chargement du nom de la maison...')}</p>
          ) : guildNameError ? (
            <p style={{ color: 'red' }}>{guildNameError}</p>
          ) : guildName ? (
            <p><strong>{t('guildMembership', 'Membre de la Maison')}:</strong> {guildName}</p>
          ) : (
            // This case might occur if guildId exists but fetch returned null and no error
            <p>{t('guildDetailsUnavailable', 'Détails de la maison non disponibles.')}</p>
          )
        )}
        {!authUser.guildId && !isLoadingGuildName && ( // Ensure not to show this while guildId might still be loading via authUser
          <p>{t('noGuildAffiliation', "N'appartient à aucune maison.")}</p>
        )}
      </div>

      <button onClick={() => setIsEditing(!isEditing)}>
        {isEditing ? t('cancel', 'Annuler') : t('editPseudo', 'Modifier le pseudo')}
      </button>

      {isEditing && (
        <form onSubmit={handleUpdatePseudo} className="profile-edit-form" style={{marginTop: '1.5rem'}}>
          <div className="form-group">
            <label htmlFor="pseudo">{t('newPseudo', 'Nouveau pseudo')}</label>
            <input 
              type="text" 
              id="pseudo"
              value={newPseudo}
              onChange={(e) => setNewPseudo(e.target.value)} 
            />
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit">{t('save', 'Enregistrer')}</button>
        </form>
      )}

      {/* --- SECTION DE LA FORGE DES SORTS (SRS) --- */}
      <div className="srs-section" style={{marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem'}}>
        <h3>{t('spellForgeTitle', 'Forge des Sorts')}</h3>
        
        {reviewItems === null ? (
          <>
            <p>{t('srsDescription', 'Révisez vos sortilèges pour les renforcer !')}</p>
            <button onClick={handleStartReviewSession} disabled={isLoadingReview}>
              {isLoadingReview ? t('loadingReview', 'Chargement...') : t('startReview', 'Lancer une révision')}
            </button>
          </>
        ) : reviewItems.length > 0 ? (
          <ReviewSession items={reviewItems} onFinish={handleFinishReview} />
        ) : (
          <div>
            <p>{t('noItemsToReview', 'Aucun sort à réviser pour le moment. Bravo !')}</p>
            <button onClick={() => setReviewItems(null)}>{t('back', 'Retour')}</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;

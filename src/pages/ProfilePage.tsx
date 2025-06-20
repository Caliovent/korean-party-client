import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { auth, db, app } from '../firebaseConfig'; // Added app
import { doc, onSnapshot, type DocumentData } from 'firebase/firestore';
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from '../hooks/useAuth'; // Import useAuth
import { getGuildById } from '../services/gameService'; // Import getGuildById
import GrimoireVivant from '../components/GrimoireVivant'; // Import GrimoireVivant
import './ProfilePage.css'; // Créez ou ajustez ce fichier CSS si nécessaire

// --- COMPOSANT PRINCIPAL DE LA PAGE DE PROFIL ---
const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { user: authUser, loading: authLoading } = useAuth(); // Use useAuth hook

  const [profile, setProfile] = useState<DocumentData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true); // Separate loading for profile doc
  const [isEditing, setIsEditing] = useState(false);
  const [newdisplayName, setNewdisplayName] = useState('');
  const [error, setError] = useState(''); // General errors for profile page

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
            setNewdisplayName(doc.data().displayName || ''); // Ensure displayName is not undefined
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
    } catch (err: any) {
      console.error("Erreur de mise à jour du profil:", err);
      setError(err.message || "Impossible de mettre à jour le displayName.");
    }
  };

  if (authLoading || loadingProfile) return <div>{t('loading', 'Chargement...')}</div>;
  // Error from auth hook (e.g. not logged in) might be handled by a redirect in App.tsx or useAuth itself
  if (!authUser) return <div>{t('notLoggedIn', 'Veuillez vous connecter pour voir votre profil.')}</div>;
  if (error && !profile) return <div className="error-message">{error}</div>; // Error fetching profile document
  if (!profile) return <div>{t('profileNotFound', "Profil de l'utilisateur non trouvé.")}</div>;

  return (
    <div className="profile-page-container"> {/* Updated class name */}
      <header className="profile-header">
        <h1>{t('profilePage.title', 'Mon Grimoire Vivant')}</h1>
        <p>{t('profilePage.description', "Consultez et gérez la maîtrise de vos sortilèges.")}</p>
      </header>

      {/* --- SECTION D'AFFICHAGE ET D'ÉDITION DU PROFIL (Conservée) --- */}
      <div className="profile-details">
        <h2>{t('profilePageTitle', 'Mon Profil de Sorcier')}</h2>
        <p><strong>Email:</strong> {profile.email}</p>
        <p><strong>displayName:</strong> {profile.displayName}</p>
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
            <p>{t('guildDetailsUnavailable', 'Détails de la maison non disponibles.')}</p>
          )
        )}
        {!authUser.guildId && !isLoadingGuildName && (
          <p>{t('noGuildAffiliation', "N'appartient à aucune maison.")}</p>
        )}
      </div>

      <button onClick={() => setIsEditing(!isEditing)}>
        {isEditing ? t('cancel', 'Annuler') : t('editdisplayName', 'Modifier le displayName')}
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

      {/* --- SECTION DU GRIMOIRE VIVANT --- */}
      <main>
        <GrimoireVivant />
      </main>
    </div>
  );
};

export default ProfilePage;

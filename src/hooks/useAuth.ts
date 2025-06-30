import { useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig'; // Assuming firebaseConfig is correctly set up, added db
import { doc, getDoc } from 'firebase/firestore'; // Added for fetching user profile
import type { User } from 'firebase/auth';
import i18n from '../i18n'; // Import i18n instance

// Statistics structure
export interface PlayerStats {
  gamesPlayed: number;
  // gamesWon: number; // gamesWon can be inferred or specifically tracked
  spellsCast: number;
  manaSpent: number;
  duelsWon: number;
  questsCompleted: number;
  runesReviewed: number; // From SRS reviews
  // Potentially add more specific stats like wordsLearnedByCategory, etc.
}

// Placeholder for user profile data structure
// In a real app, this would likely come from Firestore (e.g., a 'users' collection
// where each document has a 'guildId' field) or from Firebase Auth custom claims.
export interface UserProfile extends User { // Added export
  guildId?: string | null; // Stores the ID of the guild the user belongs to, if any.
  stats?: PlayerStats; // Player statistics
  unlockedAchievements?: string[]; // Array of achievement IDs
  languagePreference?: string; // User's preferred language
}

/**
 * Placeholder hook for authentication and user profile management.
 *
 * REAL IMPLEMENTATION CONSIDERATIONS:
 * 1. Profile Fetching:
 *    - On `onAuthStateChanged`, if `firebaseUser` is present, fetch their profile
 *      from Firestore (e.g., `doc(db, 'users', firebaseUser.uid)`).
 *    - This profile document would store `guildId` and other app-specific user data.
 * 2. guildId Population:
 *    - `guildId` could be populated from the fetched Firestore document.
 *    - Alternatively, if using custom claims for faster access, ensure the token is
 *      refreshed when claims change (e.g., after joining/leaving a guild).
 *      `firebaseUser.getIdTokenResult(true)` can force a refresh.
 * 3. Loading State:
 *    - `loading` should be true until both auth state is resolved AND the user
 *      profile (with `guildId`) is fetched.
 *
 * For this subtask, it mocks a user with a guildId for demonstration purposes.
 */
export const useAuth = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async firebaseUser => {
      if (firebaseUser) {
        setLoading(true);
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          let userProfileData: Partial<UserProfile> = {};

          if (userDocSnap.exists()) {
            userProfileData = userDocSnap.data() as UserProfile;
          } else {
            // Handle case where user profile doesn't exist in Firestore yet
            // console.log(`No profile document found for user ${firebaseUser.uid}, using defaults.`);
          }

          const resolvedUser: UserProfile = {
            ...firebaseUser,
            guildId: userProfileData.guildId || null,
            stats: userProfileData.stats || { gamesPlayed: 0, spellsCast: 0, manaSpent: 0, duelsWon: 0, questsCompleted: 0, runesReviewed: 0 },
            unlockedAchievements: userProfileData.unlockedAchievements || [],
            languagePreference: userProfileData.languagePreference, // This will be undefined if not set
          };
          setUser(resolvedUser);

          // Apply language preference
          if (resolvedUser.languagePreference) {
            // console.log(`Applying user language preference: ${resolvedUser.languagePreference}`);
            i18n.changeLanguage(resolvedUser.languagePreference);
          } else {
            // Fallback logic: browser language or default
            const browserLang = navigator.language.split('-')[0]; // Get 'en' from 'en-US'
            // console.log(`No user language preference found. Browser language: ${browserLang}`);
            if (['en', 'fr'].includes(browserLang)) {
              // console.log(`Applying browser language: ${browserLang}`);
              i18n.changeLanguage(browserLang);
            } else {
              // console.log(`Browser language not supported or not detected, defaulting to 'en'.`);
              i18n.changeLanguage('en'); // Default language
            }
          }

        } catch (error) {
          console.error("Error fetching user profile or setting language:", error);
          // Fallback for user object in case of error
          const errorUser: UserProfile = {
            ...firebaseUser,
            guildId: null,
            stats: { gamesPlayed: 0, spellsCast: 0, manaSpent: 0, duelsWon: 0, questsCompleted: 0, runesReviewed: 0 },
            unlockedAchievements: [],
          };
          setUser(errorUser);
          // Fallback language setting in case of error
          // console.log(`Error occurred, defaulting language to 'en'.`);
          i18n.changeLanguage('en');
        } finally {
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
        // Optionally, reset language to browser default or a general default when logged out
        // For now, it will keep the last set language or the initial one from i18n.ts
        // console.log("User logged out. Current language:", i18n.language);
      }
    });

    return () => unsubscribe();
  }, []);

  // Function to simulate updating guildId locally after guild actions.
  // REAL IMPLEMENTATION CONSIDERATIONS for updateUserGuildId:
  // 1. Backend Update:
  //    - This function, or the service that calls it (e.g., createGuild, joinGuild),
  //      should ensure the user's `guildId` is updated in the backend (Firestore doc or custom claim).
  // 2. Profile Re-fetch / State Update:
  //    - After a successful backend update, the local user profile state needs to be updated.
  //      This could be done by:
  //        a) Re-fetching the entire profile: `auth.currentUser.getIdTokenResult(true)` then re-read claims,
  //           or re-fetch the Firestore document.
  //        b) Optimistically updating the local state (as done here) and trusting the backend succeeded.
  //           This is faster but can lead to inconsistencies if the backend fails silently.
  // For the mock, it just updates the local state.
  const updateUserGuildId = (newGuildId: string | null) => {
    setUser(prevUser => {
      if (prevUser) {
        console.log(`Mock updateUserGuildId: Setting guildId to ${newGuildId}`); // For debugging
        return { ...prevUser, guildId: newGuildId };
      }
      return null;
    });
  };


  return { user, loading, updateUserGuildId };
};

// Helper to simulate getting just the guildId directly.
// This can be useful in components that only need guildId and not the full user object.
// REAL IMPLEMENTATION: This helper would remain largely the same, relying on the main useAuth hook.
export const useUserGuildId = (): { guildId: string | null | undefined, loading: boolean } => {
  const { user, loading } = useAuth();
  if (loading) return { guildId: undefined, loading: true };
  return { guildId: user?.guildId, loading: false };
}

import { useState, useEffect } from 'react';
import { auth } from '../firebaseConfig'; // Assuming firebaseConfig is correctly set up
import type { User } from 'firebase/auth';

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
    const unsubscribe = auth.onAuthStateChanged(async firebaseUser => { // Made async for potential profile fetch
      if (firebaseUser) {
        // --- REAL IMPLEMENTATION START ---
        // setLoading(true); // Set loading true while fetching profile
        // try {
        //   // Example: Fetch profile from Firestore
        //   // const userDocRef = doc(db, 'users', firebaseUser.uid);
        //   // const userDocSnap = await getDoc(userDocRef);
        //   // if (userDocSnap.exists()) {
        //   //   const userProfileData = userDocSnap.data();
        //   //   setUser({ ...firebaseUser, guildId: userProfileData.guildId || null });
        //   // } else {
        //   //   // Handle case where user profile doesn't exist, maybe create one
        //   //   setUser({ ...firebaseUser, guildId: null });
        //   // }
        //
        //   // OR Example: Using custom claims (after ensuring token is fresh)
        //   // const idTokenResult = await firebaseUser.getIdTokenResult();
        //   // const customClaims = idTokenResult.claims;
        //   // setUser({ ...firebaseUser, guildId: customClaims.guildId || null });
        // } catch (error) {
        //   console.error("Error fetching user profile:", error);
        //   setUser({ ...firebaseUser, guildId: null }); // Fallback
        // } finally {
        //   setLoading(false);
        // }
        // --- REAL IMPLEMENTATION END ---

        // Mock implementation (current):
        const mockUserProfile: UserProfile = {
          ...firebaseUser,
          // To test guild creation, set guildId to null initially:
          // guildId: null,
          guildId: 'some-existing-guild-id', // To test user already in a guild
          // Mock initial stats and achievements
          stats: {
            gamesPlayed: 5,
            spellsCast: 120,
            manaSpent: 450,
            duelsWon: 2,
            questsCompleted: 3,
            runesReviewed: 50,
          },
          unlockedAchievements: ['ACH_FIRST_SPELL_CAST'], // Example achievement
        };
        setUser(mockUserProfile);
        setLoading(false); // Mock sets loading false here
      } else {
        setUser(null);
      }
      setLoading(false);
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

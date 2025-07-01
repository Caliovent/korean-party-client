import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { getLevelFromExperience } from "./data/levelExperience";

// Initialize Firebase Admin SDK
// This is typically done once per application instance.
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

interface SpellMasteryDoc {
  masteryLevel: number;
  // other fields might exist but are not needed for this calculation
}

/**
 * Calculates a player's total experience and sorcerer level based on their spell mastery.
 *
 * Expects to be called by an authenticated user.
 * Reads all documents from the `users/{userId}/spellMastery` subcollection.
 * Applies the formula:
 *  Level 1 (Découverte): 1 XP
 *  Level 2 (Apprentissage): 5 XP
 *  Level 3 (Maîtrise): 20 XP
 *  Level 4 (Gravure): 50 XP
 * Returns the totalExperience and calculated sorcererLevel.
 */
export const calculatePlayerLevel = functions
  .region("europe-west1") // As seen in ProfilePage.tsx, good practice to specify region
  .https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    const userId = context.auth.uid;
    let totalExperience = 0;

    try {
      const spellMasterySnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("spellMastery")
        .get();

      if (spellMasterySnapshot.empty) {
        functions.logger.info(
          `No spell mastery data found for user ${userId}. Returning 0 XP, level 1.`
        );
        // If no spells mastered, XP is 0, level is 1
        return {
          totalExperience: 0,
          sorcererLevel: getLevelFromExperience(0), // Should be 1
        };
      }

      spellMasterySnapshot.forEach((doc) => {
        const spellData = doc.data() as SpellMasteryDoc;
        const level = spellData.masteryLevel;

        switch (level) {
          case 1: // Découverte
            totalExperience += 1;
            break;
          case 2: // Apprentissage
            totalExperience += 5;
            break;
          case 3: // Maîtrise
            totalExperience += 20;
            break;
          case 4: // Gravure
            totalExperience += 50;
            break;
          default:
            // Log if masteryLevel has an unexpected value, but don't add XP
            functions.logger.warn(
              `User ${userId}, spell ${doc.id} has unexpected masteryLevel: ${level}. No XP awarded for this spell.`
            );
            break;
        }
      });

      const sorcererLevel = getLevelFromExperience(totalExperience);

      functions.logger.info(
        `User ${userId}: calculated totalExperience = ${totalExperience}, sorcererLevel = ${sorcererLevel}`
      );

      return {
        totalExperience,
        sorcererLevel,
      };
    } catch (error) {
      functions.logger.error(
        `Error calculating player level for user ${userId}:`,
        error
      );
      throw new functions.https.HttpsError(
        "internal",
        "An error occurred while calculating player level.",
        error
      );
    }
  });

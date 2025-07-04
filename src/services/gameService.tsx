// src/services/gameService.ts (modifié)

import { getFunctions, httpsCallable, type HttpsCallableResult } from 'firebase/functions';
import type { SpellId } from '../data/spells'; // Importer le type
import { app } from '../firebaseConfig';
import { collection, getDocs, getFirestore, doc, getDoc } from 'firebase/firestore'; // Import doc and getDoc
import type { Guild } from '../types/guild'; // Importer le type Guild

// Initialize Firebase Functions
let functions;
if (import.meta.env.DEV) {
  // For development, use the proxy
  functions = getFunctions(app, 'europe-west1'); // Correct region for functions
  functions.customDomain = "http://localhost:5173/functions-proxy"; // Vite proxy
} else {
  // For production, call functions directly in the correct region
  functions = getFunctions(app, 'europe-west1');
}

const db = getFirestore(app);

// --- Game Lifecycle Functions ---

export const createGame = async (gameName: string): Promise<HttpsCallableResult | null> => {
  try {
    console.log("[CLIENT] Calling 'createGame' function with name: ${gameName}");
    const createGameFunction = httpsCallable(functions, 'createGame');
    const result = await createGameFunction({ gameName });
    return result;
  } catch (error) {
    console.error("Error calling createGame function:", error);
    return null;
  }
};

/**
 * Calls the Cloud Function to signal that a mini-game has finished.
 * The backend is expected to transition the game state appropriately.
 * @param gameId The ID of the game where the mini-game finished.
 */
export const finishMiniGame = async (gameId: string): Promise<void> => {
  try {
    console.log(`[CLIENT] Calling 'finishMiniGame' function for game: ${gameId}`);
    const finishMiniGameFunction = httpsCallable(functions, 'finishMiniGame');
    await finishMiniGameFunction({ gameId });
    console.log("Cloud Function 'finishMiniGame' called for game ${gameId}");
  } catch (error) {
    console.error(`Error calling finishMiniGame function for game ${gameId}:`, error);
    // Optionally re-throw or handle as per application's error handling strategy
    throw error;
  }
};

export const joinGame = async (gameId: string): Promise<void> => {
  try {
    console.log("[CLIENT] Calling 'joinGame' function for game: ${gameId}");
    const joinGameFunction = httpsCallable(functions, 'joinGame');
    await joinGameFunction({ gameId });
  } catch (error) {
    console.error("ERREUR MAGIQUE DÉTECTÉE DANS JOIN GAME:", error); // Un log pour être sûr
    throw error; // CETTE LIGNE EST LA CLÉ !
  }
};

export const startGame = async (gameId: string): Promise<void> => {
  try {
    console.log("[CLIENT] Calling 'startGame' function for game: ${gameId}");
    const startGameFunction = httpsCallable(functions, 'startGame');
    await startGameFunction({ gameId });
  } catch (error) {
    console.error("Error calling startGame function:", error);
  }
};


export const leaveGame = async (gameId: string): Promise<void> => {
  try {
    console.log("[CLIENT] Calling 'leaveGame' function for game: ${gameId}");
    const leaveGameFunction = httpsCallable(functions, 'leaveGame');
    await leaveGameFunction({ gameId });
  } catch (error) {
    console.error("Error calling leaveGame function:", error);
  }
};

/**
 * Appelle la Cloud Function pour lancer le dé pour le joueur actuel.
 * @param gameId L'ID de la partie.
 */
export const rollDice = async (gameId: string): Promise<void> => {
  try {
    const rollDiceFunction = httpsCallable(functions, 'rollDice');
    await rollDiceFunction({ gameId });
    console.log("Cloud Function 'rollDice' called for game ${gameId}");
  } catch (error) {
    console.error("Error calling rollDice function:", error);
  }
};

/**
 * Appelle la Cloud Function pour résoudre l'effet de la case et terminer le tour.
 * @param gameId L'ID de la partie.
 */
export const resolveTileAction = async (gameId: string): Promise<void> => {
  try {
    const resolveTileFunction = httpsCallable(functions, 'resolveTileAction');
    await resolveTileFunction({ gameId });
    console.log("Cloud Function 'resolveTileAction' called for game ${gameId}");
  } catch (error) {
    console.error("Error calling resolveTileAction function:", error);
  }
};


/**
 * Appelle la Cloud Function pour lancer un sort sur un autre joueur.
 * @param gameId L'ID de la partie.
 * @param spellId L'ID du sort à lancer.
 * @param targetId L'ID du joueur ciblé.
 */
export const castSpell = async (gameId: string, spellId: SpellId, targetId: string): Promise<void> => {
  try {
    const castSpellFunction = httpsCallable(functions, 'castSpell');
    await castSpellFunction({ gameId, spellId, targetId });
    console.log("Cloud Function 'castSpell' (${spellId}) called on target ${targetId}");
  } catch (error) {
    console.error("Error calling castSpell function:", error);
  }
};

/**
 * Fetches all guilds from Firestore.
 * @returns A promise that resolves to an array of Guild objects.
 */
export const getGuilds = async (): Promise<Guild[]> => {
  try {
    const guildsCollection = collection(db, 'guilds');
    const guildSnapshot = await getDocs(guildsCollection);
    const guildList = guildSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Guild));
    console.log('Fetched guilds:', guildList);
    return guildList;
  } catch (error) {
    console.error("Error fetching guilds:", error);
    return [];
  }
};

/**
 * Calls the Cloud Function to create a new guild.
 * @param name The name of the guild.
 * @param tag The tag of the guild.
 * @returns A promise that resolves with the result of the Cloud Function call.
 */
export const createGuild = async (name: string, tag: string): Promise<any> => {
  try {
    const createGuildFunction = httpsCallable(functions, 'createGuild');
    const result = await createGuildFunction({ name, tag });
    console.log("Cloud Function 'createGuild' called successfully with name: ${name}, tag: ${tag}", result);
    return result.data; // Functions usually return data in a 'data' property
  } catch (error) {
    console.error("Error calling createGuild function:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
};

// --- Mini-Game Challenge Preparation ---

interface PrepareChallengePayload {
  gameId: string;
  miniGameType: string; // Consider using MiniGameId type if available and appropriate
  difficulty: 'easy' | 'medium' | 'hard' | string; // String for flexibility if more difficulties arise
}

/**
 * Calls the Cloud Function to prepare a personalized challenge for a mini-game.
 * @param payload - The data required to prepare the challenge.
 * @returns A promise that resolves when the function call is complete.
 */
export const prepareChallenge = async (payload: PrepareChallengePayload): Promise<void> => {
  try {
    console.log(`[CLIENT] Calling 'prepareMiniGameChallenge' function with payload:`, payload);
    const prepareMiniGameChallengeFunction = httpsCallable(functions, 'prepareMiniGameChallenge');
    await prepareMiniGameChallengeFunction(payload);
    console.log("Cloud Function 'prepareMiniGameChallenge' called successfully.");
  } catch (error) {
    console.error("Error calling prepareMiniGameChallenge function:", error);
    // Optionally re-throw or handle as per application's error handling strategy
    throw error;
  }
};

// --- Hangeul Typhoon Mini-Game Service ---
import type { HangeulTyphoonAttackResponse } from '../types/hangeul'; // Import response type

/**
 * Simulates calling the sendTyphoonAttack Cloud Function.
 * @param gameId The ID of the game/duel.
 * @param attackerPlayerId The ID of the attacking player.
 * @param targetPlayerId The ID of the target player.
 * @param attackWord The word used in the attack.
 * @returns A promise that resolves to a HangeulTyphoonAttackResponse.
 */
export const sendTyphoonAttackService = async (
  gameId: string,
  attackerPlayerId: string,
  targetPlayerId: string,
  attackWord: string
): Promise<HangeulTyphoonAttackResponse> => {
  console.log(`[Mock Service] sendTyphoonAttackService called: gameId=${gameId}, attacker=${attackerPlayerId}, target=${targetPlayerId}, word=${attackWord}`);

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Mock logic based on attackWord for testing different scenarios
  if (attackWord === "fail_vulnerable") { // Simulate attack on a non-vulnerable or non-existent block
    return {
      status: "failure",
      reason: "NO_VULNERABLE_BLOCK_MATCHED",
      message: "Mock: Attack failed. No vulnerable block matched your word.",
      attackerPlayerId: attackerPlayerId,
      attackerPenaltyGroundRiseAmount: 15
    };
  } else if (attackWord === "fail_word") { // Simulate attack with a word that doesn't exist on any block
    return {
      status: "failure",
      reason: "BLOCK_NOT_FOUND",
      message: "Mock: Attack failed. The word does not exist on any of opponent's blocks.",
      attackerPlayerId: attackerPlayerId,
      attackerPenaltyGroundRiseAmount: 10
    };
  } else if (attackWord === "error_server") { // Simulate a server-side or function call error
    // This would typically be caught by the .catch() in the scene,
    // but if the function itself returns a structured error:
    return {
        status: 'failure',
        reason: 'INTERNAL_SERVER_ERROR', // Or a more specific error code
        message: "Mock: Simulated internal server error in function.",
        attackerPlayerId: attackerPlayerId,
        attackerPenaltyGroundRiseAmount: 5 // Minimal penalty for such errors
    };
  } else { // Simulate a successful attack
    return {
      status: "success",
      message: "Mock: Attack successful! Target's block destroyed.",
      attackerPlayerId: attackerPlayerId,
      targetPlayerId: targetPlayerId,
      destroyedBlockWord: attackWord,
      targetGroundRiseAmount: 20 // Example amount
    };
  }
};

/**
 * Fetches a specific guild by its ID from Firestore.
 * @param guildId The ID of the guild to fetch.
 * @returns A promise that resolves to the Guild object if found, otherwise null.
 */
export const getGuildById = async (guildId: string): Promise<Guild | null> => {
  if (!guildId) {
    console.error("getGuildById: guildId is null or undefined.");
    return null;
  }
  try {
    const guildDocRef = doc(db, 'guilds', guildId);
    const guildDocSnap = await getDoc(guildDocRef);

    if (guildDocSnap.exists()) {
      const guildData = { id: guildDocSnap.id, ...guildDocSnap.data() } as Guild;
      console.log('Fetched guild by ID:', guildData);
      return guildData;
    } else {
      console.log('No such guild found for ID:', guildId);
      return null;
    }
  } catch (error) {
    console.error("Error fetching guild by ID:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
};


/**
 * Calls the Cloud Function for a user to leave their current guild.
 * The Cloud Function is expected to identify the user and their guild via context.
 * @returns A promise that resolves with the result of the Cloud Function call.
 */
export const leaveGuild = async (): Promise<any> => {
  try {
    const leaveGuildFunction = httpsCallable(functions, 'leaveGuild');
    const result = await leaveGuildFunction(); // No parameters needed for this call
    console.log("Cloud Function 'leaveGuild' called successfully", result);
    return result.data; // Functions usually return data in a 'data' property
  } catch (error) {
    console.error("Error calling leaveGuild function:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
};


/**
 * Calls the Cloud Function for a user to join a guild.
 * @param guildId The ID of the guild to join.
 * @returns A promise that resolves with the result of the Cloud Function call.
 */
export const joinGuild = async (guildId: string): Promise<any> => {
  try {
    const joinGuildFunction = httpsCallable(functions, 'joinGuild');
    const result = await joinGuildFunction({ guildId });
    console.log("Cloud Function 'joinGuild' called successfully for guildId: ${guildId}", result);
    return result.data; // Functions usually return data in a 'data' property
  } catch (error) {
    console.error("Error calling joinGuild function:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
};
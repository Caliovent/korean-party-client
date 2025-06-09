// src/services/gameService.ts (modifié)

import { getFunctions, httpsCallable, type HttpsCallableResult } from 'firebase/functions';
import type { SpellId } from '../data/spells'; // Importer le type
import { app } from '../firebaseConfig';
const functions = getFunctions(app, 'europe-west1');

// --- Game Lifecycle Functions ---

export const createGame = async (gameName: string): Promise<HttpsCallableResult | null> => {
  try {
    console.log(`[CLIENT] Calling 'createGame' function with name: ${gameName}`);
    const createGameFunction = httpsCallable(functions, 'createGame');
    const result = await createGameFunction({ gameName });
    return result;
  } catch (error) {
    console.error("Error calling createGame function:", error);
    return null;
  }
};

export const joinGame = async (gameId: string): Promise<void> => {
  try {
    const joinGameFunction = httpsCallable(functions, 'joinGame');
    await joinGameFunction({ gameId });
  } catch (error) {
    console.error("Error calling joinGame function:", error);
  }
};

export const leaveGame = async (gameId: string): Promise<void> => {
  try {
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
    console.log(`Cloud Function 'rollDice' called for game ${gameId}`);
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
    console.log(`Cloud Function 'resolveTileAction' called for game ${gameId}`);
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
    console.log(`Cloud Function 'castSpell' (${spellId}) called on target ${targetId}`);
  } catch (error) {
    console.error("Error calling castSpell function:", error);
  }
};
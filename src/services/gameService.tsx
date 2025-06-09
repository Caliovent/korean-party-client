// src/services/gameService.ts (modifié)

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebaseConfig';

const functions = getFunctions(app, 'europe-west1');

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
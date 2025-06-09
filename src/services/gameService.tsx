// src/services/gameService.ts

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebaseConfig';

const functions = getFunctions(app, 'europe-west1'); // Assurez-vous d'utiliser la bonne région

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
    // Ici, vous pourriez afficher une notification d'erreur à l'utilisateur
  }
};
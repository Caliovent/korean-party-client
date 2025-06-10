// src/services/gameService.ts (modifié)

import { getFunctions, httpsCallable } from 'firebase/functions';
import type { SpellId } from '../data/spells'; // Importer le type
import { app } from '../firebaseConfig';
import { collection, getDocs, getFirestore } from 'firebase/firestore';
import type { Guild } from '../types/guild'; // Importer le type Guild
const functions = getFunctions(app, 'europe-west1');
const db = getFirestore(app);

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
    console.log(`Cloud Function 'createGuild' called successfully with name: ${name}, tag: ${tag}`, result);
    return result.data; // Functions usually return data in a 'data' property
  } catch (error) {
    console.error("Error calling createGuild function:", error);
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
    console.log(`Cloud Function 'joinGuild' called successfully for guildId: ${guildId}`, result);
    return result.data; // Functions usually return data in a 'data' property
  } catch (error) {
    console.error("Error calling joinGuild function:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
};
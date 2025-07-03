import { db } from '../firebaseConfig'; // Assurez-vous que db est bien exporté depuis firebaseConfig
import { collection, getDocs, query, type QuerySnapshot, type DocumentData } from 'firebase/firestore';

// Interface pour l'objet de contenu global du jeu
export interface GameContent {
  koreanVocabulary?: any[]; // À typer plus précisément plus tard
  questDefinitions?: any[]; // À typer plus précisément plus tard
  hangeulTyphoonWords?: any[]; // À typer plus précisément plus tard
  // Ajoutez d'autres types de contenu ici au besoin
}

/**
 * Récupère tous les documents d'une collection Firestore.
 * @param collectionName Le nom de la collection à récupérer.
 * @returns Une promesse résolue avec un tableau de documents de la collection.
 * @throws Réémet l'erreur si la récupération échoue.
 */
export async function fetchCollection<T = DocumentData>(collectionName: string): Promise<T[]> {
  try {
    const q = query(collection(db, collectionName));
    const querySnapshot: QuerySnapshot<DocumentData> = await getDocs(q);
    const dataList: T[] = [];
    querySnapshot.forEach((doc) => {
      // doc.data() is never undefined for query doc snapshots
      dataList.push({ id: doc.id, ...doc.data() } as T);
    });
    console.log(`Successfully fetched ${dataList.length} documents from ${collectionName}`);
    return dataList;
  } catch (error) {
    console.error(`Error fetching collection ${collectionName}:`, error);
    throw error; // Réémettre pour que l'appelant puisse gérer
  }
}

/**
 * Charge tout le contenu de jeu nécessaire depuis Firestore.
 * Appelle fetchCollection pour chaque type de contenu requis.
 * @returns Une promesse résolue avec un objet GameContent contenant toutes les données du jeu.
 */
export async function loadGameContent(): Promise<GameContent> {
  const gameContent: GameContent = {};

  try {
    // Exemple de chargement de différentes collections
    // Remplacez les noms de collection par les vôtres si nécessaire
    gameContent.koreanVocabulary = await fetchCollection('koreanVocabulary');
    gameContent.questDefinitions = await fetchCollection('questDefinitions');
    gameContent.hangeulTyphoonWords = await fetchCollection('hangeulTyphoonWords');

    // Vous pouvez ajouter d'autres appels à fetchCollection ici pour d'autres données
    // Exemple: gameContent.spellData = await fetchCollection('spells');

    console.log('All game content loaded successfully.');
    return gameContent;
  } catch (error) {
    console.error('Failed to load game content:', error);
    // En cas d'erreur lors du chargement d'une partie critique du contenu,
    // vous pourriez vouloir retourner un objet partiel ou lancer une erreur spécifique.
    // Pour l'instant, nous retournons ce qui a pu être chargé avant l'erreur,
    // mais il serait plus robuste de gérer cela en fonction des besoins de l'application.
    // Si certaines données sont absolument critiques, il vaut mieux lancer une erreur ici.
    throw new Error('Critical game content could not be loaded.');
  }
}

// Exemple d'utilisation (peut être retiré ou commenté)
// async function testLoad() {
//   try {
//     const content = await loadGameContent();
//     console.log('Game Content Loaded for test:', content);
//   } catch (error) {
//     console.error('Test load failed:', error);
//   }
// }
// testLoad(); // Appeler pour tester pendant le développement si Firestore est accessible

import type { GameRoundData, Item } from './types';

// allItems a été supprimé. Ces données seront chargées depuis Firestore via ContentContext.

// Cette fonction est conservée pour sa logique de structuration d'un round,
// mais elle devra être alimentée avec des items provenant du ContentContext.
// Pour l'instant, elle retournera une structure vide ou de démo,
// indiquant que les données réelles doivent venir d'ailleurs.
function getRandomItem(availableItems: Item[], excludeId?: string): Item | undefined {
  if (!availableItems || availableItems.length === 0) return undefined;
  const filteredItems = excludeId ? availableItems.filter(item => item.id !== excludeId) : availableItems;
  if (filteredItems.length === 0) return undefined;
  return filteredItems[Math.floor(Math.random() * filteredItems.length)];
}

export const getNamdaemunGameData = async (
  allItemsFromContext: Item[], // Les items seront passés en argument
  currentRoundIndex: number = 0
): Promise<GameRoundData | null> => {
  if (!allItemsFromContext || allItemsFromContext.length === 0) {
    console.warn("getNamdaemunGameData: allItemsFromContext est vide. Impossible de générer les données du round.");
    // Retourner une structure minimale ou null pour indiquer l'échec
    return Promise.resolve(null);
    // Ou retourner une promesse rejetée si c'est plus approprié pour la gestion d'erreur en amont
    // return Promise.reject(new Error("Aucun item fourni pour générer les données du jeu Namdaemun."));
  }

  // Assurer que l'index ne dépasse pas la longueur du tableau
  const itemWanted = allItemsFromContext[currentRoundIndex % allItemsFromContext.length];
  if (!itemWanted) {
    console.warn(`getNamdaemunGameData: Aucun item voulu trouvé à l'index ${currentRoundIndex % allItemsFromContext.length}.`);
    return Promise.resolve(null);
  }

  const choices: Item[] = [itemWanted];
  let attempts = 0; // Pour éviter une boucle infinie si peu d'items
  while (choices.length < Math.min(3, allItemsFromContext.length) && attempts < allItemsFromContext.length * 2) {
    const randomChoice = getRandomItem(allItemsFromContext, itemWanted.id);
    if (randomChoice && !choices.some(choice => choice.id === randomChoice.id)) {
      choices.push(randomChoice);
    }
    attempts++;
  }

  // Si après tentatives on n'a pas assez de choix (cas où il y a très peu d'items uniques)
  // on peut remplir avec ce qu'on a, même si ça duplique l'item voulu (moins idéal)
  // ou simplement continuer avec moins de choix. Pour l'instant, on continue avec ce qu'on a.

  // Shuffle choices
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }

  return new Promise((resolve) => {
    // La simulation de délai peut être conservée si souhaité, ou retirée
    setTimeout(() => {
      resolve({
        customerRequest: {
          itemWanted: itemWanted,
          displayText: `${itemWanted.name} 주세요`,
        },
        choices: choices,
      });
    }, 50); // Délai réduit
  });
};

export const submitNamdaemunResults = async (score: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Namdaemun results submitted: Score ${score}`);
      // In a real scenario, this would interact with a backend or state management
      resolve();
    }, 100); // Délai réduit
  });
};

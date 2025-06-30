import { GameRoundData, Item } from './types';

const allItems: Item[] = [
  { id: 'apple', name: '사과', altText: "Image d'une pomme", imageUrl: 'https://placehold.co/100x100/FFDDDD/FF0000?text=사과' },
  { id: 'hat', name: '모자', altText: "Image d'un chapeau", imageUrl: 'https://placehold.co/100x100/DDDDFF/0000FF?text=모자' },
  { id: 'book', name: '책', altText: "Image d'un livre", imageUrl: 'https://placehold.co/100x100/DDFFDD/00FF00?text=책' },
  { id: 'water', name: '물', altText: "Image de l'eau", imageUrl: 'https://placehold.co/100x100/E0F7FA/00BCD4?text=물' },
  { id: 'bread', name: '빵', altText: "Image d'un pain", imageUrl: 'https://placehold.co/100x100/FFF9C4/FFEB3B?text=빵' },
];

function getRandomItem(excludeId?: string): Item {
  const availableItems = excludeId ? allItems.filter(item => item.id !== excludeId) : allItems;
  return availableItems[Math.floor(Math.random() * availableItems.length)];
}

export const getNamdaemunGameData = async (currentRoundIndex: number = 0): Promise<GameRoundData> => {
  // For now, let's make the requested item somewhat predictable for testing,
  // but allow for variation.
  const itemWanted = allItems[currentRoundIndex % allItems.length];

  const choices: Item[] = [itemWanted];
  while (choices.length < 3) { // Ensure 3 choices, including the correct one
    const randomChoice = getRandomItem(itemWanted.id);
    if (!choices.some(choice => choice.id === randomChoice.id)) {
      choices.push(randomChoice);
    }
  }

  // Shuffle choices
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }

  return new Promise((resolve) => {
    setTimeout(() => { // Simulate async call
      resolve({
        customerRequest: {
          itemWanted: itemWanted,
          displayText: `${itemWanted.name} 주세요`,
        },
        choices: choices,
      });
    }, 100); // Simulate a short delay
  });
};

export const submitNamdaemunResults = async (score: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Namdaemun results submitted: Score ${score}`);
      // In a real scenario, this would interact with a backend or state management
      resolve();
    }, 200);
  });
};

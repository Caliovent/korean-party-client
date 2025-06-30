// foodApi.ts

// Represents a single food item with its details
export interface FoodItem {
  id: string; // Unique identifier, e.g., "ramyeon_01"
  name: string; // Hangeul name, e.g., "라면"
  imageUrl: string; // URL to the image, e.g., "/assets/images/foods/ramyeon.jpg"
  imageAlt: string; // Alt text for the image, e.g., "Image de Ramyeon"
  pronunciationUrl?: string; // Optional URL for pronunciation audio
}

// Data for a single round/question in the Food Feast game
export interface FoodGameData {
  questionId: string; // Unique ID for this specific question/challenge
  foodItem: FoodItem; // The food item to be identified
  options: string[]; // Array of Hangeul word options, e.g., ["라면", "김치", "비빔밥", "불고기"]
  correctAnswer: string; // The correct Hangeul string from the options, e.g., "라면"
}

// Result of a completed game round
export interface FoodGameRoundResult {
  score: number; // Player's score for the round
  correctAnswers: number; // Number of correctly answered questions
  totalQuestions: number; // Total number of questions in the round
}

// Result after submitting the game round's performance to the backend
export interface FoodGameSubmitResult {
  finalScore: number; // Final score confirmed by backend (might be same as round score)
  message?: string; // Optional message from the backend, e.g., "Well done!"
  rewards?: any; // Optional rewards data
}

// --- Mock Data ---

const MOCK_FOOD_ITEMS: FoodItem[] = [
  { id: "ramyeon_01", name: "라면", imageUrl: "/assets/images/foods/ramyeon.jpg", imageAlt: "Image de Ramyeon", pronunciationUrl: "/assets/sounds/foods/ramyeon.mp3" },
  { id: "kimchi_01", name: "김치", imageUrl: "/assets/images/foods/kimchi.jpg", imageAlt: "Image de Kimchi", pronunciationUrl: "/assets/sounds/foods/kimchi.mp3" },
  { id: "bibimbap_01", name: "비빔밥", imageUrl: "/assets/images/foods/bibimbap.jpg", imageAlt: "Image de Bibimbap", pronunciationUrl: "/assets/sounds/foods/bibimbap.mp3" },
  { id: "bulgogi_01", name: "불고기", imageUrl: "/assets/images/foods/bulgogi.jpg", imageAlt: "Image de Bulgogi", pronunciationUrl: "/assets/sounds/foods/bulgogi.mp3" },
  { id: "tteokbokki_01", name: "떡볶이", imageUrl: "/assets/images/foods/tteokbokki.jpg", imageAlt: "Image de Tteokbokki", pronunciationUrl: "/assets/sounds/foods/tteokbokki.mp3" },
  { id: "kimbap_01", name: "김밥", imageUrl: "/assets/images/foods/kimbap.jpg", imageAlt: "Image de Kimbap", pronunciationUrl: "/assets/sounds/foods/kimbap.mp3" },
];

let currentQuestionIndex = 0; // Simple way to cycle through mock data for sequential calls

// --- Mock API Functions ---

/**
 * Fetches data for the next food game question.
 * Cycles through MOCK_FOOD_ITEMS for variety in sequential calls.
 */
export const getFoodGameData = (): Promise<FoodGameData> => {
  console.log("API: Fetching food game data...");
  return new Promise((resolve) => {
    setTimeout(() => {
      const foodItem = MOCK_FOOD_ITEMS[currentQuestionIndex % MOCK_FOOD_ITEMS.length];
      currentQuestionIndex++;

      // Create plausible distractors, ensuring the correct answer is one of them
      const distractors = MOCK_FOOD_ITEMS.filter(item => item.id !== foodItem.id)
                                         .map(item => item.name)
                                         .sort(() => 0.5 - Math.random()) // Shuffle
                                         .slice(0, 3);

      const options = [foodItem.name, ...distractors].sort(() => 0.5 - Math.random());

      const gameData: FoodGameData = {
        questionId: `q_${foodItem.id}_${new Date().getTime()}`,
        foodItem,
        options,
        correctAnswer: foodItem.name,
      };
      console.log("API: Food game data fetched:", gameData);
      resolve(gameData);
    }, 500); // Simulate network delay
  });
};

/**
 * Submits the results of a completed food game round.
 */
export const submitFoodGameResults = (result: FoodGameRoundResult): Promise<FoodGameSubmitResult> => {
  console.log("API: Submitting food game results:", result);
  return new Promise((resolve) => {
    setTimeout(() => {
      const submitResult: FoodGameSubmitResult = {
        finalScore: result.score,
        message: `Round completed! You scored ${result.score}. Correct: ${result.correctAnswers}/${result.totalQuestions}`,
        // rewards: { experience: result.correctAnswers * 10 }, // Example reward
      };
      console.log("API: Submission result:", submitResult);
      resolve(submitResult);
    }, 500);
  });
};

// Note: Pronunciation sounds are conceptually linked via FoodItem.pronunciationUrl.
// The actual playing of sounds will be handled by a sound service in the component.

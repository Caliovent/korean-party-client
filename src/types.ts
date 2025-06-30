export interface Item {
  id: string;
  name: string; // Korean name, e.g., "사과"
  altText: string; // Alt text for image, e.g., "Image d'une pomme"
  imageUrl: string; // URL for the item's image
}

export interface CustomerRequest {
  itemWanted: Item; // The item the customer wants
  displayText: string; // Text to display, e.g., "사과 주세요"
}

export interface GameRoundData {
  customerRequest: CustomerRequest;
  choices: Item[]; // Array of items the player can choose from
}

export interface NamdaemunMarketSceneProps {
  gameData: GameRoundData;
  score: number;
  onCorrectChoice: (item: Item) => void;
  onIncorrectChoice: (item: Item, isTimeout?: boolean) => void;
  roundTimeLimit: number; // Time limit in seconds for the round
  onRoundTimeout: () => void; // Callback when the round times out
}

export interface NamdaemunGameData {
  // This will represent the whole set of data for a game session
  // For now, let's assume getNamdaemunGameData will return data for a single round,
  // or be called repeatedly for new rounds.
  // If it's for multiple rounds, this structure would be more complex.
  // Let's start with a single round structure, similar to GameRoundData.
  currentRound: GameRoundData;
  totalRounds: number; // Example, if applicable
  timeLimitPerRound: number; // seconds
}

// Mock function signature (implementation will be separate)
// export declare function getNamdaemunGameData(): Promise<NamdaemunGameData>;
// export declare function submitNamdaemunResults(score: number): Promise<void>;

// For the test file, we might need to refine this later.
// The tests currently imply a simpler structure being passed or available.
// Let's adjust based on the test structure for now.

export interface TestGameData {
  customerRequest: string; // Korean name of the item, e.g., "사과"
  choices: Array<{ name: string; altText: string; id: string; imageUrl?: string }>;
  initialScore?: number;
}

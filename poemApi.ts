export interface PoemLine {
  id: string; // Unique ID for the line/slot
  textBefore?: string; // Text before the blank
  textAfter?: string; // Text after the blank
  correctWord: string;
}

export interface PoemPuzzle {
  id: string;
  title: string;
  lines: PoemLine[];
  wordBank: string[];
}

export interface PoemSubmitResult {
  score: number;
  message: string;
  // rewards?: any; // Define if specific reward structure is known
}

// Mock data
const mockPoemData: PoemPuzzle = {
  id: "poem1",
  title: "Éclat Céleste",
  lines: [
    { id: "line1", textBefore: "Les étoiles dans le ciel ", correctWord: "brillent" },
    { id: "line2", textBefore: "Mon cœur ", textAfter: " aussi.", correctWord: "pleure" } // Example: "Mon cœur [pleure] aussi."
  ],
  wordBank: ["brillent", "aussi", "pleure", "vole", "chante", "danse"],
};

// Mock API functions
export const getPoemPuzzleData = (): Promise<PoemPuzzle> => {
  console.log("API: Fetching poem puzzle data...");
  return new Promise((resolve) => {
    setTimeout(() => {
      // In a real app, this would be an API call, e.g., fetch('/api/poem-puzzle')
      resolve(mockPoemData);
      console.log("API: Poem puzzle data fetched:", mockPoemData);
    }, 500);
  });
};

export const submitPoemResults = (
  poemId: string,
  answers: (string | null)[] // Allow null if a slot is not filled
): Promise<PoemSubmitResult> => {
  console.log(`API: Submitting answers for poem ${poemId}:`, answers);
  return new Promise((resolve) => {
    setTimeout(() => {
      let correctCount = 0;
      answers.forEach((answer, index) => {
        if (mockPoemData.lines[index] && answer === mockPoemData.lines[index].correctWord) {
          correctCount++;
        }
      });
      const score = (correctCount / mockPoemData.lines.length) * 100;
      const result: PoemSubmitResult = {
        score: Math.round(score),
        message: `Vous avez obtenu ${correctCount} sur ${mockPoemData.lines.length} réponses correctes !`,
      };
      console.log("API: Submission result:", result);
      resolve(result);
    }, 500);
  });
};

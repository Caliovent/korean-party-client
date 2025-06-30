// FoodFeastScene.test.tsx
// This file will contain the tests for the FoodFeastScene component.
// Tests will be added in subsequent steps according to the TDD mission.

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FoodFeastScene from './FoodFeastScene'; // Will be the actual component

// --- Conceptual Data Structures (for test setup) ---
interface FoodItem {
  id: string;
  name: string;
  imageUrl: string;
  imageAlt: string;
}

interface FoodGameData {
  foodItem: FoodItem;
  options: string[];
  correctAnswer: string;
}

import { waitFor } from '@testing-library/react';
import FoodFeastScene from './FoodFeastScene';
import * as api from './foodApi'; // Import all exports from foodApi
// import soundService from './services/soundService'; // Actual import if used by component

// --- Conceptual Data Structures (already in foodApi.ts, but good for test reference) ---
// interface FoodItem { id: string; name: string; imageUrl: string; imageAlt: string; }
// interface FoodGameData { foodItem: FoodItem; options: string[]; correctAnswer: string; }

// --- Mock API ---
jest.mock('./foodApi'); // Mock the entire foodApi module
const mockedApi = api as jest.Mocked<typeof api>;

// --- Mock Audio Service ---
const mockPlaySound = jest.fn();
// Assuming soundService is a default export from './services/soundService'
// If the component imports it like `import soundService from './services/soundService';`
jest.mock('./services/soundService', () => ({
  __esModule: true,
  default: {
    playSound: mockPlaySound,
    // Mock other methods if FoodFeastScene uses them e.g. loadSounds, stopSound etc.
  },
  // If soundService also exports named things like SOUND_DEFINITIONS and component uses them:
  // SOUND_DEFINITIONS: { GENERIC_SUCCESS: 'success.mp3', NEW_QUESTION: 'new_question.mp3'},
}), { virtual: true }); // Virtual mock is good if the actual service file might not exist or for enforcing the mock


describe('FoodFeastScene', () => {
  const mockRamyeonGameData: api.FoodGameData = { // Use api.FoodGameData for type
    questionId: 'q_ramyeon_test_1',
    foodItem: {
      id: 'ramyeon_01',
      name: '라면',
      imageUrl: '/assets/images/foods/ramyeon.jpg',
      imageAlt: 'Image de Ramyeon',
      pronunciationUrl: '/assets/sounds/foods/ramyeon.mp3'
    },
    options: ['라면', '김치', '비빔밥', '불고기'],
    correctAnswer: '라면',
  };

  beforeEach(() => {
    mockPlaySound.mockClear();
    mockedApi.getFoodGameData.mockReset(); // Reset the main API mock
    mockedApi.submitFoodGameResults.mockReset();
  });

  describe('Scénario 1 : Un plat est présenté (Mode Reconnaissance)', () => {
    test('devrait afficher une image de nourriture et quatre options de texte', async () => {
      mockedApi.getFoodGameData.mockResolvedValue(mockRamyeonGameData);

      render(<FoodFeastScene />);

      // Wait for loading to complete (component fetches data in useEffect)
      // 1. Vérifiez qu'un élément img avec un alt spécifique est à l'écran.
      const foodImage = await screen.findByAltText('Image de Ramyeon');
      expect(foodImage).toBeInTheDocument();
      expect(foodImage).toHaveAttribute('src', mockRamyeonGameData.foodItem.imageUrl);

      // 2. Vérifiez que quatre boutons cliquables contenant les mots en Hangeul sont présents.
      //    The component uses data-testid={`option-button-${option}`}
      for (const option of mockRamyeonGameData.options) {
        const optionButton = await screen.findByTestId(`option-button-${option.replace(/\s+/g, '-')}`);
        expect(optionButton).toBeInTheDocument();
        expect(optionButton).toHaveTextContent(option);
        expect(optionButton).toBeEnabled();
      }

      // Check for score display (even if it's 0 initially)
      expect(screen.getByTestId('score-display')).toHaveTextContent('Score: 0');

      // Optional: Check if a sound was played for new question (if implemented)
      // For now, this is not strictly part of Scenario 1's assertions but good to keep in mind for sound integration step.
      // expect(mockPlaySound).toHaveBeenCalledWith(mockRamyeonGameData.foodItem.pronunciationUrl);
      // OR
      // expect(mockPlaySound).toHaveBeenCalledWith('new_question_generic_sound');
    });
  });

  describe('Scénario 2 : Goût correct !', () => {
    const mockNextFoodItem: api.FoodGameData = {
      questionId: 'q_kimchi_test_1',
      foodItem: {
        id: 'kimchi_01',
        name: '김치',
        imageUrl: '/assets/images/foods/kimchi.jpg',
        imageAlt: 'Image de Kimchi',
        pronunciationUrl: '/assets/sounds/foods/kimchi.mp3'
      },
      options: ['김치', '된장찌개', '삼겹살', '갈비'],
      correctAnswer: '김치',
    };

    // mockGetFoodGameData is already part of mockedApi
    // const mockGetFoodGameData = jest.fn(); // Not needed like this anymore

    test('devrait afficher un feedback de succès et passer à la question suivante après un choix correct', async () => {
      // Setup initial call and subsequent call for getFoodGameData
      mockedApi.getFoodGameData
        .mockResolvedValueOnce(mockRamyeonGameData) // First question
        .mockResolvedValueOnce(mockNextFoodItem);   // Next question

      render(<FoodFeastScene />);
import userEvent from '@testing-library/user-event'; // Ensure userEvent is imported

// ... (mockRamyeonGameData and mockNextFoodItem definitions remain the same) ...

    test('devrait afficher un feedback de succès, augmenter le score, et passer à la question suivante après un choix correct', async () => {
      // Setup initial call and subsequent call for getFoodGameData
      mockedApi.getFoodGameData
        .mockResolvedValueOnce(mockRamyeonGameData) // First question
        .mockResolvedValueOnce(mockNextFoodItem);   // Next question

      const user = userEvent.setup({ delay: null }); // Use userEvent, delay: null for faster tests if needed
      render(<FoodFeastScene />);

      // Wait for the first question (Ramyeon) to load
      const foodImageRamyeon = await screen.findByAltText(mockRamyeonGameData.foodItem.imageAlt);
      expect(foodImageRamyeon).toBeInTheDocument();
      expect(screen.getByTestId('score-display')).toHaveTextContent('Score: 0');

      // Simulate click on the correct option for "Ramyeon"
      const correctButtonRamyeon = await screen.findByTestId(`option-button-${mockRamyeonGameData.correctAnswer.replace(/\s+/g, '-')}`);
      await user.click(correctButtonRamyeon);

      // 1. Vérifiez qu'une animation ou un son de succès est joué
      // Sound for correct answer + sound for selected option pronunciation
      expect(mockPlaySound).toHaveBeenCalledWith('correct_answer');
      if (mockRamyeonGameData.foodItem.pronunciationUrl) { // Check if the clicked item itself has a pronunciation URL
          const clickedItemPronunciation = mockRamyeonGameData.options
              .map(opt => api.MOCK_FOOD_ITEMS.find(item => item.name === opt))
              .find(item => item?.name === mockRamyeonGameData.correctAnswer)?.pronunciationUrl;
          if (clickedItemPronunciation) {
            expect(mockPlaySound).toHaveBeenCalledWith(clickedItemPronunciation);
          }
      }


      // 2. Vérifiez que le score affiché augmente.
      // Feedback message appears, then score updates, then next question after delay
      await waitFor(() => {
        expect(screen.getByTestId('score-display')).toHaveTextContent('Score: 1');
      });
      expect(await screen.findByTestId('feedback-message')).toHaveTextContent('Correct!');


      // 3. Vérifiez que le composant demande un nouveau set de jeu pour la question suivante.
      // getFoodGameData is called once initially, then again for the next question.
      // Wait for the next question (Kimchi) to load, which implies getFoodGameData was called again.
      const foodImageKimchi = await screen.findByAltText(mockNextFoodItem.foodItem.imageAlt, {}, { timeout: 3000 }); // Increased timeout for state changes and setTimeout
      expect(foodImageKimchi).toBeInTheDocument();

      // Verify getFoodGameData was called twice
      expect(mockedApi.getFoodGameData).toHaveBeenCalledTimes(2);

      // Verify sound for new question (Kimchi)
      // This sound plays when the new question data (mockNextFoodItem) is processed.
       await waitFor(() => {
         if (mockNextFoodItem.foodItem.pronunciationUrl) {
            expect(mockPlaySound).toHaveBeenCalledWith(mockNextFoodItem.foodItem.pronunciationUrl);
         } else {
            expect(mockPlaySound).toHaveBeenCalledWith('new_question_default');
         }
       });
    });
  });
});

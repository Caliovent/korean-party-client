import React from 'react';
import { render, screen } from '@testing-library/react';
// Adjust the import path based on your actual file structure
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LostPoemScene from './LostPoemScene';
import * as api from './poemApi'; // Import all exports from poemApi

// Mock the API module
jest.mock('./poemApi');
const mockedApi = api as jest.Mocked<typeof api>;

const mockPoemDataForScenario1: api.PoemPuzzle = {
  id: "poemTest1",
  title: "Test Poème",
  lines: [
    { id: "l1", textBefore: "Les étoiles dans le ciel ", correctWord: "brillent" }, // Slot 1
    { id: "l2", textBefore: "Mon cœur ", textAfter: " brille.", correctWord: "aussi" }  // Slot 2
  ],
  wordBank: ["brillent", "aussi", "pleure", "vole"],
};

describe('LostPoemScene', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockedApi.getPoemPuzzleData.mockReset();
  });

  describe("Scénario 1 : Affichage de l'énigme poétique", () => {
    test("devrait afficher un poème avec des emplacements vides et une banque de mots", async () => {
      mockedApi.getPoemPuzzleData.mockResolvedValue(mockPoemDataForScenario1);

      render(<LostPoemScene />);

      // Wait for loading to complete and poem to be displayed
      expect(await screen.findByText("Test Poème")).toBeInTheDocument();

      // Vérifiez que le texte partiel du poème est visible.
      // For line 1: "Les étoiles dans le ciel [SLOT]"
      expect(screen.getByText(/Les étoiles dans le ciel/i)).toBeInTheDocument();

      // For line 2: "Mon cœur [SLOT] brille."
      expect(screen.getByText(/Mon cœur/i)).toBeInTheDocument();
      expect(screen.getByText(/brille./i)).toBeInTheDocument();


      // Vérifiez qu'il y a bien deux zones de dépôt (les "blancs").
      // The component uses data-testid={`drop-zone-${index}`}
      const dropZones = await screen.findAllByTestId(/drop-zone-\d+/i);
      expect(dropZones).toHaveLength(mockPoemDataForScenario1.lines.length); // Should be 2
      dropZones.forEach(zone => {
        expect(zone).toHaveTextContent("______"); // Initial placeholder text
      });

      // Vérifiez que les mots "brillent", "aussi", etc., sont visibles dans la banque de mots.
      // The component uses data-testid={`word-bank-word-${word}`}
      for (const word of mockPoemDataForScenario1.wordBank) {
        expect(await screen.findByTestId(`word-bank-word-${word}`)).toHaveTextContent(word);
      }

      // Check for the "Vérifier" button
      expect(screen.getByRole('button', { name: /Vérifier/i })).toBeInTheDocument();
    });
  });

  describe("Scénario 2 : Le joueur reçoit le feedback", () => {
    test("devrait afficher les réponses correctes en vert et les incorrectes en rouge après soumission", async () => {
      // This test will be fully implemented when interactivity and submission are added.
      // For now, it will remain similar to the previous failing placeholder.
      // We'll set up the mock API for this scenario once the component uses submitPoemResults.

      mockedApi.getPoemPuzzleData.mockResolvedValue({ // Use a slightly different poem or same, doesn't matter much for placeholder
        id: "poemTest2",
        title: "Feedback Test",
        lines: [
          { id: "fl1", textBefore: "Le chat ", correctWord: "dort" },
          { id: "fl2", textBefore: "La lune ", correctWord: "luit" }
        ],
        wordBank: ["dort", "luit", "mange", "joue"]
      });

      // mockedApi.submitPoemResults.mockResolvedValue({ score: 50, message: "Bien essayé!" });


      render(<LostPoemScene />);
      await screen.findByText("Feedback Test"); // Wait for poem to load

import userEvent from '@testing-library/user-event'; // Import userEvent

// ... (rest of the imports and existing code up to Scenario 2)

  describe("Scénario 2 : Le joueur reçoit le feedback", () => {
    const poemDataForScenario2: api.PoemPuzzle = {
      id: "poemTest2",
      title: "Feedback Test",
      lines: [
        { id: "fl1", textBefore: "Le chat ", correctWord: "dort" }, // Correct: dort
        { id: "fl2", textBefore: "La lune ", correctWord: "luit" }  // Incorrect: mange (user will place)
      ],
      wordBank: ["dort", "luit", "mange", "joue"]
    };

    test("devrait afficher les réponses correctes en vert et les incorrectes en rouge après soumission", async () => {
      mockedApi.getPoemPuzzleData.mockResolvedValue(poemDataForScenario2);
      mockedApi.submitPoemResults.mockResolvedValue({ score: 50, message: "Résultat: 1/2" });

      const user = userEvent.setup();
      render(<LostPoemScene />);

      expect(await screen.findByText("Feedback Test")).toBeInTheDocument();

      // Place "dort" (correct) in the first slot
      await user.click(screen.getByTestId('word-bank-word-dort'));
      await user.click(screen.getByTestId('drop-zone-0'));

      // Place "mange" (incorrect) in the second slot
      await user.click(screen.getByTestId('word-bank-word-mange'));
      await user.click(screen.getByTestId('drop-zone-1'));

      // Click Vérifier button
      const verifyButton = screen.getByTestId('verify-button');
      await user.click(verifyButton);

      // Assertions for feedback
      await waitFor(() => {
        const slot0 = screen.getByTestId('drop-zone-0');
        // Check for style indicating success (e.g., green border or background)
        // These depend on the exact styling implemented in LostPoemScene.tsx
        // Example: expect(slot0).toHaveStyle('border-color: green');
        expect(slot0).toHaveStyle('background-color: #d4edda'); // Light green for correct
        expect(slot0).toHaveTextContent("dort");

        const slot1 = screen.getByTestId('drop-zone-1');
        // Check for style indicating error (e.g., red border or background)
        // Example: expect(slot1).toHaveStyle('border-color: red');
        expect(slot1).toHaveStyle('background-color: #f8d7da'); // Light red for incorrect
        expect(slot1).toHaveTextContent("mange");
      });

      // Verify that submitPoemResults was called
      expect(mockedApi.submitPoemResults).toHaveBeenCalledWith(
        poemDataForScenario2.id,
        ["dort", "mange"] // Expected answers based on clicks
      );

      // Check if results are displayed
      expect(await screen.findByTestId('submission-result')).toBeInTheDocument();
      expect(screen.getByText(/Résultat: 1\/2/i)).toBeInTheDocument();
      expect(screen.getByText(/Score: 50%/i)).toBeInTheDocument();
    });
  });
});

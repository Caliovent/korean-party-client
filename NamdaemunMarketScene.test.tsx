import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import NamdaemunMarketScene from './NamdaemunMarketScene';
import { getNamdaemunGameData } from './src/gameData';
import { GameRoundData } from './src/types';

// Mock callback functions
const mockOnCorrectChoice = vi.fn();
const mockOnIncorrectChoice = vi.fn();
const mockOnRoundTimeout = vi.fn();

const ROUND_TIME_LIMIT = 15; // Match default in GamePage for consistency if used

describe('NamdaemunMarketScene', () => {
  let currentTestGameData: GameRoundData;

  beforeEach(async () => {
    vi.useFakeTimers(); // Use fake timers for controlling setInterval and setTimeout
    currentTestGameData = await getNamdaemunGameData(0); // Apple round
    mockOnCorrectChoice.mockClear();
    mockOnIncorrectChoice.mockClear();
    mockOnRoundTimeout.mockClear();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers(); // Restore real timers
  });

  const renderScene = (gameData: GameRoundData, score: number = 0, timeLimit: number = ROUND_TIME_LIMIT) => {
    return render(
      <NamdaemunMarketScene
        gameData={gameData}
        score={score}
        onCorrectChoice={mockOnCorrectChoice}
        onIncorrectChoice={mockOnIncorrectChoice}
        roundTimeLimit={timeLimit}
        onRoundTimeout={mockOnRoundTimeout}
      />
    );
  };

  describe('Scenario 1: Le client demande un objet', () => {
    it('devrait afficher un client, plusieurs choix d\'objets, score et timer', () => {
      renderScene(currentTestGameData);

      expect(screen.getByTestId('customer-request-text')).toHaveTextContent('사과 주세요');
      expect(screen.getByAltText("Image d'une pomme")).toBeInTheDocument();

      const hatChoice = currentTestGameData.choices.find(choice => choice.id === 'hat');
      if (hatChoice) {
        expect(screen.getByAltText(hatChoice.altText)).toBeInTheDocument();
      } else {
        // Check for any choice if 'hat' is not guaranteed (it should be by mock)
         currentTestGameData.choices.forEach(choice => {
            expect(screen.getByAltText(choice.altText)).toBeInTheDocument();
         });
      }

      expect(screen.getByTestId('score-display')).toHaveTextContent('0');
      expect(screen.getByTestId('time-left')).toHaveTextContent(ROUND_TIME_LIMIT.toString());
      expect(screen.getByTestId('timer-bar')).toHaveStyle(`width: 100%`);
    });
  });

  describe('Scenario 2: Le joueur fait le bon choix', () => {
    it('devrait afficher un feedback positif, appeler onCorrectChoice, et arrêter le timer', async () => {
      renderScene(currentTestGameData, 0);

      const appleImageButton = screen.getByAltText(currentTestGameData.customerRequest.itemWanted.altText).closest('button');
      expect(appleImageButton).not.toBeNull();
      fireEvent.click(appleImageButton!);

      await waitFor(() => {
        expect(screen.getByTestId('feedback-area')).toHaveTextContent('Merci !');
        expect(screen.getByTestId('feedback-area')).toHaveStyle('color: green');
      });
      expect(mockOnCorrectChoice).toHaveBeenCalledWith(currentTestGameData.customerRequest.itemWanted);
      expect(mockOnIncorrectChoice).not.toHaveBeenCalled();

      // Timer should stop, advance time by a bit to see if it changed
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      // Assuming the timer stops, timeLeft should remain what it was when clicked or 0 if logic sets it.
      // The current logic clears interval, so timeLeft stops decrementing.
      // We can check if it's not significantly less than initial, or if buttons are disabled.
      expect(screen.getByTestId('time-left').textContent).not.toBe((ROUND_TIME_LIMIT - 2).toString());
      expect(appleImageButton).toBeDisabled();
    });
  });

  describe('Scenario 3: Le joueur fait le mauvais choix', () => {
    it('devrait afficher un feedback négatif, appeler onIncorrectChoice, et arrêter le timer', async () => {
      renderScene(currentTestGameData, 0);

      const wrongChoice = currentTestGameData.choices.find(c => c.id !== currentTestGameData.customerRequest.itemWanted.id);
      expect(wrongChoice).toBeDefined(); // Ensure we have a wrong choice from mock

      const wrongImageButton = screen.getByAltText(wrongChoice!.altText).closest('button');
      expect(wrongImageButton).not.toBeNull();
      fireEvent.click(wrongImageButton!);

      await waitFor(() => {
        expect(screen.getByTestId('feedback-area')).toHaveTextContent(`Oops! Ce n'est pas ${wrongChoice!.name}. Le client voulait ${currentTestGameData.customerRequest.itemWanted.name}.`);
        expect(screen.getByTestId('feedback-area')).toHaveStyle('color: red');
      });
      expect(mockOnIncorrectChoice).toHaveBeenCalledWith(wrongChoice, false);
      expect(mockOnCorrectChoice).not.toHaveBeenCalled();
      expect(wrongImageButton).toBeDisabled();
    });
  });

  describe('Scenario 4: Timeout du round', () => {
    it('devrait afficher un feedback de timeout, appeler onIncorrectChoice et onRoundTimeout', async () => {
      renderScene(currentTestGameData, 0, 5); // 5s time limit for faster test

      expect(screen.getByTestId('time-left')).toHaveTextContent('5');

      act(() => {
        vi.advanceTimersByTime(5000); // Advance time by 5 seconds
      });

      await waitFor(() => {
        expect(screen.getByTestId('feedback-area')).toHaveTextContent(`Temps écoulé ! Le client voulait ${currentTestGameData.customerRequest.itemWanted.name}.`);
        expect(screen.getByTestId('feedback-area')).toHaveStyle('color: red');
      });

      expect(mockOnIncorrectChoice).toHaveBeenCalledWith(currentTestGameData.customerRequest.itemWanted, true);
      expect(mockOnRoundTimeout).toHaveBeenCalled();
      expect(mockOnCorrectChoice).not.toHaveBeenCalled();

      // Check if buttons are disabled
      const appleImageButton = screen.getByAltText(currentTestGameData.customerRequest.itemWanted.altText).closest('button');
      expect(appleImageButton).toBeDisabled();
    });

    it('le timer bar devrait se mettre à jour correctement', () => {
      renderScene(currentTestGameData, 0, 10);
      expect(screen.getByTestId('timer-bar')).toHaveStyle('width: 100%');

      act(() => { vi.advanceTimersByTime(1000); }); // 1s elapsed
      expect(screen.getByTestId('time-left')).toHaveTextContent('9');
      expect(screen.getByTestId('timer-bar')).toHaveStyle('width: 90%');

      act(() => { vi.advanceTimersByTime(4000); }); // 5s total elapsed
      expect(screen.getByTestId('time-left')).toHaveTextContent('5');
      expect(screen.getByTestId('timer-bar')).toHaveStyle('width: 50%');
      expect(screen.getByTestId('timer-bar')).toHaveStyle('background-color: #f59e0b'); // amber/orange

      act(() => { vi.advanceTimersByTime(3000); }); // 8s total elapsed
      expect(screen.getByTestId('time-left')).toHaveTextContent('2');
      expect(screen.getByTestId('timer-bar')).toHaveStyle('width: 20%');
      expect(screen.getByTestId('timer-bar')).toHaveStyle('background-color: #ef4444'); // red

      act(() => { vi.advanceTimersByTime(2000); }); // 10s total elapsed - timeout
      expect(screen.getByTestId('time-left')).toHaveTextContent('0');
      expect(screen.getByTestId('timer-bar')).toHaveStyle('width: 0%');
    });
  });
});

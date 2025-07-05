// FoodFeastScene.tsx
import React, { useState, useEffect } from 'react';
// MOCK_FOOD_ITEMS might still be needed if options have pronunciation URLs not included in challengeData
import { MOCK_FOOD_ITEMS } from './foodApi'; // Assuming FoodItem type is also here or defined below
import soundService from './src/services/soundService';
import type { FoodItem } from './foodApi'; // Ensure FoodItem is imported if not part of ChallengeData structure directly

import { MOCK_FOOD_ITEMS } from './foodApi'; // Assuming FoodItem type is also here or defined below
import soundService from './src/services/soundService';
import type { FoodItem } from './foodApi'; // Ensure FoodItem is imported if not part of ChallengeData structure directly
import type { Game } from './src/types/game'; // Import Game type
import { broadcastAction } from './src/services/gameService'; // Import broadcastAction

// Define the structure of the challenge data passed from GamePage
// This should align with what `currentChallengeData` will hold for this mini-game
export interface FoodFeastChallengeData {
  questions: FoodGameQuestion[]; // Array of questions
  // Add any other global challenge settings if needed
}

// Single question structure, similar to FoodGameData but part of an array
export interface FoodGameQuestion {
  foodItem: FoodItem; // The item to identify (image, name for alt text)
  options: string[];    // Array of answer choices (names of food items)
  correctAnswer: string; // The correct food item name
  // Add pronunciationUrl directly here if it's per question and not globally in FoodItem
}

interface FoodFeastSceneProps {
  challengeData: FoodFeastChallengeData;
  onFinish: (score: number, totalQuestions: number) => Promise<void>; // Pass score and total to onFinish
  isSpectator?: boolean;
  game?: Game;
}

// Defines the state of feedback after an answer
type FeedbackState = {
  message: string;
  isCorrect: boolean;
  show: boolean;
  clickedOption: string | null;
};

const FoodFeastScene: React.FC<FoodFeastSceneProps> = ({ challengeData, onFinish, isSpectator = false, game }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false); // If the current question has been answered
  const [isChallengeOver, setIsChallengeOver] = useState<boolean>(false);
  const [spectatorClickedOption, setSpectatorClickedOption] = useState<string | null>(null);

  const totalQuestions = challengeData.questions.length;
  const currentQuestion = challengeData.questions[currentQuestionIndex];
  const activePlayer = game?.players.find(p => p.uid === game.currentPlayerId);
  const activePlayerName = activePlayer ? activePlayer.displayName : 'Joueur actif';

  // Effect to play sound for new question if pronunciationUrl is available
  useEffect(() => {
    if (!isSpectator && currentQuestion?.foodItem.pronunciationUrl) {
      soundService.playSound(currentQuestion.foodItem.pronunciationUrl);
    } else if (!isSpectator && currentQuestion) {
      // Fallback sound if specific pronunciation isn't available but question exists
      soundService.playSound('new_question_default');
    }
    // Reset feedback and answered state when question changes
    setFeedback(null);
    setIsAnswered(false);
    setSpectatorClickedOption(null);
  }, [currentQuestionIndex, currentQuestion, isSpectator]);

  // Effect for spectator mode to react to live state changes
  useEffect(() => {
    if (isSpectator && game?.miniGameLiveState) {
      const { lastAction, payload } = game.miniGameLiveState;
      if (lastAction === 'ANSWER_CLICKED' && payload?.answer) {
        setSpectatorClickedOption(payload.answer);
        // Simulate feedback for spectator
        const isCorrect = payload.answer === currentQuestion?.correctAnswer;
        setFeedback({
          message: isCorrect ? "L'autre joueur a choisi correctement!" : `L'autre joueur a choisi ${payload.answer}. La bonne réponse était: ${currentQuestion?.correctAnswer}`,
          isCorrect,
          show: true,
          clickedOption: payload.answer,
        });
        setIsAnswered(true); // Mark as answered to show feedback styling

        // Potentially advance question for spectator after a delay
        setTimeout(() => {
          // Check if this logic aligns with how active player advances
           if (currentQuestionIndex < totalQuestions - 1) {
            // This might need to be driven by a state update rather than direct advancement
            // setCurrentQuestionIndex(prevIndex => prevIndex + 1);
            // For now, let the active player's progression dictate the spectator's view via game state updates
            // or assume the game state itself will soon reflect the next question for all.
            // If not, a more robust solution would be to listen for 'NEXT_QUESTION' action.
          } else {
            // setIsChallengeOver(true); // Let onFinish handle this
          }
        }, 2000);
      }
    }
  }, [isSpectator, game?.miniGameLiveState, currentQuestion, currentQuestionIndex, totalQuestions]);


  const advanceToNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
    } else {
      setIsChallengeOver(true);
      if (!isSpectator) {
        onFinish(score, totalQuestions); // Call onFinish with final score for active player
      }
    }
  };

  const handleOptionClick = async (selectedOption: string) => {
    if (!currentQuestion || isAnswered || isSpectator) return;

    setIsAnswered(true);
    const isCorrect = selectedOption === currentQuestion.correctAnswer;

    if (game?.id) {
      try {
        await broadcastAction({
          gameId: game.id,
          action: 'ANSWER_CLICKED',
          payload: { answer: selectedOption, questionIndex: currentQuestionIndex },
        });
      } catch (error) {
        console.error("Error broadcasting action:", error);
        // Handle error, maybe show a message to the user
      }
    }

    if (isCorrect) {
      setScore(prevScore => prevScore + 1);
      setFeedback({ message: "Correct!", isCorrect: true, show: true, clickedOption: selectedOption });
      soundService.playSound('correct_answer');
    } else {
      setFeedback({
        message: `Incorrect. La bonne réponse était: ${currentQuestion.correctAnswer}`,
        isCorrect: false,
        show: true,
        clickedOption: selectedOption
      });
      soundService.playSound('incorrect_answer');
    }

    const clickedFoodItemDetails = MOCK_FOOD_ITEMS.find((item: FoodItem) => item.name === selectedOption);
    if (clickedFoodItemDetails?.pronunciationUrl) {
       soundService.playSound(clickedFoodItemDetails.pronunciationUrl);
    }

    setTimeout(() => {
      advanceToNextQuestion();
    }, 2000); // 2-second delay for feedback
  };

  if (isChallengeOver) {
    // Spectators will see this when the game state updates to show challenge is over for active player
    return (
      <div className="food-feast-scene" style={{ padding: '20px', fontFamily: 'Arial, sans-serif', textAlign: 'center' }}>
        <h2>Défi Terminé{isSpectator ? ` pour ${activePlayerName}` : ''}!</h2>
        {!isSpectator && <p style={{fontSize: '1.2em', margin: '20px'}}>Votre score : {score} / {totalQuestions}</p>}
        {isSpectator && game?.miniGameLiveState?.payload?.finalScore !== undefined && (
            <p style={{fontSize: '1.2em', margin: '20px'}}>Score de {activePlayerName}: {game.miniGameLiveState.payload.finalScore} / {totalQuestions}</p>
        )}
        <p>Retour au jeu principal...</p>
      </div>
    );
  }

  if (!currentQuestion) {
    return <div>Chargement du défi...</div>;
  }

  return (
    <div className="food-feast-scene" style={{ padding: '20px', fontFamily: 'Arial, sans-serif', textAlign: 'center' }}>
      {isSpectator && (
        <div style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '5px', marginBottom: '15px', border: '1px solid #ccc' }}>
          Vous observez {activePlayerName}...
        </div>
      )}
      <h2>Festin des Mots Coréens! (Question {currentQuestionIndex + 1}/{totalQuestions})</h2>
      {!isSpectator && <div data-testid="score-display" style={{ margin: '10px', fontSize: '1.2em' }}>Score: {score}</div>}

      <div className="question-area" style={{ margin: '20px 0', minHeight: '310px' }}>
        <img
          data-testid="food-image"
          src={currentQuestion.foodItem.imageUrl}
          alt={currentQuestion.foodItem.imageAlt}
          style={{ maxWidth: '300px', maxHeight: '300px', border: '1px solid #ccc', borderRadius: '8px', display: 'block', margin: '0 auto' }}
        />
      </div>

      {feedback?.show && (
        <div
          data-testid="feedback-message"
          style={{
            margin: '15px 0',
            padding: '10px',
            borderRadius: '5px',
            backgroundColor: feedback.isCorrect ? '#d4edda' : '#f8d7da',
            color: feedback.isCorrect ? '#155724' : '#721c24',
            fontWeight: 'bold'
          }}
        >
          {feedback.message}
        </div>
      )}

      <div className="options-container" data-testid="options-container" style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginTop: feedback?.show ? '10px' : '20px' }}>
        {currentQuestion.options.map((option, index) => {
          const isButtonDisabled = isAnswered || isSpectator;
          let buttonStyle: React.CSSProperties = {
            padding: '10px 20px',
            fontSize: '1.1em',
            minWidth: '100px',
            cursor: isButtonDisabled ? 'default' : 'pointer',
            pointerEvents: isSpectator ? 'none' : 'auto', // Disable clicks for spectators via CSS
          };

          // Determine the option clicked, either by active player or reflected for spectator
          const optionClickedForDisplay = isSpectator ? spectatorClickedOption : feedback?.clickedOption;

          if (isAnswered && optionClickedForDisplay === option) {
            // Highlight based on feedback if available (e.g. active player's own feedback, or simulated for spectator)
            if (feedback) {
              buttonStyle.backgroundColor = feedback.isCorrect ? 'lightgreen' : 'lightcoral';
              buttonStyle.fontWeight = 'bold';
            } else if (isSpectator) {
              // Fallback for spectator if feedback state isn't perfectly synced, just show selection
              buttonStyle.backgroundColor = 'lightblue'; // Generic highlight for spectator's observed click
              buttonStyle.fontWeight = 'bold';
            }
          } else if (isAnswered && option === currentQuestion.correctAnswer && feedback && !feedback.isCorrect) {
            // If answered incorrectly, and this is the correct answer, highlight it
            buttonStyle.backgroundColor = 'lightgreen';
          } else if (isAnswered) {
            buttonStyle.opacity = 0.7;
          }

          // Spectator specific highlighting if no feedback has been processed yet but an action is known
          if (isSpectator && spectatorClickedOption === option && !feedback?.show) {
            buttonStyle.border = '2px solid blue'; // Example: blue border for observed selection
          }


          return (
            <button
              key={index}
              data-testid={`option-button-${option.replace(/\s+/g, '-')}`}
              onClick={() => handleOptionClick(option)}
              disabled={isButtonDisabled}
              style={buttonStyle}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FoodFeastScene;

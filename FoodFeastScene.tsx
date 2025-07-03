// FoodFeastScene.tsx
import React, { useState, useEffect } from 'react';
// MOCK_FOOD_ITEMS might still be needed if options have pronunciation URLs not included in challengeData
import { MOCK_FOOD_ITEMS } from './foodApi'; // Assuming FoodItem type is also here or defined below
import soundService from './src/services/soundService';
import type { FoodItem } from './foodApi'; // Ensure FoodItem is imported if not part of ChallengeData structure directly

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
}

// Defines the state of feedback after an answer
type FeedbackState = {
  message: string;
  isCorrect: boolean;
  show: boolean;
  clickedOption: string | null;
};

const FoodFeastScene: React.FC<FoodFeastSceneProps> = ({ challengeData, onFinish }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false); // If the current question has been answered
  const [isChallengeOver, setIsChallengeOver] = useState<boolean>(false);

  const totalQuestions = challengeData.questions.length;
  const currentQuestion = challengeData.questions[currentQuestionIndex];

  // Effect to play sound for new question if pronunciationUrl is available
  useEffect(() => {
    if (currentQuestion?.foodItem.pronunciationUrl) {
      soundService.playSound(currentQuestion.foodItem.pronunciationUrl);
    } else if (currentQuestion) {
      // Fallback sound if specific pronunciation isn't available but question exists
      soundService.playSound('new_question_default');
    }
    // Reset feedback and answered state when question changes
    setFeedback(null);
    setIsAnswered(false);
  }, [currentQuestionIndex, currentQuestion]);


  const advanceToNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
    } else {
      setIsChallengeOver(true);
      onFinish(score, totalQuestions); // Call onFinish with final score
    }
  };

  const handleOptionClick = (selectedOption: string) => {
    if (!currentQuestion || isAnswered) return;

    setIsAnswered(true);
    const isCorrect = selectedOption === currentQuestion.correctAnswer;

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
    return (
      <div className="food-feast-scene" style={{ padding: '20px', fontFamily: 'Arial, sans-serif', textAlign: 'center' }}>
        <h2>Défi Terminé!</h2>
        <p style={{fontSize: '1.2em', margin: '20px'}}>Votre score : {score} / {totalQuestions}</p>
        {/* The onFinish prop is called, GamePage will handle exiting/next steps */}
        <p>Retour au jeu principal...</p>
      </div>
    );
  }

  if (!currentQuestion) {
    // This case should ideally not be reached if challengeData is validated upstream
    // or if isChallengeOver is handled correctly.
    return <div>Chargement du défi... ou défi invalide.</div>;
  }

  return (
    <div className="food-feast-scene" style={{ padding: '20px', fontFamily: 'Arial, sans-serif', textAlign: 'center' }}>
      <h2>Festin des Mots Coréens! (Question {currentQuestionIndex + 1}/{totalQuestions})</h2>
      <div data-testid="score-display" style={{ margin: '10px', fontSize: '1.2em' }}>Score: {score}</div>

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
          let buttonStyle: React.CSSProperties = { padding: '10px 20px', fontSize: '1.1em', minWidth: '100px', cursor: isAnswered ? 'default' : 'pointer' };
          if (isAnswered && feedback?.clickedOption === option) {
            buttonStyle.backgroundColor = feedback.isCorrect ? 'lightgreen' : 'lightcoral';
            buttonStyle.fontWeight = 'bold';
          } else if (isAnswered && option === currentQuestion.correctAnswer && !feedback?.isCorrect) {
            buttonStyle.backgroundColor = 'lightgreen';
          } else if (isAnswered) {
            buttonStyle.opacity = 0.7;
          }

          return (
            <button
              key={index}
              data-testid={`option-button-${option.replace(/\s+/g, '-')}`}
              onClick={() => handleOptionClick(option)}
              disabled={isAnswered}
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

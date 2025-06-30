// FoodFeastScene.tsx
import React, { useState, useEffect } from 'react';
// Assuming foodApi.ts is in the same directory & MOCK_FOOD_ITEMS is exported
import type { FoodGameData, FoodGameSubmitResult, FoodGameRoundResult, FoodItem } from './foodApi';
import { getFoodGameData, MOCK_FOOD_ITEMS, submitFoodGameResults } from './foodApi';
import soundService from './src/services/soundService';

interface FoodFeastSceneProps {
  onFinish: () => Promise<void>;
}

// Defines the state of feedback after an answer
type FeedbackState = {
  message: string;
  isCorrect: boolean;
  show: boolean;
  clickedOption: string | null;
};

const FoodFeastScene: React.FC<FoodFeastSceneProps> = ({ onFinish }) => { // Added gameId and onFinish to props destructuring
  const [gameData, setGameData] = useState<FoodGameData | null>(null);
  const [score, setScore] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [questionsAnswered, setQuestionsAnswered] = useState<number>(0);
  const [isRoundOver, setIsRoundOver] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<FoodGameSubmitResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);


  const QUESTIONS_PER_ROUND = 5; // Define how many questions make a round

  const handleGameEnd = async () => {
    setIsSubmitting(true);
    try {
      const roundResult: FoodGameRoundResult = {
        score,
        correctAnswers: score, // Assuming 1 point per correct answer
        totalQuestions: QUESTIONS_PER_ROUND,
      };
      const result = await submitFoodGameResults(roundResult);
      setSubmissionResult(result);
      onFinish(); // Call onFinish after successful submission
    } catch (e) {
      console.error("Failed to submit game results:", e);
      setSubmissionResult({ finalScore: score, message: "Erreur lors de la soumission du score." });
      // Consider if onFinish() should be called even on error, depends on desired game flow
      // For now, calling it only on success. If it should always be called, move to finally block.
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetGame = () => {
    setScore(0);
    setQuestionsAnswered(0);
    setIsRoundOver(false);
    setSubmissionResult(null);
    setFeedback(null);
    setIsAnswered(false);
    // setLoading(true); // fetchNewQuestion will set it
    fetchNewQuestion(); // Fetch the first question for the new round
  };

  const fetchNewQuestion = () => {
    if (questionsAnswered >= QUESTIONS_PER_ROUND && !isRoundOver) { // Ensure isRoundOver is set only once
      setIsRoundOver(true);
      setLoading(false);
      handleGameEnd(); // Call submission logic when round is effectively over
      return;
    }
    if (isRoundOver) { // If round is already marked over, don't fetch
        setLoading(false);
        return;
    }

    setLoading(true);
    setError(null);
    setFeedback(null); // Clear previous feedback
    setIsAnswered(false); // Re-enable options for new question

    getFoodGameData()
      .then(data => {
        setGameData(data);
        setLoading(false);
        // Play sound for new question display
        if (data.foodItem.pronunciationUrl) {
          soundService.playSound(data.foodItem.pronunciationUrl);
        } else {
          // Fallback sound if specific pronunciation isn't available
          soundService.playSound('new_question_default');
        }
      })
      .catch(err => {
        console.error("Failed to load food game data:", err);
        setError("Impossible de charger la question. Veuillez réessayer.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchNewQuestion();
  }, []);

  const handleOptionClick = (selectedOption: string) => {
    if (!gameData || isAnswered) return; // Don't process if no data or already answered

    setIsAnswered(true);
    const isCorrect = selectedOption === gameData.correctAnswer;

    if (isCorrect) {
      setScore(prevScore => prevScore + 1);
      setFeedback({ message: "Correct!", isCorrect: true, show: true, clickedOption: selectedOption });
      soundService.playSound('correct_answer'); // Generic success sound
    } else {
      setFeedback({
        message: `Incorrect. La bonne réponse était: ${gameData.correctAnswer}`,
        isCorrect: false,
        show: true,
        clickedOption: selectedOption
      });
      soundService.playSound('incorrect_answer'); // Generic failure sound
    }

    // Play pronunciation sound of the selected option (if available and desired)
    const clickedFoodItemDetails = MOCK_FOOD_ITEMS.find((item: FoodItem) => item.name === selectedOption); // Assuming MOCK_FOOD_ITEMS is accessible or options have pronunciation URLs
    if (clickedFoodItemDetails?.pronunciationUrl) {
       soundService.playSound(clickedFoodItemDetails.pronunciationUrl);
    }


    // TODO: In next step (Game Flow), add logic to fetch next question after a delay
    // For now, feedback is shown, and options are disabled.
    setTimeout(() => {
      setQuestionsAnswered(prev => prev + 1); // Increment before fetching or checking round over
      fetchNewQuestion();
    }, 2000); // 2-second delay for feedback
  };

  if (loading && !isRoundOver) { // Only show loading if not round over
    return <div aria-live="polite">Chargement de la question...</div>;
  }

  if (error) {
    return <div role="alert" style={{ color: 'red' }}>{error}</div>;
  }

  if (isRoundOver) {
    return (
      <div className="food-feast-scene" style={{ padding: '20px', fontFamily: 'Arial, sans-serif', textAlign: 'center' }}>
        <h2>Round Terminé!</h2>
        {isSubmitting && <p>Envoi des résultats...</p>}
        {submissionResult && (
          <div data-testid="submission-result-message" style={{ margin: '20px 0', padding: '15px', border: '1px solid #007bff', borderRadius: '5px', backgroundColor: '#e7f3ff'}}>
            <p><strong>Résultat Final: {submissionResult.finalScore}</strong></p>
            {submissionResult.message && <p>{submissionResult.message}</p>}
            {/* Display rewards if any: {submissionResult.rewards?.experience} XP */}
          </div>
        )}
        <p style={{fontSize: '1.2em', margin: '20px'}}>Votre score : {score} / {QUESTIONS_PER_ROUND}</p>
        <button
          onClick={resetGame}
          style={{ padding: '10px 20px', fontSize: '1.1em', marginRight: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px' }}
        >
          Rejouer
        </button>
        {/* Optional: <button onClick={() => navigate('/hub')}>Retour au Hub</button> */}
      </div>
    );
  }

  if (!gameData) {
    return <div>Aucune donnée de jeu disponible.</div>;
  }

  return (
    <div className="food-feast-scene" style={{ padding: '20px', fontFamily: 'Arial, sans-serif', textAlign: 'center' }}>
      <h2>Festin des Mots Coréens! (Question {questionsAnswered + 1}/{QUESTIONS_PER_ROUND})</h2>
      <div data-testid="score-display" style={{ margin: '10px', fontSize: '1.2em' }}>Score: {score}</div>

      <div className="question-area" style={{ margin: '20px 0', minHeight: '310px' /* Prevents layout jump for feedback */ }}>
        <img
          data-testid="food-image"
          src={gameData.foodItem.imageUrl}
          alt={gameData.foodItem.imageAlt}
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
            backgroundColor: feedback.isCorrect ? '#d4edda' : '#f8d7da', // Green for correct, Red for incorrect
            color: feedback.isCorrect ? '#155724' : '#721c24',
            fontWeight: 'bold'
          }}
        >
          {feedback.message}
        </div>
      )}

      <div className="options-container" data-testid="options-container" style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginTop: feedback?.show ? '10px' : '20px' }}>
        {gameData.options.map((option, index) => {
          let buttonStyle: React.CSSProperties = { padding: '10px 20px', fontSize: '1.1em', minWidth: '100px', cursor: isAnswered ? 'default' : 'pointer' };
          if (isAnswered && feedback?.clickedOption === option) {
            buttonStyle.backgroundColor = feedback.isCorrect ? 'lightgreen' : 'lightcoral';
            buttonStyle.fontWeight = 'bold';
          } else if (isAnswered && option === gameData.correctAnswer && !feedback?.isCorrect) {
            // Highlight correct answer if user chose incorrectly
            buttonStyle.backgroundColor = 'lightgreen';
          } else if (isAnswered) {
            buttonStyle.opacity = 0.7; // Dim other options
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
      {/* Next question button will be added in game flow step */}
    </div>
  );
};

export default FoodFeastScene;

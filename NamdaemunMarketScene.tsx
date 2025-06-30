import React, { useState, useEffect, useRef } from 'react';
import { NamdaemunMarketSceneProps, Item } from './src/types';

// Assuming Tone.js might be globally available or via import * as Tone from 'tone';
// For robust sound, proper Tone.js setup (like Tone.start()) in the parent GamePage is recommended.
declare var Tone: any; // Allow Tone to be used if loaded globally e.g. via CDN

const playSound = (type: 'success' | 'error') => {
  try {
    if (typeof Tone !== 'undefined' && Tone.Synth) {
      if (type === 'success') {
        const synth = new Tone.Synth({
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.005, decay: 0.1, sustain: 0.05, release: 0.1 },
        }).toDestination();
        synth.triggerAttackRelease('C5', '8n', Tone.now());
        setTimeout(() => synth.dispose(), 200); // Clean up synth
      } else if (type === 'error') {
        const synth = new Tone.Synth({
          oscillator: { type: 'square' },
          envelope: { attack: 0.005, decay: 0.2, sustain: 0, release: 0.2 },
        }).toDestination();
        synth.triggerAttackRelease('A2', '8n', Tone.now());
        setTimeout(() => synth.dispose(), 300); // Clean up synth
      }
    } else {
      console.log(`Fallback: Play ${type} sound (Tone.js not available or Synth not found)`);
    }
  } catch (e) {
    console.error("Error playing sound with Tone.js:", e);
  }
};

const NamdaemunMarketScene: React.FC<NamdaemunMarketSceneProps> = ({
  gameData,
  score,
  onCorrectChoice,
  onIncorrectChoice,
  roundTimeLimit, // seconds
  onRoundTimeout,
}) => {
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [isInteractable, setIsInteractable] = useState<boolean>(true);
  const [timeLeft, setTimeLeft] = useState<number>(roundTimeLimit);
  const [showCorrectEffect, setShowCorrectEffect] = useState<string | null>(null); // item.id for effect

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setFeedbackMessage('');
    setIsInteractable(true);
    setTimeLeft(roundTimeLimit);
    setShowCorrectEffect(null);

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          handleTimeout();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [gameData, roundTimeLimit]);

  const handleTimeout = () => {
    if (!isInteractable) return;
    setIsInteractable(false);
    const wantedItemName = gameData?.customerRequest?.itemWanted?.name || 'l\'article demandé';
    setFeedbackMessage(`Temps écoulé ! Le client voulait ${wantedItemName}.`);
    playSound('error');
    if (gameData) onIncorrectChoice(gameData.customerRequest.itemWanted, true);
    onRoundTimeout();
  };

  const handleChoiceClick = (item: Item) => {
    if (!isInteractable || !gameData) return;

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsInteractable(false);

    if (item.id === gameData.customerRequest.itemWanted.id) {
      setFeedbackMessage('Merci !');
      playSound('success');
      setShowCorrectEffect(item.id);
      onCorrectChoice(item);
    } else {
      const wantedItemName = gameData?.customerRequest?.itemWanted?.name || 'l\'article demandé';
      setFeedbackMessage(`Oops! Ce n'est pas ${item.name}. Le client voulait ${wantedItemName}.`);
      playSound('error');
      onIncorrectChoice(item, false);
    }
  };

  const timerBarPercentage = roundTimeLimit > 0 ? (timeLeft / roundTimeLimit) * 100 : 0;

  // Basic styles - ideally these would be in a CSS file or use a styling library
  const sceneStyle: React.CSSProperties = {
    fontFamily: "'Inter', 'Malgun Gothic', sans-serif", // From example
    padding: '20px',
    border: '1px solid #e2e8f0', // Tailwind gray-300
    borderRadius: '12px', // Tailwind rounded-xl
    maxWidth: '600px',
    margin: '20px auto',
    backgroundColor: '#fff', // White background
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)' // Tailwind shadow-xl
  };
  const headerStyle: React.CSSProperties = { fontSize: '28px', textAlign: 'center', color: '#854d0e', marginBottom: '10px' }; // Amber-700
  const requestTextStyle: React.CSSProperties = { fontSize: '22px', fontWeight: 'bold', color: '#4a5568', marginBottom: '5px' }; // Gray-700
  const buttonBaseStyle: React.CSSProperties = {
    border: '2px solid #cbd5e0', // Tailwind gray-400
    borderRadius: '8px', padding: '10px', backgroundColor: 'white',
    cursor: 'pointer', minWidth: '130px', textAlign: 'center',
    transition: 'all 0.2s ease-in-out', // From example
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  };
   const buttonHoverStyle: string = `
    .choice-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
      border-color: #60a5fa; /* blue-400 */
    }
    .choice-button:disabled {
      opacity: 0.6;
      cursor: default;
    }
    .choice-button.correct-choice-effect {
      animation: pulseCorrect 0.6s ease-out;
      border-color: #10B981; /* green-500 */
      box-shadow: 0 0 15px rgba(16, 185, 129, 0.5);
    }
    @keyframes pulseCorrect {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
  `;

  if (!gameData) return <div style={sceneStyle}>Chargement du jeu...</div>;
  const { customerRequest, choices } = gameData;

  return (
    <>
      <style>{buttonHoverStyle}</style>
      <div style={sceneStyle}>
        <header style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #f3f4f6' }}> {/* gray-100 */}
          <h1 style={headerStyle}>Au Marché de Namdaemun !</h1>
        </header>

        <div id="gameScreen" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 5px' }}>
            <div id="timerDisplay" style={{ fontSize: '18px', fontWeight: '600', color: '#4a5568' }}> {/* gray-700 */}
              Temps: <span data-testid="time-left" style={{ color: timeLeft <= 5 ? '#ef4444' : '#3b82f6' }}>{timeLeft}</span>s {/* red-500 / blue-500 */}
            </div>
            <div id="scoreArea" style={{ fontSize: '20px', fontWeight: 'bold', color: '#854d0e' }}> {/* amber-700 */}
              Score: <span data-testid="score-display">{score}</span>
            </div>
          </div>

          <div id="timerBarContainer" style={{ width: '100%', backgroundColor: '#e5e7eb', borderRadius: '6px', height: '12px', marginBottom: '20px', overflow: 'hidden' }}>
            <div data-testid="timer-bar" style={{ height: '100%', backgroundColor: timerBarPercentage < 30 ? '#ef4444' : timerBarPercentage < 60 ? '#f59e0b' : '#3b82f6', width: `${timerBarPercentage}%`, transition: 'width 0.2s linear, background-color 0.5s linear', borderRadius: '6px'}}/>
          </div>

          {customerRequest && (
            <div id="customerRequestArea" style={{ marginBottom: '25px', padding: '15px', backgroundColor: '#fffbeb', borderRadius: '8px', textAlign: 'center', border: '1px dashed #fcd34d' }}> {/* amber-50 / amber-300 */}
              <p style={requestTextStyle} data-testid="customer-request-text">{customerRequest.displayText}</p>
              <span style={{ fontSize: '0.9rem', color: '#78716c' }}>({customerRequest.itemWanted.altText.replace("Image d'une ", "").replace("Image d'un ", "")})</span> {/* stone-500 */}
            </div>
          )}

          <div id="choicesArea" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '15px', marginBottom: '20px' }}>
            {choices && choices.map((item) => (
              <button
                key={item.id}
                className={`choice-button ${showCorrectEffect === item.id ? 'correct-choice-effect' : ''}`}
                onClick={() => handleChoiceClick(item)}
                disabled={!isInteractable}
                style={buttonBaseStyle}
              >
                <img src={item.imageUrl || `https://placehold.co/100x100/E2E8F0/4A5568?text=${encodeURIComponent(item.name)}`} alt={item.altText} style={{ width: '100px', height: '100px', objectFit: 'cover', marginBottom: '8px', borderRadius: '6px' }} />
                <p style={{ fontSize: '1rem', color: '#374151', margin: 0, fontWeight: 500 }}>{item.name}</p> {/* gray-700 */}
              </button>
            ))}
          </div>

          <div data-testid="feedback-area" style={{ marginTop: '20px', textAlign: 'center', minHeight: '40px', fontWeight: '600', padding: '12px', borderRadius: '8px', fontSize: '1.1rem', color: feedbackMessage.startsWith('Merci') ? '#059669' : feedbackMessage ? '#dc2626' : 'transparent', backgroundColor: feedbackMessage ? (feedbackMessage.startsWith('Merci') ? '#d1fae5' : '#fee2e2') : 'transparent', transition: 'all 0.3s ease' }}> {/* green-600/100, red-600/100 */}
            {feedbackMessage}
          </div>
        </div>
      </div>
    </>
  );
};

export default NamdaemunMarketScene;

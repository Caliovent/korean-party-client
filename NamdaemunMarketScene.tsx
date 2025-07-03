import React, { useState, useEffect, useRef } from 'react';
import type { NamdaemunMarketSceneProps, Item, NamdaemunGameData } from './src/types'; // Added NamdaemunGameData
import type { Game } from './src/types/game'; // Import Game type
import { broadcastAction } from './src/services/gameService'; // Import broadcastAction

// Assuming Tone.js might be globally available or via import * as Tone from 'tone';
// For robust sound, proper Tone.js setup (like Tone.start()) in the parent GamePage is recommended.
declare var Tone: any; // Allow Tone to be used if loaded globally e.g. via CDN

const playSound = (type: 'success' | 'error', isSpectator: boolean) => {
  if (isSpectator) return; // Spectators don't trigger sounds locally based on active player's actions
  try {
    if (typeof Tone !== 'undefined' && Tone.Synth) {
      if (type === 'success') {
        const synth = new Tone.Synth({
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.005, decay: 0.1, sustain: 0.05, release: 0.1 },
        }).toDestination();
        synth.triggerAttackRelease('C5', '8n', Tone.now());
        setTimeout(() => synth.dispose(), 200);
      } else if (type === 'error') {
        const synth = new Tone.Synth({
          oscillator: { type: 'square' },
          envelope: { attack: 0.005, decay: 0.2, sustain: 0, release: 0.2 },
        }).toDestination();
        synth.triggerAttackRelease('A2', '8n', Tone.now());
        setTimeout(() => synth.dispose(), 300);
      }
    } else {
      console.log(`Fallback: Play ${type} sound (Tone.js not available or Synth not found)`);
    }
  } catch (e) {
    console.error("Error playing sound with Tone.js:", e);
  }
};

// Modify props to include isSpectator and game (for gameId and active player name)
interface ExtendedNamdaemunMarketSceneProps extends NamdaemunMarketSceneProps {
  isSpectator?: boolean;
  game?: Game; // Making game prop available for gameId and player info
}

const NamdaemunMarketScene: React.FC<ExtendedNamdaemunMarketSceneProps> = ({
  onFinish,
  gameData, // This is current round data
  score,    // This is active player's current score
  onCorrectChoice,
  onIncorrectChoice,
  roundTimeLimit, // seconds
  onRoundTimeout,
  isSpectator = false,
  game, // game state from GamePage
}) => {
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [isInteractable, setIsInteractable] = useState<boolean>(!isSpectator); // Spectators cannot interact
  const [timeLeft, setTimeLeft] = useState<number>(roundTimeLimit);
  const [showCorrectEffect, setShowCorrectEffect] = useState<string | null>(null);
  const [spectatorAction, setSpectatorAction] = useState<{itemId: string, isCorrect: boolean} | null>(null);


  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activePlayer = game?.players.find(p => p.uid === game.currentPlayerId);
  const activePlayerName = activePlayer ? activePlayer.displayName : 'Joueur actif';

  // Effect for timer and gameData reset
  useEffect(() => {
    setFeedbackMessage('');
    setIsInteractable(!isSpectator); // Ensure interactability is reset based on spectator status
    setTimeLeft(roundTimeLimit);
    setShowCorrectEffect(null);
    setSpectatorAction(null);

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    // Timer should only run for the active player, or if explicitly synced for spectators
    // For simplicity, spectator's timer might just mirror, or be less critical.
    // The backend should ultimately decide round progression.
    // If this scene instance is for an active player, start the timer.
    if (!isSpectator) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            handleTimeout(); // Active player timed out
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }

    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [gameData, roundTimeLimit, isSpectator]); // Added isSpectator

  // Effect for spectator mode actions
  useEffect(() => {
    if (isSpectator && game?.miniGameLiveState) {
      const { lastAction, payload } = game.miniGameLiveState;
      if (lastAction === 'NAMDAEMUN_CHOICE' && payload?.itemId && gameData) {
        const chosenItem = gameData.choices.find(c => c.id === payload.itemId);
        if (chosenItem) {
            const isCorrect = chosenItem.id === gameData.customerRequest.itemWanted.id;
            setSpectatorAction({ itemId: chosenItem.id, isCorrect });
            setShowCorrectEffect(isCorrect ? chosenItem.id : null);
            const wantedItemName = gameData.customerRequest.itemWanted.name;
            setFeedbackMessage(
                isCorrect ? `${activePlayerName} a trouvé ${wantedItemName}!` : `${activePlayerName} a choisi ${chosenItem.name}. Ce n'était pas ${wantedItemName}.`
            );
        }
      } else if (lastAction === 'NAMDAEMUN_TIMEOUT') {
          setFeedbackMessage(`Temps écoulé pour ${activePlayerName}! Il cherchait ${gameData?.customerRequest.itemWanted.name}.`);
          setIsInteractable(false); // Ensure UI is non-interactable for spectator on timeout
      }
    }
  }, [isSpectator, game?.miniGameLiveState, gameData, activePlayerName]);


  const handleTimeout = () => { // Only called for active player
    if (!isInteractable || isSpectator) return; // Should not be called for spectator
    setIsInteractable(false);
    const wantedItemName = gameData?.customerRequest?.itemWanted?.name || 'l\'article demandé';
    setFeedbackMessage(`Temps écoulé ! Le client voulait ${wantedItemName}.`);
    playSound('error', isSpectator);
    if (gameData) onIncorrectChoice(gameData.customerRequest.itemWanted, true); // This updates score for active player

    if (game?.id) {
      broadcastAction({
        gameId: game.id,
        action: 'NAMDAEMUN_TIMEOUT',
        payload: { round: gameData?.roundNumber || 0 }, // Assuming gameData has roundNumber
      }).catch(console.error);
    }
    onRoundTimeout(); // This likely triggers next round or finish for active player
  };

  const handleChoiceClick = async (item: Item) => {
    if (!isInteractable || !gameData || isSpectator) return;

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsInteractable(false);

    const isCorrect = item.id === gameData.customerRequest.itemWanted.id;

    if (game?.id) {
      try {
        await broadcastAction({
          gameId: game.id,
          action: 'NAMDAEMUN_CHOICE',
          payload: { itemId: item.id, isCorrect, round: gameData?.roundNumber || 0 },
        });
      } catch (error) {
        console.error("Error broadcasting Namdaemun choice:", error);
      }
    }

    if (isCorrect) {
      setFeedbackMessage('Merci !');
      playSound('success', isSpectator);
      setShowCorrectEffect(item.id);
      onCorrectChoice(item); // Updates score for active player
    } else {
      const wantedItemName = gameData?.customerRequest?.itemWanted?.name || 'l\'article demandé';
      setFeedbackMessage(`Oops! Ce n'est pas ${item.name}. Le client voulait ${wantedItemName}.`);
      playSound('error', isSpectator);
      onIncorrectChoice(item, false); // Updates score for active player
    }
    // onFinish or next round logic is typically handled by onCorrectChoice/onIncorrectChoice callbacks
    // which should eventually lead to GamePage calling onFinish for the mini-game.
  };

  const timerBarPercentage = roundTimeLimit > 0 ? (timeLeft / roundTimeLimit) * 100 : 0;
  const currentScore = isSpectator ? (game?.miniGameLiveState?.payload?.currentScore ?? score) : score;

  // Basic styles - ideally these would be in a CSS file or use a styling library
  // Test comment
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
        {isSpectator && (
          <div style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '5px', marginBottom: '15px', border: '1px solid #ccc', textAlign: 'center' }}>
            Vous observez {activePlayerName}...
          </div>
        )}
        <header style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #f3f4f6' }}> {/* gray-100 */}
          <h1 style={headerStyle}>Au Marché de Namdaemun !</h1>
        </header>

        <div id="gameScreen" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 5px' }}>
            <div id="timerDisplay" style={{ fontSize: '18px', fontWeight: '600', color: '#4a5568' }}> {/* gray-700 */}
              Temps: <span data-testid="time-left" style={{ color: timeLeft <= 5 ? '#ef4444' : '#3b82f6' }}>{timeLeft}</span>s {/* red-500 / blue-500 */}
            </div>
            <div id="scoreArea" style={{ fontSize: '20px', fontWeight: 'bold', color: '#854d0e' }}> {/* amber-700 */}
              Score {isSpectator ? `de ${activePlayerName}`: ''}: <span data-testid="score-display">{currentScore}</span>
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
            {choices && choices.map((item) => {
              // Determine if this item was the one clicked by the active player (for spectator view)
              const isSpectatorObservedClick = isSpectator && spectatorAction?.itemId === item.id;
              const isCorrectSpectatorObservedClick = isSpectatorObservedClick && spectatorAction?.isCorrect;

              let itemStyle = {...buttonBaseStyle};
              if (isSpectator) {
                itemStyle.pointerEvents = 'none'; // Disable clicks for spectator
                itemStyle.cursor = 'default';
                if (isSpectatorObservedClick) {
                   itemStyle.border = isCorrectSpectatorObservedClick ? '3px solid #10B981' : '3px solid #ef4444'; // Green for correct, Red for incorrect
                   itemStyle.boxShadow = isCorrectSpectatorObservedClick ? '0 0 15px rgba(16, 185, 129, 0.7)' : '0 0 15px rgba(239, 68, 68, 0.7)';
                } else {
                    itemStyle.opacity = 0.7; // Dim unchosen items for spectator if an action occurred
                }
              }

              return (
                <button
                  key={item.id}
                  className={`choice-button ${showCorrectEffect === item.id && !isSpectator ? 'correct-choice-effect' : ''}`}
                  onClick={() => handleChoiceClick(item)}
                  disabled={!isInteractable || isSpectator} // Also disable for spectator
                  style={itemStyle}
                >
                  <img src={item.imageUrl || `https://placehold.co/100x100/E2E8F0/4A5568?text=${encodeURIComponent(item.name)}`} alt={item.altText} style={{ width: '100px', height: '100px', objectFit: 'cover', marginBottom: '8px', borderRadius: '6px' }} />
                  <p style={{ fontSize: '1rem', color: '#374151', margin: 0, fontWeight: 500 }}>{item.name}</p> {/* gray-700 */}
                </button>
              );
            })}
          </div>

          <div data-testid="feedback-area" style={{ marginTop: '20px', textAlign: 'center', minHeight: '40px', fontWeight: '600', padding: '12px', borderRadius: '8px', fontSize: '1.1rem', color: feedbackMessage.includes('Merci') || (spectatorAction?.isCorrect && feedbackMessage.includes(activePlayerName)) ? '#059669' : feedbackMessage ? '#dc2626' : 'transparent', backgroundColor: feedbackMessage ? (feedbackMessage.includes('Merci') || (spectatorAction?.isCorrect && feedbackMessage.includes(activePlayerName)) ? '#d1fae5' : '#fee2e2') : 'transparent', transition: 'all 0.3s ease' }}> {/* green-600/100, red-600/100 */}
            {feedbackMessage}
          </div>

          {/* Temporary button to call onFinish for testing purposes - hide for spectators */}
          {!isSpectator && (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button
                onClick={onFinish}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  color: 'white',
                  backgroundColor: '#007bff',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Force Finish Namdaemun Market (Dev)
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NamdaemunMarketScene;

import React, { useState } from 'react';
import './StreakIndicator.css';

interface StreakIndicatorProps {
  streakCount: number;
  nextReward: string;
  // Prochainement: une prop pour l'état de validation quotidien depuis le backend
  // initialDailyValidation?: boolean;
}

const StreakIndicator: React.FC<StreakIndicatorProps> = ({ streakCount, nextReward }) => {
  // Pour l'instant, l'état de validation est géré localement
  // Il sera potentiellement synchronisé avec le backend plus tard
  const [isValidatedToday, setIsValidatedToday] = useState(false);

  // Simuler la validation pour le développement
  const handleSimulateValidation = () => {
    setIsValidatedToday(true);
  };

  return (
    <div className="streak-indicator" title={`Récompense de demain : ${nextReward}`}>
      <span className="streak-icon">🔥</span>
      <span className="streak-count">{streakCount} jours</span>
      {isValidatedToday && <span className="streak-validated">✅</span>}
      {/* Bouton temporaire pour simuler la validation */}
      {!isValidatedToday && (
        <button onClick={handleSimulateValidation} style={{marginLeft: '10px', fontSize: '0.8em'}}>
          Valider le jour
        </button>
      )}
      <div className="streak-next-reward">
        Revenez demain pour : {nextReward}
      </div>
    </div>
  );
};

export default StreakIndicator;

import React from 'react';
import './OpponentTurnIndicator.css';

interface OpponentTurnIndicatorProps {
  playerName: string;
}

const OpponentTurnIndicator: React.FC<OpponentTurnIndicatorProps> = ({ playerName }) => {
  if (!playerName) {
    // Fallback if playerName is somehow not provided, though GamePage should handle this.
    return <div className="opponent-turn-indicator">C'est au tour de l'adversaire...</div>;
  }
  return (
    <div className="opponent-turn-indicator">
      C'est au tour de {playerName}...
    </div>
  );
};

export default OpponentTurnIndicator;

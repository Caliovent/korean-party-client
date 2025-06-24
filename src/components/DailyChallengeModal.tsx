import React from 'react';
import './DailyChallengeModal.css';

interface DailyChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunch: () => void;
  challenge: {
    title: string;
    objective: string;
    reward: string;
  };
}

const DailyChallengeModal: React.FC<DailyChallengeModalProps> = ({
  isOpen,
  onClose,
  onLaunch,
  challenge,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Défi du Jour</h2>
        <h3>{challenge.title}</h3>
        <p><strong>Objectif :</strong> {challenge.objective}</p>
        <p><strong>Récompense :</strong> {challenge.reward}</p>
        <div className="daily-challenge-modal-buttons">
          <button onClick={onLaunch} className="launch-button">Lancer le Défi</button>
          <button onClick={onClose} className="close-button">Fermer</button>
        </div>
      </div>
    </div>
  );
};

export default DailyChallengeModal;

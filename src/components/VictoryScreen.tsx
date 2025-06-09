// src/components/VictoryScreen.tsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './VictoryScreen.css';

interface VictoryScreenProps {
  winnerName: string;
}

const VictoryScreen: React.FC<VictoryScreenProps> = ({ winnerName }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleReturnToLobby = () => {
    navigate('/lobby');
  };

  return (
    <div className="victory-container">
      <div className="victory-box">
        <h1>{t('victory.title', 'Victoire !')}</h1>
        <p className="winner-announcement">
          {t('victory.announcement', 'Félicitations à')}
          <span className="winner-name">{winnerName}</span>
          {t('victory.end_announcement', 'qui a assemblé tous les Grimoires !')}
        </p>
        <button onClick={handleReturnToLobby} className="lobby-button">
          {t('victory.return_to_lobby', 'Retourner au Lobby')}
        </button>
      </div>
    </div>
  );
};

export default VictoryScreen;
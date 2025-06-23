import React from 'react';
import QuestLog from './QuestLog';
import './QuestLogModal.css'; // Nous créerons ce fichier CSS ensuite
import { useTranslation } from 'react-i18next';

interface QuestLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QuestLogModal: React.FC<QuestLogModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay quest-log-modal-overlay">
      <div className="modal-content quest-log-modal-content">
        <div className="modal-header">
          <h2>{t('quest_log_modal_title') || 'Journal de Quêtes'}</h2>
          <button onClick={onClose} className="modal-close-button" aria-label={t('close_button_label') || 'Fermer'}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <QuestLog />
        </div>
      </div>
    </div>
  );
};

export default QuestLogModal;

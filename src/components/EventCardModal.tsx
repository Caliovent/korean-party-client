import React from 'react';
import { useTranslation } from 'react-i18next';
import './EventCardModal.css';

interface EventCardModalProps {
  eventCard: { titleKey: string, descriptionKey: string, GfxUrl: string } | null;
  onClose: () => void;
}

const EventCardModal: React.FC<EventCardModalProps> = ({ eventCard, onClose }) => {
  const { t } = useTranslation();

  if (!eventCard) {
    return null;
  }

  return (
    <div className="event-card-modal-overlay">
      <div className="event-card-modal-content">
        <button className="event-card-modal-close" onClick={onClose}>X</button>
        <img src={eventCard.GfxUrl} alt={t(eventCard.titleKey)} className="event-card-modal-image" />
        <h3 className="event-card-modal-title">{t(eventCard.titleKey)}</h3>
        <p className="event-card-modal-description">{t(eventCard.descriptionKey)}</p>
      </div>
    </div>
  );
};

export default EventCardModal;

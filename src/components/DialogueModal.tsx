import React from 'react';
import './DialogueModal.css'; // We'll create this for basic styling

interface DialogueModalProps {
  isOpen: boolean;
  onClose: () => void;
  pnjId: string | null;
  npcName: string;
  npcPortraitUrl?: string; // For now, could be the asset key/path
  dialogueText: string;
}

const DialogueModal: React.FC<DialogueModalProps> = ({
  isOpen,
  onClose,
  pnjId,
  npcName,
  npcPortraitUrl,
  dialogueText,
}) => {
  if (!isOpen || !pnjId) {
    return null;
  }

  // Use a generic placeholder or the sprite key if no specific portrait URL is provided
  const portraitDisplay = npcPortraitUrl || `assets/${pnjId}_placeholder.png`; // Or a more generic one

  return (
    <div className="dialogue-modal-overlay">
      <div className="dialogue-modal-content">
        <button className="dialogue-modal-close-button" onClick={onClose}>
          &times;
        </button>
        <h2>{npcName}</h2>
        <div className="dialogue-modal-body">
          {/* For now, we'll just show the path or a placeholder.
              In a real scenario, this would be an <img> tag. */}
          <div className="dialogue-modal-portrait">
            <p>(Portrait: {portraitDisplay})</p>
            {/* Example of how an image would be used if assets were properly set up:
            {npcPortraitUrl && <img src={npcPortraitUrl} alt={`${npcName} portrait`} />}
            {!npcPortraitUrl && <div className="portrait-placeholder">Image for {pnjId}</div>}
            */}
          </div>
          <p className="dialogue-modal-text">{dialogueText}</p>
        </div>
        <div className="dialogue-modal-options">
          <button onClick={onClose}>Au revoir</button>
        </div>
      </div>
    </div>
  );
};

export default DialogueModal;

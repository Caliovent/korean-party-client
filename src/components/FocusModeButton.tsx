import React from 'react';

interface FocusModeButtonProps {
  isFocus: boolean;
  onClick: () => void;
}

const FocusModeButton: React.FC<FocusModeButtonProps> = ({ isFocus, onClick }) => {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 10000, // Ensure it's above other elements
        padding: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        color: 'white',
        border: '1px solid white',
        borderRadius: '50%', // Circular button
        cursor: 'pointer',
        fontSize: '20px', // Adjust icon size
        width: '50px',
        height: '50px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      title={isFocus ? "Désactiver le Mode Focus" : "Activer le Mode Focus"}
    >
      {isFocus ? '👁️' : '👁️‍🗨️'} {/* Simple eye icons, could be replaced with SVGs or images */}
    </button>
  );
};

export default FocusModeButton;

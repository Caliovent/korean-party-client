// src/components/MapButton.tsx
import React from 'react';
import Phaser from 'phaser';

interface MapButtonProps {
  game: Phaser.Game | null; // Accept the Phaser Game instance as a prop
}

const MapButton: React.FC<MapButtonProps> = ({ game }) => {
  const handleToggleMapView = () => {
    if (game && game.events) {
      game.events.emit('toggleMapView');
      console.log('toggleMapView event emitted');
    } else {
      console.error('Phaser game instance or event emitter not available from props.');
    }
  };

  const buttonStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    padding: '10px 15px',
    backgroundColor: '#4CAF50', // A greenish color, can be themed later
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    zIndex: 1000, // Ensure it's above the Phaser canvas
    fontSize: '16px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
  };

  return (
    <button style={buttonStyle} onClick={handleToggleMapView}>
      Carte
    </button>
  );
};

export default MapButton;

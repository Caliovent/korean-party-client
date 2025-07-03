import React from 'react';
import './LoadingScreen.css'; // Nous ajouterons quelques styles simples

const LoadingScreen: React.FC<{ message?: string }> = ({ message }) => {
  return (
    <div className="loading-screen">
      <div className="loading-spinner"></div>
      <p>{message || 'Chargement du contenu magique...'}</p>
    </div>
  );
};

export default LoadingScreen;

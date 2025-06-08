import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { MainBoardScene } from '../phaser/MainBoardScene';

interface PhaserGameProps {
  gameData: any; // L'objet complet de la partie
}

const PhaserGame: React.FC<PhaserGameProps> = ({ gameData }) => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // S'assure que le conteneur est prêt
    if (!gameContainerRef.current) return;

    // Crée le jeu s'il n'existe pas
    if (!gameRef.current && gameData) {
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: gameContainerRef.current.clientWidth,
        height: 600, // Hauteur fixe pour le canvas
        parent: 'phaser-container',
        backgroundColor: '#1e1e1e',
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [MainBoardScene],
      };

      gameRef.current = new Phaser.Game(config);
      // Passe les données initiales à la scène
      gameRef.current.scene.start('MainBoardScene', gameData);
    } else if (gameRef.current && gameData) {
      // Si le jeu existe déjà, on met juste à jour les données dans la scène
      gameRef.current.registry.set('gameData', gameData);
    }
    
    // Nettoyage au démontage du composant
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []); // S'exécute une seule fois pour créer le jeu

  // Met à jour les données de la scène à chaque fois que gameData change
  useEffect(() => {
    if (gameRef.current && gameData) {
      gameRef.current.registry.set('gameData', gameData);
    }
  }, [gameData]);

  return <div id="phaser-container" ref={gameContainerRef} style={{ width: '100%', minHeight: '600px' }} />;
};

export default PhaserGame;

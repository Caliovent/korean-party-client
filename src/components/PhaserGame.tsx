// src/components/PhaserGame.tsx (corrigé)

import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import MainBoardScene from '../phaser/MainBoardScene';
import type { Game } from '../types/game';

interface PhaserGameProps {
  // gameId: string; // SUPPRIMÉ
  game: Game | null;
}

const PhaserGame: React.FC<PhaserGameProps> = ({ game }) => { // gameId SUPPRIMÉ
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 1280,
      height: 720,
      parent: 'phaser-container',
      scene: [MainBoardScene],
      backgroundColor: '#2d2d2d',
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
    };
  }, []);

  useEffect(() => {
    if (game && gameRef.current) {
      const scene = gameRef.current.scene.getScene('MainBoardScene') as MainBoardScene;
      if (scene && scene.scene.isActive()) {
        scene.updateGameState(game);
      }
    }
  }, [game]);

  return <div id="phaser-container" />;
};

export default PhaserGame;
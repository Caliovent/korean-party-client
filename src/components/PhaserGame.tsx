// src/components/PhaserGame.tsx (corrigé)

import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import MainBoardScene from '../phaser/MainBoardScene';
import type { Game } from '../types/game';
import type { SpellId } from '../data/spells'; // Importer le type

interface PhaserGameProps {
  game: Game | null;
  selectedSpellId: SpellId | null; // Accepter la nouvelle prop
}

const PhaserGame: React.FC<PhaserGameProps> = ({ game, selectedSpellId }) => {
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


  // AJOUT : useEffect pour gérer le mode de ciblage
  useEffect(() => {
    const scene = gameRef.current?.scene.getScene('MainBoardScene') as MainBoardScene;
    if (scene?.scene.isActive()) {
      if (selectedSpellId) {
        scene.enterTargetingMode(selectedSpellId);
      } else {
        scene.exitTargetingMode();
      }
    }
  }, [selectedSpellId]); // Se déclenche quand le sort sélectionné change

  return <div id="phaser-container" />;
};

export default PhaserGame;
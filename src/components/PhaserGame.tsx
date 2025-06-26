// src/components/PhaserGame.tsx (corrigé)

import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import MainBoardScene from '../phaser/MainBoardScene';
import type { Game } from '../types/game';
import { SPELL_DEFINITIONS, type SpellType, type SpellId } from '../data/spells'; // Importer le type

interface PhaserGameProps {
  game: Game | null;
  selectedSpellId: SpellId | null;
  onTargetSelected: (targetId: string) => void; // Accepter la nouvelle prop
}

const PhaserGame: React.FC<PhaserGameProps> = ({ game, selectedSpellId, onTargetSelected }) => {
  const gameRef = useRef<Phaser.Game | null>(null);
  // AJOUT : Réf pour mémoriser le dernier sort animé et éviter les répétitions
  const lastAnimatedSpellRef = useRef<object | null>(null);

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

    // Passer la fonction de rappel à la scène une fois qu'elle est prête
    gameRef.current.scene.start('MainBoardScene', { onTargetSelected });

    return () => {
      gameRef.current?.destroy(true);
    };
  }, [onTargetSelected]); // Ajouter la dépendance

  useEffect(() => {
    if (game && gameRef.current) {
      const scene = gameRef.current.scene.getScene('MainBoardScene') as MainBoardScene;
      // Corrected way to check if a scene is active in Phaser 3
      // scene.sys.isActive() is a method, or check scene.sys.settings.status === Phaser.Scenes.RUNNING
      // Using scene.sys.isActive() for simplicity as it's commonly available.
      if (scene && scene.sys && typeof scene.sys.isActive === 'function' && scene.sys.isActive()) {
        scene.updateGameState(game);
      } else if (scene && scene.sys && scene.sys.settings && scene.sys.settings.active) { // Fallback for some Phaser versions/structures
        scene.updateGameState(game);
      }
    }
  }, [game]);

  useEffect(() => {
    const scene = gameRef.current?.scene.getScene('MainBoardScene') as MainBoardScene;
  // Corrected way to check if a scene is active
  const isActive = scene && scene.sys && ( (typeof scene.sys.isActive === 'function' && scene.sys.isActive()) || (scene.sys.settings && scene.sys.settings.active) );
  if (isActive) {
      if (selectedSpellId) {
        const spellDefinition = SPELL_DEFINITIONS.find(s => s.id === selectedSpellId);
        if (spellDefinition) {
          scene.enterTargetingMode(spellDefinition.type);
        } else {
          // Spell definition not found, maybe exit targeting mode or log error
          console.error(`[PhaserGame] Spell definition not found for ${selectedSpellId}`);
          scene.exitTargetingMode();
        }
      } else {
        scene.exitTargetingMode();
      }
    }
  }, [selectedSpellId]); // Se déclenche quand le sort sélectionné change

  // AJOUT : useEffect pour déclencher les animations de sorts
  useEffect(() => {
    if (game?.lastSpellCast && gameRef.current) {
      // On vérifie que le sort n'a pas déjà été animé
      if (lastAnimatedSpellRef.current !== game.lastSpellCast) {
        lastAnimatedSpellRef.current = game.lastSpellCast; // On mémorise le sort actuel

        const scene = gameRef.current.scene.getScene('MainBoardScene') as MainBoardScene;
        if (scene?.scene.isActive()) {
          scene.playSpellAnimation(game.lastSpellCast);
        }
      }
    }
  }, [game?.lastSpellCast]); // Se déclenche quand le dernier sort lancé change

  return <div id="phaser-container" />;
};

export default PhaserGame;
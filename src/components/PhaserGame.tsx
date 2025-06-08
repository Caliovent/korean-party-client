import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { MainBoardScene } from '../phaser/MainBoardScene';

interface PhaserGameProps {
  gameId: string;
}

const PhaserGame = ({ gameId }: PhaserGameProps) => {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current) {
        return; // Empêche la réinitialisation si le jeu existe déjà
    }

    if (gameId) {
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: 'phaser-container',
        backgroundColor: '#2d2d2d',
        scale: {
          // --- MODIFICATION ---
          // Le mode ENVELOP va s'assurer que le canvas remplit entièrement
          // son conteneur, en conservant le ratio. Cela peut rogner les
          // bords de l'image si le ratio de l'écran est différent,
          // mais évite les bandes noires.
          mode: Phaser.Scale.ENVELOP,
          // --- FIN DE LA MODIFICATION ---
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: 1920,
          height: 1080,
        },
        scene: [MainBoardScene],
      };


      gameRef.current = new Phaser.Game(config);
      gameRef.current.scene.start('MainBoardScene', { gameId: gameId });
    }

    return () => {
        if (gameRef.current) {
            gameRef.current.destroy(true);
            gameRef.current = null;
        }
    };
  }, [gameId]);

  // Le conteneur doit occuper tout l'espace disponible pour que le Scale Manager fonctionne bien.
  return <div id="phaser-container" style={{ width: '100%', height: '100%' }} />;
};

export default PhaserGame;

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
        return;
    }

    if (gameId) {
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: 'phaser-container',
        backgroundColor: 'transparent',
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: 1920,
          height: 1080,
        },
        zoom: 0.9,
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

  return <div id="phaser-container" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: -1 }} />;
};

export default PhaserGame;

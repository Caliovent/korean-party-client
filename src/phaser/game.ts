import Phaser from 'phaser';

// You might want to import your scenes here if they are ready
import MainBoardScene from './MainBoardScene';
import HubScene from './HubScene';
import HangeulTyphoonScene from './HangeulTyphoonScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  // Initially, you might not have a scene, or you can use a placeholder
  scene: [HubScene, MainBoardScene, HangeulTyphoonScene] // Example if you have scenes
  // scene: undefined // Or handle scene management dynamically
};

const game = new Phaser.Game(config);

export { game };

import Phaser from 'phaser';

// You might want to import your scenes here if they are ready
// import MainBoardScene from './MainBoardScene';
// import HubScene from './HubScene';

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
  // scene: [MainBoardScene, HubScene] // Example if you have scenes
  scene: undefined // Or handle scene management dynamically
};

const game = new Phaser.Game(config);

export { game };

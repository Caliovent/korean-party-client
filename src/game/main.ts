import * as Phaser from 'phaser';
import { HangeulTyphoonScene } from './scenes/HangeulTyphoonScene';

const gameConfig: Phaser.Types.Core.GameConfig = {
    title: 'Hangeul Typhoon',
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container', // This ID should match an element in your HTML
    dom: {
        createContainer: true // Crucial for HTML input elements
    },
    scene: [HangeulTyphoonScene], // Add your scene here
    physics: {
        default: 'arcade',
        arcade: {
            debug: false, // Set to true for physics debugging
        },
    },
    backgroundColor: '#1a1a1a',
};

window.addEventListener('load', () => {
    const game = new Phaser.Game(gameConfig);
});

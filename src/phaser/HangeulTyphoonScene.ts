import Phaser from 'phaser';

export default class HangeulTyphoonScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HangeulTyphoonScene' });
  }

  preload() {
    // This method is ready for asset loading in future steps.
    // For now, it can remain empty or contain comments.
  }

  create() {
    // Get game dimensions
    const gameWidth = this.sys.game.config.width as number;
    const gameHeight = this.sys.game.config.height as number;

    // Position HUD elements above the game area
    const hudY = gameHeight * 0.05; // e.g. 5% from the top
    const hudStyle = { fontSize: '24px', color: '#ffffff', fontFamily: 'Arial' };

    // Score Text
    // Positioned towards the left, below the top edge
    this.add.text(gameWidth * 0.1, hudY, 'Score: 0', hudStyle);

    // Combo Text
    // Positioned in the center, below the top edge
    this.add.text(gameWidth * 0.5, hudY, 'Combo: 0', hudStyle).setOrigin(0.5, 0); // Centered horizontally

    // Mode Text
    // Positioned towards the right, below the top edge
    this.add.text(gameWidth * 0.9, hudY, 'Mode: Épreuve du Scribe', hudStyle).setOrigin(1, 0); // Right-aligned

    // Define game area dimensions and position
    // HUD will be above, input field below.
    const gameAreaWidth = gameWidth * 0.7;
    const gameAreaHeight = gameHeight * 0.6;
    const gameAreaX = (gameWidth - gameAreaWidth) / 2;
    const gameAreaY = gameHeight * 0.15; // Leave space for HUD at the top

    const graphics = this.add.graphics();

    // Draw the game area (e.g., a light grey rectangle with a border)
    graphics.fillStyle(0xdddddd, 1); // Light grey fill
    graphics.fillRect(gameAreaX, gameAreaY, gameAreaWidth, gameAreaHeight);
    graphics.lineStyle(2, 0x000000, 1); // Black border
    graphics.strokeRect(gameAreaX, gameAreaY, gameAreaWidth, gameAreaHeight);

    // Draw the "sol" (ground line) at the bottom of the game area
    const groundY = gameAreaY + gameAreaHeight;
    graphics.lineStyle(4, 0x333333, 1); // Thicker, dark grey line
    graphics.beginPath();
    graphics.moveTo(gameAreaX, groundY);
    graphics.lineTo(gameAreaX + gameAreaWidth, groundY);
    graphics.closePath();
    graphics.strokePath();

    // Define input field placeholder dimensions and position
    const inputFieldHeight = 50;
    // const inputPadding = 20; // Padding between game area and input field // Not used in example
    const inputFieldY = (this.sys.game.config.height as number) * 0.85; // Position it towards the bottom
    const inputFieldWidth = gameAreaWidth; // Same width as game area
    const inputFieldX = gameAreaX;

    // Draw the input field placeholder (e.g., white rectangle with a border)
    graphics.fillStyle(0xffffff, 1); // White fill
    graphics.fillRect(inputFieldX, inputFieldY, inputFieldWidth, inputFieldHeight);
    graphics.lineStyle(2, 0x000000, 1); // Black border
    graphics.strokeRect(inputFieldX, inputFieldY, inputFieldWidth, inputFieldHeight);

    // Add placeholder text inside the input field
    this.add.text(inputFieldX + 10, inputFieldY + 10, 'Type here...', {
      color: '#888888', // Grey color for placeholder text
      fontSize: '24px',
      fontFamily: 'Arial' // Specify a common font
    });

    // Remove or comment out the initial placeholder text
    // this.add.text(100, 100, 'Hangeul Typhoon Scene', { color: '#ffffff', fontSize: '32px' });
  }

  update() {
    // This method is ready for the game loop logic.
    // For now, it can remain empty or contain comments.
  }
}

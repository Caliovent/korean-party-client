import Phaser from 'phaser';

export default class HangeulTyphoonScene extends Phaser.Scene {
  private sampleHangeul: string[] = ['ㄱ', 'ㄴ', 'ㄷ', 'ㅏ', 'ㅓ', 'ㅗ', '가', '나', '다', '한국', '사랑', '게임'];
  private blocks!: Phaser.GameObjects.Group;
  private gameAreaX!: number;
  private gameAreaY!: number;
  private gameAreaWidth!: number;
  private gameAreaHeight!: number;
  // Add a property for block speed, can be adjusted later for difficulty
  private blockSpeed: number = 50; // Pixels per second
  private timeSinceLastSpeedIncrease: number = 0;
  private speedIncreaseInterval: number = 10000; // Increase speed every 10 seconds (10000 ms)
  private speedIncrement: number = 10; // Increase speed by 10 pixels/sec

  private currentInputText!: Phaser.GameObjects.Text;
  private inputTextString: string = '';
  private targetedBlock: Phaser.GameObjects.Text | null = null;

  private isGameOver: boolean = false;
  private gameOverText!: Phaser.GameObjects.Text;
  private groundY!: number;
  private blockSpawnTimer!: Phaser.Time.TimerEvent;

  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;

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

    // Initialize game area properties
    this.gameAreaWidth = gameWidth * 0.7;
    this.gameAreaHeight = gameHeight * 0.6;
    this.gameAreaX = (gameWidth - this.gameAreaWidth) / 2;
    this.gameAreaY = gameHeight * 0.15; // HUD is at 0.05, so this is below HUD

    // Position HUD elements above the game area
    const hudY = gameHeight * 0.05; // e.g. 5% from the top
    const hudStyle = { fontSize: '24px', color: '#ffffff', fontFamily: 'Arial' };

    // Score Text
    // Positioned towards the left, below the top edge
    this.scoreText = this.add.text(gameWidth * 0.1, hudY, `Score: ${this.score}`, hudStyle);

    // Combo Text
    // Positioned in the center, below the top edge
    this.add.text(gameWidth * 0.5, hudY, 'Combo: 0', hudStyle).setOrigin(0.5, 0); // Centered horizontally

    // Mode Text
    // Positioned towards the right, below the top edge
    this.add.text(gameWidth * 0.9, hudY, 'Mode: Épreuve du Scribe', hudStyle).setOrigin(1, 0); // Right-aligned

    // Define game area dimensions and position
    // HUD will be above, input field below.
    // Note: Local constants gameAreaWidth, gameAreaHeight, gameAreaX, gameAreaY are still used for drawing.
    // This is acceptable for now as per subtask, but ideally, these would use this.gameAreaWidth etc.
    const localGameAreaWidth = this.gameAreaWidth; // Use class properties for clarity if preferred
    const localGameAreaHeight = this.gameAreaHeight;
    const localGameAreaX = this.gameAreaX;
    const localGameAreaY = this.gameAreaY;

    const graphics = this.add.graphics();

    // Draw the game area (e.g., a light grey rectangle with a border)
    graphics.fillStyle(0xdddddd, 1); // Light grey fill
    graphics.fillRect(localGameAreaX, localGameAreaY, localGameAreaWidth, localGameAreaHeight);
    graphics.lineStyle(2, 0x000000, 1); // Black border
    graphics.strokeRect(localGameAreaX, localGameAreaY, localGameAreaWidth, localGameAreaHeight);

    // Draw the "sol" (ground line) at the bottom of the game area
    this.groundY = localGameAreaY + localGameAreaHeight; // Store groundY
    graphics.lineStyle(4, 0x333333, 1); // Thicker, dark grey line
    graphics.beginPath();
    graphics.moveTo(localGameAreaX, this.groundY); // Use localGameAreaX and this.groundY
    graphics.lineTo(localGameAreaX + localGameAreaWidth, this.groundY); // Use localGameAreaX, localGameAreaWidth and this.groundY
    graphics.closePath();
    graphics.strokePath();

    // Define input field placeholder dimensions and position
    const inputFieldHeight = 50;
    // const inputPadding = 20; // Padding between game area and input field // Not used in example
    const inputFieldY = (this.sys.game.config.height as number) * 0.85; // Position it towards the bottom
    const inputFieldWidth = this.gameAreaWidth; // Same width as game area
    const inputFieldX = this.gameAreaX;

    // Draw the input field placeholder (e.g., white rectangle with a border)
    graphics.fillStyle(0xffffff, 1); // White fill
    graphics.fillRect(inputFieldX, inputFieldY, inputFieldWidth, inputFieldHeight);
    graphics.lineStyle(2, 0x000000, 1); // Black border
    graphics.strokeRect(inputFieldX, inputFieldY, inputFieldWidth, inputFieldHeight);

    // Add placeholder text inside the input field
    // this.add.text(inputFieldX + 10, inputFieldY + 10, 'Type here...', { // REMOVED for dynamic input
    //   color: '#888888', // Grey color for placeholder text
    //   fontSize: '24px',
    //   fontFamily: 'Arial' // Specify a common font
    // });

    const inputFieldStyle = { fontSize: '24px', color: '#000000', fontFamily: 'Arial', backgroundColor: '#ffffff' };
    this.currentInputText = this.add.text(inputFieldX + 10, inputFieldY + 10, '', inputFieldStyle);

    // Remove or comment out the initial placeholder text
    // this.add.text(100, 100, 'Hangeul Typhoon Scene', { color: '#ffffff', fontSize: '32px' });

    this.blocks = this.add.group();
    this.timeSinceLastSpeedIncrease = 0; // Initialize timer for speed increase
    this.targetedBlock = null; // Initialize targetedBlock
    this.isGameOver = false; // Initialize game over state
    this.score = 0; // Initialize score

    this.input.keyboard.on('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.handleInputValidation();
      } else if (event.key === 'Backspace') {
        this.inputTextString = this.inputTextString.slice(0, -1);
        this.currentInputText.setText(this.inputTextString);
        this.updateTargetedBlock();
      } else if (event.key.length === 1) { // Capture printable characters
        this.inputTextString += event.key;
        this.currentInputText.setText(this.inputTextString);
        this.updateTargetedBlock();
      }
      // Note: currentInputText.setText is now handled within specific branches
      // to ensure updateTargetedBlock uses the most current text.
    });

    this.blockSpawnTimer = this.time.addEvent({ // Assign to the class property
      delay: 2000, // milliseconds (2 seconds)
      callback: this.spawnBlock,
      callbackScope: this,
      loop: true
    });
  }

  private spawnBlock() {
    if (this.isGameOver) return; // Do not spawn blocks if game is over

    // Ensure game area dimensions are set
    if (this.gameAreaX === undefined) {
      console.error("Game area dimensions not set before spawning block.");
      return;
    }

    const hangeulString = Phaser.Utils.Array.GetRandom(this.sampleHangeul);
    // Ensure blocks spawn within the gameAreaX and gameAreaX + gameAreaWidth
    // Subtracting an estimated width of the block text (e.g., 60-80px for typical strings here)
    const maxX = this.gameAreaX + this.gameAreaWidth - (hangeulString.length * 15 + 10); // Estimate text width + padding
    const randomX = Phaser.Math.Between(this.gameAreaX + 5, maxX > this.gameAreaX + 5 ? maxX : this.gameAreaX + 5);

    const blockText = this.add.text(randomX, this.gameAreaY, hangeulString, {
        font: '20px Arial', // Slightly smaller font for blocks
        color: '#ffffff',
        backgroundColor: '#333333',
        padding: { x: 5, y: 5 }
    });

    this.blocks.add(blockText);
    // Store speed and original text directly on the object using setData
    blockText.setData('speed', this.blockSpeed);
    blockText.setData('hangeulText', hangeulString);
  }

  update(time: number, delta: number) { // Added time, delta explicitly for clarity
    if (this.isGameOver) {
      return; // Stop most update logic if game is over
    }

    // Convert delta from ms to seconds for speed calculation
    const deltaInSeconds = delta / 1000;

    this.blocks.getChildren().forEach(blockObject => {
      const block = blockObject as Phaser.GameObjects.Text;
      // Ensure block is an instance of Phaser.GameObjects.Text or a type that has 'y' and 'getData'
      if (block instanceof Phaser.GameObjects.Text) {
        const speed = block.getData('speed') as number; // Speed in pixels per second
        block.y += speed * deltaInSeconds;

        // Check for game over condition
        if (!this.isGameOver && block.y + block.height >= this.groundY) {
          this.triggerGameOver();
          // No need to return from forEach, isGameOver flag handles stopping logic
        }
      }
    });

    if (this.isGameOver) return; // Re-check in case triggerGameOver was called in the loop

    // Difficulty increase logic
    this.timeSinceLastSpeedIncrease += delta;

    if (this.timeSinceLastSpeedIncrease >= this.speedIncreaseInterval) {
      this.blockSpeed += this.speedIncrement;
      this.timeSinceLastSpeedIncrease = 0; // Reset timer

      // Optional: Update speed of existing blocks if desired
      // console.log('Block speed increased to:', this.blockSpeed); // For debugging
    }
  }

  private updateTargetedBlock() {
    // Clear previous target's highlight
    if (this.targetedBlock) {
      this.targetedBlock.setTint(0xffffff); // Reset tint to default (white)
      this.targetedBlock = null;
    }

    if (this.inputTextString.length === 0) {
      return; // No input, so no target
    }

    let bestMatch: Phaser.GameObjects.Text | null = null;

    this.blocks.getChildren().forEach(blockObject => {
      const block = blockObject as Phaser.GameObjects.Text;
      const blockHangeul = block.getData('hangeulText') as string;

      if (blockHangeul && blockHangeul.startsWith(this.inputTextString)) {
        if (!bestMatch || block.y > bestMatch.y) { // If this block is lower than current best match
          bestMatch = block;
        }
      }
    });

    if (bestMatch) {
      this.targetedBlock = bestMatch;
      this.targetedBlock.setTint(0xffff00); // Highlight with yellow tint
    }
  }

  private handleInputValidation() {
    if (this.targetedBlock && this.inputTextString === this.targetedBlock.getData('hangeulText')) {
      // Visual cue for destruction (e.g., quick tint change)
      this.targetedBlock.setTint(0xff0000); // Red tint for validated

      // Call a new method to handle the actual destruction and score
      this.destroyBlock(this.targetedBlock);

      // No longer need 'toBeDestroyed' if handled immediately
      // this.targetedBlock.setData('toBeDestroyed', true);
      // console.log('Block validated for destruction:', this.targetedBlock.getData('hangeulText'));
    } else {
      // Optional: Add feedback for incorrect validation
      console.log('Validation failed. Typed:', this.inputTextString, 'Targeted:', this.targetedBlock?.getData('hangeulText'));
      // Maybe a quick red flash on the input field or a sound
    }

    // Clear input string and update display text
    this.inputTextString = '';
    this.currentInputText.setText(this.inputTextString);
    // Update target (which should become null as input is now empty)
    this.updateTargetedBlock();
  }

  private destroyBlock(blockToDestroy: Phaser.GameObjects.Text) {
    // Optional: Add a brief animation or particle effect here later

    // For now, simple destruction:
    this.blocks.remove(blockToDestroy, true, true); // remove from group, destroy game object, remove from scene

    // Add points (e.g., 10 points per block)
    this.score += 10;
    // Update the score display
    this.updateScoreDisplay();

    // console.log('Destroyed block. Score:', this.score); // For debugging

    // Ensure the destroyed block is no longer considered targeted
    if (this.targetedBlock === blockToDestroy) {
      this.targetedBlock = null;
      // No need to reset tint if it's destroyed, but good practice if it were just deactivated
    }
  }

  private triggerGameOver() {
    if (this.isGameOver) return; // Prevent multiple triggers

    this.isGameOver = true;
    console.log("Game Over!"); // For debugging

    // Stop block spawning
    if (this.blockSpawnTimer) {
       this.blockSpawnTimer.remove(false);
    }

    // Stop player input
    this.input.keyboard.off('keydown'); // Removes all keydown listeners on the keyboard plugin

    // Display Game Over message
    const gameWidth = this.sys.game.config.width as number;
    const gameHeight = this.sys.game.config.height as number;
    this.gameOverText = this.add.text(
      gameWidth / 2,
      gameHeight / 2,
      'GAME OVER',
      { fontSize: '64px', color: '#ff0000', backgroundColor: '#000000' }
    ).setOrigin(0.5);

    // Optional: Clear existing blocks or make them stop
    // this.blocks.clear(true, true); // Clears and destroys all blocks
  }

  private updateScoreDisplay() {
    if (this.scoreText) { // Check if scoreText is initialized
      this.scoreText.setText(`Score: ${this.score}`);
    }
  }
}

import Phaser from 'phaser';
// Assuming gameService will be refactored or provided to the scene.
// For now, this import is conceptual for the call structure.
import { sendTyphoonAttackService } from '../services/gameService';
import type { HangeulTyphoonAttackResponse } from '../types/hangeul';

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

  private opponentGameAreaX!: number;
  private opponentGameAreaY!: number;
  private opponentGameAreaWidth!: number;
  private opponentGameAreaHeight!: number;

  private isInAttackMode: boolean = false;

  private gameId: string = 'testGame123'; // Placeholder
  private attackerPlayerId: string = 'player1'; // Placeholder for own ID
  private targetPlayerId: string = 'player2'; // Placeholder for opponent's ID

  private graphics!: Phaser.GameObjects.Graphics;
  private playerGroundLine!: Phaser.GameObjects.Line;
  private initialPlayerBaseGroundY!: number;
  // For opponent's ground
  private opponentGroundLine!: Phaser.GameObjects.Line;
  private initialOpponentBaseGroundY!: number;
  private opponentGroundY!: number; // Logical Y position of opponent's ground, similar to this.groundY for player

  private currentCombo: number = 0;
  private comboText!: Phaser.GameObjects.Text;
  private comboTimer: Phaser.Time.TimerEvent | null = null;
  private readonly COMBO_TIMEOUT: number = 3000; // 3 seconds

  private currentGameMode: string = 'eupreuveDuScribe'; // Default mode
  private modeText!: Phaser.GameObjects.Text; // Reference to HUD mode text
  private translationPairs: { lang1: string, lang2_korean: string, type: 'word' | 'phrase' }[] = [
    { lang1: "Maison", lang2_korean: "집", type: 'word' },
    { lang1: "Amour", lang2_korean: "사랑", type: 'word' },
    { lang1: "École", lang2_korean: "학교", type: 'word' },
    { lang1: "Bonjour", lang2_korean: "안녕하세요", type: 'phrase' },
    { lang1: "Merci", lang2_korean: "감사합니다", type: 'phrase' },
    { lang1: "Oui", lang2_korean: "네", type: 'word' },
    { lang1: "Non", lang2_korean: "아니요", type: 'word' }
  ];

  constructor() {
    super({ key: 'HangeulTyphoonScene' });
  }

  preload() {
    // This method is ready for asset loading in future steps.
    // For now, it can remain empty or contain comments.

    // // Background Image
    // // this.load.image('hangeulTyphoon_bg', 'assets/minigames/hangeul_typhoon/background.png');

    // // Block Sprites (if blocks become sprites instead of just text objects)
    // // this.load.spritesheet('hangeul_block_sheet', 'assets/minigames/hangeul_typhoon/block_sheet.png', { frameWidth: 64, frameHeight: 32 });
    // // or individual images for different block types/states
    // // this.load.image('hangeul_block_protected', 'assets/minigames/hangeul_typhoon/block_protected.png');
    // // this.load.image('hangeul_block_vulnerable', 'assets/minigames/hangeul_typhoon/block_vulnerable.png');

    // // Sound Effects
    // // this.load.audio('sfx_block_destroy', ['assets/sounds/minigames/hangeul_typhoon/block_destroy.mp3', 'assets/sounds/minigames/hangeul_typhoon/block_destroy.ogg']);
    // // this.load.audio('sfx_game_over_typhoon', ['assets/sounds/minigames/hangeul_typhoon/game_over.mp3']);
    // // this.load.audio('sfx_attack_sent', ['assets/sounds/minigames/hangeul_typhoon/attack_sent.mp3']);
    // // this.load.audio('sfx_attack_failed', ['assets/sounds/minigames/hangeul_typhoon/attack_failed.mp3']);
    // // this.load.audio('sfx_ground_rise', ['assets/sounds/minigames/hangeul_typhoon/ground_rise.mp3']);
    // // this.load.audio('sfx_combo_tick', ['assets/sounds/minigames/hangeul_typhoon/combo_tick.mp3']); // For combo increment
    // // this.load.audio('sfx_block_vulnerable', ['assets/sounds/minigames/hangeul_typhoon/block_vulnerable_ping.mp3']); // When block becomes vulnerable
  }

  public init(data: { gameMode?: string; isDuel?: boolean; gameId?: string; attackerPlayerId?: string; targetPlayerId?: string }) {
    this.currentGameMode = data.gameMode || 'eupreuveDuScribe';
    this.gameId = data.gameId || 'testGame123'; // Use provided or default
    this.attackerPlayerId = data.attackerPlayerId || 'player1'; // Use provided or default
    this.targetPlayerId = data.targetPlayerId || 'player2'; // Use provided or default
    // this.isDuelMode = data.isDuel || false; // If you add this property

    // Reset core game state variables
    this.score = 0;
    this.currentCombo = 0;
    if (this.comboTimer) {
        this.comboTimer.remove(false);
        this.comboTimer = null;
    }
    this.isGameOver = false;
    this.inputTextString = '';
    this.isInAttackMode = false;
    this.targetedBlock = null;
    // Note: Other properties like blockSpeed, timeSinceLastSpeedIncrease might also need reset
    // depending on desired behavior for restarting the same scene instance.
    // For now, these are reset if the whole scene is new, or persist if scene instance is reused.
  }

  create() {
    // Get game dimensions
    const gameWidth = this.sys.game.config.width as number;
    const gameHeight = this.sys.game.config.height as number;

    // // Background
    // // this.add.image(this.sys.game.config.width / 2, this.sys.game.config.height / 2, 'hangeulTyphoon_bg').setOrigin(0.5);

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
    this.comboText = this.add.text(gameWidth * 0.5, hudY, `Combo: ${this.currentCombo}`, hudStyle).setOrigin(0.5, 0);

    // Mode Text
    // Positioned towards the right, below the top edge
    let modeDisplayName = 'Épreuve du Scribe';
    if (this.currentGameMode === 'defiDeLInterprete') {
      modeDisplayName = 'Défi de l\'Interprète';
    } else if (this.currentGameMode === 'testDuTraducteur') {
      // Add display name for Test du Traducteur if different, otherwise it uses Scribe
      modeDisplayName = 'Test du Traducteur'; // Placeholder, adjust if needed
    }
    this.modeText = this.add.text(gameWidth * 0.9, hudY, `Mode: ${modeDisplayName}`, hudStyle).setOrigin(1, 0);

    // Define game area dimensions and position
    // HUD will be above, input field below.
    // Note: Local constants gameAreaWidth, gameAreaHeight, gameAreaX, gameAreaY are still used for drawing.
    // This is acceptable for now as per subtask, but ideally, these would use this.gameAreaWidth etc.
    let localGameAreaWidth = this.gameAreaWidth; // Use class properties for clarity if preferred
    const localGameAreaHeight = this.gameAreaHeight;
    let localGameAreaX = this.gameAreaX;
    const localGameAreaY = this.gameAreaY;

    this.graphics = this.add.graphics(); // Assign to class property

    // Draw the game area (e.g., a light grey rectangle with a border)
    this.graphics.fillStyle(0xdddddd, 1); // Light grey fill
    this.graphics.fillRect(localGameAreaX, localGameAreaY, localGameAreaWidth, localGameAreaHeight);
    this.graphics.lineStyle(2, 0x000000, 1); // Black border
    this.graphics.strokeRect(localGameAreaX, localGameAreaY, localGameAreaWidth, localGameAreaHeight);

    // Draw the "sol" (ground line) at the bottom of the game area
    this.groundY = localGameAreaY + localGameAreaHeight; // Store groundY
    // Comment out old graphics drawing for the player's ground line
    // this.graphics.lineStyle(4, 0x333333, 1);
    // this.graphics.beginPath();
    // this.graphics.moveTo(localGameAreaX, this.groundY);
    // this.graphics.lineTo(localGameAreaX + localGameAreaWidth, this.groundY);
    // this.graphics.closePath();
    // this.graphics.strokePath();

    // Create the new Line object for player's ground
    this.initialPlayerBaseGroundY = this.groundY; // Store the initial base Y for server height calculations

    this.playerGroundLine = this.add.line(
        localGameAreaX,         // x position of the line object itself
        this.groundY,           // y position of the line object itself
        0,                      // startX *relative to the line object's x,y*
        0,                      // startY *relative to the line object's x,y*
        localGameAreaWidth,     // endX *relative to the line object's x,y*
        0,                      // endY *relative to the line object's x,y*
        0x333333,               // color
        1                       // alpha
    );
    this.playerGroundLine.setOrigin(0, 0);
    this.playerGroundLine.setLineWidth(4);

    // Opponent's game area definition
    this.opponentGameAreaWidth = gameWidth * 0.25;
    this.opponentGameAreaHeight = this.gameAreaHeight * 0.5;
    this.opponentGameAreaX = this.gameAreaX + this.gameAreaWidth + 20;
    this.opponentGameAreaY = this.gameAreaY;

    if (this.opponentGameAreaX + this.opponentGameAreaWidth > gameWidth - 10 ) {
        this.opponentGameAreaX = this.gameAreaX - this.opponentGameAreaWidth - 20;
        if (this.opponentGameAreaX < 10) {
            // Fallback: Try to shrink player's main game area to make space
            console.log("Attempting to shrink player area to fit opponent view...");
            this.gameAreaWidth = gameWidth * 0.55; // Shrink player area
            this.gameAreaX = 10; // Player area starts near left edge
            localGameAreaWidth = this.gameAreaWidth; // Update local variable for player's area drawing
            localGameAreaX = this.gameAreaX; // Update local variable

            // Recalculate opponent X based on new player gameAreaX and gameAreaWidth
            this.opponentGameAreaX = this.gameAreaX + this.gameAreaWidth + 20;

            // Redraw player's game area with new dimensions if it was already drawn
            // For this subtask, we assume this definition block is before player area drawing,
            // or that graphics for player area are redrawn/updated.
            // The current structure has player area graphics drawn *before* this opponent block.
            // This means player area will NOT reflect this shrinking logic without refactoring draw order.
            // This is a known limitation of this specific sequential logic.
            // For now, we proceed, but in a real scenario, drawing should be deferred or updatable.

            if (this.opponentGameAreaX + this.opponentGameAreaWidth > gameWidth - 10 ) {
                 console.error("Not enough screen width to display opponent view comfortably even after shrinking player area.");
                 this.opponentGameAreaX = -1; // Mark as not drawable
            }
        }
    }

    // Draw Opponent Area Placeholder (if drawable)
    if (this.opponentGameAreaX > 0) {
        this.graphics.fillStyle(0x555555, 1); // Opponent area background
        this.graphics.fillRect(this.opponentGameAreaX, this.opponentGameAreaY, this.opponentGameAreaWidth, this.opponentGameAreaHeight);
        this.graphics.lineStyle(1, 0xaaaaaa, 1); // Opponent area border
        this.graphics.strokeRect(this.opponentGameAreaX, this.opponentGameAreaY, this.opponentGameAreaWidth, this.opponentGameAreaHeight);

        this.initialOpponentBaseGroundY = this.opponentGameAreaY + this.opponentGameAreaHeight;
        this.opponentGroundY = this.initialOpponentBaseGroundY; // Initialize logical ground

        this.opponentGroundLine = this.add.line(
            this.opponentGameAreaX,      // x position of the line object itself
            this.opponentGroundY,        // y position of the line object itself
            0,                           // startX relative
            0,                           // startY relative
            this.opponentGameAreaWidth,  // endX relative
            0,                           // endY relative
            0x777777,                    // color (darker grey for opponent)
            1                            // alpha
        );
        this.opponentGroundLine.setOrigin(0, 0);
        this.opponentGroundLine.setLineWidth(2); // Thinner line for opponent

        this.add.text(this.opponentGameAreaX + this.opponentGameAreaWidth / 2, this.opponentGameAreaY - 15, 'Opponent', { fontSize: '12px', color: '#ffffff' }).setOrigin(0.5);
    }


    // Define input field placeholder dimensions and position
    const inputFieldHeight = 50;
    // const inputPadding = 20; // Padding between game area and input field // Not used in example
    const inputFieldY = (this.sys.game.config.height as number) * 0.85; // Position it towards the bottom
    const inputFieldWidth = this.gameAreaWidth; // Same width as game area
    const inputFieldX = this.gameAreaX;

    // Draw the input field placeholder (e.g., white rectangle with a border)
    this.graphics.fillStyle(0xffffff, 1); // White fill
    this.graphics.fillRect(inputFieldX, inputFieldY, inputFieldWidth, inputFieldHeight);
    this.graphics.lineStyle(2, 0x000000, 1); // Black border
    this.graphics.strokeRect(inputFieldX, inputFieldY, inputFieldWidth, inputFieldHeight);

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
    this.isInAttackMode = false; // Initialize attack mode state
    this.currentCombo = 0; // Initialize combo
    this.comboTimer = null; // Initialize combo timer reference

    this.input.keyboard.on('keydown', (event: KeyboardEvent) => {
      if (this.isGameOver && event.key !== 'G') return; // Allow 'G' for debug even if game over for testing this feature

      // Debug listener for 'G' key (placed inside the main handler to ensure it's also off when main input is off)
      if (event.key === 'g' || event.key === 'G') { // Check for 'g' or 'G'
        if (this.isGameOver && !(event.key === 'g' || event.key === 'G')) return; // Re-check for non-G keys if game is over

        const currentAmountRisen = this.initialPlayerBaseGroundY - this.groundY;
        const simulatedNewServerGroundHeight = currentAmountRisen + 10;
        console.log(`Debug: Simulating server update for ground height to ${simulatedNewServerGroundHeight}`);
        this.updateOwnGroundHeightFromServer(simulatedNewServerGroundHeight);
        event.preventDefault(); // Prevent 'g' from being typed into the input field
        return; // Stop further processing for 'G' key
      }

      if (this.isGameOver) return; // General game over check for other keys

      let previousInputTextString = this.inputTextString;

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (this.isInAttackMode && this.inputTextString.startsWith('<') && this.inputTextString.endsWith('>')) {
          const attackWord = this.inputTextString.substring(1, this.inputTextString.length - 1);
          this.handleAttackCommand(attackWord);
        } else if (!this.isInAttackMode) {
          this.handleInputValidation();
        } else {
          console.log("Enter/Space pressed in attack mode but input is not a complete command:", this.inputTextString);
        }
      } else if (event.key === 'Backspace') {
        if (this.inputTextString.length > 0) {
          this.inputTextString = this.inputTextString.slice(0, -1);
        }
      } else if (event.key === '<' && !this.inputTextString.includes('<')) {
          this.inputTextString = '<';
      } else if (event.key === '>' && this.inputTextString.startsWith('<') && !this.inputTextString.endsWith('>')) {
          this.inputTextString += event.key;
      } else if (event.key.length === 1) { // General printable characters, excluding those handled above
        // Only append if in attack mode (after '<') or if not starting an attack
        if (this.isInAttackMode || (!this.inputTextString.startsWith('<') && event.key !== '<' && event.key !== '>')) {
             this.inputTextString += event.key;
        } else if (!this.isInAttackMode && event.key !== '<' && event.key !== '>') { // Allow normal typing if not starting attack
            this.inputTextString += event.key;
        }
      }

      this.currentInputText.setText(this.inputTextString);

      if (this.inputTextString.startsWith('<')) {
        if (!this.isInAttackMode) { // Just entered attack mode
            this.isInAttackMode = true;
            if (this.targetedBlock) {
                this.targetedBlock.setTint(0xffffff);
                this.targetedBlock = null;
            }
        }
        this.currentInputText.setBackgroundColor('#d3d3d3');
      } else {
        if (this.isInAttackMode) { // Just exited attack mode (e.g. backspaced '<')
            this.isInAttackMode = false;
        }
        this.currentInputText.setBackgroundColor('#ffffff');
      }

      if (!this.isInAttackMode && previousInputTextString !== this.inputTextString) {
        this.updateTargetedBlock();
      } else if (this.isInAttackMode && this.targetedBlock !== null) {
        // If somehow a target was set while entering attack mode, clear it.
        // This is mostly covered by the check when starting attack mode.
        this.targetedBlock.setTint(0xffffff);
        this.targetedBlock = null;
      }
    });

    this.blockSpawnTimer = this.time.addEvent({ // Assign to the class property
      delay: 2000, // milliseconds (2 seconds)
      callback: this.spawnBlock,
      callbackScope: this,
      loop: true
    });
  }

  private spawnBlock() {
    if (this.isGameOver) return;

    let displayString: string;
    let expectedInput: string;
    let blockType: string;

    if (this.currentGameMode === 'defiDeLInterprete') {
      const pair = Phaser.Utils.Array.GetRandom(this.translationPairs);
      displayString = pair.lang1;
      expectedInput = pair.lang2_korean;
      blockType = pair.type;
    } else if (this.currentGameMode === 'testDuTraducteur') {
      const pair = Phaser.Utils.Array.GetRandom(this.translationPairs);
      displayString = pair.lang2_korean; // Korean word on block
      expectedInput = pair.lang1;       // Expected French/English input
      blockType = pair.type;
    }
    else { // Default to 'eupreuveDuScribe'
      displayString = Phaser.Utils.Array.GetRandom(this.sampleHangeul);
      expectedInput = displayString;
      if (displayString.length === 1) blockType = 'char';
      else if (displayString.length <= 3) blockType = 'syllable';
      else blockType = 'word';
    }

    // Adjusted width estimate: using displayString.length * 12 (avg char width) + padding
    const estimatedTextWidth = displayString.length * 12 + 20;
    const maxX = this.gameAreaX + this.gameAreaWidth - estimatedTextWidth;
    const randomX = Phaser.Math.Between(this.gameAreaX + 5, maxX > this.gameAreaX + 5 ? maxX : this.gameAreaX + 5);

    // // If using sprites for blocks:
    // // const blockSprite = this.add.sprite(randomX, this.gameAreaY, 'hangeul_block_sheet', 0); // 0 is frame index
    // // blockSprite.setData('hangeulText', displayString); // Still need to store text data for logic
    // // Then add text on top of the sprite or integrate it if text is part of sprite frames.
    // // For now, using text objects directly:
    const blockText = this.add.text(randomX, this.gameAreaY, displayString, {
        font: '20px Arial',
        color: '#ffffff',
        backgroundColor: '#333333',
        padding: { x: 5, y: 5 }
    });

    this.blocks.add(blockText);
    blockText.setData('speed', this.blockSpeed);
    blockText.setData('hangeulText', displayString); // What's visually on the block
    blockText.setData('expectedInput', expectedInput); // What player needs to type
    blockText.setData('blockType', blockType);
    blockText.setData('spawnTime', this.time.now);
    blockText.setData('isProtected', true);
    blockText.setData('isVulnerable', false);
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

        // Vulnerability Check (only if it's still protected)
        if (block.getData('isProtected')) {
          const spawnTime = block.getData('spawnTime') as number;
          if (this.time.now > spawnTime + 5000) { // 5000ms = 5 seconds
            block.setData('isProtected', false);
            block.setData('isVulnerable', true); // Mark as vulnerable

            // Change visual appearance for vulnerability
            block.setBackgroundColor('#FFFFFF'); // Vulnerable block background (e.g., white)
            block.setColor('#000000');         // Text color for vulnerable block (e.g., black)
            // Add a small visual effect like a quick flash or scale pulse
            this.tweens.add({
              targets: block,
              scaleX: 1.05, // Slightly less intense scaling
              scaleY: 1.05,
              duration: 150, // Slightly longer duration for visibility
              yoyo: true,
              ease: 'Power1'
            });
            // // this.sound.play('sfx_block_vulnerable'); // Sound effect for vulnerability
            console.log(`Block '${block.getData('hangeulText')}' is now VULNERABLE`);
          }
        }

        // Check for game over condition (after vulnerability check)
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
      const blockExpectedInput = block.getData('expectedInput') as string;

      if (blockExpectedInput && blockExpectedInput.toLowerCase().startsWith(this.inputTextString.toLowerCase())) {
        if (!bestMatch || block.y > bestMatch.y) {
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
    if (this.targetedBlock &&
        this.inputTextString.toLowerCase() === (this.targetedBlock.getData('expectedInput') as string).toLowerCase()) {
      this.targetedBlock.setTint(0xff0000);
      this.destroyBlock(this.targetedBlock);
    } else {
      console.log('Validation failed. Typed:', this.inputTextString, 'Expected:', this.targetedBlock?.getData('expectedInput'));
    }

    // Clear input string and update display text
    this.inputTextString = '';
    this.currentInputText.setText(this.inputTextString);
    // Update target (which should become null as input is now empty)
    this.updateTargetedBlock();
  }

  private destroyBlock(blockToDestroy: Phaser.GameObjects.Text) {
    if (!blockToDestroy.active) return;

    this.blocks.remove(blockToDestroy, true, true);

    // --- Scoring Logic ---
    const blockType = blockToDestroy.getData('blockType') as string;
    let basePoints = 0;
    switch (blockType) {
      case 'char':
        basePoints = 10;
        break;
      case 'syllable':
        basePoints = 50;
        break;
      case 'word':
        basePoints = 100;
        break;
      case 'phrase': // Added case for phrase
        basePoints = 150; // Example points for a phrase
        break;
      default:
        basePoints = 10;
    }

    this.currentCombo++;
    if (this.comboTimer) {
      this.comboTimer.remove(false);
    }
    this.comboTimer = this.time.delayedCall(this.COMBO_TIMEOUT, this.resetCombo, [], this);

    const pointsEarned = basePoints * (this.currentCombo > 1 ? this.currentCombo : 1);
    this.score += pointsEarned;

    this.updateScoreDisplay();
    this.updateComboDisplay();
    // // Play block destruction sound
    // // this.sound.play('sfx_block_destroy', { volume: 0.7 });
    // // If combo is active, play combo tick sound
    // // if (this.currentCombo > 1) { this.sound.play('sfx_combo_tick'); }
    // --- End Scoring Logic ---

    // Ensure the destroyed block is no longer considered targeted
    if (this.targetedBlock === blockToDestroy) {
      this.targetedBlock = null;
      // No need to reset tint if it's destroyed, but good practice if it were just deactivated
    }
  }

  private triggerGameOver() {
    if (this.isGameOver) return; // Prevent multiple triggers

    this.isGameOver = true;
    // Stop block spawning & combo timer
    if (this.blockSpawnTimer) this.blockSpawnTimer.remove(false);
    if (this.comboTimer) { this.comboTimer.remove(false); this.comboTimer = null; }

    // Stop player input (careful if other keydown listeners exist, this removes all)
    this.input.keyboard.removeAllListeners('keydown'); // More specific than just off()

    const gameWidth = this.sys.game.config.width as number;
    const gameHeight = this.sys.game.config.height as number;

    // Determine if it's a duel and the outcome
    // This part would be more robust if duel state (winnerId) is passed in.
    // For now, this internal triggerGameOver is a loss for the current player.
    // A separate call would be made if the server declares the player a winner.
    const isDuel = !!this.targetPlayerId; // Simple check if opponent is configured
    let outcomeMessage = 'GAME OVER';
    let outcomeStatus: 'victory' | 'defeat' | 'solo_complete' = 'solo_complete';

    if (isDuel) {
        // This specific call to triggerGameOver (e.g. from riseOwnGround) means current player lost.
        outcomeMessage = 'DEFEAT!';
        outcomeStatus = 'defeat';
        console.log("Duel Lost! (triggered by own ground reaching limit)");
    } else {
        console.log("Game Over! (Solo mode)");
    }
    // // this.sound.play('sfx_game_over_typhoon'); // Or specific win/loss sounds

    this.gameOverText = this.add.text(
      gameWidth / 2, gameHeight / 2, outcomeMessage,
      { fontSize: '64px', color: outcomeStatus === 'defeat' ? '#ff0000' : '#00ff00', backgroundColor: '#000000' }
    ).setOrigin(0.5);

    const results = {
      miniGame: 'HangeulTyphoon',
      score: this.score, // Score is primary for solo, less so for duel outcome
      mode: this.currentGameMode,
      isDuel: isDuel,
      outcome: outcomeStatus,
    };

    this.time.delayedCall(2500, () => {
      this.scene.stop('HangeulTyphoonScene');
      this.scene.start('MainBoardScene', { fromMiniGame: true, miniGameResults: results });
    });
  }

  // Public method to be called when the duel ends based on authoritative state
  public forceEndDuel(winnerId: string | null) {
    if (this.isGameOver) return;
    this.isGameOver = true;

    if (this.blockSpawnTimer) this.blockSpawnTimer.remove(false);
    if (this.comboTimer) { this.comboTimer.remove(false); this.comboTimer = null; }
    this.input.keyboard.removeAllListeners('keydown');

    const gameWidth = this.sys.game.config.width as number;
    const gameHeight = this.sys.game.config.height as number;
    let outcomeMessage = 'DUEL ENDED';
    let outcomeStatus: 'victory' | 'defeat' | 'draw' = 'draw'; // Default to draw if no clear winner

    if (winnerId === this.attackerPlayerId) {
      outcomeMessage = 'VICTORY!';
      outcomeStatus = 'victory';
    } else if (winnerId && winnerId === this.targetPlayerId) {
      outcomeMessage = 'DEFEAT!';
      outcomeStatus = 'defeat';
    } else if (!winnerId) {
       // Could be a draw or server error, specific message if needed
       outcomeMessage = "DUEL ENDED"; // Or "DRAW!"
       outcomeStatus = 'draw';
    }

    console.log(`Duel ended by server. Winner: ${winnerId || 'None'}. Player is: ${this.attackerPlayerId}. Outcome: ${outcomeStatus}`);
    // // Play win/loss/draw sound

    this.gameOverText = this.add.text(
      gameWidth / 2, gameHeight / 2, outcomeMessage,
      { fontSize: '64px', color: outcomeStatus === 'victory' ? '#00ff00' : (outcomeStatus === 'defeat' ? '#ff0000' : '#ffff00'), backgroundColor: '#000000' }
    ).setOrigin(0.5);

    const results = {
      miniGame: 'HangeulTyphoon',
      score: this.score,
      mode: this.currentGameMode,
      isDuel: true,
      outcome: outcomeStatus,
    };

    this.time.delayedCall(2500, () => {
      this.scene.stop('HangeulTyphoonScene');
      this.scene.start('MainBoardScene', { fromMiniGame: true, miniGameResults: results });
    });
  }


  private updateScoreDisplay() {
    if (this.scoreText) { // Check if scoreText is initialized
      this.scoreText.setText(`Score: ${this.score}`);
    }
  }

  private clearAttackInput() {
    this.inputTextString = '';
    this.currentInputText.setText(this.inputTextString);
    this.isInAttackMode = false;
    this.currentInputText.setBackgroundColor('#ffffff');
  }

  private async handleAttackCommand(attackWord: string) {
    if (attackWord.length === 0) {
      console.log("Empty attack word submitted.");
      this.clearAttackInput();
      return;
    }

    console.log(`Initiating attack with word: "${attackWord}" for game: ${this.gameId}`);

    const requestPayload = {
      gameId: this.gameId,
      attackerPlayerId: this.attackerPlayerId,
      targetPlayerId: this.targetPlayerId,
      attackWord: attackWord
    };

    console.log("Calling sendTyphoonAttack with payload:", requestPayload);

    // Call the actual service (which will be mocked for now)
    sendTyphoonAttackService(this.gameId, this.attackerPlayerId, this.targetPlayerId, attackWord)
      .then((response: HangeulTyphoonAttackResponse) => { // Make sure response is typed
        this.handleAttackResponse(response);
      })
      .catch((error) => {
        console.error("Error calling sendTyphoonAttackService:", error);
        // Handle a generic error from the service call itself (e.g., network issue)
        // This is different from a 'failure' status from the function.
        // We might want to penalize the attacker here too, or show a generic error.
        const errorResponse: HangeulTyphoonAttackResponse = {
          status: 'failure',
          reason: 'SERVICE_CALL_ERROR', // Or a more specific error code
          message: 'Error sending attack. Please try again.',
          attackerPlayerId: this.attackerPlayerId,
          attackerPenaltyGroundRiseAmount: 5 // Example minimal penalty for service error
        };
        this.handleAttackResponse(errorResponse);
      });

    this.clearAttackInput();
  }

  private handleAttackResponse(response: HangeulTyphoonAttackResponse) { // Typed response
    console.log("Received attack response:", response);
    if (this.isGameOver && response.status !== 'success' && response.reason !== 'SERVICE_CALL_ERROR') { // Don't ignore service call errors for display
        console.log("Game is over, attack response ignored for penalty/further state change (unless it's a service error).");
        return;
    }

    if (response.status === 'success') {
      console.log(`Client: Attack reported as SUCCESS. Word: ${response.destroyedBlockWord}. Target ground rise: ${response.targetGroundRiseAmount}`);
      // Opponent's ground rise is handled by them listening to Firestore.
      // // this.sound.play('sfx_attack_sent');
    } else if (response.status === 'failure') {
      console.log(`Client: Attack reported as FAILURE. Reason: ${response.reason}. Attacker penalty: ${response.attackerPenaltyGroundRiseAmount}`);
      // // this.sound.play('sfx_attack_failed');
      if (response.attackerPenaltyGroundRiseAmount && response.attackerPenaltyGroundRiseAmount > 0) {
        this.riseOwnGround(response.attackerPenaltyGroundRiseAmount);
        const penaltyText = this.add.text(
          (this.sys.game.config.width as number) / 2,
          (this.sys.game.config.height as number) / 2 + 50,
          'ATTACK FAILED! PENALTY!',
          { fontSize: '32px', color: '#ff9900', backgroundColor: '#330000' }
        ).setOrigin(0.5);
        this.time.delayedCall(2000, () => { penaltyText.destroy(); });
      }
    }
  }

  private riseOwnGround(amount: number) {
    if (this.isGameOver) return;

    console.log(`Player's ground rising by ${amount}. Previous groundY: ${this.groundY}`);

    const newGroundY = this.groundY - amount;
    this.groundY = newGroundY; // Update logical groundY

    // // Play ground rise sound
    // // this.sound.play('sfx_ground_rise');

    // Animate the visual line
    this.tweens.add({
      targets: this.playerGroundLine,
      y: newGroundY, // Target the 'y' property of the Line game object
      duration: 300, // milliseconds for the animation
      ease: 'Power2',
      onComplete: () => {
        // Ensure logical groundY and visual line position are perfectly synced after tween
        if (this.playerGroundLine) { // Check if it hasn't been destroyed (e.g. scene shutdown)
            this.playerGroundLine.y = newGroundY;
        }
      }
    });

    if (this.groundY <= this.gameAreaY + 20) {
        console.log("Ground has risen too high! Triggering game over.");
        if (!this.isGameOver) this.triggerGameOver();
    }
    console.log(`Player's new groundY (logical): ${this.groundY}, target visual line Y: ${newGroundY}`);
  }

  public updateOwnGroundHeightFromServer(newServerGroundHeight: number) {
    if (this.isGameOver) {
      console.log("Game is over, ignoring ground height update from server.");
      return;
    }

    console.log(`Received ground height update from server. New server ground height: ${newServerGroundHeight}, current client groundY: ${this.groundY}`);

    const newClientTargetY = this.initialPlayerBaseGroundY - newServerGroundHeight;

    if (newClientTargetY < this.groundY) {
      const amountToRise = this.groundY - newClientTargetY;
      console.log(`Client ground needs to rise by ${amountToRise} to match server.`);
      this.riseOwnGround(amountToRise);
    } else if (newClientTargetY > this.groundY) {
      console.warn(`Server ground height ${newServerGroundHeight} would lower client ground. Current client Y: ${this.groundY}, Target Y: ${newClientTargetY}. Ignoring or snapping.`);
    } else {
      console.log("Client ground height is already in sync with server.");
    }
  }

  private resetCombo() {
    this.currentCombo = 0;
    this.comboTimer = null;
    this.updateComboDisplay();
    console.log("Combo reset");
    // // Play combo break sound, if desired
    // // this.sound.play('sfx_combo_break');
  }

  private updateComboDisplay() {
    if (this.comboText) {
      this.comboText.setText(`Combo: ${this.currentCombo}`);
    }
  }

  // --- Duel Specific Methods ---

  private updateOpponentGroundVisual(newServerGroundHeight: number) {
    if (!this.opponentGroundLine || !this.opponentGroundLine.active) { // Check if opponent view is active
      console.log("Opponent view not active, skipping opponent ground update.");
      return;
    }
    if (this.isGameOver) { // Or perhaps a specific flag for duel over
        console.log("Duel is over, opponent ground update ignored.");
        return;
    }

    const targetY = this.initialOpponentBaseGroundY - newServerGroundHeight;
    console.log(`Opponent's ground updating. Server height: ${newServerGroundHeight}, Target Y: ${targetY}, Current Visual Y: ${this.opponentGroundLine.y}`);

    this.opponentGroundY = targetY; // Update logical opponent ground Y

    this.tweens.add({
      targets: this.opponentGroundLine,
      y: targetY,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        if (this.opponentGroundLine && this.opponentGroundLine.active) {
          this.opponentGroundLine.y = targetY;
        }
      }
    });

    // Check if opponent's ground reached critical height (conceptual game over for them)
    // The actual game over logic for duel would be driven by server state.
    if (targetY <= this.opponentGameAreaY + 20) { // Example critical threshold
      console.log("Opponent's ground has reached critical height!");
      // Potentially trigger some visual indication or wait for server to declare winner.
    }
  }

  /**
   * Public method to be called by the parent component (e.g., React) when duel state updates.
   * It assumes duelPlayerStates contains groundHeight for both players.
   */
  public updateDuelPlayersState(
    // TODO: Define these types properly, perhaps in src/types/hangeul.ts or game.ts
    // For now, using simple inline objects for structure.
    playerStates: { [playerId: string]: { groundHeight: number /*, other states like score, blocks? */ } }
  ) {
    if (this.isGameOver) return;

    const ownState = playerStates[this.attackerPlayerId];
    const opponentState = playerStates[this.targetPlayerId];

    if (ownState && typeof ownState.groundHeight === 'number') {
      // console.log(`Updating own ground from duel state: ${ownState.groundHeight}`);
      this.updateOwnGroundHeightFromServer(ownState.groundHeight);
    }

    if (opponentState && typeof opponentState.groundHeight === 'number' && this.opponentGameAreaX > 0) {
      // console.log(`Updating opponent's ground from duel state: ${opponentState.groundHeight}`);
      this.updateOpponentGroundVisual(opponentState.groundHeight);
    }
  }
}

import * as Phaser from 'phaser';

export class HangeulTyphoonScene extends Phaser.Scene {
    private hangeulWords: string[] = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하', '고', '노', '도', '로', '모', '보', '소', '오', '조', '초', '코', '토', '포', '호', '구', '누', '두', '루', '무', '부', '수', '우', '주', '추', '쿠', '투', '푸', '후', '안녕하세요', '감사합니다', '제발', '미안해', '사랑해'];
    private activeBlocks: Phaser.GameObjects.Container[] = [];
    private blockGenerationTimer!: Phaser.Time.TimerEvent;
    private playAreaBounds!: Phaser.Geom.Rectangle;
    private groundLevel!: number;

    private blockSpeed: number = 50; // Pixels per second
    private score: number = 0; // Basic score for difficulty scaling later
    private nextDifficultyIncreaseScore: number = 500; // Score at which difficulty increases
    private initialBlockDelay: number = 2000; // Initial delay for block generation
    private currentBlockDelay: number = 2000; // Current delay, will decrease
    private minBlockDelay: number = 500; // Minimum delay for block generation
    private speedIncreaseFactor: number = 10; // How much speed increases by
    private delayDecreaseFactor: number = 100; // How much delay decreases by (ms)

    private inputElement!: Phaser.GameObjects.DOMElement<HTMLInputElement>;
    private highlightedBlock: Phaser.GameObjects.Container | null = null;

    private isGameOver: boolean = false;
    private gameOverText: Phaser.GameObjects.Text | null = null;

    private scoreText!: Phaser.GameObjects.Text;
    private comboText!: Phaser.GameObjects.Text;
    private gameModeTextDisplay!: Phaser.GameObjects.Text;
    private gameMode: string = 'Épreuve du Scribe'; // Default game mode

    constructor() {
        super({ key: 'HangeulTyphoonScene' });
    }

    init(data: { gameMode?: string }): void {
        console.log('HangeulTyphoonScene initialized with data:', data);
        if (data.gameMode) {
            this.gameMode = data.gameMode;
        }
        // If gameModeTextDisplay is already created, update it.
        // However, create() runs after init(), so we'll set it there.
    }

    preload(): void {
        // TODO: Load assets
        console.log('HangeulTyphoonScene preload');
    }

    create(): void {
        console.log('HangeulTyphoonScene create');

        // Define play area and ground level based on camera
        this.playAreaBounds = new Phaser.Geom.Rectangle(50, 50, this.cameras.main.width - 100, this.cameras.main.height - 150);
        this.groundLevel = this.playAreaBounds.bottom - 5; // Ground line slightly above the bottom of play area

        // Access game mode from scene properties (set in init)
        const gameModeText = 'Game Mode: ' + (this.gameMode || 'N/A');

        // Visual for Play Area
        const playAreaVisual = this.add.graphics();
        playAreaVisual.fillStyle(0x222222, 1);
        playAreaVisual.fillRect(this.playAreaBounds.x, this.playAreaBounds.y, this.playAreaBounds.width, this.playAreaBounds.height);
        this.add.text(this.cameras.main.width / 2, this.playAreaBounds.y - 15, 'Play Area', { font: '16px Arial', color: '#ffffff' }).setOrigin(0.5, 0.5);

        // HUD
        this.scoreText = this.add.text(10, 10, 'Score: 0', { font: '16px Arial', color: '#ffffff' });
        this.comboText = this.add.text(10, 30, 'Combo: x1', { font: '16px Arial', color: '#ffffff' });
        this.gameModeTextDisplay = this.add.text(this.cameras.main.width - 10, 10, gameModeText, { font: '16px Arial', color: '#ffffff' }).setOrigin(1, 0);
        this.updateScoreDisplay(); // Initialize score display

        // Visual for Input Field Placeholder (will be replaced later)
        const inputFieldPlaceholderY = this.cameras.main.height - 80;
        // const inputFieldPlaceholder = this.add.graphics(); // REMOVED
        // inputFieldPlaceholder.fillStyle(0x555555, 1); // REMOVED
        // inputFieldPlaceholder.fillRect(this.playAreaBounds.x, inputFieldPlaceholderY, this.playAreaBounds.width, 40); // REMOVED
        // this.add.text(this.cameras.main.width / 2, inputFieldPlaceholderY + 20, 'Input Field Placeholder', { font: '16px Arial', color: '#dddddd' }).setOrigin(0.5, 0.5); // REMOVED

        // --- Input Field ---
        this.inputElement = this.add.dom(this.cameras.main.width / 2, inputFieldPlaceholderY + 20).createFromHTML('<input type="text" style="width: 300px; padding: 10px; font-size: 16px;" placeholder="Type Hangeul here...">');
        const htmlInputElement = this.inputElement.node as HTMLInputElement;

        // Set focus to the input field when the scene starts or is clicked
        htmlInputElement.focus();
        this.input.on('pointerdown', () => {
            htmlInputElement.focus();
        });

        // Event listener for input changes
        this.inputElement.on('input', (event: Event) => {
            const inputValue = (event.target as HTMLInputElement).value;
            this.handleInputValidation(inputValue);
        });

        // Event listener for keydown (Enter/Space)
        this.inputElement.on('keydown', (event: KeyboardEvent) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault(); // Prevent space from typing a space, or enter from submitting a form
                this.handleInputSubmission();
            }
        });

        // Visual for Ground ('sol')
        const groundVisual = this.add.graphics();
        groundVisual.fillStyle(0x888888, 1);
        groundVisual.fillRect(this.playAreaBounds.x, this.groundLevel, this.playAreaBounds.width, 5);
        this.add.text(this.cameras.main.width / 2, this.groundLevel - 10, 'Sol (Ground)', { font: '12px Arial', color: '#ffffff' }).setOrigin(0.5, 1);

        // Start block generation timer
        // Generate a block every 2 seconds (example, will be adjusted for difficulty)
        this.blockGenerationTimer = this.time.addEvent({
            delay: 2000,
            callback: this.generateBlock,
            callbackScope: this,
            loop: true
        });

        console.log('Play area, UI placeholders, ground, and block generation timer added.');
        // Call generateBlock once at the start for an immediate block
        this.generateBlock();
    }


    update(time: number, delta: number): void {
        if (this.isGameOver) {
            return;
        }

        // Move active blocks
        for (let i = this.activeBlocks.length - 1; i >= 0; i--) {
            const block = this.activeBlocks[i];
            if (!block || !block.active) continue; // Skip if block was destroyed mid-loop

            block.y += (this.blockSpeed * delta) / 1000; // Movement based on delta time

            // Check for blocks reaching ground
            if (block.y + block.height > this.groundLevel) {
                console.log(`Block \${block.getData('word')} reached ground! GAME OVER.`);
                this.triggerGameOver();
                break; // Exit loop once game is over
            }
        }

        // Placeholder for difficulty increase - will be tied to score later.
        // For now, let's imagine score is increasing elsewhere.
        // This part will be expanded in the scoring/game over steps.
        // if (this.score >= this.nextDifficultyIncreaseScore) {
        //     this.increaseDifficulty();
        //     this.nextDifficultyIncreaseScore += 500; // Set next threshold
        // }
    }

    private generateBlock(): void {
        if (this.isGameOver) return;
        if (!this.playAreaBounds) {
            // Initialize play area bounds if not already done (e.g. in create)
            // This is a fallback, ideally initialized once in create()
            this.playAreaBounds = new Phaser.Geom.Rectangle(50, 50, this.cameras.main.width - 100, this.cameras.main.height - 150);
        }

        const word = Phaser.Math.RND.pick(this.hangeulWords);

        // Block dimensions - can be adjusted
        const blockWidth = word.length * 20 + 20; // Adjust based on font size and padding
        const blockHeight = 40;

        // Random x position within the play area
        const x = Phaser.Math.Between(this.playAreaBounds.left, this.playAreaBounds.right - blockWidth);
        const y = this.playAreaBounds.top; // Start at the top of the play area

        const blockContainer = this.add.container(x, y);

        const graphics = this.add.graphics();
        graphics.fillStyle(0xdddddd, 1); // Light grey for blocks
        graphics.fillRect(0, 0, blockWidth, blockHeight);

        const text = this.add.text(blockWidth / 2, blockHeight / 2, word, {
            font: '18px Arial',
            color: '#000000',
            align: 'center'
        }).setOrigin(0.5, 0.5);

        blockContainer.add([graphics, text]);
        blockContainer.setData('word', word); // Store word data for easy access
        blockContainer.setSize(blockWidth, blockHeight); // Important for physics or custom bounds checks

        this.activeBlocks.push(blockContainer);

        console.log(\`Generated block with word: \${word} at (\${x}, \${y})\`);
    }

    private increaseDifficulty(): void {
        this.blockSpeed += this.speedIncreaseFactor;

        this.currentBlockDelay = Math.max(this.minBlockDelay, this.currentBlockDelay - this.delayDecreaseFactor);

        // Update existing timer if it's running
        if (this.blockGenerationTimer) {
            this.blockGenerationTimer.destroy(); // Destroy old timer
        }
        this.blockGenerationTimer = this.time.addEvent({ // Create new one with updated delay
            delay: this.currentBlockDelay,
            callback: this.generateBlock,
            callbackScope: this,
            loop: true
        });

        console.log(\`Difficulty increased: Speed = \${this.blockSpeed}, Delay = \${this.currentBlockDelay}\`);
    }

    private handleInputValidation(inputValue: string): void {
        if (this.isGameOver) return;
        // Clear previous highlight
        if (this.highlightedBlock) {
            const graphics = this.highlightedBlock.list[0] as Phaser.GameObjects.Graphics;
            graphics.clear(); // Assuming first element is the graphics
            graphics.fillStyle(0xdddddd, 1); // Restore original color
            graphics.fillRect(0, 0, this.highlightedBlock.width, this.highlightedBlock.height);
            this.highlightedBlock = null;
        }

        if (inputValue.trim() === '') {
            return;
        }

        for (const block of this.activeBlocks) {
            const blockWord = block.getData('word') as string;
            if (blockWord === inputValue) {
                this.highlightedBlock = block;
                const graphics = this.highlightedBlock.list[0] as Phaser.GameObjects.Graphics;
                graphics.clear();
                graphics.fillStyle(0x77dd77, 1); // Highlight color (e.g., light green)
                graphics.fillRect(0, 0, this.highlightedBlock.width, this.highlightedBlock.height);
                break; // Stop after finding the first match
            }
        }
    }

    private handleInputSubmission(): void {
        if (this.isGameOver) return;
        const htmlInputElement = this.inputElement.node as HTMLInputElement;
        if (this.highlightedBlock) {
            const word = this.highlightedBlock.getData('word') as string;
            console.log(`Input submitted! Matched block: \${word}. Starting destruction.`);

            // Add to score
            this.score += 10; // Example score increment
            this.updateScoreDisplay();
            console.log(`Score increased to: \${this.score}`);

            // Call increaseDifficulty if score threshold is met
            if (this.score >= this.nextDifficultyIncreaseScore) {
                 this.increaseDifficulty();
                 this.nextDifficultyIncreaseScore += 500; // Set next threshold
                 console.log(`Next difficulty increase at score: \${this.nextDifficultyIncreaseScore}`);
            }

            // Store reference for tween complete
            const blockToDestroy = this.highlightedBlock;

            // Remove from activeBlocks array immediately
            this.activeBlocks = this.activeBlocks.filter(b => b !== blockToDestroy);
            this.highlightedBlock = null; // Clear highlight immediately

            // Simple visual effect: fade out and shrink
            this.tweens.add({
                targets: blockToDestroy,
                alpha: 0,
                scaleX: 0.5,
                scaleY: 0.5,
                duration: 200, // milliseconds
                ease: 'Power2',
                onComplete: () => {
                    blockToDestroy.destroy(); // Fully destroy the game object
                    console.log(`Block \${word} destroyed.`);
                }
            });
        }
        htmlInputElement.value = ''; // Clear input field
        this.handleInputValidation(''); // Re-validate to clear any potential highlight if input was cleared manually
        htmlInputElement.focus(); // Keep focus on input
    }

    private triggerGameOver(): void {
        this.isGameOver = true;
        if (this.blockGenerationTimer) { // Check if timer exists before destroying
            this.blockGenerationTimer.destroy();
        }

        // Disable input
        if (this.inputElement && this.inputElement.node) {
            (this.inputElement.node as HTMLInputElement).disabled = true;
        }

        // Display Game Over message
        this.gameOverText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 'GAME OVER', {
            font: '48px Arial',
            color: '#ff0000',
            align: 'center',
            backgroundColor: '#000000'
        }).setOrigin(0.5, 0.5).setDepth(100); // Ensure it's on top

        // Clear highlighted block if any, as game is over
        if (this.highlightedBlock) {
            const graphics = this.highlightedBlock.list[0] as Phaser.GameObjects.Graphics;
            graphics.clear();
            graphics.fillStyle(0xdddddd, 1); // Restore original color
            graphics.fillRect(0, 0, this.highlightedBlock.width, this.highlightedBlock.height);
            this.highlightedBlock = null;
        }
    }

    private updateScoreDisplay(): void {
        if (this.scoreText) { // Check if scoreText is initialized
            this.scoreText.setText('Score: ' + this.score);
        }
    }

}

// IMPORTANT: Ensure Firebase is initialized and the functions instance is correctly passed or obtained.
// For Firebase v9 modular SDK, you would typically do:
// import { getFunctions, httpsCallable } from 'firebase/functions';
// const functions = getFunctions(firebaseApp); // firebaseApp from initialization
// And then use httpsCallable(functions, 'sendTyphoonAttack');
// For Firebase v8 (namespaced), it's often:
// import firebase from 'firebase/app'; // Or your specific import
// import 'firebase/functions';
// const functions = firebase.functions(); // Or firebase.app().functions('region');
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

    private opponentPlayAreaBounds!: Phaser.Geom.Rectangle;
    private opponentPlayAreaVisual!: Phaser.GameObjects.Graphics;

    private currentAttackTargetWord: string | null = null; // Stores the word if <> prefix is used

    private functions!: firebase.functions.Functions; // To hold Firebase functions instance
    private gameId: string | null = null;
    private playerId: string | null = null; // Current player's UID
    private opponentId: string | null = null; // Opponent's UID

    private scoreText!: Phaser.GameObjects.Text;
    private comboText!: Phaser.GameObjects.Text;
    private gameModeTextDisplay!: Phaser.GameObjects.Text;
    private gameMode: string = 'Épreuve du Scribe'; // Default game mode

    constructor() {
        super({ key: 'HangeulTyphoonScene' });
    }

    init(data: {
        gameMode?: string;
        gameId?: string;
        playerId?: string;
        opponentId?: string;
        firebaseFuncs?: firebase.functions.Functions; // Pass Firebase functions instance
    }): void {
        console.log('HangeulTyphoonScene initialized with data:', data);
        if (data.gameMode) {
            this.gameMode = data.gameMode;
        }
        if (data.gameId) {
            this.gameId = data.gameId;
        }
        if (data.playerId) {
            this.playerId = data.playerId;
        }
        if (data.opponentId) {
            this.opponentId = data.opponentId;
        }
        if (data.firebaseFuncs) {
            this.functions = data.firebaseFuncs;
        } else {
            console.warn('Firebase functions instance not provided to HangeulTyphoonScene.');
            // Fallback or error handling for when functions are not passed.
            // Depending on project structure, attempt to get from global Phaser game object if possible.
            // e.g., if (this.sys.game.app && this.sys.game.app.firebase) this.functions = this.sys.game.app.firebase.functions('europe-west1');
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

        // Define overall game dimensions
        const gameWidth = this.cameras.main.width;
        const gameHeight = this.cameras.main.height;

        // Opponent area configuration (e.g., on the right side)
        const opponentAreaWidth = gameWidth * 0.3; // 30% of game width
        const opponentAreaPadding = 20;

        // Main play area configuration (takes remaining space)
        const mainAreaWidth = gameWidth - opponentAreaWidth - opponentAreaPadding * 2; // Adjusted for opponent view and padding
        const mainAreaX = opponentAreaPadding; // Main area starts from left

        // Define main play area and ground level based on new layout
        this.playAreaBounds = new Phaser.Geom.Rectangle(mainAreaX, 50, mainAreaWidth, gameHeight - 150);
        this.groundLevel = this.playAreaBounds.bottom - 5;

        // Opponent play area bounds
        const opponentAreaX = mainAreaX + mainAreaWidth + opponentAreaPadding;
        this.opponentPlayAreaBounds = new Phaser.Geom.Rectangle(opponentAreaX, 50, opponentAreaWidth - opponentAreaPadding, gameHeight - 150); // Adjusted for padding on its right

        // Access game mode from scene properties (set in init)
        const gameModeText = 'Game Mode: ' + (this.gameMode || 'N/A');

        // Visual for Main Play Area
        const playAreaVisual = this.add.graphics();
        playAreaVisual.fillStyle(0x222222, 1);
        playAreaVisual.fillRect(this.playAreaBounds.x, this.playAreaBounds.y, this.playAreaBounds.width, this.playAreaBounds.height);
        this.add.text(this.playAreaBounds.centerX, this.playAreaBounds.y - 15, 'Your Play Area', { font: '16px Arial', color: '#ffffff' }).setOrigin(0.5, 0.5);

        // Visual for Opponent's Play Area Placeholder
        this.opponentPlayAreaVisual = this.add.graphics();
        this.opponentPlayAreaVisual.fillStyle(0x111111, 1); // Darker color for opponent area
        this.opponentPlayAreaVisual.lineStyle(2, 0x444444); // Border
        this.opponentPlayAreaVisual.fillRect(this.opponentPlayAreaBounds.x, this.opponentPlayAreaBounds.y, this.opponentPlayAreaBounds.width, this.opponentPlayAreaBounds.height);
        this.opponentPlayAreaVisual.strokeRect(this.opponentPlayAreaBounds.x, this.opponentPlayAreaBounds.y, this.opponentPlayAreaBounds.width, this.opponentPlayAreaBounds.height);
        this.add.text(this.opponentPlayAreaBounds.centerX, this.opponentPlayAreaBounds.y - 15, 'Opponent', { font: '14px Arial', color: '#cccccc' }).setOrigin(0.5, 0.5);

        // HUD
        this.scoreText = this.add.text(mainAreaX + 10, 10, 'Score: 0', { font: '16px Arial', color: '#ffffff' });
        this.comboText = this.add.text(mainAreaX + 10, 30, 'Combo: x1', { font: '16px Arial', color: '#ffffff' });
        this.gameModeTextDisplay = this.add.text(gameWidth - opponentAreaPadding, 10, gameModeText, { font: '16px Arial', color: '#ffffff' }).setOrigin(1, 0);
        this.updateScoreDisplay(); // Initialize score display

        // --- Input Field ---
        const inputFieldY = gameHeight - 80;
        const inputFieldX = this.playAreaBounds.centerX;

        this.inputElement = this.add.dom(inputFieldX, inputFieldY + 20).createFromHTML('<input type=\"text\" style=\"width: 300px; padding: 10px; font-size: 16px;\" placeholder=\"Type Hangeul here...\">');
        const htmlInputElement = this.inputElement.node as HTMLInputElement;
        htmlInputElement.focus();
        this.input.on('pointerdown', () => {
            if (!this.isGameOver) htmlInputElement.focus(); // Only focus if game not over
        });
        this.inputElement.on('input', (event: Event) => {
            if (this.isGameOver) return;
            this.handleInputValidation((event.target as HTMLInputElement).value);
        });
        this.inputElement.on('keydown', (event: KeyboardEvent) => {
            if (this.isGameOver) return;
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                this.handleInputSubmission();
            }
        });

        // Visual for Ground ('sol') - Main player
        const groundVisual = this.add.graphics();
        groundVisual.fillStyle(0x888888, 1);
        groundVisual.fillRect(this.playAreaBounds.x, this.groundLevel, this.playAreaBounds.width, 5);

        // Start block generation timer (uses this.playAreaBounds for x positioning)
        this.blockGenerationTimer = this.time.addEvent({
            delay: this.currentBlockDelay,
            callback: this.generateBlock,
            callbackScope: this,
            loop: true
        });

        console.log('Main play area, Opponent placeholder, UI, ground, and block generation timer added.');
        if (!this.isGameOver) {
             this.generateBlock();
        }
    }


    update(time: number, delta: number): void {
        if (this.isGameOver) {
            return;
        }

        for (let i = this.activeBlocks.length - 1; i >= 0; i--) {
            const block = this.activeBlocks[i];
            if (!block || !block.active) continue;

            block.y += (this.blockSpeed * delta) / 1000;

            // Vulnerability check
            if (!block.getData('isVulnerable') && time >= block.getData('vulnerabilityTimestamp')) {
                block.setData('isVulnerable', true);
                this.updateBlockAppearance(block);
                // console.log(`Block \${block.getData('word')} is now VULNERABLE`);
            }

            if (block.y + block.height > this.groundLevel) {
                // console.log(`Block \${block.getData('word')} reached ground! GAME OVER.`);
                this.triggerGameOver();
                break;
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
            // This is a fallback, ideally initialized once in create()
            this.playAreaBounds = new Phaser.Geom.Rectangle(50, 50, this.cameras.main.width - 100, this.cameras.main.height - 150);
        }

        const word = Phaser.Math.RND.pick(this.hangeulWords);
        const blockWidth = word.length * 20 + 20;
        const blockHeight = 40;
        const x = Phaser.Math.Between(this.playAreaBounds.left, this.playAreaBounds.right - blockWidth);
        const y = this.playAreaBounds.top;

        const blockContainer = this.add.container(x, y);
        blockContainer.setSize(blockWidth, blockHeight); // Set size first

        const graphics = this.add.graphics(); // Graphics will be drawn by updateBlockAppearance
        const text = this.add.text(blockWidth / 2, blockHeight / 2, word, {
            font: '18px Arial',
            // Color set by updateBlockAppearance
            align: 'center'
        }).setOrigin(0.5, 0.5);

        blockContainer.add([graphics, text]);
        blockContainer.setData('word', word);
        blockContainer.setData('isVulnerable', false);
        blockContainer.setData('vulnerabilityTimestamp', this.time.now + 5000); // Use this.time.now
        blockContainer.setData('isHighlighted', false);

        this.updateBlockAppearance(blockContainer); // Set initial protected appearance

        this.activeBlocks.push(blockContainer);
        // console.log(`Generated block with word: \${word} at (\${x}, \${y}), vulnerable at \${blockContainer.getData('vulnerabilityTimestamp')}`);
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

        this.currentAttackTargetWord = null; // Reset attack state

        // Clear previous block highlight
        if (this.highlightedBlock) {
            this.highlightedBlock.setData('isHighlighted', false);
            this.updateBlockAppearance(this.highlightedBlock);
            this.highlightedBlock = null;
        }

        // Check for attack prefix <>
        if (inputValue.startsWith('<') && inputValue.endsWith('>')) {
            if (inputValue.length > 2) { // e.g. <word>
                this.currentAttackTargetWord = inputValue.substring(1, inputValue.length - 1);
                console.log('Attack input detected for word:', this.currentAttackTargetWord);
                // No local block highlighting when attack prefix is used.
            }
            return; // Don't process for local block matching if it's an attack format
        }

        // If not an attack, proceed with normal local block highlighting
        if (inputValue.trim() === '') {
            return;
        }

        for (const block of this.activeBlocks) {
            const blockWord = block.getData('word') as string;
            if (blockWord === inputValue) {
                this.highlightedBlock = block;
                this.highlightedBlock.setData('isHighlighted', true);
                this.updateBlockAppearance(this.highlightedBlock);
                break;
            }
        }
    }

    private handleInputSubmission(): void {
        if (this.isGameOver) return;
        const htmlInputElement = this.inputElement.node as HTMLInputElement;

        if (this.currentAttackTargetWord) {
            const attackWord = this.currentAttackTargetWord; // Store before clearing
            console.log(\`Attack submission: Targeting word '\${attackWord}' on opponent.\`);

            if (!this.functions) {
                console.error('Firebase Functions not available. Cannot send attack.');
                htmlInputElement.value = '';
                this.currentAttackTargetWord = null;
                this.handleInputValidation('');
                htmlInputElement.focus();
                return;
            }
            if (!this.gameId || !this.playerId || !this.opponentId) {
                console.error('Game IDs (gameId, playerId, opponentId) not set. Cannot send attack.');
                htmlInputElement.value = '';
                this.currentAttackTargetWord = null;
                this.handleInputValidation('');
                htmlInputElement.focus();
                return;
            }

            const sendTyphoonAttackCallable = this.functions.httpsCallable('sendTyphoonAttack');
            sendTyphoonAttackCallable({
                gameId: this.gameId,
                targetId: this.opponentId,
                word: attackWord
            })
            .then((result) => {
                console.log('sendTyphoonAttack result:', result);
                const data = result.data as { success: boolean; message?: string; penaltyToAttacker?: boolean };
                if (data.success) {
                    console.log('Attack successful:', data.message || 'No message.');
                } else {
                    console.warn('Attack failed by server:', data.message || 'No specific reason.');
                }
            })
            .catch((error) => {
                console.error('Error calling sendTyphoonAttack:', error);
            });

            htmlInputElement.value = '';
            this.currentAttackTargetWord = null;
            this.handleInputValidation('');
            htmlInputElement.focus();
            return;
        }

        // If not an attack, proceed with normal local block destruction
        if (this.highlightedBlock) {
            const word = this.highlightedBlock.getData('word') as string;
            this.score += 10;
            this.updateScoreDisplay();
            if (this.score >= this.nextDifficultyIncreaseScore) {
                 this.increaseDifficulty();
                 this.nextDifficultyIncreaseScore += 500;
            }

            const blockToDestroy = this.highlightedBlock;
            blockToDestroy.setData('isHighlighted', false);

            this.activeBlocks = this.activeBlocks.filter(b => b !== blockToDestroy);
            this.highlightedBlock = null;

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

    private updateBlockAppearance(block: Phaser.GameObjects.Container): void {
        if (!block || !block.list || block.list.length === 0) return;

        const graphics = block.list[0] as Phaser.GameObjects.Graphics;
        const text = block.list[1] as Phaser.GameObjects.Text; // Assuming text is second element
        const isVulnerable = block.getData('isVulnerable') as boolean;
        const isHighlighted = block.getData('isHighlighted') as boolean; // New data property for highlight state

        graphics.clear();

        if (isHighlighted) {
            graphics.fillStyle(0x77dd77, 1); // Highlight color (light green)
            text.setColor('#000000'); // Black text on highlight
        } else if (isVulnerable) {
            graphics.fillStyle(0xffffff, 1); // White for vulnerable
            text.setColor('#000000'); // Black text on white
        } else {
            graphics.fillStyle(0x000000, 1); // Black for protected
            text.setColor('#ffffff'); // White text on black
        }
        graphics.fillRect(0, 0, block.width, block.height); // Use block's setSize
    }

    private updateScoreDisplay(): void {
        if (this.scoreText) { // Check if scoreText is initialized
            this.scoreText.setText('Score: ' + this.score);
        }
    }

}

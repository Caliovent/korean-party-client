import * as Phaser from 'phaser';

export class HangeulTyphoonScene extends Phaser.Scene {
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

        // Access game mode from scene properties (set in init)
        const gameModeText = 'Game Mode: ' + (this.gameMode || 'N/A');

        // Placeholder for Play Area
        const playArea = this.add.graphics();
        playArea.fillStyle(0x222222, 1); // Dark grey color
        playArea.fillRect(50, 50, this.cameras.main.width - 100, this.cameras.main.height - 150); // Example dimensions
        this.add.text(this.cameras.main.width / 2, 30, 'Play Area', { font: '16px Arial', color: '#ffffff' }).setOrigin(0.5, 0.5);


        // Placeholder for HUD
        this.scoreText = this.add.text(10, 10, 'Score: 0', { font: '16px Arial', color: '#ffffff' });
        this.comboText = this.add.text(10, 30, 'Combo: x1', { font: '16px Arial', color: '#ffffff' });
        this.gameModeTextDisplay = this.add.text(this.cameras.main.width - 10, 10, gameModeText, { font: '16px Arial', color: '#ffffff' }).setOrigin(1, 0);

        // Placeholder for Input Field
        // Actual HTML input element creation requires DOM element support to be enabled in Phaser config (parent: true or domElement: element)
        // And then typically added like this:
        // const textEntry = this.add.dom(x, y).createFromHTML('<input type="text">').node as HTMLInputElement;
        // For now, we'll just add a visual representation or a text placeholder.
        const inputFieldPlaceholder = this.add.graphics();
        inputFieldPlaceholder.fillStyle(0x555555, 1);
        inputFieldPlaceholder.fillRect(50, this.cameras.main.height - 80, this.cameras.main.width - 100, 40);
        this.add.text(this.cameras.main.width / 2, this.cameras.main.height - 60, 'Input Field Placeholder', { font: '16px Arial', color: '#dddddd' }).setOrigin(0.5, 0.5);

        // Placeholder for Ground ('sol')
        const groundLevel = this.cameras.main.height - 100; // Position above the input field placeholder
        const ground = this.add.graphics();
        ground.fillStyle(0x888888, 1); // Grey color for the ground
        // Assuming playArea starts at x=50 and width is camera.width - 100
        ground.fillRect(50, groundLevel, this.cameras.main.width - 100, 5); // A thin line for the ground
        this.add.text(this.cameras.main.width / 2, groundLevel - 10, 'Sol (Ground)', { font: '12px Arial', color: '#ffffff' }).setOrigin(0.5, 1);

        // TODO: Placeholder for falling Blocks
        // Blocks will initially be represented by Phaser.GameObjects.Graphics (e.g., rectangles)
        // Example:
        // const block = this.add.graphics();
        // block.fillStyle(0xffffff, 1); // White color for a block
        // block.fillRect(x, y, width, height); // x, y, width, height to be dynamic
        // this.add.text(x + width / 2, y + height / 2, '한', { font: '16px Arial', color: '#000000' }).setOrigin(0.5, 0.5); // Example text in block

        console.log('Play area and UI placeholders added.');
    }

    update(): void {
        // TODO: Game logic
    }
}

import Phaser from 'phaser';

// Constantes pour la configuration du plateau
const TILE_SIZE = 70;
const TILE_SPACING = 15;
const BOARD_COLS = 8;
const BOARD_ROWS = 6;
const PLAYER_COLORS = [0x9b59b6, 0x3498db, 0x2ecc71, 0xf1c40f]; // Violet, Bleu, Vert, Jaune

export class MainBoardScene extends Phaser.Scene {
  private playerTokens: { [key: string]: Phaser.GameObjects.Container } = {};
  private tileCoordinates: { x: number, y: number }[] = [];

  constructor() {
    super({ key: 'MainBoardScene' });
  }

  // Méthode appelée par React pour passer les données initiales
  init(data: any) {
    this.registry.set('gameData', data);
  }

  create() {
    this.cameras.main.setBackgroundColor('#1e1e1e');
    this.drawBoard();
    this.createPlayerTokens();

    // Écouteur pour mettre à jour les positions si les données changent
    this.registry.events.on('changedata', (parent: any, key: string, data: any) => {
        if (key === 'gameData') {
            this.updatePlayerPositions(data.playerPositions);
        }
    });
  }

  // Dessine le chemin du plateau de jeu
  drawBoard() {
    const graphics = this.add.graphics();
    const boardWidth = BOARD_COLS * (TILE_SIZE + TILE_SPACING) - TILE_SPACING;
    const boardHeight = BOARD_ROWS * (TILE_SIZE + TILE_SPACING) - TILE_SPACING;
    const startX = (this.cameras.main.width - boardWidth) / 2;
    const startY = (this.cameras.main.height - boardHeight) / 2;
    let tileIndex = 0;

    const path = [
        ...Array(BOARD_COLS).fill(0).map((_, i) => ({ x: i, y: 0 })),
        ...Array(BOARD_ROWS - 1).fill(0).map((_, i) => ({ x: BOARD_COLS - 1, y: i + 1 })),
        ...Array(BOARD_COLS - 1).fill(0).map((_, i) => ({ x: BOARD_COLS - 2 - i, y: BOARD_ROWS - 1 })),
        ...Array(BOARD_ROWS - 2).fill(0).map((_, i) => ({ x: 0, y: BOARD_ROWS - 2 - i })),
    ];
    
    path.forEach(pos => {
        const x = startX + pos.x * (TILE_SIZE + TILE_SPACING);
        const y = startY + pos.y * (TILE_SIZE + TILE_SPACING);
        graphics.fillStyle(0x2a2a2a, 1);
        graphics.fillRoundedRect(x, y, TILE_SIZE, TILE_SIZE, 12);
        graphics.lineStyle(2, 0x333333);
        graphics.strokeRoundedRect(x, y, TILE_SIZE, TILE_SIZE, 12);
        
        const text = this.add.text(x + TILE_SIZE / 2, y + TILE_SIZE / 2, String(tileIndex), {
            fontFamily: 'Poppins', fontSize: '24px', color: '#a0a0a0'
        }).setOrigin(0.5);
        
        this.tileCoordinates[tileIndex] = { x: x + TILE_SIZE / 2, y: y + TILE_SIZE / 2 };
        tileIndex++;
    });
  }

  // Crée les pions pour chaque joueur
  createPlayerTokens() {
    const gameData = this.registry.get('gameData');
    
    gameData.players.forEach((playerId: string, index: number) => {
      const position = this.tileCoordinates[gameData.playerPositions[playerId] || 0];
      const playerColor = PLAYER_COLORS[index % PLAYER_COLORS.length];
      
      const circle = new Phaser.GameObjects.Arc(this, 0, 0, 18, 0, 360, false, playerColor, 1);
      circle.setStrokeStyle(3, 0xffffff);
      
      const pseudoInitial = gameData.playerDetails[playerId]?.pseudo.charAt(0).toUpperCase() || '?';
      const text = new Phaser.GameObjects.Text(this, 0, 0, pseudoInitial, { 
          fontFamily: 'Poppins', fontSize: '20px', color: '#ffffff', fontStyle: 'bold' 
      }).setOrigin(0.5);

      // On utilise un container pour grouper le pion et l'initiale
      const container = this.add.container(position.x, position.y, [circle, text]);
      this.playerTokens[playerId] = container;
    });
  }

  // Met à jour la position d'un pion avec une animation
  updatePlayerPositions(newPositions: Record<string, number>) {
    Object.keys(newPositions).forEach(playerId => {
        const tokenContainer = this.playerTokens[playerId];
        const newTileIndex = newPositions[playerId];
        const targetPosition = this.tileCoordinates[newTileIndex];

        if (tokenContainer && targetPosition) {
            this.tweens.add({
                targets: tokenContainer,
                x: targetPosition.x,
                y: targetPosition.y,
                ease: 'Power2',
                duration: 500
            });
        }
    });
  }
}

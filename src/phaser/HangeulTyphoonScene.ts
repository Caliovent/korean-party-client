import Phaser from 'phaser';

export default class HangeulTyphoonScene extends Phaser.Scene {
  private score: number = 0;
  private combo: number = 0;
  private gameMode: string = '';

  constructor() {
    super({ key: 'HangeulTyphoonScene' });
  }

  init(data: { gameMode: string }) {
    this.gameMode = data.gameMode || 'Mode Test'; // Default mode if none is provided
  }

  preload() {
    // Précharger les assets si nécessaire
  }

  create() {
    const { width, height } = this.scale;

    // Définition des dimensions et positions
    const mainZoneHeight = height * 0.7;
    const inputZoneHeight = height * 0.15; // Hauteur de la zone de saisie
    const hudHeight = 50; // Hauteur pour le HUD

    // Zone Joueur principale
    const mainPlayerZone = this.add.graphics();
    mainPlayerZone.fillStyle(0x000033, 0.8); // Couleur de fond bleu foncé, semi-transparent
    mainPlayerZone.fillRect(0, hudHeight, width * 0.7, mainZoneHeight - hudHeight); // 70% de la largeur pour le joueur principal

    // Ligne de "sol"
    const groundLineY = hudHeight + (mainZoneHeight - hudHeight) - 20; // 20px au-dessus du bas de la zone principale
    const groundLine = this.add.graphics();
    groundLine.lineStyle(4, 0xff0000, 1); // Ligne rouge
    groundLine.beginPath();
    groundLine.moveTo(0, groundLineY);
    groundLine.lineTo(width * 0.7, groundLineY);
    groundLine.closePath();
    groundLine.strokePath();
    this.add.text(10, groundLineY - 25, 'GAME OVER LINE', { fontSize: '10px', color: '#ff0000' });


    // Zone Adversaire (placeholder)
    const opponentZone = this.add.graphics();
    opponentZone.fillStyle(0x330000, 0.8); // Couleur de fond rouge foncé, semi-transparent
    opponentZone.fillRect(width * 0.7, hudHeight, width * 0.3, mainZoneHeight - hudHeight); // 30% de la largeur pour l'adversaire
    this.add.text(width * 0.7 + 10, hudHeight + 10, 'Zone Adversaire', { fontSize: '16px', color: '#fff' });

    // Zone de Saisie
    const inputZoneY = hudHeight + mainZoneHeight - hudHeight;
    const inputZoneGraphics = this.add.graphics();
    inputZoneGraphics.fillStyle(0x222222, 1); // Gris foncé
    inputZoneGraphics.fillRect(0, inputZoneY, width, inputZoneHeight);
    this.add.text(width / 2, inputZoneY + inputZoneHeight / 2, 'Zone de Saisie', {
      fontSize: '20px',
      color: '#fff'
    }).setOrigin(0.5);


    // Implémentation du HUD
    // Score
    this.add.text(10, 10, `Score: ${this.score}`, {
      fontSize: '24px',
      color: '#fff',
      fontStyle: 'bold'
    }).setName('scoreText');

    // Combo
    this.add.text(width - 150, 10, `Combo: ${this.combo}`, {
      fontSize: '24px',
      color: '#fff',
      fontStyle: 'bold'
    }).setName('comboText').setOrigin(1, 0);

    // Mode de Jeu
    this.add.text(width / 2, 10, `Mode: ${this.gameMode}`, {
      fontSize: '20px',
      color: '#e0e0e0' // Couleur légèrement différente pour le mode
    }).setOrigin(0.5, 0).setName('gameModeText');

  }

  update() {
    // Logique de mise à jour de la scène
    // Par exemple, mettre à jour le texte du score si la variable this.score change
    const scoreText = this.children.getByName('scoreText') as Phaser.GameObjects.Text;
    if (scoreText) {
      scoreText.setText(`Score: ${this.score}`);
    }

    const comboText = this.children.getByName('comboText') as Phaser.GameObjects.Text;
    if (comboText) {
      comboText.setText(`Combo: ${this.combo}`);
    }
  }
}

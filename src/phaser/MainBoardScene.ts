/* eslint-disable @typescript-eslint/no-explicit-any */
import Phaser from 'phaser';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';

interface TileConfig {
  type: 'start' | 'finish' | 'quiz' | 'bonus' | 'malus' | 'event' | 'duel' | 'teleport' | 'shop';
  data?: {
    mana?: number;
    xp?: number;
    quizId?: string;
    targetPosition?: number;
  };
}

export class MainBoardScene extends Phaser.Scene {
  private playerSprites: { [key: string]: Phaser.GameObjects.Sprite } = {};
  private playerPositions: { [key: string]: number } = {};
  private gameId: string | null = null;
  private unsubscribes: (() => void)[] = [];
  private boardPath: { x: number; y: number }[] = [];
  private tileObjects: Phaser.GameObjects.Image[] = [];
  private boardIsDrawn = false;

  constructor() {
    super('MainBoardScene');
  }

  init(data: { gameId: string }) {
    this.gameId = data.gameId;
    console.log(`[Phaser] Scene initialized for game: ${this.gameId}`);
  }

  preload() {
    console.log('[Phaser] Preloading assets...');
    this.load.image('board_background', '/assets/board_background.png'); // Utiliser la nouvelle image
    this.load.image('player_token', '/assets/player_token.png');
    this.load.image('tile_start', '/assets/tile_start_placeholder.png');
    this.load.image('tile_finish', '/assets/tile_finish_placeholder.png');
    this.load.image('tile_quiz', '/assets/tile_alt.png');
    this.load.image('tile_bonus', '/assets/tile_bonus_placeholder.png');
    this.load.image('tile_malus', '/assets/tile_malus_placeholder.png');
    this.load.image('tile_event', '/assets/tile_event_placeholder.png');
    this.load.image('tile_default', '/assets/tile.png');
  }

  create() {
    console.log('[Phaser] Creating scene...');
    if (!this.gameId) {
      console.error('Game ID is not set!');
      return;
    }
    
    const bg = this.add.image(0, 0, 'board_background').setOrigin(0, 0);
    bg.setDisplaySize(this.scale.width, this.scale.height);
    this.children.sendToBack(bg);

    this.defineBoardPath();

    const gameRef = doc(db, 'games', this.gameId);
    
    this.unsubscribes.push(
      onSnapshot(gameRef, (doc) => {
        if (doc.exists()) {
          const gameData = doc.data();
          console.log('[Phaser] Game data updated:', gameData);
          
          if (gameData.boardLayout && !this.boardIsDrawn) {
            this.createBoard(gameData.boardLayout);
            this.boardIsDrawn = true;
          }

          // La donnée 'players' de Firestore est un tableau d'IDs
          if (Array.isArray(gameData.players) && gameData.playerPositions) {
            this.updatePlayerSprites(gameData.players, gameData.playerPositions);
          }
          
          if (gameData.currentMiniGame) {
              this.events.emit('landedOnQuiz', { playerId: gameData.currentMiniGame.playerId });
          }
        }
      })
    );
  }

  defineBoardPath() {
    const { width, height } = this.scale;
    
    this.boardPath = [
      { x: width * 0.65, y: height * 0.85 }, { x: width * 0.72, y: height * 0.82 },
      { x: width * 0.78, y: height * 0.77 }, { x: width * 0.82, y: height * 0.70 },
      { x: width * 0.85, y: height * 0.63 }, { x: width * 0.86, y: height * 0.55 },
      { x: width * 0.85, y: height * 0.47 }, { x: width * 0.82, y: height * 0.39 },
      { x: width * 0.78, y: height * 0.32 }, { x: width * 0.72, y: height * 0.27 },
      { x: width * 0.65, y: height * 0.24 }, { x: width * 0.58, y: height * 0.23 },
      { x: width * 0.50, y: height * 0.23 }, { x: width * 0.42, y: height * 0.23 },
      { x: width * 0.35, y: height * 0.24 }, { x: width * 0.28, y: height * 0.27 },
      { x: width * 0.22, y: height * 0.32 }, { x: width * 0.18, y: height * 0.39 },
      { x: width * 0.15, y: height * 0.47 }, { x: width * 0.14, y: height * 0.55 },
      { x: width * 0.15, y: height * 0.63 }, { x: width * 0.18, y: height * 0.70 },
      { x: width * 0.22, y: height * 0.77 }, { x: width * 0.28, y: height * 0.82 },
      { x: width * 0.35, y: height * 0.85 }, { x: width * 0.42, y: height * 0.87 },
      { x: width * 0.50, y: height * 0.87 }, { x: width * 0.55, y: height * 0.86 },
      { x: width * 0.60, y: height * 0.85 }, { x: width * 0.62, y: height * 0.85 },
    ];
  }
  
  createBoard(boardLayout: TileConfig[]) {
    const TILE_SIZE = 64;
    
    this.tileObjects.forEach(tile => tile.destroy());
    this.tileObjects = [];

    boardLayout.forEach((tileConfig, i) => {
      if (i < this.boardPath.length) {
        const { x, y } = this.boardPath[i];
        const textureKey = this.getTextureForTileType(tileConfig.type);
        const tile = this.add.image(x, y, textureKey)
          .setOrigin(0.5)
          .setDisplaySize(TILE_SIZE, TILE_SIZE);

        tile.setData('tileConfig', tileConfig);
        this.tileObjects.push(tile);
      }
    });
  }

  getTextureForTileType(type: string): string {
    const textureMap: { [key: string]: string } = {
        'start': 'tile_start',
        'finish': 'tile_finish',
        'quiz': 'tile_quiz',
        'bonus': 'tile_bonus',
        'malus': 'tile_malus',
        'event': 'tile_event',
    };
    return textureMap[type] || 'tile_default';
  }
  
  updatePlayerSprites(players: string[], playerPositions: any) {
    // --- CORRECTION ---
    // On itère sur le tableau des joueurs (qui contient les vrais IDs)
    // plutôt que sur les clés d'un objet.
    players.forEach(playerId => {
      // Création du sprite s'il n'existe pas
      if (!this.playerSprites[playerId]) {
        console.log(`[Phaser] Creating sprite for player: ${playerId}`);
        const initialPosition = playerPositions[playerId] || 0;
        const startPathIndex = initialPosition % this.boardPath.length;
        const startPos = this.boardPath[startPathIndex] || { x: this.scale.width / 2, y: this.scale.height / 2 };
        
        this.playerSprites[playerId] = this.add.sprite(startPos.x, startPos.y, 'player_token')
          .setOrigin(0.5)
          .setDisplaySize(40, 40)
          .setTint(this.getPlayerColor(playerId))
          .setDepth(10); // S'assurer que le pion est au-dessus des cases
        this.playerPositions[playerId] = initialPosition;
      }
      
      // Vérification et déclenchement du mouvement
      const serverPosition = playerPositions[playerId];
      const localPosition = this.playerPositions[playerId];
      
      if (serverPosition !== localPosition) {
        console.log(`[Phaser] Moving player ${playerId} from ${localPosition} to ${serverPosition}`);
        this.movePlayer(playerId, localPosition, serverPosition);
      }
    });
    // --- FIN DE LA CORRECTION ---
  }

  movePlayer(playerId: string, startPosition: number, endPosition: number) {
    const playerSprite = this.playerSprites[playerId];
    if (!playerSprite) return;

    const path = new Phaser.Curves.Path();
    
    const boardSize = this.boardPath.length;
    let currentPathIndex = startPosition % boardSize;
    path.moveTo(this.boardPath[currentPathIndex].x, this.boardPath[currentPathIndex].y);

    const steps = endPosition - startPosition;
    for (let i = 0; i < steps; i++) {
        currentPathIndex = (startPosition + 1 + i) % boardSize;
        if(this.boardPath[currentPathIndex]) {
            path.lineTo(this.boardPath[currentPathIndex].x, this.boardPath[currentPathIndex].y);
        }
    }
    
    this.tweens.add({
      targets: playerSprite,
      z: 1,
      duration: path.getLength() * 5,
      t: 1,
      ease: 'Sine.easeInOut',
      onUpdate: (tween, target) => {
        const position = path.getPoint(tween.getValue());
        target.setPosition(position.x, position.y);
      },
      onComplete: () => {
        this.playerPositions[playerId] = endPosition;
      },
    });
  }

  getPlayerColor(playerId: string): number {
    let hash = 0;
    for (let i = 0; i < playerId.length; i++) {
        hash = playerId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return parseInt("0x" + "00000".substring(0, 6 - color.length) + color);
  }

  shutdown() {
    console.log('[Phaser] Shutting down scene...');
    this.unsubscribes.forEach(unsub => unsub());
    this.unsubscribes = [];
    this.boardIsDrawn = false;
  }
}

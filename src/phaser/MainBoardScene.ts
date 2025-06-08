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
    this.load.image('board_background', '/assets/board_background.png');
    this.load.image('player_token', '/assets/player_token.png');
    this.load.image('tile_start', '/assets/tile_start_placeholder.png');
    this.load.image('tile_finish', '/assets/tile_finish_placeholder.png');
    this.load.image('tile_quiz', '/assets/tile_alt.png');
    this.load.image('tile_bonus', '/assets/tile_bonus_placeholder.png');
    this.load.image('tile_malus', '/assets/tile_malus_placeholder.png');
    this.load.image('tile_event', '/assets/tile_event_placeholder.png');
    // Note : la ligne pour 'tile_default' n'est plus nécessaire si on gère la fallback.
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
          
          if (gameData.boardLayout && !this.boardIsDrawn) {
            console.log('[Phaser] boardLayout received. Creating board...');
            this.createBoard(gameData.boardLayout);
            this.boardIsDrawn = true;
          }

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
        { x: width * 0.68, y: height * 0.44 }, { x: width * 0.70, y: height * 0.24 },
        { x: width * 0.70, y: height * 0.16 }, { x: width * 0.65, y: height * 0.14 },
        { x: width * 0.60, y: height * 0.13 }, { x: width * 0.54, y: height * 0.17 },
        { x: width * 0.50, y: height * 0.24 }, { x: width * 0.45, y: height * 0.23 },
        { x: width * 0.40, y: height * 0.26 }, { x: width * 0.37, y: height * 0.32 },
        { x: width * 0.32, y: height * 0.35 }, { x: width * 0.28, y: height * 0.42 },
        { x: width * 0.26, y: height * 0.49 }, { x: width * 0.24, y: height * 0.55 },
        { x: width * 0.18, y: height * 0.52 }, { x: width * 0.12, y: height * 0.55 },
        { x: width * 0.09, y: height * 0.62 }, { x: width * 0.10, y: height * 0.72 },
        { x: width * 0.14, y: height * 0.77 }, { x: width * 0.22, y: height * 0.76 },
        { x: width * 0.28, y: height * 0.77 }, { x: width * 0.32, y: height * 0.76 },
        { x: width * 0.36, y: height * 0.76 }, { x: width * 0.42, y: height * 0.75 },
        { x: width * 0.47, y: height * 0.72 }, { x: width * 0.52, y: height * 0.69 },
        { x: width * 0.52, y: height * 0.60 }, { x: width * 0.57, y: height * 0.56 },
        { x: width * 0.61, y: height * 0.55 }, { x: width * 0.64, y: height * 0.49 },
    ];
  }
  
  createBoard(boardLayout: TileConfig[]) {
    const TILE_SIZE = 55;
    
    this.tileObjects.forEach(tile => tile.destroy());
    this.tileObjects = [];

    boardLayout.forEach((tileConfig, i) => {
      if (i < this.boardPath.length) {
        const { x, y } = this.boardPath[i];
        const textureKey = this.getTextureForTileType(tileConfig.type);
        
        // --- MODIFICATION : Sécurité pour vérifier si la texture existe ---
        if (!this.textures.exists(textureKey)) {
            console.error(`[Phaser] Texture manquante : '${textureKey}'. Vérifiez que le fichier existe dans /public/assets et qu'il est bien chargé dans preload(). Utilisation d'une texture de secours.`);
            const fallbackTextureKey = 'tile_quiz'; // On utilise une texture qui, on l'espère, existe
            const tile = this.add.image(x, y, fallbackTextureKey).setOrigin(0.5).setDisplaySize(TILE_SIZE, TILE_SIZE).setTint(0xff0000); // En rouge pour la voir
            this.tileObjects.push(tile);
        } else {
            const tile = this.add.image(x, y, textureKey)
              .setOrigin(0.5)
              .setDisplaySize(TILE_SIZE, TILE_SIZE);
            tile.setData('tileConfig', tileConfig);
            this.tileObjects.push(tile);
        }
        // --- FIN DE LA MODIFICATION ---
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
    // On retourne la clé correspondante, sans fallback ici. La vérification se fera dans createBoard.
    return textureMap[type] || type; // Retourne le type lui-même si non trouvé, pour un debug plus clair
  }
  
  updatePlayerSprites(players: string[], playerPositions: any) {
    players.forEach(playerId => {
      if (!this.playerSprites[playerId]) {
        console.log(`[Phaser] Creating sprite for player: ${playerId}`);
        const initialPosition = playerPositions[playerId] || 0;
        const startPathIndex = initialPosition % this.boardPath.length;
        const startPos = this.boardPath[startPathIndex] || { x: this.scale.width / 2, y: this.scale.height / 2 };
        
        this.playerSprites[playerId] = this.add.sprite(startPos.x, startPos.y, 'player_token')
          .setOrigin(0.5)
          .setDisplaySize(40, 40)
          .setTint(this.getPlayerColor(playerId))
          .setDepth(10); 
        this.playerPositions[playerId] = initialPosition;
      }
      
      const serverPosition = playerPositions[playerId];
      const localPosition = this.playerPositions[playerId];
      
      if (serverPosition !== localPosition) {
        console.log(`[Phaser] Moving player ${playerId} from ${localPosition} to ${serverPosition}`);
        this.movePlayer(playerId, localPosition, serverPosition);
      }
    });
  }

  movePlayer(playerId: string, startPosition: number, endPosition: number) {
    const playerSprite = this.playerSprites[playerId];
    if (!playerSprite) return;

    const path = new Phaser.Curves.Path();
    
    const boardSize = this.boardPath.length;
    let currentPathIndex = startPosition % boardSize;
    if(!this.boardPath[currentPathIndex]) return;
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
      duration: path.getLength() * 10,
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


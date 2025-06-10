// src/phaser/MainBoardScene.ts

import Phaser from 'phaser';
import type { Game, Player } from '../types/game';
import type { SpellId } from '../data/spells';

// L'interface pour le layout du plateau passé par le serveur
interface BoardLayout {
  type: string;
}

export default class MainBoardScene extends Phaser.Scene {
  private playerSprites: { [key:string]: Phaser.GameObjects.Sprite } = {};
  private boardPath: { x: number; y: number }[] = [];
  private gameState: Game | null = null;
  private boardIsDrawn = false;
  private isTargeting = false;
  private targetingTweens: Phaser.Tweens.Tween[] = [];
  // AJOUT : Propriété pour stocker la fonction de rappel
  private onTargetSelected: (targetId: string) => void = () => {};

  constructor() {
    super('MainBoardScene');
  }

  // MODIFICATION : init reçoit maintenant la fonction de rappel
  init(data: { onTargetSelected: (targetId: string) => void }) {
    this.onTargetSelected = data.onTargetSelected;
  }

  preload() {
    console.log('[Phaser] Preloading assets...');
    this.load.image('board_background', '/assets/korean-game-board.png');
    this.load.image('tile_start', '/assets/tiles/start.png');
    this.load.image('tile_quiz', '/assets/tiles/quiz.png');
    this.load.image('tile_bonus', '/assets/tiles/bonus.png');
    this.load.image('tile_malus', '/assets/tiles/malus.png');
    this.load.image('tile_event', '/assets/tiles/event.png');
    this.load.spritesheet('player_spritesheet', '/assets/players.png', { frameWidth: 32, frameHeight: 32 });
    // AJOUT : Charger l'asset pour l'animation du sort
    this.load.image('mana_bolt', '/assets/effects/mana_bolt.png');
  }

  create() {
    this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'board_background').setScale(0.8);
    this.defineBoardPath();
  }


  public enterTargetingMode(spellId: SpellId) {
    console.log(`[Phaser] Entering targeting mode for spell: ${spellId}`);
    this.isTargeting = true;
    this.input.setDefaultCursor('crosshair');

    // Mettre en surbrillance les cibles valides (tous les autres joueurs)
    if (!this.gameState) return;

    this.gameState.players.forEach(player => {
      if (player.id !== this.gameState?.currentPlayerId) {
        const sprite = this.playerSprites[player.id];
        if (sprite) {
          // Créer un tween de pulsation pour la surbrillance
          const tween = this.tweens.add({
            targets: sprite,
            scale: 1.8,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });
          this.targetingTweens.push(tween);
        }
      }
    });
  }

  public exitTargetingMode() {
    if (!this.isTargeting) return; // Ne rien faire si on n'est pas en mode ciblage

    console.log('[Phaser] Exiting targeting mode.');
    this.isTargeting = false;
    this.input.setDefaultCursor('default');

    // Arrêter et supprimer tous les tweens de ciblage
    this.targetingTweens.forEach(tween => tween.stop());
    this.targetingTweens = [];

    // Réinitialiser l'échelle de tous les sprites
    if (!this.gameState) return;
    this.gameState.players.forEach(player => {
       const sprite = this.playerSprites[player.id];
        if (sprite) {
          sprite.setScale(1.5);
        }
    });
  }


  // ===================================================================
  // NOUVELLE MÉTHODE POUR L'ANIMATION DES SORTS
  // ===================================================================

  public playSpellAnimation(spellData: { casterId: string, targetId: string, spellId: SpellId }) {
    const { casterId, targetId, spellId } = spellData;

    const casterSprite = this.playerSprites[casterId];
    const targetSprite = this.playerSprites[targetId];

    if (!casterSprite || !targetSprite) {
      console.warn("Could not find sprites for spell animation.");
      return;
    }

    console.log(`[Phaser] Playing animation for spell ${spellId}`);

    // Créer la particule à la position du lanceur
    const bolt = this.add.sprite(casterSprite.x, casterSprite.y, 'mana_bolt');
    bolt.setScale(0.5);
    bolt.setAlpha(0.7);

    // Animer la particule vers la cible
    this.tweens.add({
      targets: bolt,
      x: targetSprite.x,
      y: targetSprite.y,
      duration: 800, // Durée du trajet en ms
      ease: 'Power2',
      onComplete: () => {
        // Optionnel : Créer un petit flash d'impact sur la cible
        const impactFlash = this.add.circle(targetSprite.x, targetSprite.y, 20, 0xffffff, 0.8);
        this.tweens.add({
          targets: impactFlash,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            impactFlash.destroy();
          }
        });

        // Détruire la particule à la fin de son trajet
        bolt.destroy();
      }
    });
  }

  public updateGameState(newState: Game) {
    const oldState = this.gameState;
    this.gameState = newState;

    if (!this.boardIsDrawn && this.gameState.players && this.gameState.players.length > 0 && this.gameState.boardLayout && this.gameState.boardLayout.length > 0) {
      console.log('[Phaser] Drawing board for the first time.');
      this.drawBoard(this.gameState.boardLayout);
      this.initializePlayers(this.gameState.players);
      this.boardIsDrawn = true;
      return;
    }

    if (oldState && this.boardIsDrawn) {
      this.gameState.players.forEach(player => {
        const oldPlayer = oldState.players.find(p => p.id === player.id);
        if (oldPlayer && oldPlayer.position !== player.position) {
          console.log(`[Phaser] Player ${player.name} moved from ${oldPlayer.position} to ${player.position}`);
          this.movePlayerSprite(player.id, oldPlayer.position, player.position);
        }
      });
    }
  }

  private defineBoardPath() {
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

  private drawBoard(boardLayout: BoardLayout[]) {
    if (this.boardPath.length === 0) {
      console.error("drawBoard was called before defineBoardPath set the path.");
      return;
    }

    this.boardPath.forEach((position, index) => {
      const tileConfig = boardLayout[index];
      if (!tileConfig) return;

      const tileSprite = this.add.image(position.x, position.y, `tile_${tileConfig.type}`).setScale(0.5);
      tileSprite.setInteractive();
      tileSprite.on('pointerdown', () => console.log(`Clicked on tile ${index} (${tileConfig.type})`));
    });

    this.boardIsDrawn = true;
  }

  private initializePlayers(players: Player[]) {
    players.forEach((player, index) => {
        const startPosition = player.position || 0;
        const startCoords = this.boardPath[startPosition];
        const playerSprite = this.add.sprite(startCoords.x, startCoords.y, 'player_spritesheet', index);
        
        playerSprite.setTint(this.getPlayerColor(player.id));
        playerSprite.setScale(1.5);
        this.playerSprites[player.id] = playerSprite;

                // AJOUT : Rendre le sprite interactif
        playerSprite.setInteractive();
        // Stocker l'ID du joueur sur l'objet sprite pour un accès facile
        playerSprite.setData('playerId', player.id);

        // AJOUT : Gérer le clic sur le sprite
        playerSprite.on('pointerdown', () => {
            if (this.isTargeting) {
                const targetId = playerSprite.getData('playerId');
                // On ne peut pas se cibler soi-même
                if (targetId !== this.gameState?.currentPlayerId) {
                    console.log(`[Phaser] Clicked on target: ${targetId}. Calling React callback.`);
                    // On appelle la fonction de rappel pour remonter l'info à React
                    this.onTargetSelected(targetId);
                }
            }
        });
    });
  }

  private movePlayerSprite(playerId: string, startPosition: number, endPosition: number) {
    const playerSprite = this.playerSprites[playerId];
    if (!playerSprite) return;

    const path = new Phaser.Curves.Path(this.boardPath[startPosition].x, this.boardPath[startPosition].y);
    const boardSize = this.boardPath.length;
    
    // Assurer que le mouvement se fait bien vers l'avant, même en passant par la case départ
    let currentPos = startPosition;
    while(currentPos % boardSize !== endPosition % boardSize) {
        currentPos++;
        path.lineTo(this.boardPath[currentPos % boardSize].x, this.boardPath[currentPos % boardSize].y);
    }
    
    // Le tween anime une propriété 't' de 0 à 1 sur la cible (le sprite)
    this.tweens.add({
      targets: playerSprite,
      t: 1,
      duration: path.getLength() * 10, // Vitesse de déplacement
      ease: 'Sine.easeInOut',
      onUpdate: (_tween, target) => {
        const position = path.getPoint(target.t);
        target.setPosition(position.x, position.y);
      },
      onComplete: () => {
        // La position du sprite est maintenant à jour.
        // On ne met PAS à jour un état local, car la source de vérité est le serveur.
      }
    });
  }

  private getPlayerColor(playerId: string): number {
    let hash = 0;
    for (let i = 0; i < playerId.length; i++) {
        hash = playerId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return parseInt("0x" + "00000".substring(0, 6 - color.length) + color);
  }
}
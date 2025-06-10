// src/phaser/MainBoardScene.ts

import Phaser from 'phaser';
import type { Game, Player } from '../types/game'; // Ensure this matches the updated structure
import { SpellType, type SpellId } from '../data/spells'; // Import SpellType

// Updated TileConfig to match src/types/game.ts
interface TileConfig {
  type: string;
  trap?: 'RUNE_TRAP' | string;
}

export default class MainBoardScene extends Phaser.Scene {
  private playerSprites: { [key:string]: Phaser.GameObjects.Sprite } = {};
  private tileSprites: Phaser.GameObjects.Sprite[] = []; // Added for tile targeting
  private boardPath: { x: number; y: number }[] = [];
  private gameState: Game | null = null;
  private boardIsDrawn = false;
  // private isTargeting = false; // Replaced by currentTargetingType
  private currentTargetingType: SpellType | null = null; // Added
  private targetingTweens: Phaser.Tweens.Tween[] = [];
  // AJOUT : Propriété pour stocker la fonction de rappel
  private onTargetSelected: (targetId: string) => void = () => {};
  // For new visual effects
  private trapSprites: { [tileIndex: number]: Phaser.GameObjects.Sprite } = {};
  private shieldEffects: { [playerId: string]: Phaser.GameObjects.Sprite } = {};

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
    this.load.spritesheet('player_spritesheet', '/assets/players.png', { frameWidth: 32, frameHeight: 32 });
    this.load.image('mana_bolt', '/assets/effects/mana_bolt.png');
    this.load.image('rune_trap_icon', 'assets/effects/rune_trap.png');
    this.load.image('shield_effect', 'assets/effects/shield_aura.png');

    // MODIFICATION : On charge les images avec les noms correspondants aux types du backend
    this.load.image('tile_SAFE_ZONE', '/assets/tiles/tile_SAFE_ZONE.png');
    this.load.image('tile_MANA_GAIN', '/assets/tiles/tile_MANA_GAIN.png');
    this.load.image('tile_MINI_GAME_QUIZ', '/assets/tiles/tile_MINI_GAME_QUIZ.png');
 
    // this.load.spritesheet('player_spritesheet', '/assets/players.png', { frameWidth: 32, frameHeight: 32 }); // Duplicate
    // AJOUT : Charger l'asset pour l'animation du sort
    // this.load.image('mana_bolt', '/assets/effects/mana_bolt.png'); // Duplicate
  }

  create() {
    this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'board_background').setScale(0.8);
    this.defineBoardPath();
    this.tileSprites = []; // Initialize tileSprites array
  }

  public enterTargetingMode(spellType: SpellType) {
    this.exitTargetingMode(); // Clear previous targeting state first
    this.currentTargetingType = spellType;
    console.log(`[Phaser] Entering targeting mode for type: ${spellType}`);

    if (!this.gameState) return;

    if (spellType === SpellType.TARGET_PLAYER) {
      this.input.setDefaultCursor('crosshair');
      this.gameState.players.forEach(player => {
        if (player.id !== this.gameState?.currentPlayerId) { // Can't target self for player-targeted spells
          const sprite = this.playerSprites[player.id];
          if (sprite) {
            sprite.setInteractive(); // Make sure it's interactive
            const tween = this.tweens.add({
              targets: sprite,
              scale: 1.8, // Existing scale is 1.5, so 1.8 is larger
              duration: 500,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut'
            });
            this.targetingTweens.push(tween);
          }
        }
      });
    } else if (spellType === SpellType.TARGET_TILE) {
      this.input.setDefaultCursor('pointer');
      this.tileSprites.forEach(tileSprite => {
        tileSprite.setInteractive(); // Make sure tiles are interactive
        // Add visual feedback for targetable tiles, e.g., highlight or pulse
        const tween = this.tweens.add({
          targets: tileSprite,
          alpha: 0.7,
          duration: 600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        this.targetingTweens.push(tween);
      });
    }
  }

  public exitTargetingMode() {
    if (!this.currentTargetingType) return;
    console.log('[Phaser] Exiting targeting mode.');

    this.input.setDefaultCursor('default');
    this.targetingTweens.forEach(tween => tween.stop());
    this.targetingTweens = [];

    // Reset player sprite scales and interactivity if modified for targeting
    if (this.currentTargetingType === SpellType.TARGET_PLAYER && this.gameState) {
      this.gameState.players.forEach(player => {
        const sprite = this.playerSprites[player.id];
        if (sprite) {
          sprite.setScale(1.5); // Reset to default scale
          // sprite.disableInteractive(); // Optionally disable if only interactive for targeting
        }
      });
    }
    // Reset tile sprite visuals and interactivity
    if (this.currentTargetingType === SpellType.TARGET_TILE) {
      this.tileSprites.forEach(tileSprite => {
        tileSprite.setAlpha(1.0); // Reset alpha
        // tileSprite.disableInteractive(); // Optionally disable if only interactive for targeting
      });
    }
    this.currentTargetingType = null;
  }

  // ===================================================================
  // Visual Feedback Updates
  // ===================================================================
  private updateTrapVisuals() {
    if (!this.gameState || !this.boardIsDrawn) return;

    this.gameState.board.forEach((tile, index) => {
      const position = this.boardPath[index % this.boardPath.length];
      if (!position) return;

      if (tile.trap && !this.trapSprites[index]) {
        // Add trap icon
        const trapIcon = this.add.sprite(position.x, position.y + 10, 'rune_trap_icon'); // Offset slightly
        trapIcon.setScale(0.3); // Adjust scale as needed
        trapIcon.setAlpha(0.8);
        this.trapSprites[index] = trapIcon;
      } else if (!tile.trap && this.trapSprites[index]) {
        // Remove trap icon
        this.trapSprites[index].destroy();
        delete this.trapSprites[index];
      }
    });
  }

  private updatePlayerEffects() {
    if (!this.gameState) return;

    this.gameState.players.forEach(player => {
      const playerSprite = this.playerSprites[player.id];
      if (!playerSprite) return;

      const isShielded = player.effects?.some(effect => effect.type === 'SHIELDED');

      if (isShielded && !this.shieldEffects[player.id]) {
        // Add shield effect
        const shieldSprite = this.add.sprite(playerSprite.x, playerSprite.y, 'shield_effect');
        shieldSprite.setScale(0.7); // Adjust as needed
        shieldSprite.setAlpha(0.6);
        // Ensure shield is behind player sprite but above tiles/traps
        shieldSprite.setDepth(playerSprite.depth - 1);
        this.shieldEffects[player.id] = shieldSprite;
      } else if (!isShielded && this.shieldEffects[player.id]) {
        // Remove shield effect
        this.shieldEffects[player.id].destroy();
        delete this.shieldEffects[player.id];
      } else if (isShielded && this.shieldEffects[player.id]) {
        // Ensure shield follows player if already exists (e.g. after non-move update)
        this.shieldEffects[player.id].setPosition(playerSprite.x, playerSprite.y);
      }
    });
  }

  // ===================================================================
  // MÉTHODE POUR L'ANIMATION DES SORTS (peut rester similaire ou être adaptée)
  // ===================================================================

  public playSpellAnimation(spellData: { casterId: string, targetId: string, spellId: SpellId }) {
    // This method might need adjustment if some spells don't have a targetId (e.g. SELF spells if they have animations)
    // For now, assuming it's for targeted spells.
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

    if (!this.boardIsDrawn && this.gameState.players && this.gameState.players.length > 0 && this.gameState.board) {
      console.log('[Phaser] Drawing board for the first time.');
      this.drawBoard(this.gameState.board); // Pass the board layout
      this.initializePlayers(this.gameState.players);
      this.boardIsDrawn = true;
      // Initial visual updates after board is drawn
      this.updateTrapVisuals();
      this.updatePlayerEffects();
      return;
    }

    if (this.boardIsDrawn) { // Ensure board is drawn before updating visuals
      // Update player positions
      if (oldState) { // Ensure oldState exists for comparison
        this.gameState.players.forEach(player => {
          const oldPlayer = oldState.players.find(p => p.id === player.id);
          if (oldPlayer && oldPlayer.position !== player.position) {
            console.log(`[Phaser] Player ${player.name} moved from ${oldPlayer.position} to ${player.position}`);
            this.movePlayerSprite(player.id, oldPlayer.position, player.position);
          } else if (oldPlayer && (playerSpriteNeedsUpdate(oldPlayer, player) || !this.playerSprites[player.id])) {
            // Fallback to redraw/update player sprite if position is same but other visual info changed, or if sprite somehow missing
            // This might be simplified if only position changes trigger moves.
            const currentCoords = this.boardPath[player.position % this.boardPath.length];
            if (this.playerSprites[player.id]) {
              this.playerSprites[player.id].setPosition(currentCoords.x, currentCoords.y);
            } else {
              // Re-initialize this specific player if sprite is missing (should be rare)
              // This part of the logic might need refinement based on how player data can change without moving.
            }
          }
        });
      }

      // Update visual effects based on the new state
      this.updateTrapVisuals();
      this.updatePlayerEffects();
    }
  }

  // playerSpriteNeedsUpdate function moved to the end of the file (after class definition)

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

  private drawBoard(boardLayout: TileConfig[]) { // Use updated TileConfig
    if (this.boardPath.length === 0) {
      console.error("drawBoard was called before defineBoardPath set the path.");
      return;
    }
    // Clear existing tile sprites if any (e.g., for redraw scenarios, though not strictly needed with current logic)
    this.tileSprites.forEach(sprite => sprite.destroy());
    this.tileSprites = [];

    boardLayout.forEach((tileConfig, index) => {
      const position = this.boardPath[index % this.boardPath.length]; // Ensure we loop if boardLayout is longer
      if (!tileConfig || !position) return;

      const tileSprite = this.add.image(position.x, position.y, `tile_${tileConfig.type}`).setScale(0.5);
      // tileSprite.setInteractive(); // Will be set dynamically in enterTargetingMode
      tileSprite.setData('tileIndex', index); // Store index on the sprite

      tileSprite.on('pointerdown', () => {
        if (this.currentTargetingType === SpellType.TARGET_TILE) {
            const TILE_INDEX_CLICKED = tileSprite.getData('tileIndex');
            console.log(`[Phaser] Clicked on target tile: ${TILE_INDEX_CLICKED}. Calling React callback.`);
            this.onTargetSelected(TILE_INDEX_CLICKED.toString()); // Convert index to string for consistency
        } else {
          console.log(`Clicked on tile ${index} (${tileConfig.type}) - not in tile targeting mode.`);
        }
      });
      this.tileSprites.push(tileSprite); // Add to the array
    });

    this.boardIsDrawn = true;
  }

  private initializePlayers(players: Player[]) {
    players.forEach((player, spriteIndex) => { // Use spriteIndex for player_spritesheet frame
        const startPosition = player.position || 0;
        const startCoords = this.boardPath[startPosition % this.boardPath.length];
        const playerSprite = this.add.sprite(startCoords.x, startCoords.y, 'player_spritesheet', spriteIndex);
        
        playerSprite.setTint(this.getPlayerColor(player.id));
        playerSprite.setScale(1.5); // Default scale
        this.playerSprites[player.id] = playerSprite;

        // playerSprite.setInteractive(); // Will be set dynamically in enterTargetingMode
        playerSprite.setData('playerId', player.id);

        playerSprite.on('pointerdown', () => {
            if (this.currentTargetingType === SpellType.TARGET_PLAYER) {
                const targetId = playerSprite.getData('playerId');
                if (targetId !== this.gameState?.currentPlayerId) { // Ensure not targeting self
                    console.log(`[Phaser] Clicked on target player: ${targetId}. Calling React callback.`);
                    this.onTargetSelected(targetId);
                }
            } else {
              // Handle non-targeting click if needed, e.g., show player info
            }
        });
    });
  }

  private movePlayerSprite(playerId: string, startPosition: number, endPosition: number) {
    const playerSprite = this.playerSprites[playerId];
    if (!playerSprite) return;

    const endCoords = this.boardPath[endPosition % this.boardPath.length];
    if (!endCoords) {
      console.error(`[Phaser] Invalid end position for player ${playerId}: ${endPosition}`);
      return;
    }

    // If path-based movement is desired, re-implement it here.
    // For direct tween to new coordinates (e.g., for Astral Swap or simpler moves):
    this.tweens.add({
      targets: playerSprite,
      x: endCoords.x,
      y: endCoords.y,
      duration: 750, // Standard duration, adjust as needed
      ease: 'Power2',
      onUpdate: () => {
        // Continuously update shield position during movement if it exists
        if (this.shieldEffects[playerId]) {
          this.shieldEffects[playerId].setPosition(playerSprite.x, playerSprite.y);
        }
      },
      onComplete: () => {
        if (this.shieldEffects[playerId]) {
          this.shieldEffects[playerId].setPosition(endCoords.x, endCoords.y);
        }
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

// Helper function to determine if a player sprite needs non-movement visual updates (e.g. effects list changed)
// This is a placeholder; actual implementation might depend on specific visual cues tied to player properties beyond position.
function playerSpriteNeedsUpdate(oldPlayer: Player, newPlayer: Player): boolean {
  // Example: Check if effects array reference changed or length changed.
  // A more robust check might involve deep comparison of relevant effect properties if they influence sprite appearance beyond shield.
  return oldPlayer.effects !== newPlayer.effects || oldPlayer.effects?.length !== newPlayer.effects?.length;
}
// src/phaser/MainBoardScene.ts

import Phaser from 'phaser';
import type { Game, Player } from '../types/game'; // Ensure this matches the updated structure
import { SPELL_DEFINITIONS, type SpellType, type SpellId } from '../data/spells'; // Import SpellType as type
import soundService from '../services/soundService'; // Import SoundService
import type { BoardTile } from '../types/game'; // Import BoardTile

// Removed local TileConfig, will use BoardTile from types/game.ts

export default class MainBoardScene extends Phaser.Scene {
  private playerSprites: { [key:string]: Phaser.GameObjects.Sprite } = {};
  private tileSprites: Phaser.GameObjects.Image[] = []; // Changed from Sprite[] to Image[]
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
  public init(data: any) { // Use 'any' or a more complex type for data
    console.log('[MainBoardScene] Init with data:', data);
    if (data && data.fromMiniGame && data.miniGameResults) {
      console.log('[MainBoardScene] Returned from HangeulTyphoon with results:', data.miniGameResults);
      // gameService.processMiniGameResults(data.miniGameResults); // Example
      // For now, just log them.
      // If onTargetSelected was passed initially and needs to be preserved,
      // it should be handled by the calling context (e.g. React component re-passing it)
      // or by using a more persistent way to store it if MainBoardScene isn't fully destroyed.
      // For this simple restart, we might need to re-establish it if it's vital for immediate re-use.
      // If the game state is managed externally (e.g. Zustand/Redux), that external store
      // would handle the results, and MainBoardScene would get updated gameState.
      // The onTargetSelected is typically for React -> Phaser communication, so if React re-renders
      // the Phaser container and restarts the scene, it would pass it again.
    } else if (data && data.onTargetSelected) {
      this.onTargetSelected = data.onTargetSelected;
    } else {
      console.warn('[MainBoardScene] Init called without expected data (onTargetSelected or miniGameResults).');
      // Provide a default a no-op onTargetSelected to prevent errors if it's called somewhere.
      this.onTargetSelected = (targetId: string) => {
        console.log(`[MainBoardScene] Default onTargetSelected (no-op) called with ${targetId}. This might indicate an issue if targeting is expected to work now.`);
      };
    }

    // Reset scene-specific state for a clean (re)start
    this.boardIsDrawn = false;
    this.playerSprites = {};
    this.tileSprites.forEach(tile => tile.destroy()); // Clear old tile sprites
    this.tileSprites = [];
    Object.values(this.trapSprites).forEach(sprite => sprite.destroy());
    this.trapSprites = {};
    Object.values(this.shieldEffects).forEach(sprite => sprite.destroy());
    this.shieldEffects = {};
    this.currentTargetingType = null;
    this.targetingTweens.forEach(tween => tween.stop()); // Stop any active tweens
    this.targetingTweens = [];
    // this.gameState = null; // Reset or rely on updateGameState to provide the new state.
                           // If gameState is managed by React/Zustand and passed in via updateGameState,
                           // then it will be updated naturally. Resetting here might be premature
                           // if create() relies on an initial gameState from an external source.
                           // For a full scene restart, this is usually fine.
  }

  preload() {
    console.log('[Phaser] Preloading assets...');
    this.load.image('board_background', '/assets/korean-game-board.png');
    this.load.spritesheet('player_spritesheet', '/assets/players.png', { frameWidth: 32, frameHeight: 32 });
    this.load.image('mana_bolt', '/assets/effects/mana_bolt.png');
    this.load.image('rune_trap_icon', '/assets/effects/rune_trap.png');
    this.load.image('shield_effect', '/assets/effects/shield_aura.png');

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
    this.tileSprites = []; // Initialize tileSprites array (now Image[])
  }

  public enterTargetingMode(spellType: SpellType) {
    this.exitTargetingMode(); // Clear previous targeting state first
    this.currentTargetingType = spellType;
    console.log(`[Phaser] Entering targeting mode for type: ${spellType}`);

    if (!this.gameState) return;

    if (spellType === "TARGET_PLAYER") {
      this.input.setDefaultCursor('crosshair');
      this.gameState.players.forEach(player => {
        if (player.uid !== this.gameState?.currentPlayerId) { // Can't target self for player-targeted spells
          const sprite = this.playerSprites[player.uid];
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
    } else if (spellType === "TARGET_TILE") {
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
    if (this.currentTargetingType === "TARGET_PLAYER" && this.gameState) {
      this.gameState.players.forEach(player => {
        const sprite = this.playerSprites[player.uid];
        if (sprite) {
          sprite.setScale(1.5); // Reset to default scale
          // sprite.disableInteractive(); // Optionally disable if only interactive for targeting
        }
      });
    }
    // Reset tile sprite visuals and interactivity
    if (this.currentTargetingType === "TARGET_TILE") {
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
        // Initial state for animation
        trapIcon.setScale(0.1);
        trapIcon.setAlpha(0.5);
        this.trapSprites[index] = trapIcon;

        // Brief appearance animation
        this.tweens.add({
          targets: trapIcon,
          scale: { from: 0.1, to: 0.3 }, // Target scale is 0.3
          alpha: { from: 0.5, to: 0.8 }, // Target alpha is 0.8
          duration: 300,
          ease: 'Power2'
        });
        soundService.playSound('action_trap_set'); // Play trap set sound
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
      const playerSprite = this.playerSprites[player.uid];
      if (!playerSprite) return;

      const isShielded = player.effects?.some(effect => effect.type === 'SHIELDED');

      if (isShielded && !this.shieldEffects[player.uid]) {
        // Add shield effect
        const shieldSprite = this.add.sprite(playerSprite.x, playerSprite.y, 'shield_effect');
        // Initial state for animation
        shieldSprite.setScale(0.9); // Start slightly larger, target is 0.7
        shieldSprite.setAlpha(0.8); // Start more opaque, target is 0.6
        shieldSprite.setDepth(playerSprite.depth - 1);
        this.shieldEffects[player.uid] = shieldSprite;

        // Brief appearance animation
        this.tweens.add({
          targets: shieldSprite,
          scale: { from: 0.9, to: 0.7 }, // Animate to target scale
          alpha: { from: 0.8, to: 0.6 }, // Animate to target alpha
          duration: 400,
          ease: 'Quint.easeOut'
        });
        soundService.playSound('action_shield_gain'); // Play shield gain sound
      } else if (!isShielded && this.shieldEffects[player.uid]) {
        // Remove shield effect
        this.shieldEffects[player.uid].destroy();
        delete this.shieldEffects[player.uid];
      } else if (isShielded && this.shieldEffects[player.uid]) {
        // Ensure shield follows player if already exists (e.g. after non-move update)
        this.shieldEffects[player.uid].setPosition(playerSprite.x, playerSprite.y);
      }
    });
  }

  // ===================================================================
  // MÉTHODE POUR L'ANIMATION DES SORTS (peut rester similaire ou être adaptée)
  // ===================================================================

  public playSpellAnimation(spellData: { casterId: string, targetId?: string, spellId: SpellId }) {
    const { casterId, targetId, spellId } = spellData;

    const casterSprite = this.playerSprites[casterId];
    // targetSprite might be undefined for SELF spells or if targetId is not a player
    const targetSprite = targetId ? this.playerSprites[targetId] : null;

    if (!casterSprite) {
      console.warn("[Phaser] Caster sprite not found for spell animation.");
      return;
    }

    console.log(`[Phaser] Playing animation for spell ${spellId} by ${casterId}`);

    // --- Muzzle Flash Effect ---
    const muzzleFlash = this.add.sprite(casterSprite.x, casterSprite.y, 'mana_bolt'); // Reuse mana_bolt or use a specific muzzle flash asset
    muzzleFlash.setScale(0.3); // Start smaller
    muzzleFlash.setAlpha(0.9);
    muzzleFlash.setDepth(casterSprite.depth + 1); // Ensure it's on top of the caster

    this.tweens.add({
      targets: muzzleFlash,
      scale: { from: 0.3, to: 0.8 }, // Grow effect
      alpha: { from: 0.9, to: 0 },   // Fade out
      duration: 250, // Short duration for a flash
      ease: 'Cubic.easeOut',
      onComplete: () => {
        muzzleFlash.destroy();
      }
    });
    // --- End Muzzle Flash Effect ---

    const spellDefinition = SPELL_DEFINITIONS.find(s => s.id === spellId);

    if (targetSprite && spellDefinition && spellDefinition.type !== "SELF") {
      const bolt = this.add.sprite(casterSprite.x, casterSprite.y, 'mana_bolt');
      bolt.setScale(0.5);
      bolt.setAlpha(0.7);
      bolt.setDepth(casterSprite.depth); // Projectile can be at same depth or slightly below muzzle flash initially

      this.tweens.add({
        targets: bolt,
        x: targetSprite.x,
        y: targetSprite.y,
        duration: 800,
        ease: 'Power2',
        onComplete: () => {
          soundService.playSound('action_spell_impact_generic'); // Play spell impact sound
          const impactFlash = this.add.circle(targetSprite.x, targetSprite.y, 20, 0xffffff, 0.8);
          impactFlash.setDepth(targetSprite.depth + 1);
          this.tweens.add({
            targets: impactFlash,
            alpha: 0,
            duration: 300,
            onComplete: () => {
              impactFlash.destroy();
            }
          });
          bolt.destroy();
        }
      });
    } else if (spellDefinition && spellDefinition.type === "SELF") {
      // For SELF spells, the muzzle flash might be the primary effect.
      console.log(`[Phaser] SELF spell ${spellId} cast by ${casterId}. Muzzle flash shown.`);
    } else if (!targetSprite && spellDefinition && spellDefinition.type !== "SELF") {
      // This handles cases like tile-targeted spells where targetId might be a tile index, not a player ID.
      // Projectile logic for tiles would need to resolve targetId to tile coordinates.
      // For now, only muzzle flash is guaranteed.
      console.warn(`[Phaser] Spell ${spellId} to target ${targetId} (non-player?) shown. Muzzle flash only for now.`);
    }
  }

  public updateGameState(newState: Game) {
    const oldState = this.gameState;
    this.gameState = newState;

    // --- Gestion du changement de joueur pour le zoom et pan ---
    if (oldState && oldState.currentPlayerId !== newState.currentPlayerId && newState.currentPlayerId) {
      const newPlayerSprite = this.playerSprites[newState.currentPlayerId];

      if (newPlayerSprite) {
        console.log(`[Phaser] Player changed from ${oldState.currentPlayerId} to ${newState.currentPlayerId}.`);

        // Étape 1: Zoom Out pour revenir à la vue d'ensemble
        this.cameras.main.zoomTo(1, 1000, 'Power2', false, (_cam: Phaser.Cameras.Scene2D.Camera, progress: number) => {
          if (progress === 1) { // Ensure zoom out is complete
            console.log('[Phaser] Zoom out complete. Now zooming in on new player.');
            // Étape 2: Zoom In et Pan sur le nouveau joueur
            this.cameras.main.zoomTo(1.8, 1000, 'Power2');
            this.cameras.main.pan(newPlayerSprite.x, newPlayerSprite.y, 1000, 'Power2');
          }
        });
      } else {
        console.warn(`[Phaser] New current player ${newState.currentPlayerId} has no sprite for camera focus.`);
        // Si le nouveau joueur n'a pas de sprite, on s'assure au moins de revenir à une vue d'ensemble.
        // Cela peut arriver si le sprite n'est pas encore initialisé, bien que cela soit peu probable avec la logique actuelle.
        this.cameras.main.zoomTo(1, 1000, 'Power2');
      }
    } else if (!oldState && newState.currentPlayerId) {
      // Cas du tout premier joueur au début de la partie (pas de oldState.currentPlayerId)
      // On veut quand même zoomer sur ce premier joueur.
      const newPlayerSprite = this.playerSprites[newState.currentPlayerId];
      if (newPlayerSprite) {
        console.log(`[Phaser] First player ${newState.currentPlayerId}. Zooming in.`);
        this.cameras.main.zoomTo(1.8, 1000, 'Power2');
        this.cameras.main.pan(newPlayerSprite.x, newPlayerSprite.y, 1000, 'Power2');
      } else {
        console.warn(`[Phaser] First current player ${newState.currentPlayerId} has no sprite for camera focus.`);
      }
    }
    // --- Fin de la gestion du changement de joueur ---

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
          const oldPlayer = oldState.players.find(p => p.uid === player.uid);
          if (oldPlayer && oldPlayer.position !== player.position) {
            console.log(`[Phaser] Player ${player.displayName} moved from ${oldPlayer.position} to ${player.position}`);
            this.movePlayerSprite(player.uid, oldPlayer.position, player.position);
          } else if (oldPlayer && (playerSpriteNeedsUpdate(oldPlayer, player) || !this.playerSprites[player.uid])) {
            // Fallback to redraw/update player sprite if position is same but other visual info changed, or if sprite somehow missing
            // This might be simplified if only position changes trigger moves.
            const currentCoords = this.boardPath[player.position % this.boardPath.length];
            if (this.playerSprites[player.uid]) {
              this.playerSprites[player.uid].setPosition(currentCoords.x, currentCoords.y);
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

  private drawBoard(boardLayout: BoardTile[]) { // Changed parameter to BoardTile[]
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
        if (this.currentTargetingType === "TARGET_TILE") {
            const TILE_INDEX_CLICKED = tileSprite.getData('tileIndex');
            console.log(`[Phaser] Clicked on target tile: ${TILE_INDEX_CLICKED}. Calling React callback.`);
            this.onTargetSelected(TILE_INDEX_CLICKED.toString()); // Convert index to string for consistency
        } else {
          // Not in targeting mode, check for tile activation
          console.log(`[Phaser] Clicked on tile ${index} of type: ${tileConfig.type} (not in targeting mode).`);

          const currentPlayer = this.gameState?.players.find(p => p.uid === this.gameState?.currentPlayerId);
          if (currentPlayer && currentPlayer.position === index) {
              console.log(`[Phaser] Current player ${currentPlayer.uid} is on tile ${index}. Evaluating tile action.`);

              let hangeulTyphoonOptions: any = null;
              const currentTileConfig = tileConfig; // tileConfig is already the config for the clicked tile (index)

              switch (currentTileConfig.type) {
                  case 'DOJO_DU_CLAVIER':
                      console.log('[Phaser] Landing on Dojo du Clavier. Launching Hangeul Typhoon (Scribe Mode).');
                      hangeulTyphoonOptions = {
                          gameMode: 'eupreuveDuScribe',
                          isDuel: false,
                          attackerPlayerId: currentPlayer.uid
                      };
                      break;

                  case 'DUEL_ARENA':
                      console.log('[Phaser] Landing on Duel Arena. Launching Hangeul Typhoon (Duel Mode).');
                      const opponent = this.gameState?.players.find(p => p.uid !== currentPlayer.uid);
                      if (opponent) {
                          hangeulTyphoonOptions = {
                              gameMode: 'eupreuveDuScribe',
                              isDuel: true,
                              gameId: `duel_${currentPlayer.uid}_vs_${opponent.uid}_${Date.now()}`,
                              attackerPlayerId: currentPlayer.uid,
                              targetPlayerId: opponent.uid
                          };
                      } else {
                          console.warn('[Phaser] Duel tile landed, but no opponent found to start Hangeul Typhoon duel.');
                      }
                      break;

                  case 'MINI_GAME_QUIZ':
                      console.log('[Phaser] Landing on Mini Game Quiz. Offering Hangeul Typhoon (Interpreter/Translator Mode).');
                      const translationModes = ['defiDeLInterprete', 'testDuTraducteur'];
                      const selectedTranslationMode = Phaser.Utils.Array.GetRandom(translationModes);
                      hangeulTyphoonOptions = {
                          gameMode: selectedTranslationMode,
                          isDuel: false,
                          attackerPlayerId: currentPlayer.uid
                      };
                      break;
              }

              if (hangeulTyphoonOptions) {
                  this.scene.start('HangeulTyphoonScene', hangeulTyphoonOptions);
              }
          } else {
              console.log(`[Phaser] Clicked tile ${index}, but current player ${currentPlayer?.uid} is at ${currentPlayer?.position}. No action.`);
          }
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
        
        playerSprite.setTint(this.getPlayerColor(player.uid));
        playerSprite.setScale(1.5); // Default scale
        this.playerSprites[player.uid] = playerSprite;

        // playerSprite.setInteractive(); // Will be set dynamically in enterTargetingMode
        playerSprite.setData('playerId', player.uid);

        playerSprite.on('pointerdown', () => {
            if (this.currentTargetingType === "TARGET_PLAYER") {
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

  private movePlayerSprite(playerId: string, _startPosition: number, endPosition: number) {
    const playerSprite = this.playerSprites[playerId];
    if (!playerSprite) return;

    soundService.playSound('action_pawn_move'); // Play pawn move sound

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
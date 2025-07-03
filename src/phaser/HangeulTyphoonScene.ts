import Phaser from 'phaser';
import { sendTyphoonAttackService } from '../services/gameService'; // Import du service
import type { HangeulTyphoonAttackResponse } from '../types/hangeul'; // Import du type de réponse

// Interface pour la structure d'un bloc
interface HangeulBlock extends Phaser.GameObjects.Container {
  textObject: Phaser.GameObjects.Text;
  hangeulWord: string;
  spawnTime: number;
  isProtected: boolean;
  isVulnerable: boolean;
  isDestroyed?: boolean; // Ajouté pour le suivi de destruction
}

// Structure pour les mots fournis à la scène (si plus de détails que juste string sont nécessaires)
export interface HangeulWordDefinition {
  id: string; // ou un autre identifiant unique
  word: string;
  // d'autres propriétés comme la difficulté, catégorie, etc. peuvent être ajoutées
}


export default class HangeulTyphoonScene extends Phaser.Scene {
  private score: number = 0;
  private combo: number = 0;
  private gameMode: string = '';
  private wordList: HangeulWordDefinition[] = []; // Liste des mots fournis
  private activeBlocks: HangeulBlock[] = []; // Pour suivre les blocs actifs
  private groundLine!: Phaser.GameObjects.Graphics; // Référence à la ligne de sol
  private playerGroundLevel: number = 0; // Hauteur actuelle du sol du joueur
  private opponentGroundLevel: number = 0; // Hauteur actuelle du sol de l'adversaire (pour la simulation visuelle)
  private opponentGroundLine!: Phaser.GameObjects.Graphics; // Référence à la ligne de sol de l'adversaire

  // Constantes pour la configuration
  private readonly BLOCK_VULNERABLE_TIME: number = 5000; // 5 secondes
  private readonly MAIN_PLAYER_ZONE_WIDTH_RATIO: number = 0.7;
  private readonly OPPONENT_ZONE_WIDTH_RATIO: number = 0.3;

  // Gestion de la saisie clavier
  private currentInput: string = '';
  private inputDisplay!: Phaser.GameObjects.Text;
  private attackPrefix: string = '<';
  private opponentCurrentGroundFillAmount: number = 0; // en pixels, depuis le bas de leur zone


  constructor() {
    super({ key: 'HangeulTyphoonScene' });
  }

  // Modifié pour accepter wordList
  init(data: { gameMode: string; words?: HangeulWordDefinition[] }) {
    this.gameMode = data.gameMode || 'Mode Test';
    this.wordList = data.words || []; // Initialiser avec les mots fournis, ou une liste vide

    console.log(`HangeulTyphoonScene initialized. Game Mode: ${this.gameMode}. Words received: ${this.wordList.length}`);
    if (this.wordList.length === 0) {
        console.warn("HangeulTyphoonScene: No words provided for the game. Using fallback.");
        // Optionnel: fournir une liste de mots par défaut si aucune n'est passée
        this.wordList = [{id: 'fallback1', word: '안녕'}, {id: 'fallback2', word: '테스트'}];
    }

    // Réinitialiser l'état pour les nouvelles parties
    this.score = 0;
    this.combo = 0;
    this.activeBlocks = [];
    this.currentInput = '';
    this.playerGroundLevel = 0; // Sera défini dans create
    this.opponentGroundLevel = 0; // Sera défini dans create
    this.opponentCurrentGroundFillAmount = 0; // Réinitialiser pour la simulation
  }

  preload() {
    // Précharger les assets si nécessaire
    // Exemple: this.load.image('block_protected_img', 'assets/minigames/block_protected.png');
    // Exemple: this.load.image('block_vulnerable_img', 'assets/minigames/block_vulnerable.png');
  }

  create() {
    const { width, height } = this.scale;

    // Définition des dimensions et positions
    const hudHeight = 50; // Hauteur pour le HUD
    const gameAreaHeight = height - hudHeight; // Hauteur restante pour les zones de jeu et saisie
    const mainZoneHeight = gameAreaHeight * 0.8; // 80% pour la zone de jeu principale
    const inputZoneHeight = gameAreaHeight * 0.2; // 20% pour la zone de saisie
    
    const playerZoneWidth = width * this.MAIN_PLAYER_ZONE_WIDTH_RATIO;
    // const opponentZoneWidth = width * this.OPPONENT_ZONE_WIDTH_RATIO;
    // const opponentZoneX = playerZoneWidth;
    
    
    // Zone Joueur principale
    const mainPlayerZone = this.add.graphics();
    mainPlayerZone.fillStyle(0x000033, 0.8);
    mainPlayerZone.fillRect(0, hudHeight, playerZoneWidth, mainZoneHeight);
    
    // Ligne de "sol" Joueur
    const playerGroundY = hudHeight + mainZoneHeight - 20;
    this.playerGroundLevel = playerGroundY;
    this.groundLine = this.add.graphics();
    this.groundLine.lineStyle(4, 0xff0000, 1);
    this.groundLine.beginPath();
    this.groundLine.moveTo(0, this.playerGroundLevel);
    this.groundLine.lineTo(playerZoneWidth, this.playerGroundLevel);
    this.groundLine.closePath();
    this.groundLine.strokePath();
    this.add.text(10, this.playerGroundLevel - 25, 'GAME OVER LINE', { fontSize: '10px', color: '#ff0000' });
    
    
    // Zone Adversaire (simplifiée pour l'instant si non Duel, ou à adapter)
    this.createOpponentZoneVisuals();

    // Zone de Saisie
    const inputZoneY = hudHeight + mainZoneHeight;
    const inputZoneGraphics = this.add.graphics();
    inputZoneGraphics.fillStyle(0x222222, 1);
    inputZoneGraphics.fillRect(0, inputZoneY, width, inputZoneHeight);
    
    this.inputDisplay = this.add.text(width / 2, inputZoneY + inputZoneHeight / 2, '', {
      fontSize: '32px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 10, y: 5 }
    }).setOrigin(0.5);
    
    
    // Implémentation du HUD
    this.createHud();

    // Spawn d'un bloc initial en utilisant la nouvelle logique
    const initialWord = this.getRandomWordFromList();
    if (initialWord) {
      this.spawnBlock(playerZoneWidth * 0.5, hudHeight + 50, initialWord);
    } else {
      console.error("Impossible de spawner un bloc initial: la liste de mots est vide ou invalide.");
    }

    // --- Gestionnaire d'événements clavier ---
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown', (event: KeyboardEvent) => {
        this.handlePlayerInput(event);
      });
    }

    // Timer pour spawner des blocs régulièrement
    this.time.addEvent({
      delay: 3000, // Toutes les 3 secondes (ajuster selon la difficulté voulue)
      callback: () => {
        const wordToSpawn = this.getRandomWordFromList();
        if (wordToSpawn) {
          // Position de spawn aléatoire en X dans la zone joueur
          const spawnX = Phaser.Math.Between(playerZoneWidth * 0.1, playerZoneWidth * 0.9);
          this.spawnBlock(spawnX, hudHeight, wordToSpawn); // Spawner en haut de la zone de jeu
        }
      },
      loop: true
    });
  }

  private createHud() {
    const { width } = this.scale;
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
      color: '#e0e0e0'
    }).setOrigin(0.5, 0).setName('gameModeText');
  }

  private createOpponentZoneVisuals() {
    const { width, height } = this.scale;
    const hudHeight = 50;
    const gameAreaHeight = height - hudHeight;
    const mainZoneHeight = gameAreaHeight * 0.8;
    const playerZoneWidth = width * this.MAIN_PLAYER_ZONE_WIDTH_RATIO;
    const opponentZoneWidth = width * this.OPPONENT_ZONE_WIDTH_RATIO;
    const opponentZoneX = playerZoneWidth;

    const opponentZone = this.add.graphics();
    opponentZone.fillStyle(0x330000, 0.8);
    opponentZone.fillRect(opponentZoneX, hudHeight, opponentZoneWidth, mainZoneHeight);
    this.add.text(opponentZoneX + 10, hudHeight + 10, 'Zone Adversaire', { fontSize: '16px', color: '#fff' });
    
    const opponentGroundY = hudHeight + mainZoneHeight - 20;
    this.opponentGroundLevel = opponentGroundY;
    this.opponentGroundLine = this.add.graphics();
    this.opponentGroundLine.lineStyle(4, 0x0000ff, 1);
    this.opponentGroundLine.beginPath();
    this.opponentGroundLine.moveTo(opponentZoneX, this.opponentGroundLevel);
    this.opponentGroundLine.lineTo(opponentZoneX + opponentZoneWidth, this.opponentGroundLevel);
    this.opponentGroundLine.closePath();
    this.opponentGroundLine.strokePath();
    this.add.text(opponentZoneX + 10, this.opponentGroundLevel - 25, 'OPPONENT GAME OVER', { fontSize: '10px', color: '#0000ff' });
  }
  
  update(time: number, delta: number) { // Ajout de 'time' pour la cohérence avec Phaser.Scene.update
    const BLOCK_SPEED = 20 / 1000; // Vitesse de descente en pixels par milliseconde (ex: 20 pixels par seconde)

    const scoreText = this.children.getByName('scoreText') as Phaser.GameObjects.Text;
    if (scoreText) scoreText.setText(`Score: ${this.score}`);

    const comboText = this.children.getByName('comboText') as Phaser.GameObjects.Text;
    if (comboText) comboText.setText(`Combo: ${this.combo}`);

    const currentTime = time; // Utiliser le paramètre 'time'
    this.activeBlocks.forEach(block => {
      if (!block.isDestroyed) { // Ne pas traiter les blocs déjà marqués pour destruction
        if (block.isProtected && !block.isVulnerable && currentTime > block.spawnTime + this.BLOCK_VULNERABLE_TIME) {
          block.isProtected = false;
          block.isVulnerable = true;
          block.textObject.setBackgroundColor('#ffffff');
          block.textObject.setColor('#000000');
          console.log(`Block ${block.hangeulWord} is now vulnerable.`);
        }

        block.y += BLOCK_SPEED * delta;
        // block.textObject.setY(block.y); // Le container gère la position relative du textObject

        if (block.y + block.height / 2 > this.playerGroundLevel) { // Comparer le centre du bloc ou son bas
          console.log(`Block ${block.hangeulWord} hit the ground and was destroyed.`);
          this.riseOwnGround(20); // Pénalité fixe pour l'instant
          this.destroyBlock(block, false); // false = pas détruit par le joueur
        }
      }
    });

    this.activeBlocks = this.activeBlocks.filter(block => !block.isDestroyed);
  }

  // --- Gestion des Blocs ---
  private getRandomWordFromList(): string | null {
    if (!this.wordList || this.wordList.length === 0) {
      return null; // Ou un mot par défaut si la liste est vide
    }
    const randomIndex = Phaser.Math.Between(0, this.wordList.length - 1);
    return this.wordList[randomIndex].word;
  }

  private spawnBlock(x: number, y: number, word: string) {
    if (!word) {
        console.warn("Attempted to spawn block with undefined/empty word.");
        return;
    }
    const textStyle = {
      fontSize: '28px', // légèrement réduit pour plus de mots à l'écran
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 8, y: 4 } // réduit
    };
    const textObject = this.add.text(0, 0, word, textStyle).setOrigin(0.5);

    const blockContainer = this.add.container(x, y, [textObject]) as HangeulBlock;
    blockContainer.setSize(textObject.width, textObject.height);

    blockContainer.hangeulWord = word;
    blockContainer.spawnTime = this.time.now;
    blockContainer.isProtected = true;
    blockContainer.isVulnerable = false;
    blockContainer.textObject = textObject;

    this.activeBlocks.push(blockContainer);
    console.log(`Spawned block: ${word} at (${x},${y}), protected: true`);
  }

  private destroyBlock(block: HangeulBlock, byPlayer: boolean) {
    if (block.isDestroyed) return; // Déjà en cours de destruction

    block.isDestroyed = true; // Marquer pour suppression
    block.destroy(); // Détruire le container et ses enfants (textObject)

    if (byPlayer) {
      this.score += 10; // Augmenter le score
      this.combo += 1;
      // TODO: Effets visuels/sonores pour la destruction par le joueur
    } else {
      // Bloc a touché le sol ou autre destruction non-joueur
      this.combo = 0; // Réinitialiser le combo
      // TODO: Effets visuels/sonores pour la destruction par le sol
    }
    console.log(`Block ${block.hangeulWord} destroyed. By player: ${byPlayer}. Score: ${this.score}, Combo: ${this.combo}`);
  }


  // --- Gestion de la Saisie et Attaques ---
  private async handlePlayerInput(event: KeyboardEvent) {
    const key = event.key;

    if (key === 'Enter') {
      const enteredWord = this.currentInput.trim();
      this.currentInput = ''; // Vider l'input après Enter
      this.inputDisplay.setText(this.currentInput);

      if (enteredWord.length === 0) return;

      if (enteredWord.startsWith(this.attackPrefix)) {
        const attackWord = enteredWord.substring(this.attackPrefix.length);
        if (attackWord.length > 0) {
          console.log(`Player attempts ATTACK with word: ${attackWord}`);
          // Logique d'attaque (inchangée pour l'instant)
          const mockGameId = 'testGame123';
          const mockAttackerId = 'player1';
          const mockTargetId = 'player2';
          try {
            const response = await sendTyphoonAttackService(mockGameId, mockAttackerId, mockTargetId, attackWord);
            this.handleAttackResponse(response, mockAttackerId);
          } catch (error) {
            console.error("Error calling sendTyphoonAttackService:", error);
            this.showTemporaryMessage("Erreur de communication avec le serveur.", 0xff0000, 3000);
          }
        }
      } else {
        // Logique de destruction de bloc local
        console.log(`Player attempts to clear LOCAL block with word: ${enteredWord}`);
        let blockCleared = false;
        for (let i = this.activeBlocks.length - 1; i >= 0; i--) {
          const block = this.activeBlocks[i];
          if (!block.isDestroyed && block.hangeulWord === enteredWord) {
            if (block.isVulnerable) {
              this.destroyBlock(block, true); // true = détruit par le joueur
              this.showTemporaryMessage(`Bloc '${enteredWord}' détruit! +10 points`, 0x00ff00, 1500);
              blockCleared = true;
              break;
            } else if (block.isProtected) {
              this.showTemporaryMessage(`Bloc '${enteredWord}' est protégé! Attendez.`, 0xffa500, 2000);
              this.combo = 0; // Pénalité pour avoir tapé un mot protégé
              blockCleared = true; // Considéré comme "géré" pour éviter "mot incorrect"
              break;
            }
          }
        }
        if (!blockCleared) {
          this.showTemporaryMessage(`Mot '${enteredWord}' incorrect ou bloc non vulnérable.`, 0xff0000, 2000);
          this.combo = 0;
        }
      }
    } else if (key === 'Backspace') {
      this.currentInput = this.currentInput.slice(0, -1);
    } else if (key.length === 1 && this.currentInput.length < 50) {
      this.currentInput += key;
    }

    this.inputDisplay.setText(this.currentInput);
  }

  private handleAttackResponse(response: HangeulTyphoonAttackResponse, attackerId: string) {
    // ... (logique de gestion de réponse d'attaque, globalement inchangée pour l'instant)
    // ... (mais s'assurer que riseOwnGround et updateOpponentGroundVisual sont appelés correctement)
     console.log("Attack response received:", response);

     if (response.status === "success") {
       this.showTemporaryMessage(`Succès ! Bloc '${response.destroyedBlockWord}' détruit chez l'adversaire.`, 0x00ff00, 3000);
       this.updateOpponentGroundVisualBasedOnRiseAmount(response.targetGroundRiseAmount || 20); // 20 est une valeur par défaut
     } else if (response.status === "failure") {
       this.showTemporaryMessage(`Échec: ${response.message || 'Tentative invalide.'}`, 0xffa500, 3500);
       if (response.attackerPlayerId === attackerId && response.attackerPenaltyGroundRiseAmount) {
         this.riseOwnGround(response.attackerPenaltyGroundRiseAmount);
       }
     } else {
       this.showTemporaryMessage("Réponse inconnue du serveur.", 0xff0000, 3000);
     }
   }

   private updateOpponentGroundVisualBasedOnRiseAmount(riseAmount: number) {
     const { height } = this.scale;
     const hudHeight = 50;
     const gameAreaHeight = height - hudHeight;
     const mainZoneHeight = gameAreaHeight * 0.8;

     this.opponentCurrentGroundFillAmount += riseAmount;
     if (this.opponentCurrentGroundFillAmount > mainZoneHeight) {
         this.opponentCurrentGroundFillAmount = mainZoneHeight;
     }
     if (this.opponentCurrentGroundFillAmount < 0) {
         this.opponentCurrentGroundFillAmount = 0;
     }

     const fillPercentage = (this.opponentCurrentGroundFillAmount / mainZoneHeight) * 100;
     this.updateOpponentGroundVisual(fillPercentage);
   }

   private showTemporaryMessage(message: string, color: number = 0xffffff, duration: number = 2000) {
     const { width, height } = this.scale; // Utiliser this.scale.width et this.scale.height
     const msgText = this.add.text(this.scale.width / 2, this.scale.height / 2, message, {
         fontSize: '24px',
         color: `#${color.toString(16)}`,
         backgroundColor: 'rgba(0,0,0,0.7)',
         padding: { x: 20, y: 10 }
     }).setOrigin(0.5);

     this.time.delayedCall(duration, () => {
         msgText.destroy();
     });
   }

   private riseOwnGround(amountInPixels: number) {
    const { width } = this.scale; // Utiliser this.scale.width
    const hudHeight = 50;

    this.playerGroundLevel -= amountInPixels;

    this.groundLine.clear();
    this.groundLine.lineStyle(4, 0xff0000, 1);
    this.groundLine.beginPath();
    this.groundLine.moveTo(0, this.playerGroundLevel);
    this.groundLine.lineTo(width * this.MAIN_PLAYER_ZONE_WIDTH_RATIO, this.playerGroundLevel);
    this.groundLine.closePath();
    this.groundLine.strokePath();

    console.log(`Player ground rose by ${amountInPixels}. New level: ${this.playerGroundLevel}`);

    if (this.playerGroundLevel <= hudHeight) {
      console.log("GAME OVER for player!");
      this.showTemporaryMessage("GAME OVER!", 0xff0000, 5000);
      this.scene.pause();
      // TODO: Envoyer un événement de fin de jeu au composant React parent
      this.events.emit('gameOver', { score: this.score, reason: 'Ground reached top' });
    }
  }

   private updateOpponentGroundVisual(newHeightPercentage: number) {
     const { width, height } = this.scale; // Utiliser this.scale.width et this.scale.height
     const hudHeight = 50;
     const gameAreaHeight = height - hudHeight;
     const mainZoneHeight = gameAreaHeight * 0.8;
     const opponentZoneX = width * this.MAIN_PLAYER_ZONE_WIDTH_RATIO;
     const opponentZoneWidth = width * this.OPPONENT_ZONE_WIDTH_RATIO;

     const opponentBaseY = hudHeight + mainZoneHeight;
     const opponentTopY = hudHeight;

     this.opponentGroundLevel = opponentBaseY - (mainZoneHeight * (newHeightPercentage / 100));

     this.opponentGroundLine.clear();
     this.opponentGroundLine.lineStyle(4, 0x0000ff, 1);
     this.opponentGroundLine.beginPath();
     this.opponentGroundLine.moveTo(opponentZoneX, this.opponentGroundLevel);
     this.opponentGroundLine.lineTo(opponentZoneX + opponentZoneWidth, this.opponentGroundLevel);
     this.opponentGroundLine.closePath();
     this.opponentGroundLine.strokePath();

     console.log(`Opponent ground visual updated to ${newHeightPercentage}% (${this.opponentGroundLevel}px)`);

     if (this.opponentGroundLevel <= opponentTopY) {
       console.log("GAME OVER for opponent (simulated)!");
       // Pourrait émettre un événement si le jeu doit se terminer en fonction de cela
       // this.events.emit('opponentDefeated', { score: this.score });
     }
   }
 }

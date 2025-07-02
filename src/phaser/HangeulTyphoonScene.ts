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

export default class HangeulTyphoonScene extends Phaser.Scene {
  private score: number = 0;
  private combo: number = 0;
  private gameMode: string = '';
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

  init(data: { gameMode: string }) {
    this.gameMode = data.gameMode || 'Mode Test'; // Default mode if none is provided
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
    // Définissez cette constante au début de votre classe de scène pour un réglage facile
    // Plus la valeur est petite, plus les blocs descendent vite.
    
    const playerZoneWidth = width * this.MAIN_PLAYER_ZONE_WIDTH_RATIO;
    const opponentZoneWidth = width * this.OPPONENT_ZONE_WIDTH_RATIO;
    const opponentZoneX = playerZoneWidth;
    
    
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
    
    
    // Zone Adversaire
    const opponentZone = this.add.graphics();
    opponentZone.fillStyle(0x330000, 0.8);
    opponentZone.fillRect(opponentZoneX, hudHeight, opponentZoneWidth, mainZoneHeight);
    this.add.text(opponentZoneX + 10, hudHeight + 10, 'Zone Adversaire', { fontSize: '16px', color: '#fff' });
    
    // Ligne de "sol" Adversaire (initiale)
    const opponentGroundY = hudHeight + mainZoneHeight - 20; // Même position initiale que le joueur
    this.opponentGroundLevel = opponentGroundY;
    this.opponentGroundLine = this.add.graphics();
    this.opponentGroundLine.lineStyle(4, 0x0000ff, 1); // Ligne bleue pour l'adversaire
    this.opponentGroundLine.beginPath();
    this.opponentGroundLine.moveTo(opponentZoneX, this.opponentGroundLevel);
    this.opponentGroundLine.lineTo(opponentZoneX + opponentZoneWidth, this.opponentGroundLevel);
    this.opponentGroundLine.closePath();
    this.opponentGroundLine.strokePath();
    this.add.text(opponentZoneX + 10, this.opponentGroundLevel - 25, 'OPPONENT GAME OVER', { fontSize: '10px', color: '#0000ff' });
    
    
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
    
    // Spawn d'un bloc de test initial
    this.spawnBlock(playerZoneWidth * 0.5, hudHeight + 50, "한글"); // Placé au milieu de la zone joueur, en haut
    
    // --- Gestionnaire d'événements clavier ---
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown', (event: KeyboardEvent) => {
        this.handlePlayerInput(event);
      });
    }
    
  }
  
  update(delta: number) {
    const BLOCK_SPEED = 0.5; // Vitesse de descente en pixels par milliseconde
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

    // Mise à jour de l'état des blocs (vulnérabilité)
    const currentTime = this.time.now;
    this.activeBlocks.forEach(block => {
      if (block.isProtected && !block.isVulnerable && currentTime > block.spawnTime + this.BLOCK_VULNERABLE_TIME) {
        block.isProtected = false;
        block.isVulnerable = true;
        // Changer l'apparence du bloc pour indiquer la vulnérabilité
        block.textObject.setBackgroundColor('#ffffff'); // Fond blanc
        block.textObject.setColor('#000000'); // Texte noir
        block.textObject.setData('isVulnerable', true); // Marqueur supplémentaire si besoin
        console.log(`Block ${block.hangeulWord} is now vulnerable.`);
      }

      // --- TODO 1: Logique de descente des blocs ---
      // Nous utilisons `delta` pour une descente fluide, indépendante du framerate.
      // `delta` est le temps écoulé en millisecondes depuis la dernière frame.
      block.y += BLOCK_SPEED * delta;
      block.textObject.setY(block.y); // Mettez à jour la position Y de l'objet Phaser

      // --- TODO 2: Logique de destruction si le bloc touche le sol ---
      // this.playerGroundLevel doit être la coordonnée Y du sol de votre joueur.
      // On vérifie si le bas du bloc (son Y + sa hauteur) a dépassé le niveau du sol.
      if (block.y + block.textObject.height > this.playerGroundLevel) {
        console.log(`Block ${block.hangeulWord} hit the ground and was destroyed.`);
        
        // Appliquer une pénalité : faire monter le sol du joueur
        // C'est une excellente mécanique pour augmenter la pression !
        this.riseOwnGround(1); // Fait monter le sol d'un niveau

        // Détruire l'objet de jeu Phaser pour libérer la mémoire
        block.textObject.destroy();
        
        // Marquer le bloc pour suppression de notre tableau de suivi
        block.isDestroyed = true;
      }
    });

    // Après la boucle, nous retirons tous les blocs marqués comme détruits
    // de notre tableau `activeBlocks`. C'est plus sûr que de modifier le tableau
    // pendant qu'on boucle dessus.
    this.activeBlocks = this.activeBlocks.filter(block => !block.isDestroyed);
  }

  // --- Gestion des Blocs ---

  private spawnBlock(x: number, y: number, word: string) {
    const textStyle = {
      fontSize: '32px',
      color: '#ffffff', // Couleur initiale du texte (blanc)
      backgroundColor: '#000000', // Fond initial (noir)
      padding: { x: 10, y: 5 }
    };
    const textObject = this.add.text(0, 0, word, textStyle).setOrigin(0.5);

    // Utilisation d'un Container pour englober le texte et faciliter la gestion
    const blockContainer = this.add.container(x, y, [textObject]) as HangeulBlock;
    blockContainer.setSize(textObject.width, textObject.height); // Important pour les interactions futures

    // Propriétés personnalisées
    blockContainer.hangeulWord = word;
    blockContainer.spawnTime = this.time.now;
    blockContainer.isProtected = true;
    blockContainer.isVulnerable = false;
    blockContainer.textObject = textObject; // Référence à l'objet texte pour le style

    this.activeBlocks.push(blockContainer);
    console.log(`Spawned block: ${word} at (${x},${y}), protected: true`);

    // Pour tester, on peut en faire apparaître un au début
    if (this.activeBlocks.length === 1 && this.gameMode !== 'Duel') { // Évitons le spawn auto en mode Duel pour le moment
       // this.time.delayedCall(1000, () => this.spawnBlock(this.scale.width * 0.35, 100, "테스트"));
    }
  }

  // TODO: Ajouter une méthode pour détruire/supprimer un bloc
  // private destroyBlock(block: HangeulBlock) { ... }


  // --- Gestion de la Saisie et Attaques ---
  private async handlePlayerInput(event: KeyboardEvent) {
    const key = event.key;

    if (key === 'Enter') {
      if (this.currentInput.startsWith(this.attackPrefix)) {
        const attackWord = this.currentInput.substring(this.attackPrefix.length);
        if (attackWord.length > 0) {
          console.log(`Player attempts attack with word: ${attackWord}`);
          this.currentInput = ''; // Vider l'input avant l'appel asynchrone
          this.inputDisplay.setText(this.currentInput);

          const mockGameId = 'testGame123';
          const mockAttackerId = 'player1'; // Cet ID devrait correspondre à l'utilisateur actuel
          const mockTargetId = 'player2';

          try {
            const response = await sendTyphoonAttackService(mockGameId, mockAttackerId, mockTargetId, attackWord);
            this.handleAttackResponse(response, mockAttackerId);
          } catch (error) {
            console.error("Error calling sendTyphoonAttackService:", error);
            this.showTemporaryMessage("Erreur de communication avec le serveur.", 0xff0000, 3000);
          }
        } else {
            this.currentInput = ''; // Vider si seulement '<' a été tapé
        }
      } else {
        console.log(`Player typed: ${this.currentInput} - not an attack. Handling as local input.`);
        // Ici, on pourrait vérifier si `this.currentInput` correspond à un bloc local
        // et le détruire si c'est le cas (pour les modes non-Duel ou entraînement)
        // Pour l'instant, on se concentre sur le duel.
        this.currentInput = '';
      }
    } else if (key === 'Backspace') {
      this.currentInput = this.currentInput.slice(0, -1);
    } else if (key.length === 1 && this.currentInput.length < 50) { // Limiter la longueur de la saisie
      this.currentInput += key;
    }

    this.inputDisplay.setText(this.currentInput);
  }

  private handleAttackResponse(response: HangeulTyphoonAttackResponse, attackerId: string) {
    console.log("Attack response received:", response);

    if (response.status === "success") {
      // Jouer un son de succès (si disponible)
      // this.sound.play('attackSuccessSound');
      this.showTemporaryMessage(`Succès ! Bloc '${response.destroyedBlockWord}' détruit chez l'adversaire.`, 0x00ff00, 3000);

      // Mettre à jour le visuel du sol de l'adversaire (simulation)
      // La réponse du service inclut targetGroundRiseAmount, mais c'est la *hausse* du sol adverse.
      // updateOpponentGroundVisual attend un *pourcentage* de la hauteur totale.
      // Pour la simulation, nous allons augmenter un pourcentage arbitraire à chaque succès.
      // Idéalement, le backend renverrait la nouvelle hauteur totale ou le pourcentage.
      // Pour l'instant, faisons une simulation simple: chaque succès augmente de 10% la hauteur du sol adverse.
      // Note: `targetGroundRiseAmount` dans la réponse actuelle est un pixel, pas un pourcentage.
      // Nous allons le convertir en pourcentage approximatif pour la démo.
      const gameAreaHeight = this.scale.height - 50 - (this.scale.height - 50) * 0.2; // hudHeight - inputZoneHeight
      const mainZoneHeight = gameAreaHeight * 0.8;
      let risePercent = response.targetGroundRiseAmount ? (response.targetGroundRiseAmount / mainZoneHeight) * 100 : 10; // 10% par défaut si non fourni

      const currentOpponentGroundPercent = this.opponentGroundLevel > 0 ?
        100 - ((this.opponentGroundLevel - (50 + mainZoneHeight * 0.2)) / mainZoneHeight) * 100
        : 0; // Approximation inverse
      // Pour éviter des calculs complexes ici, on va juste augmenter un % fixe.
      // Supposons que this.opponentCurrentFillPercentage est une variable qui trace cela.
      // Pour cette démo, on va juste appeler avec une valeur fixe pour montrer le mécanisme.
      // Let's assume we want to simulate the opponent's ground rising by a fixed percentage on success.
      // This needs a proper state variable for opponent's ground fill percentage.
      // For now, we'll just use a fixed value to demonstrate updateOpponentGroundVisual.
      // Let's simulate a 20% rise on opponent's side.
      // This should ideally be based on the opponent's actual state from the server.
      // For this simulation, let's assume `response.targetNewGroundHeightPercentage` exists or we calculate it.
      // Given the current `sendTyphoonAttackService` mock, `targetGroundRiseAmount` is in pixels.
      // We need to define how this translates to the opponent's ground height.
      // Let's assume for simulation `updateOpponentGroundVisual` takes the *new total fill percentage*.
      // We need a variable to track opponent's ground fill, e.g., `this.opponentGroundFillPercent`.
      // For now, let's just add a fixed 15% to a conceptual opponent ground fill.
      // This part needs refinement based on how `targetGroundRiseAmount` is intended to be used.
      // Let's say `response.targetGroundRiseAmount` is the *amount* the ground rises in pixels on their side.
      // We need `updateOpponentGroundVisual` to take this into account.
      // The current `updateOpponentGroundVisual` takes a *total percentage*.
      // Let's simplify: if success, opponent ground rises by 15 pixels (simulated).
      // We will call updateOpponentGroundVisual with a *new total height* for opponent.
      // This will be tricky without knowing the opponent's current ground level from server.
      // For now, let's make `updateOpponentGroundVisual` take the amount to rise.
      // NO, the spec says: updateOpponentGroundVisual(newHeight)
      // So, we need to calculate this newHeight.
      // Let's assume the mock `targetGroundRiseAmount` is the *new height value* for the opponent's ground for simplicity of this step.
      // This is a placeholder for a more robust calculation or server-provided value.
      const simulatedOpponentNewHeight = response.targetGroundRiseAmount || 20; // pixels from bottom, needs to be %
      // Let's re-interpret: `targetGroundRiseAmount` is the *amount* the ground should rise.
      // We'll simulate `updateOpponentGroundVisual` taking this amount directly for now and converting internally.
      // Or, better: the service tells us the opponent's ground *rose by X pixels*. Our `updateOpponentGroundVisual`
      // should then adjust its current visual.
      // For now, let's assume `response.targetGroundRiseAmount` is a direct value for how much the *opponent's* ground rises on *their* screen.
      // We will simulate this by calling `updateOpponentGroundVisual` with a conceptual "percentage full".
      // Let's assume a successful attack makes the opponent's ground rise by 20% of *their* play area.
       this.updateOpponentGroundVisualBasedOnRiseAmount(response.targetGroundRiseAmount || 20);


    } else if (response.status === "failure") {
      // Jouer un son d'échec
      // this.sound.play('attackFailSound');
      this.showTemporaryMessage(`Échec: ${response.message || 'Tentative invalide.'}`, 0xffa500, 3500);

      if (response.attackerPlayerId === attackerId && response.attackerPenaltyGroundRiseAmount) {
        this.riseOwnGround(response.attackerPenaltyGroundRiseAmount);
      }
    } else {
      // Cas d'erreur inattendue ou statut non géré
      this.showTemporaryMessage("Réponse inconnue du serveur.", 0xff0000, 3000);
    }
  }

  private updateOpponentGroundVisualBasedOnRiseAmount(riseAmount: number) {
    const { height } = this.scale;
    const hudHeight = 50;
    const gameAreaHeight = height - hudHeight;
    const mainZoneHeight = gameAreaHeight * 0.8; // Hauteur de la zone de jeu de l'adversaire

    this.opponentCurrentGroundFillAmount += riseAmount;
    if (this.opponentCurrentGroundFillAmount > mainZoneHeight) {
        this.opponentCurrentGroundFillAmount = mainZoneHeight; // Plafonner à la hauteur max
    }
    if (this.opponentCurrentGroundFillAmount < 0) { // Ne devrait pas arriver avec les hausses
        this.opponentCurrentGroundFillAmount = 0;
    }

    const fillPercentage = (this.opponentCurrentGroundFillAmount / mainZoneHeight) * 100;
    this.updateOpponentGroundVisual(fillPercentage);
  }


  // Helper pour afficher des messages temporaires (notifications)
  private showTemporaryMessage(message: string, color: number = 0xffffff, duration: number = 2000) {
    const { width, height } = this.scale;
    const msgText = this.add.text(width / 2, height / 2, message, {
        fontSize: '24px',
        color: `#${color.toString(16)}`,
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: { x: 20, y: 10 }
    }).setOrigin(0.5);

    this.time.delayedCall(duration, () => {
        msgText.destroy();
    });
  }


  // --- Mécaniques de Duel ---

  private riseOwnGround(amount: number) {
    const { width } = this.scale;
    const hudHeight = 50; // Doit correspondre à la valeur dans create()

    this.playerGroundLevel -= amount; // Le sol monte, donc la coordonnée Y diminue

    // Redessiner la ligne de sol du joueur
    this.groundLine.clear();
    this.groundLine.lineStyle(4, 0xff0000, 1);
    this.groundLine.beginPath();
    this.groundLine.moveTo(0, this.playerGroundLevel);
    this.groundLine.lineTo(width * this.MAIN_PLAYER_ZONE_WIDTH_RATIO, this.playerGroundLevel);
    this.groundLine.closePath();
    this.groundLine.strokePath();

    console.log(`Player ground rose by ${amount}. New level: ${this.playerGroundLevel}`);

    // Vérification de Game Over pour le joueur
    // Le "haut" de l'aire de jeu est juste sous le HUD
    if (this.playerGroundLevel <= hudHeight) {
      console.log("GAME OVER for player!");
      this.showTemporaryMessage("GAME OVER!", 0xff0000, 5000);
      // TODO: Logique de fin de jeu plus complète (arrêter le spawn de blocs, etc.)
      this.scene.pause(); // Pause simple pour l'instant
    }
  }

  private updateOpponentGroundVisual(newHeightPercentage: number) {
    // newHeightPercentage est un pourcentage de la hauteur de la zone de jeu de l'adversaire
    // 0% = en bas, 100% = en haut (game over pour l'adversaire)
    const { width, height } = this.scale;
    const hudHeight = 50;
    const gameAreaHeight = height - hudHeight;
    const mainZoneHeight = gameAreaHeight * 0.8; // Correspond à create()
    const opponentZoneX = width * this.MAIN_PLAYER_ZONE_WIDTH_RATIO;
    const opponentZoneWidth = width * this.OPPONENT_ZONE_WIDTH_RATIO;

    // La position Y du sol de l'adversaire:
    // hudHeight + mainZoneHeight = bas de la zone de jeu de l'adversaire
    // hudHeight = haut de la zone de jeu de l'adversaire
    const opponentBaseY = hudHeight + mainZoneHeight; // Y quand le sol est tout en bas
    const opponentTopY = hudHeight; // Y quand le sol est tout en haut

    this.opponentGroundLevel = opponentBaseY - (mainZoneHeight * (newHeightPercentage / 100));

    this.opponentGroundLine.clear();
    this.opponentGroundLine.lineStyle(4, 0x0000ff, 1); // Bleu
    this.opponentGroundLine.beginPath();
    this.opponentGroundLine.moveTo(opponentZoneX, this.opponentGroundLevel);
    this.opponentGroundLine.lineTo(opponentZoneX + opponentZoneWidth, this.opponentGroundLevel);
    this.opponentGroundLine.closePath();
    this.opponentGroundLine.strokePath();

    console.log(`Opponent ground visual updated to ${newHeightPercentage}% (${this.opponentGroundLevel}px)`);

     // Vérification de Game Over pour l'adversaire (visuellement)
    if (this.opponentGroundLevel <= opponentTopY) {
      console.log("GAME OVER for opponent (simulated)!");
      // On pourrait afficher un message, mais c'est surtout pour l'info du joueur local
    }
  }
}

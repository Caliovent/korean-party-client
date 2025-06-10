// src/phaser/HubScene.ts
import Phaser from 'phaser';
import nipplejs from 'nipplejs';
import { db, auth } from '../firebaseConfig'; // Firebase setup
import { doc, setDoc, onSnapshot, collection, query, where, deleteDoc, Unsubscribe, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';

interface HubPlayerData {
  uid: string;
  x: number;
  y: number;
  displayName?: string;
  lastSeen?: Timestamp; // For potentially cleaning up stale players
}

export class HubScene extends Phaser.Scene {
  private player?: Phaser.GameObjects.Sprite & { body: Phaser.Physics.Arcade.Body };
  private targetPosition?: Phaser.Math.Vector2;
  private moveSpeed = 200;

  private currentUser: User | null = null;
  private otherPlayers!: Phaser.GameObjects.Group; // Group to manage other player sprites
  // Map to store target positions for other players for interpolation
  private remotePlayerTargets: Map<string, Phaser.Math.Vector2> = new Map();
  private firestoreListenerUnsubscribe?: Unsubscribe;
  private joystick?: nipplejs.JoystickManager;
  private joystickContainer?: HTMLElement;

  constructor() {
    super({ key: 'HubScene' });
  }

  init() {
    this.currentUser = auth.currentUser;
    if (!this.currentUser) {
      console.error("No user logged in, HubScene cannot function.");
      // Potentially redirect to login or show an error
      // For now, we'll let it proceed but Firestore interactions for the current user will fail.
    }
  }

  preload() {
    this.load.image('hub_tiles', 'http://labs.phaser.io/assets/textures/grass.png');
    this.load.image('player_avatar', 'assets/player.png');
    this.load.image('other_player_avatar', 'assets/player.png'); // Can be a different asset or tinted
    this.load.image('game_portal', 'http://labs.phaser.io/assets/sprites/orb-red.png'); // Placeholder for portal/NPC
    this.load.image('guild_panel', 'http://labs.phaser.io/assets/sprites/orb-green.png'); // Placeholder for guild panel
  }

  create() {
    console.log('HubScene created! Current user:', this.currentUser?.uid);
    this.add.tileSprite(0, 0, this.cameras.main.width, this.cameras.main.height, 'hub_tiles').setOrigin(0, 0);

    // Initialize other players group
    this.otherPlayers = this.add.group();

    // Setup player
    if (this.textures.exists('player_avatar')) {
      this.player = this.add.sprite(this.cameras.main.width / 2, this.cameras.main.height / 2, 'player_avatar') as any;
      this.player.setScale(2);
    } else {
      // Fallback for player avatar (as before)
      console.error('Player avatar texture not found!');
      const graphics = this.add.graphics();
      graphics.fillStyle(0xff0000, 1);
      graphics.fillRect(-16, -16, 32, 32);
      const textureKey = 'player_placeholder_self';
      if (this.textures.exists(textureKey)) this.textures.remove(textureKey);
      this.player = this.add.sprite(this.cameras.main.width / 2, this.cameras.main.height / 2, textureKey) as any;
      this.player.setTexture(graphics.generateTexture(textureKey, 32, 32));
      graphics.destroy();
    }

    if (this.player) {
        this.physics.world.enable(this.player);
        if (this.player.body) {
            this.player.body.setCollideWorldBounds(true);
            // Send initial position
            this.updatePlayerPositionInFirestore(this.player.x, this.player.y);
        }
    }

    // Joystick and Click-to-move input
    if (this.sys.game.device.input.touch) {
        const gameContainer = this.sys.game.canvas.parentElement;
        if (gameContainer) {
            this.joystickContainer = document.createElement('div');
            this.joystickContainer.id = 'joystick-zone';
            this.joystickContainer.style.position = 'absolute';
            this.joystickContainer.style.left = '0px'; // Covers left half
            this.joystickContainer.style.top = '50%'; // Covers bottom-left quadrant
            this.joystickContainer.style.width = '50%';
            this.joystickContainer.style.height = '50%';
            this.joystickContainer.style.pointerEvents = 'auto'; // Crucial for touch
            // this.joystickContainer.style.backgroundColor = 'rgba(255,0,0,0.1)'; // For debugging zone visibility
            gameContainer.appendChild(this.joystickContainer);

            const joystickOptions: nipplejs.JoystickManagerOptions = {
                zone: this.joystickContainer,
                mode: 'static',
                position: { left: '30%', top: '50%' }, // Position within the zone (left: 15% of 50% screen = 7.5% of screen, top: 80% of 50% screen = 40% of screen from top of zone) - this means bottom left of the zone
                color: 'grey',
                size: 100
            };

            this.joystick = nipplejs.create(joystickOptions);

            this.joystick.on('move', (_evt, data) => {
                if (!this.player || !this.player.body) return;

                const angle = data.angle.radian;
                const force = data.force;
                const speed = this.moveSpeed * force;

                const velocityX = Math.cos(angle) * speed;
                const velocityY = Math.sin(angle) * speed;

                this.player.body.setVelocity(velocityX, velocityY);

                this.targetPosition = undefined;
                this.updatePlayerPositionInFirestore(this.player.x, this.player.y);
            });

            this.joystick.on('end', () => {
                if (!this.player || !this.player.body) return;
                this.player.body.setVelocity(0, 0);
                this.updatePlayerPositionInFirestore(this.player.x, this.player.y);
            });
        }

        // Conditional click-to-move for touch devices (e.g., only if joystick not active or on right side of screen)
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            // Only allow click-to-move if the click is NOT in the joystick's zone
            // This assumes joystick is in the left half. A more robust check might involve pointer.x relative to joystickContainer bounds.
            if (pointer.x < this.cameras.main.width / 2) {
                 // If joystick is potentially active (e.g., finger is on it), NippleJS might stop propagation.
                 // However, to be safe, we can check if a Nipple is active if the API supports it.
                 // For now, simply don't do click-to-move if the click is in the joystick's general area.
                const activeNipple = this.joystick?.get(0); // Attempt to get the first nipple
                if (activeNipple && activeNipple.frontPosition) { // frontPosition exists if finger is on joystick
                    return;
                }
            }

            // If outside joystick area or joystick not active, allow click to move
            if (!this.player || !this.player.body) return;
            this.targetPosition = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
            this.physics.moveTo(this.player, this.targetPosition.x, this.targetPosition.y, this.moveSpeed);
        });

    } else {
        // Original click-to-move for non-touch devices
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (!this.player || !this.player.body) return;
            this.targetPosition = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
            this.physics.moveTo(this.player, this.targetPosition.x, this.targetPosition.y, this.moveSpeed);
        });
    }

    // Listen for other players
    this.listenForOtherPlayers();

    // Add Game Lobby Portal/NPC
    const portalX = this.cameras.main.width - 100; // Example position
    const portalY = this.cameras.main.height / 2;
    const gamePortal = this.add.sprite(portalX, portalY, 'game_portal').setInteractive();
    gamePortal.on('pointerdown', () => {
      console.log('Game portal clicked');
      this.game.events.emit('openGameLobbyModal');
    });

    // Handle scene shutdown to remove player from Firestore
    this.events.on('shutdown', this.shutdown, this);

    // Add Guild Panel
    const guildPanelX = 100; // Example position
    const guildPanelY = this.cameras.main.height / 2;
    const guildPanelSprite = this.add.sprite(guildPanelX, guildPanelY, 'guild_panel').setInteractive();
    guildPanelSprite.on('pointerdown', () => {
      console.log('Guild panel clicked');
      this.game.events.emit('openGuildManagementModal');
    });
  }

  updatePlayerPositionInFirestore(x: number, y: number) {
    if (!this.currentUser) return;
    const playerDocRef = doc(db, 'hub_players', this.currentUser.uid);
    const playerData: HubPlayerData = {
      uid: this.currentUser.uid,
      x,
      y,
      displayName: this.currentUser.displayName || 'Anonymous',
      lastSeen: serverTimestamp() as Timestamp // Firestore server timestamp
    };
    setDoc(playerDocRef, playerData, { merge: true })
      .catch(error => console.error("Error updating player position:", error));
  }

  listenForOtherPlayers() {
    if (!this.currentUser) return; // Cannot filter self without current user

    const hubPlayersRef = collection(db, 'hub_players');
    // Query for players other than the current user.
    // Firestore doesn't support "not-equal" queries directly in this manner for onSnapshot efficiently.
    // We will filter client-side after getting all players.
    const q = query(hubPlayersRef);

    this.firestoreListenerUnsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const playerData = change.doc.data() as HubPlayerData;
        const playerUid = playerData.uid;

        // Skip current player
        if (playerUid === this.currentUser!.uid) return;

        let remotePlayerSprite = this.otherPlayers.getChildren().find(p => (p as any).uid === playerUid) as Phaser.GameObjects.Sprite & { body: Phaser.Physics.Arcade.Body } | undefined;

        if (change.type === 'added' || change.type === 'modified') {
          if (!remotePlayerSprite) {
            remotePlayerSprite = this.add.sprite(playerData.x, playerData.y, 'other_player_avatar') as any;
            remotePlayerSprite.setScale(1.5); // Slightly different scale for others
            (remotePlayerSprite as any).uid = playerUid; // Store UID on the sprite
            this.otherPlayers.add(remotePlayerSprite);
            this.physics.world.enable(remotePlayerSprite); // Enable physics for basic movement
            if (remotePlayerSprite.body) remotePlayerSprite.body.setImmovable(true); // So local player doesn't push them easily

            console.log(`Player ${playerData.displayName || playerUid} added to hub scene.`);
          }
          // Store target position for interpolation in update()
          this.remotePlayerTargets.set(playerUid, new Phaser.Math.Vector2(playerData.x, playerData.y));

        } else if (change.type === 'removed') {
          if (remotePlayerSprite) {
            this.otherPlayers.remove(remotePlayerSprite, true, true); // Remove from group and destroy
            this.remotePlayerTargets.delete(playerUid);
            console.log(`Player ${playerData.displayName || playerUid} removed from hub scene.`);
          }
        }
      });
    });
  }

  update() {
    // Current player movement
    if (this.player && this.player.body && this.targetPosition) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.targetPosition.x,
        this.targetPosition.y
      );

      if (distance < 4) {
        this.player.body.setVelocity(0, 0);
        this.updatePlayerPositionInFirestore(this.player.x, this.player.y); // Send final position
        this.targetPosition = undefined;
      }
    }

    // Other players movement (interpolation)
    this.otherPlayers.getChildren().forEach(sprite => {
      const remotePlayer = sprite as Phaser.GameObjects.Sprite & { uid: string, body: Phaser.Physics.Arcade.Body };
      const target = this.remotePlayerTargets.get(remotePlayer.uid);
      if (target) {
        const distance = Phaser.Math.Distance.Between(remotePlayer.x, remotePlayer.y, target.x, target.y);
        if (distance > 2) { // Only move if not already close
            // Simple linear interpolation (can be replaced with Phaser.Physics.moveToObject for smoother movement)
            // this.physics.moveToObject(remotePlayer, target, this.moveSpeed * 0.8); // Move slightly slower
             const angle = Phaser.Math.Angle.Between(remotePlayer.x, remotePlayer.y, target.x, target.y);
             const speed = this.moveSpeed * 0.8; // Can adjust speed
             remotePlayer.x += Math.cos(angle) * speed * (this.game.loop.delta / 1000);
             remotePlayer.y += Math.sin(angle) * speed * (this.game.loop.delta / 1000);

        } else {
            // remotePlayer.body.setVelocity(0,0); // Stop if using physics move
            // If not using physics move, just set position to ensure it's exact
            remotePlayer.setPosition(target.x, target.y);
        }
      }
    });
  }

  shutdown() {
    console.log('HubScene shutdown. Removing player from Firestore and unsubscribing.');
    if (this.currentUser) {
      const playerDocRef = doc(db, 'hub_players', this.currentUser.uid);
      deleteDoc(playerDocRef).catch(error => console.error("Error removing player from hub:", error));
    }
    if (this.firestoreListenerUnsubscribe) {
      this.firestoreListenerUnsubscribe();
    }
    if (this.joystick) {
        this.joystick.destroy();
        this.joystick = undefined;
    }
    if (this.joystickContainer && this.joystickContainer.parentElement) {
        this.joystickContainer.parentElement.removeChild(this.joystickContainer);
        this.joystickContainer = undefined;
    }
    this.events.off('shutdown', this.shutdown, this);
    // Ensure pointerdown is also turned off to prevent potential leaks if scene restarts
    this.input.off('pointerdown');
  }
}

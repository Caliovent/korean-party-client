// src/phaser/HubScene.ts
import Phaser from "phaser";
import { db, auth } from "../firebaseConfig"; // Firebase setup
import {
  doc,
  setDoc,
  onSnapshot,
  collection,
  query,
  // where, // Unused import
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import type { User } from "firebase/auth";

interface HubPlayerData {
  uid: string;
  x: number;
  y: number;
  displayName?: string;
  lastSeen?: Timestamp; // For potentially cleaning up stale players
}

export default class HubScene extends Phaser.Scene {
  private player?: Phaser.GameObjects.Sprite & {
    body: Phaser.Physics.Arcade.Body;
  };
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>; // Added for ZQSD/WASD controls
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private triggerZones!: Phaser.Physics.Arcade.StaticGroup;
  private gamePortal?: Phaser.GameObjects.Sprite; // Added gamePortal property
  private moveSpeed = 200;

  // New properties for click-to-move
  private targetPosition: Phaser.Math.Vector2 | null = null;
  private targetIndicator: Phaser.GameObjects.Graphics | null = null;

  private currentUser: User | null = null;
  private otherPlayers!: Phaser.GameObjects.Group; // Group to manage other player sprites
  // Map to store target positions for other players for interpolation
  private remotePlayerTargets: Map<string, Phaser.Math.Vector2> = new Map();
  private firestoreListenerUnsubscribe?: () => void;
  private isOverlappingPortal = false;
  // private isOverlappingGuildPanel = false; // Unused property
  private isMapView = false; // For toggling map view

  constructor() {
    super({ key: "HubScene" });
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
    this.load.image("hub_background_village", "assets/hub.png");
    this.load.image("player_avatar", "assets/player_32.png");
    this.load.image("other_player_avatar", "assets/black.png"); // Can be a different asset or tinted
    this.load.image("game_portal", "assets/game_portal.jpeg"); // Placeholder for portal/NPC
    this.load.image("guild_panel", "assets/guild_panel.jpeg"); // Placeholder for guild panel
    this.load.image("daily_challenge_board", "assets/black.png"); // Placeholder for daily challenge board (using game_portal asset for now)
    this.load.image("shop_sign", "assets/black.png"); // Placeholder for shop sign (using game_portal asset for now)
    this.load.image("transparent", "assets/effects/transparent.png");

    // NPC Assets - placeholders, will fallback if not found
    this.load.image("directeur_npc", "assets/sprites/directeur_npc.png");
    this.load.image("maitre_cheon_npc", "assets/maitre_cheon_placeholder.png");
    // Fallback assets if placeholders are missing
    this.load.image("directeur_fallback_npc", "assets/sprites/orb-red.png");
    this.load.image("maitre_cheon_fallback_npc", "assets/sprites/orb-green.png");

    // Asset for Hangeul Typhoon Minigame Entry Point
    this.load.image("hangeul_typhoon_entry", "assets/minigames/background.png"); // Placeholder
  }

  create() {
    console.log("HubScene created! Current user:", this.currentUser?.uid);

    // Setup background image for the extended world
    const bg = this.add.image(0, 0, "hub_background_village").setOrigin(0,0);
    // Per task: background is 1024x1024. Set world bounds to match.
    bg.setDepth(-1); // Ensure background is behind everything else

    const worldWidth = 1024; // TASK REQUIREMENT
    const worldHeight = 1024; // TASK REQUIREMENT
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    // Initialize physics groups
    this.obstacles = this.physics.add.staticGroup();
    this.triggerZones = this.physics.add.staticGroup();

    // Initialize other players group
    this.otherPlayers = this.add.group();

    // Setup player
    if (this.textures.exists("player_avatar")) {
      this.player = this.add.sprite(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        "player_avatar",
        0
      ) as Phaser.GameObjects.Sprite & { body: Phaser.Physics.Arcade.Body };
      this.player?.setScale(1); // Optional chaining
    } else {
      // Fallback for player avatar (as before)
      console.error("Player avatar texture not found!");
      const graphics = this.add.graphics();
      graphics.fillStyle(0xff0000, 1);
      graphics.fillRect(-16, -16, 32, 32);
      const textureKey = "player_placeholder_self";
      if (this.textures.exists(textureKey)) this.textures.remove(textureKey);
      // graphics.generateTexture call creates the texture and adds it to texture manager
      graphics.generateTexture(textureKey, 32, 32);
      this.player = this.add.sprite(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        textureKey, // Use the key directly
      ) as any;
      // this.player.setTexture(textureKey); // setTexture is redundant if sprite is created with key
      graphics.destroy();
    }

    if (this.player) {
      this.physics.world.enable(this.player);
      if (this.player.body) {
        // Player is NOT bound to world edges, allowing camera to be the sole boundary manager.
        this.physics.add.collider(this.player, this.obstacles);
        // Send initial position
        this.updatePlayerPositionInFirestore(this.player.x, this.player.y);
      }
      // ÉTAPE 1: Libérer le joueur des bords de l'écran - Ensured by removing setCollideWorldBounds above.
      // ÉTAPE 2: Définir la taille du monde - this.physics.world.setBounds(0, 0, worldWidth, worldHeight); - This is done earlier.

      // ÉTAPE 3 (NOUVEAU) : Appliquer le zoom par défaut
      this.cameras.main.setZoom(2.5); // ZOOM ADJUSTED
      // ÉTAPE 4 : Lier la caméra au joueur
      this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
      // ÉTAPE 5 : Limiter la caméra aux bords du monde
      this.cameras.main.setBounds(0, 0, worldWidth, worldHeight); // worldWidth/Height now 1024
    }

    // Initialize keyboard controls
    if (this.input.keyboard) { // Null check
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys('W,S,A,D,Z,Q') as Record<string, Phaser.Input.Keyboard.Key>; // Added for ZQSD/WASD controls
    }

    // NEW: Add listener for click-to-move
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (this.isMapView) return; // Don't process clicks if map is open

        this.targetPosition = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);

        // Optional: show a visual indicator where the player is going
        if (!this.targetIndicator) {
            this.targetIndicator = this.add.graphics();
            this.targetIndicator.setDepth(999); // High depth to be on top
        }
        this.targetIndicator.clear();
        this.targetIndicator.lineStyle(2, 0x00ff00, 0.7); // Green circle
        this.targetIndicator.strokeCircle(this.targetPosition.x, this.targetPosition.y, 10);

        // Make it disappear after a short time
        this.time.delayedCall(300, () => {
            if(this.targetIndicator) this.targetIndicator.clear();
        });
    });

    // Listen for other players
    this.listenForOtherPlayers();

    // Add Game Lobby Portal/NPC
    // Le portail de jeu pourrait se trouver au nord-est du village.
    this.gamePortal = this.triggerZones
      .create(900, 250, "game_portal")
      .setSize(64, 64)
      .setDisplaySize(64, 64)
      .setInteractive()
      .refreshBody(); // Important for a static physics body

    if (this.gamePortal) { // Null check
      this.gamePortal.on("pointerdown", () => {
        console.log("Game portal clicked");
        this.game.events.emit("openGameLobbyModal");
      });
    }

    // Add Guild Panel
    // Le panneau de guilde pourrait être près d'un grand bâtiment au sud-ouest.
    const guildPanel = this.triggerZones
      .create(150, 800, "guild_panel")
      .setSize(64, 64)
      .setDisplaySize(64, 64)
      .setInteractive()
      .refreshBody();

    guildPanel.on("pointerdown", () => {
      console.log("Guild panel clicked");
      this.game.events.emit("openGuildManagementModal");
    });

    // Add Daily Challenge Board
    const dailyChallengeBoard = this.triggerZones
      .create(
        this.cameras.main.width / 2, // Centered horizontally
        100, // Positioned towards the top
        "daily_challenge_board",
      )
      .setSize(64, 64)
      .setDisplaySize(64, 64)
      .setInteractive()
      .refreshBody();

    dailyChallengeBoard.on("pointerdown", () => {
      console.log("Daily challenge board clicked");
      this.game.events.emit("openDailyChallengeModal");
    });

    // Add Shop Sign (Maître Kim's Shop)
    const shopSign = this.triggerZones.create(
      this.cameras.main.width / 2 + 150, // Example position
      this.cameras.main.height - 100, // Example position (bottom-ish)
      "shop_sign"
    )
    .setSize(64, 64)
    .setDisplaySize(64, 64)
    .setInteractive()
    .refreshBody();

    shopSign.on("pointerdown", () => {
      console.log("Shop sign clicked");
      this.game.events.emit("openShopModal");
    });

    // Handle scene shutdown to remove player from Firestore
    this.events.on("shutdown", this.shutdown, this);

    // --- Add PNJ ---

    // Directeur Yong Geomwi
    const directeurKey = this.textures.exists("directeur_npc") ? "directeur_npc" : "directeur_fallback_npc";
    const directeurYong = this.add.sprite(
      this.cameras.main.width / 2 - 200, // Position: Example near center-left
      this.cameras.main.height / 2,
      directeurKey
    )
    .setSize(32, 32)
    .setDisplaySize(32, 32)
    .setInteractive();

    directeurYong.on("pointerdown", () => {
      console.log("Directeur Yong Geomwi clicked");
      this.game.events.emit("openDialogueModal", { pnjId: "directeur" });
    });

    // Maître Cheon Mun
    const maitreCheonKey = this.textures.exists("maitre_cheon_npc") ? "maitre_cheon_npc" : "maitre_cheon_fallback_npc";
    const maitreCheon = this.add.sprite(
      150, // Position: Example towards top-left, "welcome" area
      150,
      maitreCheonKey
    )
    .setSize(32, 32)
    .setDisplaySize(32, 32)
    .setInteractive();

    maitreCheon.on("pointerdown", () => {
      console.log("Maître Cheon Mun clicked");
      this.game.events.emit("openDialogueModal", { pnjId: "maitre_cheon" });
    });

    // Listen for map view toggle
    this.game.events.on("toggleMapView", this.handleMapViewToggle, this);
    // Ensure to clean up this listener in shutdown

    // Add Hangeul Typhoon Minigame Entry Point
    // Position it near Maître Cheon Mun (approx. 150, 150)
    // Maître Cheon Mun sprite itself is added around line 257, let's place this next to him.
    const hangeulTyphoonEntry = this.add.sprite(
      200, // x position (a bit to the right of Maître Cheon)
      150, // y position (same as Maître Cheon)
      "hangeul_typhoon_entry"
    )
    .setScale(0.05) // Scale down the placeholder background image
    .setInteractive();

    hangeulTyphoonEntry.on("pointerdown", () => {
      console.log("Hangeul Typhoon entry point clicked");
      this.game.events.emit("startHangeulTyphoonMinigame");
    });
  }

  handleMapViewToggle() {
    this.isMapView = !this.isMapView;
    console.log("Map view toggled:", this.isMapView);

    const worldWidth = this.physics.world.bounds.width;
    const worldHeight = this.physics.world.bounds.height;

    if (this.isMapView) {
      // Zoom out to see the whole map
      this.cameras.main.stopFollow();
      // Pan to the center of the world (e.g., 1024x1024 map, center is 512,512)
      this.cameras.main.pan(worldWidth / 2, worldHeight / 2, 1000, 'Sine.easeInOut');
      const zoomX = this.cameras.main.width / worldWidth;
      const zoomY = this.cameras.main.height / worldHeight;
      const targetZoom = Math.min(zoomX, zoomY, 0.75); // Cap at 0.75 or calculated if smaller
      this.cameras.main.zoomTo(targetZoom, 1000, 'Sine.easeInOut');
      console.log(`Zooming out to: ${targetZoom}`);
    } else {
      // Zoom back to player
      if (this.player) { // Ensure player exists
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.zoomTo(2.5, 1000, 'Sine.easeInOut'); // Default game zoom
        console.log("Zooming back to player at 2.5x");
      } else {
        console.error("Player does not exist, cannot zoom back to player.");
         // Fallback: pan and zoom to a default view if player is missing
        this.cameras.main.pan(worldWidth / 2, worldHeight / 2, 1000, 'Sine.easeInOut');
        this.cameras.main.zoomTo(1, 1000, 'Sine.easeInOut'); // Or some other sensible default
      }
    }
  }


  updatePlayerPositionInFirestore(x: number, y: number) {
    if (!this.currentUser) return;
    const playerDocRef = doc(db, "hub_players", this.currentUser.uid);
    const playerData: HubPlayerData = {
      uid: this.currentUser.uid,
      x,
      y,
      displayName: this.currentUser.displayName || "Anonymous",
      lastSeen: serverTimestamp() as Timestamp, // Firestore server timestamp
    };
    setDoc(playerDocRef, playerData, { merge: true }).catch((error) =>
      console.error("Error updating player position:", error),
    );
  }

  listenForOtherPlayers() {
    if (!this.currentUser) return; // Cannot filter self without current user

    const hubPlayersRef = collection(db, "hub_players");
    const q = query(hubPlayersRef);

    this.firestoreListenerUnsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const playerData = change.doc.data() as HubPlayerData;
        const playerUid = playerData.uid;

        if (playerUid === this.currentUser!.uid) return;

        let existingSprite = this.otherPlayers
          .getChildren()
          .find((p) => p.getData('uid') === playerUid) as (Phaser.GameObjects.Sprite & { body: Phaser.Physics.Arcade.Body }) | undefined;

        if (change.type === "added" || change.type === "modified") {
          if (!existingSprite) { // Player is new or was missing
            const newSprite = this.add.sprite(
              playerData.x,
              playerData.y,
              "other_player_avatar",
            ) as Phaser.GameObjects.Sprite & { body: Phaser.Physics.Arcade.Body };

            newSprite.setScale(1);
            newSprite.setData('uid', playerUid);
            this.otherPlayers.add(newSprite);
            this.physics.world.enable(newSprite);
            if (newSprite.body) {
              newSprite.body.setImmovable(true);
            }
            existingSprite = newSprite;
            console.log(
              `Player ${playerData.displayName || playerUid} added/re-added to hub scene.`,
            );
          }

          if (existingSprite) {
             this.remotePlayerTargets.set(
               playerUid,
               new Phaser.Math.Vector2(playerData.x, playerData.y),
             );
          }

        } else if (change.type === "removed") {
          if (existingSprite) {
            this.otherPlayers.remove(existingSprite, true, true);
            this.remotePlayerTargets.delete(playerUid);
            console.log(
              `Player ${playerData.displayName || playerUid} removed from hub scene.`,
            );
          }
        }
      });
    });
  }

  update() {
    if (!this.player || !this.player.body || !this.cursors || !this.keys) {
      return;
    }

    if (this.isMapView) {
      this.player.body.setVelocity(0);
      if (this.targetIndicator) this.targetIndicator.clear();
      return;
    }

    // --- Keyboard Movement ---
    const isKeyboardActive = this.cursors.left.isDown || this.keys.A.isDown || this.keys.Q.isDown ||
                             this.cursors.right.isDown || this.keys.D.isDown ||
                             this.cursors.up.isDown || this.keys.W.isDown || this.keys.Z.isDown ||
                             this.cursors.down.isDown || this.keys.S.isDown;

    if (isKeyboardActive) {
      this.targetPosition = null; // Cancel click-to-move
      if (this.targetIndicator) this.targetIndicator.clear();

      let velocityX = 0;
      let velocityY = 0;

      if (this.cursors.left.isDown || this.keys.A.isDown || this.keys.Q.isDown) {
        velocityX = -this.moveSpeed;
      } else if (this.cursors.right.isDown || this.keys.D.isDown) {
        velocityX = this.moveSpeed;
      }

      if (this.cursors.up.isDown || this.keys.W.isDown || this.keys.Z.isDown) {
        velocityY = -this.moveSpeed;
      } else if (this.cursors.down.isDown || this.keys.S.isDown) {
        velocityY = this.moveSpeed;
      }

      this.player.body.setVelocity(velocityX, velocityY);

      if (velocityX !== 0 && velocityY !== 0) {
        const vector = new Phaser.Math.Vector2(velocityX, velocityY).normalize().scale(this.moveSpeed);
        this.player.body.setVelocity(vector.x, vector.y);
      }
    }
    // --- Mouse Click Movement ---
    else if (this.targetPosition) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.targetPosition.x,
        this.targetPosition.y
      );

      if (distance < 4) { // Close enough to the target
        this.player.body.setVelocity(0);
        this.targetPosition = null;
        if (this.targetIndicator) this.targetIndicator.clear();
      } else {
        this.physics.moveTo(this.player, this.targetPosition.x, this.targetPosition.y, this.moveSpeed);
      }
    }
    // --- No Input ---
    else {
      this.player.body.setVelocity(0);
    }

    // --- Firestore Update ---
    if (this.player.body.velocity.x !== 0 || this.player.body.velocity.y !== 0) {
      this.updatePlayerPositionInFirestore(this.player.x, this.player.y);
    }

    // --- Overlap Checks ---
    if (!this.isMapView && this.player) {
        const isCurrentlyOverlappingPortal = this.physics.overlap(this.player, this.gamePortal);

      if (isCurrentlyOverlappingPortal && !this.isOverlappingPortal) {
        this.isOverlappingPortal = true;
        console.log("Player ENTERED portal zone.");
        this.game.events.emit("openGameLobbyModal");
      }
      else if (!isCurrentlyOverlappingPortal && this.isOverlappingPortal) {
        this.isOverlappingPortal = false;
        console.log("Player EXITED portal zone.");
      }
    }

    // --- Other Players Movement ---
    this.otherPlayers.getChildren().forEach((sprite) => {
      const remotePlayer = sprite as Phaser.GameObjects.Sprite & {
        getData: (key: string) => any;
        body: Phaser.Physics.Arcade.Body;
      };
      const uid = remotePlayer.getData('uid');
      const target = this.remotePlayerTargets.get(uid);
      if (target) {
        const distance = Phaser.Math.Distance.Between(
          remotePlayer.x,
          remotePlayer.y,
          target.x,
          target.y,
        );
        if (distance > 4) {
          this.physics.moveToObject(remotePlayer, target, this.moveSpeed * 0.8);
        } else {
          remotePlayer.body.setVelocity(0,0);
          remotePlayer.setPosition(target.x, target.y);
        }
      }
    });
  }

  shutdown() {
    console.log(
      "HubScene shutdown. Removing player from Firestore and unsubscribing.",
    );
    if (this.currentUser) {
      const playerDocRef = doc(db, "hub_players", this.currentUser.uid);
      deleteDoc(playerDocRef).catch((error) =>
        console.error("Error removing player from hub:", error),
      );
    }
    if (this.firestoreListenerUnsubscribe) {
      this.firestoreListenerUnsubscribe();
    }
    this.game.events.off("toggleMapView", this.handleMapViewToggle, this);
    this.events.off("shutdown", this.shutdown, this);
  }
}

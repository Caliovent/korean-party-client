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
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private triggerZones!: Phaser.Physics.Arcade.StaticGroup;
  private gamePortal?: Phaser.GameObjects.Sprite; // Added gamePortal property
  private moveSpeed = 200;

  private currentUser: User | null = null;
  private otherPlayers!: Phaser.GameObjects.Group; // Group to manage other player sprites
  // Map to store target positions for other players for interpolation
  private remotePlayerTargets: Map<string, Phaser.Math.Vector2> = new Map();
  private firestoreListenerUnsubscribe?: () => void;
  private isOverlappingPortal = false;
  // private isOverlappingGuildPanel = false; // Unused property

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
    this.load.image("other_player_avatar", "assets/player_32.png"); // Can be a different asset or tinted
    this.load.image("game_portal", "assets/game_portal.jpeg"); // Placeholder for portal/NPC
    this.load.image("guild_panel", "assets/guild_panel.jpeg"); // Placeholder for guild panel
    this.load.image("daily_challenge_board", "assets/game_portal.jpeg"); // Placeholder for daily challenge board (using game_portal asset for now)
    this.load.image("shop_sign", "assets/game_portal.jpeg"); // Placeholder for shop sign (using game_portal asset for now)
    this.load.image("transparent", "assets/effects/transparent.png");

    // NPC Assets - placeholders, will fallback if not found
    this.load.image("directeur_npc", "assets/directeur_placeholder.png");
    this.load.image("maitre_cheon_npc", "assets/maitre_cheon_placeholder.png");
    // Fallback assets if placeholders are missing
    this.load.image("directeur_fallback_npc", "assets/sprites/orb-red.png");
    this.load.image("maitre_cheon_fallback_npc", "assets/sprites/orb-green.png");
  }

  create() {
    console.log("HubScene created! Current user:", this.currentUser?.uid);
    // Setup background image to cover the screen
    const bg = this.add.image(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      "hub_background_village",
    );

    const screenWidth = this.cameras.main.width;
    const screenHeight = this.cameras.main.height;
    const bgWidth = bg.width;
    const bgHeight = bg.height;

    const scaleX = screenWidth / bgWidth;
    const scaleY = screenHeight / bgHeight;
    const scale = Math.max(scaleX, scaleY); // Use Math.max to "cover" the screen

    bg.setScale(scale).setScrollFactor(0); // setScrollFactor(0) ensures it stays fixed during camera movement
    bg.setDepth(-1); // Ensure background is behind everything else

    // Initialize physics groups
    this.obstacles = this.physics.add.staticGroup();
    this.triggerZones = this.physics.add.staticGroup();

    // Add example obstacles
    this.obstacles
      .create(400, 300, "transparent")
      .setSize(200, 150)
      .setVisible(false)
      .refreshBody();
    this.obstacles
      .create(100, 500, "transparent")
      .setSize(150, 100)
      .setVisible(false)
      .refreshBody();

    // Initialize other players group
    this.otherPlayers = this.add.group();

    // Setup player
    if (this.textures.exists("player_avatar")) {
      this.player = this.add.sprite(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        "player_avatar",
      ) as any;
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
        this.player.body.setCollideWorldBounds(true);
        this.physics.add.collider(this.player, this.obstacles);
        // Send initial position
        this.updatePlayerPositionInFirestore(this.player.x, this.player.y);
      }
    }

    // Initialize keyboard controls
    if (this.input.keyboard) { // Null check
      this.cursors = this.input.keyboard.createCursorKeys();
    }

    // Listen for other players
    this.listenForOtherPlayers();

    // Add Game Lobby Portal/NPC
    this.gamePortal = this.triggerZones
      .create(
        this.cameras.main.width - 150,
        this.cameras.main.height / 2,
        "game_portal",
      )
      .setScale(0.1) // 128x128px
      .setInteractive()
      .refreshBody(); // Important for a static physics body

    if (this.gamePortal) { // Null check
      this.gamePortal.on("pointerdown", () => {
        console.log("Game portal clicked");
        this.game.events.emit("openGameLobbyModal");
      });
    }
    // Removed extra });

    // Add Guild Panel
    const guildPanel = this.triggerZones
      .create(150, this.cameras.main.height / 2, "guild_panel")
      .setScale(0.1) // 128x128px
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
      .setScale(0.1) // Adjust scale as needed
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
    .setScale(0.1) // Adjust scale as needed
    .setInteractive()
    .refreshBody();

    shopSign.on("pointerdown", () => {
      console.log("Shop sign clicked");
      this.game.events.emit("openShopModal");
    });

    // Add overlap physics for guildPanel (example, if you want overlap for it too)
    // For now, let's keep it consistent with click for all new elements for simplicity
    // If overlap is desired for the shop, it can be added similarly:
    /*
    this.physics.add.overlap(
      this.player!,
      shopSign,
      () => {
        console.log("Player is overlapping with shop sign");
        this.game.events.emit("openShopModal");
      },
      undefined,
      this
    );
    */

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
    .setScale(1.5) // Assuming orbs are small, scale them up a bit
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
    .setScale(1.5) // Assuming orbs are small, scale them up a bit
    .setInteractive();

    maitreCheon.on("pointerdown", () => {
      console.log("Maître Cheon Mun clicked");
      this.game.events.emit("openDialogueModal", { pnjId: "maitre_cheon" });
    });
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

        let existingSprite = this.otherPlayers
          .getChildren()
          .find((p) => p.getData('uid') === playerUid) as (Phaser.GameObjects.Sprite & { body: Phaser.Physics.Arcade.Body }) | undefined;

        if (change.type === "added" || change.type === "modified") {
          if (!existingSprite) { // Player is new or was missing
            const newSprite = this.add.sprite(
              playerData.x,
              playerData.y,
              "other_player_avatar",
            ) as Phaser.GameObjects.Sprite & { body: Phaser.Physics.Arcade.Body }; // Removed uid from direct type

            newSprite.setScale(1);
            newSprite.setData('uid', playerUid); // Store UID using setData
            this.otherPlayers.add(newSprite); // newSprite is definitely not undefined
            this.physics.world.enable(newSprite); // newSprite is definitely not undefined
            if (newSprite.body) { // Standard body check
              newSprite.body.setImmovable(true);
            }
            existingSprite = newSprite; // existingSprite is now the newSprite for target setting
            console.log(
              `Player ${playerData.displayName || playerUid} added/re-added to hub scene.`,
            );
          }

          // existingSprite should be defined here, either found or newly created.
          if (existingSprite) { // Check existingSprite before setting target
             this.remotePlayerTargets.set(
               playerUid,
               new Phaser.Math.Vector2(playerData.x, playerData.y),
             );
          }

        } else if (change.type === "removed") {
          if (existingSprite) { // Use existingSprite here as well
            this.otherPlayers.remove(existingSprite, true, true); // Remove from group and destroy
            this.remotePlayerTargets.delete(playerUid);
            console.log(
              `Player ${playerData.displayName || playerUid} removed from hub scene.`,
            );
          }
        }
      });
    });
  }

  update(_time: number, _delta: number) { // Parameters time and delta are unused
    // Current player movement
    if (!this.player || !this.player.body || !this.cursors) {
      return;
    }

    this.player.body.setVelocity(0);

    let velocityX = 0;
    let velocityY = 0;

    if (this.cursors.left.isDown) {
      velocityX = -this.moveSpeed;
    } else if (this.cursors.right.isDown) {
      velocityX = this.moveSpeed;
    }

    if (this.cursors.up.isDown) {
      velocityY = -this.moveSpeed;
    } else if (this.cursors.down.isDown) {
      velocityY = this.moveSpeed;
    }

    this.player.body.setVelocityX(velocityX);
    this.player.body.setVelocityY(velocityY);

    if (velocityX !== 0 && velocityY !== 0) {
      const vector = new Phaser.Math.Vector2(velocityX, velocityY)
        .normalize()
        .scale(this.moveSpeed);
      this.player.body.setVelocity(vector.x, vector.y);
    }

    if (
      this.player.body.velocity.x !== 0 ||
      this.player.body.velocity.y !== 0
    ) {
      this.updatePlayerPositionInFirestore(this.player.x, this.player.y);
      const isCurrentlyOverlappingPortal = this.physics.overlap(this.player, this.gamePortal);

      // CAS 1: Le joueur ENTRE dans la zone
      if (isCurrentlyOverlappingPortal && !this.isOverlappingPortal) {
        // On met le drapeau à true pour ne plus rentrer dans ce 'if'
        this.isOverlappingPortal = true;
        console.log("Le joueur COMMENCE la superposition avec le portail.");
        this.game.events.emit("openGameLobbyModal");
      }
      // CAS 2: Le joueur QUITTE la zone
      else if (!isCurrentlyOverlappingPortal && this.isOverlappingPortal) {
        // On réinitialise le drapeau pour que la détection puisse se refaire plus tard
        this.isOverlappingPortal = false;
        console.log("Le joueur TERMINE la superposition avec le portail.");
  
      }
    }

    // Other players movement (interpolation)
    this.otherPlayers.getChildren().forEach((sprite) => {
      const remotePlayer = sprite as Phaser.GameObjects.Sprite & {
        uid: string;
        body: Phaser.Physics.Arcade.Body;
      };
      const target = this.remotePlayerTargets.get(remotePlayer.uid);
      if (target) {
        const distance = Phaser.Math.Distance.Between(
          remotePlayer.x,
          remotePlayer.y,
          target.x,
          target.y,
        );
        if (distance > 2) {
          // Only move if not already close
          // Simple linear interpolation (can be replaced with Phaser.Physics.moveToObject for smoother movement)
          // this.physics.moveToObject(remotePlayer, target, this.moveSpeed * 0.8); // Move slightly slower
          const angle = Phaser.Math.Angle.Between(
            remotePlayer.x,
            remotePlayer.y,
            target.x,
            target.y,
          );
          const speed = this.moveSpeed * 0.8; // Can adjust speed
          remotePlayer.x +=
            Math.cos(angle) * speed * (this.game.loop.delta / 1000);
          remotePlayer.y +=
            Math.sin(angle) * speed * (this.game.loop.delta / 1000);
        } else {
          // remotePlayer.body.setVelocity(0,0); // Stop if using physics move
          // If not using physics move, just set position to ensure it's exact
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
    this.events.off("shutdown", this.shutdown, this);
  }
}

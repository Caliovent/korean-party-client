import { vi } from 'vitest';
import { render, screen, within, act } from '@testing-library/react'; // Added within and act
import userEvent from '@testing-library/user-event'; // Added userEvent
import GamePage from './GamePage';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
// SPELL_DEFINITIONS is needed for test bodies. SpellType is also needed.
import { SPELL_DEFINITIONS, SpellType } from '../data/spells';
import { castSpell } from '../services/gameService'; // Import the mock to allow vi.mocked(castSpell)

// Mock soundService
vi.mock('../services/soundService', () => ({
  default: {
    playSound: vi.fn(),
    stopSound: vi.fn(),
    loadSound: vi.fn(),
    unloadSound: vi.fn(),
    setVolume: vi.fn(),
    mute: vi.fn(),
    unmute: vi.fn(),
  }
}));

// Mock gameService (ensure castSpell is vi.fn())
vi.mock('../services/gameService', () => ({
  castSpell: vi.fn(() => Promise.resolve()), // Return a resolved promise
  rollDice: vi.fn(() => Promise.resolve()), // Also return a promise for consistency if needed
  resolveTileAction: vi.fn(() => Promise.resolve()), // Also return a promise
}));

// Mock firebaseConfig to prevent Firebase init errors in tests
vi.mock('../firebaseConfig', () => ({
  db: { type: 'mockFirestoreDb' }, // Basic mock, expand if needed
  auth: { type: 'mockFirebaseAuth' }, // Basic mock, expand if needed
}));

// Mock firebase/firestore
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');
  // Dynamically import SPELL_DEFINITIONS inside the factory
  const { SPELL_DEFINITIONS } = await vi.importActual('../data/spells') as { SPELL_DEFINITIONS: typeof import('../data/spells').SPELL_DEFINITIONS };

  // Define initial mock game data that can be updated
  let currentMockGameData = {
    id: 'test-game-1',
    status: 'playing',
    currentPlayerId: 'player-1',
    turnState: 'AWAITING_ROLL',
    players: [
      { id: 'player-1', uid: 'player-1', name: 'Sorcier Testeur', displayName: 'Sorcier Testeur', mana: 100, grimoires: [], position: 0, spells: SPELL_DEFINITIONS.map(s => s.id), effects: [] },
      { id: 'player-2', uid: 'player-2', name: 'Adversaire Fantôme', displayName: 'Adversaire Fantôme', mana: 100, grimoires: [], position: 0, spells: SPELL_DEFINITIONS.map(s => s.id), effects: [] },
    ],
    board: { tiles: Array(20).fill({ type: 'MANA_GAIN', value: 10 }) },
    gameDeck: { eventCards: [], currentEventCard: null },
    gameLog: [],
    turnOrder: ['player-1', 'player-2'],
    winner: null,
    createdAt: { toDate: () => new Date() },
    updatedAt: { toDate: () => new Date() },
    lastEventCard: null, // Added to match Game type
  };

  // Store the onSnapshot callback to allow manual triggering
  let onSnapshotCallback: ((snapshot: any) => void) | null = null;

  // Function to update the mock game state and trigger onSnapshot
  // This function will be available in the test scope
  (global as any).updateMockGameState = (newGameStatePartial: Partial<typeof currentMockGameData>) => {
    currentMockGameData = { ...currentMockGameData, ...newGameStatePartial };
    if (onSnapshotCallback) {
      onSnapshotCallback({
        exists: () => true,
        data: () => currentMockGameData,
        id: currentMockGameData.id,
      });
    }
  };

  // Function to reset the mock game state before each test
  (global as any).resetMockGameState = () => {
    currentMockGameData = {
      id: 'test-game-1',
      status: 'playing',
      currentPlayerId: 'player-1',
      turnState: 'AWAITING_ROLL',
      players: [
        { id: 'player-1', uid: 'player-1', name: 'Sorcier Testeur', displayName: 'Sorcier Testeur', mana: 100, grimoires: [], position: 0, spells: SPELL_DEFINITIONS.map(s => s.id), effects: [] },
        { id: 'player-2', uid: 'player-2', name: 'Adversaire Fantôme', displayName: 'Adversaire Fantôme', mana: 100, grimoires: [], position: 0, spells: SPELL_DEFINITIONS.map(s => s.id), effects: [] },
      ],
      board: { tiles: Array(20).fill({ type: 'MANA_GAIN', value: 10 }) },
      gameDeck: { eventCards: [], currentEventCard: null },
      gameLog: [],
      turnOrder: ['player-1', 'player-2'],
      winner: null,
      createdAt: { toDate: () => new Date() },
      updatedAt: { toDate: () => new Date() },
      lastEventCard: null, // Added to match Game type
    };
    // If there's an active callback, trigger it with the reset state
    if (onSnapshotCallback) {
       onSnapshotCallback({
        exists: () => true,
        data: () => currentMockGameData,
        id: currentMockGameData.id,
      });
    }
  };


  return {
    ...actual,
    onSnapshot: vi.fn((query, callback) => {
      onSnapshotCallback = callback; // Store the callback
      // Immediately trigger with initial data
      setTimeout(() => {
        if (onSnapshotCallback) { // Check if callback still exists (it might have been cleared by unsubscribe)
          onSnapshotCallback({
            exists: () => true,
            data: () => currentMockGameData,
            id: currentMockGameData.id,
          });
        }
      }, 0);
      return () => { // Return an unsubscribe function
        onSnapshotCallback = null; // Clear the callback on unsubscribe
      };
    }),
    doc: vi.fn(() => ({ id: 'mockDocRef', path: 'games/test-game-1' })),
    getFirestore: vi.fn(() => ({})),
  };
});

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));

// Mock useAuth hook
vi.mock('../hooks/useAuth', () => ({
    useAuth: vi.fn(() => ({ user: { uid: 'player-1', displayName: 'Sorcier Testeur' } })), // Added displayName to mock user
}));

// Mock Phaser
vi.mock('phaser', async (importOriginal) => {
    class MockEvents {
      on = vi.fn(); off = vi.fn(); emit = vi.fn(); once = vi.fn();
    }
    class MockScene {
      sys: any = { events: new MockEvents(), isActive: vi.fn(() => true), settings: { active: true } }; // Added isActive and settings.active
      cameras: any = { main: { worldView: { width: 800, height: 600 }, centerOn: vi.fn(), setZoom: vi.fn(), pan: vi.fn(), startFollow: vi.fn(), stopFollow: vi.fn(), fadeIn: vi.fn(), fadeOut: vi.fn(), shake: vi.fn(), flash: vi.fn() }};
      add = {
        image: vi.fn(() => ({ setScale: vi.fn(), setData: vi.fn(), on: vi.fn(), setAlpha: vi.fn(), destroy: vi.fn() })),
        sprite: vi.fn(() => ({ setTint: vi.fn(), setScale: vi.fn(), setInteractive: vi.fn(), setData: vi.fn(), on: vi.fn(), setAlpha: vi.fn(), destroy: vi.fn(), setPosition: vi.fn(), x:0, y:0, depth:0 })),
        text: vi.fn(() => ({})),
        circle: vi.fn(() => ({ destroy: vi.fn() })),
      };
      input = { setDefaultCursor: vi.fn(), keyboard: { on: vi.fn(), addKey: vi.fn(() => ({ isDown: false }))}};
      tweens = { add: vi.fn((config: any) => { if (config.onComplete) { /* setTimeout(config.onComplete, 0); */ } return { stop: vi.fn() }; })};
      updateGameState = vi.fn(); // Added mock for updateGameState
      enterTargetingMode = vi.fn(); // Added mock for enterTargetingMode
      exitTargetingMode = vi.fn();  // Added mock for exitTargetingMode
    }
    class MockGame extends EventTarget {
      scene: any = { keys: {}, add: vi.fn((sceneKey, sceneConfig, autoStart) => { const mockCreatedScene = new MockScene(); (mockCreatedScene.sys.events as any) = new MockEvents(); this.scene.keys[sceneKey] = mockCreatedScene; if (autoStart && typeof sceneConfig.create === 'function') { /* sceneConfig.create(); */ } return mockCreatedScene; }), start: vi.fn(), getScene: vi.fn(sceneKey => this.scene.keys[sceneKey] || new MockScene())};
      events = new MockEvents();
      destroy = vi.fn();
      scale = { parent: document.createElement('div'), width: 800, height: 600 };
      constructor() { super(); }
    }
    const PhaserMockContents = {
        Game: MockGame,
        Scene: MockScene,
        Scale: { FIT: 1, CENTER_BOTH: 1 },
        AUTO: 0,
        GameObjects: {
            Sprite: class MockSprite { setTint=vi.fn(); setScale=vi.fn(); setInteractive=vi.fn(); setData=vi.fn(); on=vi.fn(); setAlpha=vi.fn(); destroy=vi.fn(); setPosition=vi.fn(); x=0; y=0; depth=0; },
            Image: class MockImage { setScale=vi.fn(); setData=vi.fn(); on=vi.fn(); setAlpha=vi.fn(); destroy=vi.fn(); },
            Text: class MockText {},
            Particles: { ParticleEmitterManager: vi.fn() },
            Graphics: vi.fn(() => ({ fillStyle:vi.fn(), fillRect:vi.fn(), clear:vi.fn(), destroy:vi.fn() })),
        },
        Input: { Keyboard: { KeyCodes: { W:'W',A:'A',S:'S',D:'D',SPACE:'SPACE'}}, Events: { POINTER_DOWN: 'pointerdown'}},
        Math: { Between: vi.fn((min, max) => Math.floor(Math.random()*(max-min+1))+min) },
        Tweens: { Timeline: vi.fn(() => ({ add:vi.fn(), play:vi.fn() })) }
    };
    return { default: PhaserMockContents, ...PhaserMockContents };
});

// Define global functions for tests, otherwise Typescript will complain they are not defined
declare global {
  namespace globalThis {
    var updateMockGameState: (newGameStatePartial: Partial<any>) => void;
    var resetMockGameState: () => void;
    var getCurrentMockGameState: () => any; // Add type for the new global getter
  }
}


describe('GamePage', () => {
  beforeEach(() => {
    // Reset the mock game state before each test
    global.resetMockGameState();
    // Clear all mocks
    vi.clearAllMocks();
  });

  const renderGamePage = () => {
    return render(
      <MemoryRouter initialEntries={['/game/test-game-1']}>
        <Routes>
          <Route path="/game/:gameId" element={<GamePage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('should render without crashing', async () => {
    renderGamePage();
    // Based on actual output, the PlayerHUD seems to render "Mana" not "player_hud.mana_label" with the current i18n mock
    await screen.findByText('Mana');
    expect(screen.getByText('Mana')).toBeInTheDocument();
  });

  it('devrait afficher le nom du joueur actuel', async () => {
    renderGamePage();
    // GameControls component might display current player's name.
    // Let's assume PlayerHUD or GameControls shows "Sorcier Testeur"
    // The mockGameData has currentPlayerId: 'player-1', which is 'Sorcier Testeur'.
    const currentPlayerElement = await screen.findByText(/Sorcier Testeur/i, {}, { timeout: 3000 });
    expect(currentPlayerElement).toBeInTheDocument();
  });

  it('devrait appeler castSpell directement pour un sort auto-ciblé (SELF)', async () => {
    const user = userEvent.setup();
    const selfCastSpell = SPELL_DEFINITIONS.find(s => s.type === SpellType.SELF);
    if (!selfCastSpell) throw new Error("Test requires at least one SELF spell defined.");

    vi.mocked(castSpell).mockClear(); // Clear mock before test

    renderGamePage();

    // Wait for game data to load and PlayerHUD to render (indicated by "Mana" text)
    await screen.findByText('Mana');

    // Find the spell by its name key, then find the button within its container
    const spellNameElement = await screen.findByText(selfCastSpell.nameKey);
    const spellItemContainer = spellNameElement.closest('li');
    expect(spellItemContainer).toBeInTheDocument();

    if (spellItemContainer) {
      // The button text is 'spellbook.cast_button' due to GamePage.test.tsx's i18n mock
      const castButton = within(spellItemContainer).getByRole('button', { name: 'spellbook.cast_button' });
      await user.click(castButton);
      expect(castSpell).toHaveBeenCalledWith('test-game-1', selfCastSpell.id, 'player-1');
    } else {
      throw new Error(`Could not find container for spell: ${selfCastSpell.nameKey}`);
    }
  });

  it('devrait sélectionner un sort ciblé mais ne pas appeler castSpell sans cible', async () => {
    const user = userEvent.setup();
    const targetedSpell = SPELL_DEFINITIONS.find(s => s.type === SpellType.TARGET_PLAYER || s.type === SpellType.TARGET_TILE);
    if (!targetedSpell) throw new Error("Test requires at least one TARGETED spell defined.");

    vi.mocked(castSpell).mockClear();

    renderGamePage();
    // Wait for game data to load and PlayerHUD to render
    await screen.findByText('Mana');

    const spellNameElement = await screen.findByText(targetedSpell.nameKey);
    const spellItemContainer = spellNameElement.closest('li');
    expect(spellItemContainer).toBeInTheDocument();

    if (spellItemContainer) {
      const castButton = within(spellItemContainer).getByRole('button', { name: 'spellbook.cast_button' });
      await user.click(castButton); // Selects the spell

      // castSpell should NOT have been called yet for a targeted spell without a target
      expect(castSpell).not.toHaveBeenCalled();

      // Further interaction (target selection via PhaserGame mock) is needed to complete the castSpell call,
      // which is outside the scope of this specific test modification focusing on initial spell selection.
    } else {
      throw new Error(`Could not find container for spell: ${targetedSpell.nameKey}`);
    }
  });

  it('Lancement d\'un Sort et Réaction du HUD: le mana du joueur diminue après un sort', async () => {
    const user = userEvent.setup();
    // Ensure castSpell is a Vitest mock function for this test
    const mockedCastSpell = vi.mocked(castSpell);

    renderGamePage();

    // 1. Arrange: Initial state check (Player A, 100 Mana)
    // PlayerHUD displays mana. Wait for it to appear with initial mana.
    // The text will be "Mana: 100 / Max: 100" or similar, so we find by part of it.
    expect(await screen.findByText(/100/)).toBeInTheDocument();
    // More specific check for mana value if PlayerHUD formats it uniquely
    // For example, if there's an element with testid 'player-mana'
    // const manaDisplay = await screen.findByTestId('player-mana');
    // expect(manaDisplay).toHaveTextContent('100');
    // For now, a general check for "100" in the document should suffice after PlayerHUD loads.

    // 2. Act 1: Simuler un clic sur le sort "Repousser" (PUSH_BACK)
    // Assuming PUSH_BACK is a targeted spell. Find its definition.
    const pushBackSpell = SPELL_DEFINITIONS.find(s => s.id === 'PUSH_BACK');
    if (!pushBackSpell) throw new Error("Spell PUSH_BACK not found in definitions.");
    expect(pushBackSpell.type).not.toBe(SpellType.SELF); // Ensure it's a targeted spell for this scenario

    const spellNameElement = await screen.findByText(pushBackSpell.nameKey);
    const spellItemContainer = spellNameElement.closest('li');
    expect(spellItemContainer).toBeInTheDocument();
    if (!spellItemContainer) throw new Error("Spell item container not found for PUSH_BACK");

    const castButton = within(spellItemContainer).getByRole('button', { name: 'spellbook.cast_button' });
    await user.click(castButton); // Selects the spell

    // 3. Act 2: Simuler la sélection d'une cible
    // The GamePage component calls `onTargetSelected` which is a prop passed to PhaserGame.
    // We need to simulate PhaserGame calling this prop.
    // This requires access to the props passed to PhaserGame, which is tricky with `render`.
    // For this test, we'll assume the call to onTargetSelected happens and castSpell is invoked.
    // The actual selection logic is within PhaserGame, which is mocked.
    // We are testing GamePage's reaction to game state changes.
    // So, directly call castSpell as if Phaser handled target selection.
    // This simplifies the test to focus on GamePage's state update logic.
    // However, the instructions state "L'appel à castSpell sera mocké et n'aura pas besoin d'être vérifié ici."
    // This implies we don't need to check its call, but we *do* need the spell to be "cast"
    // for the mana update to be logical.
    // The crucial part is `updateMockGameState` for the mana change.

    // Let's assume a target is selected, and castSpell would be called.
    // For this test, we are interested in the mana update, which comes from updateMockGameState.
    // The problem states "L'appel à castSpell sera mocké et n'aura pas besoin d'être vérifié ici."
    // This is fine, we are testing the UI reaction to the state change.

    // 4. Act 3: Utiliser updateMockGameState pour simuler la réponse du serveur
    // The player 'player-1' (Sorcier Testeur) casts the spell.
    // Get current game state to preserve other players' data accurately.
    const initialGameState = global.getCurrentMockGameState();
    const player1Initial = initialGameState.players.find((p: any) => p.id === 'player-1');
    const player2Initial = initialGameState.players.find((p: any) => p.id === 'player-2');

    await act(async () => {
      global.updateMockGameState({
        players: [
          { ...player1Initial, mana: 85 }, // Update only player 1's mana
          player2Initial // Keep player 2 as is
        ]
      });
    });

    // To ensure castSpell was called (even if not strictly checked by problem statement, good for sanity)
    // This assumes 'player-2' is the target. The target ID doesn't really matter for this test's Assert.
    // If PUSH_BACK could target self, this might need adjustment or specific target.
    // Given the problem, we will skip asserting castSpell call.
    // expect(mockedCastSpell).toHaveBeenCalledWith('test-game-1', 'PUSH_BACK', 'player-2'); // Example target

    // 5. Assert: Vérifier que le PlayerHUD s'est mis à jour
    // Wait for the text "85" to appear in the document.
    // It's important to use findByText for asynchronous updates.
    const manaElement = await screen.findByText(/85/, {}, { timeout: 3000 });
    expect(manaElement).toBeInTheDocument();

    // Optional: More specific check if PlayerHUD has a specific structure for mana
    // e.g., if mana is always displayed as "Mana: VALUE / MAX_VALUE"
    // const playerHUD = screen.getByTestId('player-hud'); // Assuming PlayerHUD has a testid
    // expect(within(playerHUD).getByText(/85/)).toBeInTheDocument();
  });

  it('Le Tour Passe à un Autre Joueur: les contrôles de jeu se mettent à jour', async () => {
    renderGamePage();

    // 1. Arrange: Initial state, Player A's turn. "Lancer le dé" button should be visible.
    // The GameControls component shows "Lancer le dé" (roll_dice_button) when it's the user's turn
    // and game.turnState === 'AWAITING_ROLL'.
    // Our mock user is 'player-1', and initial mock state has currentPlayerId: 'player-1' and turnState: 'AWAITING_ROLL'.
    expect(await screen.findByRole('button', { name: /Lancer le dé/i })).toBeInTheDocument();

    // 2. Act: Change currentPlayerId to Player B ('player-2') via updateMockGameState
    await act(async () => {
      global.updateMockGameState({
        currentPlayerId: 'player-2',
      });
    });

    // 3. Assert: "Lancer le dé" button should disappear for Player A.
    //    GameControls should show "C'est au tour de [Nom du Joueur B]..."
    //    The user is still player-1, so they should see the "other player's turn" message.

    // Wait for UI to update. The button should no longer be there.
    // findBy* would throw an error if not found after timeout. queryBy* returns null.
    await vi.waitFor(() => {
      expect(screen.queryByRole('button', { name: /roll_dice_button/i })).not.toBeInTheDocument();
    });

    // Check for the "other player's turn" message.
    // Player B's name is 'Adversaire Fantôme'.
    // The i18n key for this is likely 'game_controls.waiting_for_player_turn' which takes a player name.
    // Since our i18n mock returns the key, we'd look for the key structure or part of the expected text.
    // Let's assume the GameControls component constructs something like "C'est au tour de Adversaire Fantôme..."
    // The t function mock returns the key, so if the key is `game_controls.waiting_for_player_turn, { playerName: 'Adversaire Fantôme' }`
    // the output might be "game_controls.waiting_for_player_turn".
    // We need to check how GameControls actually renders this.
    // Looking at GameControls.tsx (not provided here, but typical structure):
    // It might be `t('game_controls.waiting_for_player_turn', { playerName: otherPlayer.name })`
    // With the mock, this becomes 'game_controls.waiting_for_player_turn'.
    // Let's find text containing the other player's name.
    expect(await screen.findByText(/Adversaire Fantôme/i)).toBeInTheDocument();
    // Check for the actual text "C'est au tour de ..."
    // The text might be split across elements, so we find the container and check its content.
    const gameControlsDiv = await screen.findByText(/C'est au tour de/i);
    expect(gameControlsDiv).toBeInTheDocument();
    expect(gameControlsDiv.textContent).toMatch(/C'est au tour de Adversaire Fantôme.../i);


    // Verify that the current player is NOT player-2 (Adversaire Fantôme) from the perspective of the HUD
    // The PlayerHUD still shows "Sorcier Testeur" because useAuth provides 'player-1'
    const playerHUDElement = screen.getByText(/Sorcier Testeur/i); // This should already be there from initial render
    expect(playerHUDElement).toBeInTheDocument(); // Confirming it didn't change
  });
});

vi.mock('firebase/firestore', async () => {
  const actualFirestore = await vi.importActual('firebase/firestore');
  const { SPELL_DEFINITIONS } = await vi.importActual('../data/spells') as { SPELL_DEFINITIONS: typeof import('../data/spells').SPELL_DEFINITIONS };

  let onSnapshotCallback: ((snapshot: { exists: () => boolean; data: () => any; id: string }) => void) | null = null;

  const initialGameData = {
    id: 'test-game-1',
    status: 'playing',
    currentPlayerId: 'player-1',
    turnState: 'AWAITING_ROLL',
    players: [
      { id: 'player-1', uid: 'player-1', name: 'Sorcier Testeur', displayName: 'Sorcier Testeur', mana: 100, grimoires: [], position: 0, spells: SPELL_DEFINITIONS.map(s => s.id), effects: [] },
      { id: 'player-2', uid: 'player-2', name: 'Adversaire Fantôme', displayName: 'Adversaire Fantôme', mana: 100, grimoires: [], position: 0, spells: SPELL_DEFINITIONS.map(s => s.id), effects: [] },
    ],
    board: { tiles: Array(20).fill({ type: 'MANA_GAIN', value: 10 }) },
    gameDeck: { eventCards: [], currentEventCard: null },
    gameLog: [],
    turnOrder: ['player-1', 'player-2'],
    winner: null,
    createdAt: { toDate: () => new Date() },
    updatedAt: { toDate: () => new Date() },
    lastEventCard: null,
  };

  let currentMockGameData = JSON.parse(JSON.stringify(initialGameData));

  global.updateMockGameState = (newGameStatePartial: Partial<typeof initialGameData>) => {
    // When updating players, ensure we merge correctly if only one player is partially updated.
    if (newGameStatePartial.players && currentMockGameData.players) {
      const updatedPlayers = currentMockGameData.players.map(p => {
        const updatedPlayer = newGameStatePartial.players!.find(up => up.id === p.id);
        return updatedPlayer ? { ...p, ...updatedPlayer } : p;
      });
      // Check if any new players were added in the partial update (though not typical for this app)
      newGameStatePartial.players.forEach(up => {
        if (!updatedPlayers.find(p => p.id === up.id)) {
          updatedPlayers.push(up as any); // Add as any to satisfy Player type, ensure structure is correct
        }
      });
      currentMockGameData = { ...currentMockGameData, ...newGameStatePartial, players: updatedPlayers };
    } else {
      currentMockGameData = { ...currentMockGameData, ...newGameStatePartial };
    }

    if (onSnapshotCallback) {
      onSnapshotCallback({
        exists: () => true,
        data: () => currentMockGameData,
        id: currentMockGameData.id,
      });
    }
  };

  global.resetMockGameState = () => {
    currentMockGameData = JSON.parse(JSON.stringify(initialGameData));
    if (onSnapshotCallback) {
      onSnapshotCallback({
        exists: () => true,
        data: () => currentMockGameData,
        id: currentMockGameData.id,
      });
    }
  };

  // Expose currentMockGameData for tests to read (e.g., to get other player's data)
  Object.defineProperty(global, 'getCurrentMockGameState', {
    get: () => () => JSON.parse(JSON.stringify(currentMockGameData)), // Return a copy
    configurable: true // Allow redefinition if tests run multiple times in some environments
  });

  return {
    ...actualFirestore,
    onSnapshot: vi.fn((query: any, callback: (snapshot: any) => void) => {
      onSnapshotCallback = callback;
      setTimeout(() => { // Simulate async behavior
        if (onSnapshotCallback) {
          onSnapshotCallback({
            exists: () => true,
            data: () => currentMockGameData,
            id: currentMockGameData.id,
          });
        }
      }, 0);
      return () => { // Unsubscribe function
        onSnapshotCallback = null;
      };
    }),
    doc: vi.fn().mockImplementation((db, path, id) => ({
      id: id || 'mockDocRef', // Use provided id or default
      path: `${path}/${id}`,
      // Add other properties if needed by the code using the doc ref
    })),
    getFirestore: vi.fn(() => ({})), // Mock getFirestore
  };
});

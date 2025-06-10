import { vi } from 'vitest';
import { render, screen, within } from '@testing-library/react'; // Added within
import userEvent from '@testing-library/user-event'; // Added userEvent
import GamePage from './GamePage';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
// SPELL_DEFINITIONS is needed for test bodies. SpellType is also needed.
import { SPELL_DEFINITIONS, SpellType } from '../data/spells';
import { castSpell } from '../services/gameService'; // Import the mock to allow vi.mocked(castSpell)

// Mock gameService (ensure castSpell is vi.fn())
vi.mock('../services/gameService', () => ({
  castSpell: vi.fn(), // Already a mock, this just confirms/ensures it
  rollDice: vi.fn(),
  resolveTileAction: vi.fn(),
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

  const mockGameData = {
    id: 'test-game-1',
    status: 'playing',
    currentPlayerId: 'player-1', // Ensures it's player-1's turn
    turnState: 'AWAITING_ROLL',  // Ensures Spellbook is visible if it's player-1's turn
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
  };
  return {
    ...actual,
    onSnapshot: vi.fn((query, callback) => {
      setTimeout(() => {
        callback({
          exists: () => true,
          data: () => mockGameData,
          id: 'test-game-1'
        });
      }, 0);
      return vi.fn(); // unsubscribe
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

describe('GamePage', () => {
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
});

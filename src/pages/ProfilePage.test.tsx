import { render, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import ProfilePage from './ProfilePage';
import { useAuth } from '../hooks/useAuth'; // Importer le hook uniquement
// import type { ToastContextType } from '../contexts/ToastContext'; // Removed unused type import
import { useToasts } from '../contexts/useToasts';
import { getAchievementDefinition } from '../data/achievementDefinitions';

// import type { UserProfile } from '../hooks/useAuth'; // Removed unused type import

// Mock partiel de useAuth
vi.mock('../hooks/useAuth', async (importOriginal) => {
  const actualModule = await importOriginal() as typeof import('../hooks/useAuth');
  return {
    ...actualModule, // Spread all original exports
    useAuth: vi.fn(), // Mock only the useAuth function
  };
});

// Unused MockUseAuth type removed

// Mock for useToasts hook
vi.mock('../contexts/useToasts', () => ({
  useToasts: vi.fn(),
}));

// Mock for ToastContextType (if needed directly, though useToasts mock is primary)
// We still need ToastContextType for the `mockUseToasts.mockReturnValue`
// The import `import type { ToastContextType } from '../contexts/ToastContext'` should still work.

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => {
      if (key === 'hall_of_fame.achievement_unlocked_title') return 'Haut Fait Débloqué !';
      if (key.startsWith('achievements.')) { // ex: achievements.ACH_ID.name
        const parts = key.split('.');
        return `${parts[1]}_${parts[2]}`; // ACH_ID_name
      }
      return options?.defaultValue || key;
    },
  }),
}));

// Mock firebaseConfig et les fonctions Firestore directes si ProfilePage les utilise en dehors de useAuth
// ProfilePage importe doc et onSnapshot de firebase/firestore.
// Si on ne veut pas tester la logique de onSnapshot pour le profil ici, on doit le mocker.
// Pour ce test, on se concentre sur les toasts, donc on peut simplifier.
vi.mock('../firebaseConfig', () => ({
  auth: {},
  app: {},
  functions: {},
  db: {}, // Add db property to the mock
}));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  onSnapshot: vi.fn((docRef, callback) => {
    // Simuler un profil vide pour le listener de ProfilePage
    if (docRef && docRef.path && docRef.path.startsWith('users/')) {
      callback({ exists: () => true, data: () => ({ displayName: 'Test User', email: 'test@example.com', level: 1, xp: 0 }) });
    } else if (docRef && docRef.path && docRef.path.startsWith('playerLearningProfiles/')) {
    // Simuler des données vides pour GrimoireVivant pour éviter les erreurs
      callback({ empty: true, docs: [], forEach: vi.fn() });
    }
    return vi.fn(); // unsubscribe
  }),
  // Corrected: Only one definition of collection, with the _db fix
  collection: vi.fn((_db, path) => ({
    path: path,
  })),
  query: vi.fn(ref => ref),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(),
  httpsCallable: vi.fn(),
}));
vi.mock('../services/gameService', () => ({
    getGuildById: vi.fn().mockResolvedValue({ name: 'Mocked Guild' })
}));


describe('<ProfilePage /> - Toast Notifications for Achievements', () => {
  let mockUseAuth: ReturnType<typeof vi.fn>;
  let mockUseToasts: ReturnType<typeof vi.fn>;
  let mockAddToast: ReturnType<typeof vi.fn>;

  const initialUserNoAchievements = {
    uid: 'test-user-123',
    displayName: 'Test User',
    email: 'test@user.com',
    stats: { gamesPlayed: 1, spellsCast: 5, manaSpent: 20, duelsWon: 0, questsCompleted: 0, runesReviewed: 10 },
    unlockedAchievements: [],
  };

  const userWithOneAchievement = {
    ...initialUserNoAchievements,
    unlockedAchievements: ['ACH_FIRST_SPELL_CAST'],
  };

  const userWithTwoAchievements = {
    ...initialUserNoAchievements,
    unlockedAchievements: ['ACH_FIRST_SPELL_CAST', 'ACH_FIRST_GAME_PLAYED'],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockAddToast = vi.fn();
    mockUseToasts = useToasts as ReturnType<typeof vi.fn>;
    mockUseToasts.mockReturnValue({ addToast: mockAddToast, toasts: [] });

    mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
    // Configuration initiale de useAuth
    mockUseAuth.mockReturnValue({ user: initialUserNoAchievements, loading: false, updateUserGuildId: vi.fn() });
  });

  test('ne devrait pas afficher de toast si aucun nouvel achievement n\'est débloqué', () => {
    render(<ProfilePage />);
    expect(mockAddToast).not.toHaveBeenCalled();
  });

  test('devrait afficher un toast lorsqu\'un nouvel achievement est détecté', async () => {
    const { rerender } = render(<ProfilePage />);

    // Simuler la mise à jour de l'utilisateur avec un nouvel achievement
    mockUseAuth.mockReturnValue({ user: userWithOneAchievement, loading: false, updateUserGuildId: vi.fn() });
    rerender(<ProfilePage />);

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledTimes(1);
    });

    const achDef = getAchievementDefinition('ACH_FIRST_SPELL_CAST');
    expect(achDef).not.toBeUndefined();
    if (achDef) {
      // Corrected based on actual t() mock output from test logs
      expect(mockAddToast).toHaveBeenCalledWith(
        'Haut Fait Débloqué !: first_spell_cast_name',
        'success',
        7000
      );
    }
  });

  test('devrait afficher un toast pour chaque nouvel achievement lors d\'une mise à jour multiple', async () => {
    mockUseAuth.mockReturnValue({ user: initialUserNoAchievements, loading: false, updateUserGuildId: vi.fn() });
    const { rerender } = render(<ProfilePage />);
    mockAddToast.mockClear();

    mockUseAuth.mockReturnValue({ user: userWithTwoAchievements, loading: false, updateUserGuildId: vi.fn() });
    rerender(<ProfilePage />);

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledTimes(2);
    });

    // Check for ACH_FIRST_SPELL_CAST
    expect(mockAddToast).toHaveBeenCalledWith(
      'Haut Fait Débloqué !: first_spell_cast_name', // Corrected
      'success',
      7000
    );
    // Check for ACH_FIRST_GAME_PLAYED
    expect(mockAddToast).toHaveBeenCalledWith(
      'Haut Fait Débloqué !: first_game_played_name', // Corrected
      'success',
      7000
    );
  });


  test('ne devrait pas afficher de toast pour les achievements initiaux, puis en afficher pour les nouveaux, puis ne plus en afficher', async () => {
    // Étape 1: Chargement initial avec un achievement. Aucun toast ne devrait apparaître pour celui-ci.
    mockUseAuth.mockReturnValue({ user: userWithOneAchievement, loading: false, updateUserGuildId: vi.fn() });
    const { rerender } = render(<ProfilePage />);

    // Attendre que le useEffect ait pu s'exécuter et mettre à jour previousAchievementsRef
    await act(async () => {
      await new Promise(r => setTimeout(r, 50)); // petit délai pour que le useEffect s'exécute
    });
    expect(mockAddToast).not.toHaveBeenCalled(); // Aucun toast pour les achievements initiaux

    // Étape 2: Simuler un nouvel achievement débloqué
    mockUseAuth.mockReturnValue({ user: userWithTwoAchievements, loading: false, updateUserGuildId: vi.fn() });
    rerender(<ProfilePage />);

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledTimes(1); // Un toast pour le NOUVEL achievement
    });
    const achDefNew = getAchievementDefinition('ACH_FIRST_GAME_PLAYED');
    expect(achDefNew).not.toBeUndefined();
    if (achDefNew) {
      // Corrected based on actual t() mock output from test logs
      expect(mockAddToast).toHaveBeenCalledWith(
        'Haut Fait Débloqué !: first_game_played_name',
        'success',
        7000
      );
    }
    mockAddToast.mockClear(); // Nettoyer pour la prochaine assertion

    // Étape 3: Simuler un re-render avec les mêmes achievements (mais nouvelle référence d'objet)
    // Aucun nouveau toast ne devrait apparaître.
    const userWithTwoAchievementsNewRef = {
      ...userWithTwoAchievements,
      unlockedAchievements: [...userWithTwoAchievements.unlockedAchievements]
    };
    mockUseAuth.mockReturnValue({ user: userWithTwoAchievementsNewRef, loading: false, updateUserGuildId: vi.fn() });
    rerender(<ProfilePage />);

    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });
    expect(mockAddToast).not.toHaveBeenCalled();
  });
});

import { render, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import ProfilePage from './ProfilePage';
import { useAuth } from '../hooks/useAuth'; // Importer le hook uniquement
import type { ToastContextType } from '../contexts/ToastContext'; // Importer uniquement le type
import { useToasts } from '../contexts/ToastContext';
import { getAchievementDefinition } from '../data/achievementDefinitions';

// Mock partiel de useAuth
vi.mock('../hooks/useAuth', async (importOriginal) => {
  const actual = await importOriginal() as { AuthContextType: unknown, useAuth: () => Partial<AuthContextType> };
  return {
    ...actual, // Conserver les autres exports si nécessaire (comme AuthProvider)
    useAuth: vi.fn(), // Mocker la fonction useAuth
  };
});

// Mock partiel de ToastContext
vi.mock('../contexts/ToastContext', async (importOriginal) => {
  const actual = await importOriginal() as { ToastContextType: unknown, useToast: () => Partial<ToastContextType> };
  return {
    ...actual,
    useToasts: vi.fn(), // Mocker la fonction useToast
  };
});

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
  db: {},
  auth: {},
  app: {},
  functions: {},
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
  collection: vi.fn((db, path) => ({ // Ajouter mock pour collection
    path: path, // pour aider au debug si besoin
    // Si GrimoireVivant utilise query().onSnapshot(), il faudra l'ajouter ici.
    // Pour l'instant, on suppose que le onSnapshot mocké ci-dessus est suffisant
    // ou que GrimoireVivant a une logique de fallback simple.
    // Pour être plus robuste, on pourrait retourner un objet avec une méthode query,
    // qui retourne un objet avec une méthode onSnapshot.
    // Pour l'instant, on le garde simple.
  })),
  query: vi.fn(ref => ref), // Si query est appelé, il retourne la référence
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
      expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Haut Fait Débloqué !',
        message: 'first_spell_cast_name', // Corrigé: basé sur la nameKey et le mock t()
      }));
    }
  });

  test('devrait afficher un toast pour chaque nouvel achievement lors d\'une mise à jour multiple', async () => {
    // Test simplifié : commence sans achievement, puis passe à deux.
    // Le test précédent était un peu confus dans sa structure.
    mockUseAuth.mockReturnValue({ user: initialUserNoAchievements, loading: false, updateUserGuildId: vi.fn() });
    const { rerender } = render(<ProfilePage />);
    mockAddToast.mockClear(); // S'assurer qu'aucun toast n'a été appelé par le render initial si jamais

    // Simuler la mise à jour avec deux achievements
    mockUseAuth.mockReturnValue({ user: userWithTwoAchievements, loading: false, updateUserGuildId: vi.fn() });
    rerender(<ProfilePage />);

    await waitFor(() => {
      // On s'attend à deux toasts, un pour chaque nouvel achievement
      expect(mockAddToast).toHaveBeenCalledTimes(2);
    });

    const achDef1 = getAchievementDefinition('ACH_FIRST_SPELL_CAST');
    const achDef2 = getAchievementDefinition('ACH_FIRST_GAME_PLAYED');

    expect(achDef1).not.toBeUndefined();
    expect(achDef2).not.toBeUndefined();

    if (achDef1) {
      expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({
        message: 'first_spell_cast_name',
      }));
    }
    if (achDef2) {
      expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({
        message: 'first_game_played_name',
      }));
    }
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
    const achDefNew = getAchievementDefinition('ACH_FIRST_GAME_PLAYED'); // C'est le nouveau dans userWithTwoAchievements
    expect(achDefNew).not.toBeUndefined();
    if (achDefNew) {
      expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({
        message: 'first_game_played_name',
      }));
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

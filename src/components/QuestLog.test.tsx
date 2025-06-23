import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import QuestLog from './QuestLog';
import { Quest } from '../types/game';

import { vi } from 'vitest';

// Mock de Firestore
vi.mock('../firebaseConfig', () => ({
  db: vi.fn(),
  auth: vi.fn(),
}));

// Importer les fonctions réelles pour que Vitest puisse les suivre et les mocker
// Nous n'avons plus besoin de les importer directement ici si vi.mock les remplace globalement.

import * as questService from '../services/questService';

// Mock le service de quêtes
vi.mock('../services/questService', () => ({
  subscribeToActiveQuests: vi.fn(),
  subscribeToCompletedQuests: vi.fn(),
}));

// Pas besoin de mocker firebase/firestore directement de manière complexe maintenant


describe('<QuestLog />', () => {
  const mockActiveQuests: Quest[] = [
    {
      id: 'activeQuest1',
      titleKey: 'quest_food_mastery_title', // "Maîtriser 5 sorts de nourriture"
      descriptionKey: 'quest_food_mastery_desc',
      progress: 2,
      target: 5,
      isCompleted: false,
      type: 'daily',
    },
    {
      id: 'activeQuest2',
      titleKey: 'quest_keyboard_dojo_title', // "Visiter le Dojo du Clavier"
      descriptionKey: 'quest_keyboard_dojo_desc',
      progress: 0,
      target: 1,
      isCompleted: false,
      type: 'event',
    },
  ];

  const mockCompletedQuests: Quest[] = [
    {
      id: 'completedQuest1',
      titleKey: 'quest_tutorial_completed_title', // "Terminer le tutoriel"
      descriptionKey: 'quest_tutorial_completed_desc',
      progress: 1,
      target: 1,
      isCompleted: true,
      type: 'main',
    },
  ];

  // Mock pour i18next global pour ce describe block
  // il faut une approche différente, souvent en important le module et en modifiant son comportement.
  // Pour la simplicité ici, nous allons le mocker une fois pour tous les tests du describe block.
  // Si une configuration par test est nécessaire, il faudra envisager `vi.doMock` ou `vi.spyOn` sur les exports du module.

  vi.mock('react-i18next', () => ({
    useTranslation: () => ({
      t: (key: string) => {
        // Ce mock sera utilisé par tous les tests.
        // Pour des traductions spécifiques par test, il faudra affiner.
        if (key === 'quest_food_mastery_title') return 'Maîtriser 5 sorts de nourriture';
        if (key === 'quest_keyboard_dojo_title') return 'Visiter le Dojo du Clavier';
        if (key === 'quest_tutorial_completed_title') return 'Terminer le tutoriel';
        if (key === 'quests_completed_tab_label') return 'Terminées';
        if (key === 'quests_active_tab_label') return 'Actives';
        if (key === 'active_quests_title') return 'Quêtes Actives';
        if (key === 'completed_quests_title') return 'Quêtes Terminées';
        if (key === 'quest_progress_label') return 'Progrès';
        if (key === 'no_active_quests') return 'Aucune quête active pour le moment.';
        if (key === 'no_completed_quests') return 'Aucune quête terminée pour le moment.';
        if (key === 'loading_quests_message') return 'Chargement du journal de quêtes...';
        if (key === 'quests_not_logged_in') return 'Veuillez vous connecter pour voir vos quêtes.';
        if (key === 'quest_log_modal_title') return 'Journal de Quêtes';
        if (key === 'close_button_label') return 'Fermer';
        return key;
      },
    }),
  }));

  afterEach(() => {
    vi.clearAllMocks(); // Utiliser vi.clearAllMocks() pour Vitest
  });

  // Mock de useAuth
  vi.mock('../hooks/useAuth', () => ({
    useAuth: () => ({
      user: { uid: 'test-user-id' }, // Simuler un utilisateur connecté
      loading: false,
    }),
  }));

  beforeEach(() => {
    // Réinitialiser les implémentations de mock avant chaque test si nécessaire
    // ou configurer une implémentation par défaut ici.
    vi.clearAllMocks(); // Efface tous les mocks, y compris ceux du service

    // Configurer le mock de subscribeToActiveQuests
    (questService.subscribeToActiveQuests as ReturnType<typeof vi.fn>).mockImplementation(
      (userId: string, onUpdate: (quests: Quest[]) => void, onError: (error: Error) => void) => {
        // Appeler immédiatement onUpdate avec les données mockées
        // Le composant mettra à jour son état et setLoadingActiveQuests à false
        onUpdate(mockActiveQuests);
        return vi.fn(); // Retourner une fonction de désinscription mockée
      }
    );

    // Configurer le mock de subscribeToCompletedQuests
    (questService.subscribeToCompletedQuests as ReturnType<typeof vi.fn>).mockImplementation(
      (userId: string, onUpdate: (quests: Quest[]) => void, onError: (error: Error) => void) => {
        onUpdate(mockCompletedQuests);
        return vi.fn(); // Retourner une fonction de désinscription mockée
      }
    );
  });

  // Les tests devraient maintenant utiliser ces mocks de service
  it('devrait afficher correctement la liste des quêtes actives par défaut', async () => {
    render(<QuestLog />);

    // Attendre que les données soient chargées et que les éléments apparaissent
    expect(await screen.findByText('Maîtriser 5 sorts de nourriture')).toBeInTheDocument();
    expect(screen.getByText('Progrès : 2 / 5')).toBeInTheDocument();
    expect(await screen.findByText('Visiter le Dojo du Clavier')).toBeInTheDocument();
    expect(screen.getByText('Progrès : 0 / 1')).toBeInTheDocument();

    // S'assurer que les quêtes complétées ne sont pas visibles initialement
    expect(screen.queryByText('Terminer le tutoriel')).not.toBeInTheDocument();
  });

  it('devrait afficher les quêtes terminées après avoir cliqué sur l\'onglet correspondant', async () => {
    render(<QuestLog />);

    // Attendre que l'onglet "Actives" soit chargé
    expect(await screen.findByText('Maîtriser 5 sorts de nourriture')).toBeInTheDocument();

    // Cliquer sur l'onglet "Terminées"
    // La clé i18n pour "Terminées" est 'quests_completed_tab_label'
    // Le mock de i18n retourne "Terminées" pour cette clé.
    fireEvent.click(screen.getByText('Terminées'));

    // Vérifier que la quête terminée est visible
    expect(await screen.findByText(/Terminer le tutoriel.*✅/)).toBeInTheDocument();

    // Vérifier que les quêtes actives ne sont plus visibles
    expect(screen.queryByText('Maîtriser 5 sorts de nourriture')).not.toBeInTheDocument();
    expect(screen.queryByText('Visiter le Dojo du Clavier')).not.toBeInTheDocument();
  });
});

// Le type Quest est maintenant importé depuis ../types/game

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

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn((query, callback) => {
    // Simuler une réponse vide par défaut ou une réponse spécifique si nécessaire pour la configuration
    const mockSnapshot = {
      empty: true,
      docs: [],
      forEach: (cb: (doc: any) => void) => {},
    };
    callback(mockSnapshot);
    return vi.fn(); // Retourne une fonction de désinscription (unsubscribe)
  }),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(),
  arrayUnion: vi.fn(),
  arrayRemove: vi.fn(),
}));

import { onSnapshot as firestoreOnSnapshot } from 'firebase/firestore'; // Importer l'original pour que Vitest puisse le mocker

// Récupérer la version mockée de onSnapshot
const mockOnSnapshot = firestoreOnSnapshot as ReturnType<typeof vi.fn>;

describe('<QuestLog />', () => {
  const mockQuests: Quest[] = [
    {
      id: 'quest1',
      titleKey: 'quest_food_mastery_title', // "Maîtriser 5 sorts de nourriture"
      descriptionKey: 'quest_food_mastery_desc',
      progress: 2,
      target: 5,
      isCompleted: false,
      type: 'daily',
    },
    {
      id: 'quest2',
      titleKey: 'quest_keyboard_dojo_title', // "Visiter le Dojo du Clavier"
      descriptionKey: 'quest_keyboard_dojo_desc',
      progress: 0,
      target: 1,
      isCompleted: false,
      type: 'event',
    },
  ];

  // Mock pour i18next avant chaque test.
  // Note: vi.mock est automatiquement "hoisté". Pour le faire fonctionner dans beforeEach ou par test,
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
        return key;
      },
    }),
  }));

  afterEach(() => {
    vi.clearAllMocks(); // Utiliser vi.clearAllMocks() pour Vitest
  });

  it('devrait afficher correctement la liste des quêtes actives avec leur progression', () => {
    // Arrange: Configurer onSnapshot pour retourner les quêtes actives
    // Assurez-vous que mockOnSnapshot est bien la version mockée et non l'originale
    (mockOnSnapshot as ReturnType<typeof vi.fn>).mockImplementation((query: any, callback: any) => {
      const mockSnapshot = {
        empty: false,
        docs: mockQuests
          .filter(q => !q.isCompleted)
          .map(quest => ({
            id: quest.id,
            data: () => quest,
          })),
        forEach: (cb: (doc: any) => void) => { // Simulation de forEach pour les snapshots
          mockQuests.filter(q => !q.isCompleted).forEach(quest => cb({ id: quest.id, data: () => quest }));
        },
      };
      callback(mockSnapshot);
      return jest.fn(); // Unsubscribe function
    });

    // Act
    render(<QuestLog />);

    // Assert (doit échouer car QuestLog retourne null)
    expect(screen.getByText('Maîtriser 5 sorts de nourriture')).toBeInTheDocument();
    expect(screen.getByText('Progrès : 2 / 5')).toBeInTheDocument();
    expect(screen.getByText('Visiter le Dojo du Clavier')).toBeInTheDocument();
    expect(screen.getByText('Progrès : 0 / 1')).toBeInTheDocument();
  });

  it('devrait afficher les quêtes terminées après avoir cliqué sur l\'onglet correspondant', () => {
    // Arrange: Données pour quêtes actives et une quête terminée
    const mockAllQuests: Quest[] = [
      ...mockQuests, // Quêtes actives définies plus haut
      {
        id: 'quest3',
        titleKey: 'quest_tutorial_completed_title', // "Terminer le tutoriel"
        descriptionKey: 'quest_tutorial_completed_desc',
        progress: 1,
        target: 1,
        isCompleted: true,
        type: 'main',
      },
    ];

    // Le mock de react-i18next est maintenant global pour le describe block.
    // Plus besoin de le redéfinir ici.

    // Configurer onSnapshot pour retourner initialement les quêtes actives
    // Il sera re-configuré ou le composant devra gérer le filtrage interne basé sur un état après clic
    (mockOnSnapshot as ReturnType<typeof vi.fn>).mockImplementation((query: any, callback: any) => {
      const mockSnapshot = {
        empty: false,
        docs: mockAllQuests.map(quest => ({ // Fournir toutes les quêtes au composant
          id: quest.id,
          data: () => quest,
        })),
        forEach: (cb: (doc: any) => void) => {
            mockAllQuests.forEach(quest => cb({ id: quest.id, data: () => quest }));
        },
      };
      callback(mockSnapshot);
      return jest.fn();
    });

    // Act
    render(<QuestLog />);

    // Simuler un clic sur un futur bouton/onglet "Terminées"
    // Ce bouton n'existe pas encore, donc le test échouera ici (ou au getByText suivant)
    fireEvent.click(screen.getByText('Terminées'));

    // Assert (doit échouer)
    expect(screen.getByText('Terminer le tutoriel')).toBeInTheDocument();
    // Vérifier que les quêtes actives ne sont plus visibles
    expect(screen.queryByText('Maîtriser 5 sorts de nourriture')).not.toBeInTheDocument();
    expect(screen.queryByText('Visiter le Dojo du Clavier')).not.toBeInTheDocument();
    // Vérifier la présence d'un indicateur visuel (ex: une classe CSS ou un symbole)
    // Pour cela, on pourrait chercher un élément ayant un rôle ou un testId spécifique
    // ou vérifier si l'élément de la quête terminée contient le symbole ✅.
    // Cette assertion dépendra de l'implémentation.
    // Exemple simple : le texte de la quête terminée contient une coche.
    expect(screen.getByText(/Terminer le tutoriel.*✅/)).toBeInTheDocument();
  });
});

// Le type Quest est maintenant importé depuis ../types/game

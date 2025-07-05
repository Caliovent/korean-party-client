import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { loadGameContent, type GameContent } from '../services/contentService';

// Interface pour l'état du contexte
interface ContentContextState {
  gameData: GameContent | null;
  isLoading: boolean;
  error: Error | null; // Pour stocker une éventuelle erreur de chargement
}

// Valeur par défaut pour le contexte
const defaultContextValue: ContentContextState = {
  gameData: null,
  isLoading: true,
  error: null,
};

// Création du contexte
const ContentContext = createContext<ContentContextState>(defaultContextValue);

// Props pour le Provider
interface ContentProviderProps {
  children: ReactNode;
}

// Provider du contexte
export const ContentProvider: React.FC<ContentProviderProps> = ({ children }) => {
  const [gameData, setGameData] = useState<GameContent | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        console.log("ContentProvider: Starting to load game content...");
        const content = await loadGameContent();
        setGameData(content);
        setError(null); // Réinitialiser les erreurs en cas de succès
        console.log("ContentProvider: Game content loaded successfully.", content);
      } catch (err) {
        console.error("ContentProvider: Error loading game content:", err);
        setError(err as Error); // Stocker l'erreur
        // Garder gameData à null ou une valeur par défaut en cas d'erreur critique
        setGameData(null);
      } finally {
        setIsLoading(false);
        console.log("ContentProvider: Loading state set to false.");
      }
    };

    fetchContent();
  }, []); // Le tableau vide [] assure que cela ne s'exécute qu'au montage

  return (
    <ContentContext.Provider value={{ gameData, isLoading, error }}>
      {children}
    </ContentContext.Provider>
  );
};

// Hook personnalisé pour utiliser le contexte
export const useContent = (): ContentContextState => {
  const context = useContext(ContentContext);
  if (context === undefined) {
    throw new Error('useContent must be used within a ContentProvider');
  }
  return context;
};

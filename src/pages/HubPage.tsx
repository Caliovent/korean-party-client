import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import HubScene from '../phaser/HubScene';
import HangeulTyphoonScene, { type HangeulWordDefinition } from '../phaser/HangeulTyphoonScene'; // Importer la scène et le type
import { useContent } from '../contexts/ContentContext'; // <<< Import useContent
import GameLobbyModal from '../components/GameLobbyModal';
import GuildManagementModal from '../components/GuildManagementModal';
import QuestLogModal from '../components/QuestLogModal'; // Importer le nouveau modal
import DailyChallengeModal from '../components/DailyChallengeModal'; // Importer la modale du défi quotidien
import ShopModal from '../components/ShopModal'; // Importer la modale de la boutique
import DialogueModal from '../components/DialogueModal'; // <<< Import new DialogueModal
import StreakIndicator from '../components/StreakIndicator'; // Importer le StreakIndicator
import MapButton from '../components/MapButton'; // <<< Import MapButton
import soundService from '../services/soundService';
import { useTranslation } from 'react-i18next'; // Importer pour la traduction du bouton

// Define NPC data structure
interface NpcInfo {
  name: string;
  dialogue: string;
  portrait?: string; // asset key or path
}

const npcDialogues: Record<string, NpcInfo> = {
  directeur: {
    name: "Directeur Yong Geomwi",
    // From mission doc: "Pourrait donner la prémisse d'une quête principale, comme mentionné dans ."
    // Assuming a more concrete starting dialogue for now.
    dialogue: "Ah, vous voilà. L'Académie a de grands espoirs pour vous. Le chemin d'un K-Mage est exigeant. Votre première tâche sera de vous familiariser avec les énergies de ce lieu.",
    portrait: "assets/directeur_fallback_npc.png", // Using fallback, assuming placeholders might not exist
  },
  maitre_cheon: {
    name: "Maître Cheon Mun",
    dialogue: "Bienvenue, aspirant K-Mage. La langue des anciens, le Hangeul, est la clé pour déverrouiller votre potentiel. Considérez cela comme l'Éveil de vos propres Runes intérieures. Êtes-vous prêt à commencer ?",
    portrait: "assets/maitre_cheon_fallback_npc.png", // Using fallback
  },
};


const HubPage: React.FC = () => {
  const { t } = useTranslation(); // Hook de traduction
  const { gameData, isLoading: isContentLoading, error: contentError } = useContent(); // <<< Use ContentContext
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const [isGameLobbyModalOpen, setIsGameLobbyModalOpen] = useState(false);
  const [isGuildModalOpen, setIsGuildModalOpen] = useState(false);
  const [isQuestLogModalOpen, setIsQuestLogModalOpen] = useState(false); // État pour le modal de quêtes
  const [isDailyChallengeModalOpen, setIsDailyChallengeModalOpen] = useState(false);
  const [isShopModalOpen, setIsShopModalOpen] = useState(false); // État pour la modale de la boutique

  // State for DialogueModal
  const [isDialogueModalOpen, setIsDialogueModalOpen] = useState(false);
  const [currentPnjId, setCurrentPnjId] = useState<string | null>(null);
  const [currentPnjName, setCurrentPnjName] = useState<string>("");
  const [currentPnjDialogue, setCurrentPnjDialogue] = useState<string>("");
  const [currentPnjPortrait, setCurrentPnjPortrait] = useState<string | undefined>(undefined);

  const [currentChallenge, _setCurrentChallenge] = useState({
    title: "Défi de l'Interprète",
    objective: "Atteignez un combo de 15 dans le Défi de l'Interprète",
    reward: "50 Mana + 1 Potion de Clarté",
    sceneKey: 'HangeulTyphoonScene', // Exemple de clé de scène
    challengeParams: { gameMode: 'defiDeLInterprete', challengeType: 'combo', challengeTarget: 15 } // Paramètres du défi
  });

  useEffect(() => {
    if (gameRef.current && !phaserGameRef.current) {
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        // Adjust width/height as needed, or make them responsive
        width: 800,
        height: 600,
        parent: gameRef.current,
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: '100%',
          height: '100%'
        },
        scene: [HubScene, HangeulTyphoonScene], // Add HubScene and HangeulTyphoonScene
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { x: 0, y: 0 },
            debug: false // Set to true for debugging physics
          }
        }
      };
      phaserGameRef.current = new Phaser.Game(config);

      // Listener for Phaser scene to open modal
      phaserGameRef.current.events.on('openGameLobbyModal', () => {
        setIsGameLobbyModalOpen(true);
      });
      // Listener for Phaser scene to open guild modal
      phaserGameRef.current.events.on('openGuildManagementModal', () => {
        setIsGuildModalOpen(true);
      });
      // Listener for Phaser scene to open daily challenge modal
      phaserGameRef.current.events.on('openDailyChallengeModal', () => {
        // TODO: Potentiellement charger les détails du défi ici si nécessaire
        soundService.playSound('ui_modal_open');
        setIsDailyChallengeModalOpen(true);
      });
      // Listener for Phaser scene to open shop modal
      phaserGameRef.current.events.on('openShopModal', () => {
        soundService.playSound('ui_modal_open'); // Utiliser un son générique pour l'ouverture de modale
        setIsShopModalOpen(true);
      });

      // Listener for Phaser scene to open dialogue modal
      phaserGameRef.current.events.on('openDialogueModal', (data: { pnjId: string }) => {
        const pnjInfo = npcDialogues[data.pnjId];
        if (pnjInfo) {
          setCurrentPnjId(data.pnjId);
          setCurrentPnjName(pnjInfo.name);
          setCurrentPnjDialogue(pnjInfo.dialogue);
          setCurrentPnjPortrait(pnjInfo.portrait);
          setIsDialogueModalOpen(true);
          soundService.playSound('ui_modal_open');
        } else {
          console.warn(`Dialogue data not found for pnjId: ${data.pnjId}`);
        }
      });

      // Listener for starting Hangeul Typhoon Minigame
      const handleStartHangeulTyphoon = () => {
        console.log('[HubPage] startHangeulTyphoonMinigame event received');
        soundService.playSound('ui_click_match'); // Or a more specific sound
        soundService.stopSound('music_hub');

        if (phaserGameRef.current) {
          if (phaserGameRef.current.scene.isActive('HubScene')) {
            phaserGameRef.current.scene.stop('HubScene');
            console.log('[HubPage] HubScene stopped.');
          }

          const wordsForGame = (gameData?.hangeulTyphoonWords as HangeulWordDefinition[] | undefined) || [];
          if (wordsForGame.length === 0) {
            console.warn('[HubPage] No words found for Hangeul Typhoon. Starting with empty/default list.');
          }

          phaserGameRef.current.scene.start('HangeulTyphoonScene', {
            gameMode: 'Practice', // Or any other appropriate mode
            words: wordsForGame
          });
          console.log('[HubPage] HangeulTyphoonScene started with mode: Practice.');
        } else {
          console.error('[HubPage] Phaser game instance not available. Cannot start HangeulTyphoonScene.');
        }
      };
      phaserGameRef.current.events.on('startHangeulTyphoonMinigame', handleStartHangeulTyphoon);

      // Listener for Hangeul Typhoon game over
      const handleHangeulTyphoonGameOver = (data: { score: number, reason: string }) => {
        console.log(`[HubPage] Hangeul Typhoon game over. Score: ${data.score}, Reason: ${data.reason}`);
        if (phaserGameRef.current) {
          if (phaserGameRef.current.scene.isActive('HangeulTyphoonScene')) {
            phaserGameRef.current.scene.stop('HangeulTyphoonScene');
            console.log('[HubPage] HangeulTyphoonScene stopped.');
          }
          phaserGameRef.current.scene.start('HubScene');
          console.log('[HubPage] HubScene restarted.');
          soundService.playSound('music_hub'); // Restart hub music
        }
      };
      // Assuming HangeulTyphoonScene emits 'gameOver' on the global game event emitter
      // If HangeulTyphoonScene itself is obtained and events listened on it, that's also an option
      // For now, assuming global emitter as it's simpler from HubPage
      phaserGameRef.current.events.on('gameOver', handleHangeulTyphoonGameOver);


    }

    return () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.events.off('openGameLobbyModal');
        phaserGameRef.current.events.off('openGuildManagementModal');
        phaserGameRef.current.events.off('openDailyChallengeModal');
        phaserGameRef.current.events.off('openShopModal');
        phaserGameRef.current.events.off('openDialogueModal');
        phaserGameRef.current.events.off('startHangeulTyphoonMinigame'); // Cleanup
        phaserGameRef.current.events.off('gameOver'); // Cleanup for game over
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
    };
  }, []); // Phaser game instance effect

  useEffect(() => {
    // Effect to pass data to Phaser game registry once content and game are ready
    if (phaserGameRef.current && gameData && !isContentLoading) {
      if (gameData.hangeulTyphoonWords) {
        // S'assurer que les mots sont bien typés comme HangeulWordDefinition[]
        // Si ce n'est pas le cas depuis Firestore, une transformation pourrait être nécessaire ici.
        // Pour l'instant, on suppose qu'ils correspondent à HangeulWordDefinition[].
        const wordsForPhaser = gameData.hangeulTyphoonWords as HangeulWordDefinition[];
        phaserGameRef.current.registry.set('hangeulTyphoonWords', wordsForPhaser);
        console.log('[HubPage] hangeulTyphoonWords passés au registry de Phaser:', wordsForPhaser.length);
      } else {
        console.log('[HubPage] hangeulTyphoonWords non trouvés dans gameData ou vides. Le registry ne sera pas mis à jour pour ces mots.');
        // On pourrait vouloir mettre une liste vide pour éviter que la scène Phaser n'utilise des données d'une session précédente
        phaserGameRef.current.registry.set('hangeulTyphoonWords', []);
      }
      // On pourrait faire de même pour d'autres données globales nécessaires aux scènes Phaser
      // Exemple: phaserGameRef.current.registry.set('globalGameSettings', gameData.settings);
    }
  }, [gameData, isContentLoading, phaserGameRef.current]); // Dépend de gameData, de son état de chargement, et de l'instance du jeu

  useEffect(() => {
    // Stop other potential music and start hub music
    soundService.stopSound('music_game'); // Stop game music if it was playing
    soundService.playSound('music_hub');
    // console.log("HubPage mounted, playing music_hub.");

    return () => {
      soundService.stopSound('music_hub');
      // console.log("HubPage unmounted, stopping music_hub.");
    };
  }, []); // Music effect

  // Gérer l'état de chargement du contenu ou les erreurs avant de rendre le Hub
  if (isContentLoading) {
    // LoadingScreen est déjà géré globalement dans App.tsx, mais on pourrait mettre un placeholder spécifique au Hub si besoin.
    // Pour l'instant, on laisse App.tsx gérer l'écran de chargement global.
    // return <div>Chargement du Hub et de ses merveilles...</div>;
  }

  if (contentError) {
    // De même, App.tsx gère l'erreur globale.
    // return <div>Erreur de chargement du contenu pour le Hub: {contentError.message}</div>;
  }

  return (
    <div className="hub-page-container" style={{ position: 'relative', width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Indicateur de Série */}
      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 100 }}>
        <StreakIndicator streakCount={5} nextReward="💎 x10" />
      </div>

      {/* Bouton pour ouvrir le journal de quêtes */}
      <button
        onClick={() => setIsQuestLogModalOpen(true)}
        className="button-base" // Utiliser une classe de bouton existante ou créer une nouvelle
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 100, // Pour être au-dessus du canvas Phaser mais en dessous des modaux
          padding: '10px 15px' // Style rapide
        }}
      >
        {t('hub_open_quest_log_button') || 'Journal de Quêtes'}
      </button>

      <div ref={gameRef} id="phaser-hub-container" style={{ flexGrow: 1, width: '100%' }} />

      <GameLobbyModal
        isOpen={isGameLobbyModalOpen}
        onClose={() => setIsGameLobbyModalOpen(false)}
        onDelete={(gameId) => {
          // Placeholder for game deletion logic
          // This might involve calling a service, then updating UI if necessary
          console.log(`HubPage: Request to delete game ${gameId}`);
          // Example: remove game from a local list if games were fetched and stored in HubPage's state
        }}
      />
      <GuildManagementModal
        isOpen={isGuildModalOpen}
        onClose={() => setIsGuildModalOpen(false)}
      />
      <QuestLogModal
        isOpen={isQuestLogModalOpen}
        onClose={() => setIsQuestLogModalOpen(false)}
      />
      <ShopModal
        isOpen={isShopModalOpen}
        onClose={() => {
          soundService.playSound('ui_modal_close'); // Utiliser un son générique pour la fermeture
          setIsShopModalOpen(false);
        }}
      />
      <DailyChallengeModal
        isOpen={isDailyChallengeModalOpen}
        onClose={() => {
          soundService.playSound('ui_modal_close');
          setIsDailyChallengeModalOpen(false);
        }}
        onLaunch={() => {
          soundService.playSound('ui_click_match'); // Son pour lancer un défi/match
          soundService.playSound('ui_click_match'); // Son pour lancer un défi/match
          setIsDailyChallengeModalOpen(false);

          console.log(`Lancement du défi: ${currentChallenge.title} vers la scène ${currentChallenge.sceneKey} avec params`, currentChallenge.challengeParams);

          if (phaserGameRef.current) {
            // Arrêter la musique du Hub avant de changer de scène
            soundService.stopSound('music_hub');

            // Vérifier si la scène Hub est active et l'arrêter
            if (phaserGameRef.current.scene.isActive('HubScene')) {
              phaserGameRef.current.scene.stop('HubScene');
              console.log("HubScene arrêtée.");
            }

            // Démarrer la scène du défi
            // Important: Assurez-vous que HangeulTyphoonScene (ou toute autre scène de jeu)
            // est ajoutée à la configuration du jeu Phaser si ce n'est pas déjà le cas,
            // sinon getScene échouera et start ne fonctionnera pas comme prévu.
            // Cela se fait généralement là où `new Phaser.Game(config)` est appelé.
            // Pour l'instant, on suppose qu'elle est disponible.
            phaserGameRef.current.scene.start(currentChallenge.sceneKey, currentChallenge.challengeParams);
            console.log(`Scène ${currentChallenge.sceneKey} démarrée avec les paramètres:`, currentChallenge.challengeParams);
          } else {
            console.error("Référence au jeu Phaser non disponible. Impossible de lancer le défi.");
          }
        }}
        challenge={currentChallenge}
      />

      <DialogueModal
        isOpen={isDialogueModalOpen}
        onClose={() => {
          setIsDialogueModalOpen(false);
          soundService.playSound('ui_modal_close');
        }}
        pnjId={currentPnjId}
        npcName={currentPnjName}
        dialogueText={currentPnjDialogue}
        npcPortraitUrl={currentPnjPortrait}
      />

      {/* Map Button positioned over the Phaser canvas */}
      <MapButton game={phaserGameRef.current} />
    </div>
  );
};

export default HubPage;

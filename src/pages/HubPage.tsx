import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import HubScene from '../phaser/HubScene';
import HangeulTyphoonScene from '../phaser/HangeulTyphoonScene'; // Importer la scène de jeu
import GameLobbyModal from '../components/GameLobbyModal';
import GuildManagementModal from '../components/GuildManagementModal';
import QuestLogModal from '../components/QuestLogModal'; // Importer le nouveau modal
import DailyChallengeModal from '../components/DailyChallengeModal'; // Importer la modale du défi quotidien
import ShopModal from '../components/ShopModal'; // Importer la modale de la boutique
import StreakIndicator from '../components/StreakIndicator'; // Importer le StreakIndicator
import soundService from '../services/soundService';
import { useTranslation } from 'react-i18next'; // Importer pour la traduction du bouton

const HubPage: React.FC = () => {
  const { t } = useTranslation(); // Hook de traduction
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const [isGameLobbyModalOpen, setIsGameLobbyModalOpen] = useState(false);
  const [isGuildModalOpen, setIsGuildModalOpen] = useState(false);
  const [isQuestLogModalOpen, setIsQuestLogModalOpen] = useState(false); // État pour le modal de quêtes
  const [isDailyChallengeModalOpen, setIsDailyChallengeModalOpen] = useState(false);
  const [isShopModalOpen, setIsShopModalOpen] = useState(false); // État pour la modale de la boutique
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
    }

    return () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.events.off('openGameLobbyModal');
        phaserGameRef.current.events.off('openGuildManagementModal'); // Clean up guild listener
        phaserGameRef.current.events.off('openDailyChallengeModal'); // Clean up daily challenge listener
        phaserGameRef.current.events.off('openShopModal'); // Clean up shop listener
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Stop other potential music and start hub music
    soundService.stopSound('music_game'); // Stop game music if it was playing
    soundService.playSound('music_hub');
    // console.log("HubPage mounted, playing music_hub.");

    return () => {
      soundService.stopSound('music_hub');
      // console.log("HubPage unmounted, stopping music_hub.");
    };
  }, []); // Empty dependency array means this runs once on mount and cleanup on unmount

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
    </div>
  );
};

export default HubPage;

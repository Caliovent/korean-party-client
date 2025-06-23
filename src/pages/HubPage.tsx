import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import HubScene from '../phaser/HubScene';
import GameLobbyModal from '../components/GameLobbyModal';
import GuildManagementModal from '../components/GuildManagementModal';
import QuestLogModal from '../components/QuestLogModal'; // Importer le nouveau modal
import soundService from '../services/soundService';
import { useTranslation } from 'react-i18next'; // Importer pour la traduction du bouton

const HubPage: React.FC = () => {
  const { t } = useTranslation(); // Hook de traduction
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const [isGameLobbyModalOpen, setIsGameLobbyModalOpen] = useState(false);
  const [isGuildModalOpen, setIsGuildModalOpen] = useState(false);
  const [isQuestLogModalOpen, setIsQuestLogModalOpen] = useState(false); // État pour le modal de quêtes

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
        scene: [HubScene], // Add HubScene here
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { y: 0 },
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
    }

    return () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.events.off('openGameLobbyModal');
        phaserGameRef.current.events.off('openGuildManagementModal'); // Clean up guild listener
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
      />
      <GuildManagementModal
        isOpen={isGuildModalOpen}
        onClose={() => setIsGuildModalOpen(false)}
      />
      <QuestLogModal
        isOpen={isQuestLogModalOpen}
        onClose={() => setIsQuestLogModalOpen(false)}
      />
    </div>
  );
};

export default HubPage;

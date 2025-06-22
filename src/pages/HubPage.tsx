import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import HubScene from '../phaser/HubScene';
import GameLobbyModal from '../components/GameLobbyModal';
import GuildManagementModal from '../components/GuildManagementModal'; // Import GuildModal
import soundService from '../services/soundService';

const HubPage: React.FC = () => {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const [isGameLobbyModalOpen, setIsGameLobbyModalOpen] = useState(false);
  const [isGuildModalOpen, setIsGuildModalOpen] = useState(false); // State for GuildModal

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
    <div className="hub-page-container" style={{ position: 'relative' }}> {/* Added for potential stacking context if needed */}
      <div ref={gameRef} id="phaser-hub-container" />
      <GameLobbyModal
        isOpen={isGameLobbyModalOpen}
        onClose={() => setIsGameLobbyModalOpen(false)}
      />
      <GuildManagementModal
        isOpen={isGuildModalOpen}
        onClose={() => setIsGuildModalOpen(false)}
      />
    </div>
  );
};

export default HubPage;

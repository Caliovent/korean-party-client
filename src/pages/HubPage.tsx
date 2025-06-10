import React, { useEffect, useRef, useState } from 'react'; // + useState
import Phaser from 'phaser';
import { HubScene } from '../phaser/HubScene'; // Assuming HubScene will be created in src/phaser/
import GameLobbyModal from '../components/GameLobbyModal'; // + Import modal
import soundService from '../services/soundService'; // Import soundService

const HubPage: React.FC = () => {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const [isGameLobbyModalOpen, setIsGameLobbyModalOpen] = useState(false); // + Modal state

  useEffect(() => {
    if (gameRef.current && !phaserGameRef.current) {
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        // Adjust width/height as needed, or make them responsive
        width: 800,
        height: 600,
        parent: gameRef.current,
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
    }

    return () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.events.off('openGameLobbyModal'); // Clean up listener
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
    <div style={{ position: 'relative' }}> {/* Added for potential stacking context if needed */}
      <div ref={gameRef} id="phaser-hub-container" />
      <GameLobbyModal
        isOpen={isGameLobbyModalOpen}
        onClose={() => setIsGameLobbyModalOpen(false)}
      />
    </div>
  );
};

export default HubPage;

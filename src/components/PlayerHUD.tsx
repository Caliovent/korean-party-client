// src/components/PlayerHUD.tsx (corrigé)

import React, { useState, useEffect, useRef } from 'react';
import type { Player } from '../types/game'; // Utiliser "import type"
import './PlayerHUD.css';

interface FloatingText {
  id: number;
  text: string;
  type: 'gain' | 'loss';
  top: number; // For stacking multiple texts
}

interface PlayerHUDProps {
  player: Player | null;
}

const MOBILE_BREAKPOINT = 768;

const PlayerHUD: React.FC<PlayerHUDProps> = ({ player }) => {
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const prevManaRef = useRef<number | undefined>(undefined);
  const [textTopPositionKey, setTextTopPositionKey] = useState(0);

  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= MOBILE_BREAKPOINT);
  const [isExpandedOnMobile, setIsExpandedOnMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const newIsMobileView = window.innerWidth <= MOBILE_BREAKPOINT;
      if (newIsMobileView !== isMobileView) {
        setIsMobileView(newIsMobileView);
        // If we switch from desktop to mobile, ensure HUD is compact by default
        if (newIsMobileView) {
          setIsExpandedOnMobile(false);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    // Initial check in case the component mounts after the initial window width check
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileView]);

  useEffect(() => {
    if (player) {
      prevManaRef.current = player.mana;
      setTextTopPositionKey(0);
    } else {
      prevManaRef.current = undefined;
    }
  }, [player]);

  useEffect(() => {
    if (player && prevManaRef.current !== undefined && player.mana !== prevManaRef.current) {
      const diff = player.mana - prevManaRef.current;
      if (diff !== 0) {
        const newText: FloatingText = {
          id: Date.now(),
          text: `${diff > 0 ? '+' : ''}${diff}`,
          type: diff > 0 ? 'gain' : 'loss',
          top: (textTopPositionKey % 3) * 20,
        };
        setFloatingTexts(currentTexts => [...currentTexts, newText]);
        setTextTopPositionKey(prevKey => prevKey + 1);
        setTimeout(() => {
          setFloatingTexts(currentTexts => currentTexts.filter(ft => ft.id !== newText.id));
        }, 2000);
      }
    }
    if (player) {
      prevManaRef.current = player.mana;
    }
  }, [player?.mana, player, textTopPositionKey]);


  if (!player) {
    return null;
  }

  const toggleExpandedView = () => {
    if (isMobileView) {
      setIsExpandedOnMobile(!isExpandedOnMobile);
    }
  };

  let hudClasses = "player-hud";
  if (isMobileView) {
    hudClasses += isExpandedOnMobile ? " mobile-expanded-view" : " mobile-compact-view";
  }

  // Content for mana display including floating texts
  const ManaDisplay = () => (
    <div className="mana-display-container">
      <p>{player.mana}</p>
      {floatingTexts.map(ft => (
        <span
          key={ft.id}
          className={`floating-text ${ft.type}`}
          style={{ top: `-${ft.top}px` }}
        >
          {ft.text}
        </span>
      ))}
    </div>
  );

  // Content for Grimoires
  const GrimoiresList = () => (
    <>
      <h3>Grimoires</h3>
      {player.grimoires && player.grimoires.length > 0 ? (
        <ul>
          {player.grimoires.map(grimoire => (
            <li key={grimoire.id}>
              {grimoire.name}: {grimoire.progress} / {grimoire.target}
            </li>
          ))}
        </ul>
      ) : (
        <p>No grimoires</p>
      )}
    </>
  );


  if (isMobileView) {
    if (!isExpandedOnMobile) {
      // Mobile Compact View
      return (
        <div className={hudClasses} onClick={toggleExpandedView}>
          <div className="hud-item hud-player-name-compact">
            <span>{player.displayName} {player.guildTag && `[${player.guildTag}]`}</span>
          </div>
          <div className="hud-item hud-mana-compact">
            <span>Mana: {player.mana}</span> {/* Floating text might be too much here, simplified */}
          </div>
          <div className="hud-item hud-grimoires-count-compact">
            <span>Grimoires: {player.grimoires?.length || 0}</span>
          </div>
        </div>
      );
    } else {
      // Mobile Expanded View (similar to desktop but will be styled differently by CSS)
      return (
        <div className={hudClasses}>
          <div className="hud-header-mobile" onClick={toggleExpandedView}>
            <h4>{player.displayName} - Appuyez pour réduire</h4>
            {/* Or use a close button icon */}
          </div>
          <div className="hud-item hud-player-info">
            <h3>Joueur</h3>
            <p>
              {player.displayName} {player.guildTag && `[${player.guildTag}]`}
            </p>
          </div>
          <div className="hud-item hud-mana">
            <h3>Mana</h3>
            <ManaDisplay />
          </div>
          <div className="hud-item hud-grimoires">
            <GrimoiresList />
          </div>
          {/* Add other HUD elements like fragments if they exist in Player type */}
        </div>
      );
    }
  }

  // Desktop View (default)
  return (
    <div className={hudClasses}>
      <div className="hud-item hud-player-info">
        <h3>Joueur</h3>
        <p>
          {player.displayName} {player.guildTag && `[${player.guildTag}]`}
        </p>
      </div>
      <div className="hud-item hud-mana">
        <h3>Mana</h3>
        <ManaDisplay />
      </div>
      <div className="hud-item hud-grimoires">
        <GrimoiresList />
      </div>
      {/* Add other HUD elements like fragments if they exist in Player type */}
    </div>
  );
};

export default PlayerHUD;
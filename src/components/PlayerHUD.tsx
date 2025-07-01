// src/components/PlayerHUD.tsx (corrigé)

import React, { useState, useEffect, useRef } from 'react';
import type { Player } from '../types/game'; // Utiliser "import type"
import { getFunctions, httpsCallable } from "firebase/functions"; // Added
import { app } from '../firebaseConfig'; // Added
// import { getLevelProgress, getExperienceForLevel } from '../data/levelExperience'; // Potentially for XP bar
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

  // State for calculated Level and XP
  const [sorcererLevelHUD, setSorcererLevelHUD] = useState<number | null>(null);
  const [totalExperienceHUD, setTotalExperienceHUD] = useState<number | null>(null);
  const [loadingLevelXP, setLoadingLevelXP] = useState<boolean>(false); // Don't start loading until player exists
  const [levelXPError, setLevelXPError] = useState<string | null>(null);


  useEffect(() => {
    const handleResize = () => {
      const newIsMobileView = window.innerWidth <= MOBILE_BREAKPOINT;
      if (newIsMobileView !== isMobileView) {
        setIsMobileView(newIsMobileView);
        if (newIsMobileView) {
          setIsExpandedOnMobile(false);
        }
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileView]);

  useEffect(() => {
    if (player && player.uid) { // Check for player.uid specifically
      prevManaRef.current = player.mana;
      setTextTopPositionKey(0);

      // Fetch Level and XP
      setLoadingLevelXP(true);
      setLevelXPError(null);
      const functions = getFunctions(app, 'europe-west1');
      if (import.meta.env.DEV) {
        functions.customDomain = `http://localhost:5173/functions-proxy`;
      }
      const calculatePlayerLevelFunction = httpsCallable(functions, 'calculatePlayerLevel');

      calculatePlayerLevelFunction()
        .then((result) => {
          const data = result.data as { totalExperience: number; sorcererLevel: number };
          setTotalExperienceHUD(data.totalExperience);
          setSorcererLevelHUD(data.sorcererLevel);
        })
        .catch((err) => {
          console.error("Error calling calculatePlayerLevel function in HUD:", err);
          setLevelXPError("N/A"); // Keep it brief for HUD
          setTotalExperienceHUD(0);
          setSorcererLevelHUD(1);
        })
        .finally(() => {
          setLoadingLevelXP(false);
        });

    } else {
      prevManaRef.current = undefined;
      // Reset level/XP if player is null
      setSorcererLevelHUD(null);
      setTotalExperienceHUD(null);
      setLoadingLevelXP(false);
      setLevelXPError(null);
    }
  }, [player]); // Effect depends on the whole player object, will re-run if player changes

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
          <div className="hud-item hud-level-compact">
            <span>Niv: {loadingLevelXP ? '...' : levelXPError || sorcererLevelHUD}</span>
          </div>
          <div className="hud-item hud-mana-compact">
            <span>Mana: {player.mana}</span>
          </div>
          <div className="hud-item hud-grimoires-count-compact">
            <span>Grim: {player.grimoires?.length || 0}</span>
          </div>
        </div>
      );
    } else {
      // Mobile Expanded View
      return (
        <div className={hudClasses}>
          <div className="hud-header-mobile" onClick={toggleExpandedView}>
            <h4>{player.displayName} - Appuyez pour réduire</h4>
          </div>
          <div className="hud-item hud-player-info">
            <h3>Joueur</h3>
            <p>
              {player.displayName} {player.guildTag && `[${player.guildTag}]`}
            </p>
          </div>
          <div className="hud-item hud-level-xp">
            <h3>Niveau & Expérience</h3>
            {loadingLevelXP ? <p>Chargement...</p> : levelXPError ? <p>Niveau: {levelXPError}</p> :
            <>
              <p>Niveau: {sorcererLevelHUD}</p>
              <p>XP: {totalExperienceHUD}</p>
            </>
            }
          </div>
          <div className="hud-item hud-mana">
            <h3>Mana</h3>
            <ManaDisplay />
          </div>
          <div className="hud-item hud-grimoires">
            <GrimoiresList />
          </div>
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
      <div className="hud-item hud-level-xp">
        <h3>Niveau & Expérience</h3>
        {loadingLevelXP ? <p>Chargement...</p> : levelXPError ? <p>Niveau: {levelXPError}</p> :
        <>
          <p>Niveau: {sorcererLevelHUD}</p>
          <p>XP: {totalExperienceHUD}</p>
        </>
        }
      </div>
      <div className="hud-item hud-mana">
        <h3>Mana</h3>
        <ManaDisplay />
      </div>
      <div className="hud-item hud-grimoires">
        <GrimoiresList />
      </div>
    </div>
  );
};

export default PlayerHUD;
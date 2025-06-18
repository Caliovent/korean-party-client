// src/types/game.ts (modifié)

import { Timestamp } from "firebase/firestore";
import type { SpellId } from "../data/spells"; // Importer notre type spécifique

export interface Grimoire {
  id: string;
  name: string;
  progress: number;
  target: number;
}

export interface Player {
  uid:string;
  displayName: string;
  position: number;
  mana: number;
  grimoires: Grimoire[];
  effects?: { type: 'SHIELDED', duration?: number }[];
  groundHeight: number; 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blocks: any[]; // Utilisez un type plus spécifique si vous l'avez
}

export type GameStatus = "waiting" | "playing" | "finished";
export type TurnState = "AWAITING_ROLL" | "MOVING" | "RESOLVING_TILE";

export interface Game {
  id: string;
  name: string;
  hostId: string;
  players: Player[];
  status: GameStatus;
  currentPlayerId: string;
  currentTurn: number;
  turnState: TurnState;
  board: { type: string; trap?: 'RUNE_TRAP' | string; }[];
  lastDiceRoll: number | null;
  lastEventCard: { titleKey: string, descriptionKey: string, GfxUrl: string } | null;
  lastSpellCast: {
    casterId: string;
    targetId: string;
    // MODIFICATION : On utilise le type SpellId au lieu de string
    spellId: SpellId; 
  } | null;
  winnerId: string | null;
  createdAt: Timestamp;
}

export interface SpellMasteryData {
  spellId: SpellId;
  masteryLevel: number; // e.g., 0 for unlearned, 1 for basic, 2 for mastered
  successfulCasts: number; // Number of times the spell has been cast successfully
  failedCasts: number; // Number of times the spell failed (e.g., due to lack of mana, target out of range)
  // Optional: could add lastUsedTimestamp, specific spell stats, etc.
}
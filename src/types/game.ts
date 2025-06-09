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
  id:string;
  name: string;
  position: number;
  mana: number;
  grimoires: Grimoire[];
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
  board: { type: string }[];
  lastDiceRoll: number | null;
  lastSpellCast: {
    casterId: string;
    targetId: string;
    // MODIFICATION : On utilise le type SpellId au lieu de string
    spellId: SpellId; 
  } | null;
  winnerId: string | null;
  createdAt: Timestamp;
}
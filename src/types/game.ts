import { Timestamp } from "firebase/firestore"; // Importer Timestamp

export interface Grimoire {
  id: string;
  name: string;
  progress: number;
  target: number;
}

export interface Player {
  id: string;
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
  lastDiceRoll: number | null;
  lastSpellCast: {
    spellId: string;
    casterId: string;
    targetId: string;
  } | null;
  winnerId: string | null;
  createdAt: Timestamp; // Remplacer any par Timestamp
}
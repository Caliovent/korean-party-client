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
  guildId?: string; // Optional: ID of the guild the player belongs to
  guildTag?: string; // Optional: Denormalized guild tag for quick display
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

export interface BoardTile {
  type: string; // e.g., 'food', 'travel', 'library', 'EVENT'
  trap?: {
    ownerId: string; // Player UID who set the trap
    spellId: SpellId; // e.g., 'DOKKAEBI_MISCHIEF' or 'TRAP_RUNE'
    effect: 'MANA_LOSS' | 'PUSH_BACK' | string; // Type of effect
    // Potentially other details like damage amount if not implicit from spellId
  } | null;
  // other tile properties like special visual state?
}

export interface Game {
  id: string;
  name: string;
  hostId: string;
  players: Player[];
  status: GameStatus;
  currentPlayerId: string;
  currentTurn: number;
  turnState: TurnState;
  board: BoardTile[]; // Changed from { type: string; trap?: 'RUNE_TRAP' | string; }[]
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
  word?: string; // The actual word/phrase if it's a word rune, or could be spell name
  masteryLevel: number; // e.g., 0 for unlearned, 1 for basic, 2 for mastered
  successfulCasts: number; // Number of times the spell has been cast successfully
  failedCasts: number; // Number of times the spell failed (e.g., due to lack of mana, target out of range)
  nextReviewDate?: number; // Unix timestamp (milliseconds) for next scheduled review
  // Optional: could add lastUsedTimestamp, specific spell stats, etc.
}

export interface Quest {
  id: string;
  titleKey: string; // Clé pour i18n
  descriptionKey: string; // Clé pour i18n
  progress: number;
  target: number;
  isCompleted: boolean;
  type: 'daily' | 'weekly' | 'main' | 'event'; // Type de quête
  rewards?: { experience?: number; items?: string[]; spells?: SpellId[] };
  // Potentiellement d'autres champs comme :
  // relatedSpellId?: SpellId; // Si la quête est liée à un sort spécifique
  // relatedAction?: 'castSpell' | 'visitLocation' | 'collectItem'; // Type d'action pour la quête
  // locationId?: string; // Si la quête est de visiter un lieu
  // itemId?: string; // Si la quête est de collecter un objet
}
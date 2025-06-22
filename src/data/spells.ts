// src/data/spells.ts (modifié)

export type SpellId =
  "PUSH_BACK" |
  "MANA_DRAIN" |
  "TRAP_RUNE" |
  "MANA_SHIELD" |
  "ASTRAL_SWAP" |
  "MEMORY_FOG" |        // Brouillard Mnémonique
  "KARMIC_SWAP" |       // Échange Karmique
  "DOKKAEBI_MISCHIEF";  // Malice du Dokkaebi

export enum SpellType {
  TARGET_TILE = "TARGET_TILE",
  SELF = "SELF",
  TARGET_PLAYER = "TARGET_PLAYER",
  // Add other types as needed, e.g., TARGET_ENEMY, AOE_TILE, etc.
}

// The 'type' field from the mission brief (DEFENSIVE, CHAOS, TRAP) describes the spell's *effect category*
// while SpellType here describes the *targeting mechanism* for the frontend.
// We can add a new field for effect category if needed for UI filtering/icons later.
export interface Spell {
  id: SpellId;
  nameKey: string;
  descriptionKey: string;
  manaCost: number;
  requiresTarget: boolean; // True if type is TARGET_PLAYER or TARGET_TILE
  type: SpellType; // Defines targeting behavior for the client
  effectCategory?: 'DEFENSIVE' | 'CHAOS' | 'TRAP' | 'OFFENSIVE' | 'UTILITY'; // Optional: for UI icons/filtering
}

export const SPELL_DEFINITIONS: Spell[] = [
  {
    id: "PUSH_BACK",
    nameKey: "spells.push_back.name",
    descriptionKey: "spells.push_back.description",
    manaCost: 15,
    requiresTarget: true,
    type: SpellType.TARGET_PLAYER,
    effectCategory: "OFFENSIVE",
  },
  {
    id: "MANA_DRAIN",
    nameKey: "spells.mana_drain.name",
    descriptionKey: "spells.mana_drain.description",
    manaCost: 5,
    requiresTarget: true,
    type: SpellType.TARGET_PLAYER,
    effectCategory: "OFFENSIVE",
  },
  {
    id: "TRAP_RUNE", // This seems like an old trap spell
    nameKey: "spells.trap_rune.name",
    descriptionKey: "spells.trap_rune.description",
    manaCost: 30, // Example, might be different from Dokkaebi's Mischief
    requiresTarget: true,
    type: SpellType.TARGET_TILE,
    effectCategory: "TRAP",
  },
  {
    id: "MANA_SHIELD", // This seems like an old defensive spell
    nameKey: "spells.mana_shield.name",
    descriptionKey: "spells.mana_shield.description",
    manaCost: 25, // Example, might be different from Memory Fog
    requiresTarget: false,
    type: SpellType.SELF,
    effectCategory: "DEFENSIVE",
  },
  {
    id: "ASTRAL_SWAP", // This seems like an old chaos/utility spell
    nameKey: "spells.astral_swap.name",
    descriptionKey: "spells.astral_swap.description",
    manaCost: 40, // Example, might be different from Karmic Swap
    requiresTarget: true,
    type: SpellType.TARGET_PLAYER,
    effectCategory: "UTILITY", // Or CHAOS, depending on interpretation
  },
  // New Spells from "L'Art de l'Enchantement"
  {
    id: "MEMORY_FOG",
    nameKey: "spells.memory_fog.name", // Key for "Brouillard Mnémonique"
    descriptionKey: "spells.memory_fog.description", // Key for "Vous protège du prochain sort négatif lancé contre vous."
    manaCost: 25,
    requiresTarget: false, // Targets self
    type: SpellType.SELF,
    effectCategory: "DEFENSIVE",
  },
  {
    id: "KARMIC_SWAP",
    nameKey: "spells.karmic_swap.name", // Key for "Échange Karmique"
    descriptionKey: "spells.karmic_swap.description", // Key for "Échangez votre position sur le plateau avec un autre joueur."
    manaCost: 40,
    requiresTarget: true, // Needs a target player
    type: SpellType.TARGET_PLAYER,
    effectCategory: "CHAOS",
  },
  {
    id: "DOKKAEBI_MISCHIEF",
    nameKey: "spells.dokkaebi_mischief.name", // Key for "Malice du Dokkaebi"
    descriptionKey: "spells.dokkaebi_mischief.description", // Key for "Placez un piège invisible sur une case. Le prochain joueur à s'y arrêter perd 15 Mana."
    manaCost: 30,
    requiresTarget: true, // Needs a target tile
    type: SpellType.TARGET_TILE,
    effectCategory: "TRAP",
  },
];
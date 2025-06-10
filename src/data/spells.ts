// src/data/spells.ts (modifié)

export type SpellId = "PUSH_BACK" | "MANA_DRAIN" | "TRAP_RUNE" | "MANA_SHIELD" | "ASTRAL_SWAP";

export enum SpellType {
  TARGET_TILE = "TARGET_TILE",
  SELF = "SELF",
  TARGET_PLAYER = "TARGET_PLAYER",
  // Add other types as needed, e.g., TARGET_ENEMY, AOE_TILE, etc.
}

export interface Spell {
  id: SpellId;
  nameKey: string; // CHANGEMENT: 'name' devient 'nameKey'
  descriptionKey: string; // CHANGEMENT: 'description' devient 'descriptionKey'
  manaCost: number;
  requiresTarget: boolean; // Consider if this is still needed with SpellType
  type: SpellType;
}

export const SPELL_DEFINITIONS: Spell[] = [
  {
    id: "PUSH_BACK",
    nameKey: "spells.push_back.name",
    descriptionKey: "spells.push_back.description",
    manaCost: 15,
    requiresTarget: true,
    type: SpellType.TARGET_PLAYER, // Assuming PUSH_BACK targets a player
  },
  {
    id: "MANA_DRAIN",
    nameKey: "spells.mana_drain.name",
    descriptionKey: "spells.mana_drain.description",
    manaCost: 5,
    requiresTarget: true,
    type: SpellType.TARGET_PLAYER, // Assuming MANA_DRAIN targets a player
  },
  {
    id: "TRAP_RUNE",
    nameKey: "spells.trap_rune.name",
    descriptionKey: "spells.trap_rune.description",
    manaCost: 30,
    requiresTarget: true,
    type: SpellType.TARGET_TILE,
  },
  {
    id: "MANA_SHIELD",
    nameKey: "spells.mana_shield.name",
    descriptionKey: "spells.mana_shield.description",
    manaCost: 25,
    requiresTarget: false,
    type: SpellType.SELF,
  },
  {
    id: "ASTRAL_SWAP",
    nameKey: "spells.astral_swap.name",
    descriptionKey: "spells.astral_swap.description",
    manaCost: 40,
    requiresTarget: true,
    type: SpellType.TARGET_PLAYER,
  },
];
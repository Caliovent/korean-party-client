// src/data/spells.ts (modifié)

export type SpellId = "PUSH_BACK" | "MANA_DRAIN";

export interface Spell {
  id: SpellId;
  nameKey: string; // CHANGEMENT: 'name' devient 'nameKey'
  descriptionKey: string; // CHANGEMENT: 'description' devient 'descriptionKey'
  manaCost: number;
  requiresTarget: boolean;
}

export const SPELL_DEFINITIONS: Spell[] = [
  {
    id: "PUSH_BACK",
    nameKey: "spells.push_back.name",
    descriptionKey: "spells.push_back.description",
    manaCost: 15,
    requiresTarget: true,
  },
  {
    id: "MANA_DRAIN",
    nameKey: "spells.mana_drain.name",
    descriptionKey: "spells.mana_drain.description",
    manaCost: 5,
    requiresTarget: true,
  },
];
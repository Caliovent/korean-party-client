// src/data/spells.ts

export type SpellId = "PUSH_BACK" | "MANA_DRAIN";

export interface Spell {
  id: SpellId;
  name: string;
  description: string;
  manaCost: number;
  requiresTarget: boolean;
}

export const SPELL_DEFINITIONS: Spell[] = [
  {
    id: "PUSH_BACK",
    name: "Repousser",
    description: "Fait reculer un adversaire de 3 cases.",
    manaCost: 15,
    requiresTarget: true,
  },
  {
    id: "MANA_DRAIN",
    name: "Absorption de Mana",
    description: "Vole 10 points de Mana à un autre joueur.",
    manaCost: 5,
    requiresTarget: true,
  },
  // Nous pourrons ajouter d'autres sorts ici
];
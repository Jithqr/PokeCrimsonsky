// Standard 18-type effectiveness chart (Gen 6+).
// Rows = attacker type, columns = defender type.
// Values: 2 = super effective, 0.5 = resisted, 0 = immune, 1 = neutral.

export type PType =
  | "Normal" | "Fire" | "Water" | "Electric" | "Grass" | "Ice"
  | "Fighting" | "Poison" | "Ground" | "Flying" | "Psychic" | "Bug"
  | "Rock" | "Ghost" | "Dragon" | "Dark" | "Steel" | "Fairy";

export const ALL_TYPES: PType[] = [
  "Normal","Fire","Water","Electric","Grass","Ice",
  "Fighting","Poison","Ground","Flying","Psychic","Bug",
  "Rock","Ghost","Dragon","Dark","Steel","Fairy",
];

export const TYPE_COLORS: Record<PType, string> = {
  Normal: "#A8A878", Fire: "#F08030", Water: "#6890F0", Electric: "#F8D030",
  Grass: "#78C850", Ice: "#98D8D8", Fighting: "#C03028", Poison: "#A040A0",
  Ground: "#E0C068", Flying: "#A890F0", Psychic: "#F85888", Bug: "#A8B820",
  Rock: "#B8A038", Ghost: "#705898", Dragon: "#7038F8", Dark: "#705848",
  Steel: "#B8B8D0", Fairy: "#EE99AC",
};

const T = 1, S = 2, R = 0.5, N = 0;

// [attacker][defender]
const CHART: Record<PType, Partial<Record<PType, number>>> = {
  Normal:   { Rock: R, Ghost: N, Steel: R },
  Fire:     { Fire: R, Water: R, Grass: S, Ice: S, Bug: S, Rock: R, Dragon: R, Steel: S },
  Water:    { Fire: S, Water: R, Grass: R, Ground: S, Rock: S, Dragon: R },
  Electric: { Water: S, Electric: R, Grass: R, Ground: N, Flying: S, Dragon: R },
  Grass:    { Fire: R, Water: S, Grass: R, Poison: R, Ground: S, Flying: R, Bug: R, Rock: S, Dragon: R, Steel: R },
  Ice:      { Fire: R, Water: R, Grass: S, Ice: R, Ground: S, Flying: S, Dragon: S, Steel: R },
  Fighting: { Normal: S, Ice: S, Poison: R, Flying: R, Psychic: R, Bug: R, Rock: S, Ghost: N, Dark: S, Steel: S, Fairy: R },
  Poison:   { Grass: S, Poison: R, Ground: R, Rock: R, Ghost: R, Steel: N, Fairy: S },
  Ground:   { Fire: S, Electric: S, Grass: R, Poison: S, Flying: N, Bug: R, Rock: S, Steel: S },
  Flying:   { Electric: R, Grass: S, Fighting: S, Bug: S, Rock: R, Steel: R },
  Psychic:  { Fighting: S, Poison: S, Psychic: R, Dark: N, Steel: R },
  Bug:      { Fire: R, Grass: S, Fighting: R, Poison: R, Flying: R, Psychic: S, Ghost: R, Dark: S, Steel: R, Fairy: R },
  Rock:     { Fire: S, Ice: S, Fighting: R, Ground: R, Flying: S, Bug: S, Steel: R },
  Ghost:    { Normal: N, Psychic: S, Ghost: S, Dark: R },
  Dragon:   { Dragon: S, Steel: R, Fairy: N },
  Dark:     { Fighting: R, Psychic: S, Ghost: S, Dark: R, Fairy: R },
  Steel:    { Fire: R, Water: R, Electric: R, Ice: S, Rock: S, Steel: R, Fairy: S },
  Fairy:    { Fire: R, Fighting: S, Poison: R, Dragon: S, Dark: S, Steel: R },
};

export function typeMultiplier(att: PType, defenderTypes: (PType | null | undefined)[]): number {
  let mult = 1;
  for (const d of defenderTypes) {
    if (!d) continue;
    const v = CHART[att]?.[d];
    mult *= v == null ? T : v;
  }
  return mult;
}

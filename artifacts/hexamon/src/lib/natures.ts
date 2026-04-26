// 25 standard natures. Each nature boosts one stat 10% and lowers another 10%.
// "Neutral" natures (e.g. Hardy, Docile) have no effect.

export type StatKey = "atk" | "def" | "spa" | "spd" | "spe";

export type Nature = {
  name: string;
  plus: StatKey | null;
  minus: StatKey | null;
};

export const NATURES: Nature[] = [
  { name: "Hardy",   plus: null,  minus: null  },
  { name: "Lonely",  plus: "atk", minus: "def" },
  { name: "Brave",   plus: "atk", minus: "spe" },
  { name: "Adamant", plus: "atk", minus: "spa" },
  { name: "Naughty", plus: "atk", minus: "spd" },
  { name: "Bold",    plus: "def", minus: "atk" },
  { name: "Docile",  plus: null,  minus: null  },
  { name: "Relaxed", plus: "def", minus: "spe" },
  { name: "Impish",  plus: "def", minus: "spa" },
  { name: "Lax",     plus: "def", minus: "spd" },
  { name: "Timid",   plus: "spe", minus: "atk" },
  { name: "Hasty",   plus: "spe", minus: "def" },
  { name: "Serious", plus: null,  minus: null  },
  { name: "Jolly",   plus: "spe", minus: "spa" },
  { name: "Naive",   plus: "spe", minus: "spd" },
  { name: "Modest",  plus: "spa", minus: "atk" },
  { name: "Mild",    plus: "spa", minus: "def" },
  { name: "Quiet",   plus: "spa", minus: "spe" },
  { name: "Bashful", plus: null,  minus: null  },
  { name: "Rash",    plus: "spa", minus: "spd" },
  { name: "Calm",    plus: "spd", minus: "atk" },
  { name: "Gentle",  plus: "spd", minus: "def" },
  { name: "Sassy",   plus: "spd", minus: "spe" },
  { name: "Careful", plus: "spd", minus: "spa" },
  { name: "Quirky",  plus: null,  minus: null  },
];

export const NATURE_BY_NAME: Record<string, Nature> = Object.fromEntries(
  NATURES.map((n) => [n.name, n])
);

export function natureMult(nature: string | undefined, stat: StatKey): number {
  if (!nature) return 1;
  const n = NATURE_BY_NAME[nature];
  if (!n) return 1;
  if (n.plus === stat) return 1.1;
  if (n.minus === stat) return 0.9;
  return 1;
}

export function randomNatureName(): string {
  return NATURES[Math.floor(Math.random() * NATURES.length)].name;
}

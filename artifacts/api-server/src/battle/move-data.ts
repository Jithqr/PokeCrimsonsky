// Curated move data. ~80 moves cover 95% of the moves in pokemon-data.ts.
// Unknown moves fall back to a sensible Normal-type physical 60-power move.

import type { PType } from "./type-chart";

export type MoveCategory = "Physical" | "Special" | "Status";

export type StatusName = "Burn" | "Poison" | "Paralyze" | "Sleep" | "Freeze";

export type MoveDef = {
  name: string;
  type: PType;
  category: MoveCategory;
  power: number;
  accuracy: number;     // 0..100, 100 = always hits
  priority: number;     // -7..+5, default 0
  pp: number;
  // Optional secondary effect when the move lands.
  effect?: {
    chance: number;     // 0..1
    status?: StatusName;
    statChange?: { target: "self" | "opponent"; stat: "atk" | "def" | "spa" | "spd" | "spe" | "acc" | "eva"; stages: number };
  };
  // Optional flavor text shown in the battle log.
  flavor?: string;
};

const M: MoveDef[] = [
  // --- Normal physical / special ---
  { name: "Tackle",        type: "Normal", category: "Physical", power: 40,  accuracy: 100, priority: 0, pp: 35 },
  { name: "Body Slam",     type: "Normal", category: "Physical", power: 85,  accuracy: 100, priority: 0, pp: 15, effect: { chance: 0.30, status: "Paralyze" } },
  { name: "Double Edge",   type: "Normal", category: "Physical", power: 120, accuracy: 100, priority: 0, pp: 15 },
  { name: "Hyper Beam",    type: "Normal", category: "Special",  power: 150, accuracy: 90,  priority: 0, pp: 5  },
  { name: "Quick Attack",  type: "Normal", category: "Physical", power: 40,  accuracy: 100, priority: 1, pp: 30 },
  { name: "Extreme Speed", type: "Normal", category: "Physical", power: 80,  accuracy: 100, priority: 2, pp: 5  },
  { name: "Hyper Voice",   type: "Normal", category: "Special",  power: 90,  accuracy: 100, priority: 0, pp: 10 },
  { name: "Slash",         type: "Normal", category: "Physical", power: 70,  accuracy: 100, priority: 0, pp: 20 },

  // --- Fire ---
  { name: "Ember",         type: "Fire", category: "Special", power: 40,  accuracy: 100, priority: 0, pp: 25, effect: { chance: 0.10, status: "Burn" } },
  { name: "Flamethrower",  type: "Fire", category: "Special", power: 90,  accuracy: 100, priority: 0, pp: 15, effect: { chance: 0.10, status: "Burn" } },
  { name: "Fire Blast",    type: "Fire", category: "Special", power: 110, accuracy: 85,  priority: 0, pp: 5,  effect: { chance: 0.10, status: "Burn" } },
  { name: "Fire Punch",    type: "Fire", category: "Physical", power: 75,  accuracy: 100, priority: 0, pp: 15, effect: { chance: 0.10, status: "Burn" } },
  { name: "Flare Blitz",   type: "Fire", category: "Physical", power: 120, accuracy: 100, priority: 0, pp: 15, effect: { chance: 0.10, status: "Burn" } },
  { name: "Heat Wave",     type: "Fire", category: "Special", power: 95,  accuracy: 90,  priority: 0, pp: 10, effect: { chance: 0.10, status: "Burn" } },

  // --- Water ---
  { name: "Water Gun",     type: "Water", category: "Special", power: 40,  accuracy: 100, priority: 0, pp: 25 },
  { name: "Surf",          type: "Water", category: "Special", power: 90,  accuracy: 100, priority: 0, pp: 15 },
  { name: "Hydro Pump",    type: "Water", category: "Special", power: 110, accuracy: 80,  priority: 0, pp: 5  },
  { name: "Aqua Jet",      type: "Water", category: "Physical", power: 40,  accuracy: 100, priority: 1, pp: 20 },
  { name: "Waterfall",     type: "Water", category: "Physical", power: 80,  accuracy: 100, priority: 0, pp: 15 },
  { name: "Liquidation",   type: "Water", category: "Physical", power: 85,  accuracy: 100, priority: 0, pp: 10 },

  // --- Electric ---
  { name: "Thunder Shock", type: "Electric", category: "Special", power: 40,  accuracy: 100, priority: 0, pp: 30, effect: { chance: 0.10, status: "Paralyze" } },
  { name: "Thunderbolt",   type: "Electric", category: "Special", power: 90,  accuracy: 100, priority: 0, pp: 15, effect: { chance: 0.10, status: "Paralyze" } },
  { name: "Thunder",       type: "Electric", category: "Special", power: 110, accuracy: 70,  priority: 0, pp: 10, effect: { chance: 0.30, status: "Paralyze" } },
  { name: "Thunder Wave",  type: "Electric", category: "Status",  power: 0,   accuracy: 90,  priority: 0, pp: 20, effect: { chance: 1.0, status: "Paralyze" } },
  { name: "Thunder Punch", type: "Electric", category: "Physical", power: 75,  accuracy: 100, priority: 0, pp: 15, effect: { chance: 0.10, status: "Paralyze" } },
  { name: "Volt Tackle",   type: "Electric", category: "Physical", power: 120, accuracy: 100, priority: 0, pp: 15, effect: { chance: 0.10, status: "Paralyze" } },

  // --- Grass ---
  { name: "Vine Whip",     type: "Grass", category: "Physical", power: 45, accuracy: 100, priority: 0, pp: 25 },
  { name: "Razor Leaf",    type: "Grass", category: "Physical", power: 55, accuracy: 95,  priority: 0, pp: 25 },
  { name: "Solar Beam",    type: "Grass", category: "Special",  power: 120,accuracy: 100, priority: 0, pp: 10 },
  { name: "Energy Ball",   type: "Grass", category: "Special",  power: 90, accuracy: 100, priority: 0, pp: 10 },
  { name: "Power Whip",    type: "Grass", category: "Physical", power: 120,accuracy: 85,  priority: 0, pp: 10 },
  { name: "Leaf Blade",    type: "Grass", category: "Physical", power: 90, accuracy: 100, priority: 0, pp: 15 },
  { name: "Giga Drain",    type: "Grass", category: "Special",  power: 75, accuracy: 100, priority: 0, pp: 10 },
  { name: "Synthesis",     type: "Grass", category: "Status",   power: 0,  accuracy: 100, priority: 0, pp: 5  },
  { name: "Worry Seed",    type: "Grass", category: "Status",   power: 0,  accuracy: 100, priority: 0, pp: 10 },

  // --- Ice ---
  { name: "Ice Punch",     type: "Ice", category: "Physical", power: 75,  accuracy: 100, priority: 0, pp: 15, effect: { chance: 0.10, status: "Freeze" } },
  { name: "Ice Beam",      type: "Ice", category: "Special",  power: 90,  accuracy: 100, priority: 0, pp: 10, effect: { chance: 0.10, status: "Freeze" } },
  { name: "Blizzard",      type: "Ice", category: "Special",  power: 110, accuracy: 70,  priority: 0, pp: 5,  effect: { chance: 0.10, status: "Freeze" } },
  { name: "Icicle Crash",  type: "Ice", category: "Physical", power: 85,  accuracy: 90,  priority: 0, pp: 10 },

  // --- Fighting ---
  { name: "Karate Chop",   type: "Fighting", category: "Physical", power: 50,  accuracy: 100, priority: 0, pp: 25 },
  { name: "Brick Break",   type: "Fighting", category: "Physical", power: 75,  accuracy: 100, priority: 0, pp: 15 },
  { name: "Close Combat",  type: "Fighting", category: "Physical", power: 120, accuracy: 100, priority: 0, pp: 5  },
  { name: "Aura Sphere",   type: "Fighting", category: "Special",  power: 80,  accuracy: 100, priority: 0, pp: 20 },
  { name: "Dynamic Punch", type: "Fighting", category: "Physical", power: 100, accuracy: 50,  priority: 0, pp: 5  },
  { name: "Superpower",    type: "Fighting", category: "Physical", power: 120, accuracy: 100, priority: 0, pp: 5  },
  { name: "Mach Punch",    type: "Fighting", category: "Physical", power: 40,  accuracy: 100, priority: 1, pp: 30 },

  // --- Poison ---
  { name: "Poison Sting",  type: "Poison", category: "Physical", power: 15, accuracy: 100, priority: 0, pp: 35, effect: { chance: 0.30, status: "Poison" } },
  { name: "Poison Jab",    type: "Poison", category: "Physical", power: 80, accuracy: 100, priority: 0, pp: 20, effect: { chance: 0.30, status: "Poison" } },
  { name: "Sludge Bomb",   type: "Poison", category: "Special",  power: 90, accuracy: 100, priority: 0, pp: 10, effect: { chance: 0.30, status: "Poison" } },
  { name: "Toxic",         type: "Poison", category: "Status",   power: 0,  accuracy: 90,  priority: 0, pp: 10, effect: { chance: 1.0, status: "Poison" } },

  // --- Ground ---
  { name: "Earthquake",    type: "Ground", category: "Physical", power: 100, accuracy: 100, priority: 0, pp: 10 },
  { name: "Dig",           type: "Ground", category: "Physical", power: 80,  accuracy: 100, priority: 0, pp: 10 },
  { name: "Earth Power",   type: "Ground", category: "Special",  power: 90,  accuracy: 100, priority: 0, pp: 10 },

  // --- Flying ---
  { name: "Wing Attack",   type: "Flying", category: "Physical", power: 60, accuracy: 100, priority: 0, pp: 35 },
  { name: "Aerial Ace",    type: "Flying", category: "Physical", power: 60, accuracy: 100, priority: 0, pp: 20 },
  { name: "Brave Bird",    type: "Flying", category: "Physical", power: 120,accuracy: 100, priority: 0, pp: 15 },
  { name: "Air Slash",     type: "Flying", category: "Special",  power: 75, accuracy: 95,  priority: 0, pp: 15 },
  { name: "Hurricane",     type: "Flying", category: "Special",  power: 110,accuracy: 70,  priority: 0, pp: 10 },

  // --- Psychic ---
  { name: "Confusion",     type: "Psychic", category: "Special", power: 50, accuracy: 100, priority: 0, pp: 25 },
  { name: "Psychic",       type: "Psychic", category: "Special", power: 90, accuracy: 100, priority: 0, pp: 10 },
  { name: "Psybeam",       type: "Psychic", category: "Special", power: 65, accuracy: 100, priority: 0, pp: 20 },
  { name: "Zen Headbutt",  type: "Psychic", category: "Physical", power: 80, accuracy: 90,  priority: 0, pp: 15 },
  { name: "Future Sight",  type: "Psychic", category: "Special", power: 120,accuracy: 100, priority: 0, pp: 10 },

  // --- Bug ---
  { name: "Bug Bite",      type: "Bug", category: "Physical", power: 60, accuracy: 100, priority: 0, pp: 20 },
  { name: "X-Scissor",     type: "Bug", category: "Physical", power: 80, accuracy: 100, priority: 0, pp: 15 },
  { name: "Bug Buzz",      type: "Bug", category: "Special",  power: 90, accuracy: 100, priority: 0, pp: 10 },
  { name: "U-turn",        type: "Bug", category: "Physical", power: 70, accuracy: 100, priority: 0, pp: 20 },

  // --- Rock ---
  { name: "Rock Throw",    type: "Rock", category: "Physical", power: 50,  accuracy: 90,  priority: 0, pp: 15 },
  { name: "Rock Slide",    type: "Rock", category: "Physical", power: 75,  accuracy: 90,  priority: 0, pp: 10 },
  { name: "Stone Edge",    type: "Rock", category: "Physical", power: 100, accuracy: 80,  priority: 0, pp: 5  },
  { name: "Power Gem",     type: "Rock", category: "Special",  power: 80,  accuracy: 100, priority: 0, pp: 20 },

  // --- Ghost ---
  { name: "Lick",          type: "Ghost", category: "Physical", power: 30, accuracy: 100, priority: 0, pp: 30, effect: { chance: 0.30, status: "Paralyze" } },
  { name: "Shadow Ball",   type: "Ghost", category: "Special",  power: 80, accuracy: 100, priority: 0, pp: 15 },
  { name: "Shadow Claw",   type: "Ghost", category: "Physical", power: 70, accuracy: 100, priority: 0, pp: 15 },
  { name: "Shadow Sneak",  type: "Ghost", category: "Physical", power: 40, accuracy: 100, priority: 1, pp: 30 },
  { name: "Hex",           type: "Ghost", category: "Special",  power: 65, accuracy: 100, priority: 0, pp: 10 },

  // --- Dragon ---
  { name: "Dragon Claw",   type: "Dragon", category: "Physical", power: 80, accuracy: 100, priority: 0, pp: 15 },
  { name: "Dragon Pulse",  type: "Dragon", category: "Special",  power: 85, accuracy: 100, priority: 0, pp: 10 },
  { name: "Outrage",       type: "Dragon", category: "Physical", power: 120,accuracy: 100, priority: 0, pp: 10 },
  { name: "Draco Meteor",  type: "Dragon", category: "Special",  power: 130,accuracy: 90,  priority: 0, pp: 5  },

  // --- Dark ---
  { name: "Bite",          type: "Dark", category: "Physical", power: 60, accuracy: 100, priority: 0, pp: 25 },
  { name: "Crunch",        type: "Dark", category: "Physical", power: 80, accuracy: 100, priority: 0, pp: 15 },
  { name: "Dark Pulse",    type: "Dark", category: "Special",  power: 80, accuracy: 100, priority: 0, pp: 15 },
  { name: "Foul Play",     type: "Dark", category: "Physical", power: 95, accuracy: 100, priority: 0, pp: 15 },
  { name: "Sucker Punch",  type: "Dark", category: "Physical", power: 70, accuracy: 100, priority: 1, pp: 5  },

  // --- Steel ---
  { name: "Iron Head",     type: "Steel", category: "Physical", power: 80, accuracy: 100, priority: 0, pp: 15 },
  { name: "Iron Tail",     type: "Steel", category: "Physical", power: 100,accuracy: 75,  priority: 0, pp: 15 },
  { name: "Flash Cannon",  type: "Steel", category: "Special",  power: 80, accuracy: 100, priority: 0, pp: 10 },
  { name: "Meteor Mash",   type: "Steel", category: "Physical", power: 90, accuracy: 90,  priority: 0, pp: 10 },

  // --- Fairy ---
  { name: "Fairy Wind",    type: "Fairy", category: "Special",  power: 40, accuracy: 100, priority: 0, pp: 30 },
  { name: "Moonblast",     type: "Fairy", category: "Special",  power: 95, accuracy: 100, priority: 0, pp: 15 },
  { name: "Play Rough",    type: "Fairy", category: "Physical", power: 90, accuracy: 90,  priority: 0, pp: 10 },
  { name: "Dazzling Gleam",type: "Fairy", category: "Special",  power: 80, accuracy: 100, priority: 0, pp: 10 },

  // --- Status / utility (treated as no-damage) ---
  { name: "Protect",       type: "Normal", category: "Status", power: 0, accuracy: 100, priority: 4, pp: 10 },
  { name: "Swords Dance",  type: "Normal", category: "Status", power: 0, accuracy: 100, priority: 0, pp: 20, effect: { chance: 1.0, statChange: { target: "self", stat: "atk", stages: 2 } } },
  { name: "Calm Mind",     type: "Psychic",category: "Status", power: 0, accuracy: 100, priority: 0, pp: 20, effect: { chance: 1.0, statChange: { target: "self", stat: "spa", stages: 1 } } },
  { name: "Recover",       type: "Normal", category: "Status", power: 0, accuracy: 100, priority: 0, pp: 5  },
  { name: "Spiky Shield",  type: "Grass",  category: "Status", power: 0, accuracy: 100, priority: 4, pp: 10 },
  { name: "Will-O-Wisp",   type: "Fire",   category: "Status", power: 0, accuracy: 85,  priority: 0, pp: 15, effect: { chance: 1.0, status: "Burn" } },
];

const MOVE_BY_NAME: Record<string, MoveDef> = Object.fromEntries(M.map((m) => [m.name, m]));

const FALLBACK: MoveDef = {
  name: "Struggle", type: "Normal", category: "Physical",
  power: 50, accuracy: 100, priority: 0, pp: 1,
};

// Some Pokémon entries use names not in the curated table.
// Hand-pick a default type/category by keyword for those.
const KEYWORD_FALLBACKS: { rx: RegExp; pType: PType; cat: MoveCategory; power: number }[] = [
  { rx: /flame|fire|inferno|burn|magma|ember/i, pType: "Fire",     cat: "Special",  power: 70 },
  { rx: /aqua|water|hydro|wave|surf|tide|bubble/i, pType: "Water", cat: "Special",  power: 70 },
  { rx: /thunder|electric|spark|volt|zap/i,   pType: "Electric", cat: "Special",  power: 70 },
  { rx: /leaf|grass|seed|vine|petal|bloom/i,   pType: "Grass",    cat: "Physical", power: 70 },
  { rx: /ice|frost|freeze|blizzard|chill/i,    pType: "Ice",      cat: "Special",  power: 70 },
  { rx: /punch|kick|chop|fist|combat|brick/i,  pType: "Fighting", cat: "Physical", power: 75 },
  { rx: /poison|toxic|sludge|venom/i,          pType: "Poison",   cat: "Physical", power: 70 },
  { rx: /earth|ground|quake|dig|sand/i,        pType: "Ground",   cat: "Physical", power: 75 },
  { rx: /wing|fly|aerial|gust|peck|sky/i,      pType: "Flying",   cat: "Physical", power: 70 },
  { rx: /psy|mind|future|telekin/i,            pType: "Psychic",  cat: "Special",  power: 70 },
  { rx: /bug|insect/i,                         pType: "Bug",      cat: "Physical", power: 65 },
  { rx: /rock|stone|boulder/i,                 pType: "Rock",     cat: "Physical", power: 75 },
  { rx: /ghost|shadow|spirit|haze|hex/i,       pType: "Ghost",    cat: "Special",  power: 70 },
  { rx: /dragon|draco|outrage/i,               pType: "Dragon",   cat: "Special",  power: 80 },
  { rx: /dark|night|crunch|foul|bite/i,        pType: "Dark",     cat: "Physical", power: 70 },
  { rx: /steel|iron|metal|gear|bolt/i,         pType: "Steel",    cat: "Physical", power: 75 },
  { rx: /fairy|moon|charm|fairy/i,             pType: "Fairy",    cat: "Special",  power: 70 },
];

export function getMove(name: string): MoveDef {
  const m = MOVE_BY_NAME[name];
  if (m) return m;
  for (const kw of KEYWORD_FALLBACKS) {
    if (kw.rx.test(name)) {
      return {
        name, type: kw.pType, category: kw.cat, power: kw.power,
        accuracy: 100, priority: 0, pp: 15,
      };
    }
  }
  return { ...FALLBACK, name };
}

export const ALL_MOVES = M;

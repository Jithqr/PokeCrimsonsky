// Predefined NPC trainer profiles for the League system.
// 8 Gym Leaders (escalating levels) + 4 Elite Four members.
// Each entry has full move sets, IVs, natures — used to seed BattleMons via
// fromAppMon() so battles use the real engine.

import { ALL_POKEMON, type PokemonTemplate } from "./pokemon-data";

export type NpcMon = {
  speciesName: string;          // matches ALL_POKEMON.name (case-sensitive)
  level: number;
  nature: string;
  ivs?: { hp?: number; atk?: number; def?: number; spa?: number; spd?: number; spe?: number };
  moves: string[];              // 4 move names; engine fills PP
};

export type NpcTrainer = {
  id: string;
  name: string;
  title: string;
  type: string;                 // signature type, for theming
  color: string;                // accent colour
  emoji: string;                // small avatar
  reward: { money: number; stardust: number };
  team: NpcMon[];
};

const PERFECT: NpcMon["ivs"] = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
const STRONG : NpcMon["ivs"] = { hp: 25, atk: 25, def: 25, spa: 25, spd: 25, spe: 25 };
const SOLID  : NpcMon["ivs"] = { hp: 18, atk: 18, def: 18, spa: 18, spd: 18, spe: 18 };

// ---- Gym Leaders (in unlock order) ----

export const GYM_LEADERS: NpcTrainer[] = [
  {
    id: "gym1", name: "Brock", title: "Rock-Solid Defender", type: "Rock",
    color: "#B8A038", emoji: "🪨",
    reward: { money: 1500, stardust: 50 },
    team: [
      { speciesName: "Geodude",    level: 22, nature: "Adamant", ivs: SOLID, moves: ["Rock Throw", "Tackle", "Rock Slide", "Earthquake"] },
      { speciesName: "Onix",       level: 25, nature: "Impish",  ivs: SOLID, moves: ["Rock Throw", "Bite", "Iron Tail", "Earthquake"] },
      { speciesName: "Rhyhorn",    level: 24, nature: "Adamant", ivs: SOLID, moves: ["Stone Edge", "Earthquake", "Iron Head", "Rock Slide"] },
    ],
  },
  {
    id: "gym2", name: "Misty", title: "Tidal Princess", type: "Water",
    color: "#6890F0", emoji: "🌊",
    reward: { money: 2500, stardust: 80 },
    team: [
      { speciesName: "Staryu",     level: 28, nature: "Timid",   ivs: SOLID,  moves: ["Water Gun", "Psychic", "Recover", "Ice Beam"] },
      { speciesName: "Starmie",    level: 31, nature: "Modest",  ivs: STRONG, moves: ["Hydro Pump", "Psychic", "Ice Beam", "Recover"] },
      { speciesName: "Goldeen",    level: 30, nature: "Adamant", ivs: SOLID,  moves: ["Waterfall", "Aqua Jet", "Iron Tail", "Surf"] },
    ],
  },
  {
    id: "gym3", name: "Lt. Surge", title: "Lightning American", type: "Electric",
    color: "#F8D030", emoji: "⚡",
    reward: { money: 3500, stardust: 110 },
    team: [
      { speciesName: "Voltorb",    level: 35, nature: "Timid",   ivs: STRONG, moves: ["Thunderbolt", "Thunder Wave", "Hyper Beam", "Spark" ] },
      { speciesName: "Magneton",   level: 37, nature: "Modest",  ivs: STRONG, moves: ["Thunderbolt", "Flash Cannon", "Thunder Wave", "Volt Tackle"] },
      { speciesName: "Pikachu",    level: 36, nature: "Jolly",   ivs: STRONG, moves: ["Volt Tackle", "Iron Tail", "Quick Attack", "Thunderbolt"] },
      { speciesName: "Raichu",     level: 38, nature: "Jolly",   ivs: STRONG, moves: ["Thunder Punch", "Quick Attack", "Iron Tail", "Thunderbolt"] },
    ],
  },
  {
    id: "gym4", name: "Erika", title: "Nature Loving Princess", type: "Grass",
    color: "#78C850", emoji: "🌸",
    reward: { money: 4500, stardust: 150 },
    team: [
      { speciesName: "Bellsprout", level: 41, nature: "Modest",  ivs: STRONG, moves: ["Razor Leaf", "Sludge Bomb", "Toxic", "Energy Ball"] },
      { speciesName: "Tangela",    level: 43, nature: "Bold",    ivs: STRONG, moves: ["Power Whip", "Giga Drain", "Sleep Powder", "Synthesis"] },
      { speciesName: "Vileplume",  level: 44, nature: "Modest",  ivs: STRONG, moves: ["Solar Beam", "Sludge Bomb", "Moonblast", "Synthesis"] },
      { speciesName: "Gloom",      level: 42, nature: "Bold",    ivs: STRONG, moves: ["Petal Dance", "Sludge Bomb", "Giga Drain", "Toxic"] },
    ],
  },
  {
    id: "gym5", name: "Sabrina", title: "Master of Psychic Pokémon", type: "Psychic",
    color: "#F85888", emoji: "🔮",
    reward: { money: 6000, stardust: 200 },
    team: [
      { speciesName: "Kadabra",    level: 48, nature: "Timid",   ivs: STRONG, moves: ["Psychic", "Future Sight", "Calm Mind", "Shadow Ball"] },
      { speciesName: "Alakazam",   level: 51, nature: "Timid",   ivs: PERFECT,moves: ["Psychic", "Aura Sphere", "Shadow Ball", "Calm Mind"] },
      { speciesName: "Mr. Mime",   level: 49, nature: "Modest",  ivs: STRONG, moves: ["Psybeam", "Dazzling Gleam", "Calm Mind", "Hyper Voice"] },
      { speciesName: "Venomoth",   level: 50, nature: "Timid",   ivs: STRONG, moves: ["Bug Buzz", "Psychic", "Sleep Powder", "Air Slash"] },
    ],
  },
  {
    id: "gym6", name: "Blaine", title: "Fiery Fanatic", type: "Fire",
    color: "#F08030", emoji: "🔥",
    reward: { money: 8000, stardust: 260 },
    team: [
      { speciesName: "Growlithe",  level: 55, nature: "Adamant", ivs: STRONG, moves: ["Flare Blitz", "Fire Punch", "Crunch", "Extreme Speed"] },
      { speciesName: "Ponyta",     level: 56, nature: "Jolly",   ivs: STRONG, moves: ["Flare Blitz", "Quick Attack", "Stomp", "Wild Charge"] },
      { speciesName: "Rapidash",   level: 58, nature: "Jolly",   ivs: PERFECT,moves: ["Flare Blitz", "Wild Charge", "Megahorn", "Quick Attack"] },
      { speciesName: "Arcanine",   level: 60, nature: "Adamant", ivs: PERFECT,moves: ["Flare Blitz", "Extreme Speed", "Wild Charge", "Crunch"] },
    ],
  },
  {
    id: "gym7", name: "Giovanni", title: "Mafia Boss", type: "Ground",
    color: "#E0C068", emoji: "🦂",
    reward: { money: 11000, stardust: 340 },
    team: [
      { speciesName: "Rhyhorn",    level: 62, nature: "Adamant", ivs: STRONG, moves: ["Earthquake", "Stone Edge", "Iron Head", "Megahorn"] },
      { speciesName: "Dugtrio",    level: 63, nature: "Jolly",   ivs: STRONG, moves: ["Earthquake", "Stone Edge", "Sucker Punch", "Iron Head"] },
      { speciesName: "Nidoking",   level: 65, nature: "Modest",  ivs: PERFECT,moves: ["Earth Power", "Sludge Bomb", "Ice Beam", "Thunderbolt"] },
      { speciesName: "Nidoqueen",  level: 65, nature: "Bold",    ivs: PERFECT,moves: ["Earth Power", "Sludge Bomb", "Ice Beam", "Body Slam"] },
      { speciesName: "Rhydon",     level: 67, nature: "Adamant", ivs: PERFECT,moves: ["Earthquake", "Stone Edge", "Megahorn", "Iron Head"] },
    ],
  },
  {
    id: "gym8", name: "Lance", title: "Dragon Master", type: "Dragon",
    color: "#7038F8", emoji: "🐉",
    reward: { money: 15000, stardust: 450 },
    team: [
      { speciesName: "Dragonair",  level: 72, nature: "Modest",  ivs: STRONG, moves: ["Dragon Pulse", "Ice Beam", "Thunderbolt", "Surf"] },
      { speciesName: "Gyarados",   level: 74, nature: "Adamant", ivs: PERFECT,moves: ["Waterfall", "Earthquake", "Crunch", "Outrage"] },
      { speciesName: "Aerodactyl", level: 73, nature: "Jolly",   ivs: PERFECT,moves: ["Stone Edge", "Earthquake", "Aerial Ace", "Crunch"] },
      { speciesName: "Charizard",  level: 75, nature: "Modest",  ivs: PERFECT,moves: ["Flamethrower", "Air Slash", "Dragon Pulse", "Solar Beam"] },
      { speciesName: "Dragonite",  level: 78, nature: "Adamant", ivs: PERFECT,moves: ["Outrage", "Earthquake", "Extreme Speed", "Fire Punch"] },
    ],
  },
];

// ---- Elite 4 (must be cleared in this order, no healing between) ----

export const ELITE_FOUR: NpcTrainer[] = [
  {
    id: "e4_1", name: "Lorelei", title: "Ice Cold Tactician", type: "Ice",
    color: "#98D8D8", emoji: "❄️",
    reward: { money: 20000, stardust: 600 },
    team: [
      { speciesName: "Dewgong",    level: 80, nature: "Modest",  ivs: PERFECT, moves: ["Ice Beam", "Surf", "Dragon Pulse", "Recover"] },
      { speciesName: "Cloyster",   level: 82, nature: "Adamant", ivs: PERFECT, moves: ["Icicle Crash", "Liquidation", "Iron Head", "Rock Slide"] },
      { speciesName: "Slowbro",    level: 81, nature: "Bold",    ivs: PERFECT, moves: ["Surf", "Psychic", "Ice Beam", "Calm Mind"] },
      { speciesName: "Jynx",       level: 83, nature: "Timid",   ivs: PERFECT, moves: ["Blizzard", "Psychic", "Lovely Kiss", "Dazzling Gleam"] },
      { speciesName: "Lapras",     level: 85, nature: "Modest",  ivs: PERFECT, moves: ["Ice Beam", "Hydro Pump", "Thunderbolt", "Sing"] },
    ],
  },
  {
    id: "e4_2", name: "Bruno", title: "Fighting Maniac", type: "Fighting",
    color: "#C03028", emoji: "🥊",
    reward: { money: 25000, stardust: 750 },
    team: [
      { speciesName: "Onix",       level: 84, nature: "Impish",  ivs: PERFECT, moves: ["Stone Edge", "Earthquake", "Iron Head", "Body Slam"] },
      { speciesName: "Hitmonchan", level: 85, nature: "Adamant", ivs: PERFECT, moves: ["Mach Punch", "Close Combat", "Ice Punch", "Fire Punch"] },
      { speciesName: "Hitmonlee",  level: 85, nature: "Jolly",   ivs: PERFECT, moves: ["Mach Punch", "Close Combat", "Stone Edge", "Earthquake"] },
      { speciesName: "Onix",       level: 86, nature: "Adamant", ivs: PERFECT, moves: ["Stone Edge", "Earthquake", "Iron Head", "Crunch"] },
      { speciesName: "Machamp",    level: 88, nature: "Adamant", ivs: PERFECT, moves: ["Close Combat", "Stone Edge", "Earthquake", "Bullet Punch"] },
    ],
  },
  {
    id: "e4_3", name: "Agatha", title: "Spectral Witch", type: "Ghost",
    color: "#705898", emoji: "👻",
    reward: { money: 30000, stardust: 900 },
    team: [
      { speciesName: "Gengar",     level: 86, nature: "Timid",   ivs: PERFECT, moves: ["Shadow Ball", "Sludge Bomb", "Dazzling Gleam", "Thunderbolt"] },
      { speciesName: "Golbat",     level: 86, nature: "Jolly",   ivs: PERFECT, moves: ["Air Slash", "Crunch", "Brave Bird", "Poison Jab"] },
      { speciesName: "Haunter",    level: 88, nature: "Timid",   ivs: PERFECT, moves: ["Shadow Ball", "Sludge Bomb", "Hex", "Dark Pulse"] },
      { speciesName: "Arbok",      level: 88, nature: "Adamant", ivs: PERFECT, moves: ["Poison Jab", "Crunch", "Earthquake", "Iron Tail"] },
      { speciesName: "Gengar",     level: 90, nature: "Timid",   ivs: PERFECT, moves: ["Shadow Ball", "Sludge Bomb", "Dazzling Gleam", "Hex"] },
    ],
  },
  {
    id: "e4_4", name: "Lance", title: "Dragon Sovereign", type: "Dragon",
    color: "#7038F8", emoji: "🐲",
    reward: { money: 50000, stardust: 1500 },
    team: [
      { speciesName: "Gyarados",   level: 90, nature: "Adamant", ivs: PERFECT, moves: ["Waterfall", "Earthquake", "Crunch", "Outrage"] },
      { speciesName: "Dragonair",  level: 90, nature: "Modest",  ivs: PERFECT, moves: ["Dragon Pulse", "Ice Beam", "Thunderbolt", "Aqua Tail"] },
      { speciesName: "Dragonair",  level: 90, nature: "Modest",  ivs: PERFECT, moves: ["Dragon Pulse", "Ice Beam", "Thunderbolt", "Surf"] },
      { speciesName: "Aerodactyl", level: 92, nature: "Jolly",   ivs: PERFECT, moves: ["Stone Edge", "Earthquake", "Aerial Ace", "Crunch"] },
      { speciesName: "Dragonite",  level: 95, nature: "Adamant", ivs: PERFECT, moves: ["Outrage", "Extreme Speed", "Earthquake", "Fire Punch"] },
    ],
  },
];

// ---- Helpers ----

export function tryFindSpecies(name: string): PokemonTemplate | null {
  const lower = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return ALL_POKEMON.find((p) => p.name.toLowerCase().replace(/[^a-z0-9]/g, "") === lower) ?? null;
}

/** Resolve an NpcMon into raw data the engine's fromAppMon can consume. */
export function npcMonToAppMon(n: NpcMon) {
  const tpl = tryFindSpecies(n.speciesName);
  if (!tpl) {
    // Fallback: synthetic Normal-type with mid stats so the battle still works.
    return {
      id: 0, name: n.speciesName, type1: "Normal", type2: null, level: n.level,
      hp: 60, atk: 60, def: 60, spa: 60, spd: 60, spe: 60,
      ivAtk: n.ivs?.atk ?? 25, ivDef: n.ivs?.def ?? 25, ivHp: n.ivs?.hp ?? 25,
      ivSpa: n.ivs?.spa ?? 25, ivSpd: n.ivs?.spd ?? 25, ivSpe: n.ivs?.spe ?? 25,
      evHp: 0, evAtk: 0, evDef: 0, evSpa: 0, evSpd: 0, evSpe: 0,
      nature: n.nature, moves: n.moves, sprite: n.speciesName.toLowerCase(),
    };
  }
  return {
    id: tpl.id, name: tpl.name, type1: tpl.type1, type2: tpl.type2, level: n.level,
    hp: tpl.hp, atk: tpl.atk, def: tpl.def, spa: tpl.spa, spd: (tpl as any).spd ?? tpl.spa, spe: tpl.spe,
    ivAtk: n.ivs?.atk ?? 25, ivDef: n.ivs?.def ?? 25, ivHp: n.ivs?.hp ?? 25,
    ivSpa: n.ivs?.spa ?? 25, ivSpd: n.ivs?.spd ?? 25, ivSpe: n.ivs?.spe ?? 25,
    evHp: 0, evAtk: 0, evDef: 0, evSpa: 0, evSpd: 0, evSpe: 0,
    nature: n.nature, moves: n.moves, sprite: tpl.sprite,
  };
}

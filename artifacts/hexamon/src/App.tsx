import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { sfx, playMoveSfx, moveTypeOf, TYPE_COLOR as MOVE_TYPE_COLOR } from "./sfx";
import { ALL_POKEMON, TOTAL_POKEMON, GEN_NAMES, type PokemonTemplate } from "./lib/pokemon-data";
import { tmStoreItems } from "./lib/tm-data";
import { PokeTalesDex } from "./components/PokeTalesDex";
import { SplashLoader } from "./components/SplashLoader";
import BattleArena from "./components/BattleArena";
import TrainingZone from "./components/TrainingZone";
import LeagueScreen from "./components/LeagueScreen";
import safariForestBg from "@assets/6155a54f-3b2d-4298-911f-596582b8196c_1777290294414.jpeg";
import huntForestBg from "@assets/0d36e278-0668-4064-8738-4427560706e9_1777293871555.jpeg";
import battleArenaBg from "@assets/images_(5)_1777294187407.jpeg";
import { GYM_LEADERS, ELITE_FOUR, npcMonToAppMon, type NpcTrainer } from "./lib/league-data";
import {
  fromAppMon, makeBattleState, resolveTurn, forceSwitch, calcMaxHp,
  type Action as BAction, type BattleMon, type BattleState, type Team as BTeam,
} from "./lib/battle-engine";
import { chooseBotAction, pickBotForceSwitch } from "./lib/bot-ai";
import { getMove } from "./lib/move-data";

const SPRITE = (name: string) => `https://play.pokemonshowdown.com/sprites/ani/${name.replace(/[^a-z0-9]/g, "")}.gif`;
const SPRITE_BACK = (name: string) => `https://play.pokemonshowdown.com/sprites/ani-back/${name.replace(/[^a-z0-9]/g, "")}.gif`;
const TRAINER_SPRITE = (name: string) => `https://play.pokemonshowdown.com/sprites/trainers/${name}.png`;

const CUSTOM_SPRITES: Record<string, string> = {
  irontreads: "sprites/custom/irontreads.gif",
  ironbundle: "sprites/custom/ironbundle.gif",
  ironhands: "sprites/custom/ironhands.gif",
  ironjugulis: "sprites/custom/ironjugulis.gif",
  ironmoth: "sprites/custom/ironmoth.gif",
  ironthorns: "sprites/custom/ironthorns.gif",
  wochien: "sprites/custom/wochien.gif",
  chienpao: "sprites/custom/chienpao.gif",
  tinglu: "sprites/custom/tinglu.gif",
  chiyu: "sprites/custom/chiyu.gif",
  ironvaliant: "sprites/custom/ironvaliant.gif",
  miraidon: "sprites/custom/miraidon.gif",
  ironleaves: "sprites/custom/ironleaves.gif",
  okidogi: "sprites/custom/okidogi.gif",
  munkidori: "sprites/custom/munkidori.gif",
  fezandipiti: "sprites/custom/fezandipiti.gif",
  ogerpon: "sprites/custom/ogerpon.gif",
  ironboulder: "sprites/custom/ironboulder.gif",
  ironcrown: "sprites/custom/ironcrown.gif",
  terapagos: "sprites/custom/terapagos.gif",
  pecharunt: "sprites/custom/pecharunt.gif",
};
const CUSTOM_SPRITE_URL = (clean: string) =>
  CUSTOM_SPRITES[clean] ? `${import.meta.env.BASE_URL}${CUSTOM_SPRITES[clean]}` : null;
const GEN_V_TRAINERS = [
  "hilbert", "hilda", "cheren", "bianca", "n", "ghetsis", "alder",
  "cilan", "chili", "cress", "lenora", "burgh", "elesa", "clay", "skyla", "brycen", "drayden", "iris",
];


const TEAM_MAX = 6;
const TEAM_MIN = 1;

const TYPE_COLORS: Record<string, string> = {
  Normal:"#A8A878",Fire:"#F08030",Water:"#6890F0",Grass:"#78C850",Electric:"#F8D030",
  Ice:"#98D8D8",Fighting:"#C03028",Poison:"#A040A0",Ground:"#E0C068",Flying:"#A890F0",
  Psychic:"#F85888",Bug:"#A8B820",Rock:"#B8A038",Ghost:"#705898",Dragon:"#7038F8",
  Dark:"#705848",Steel:"#B8B8D0",Fairy:"#EE99AC",
};

const MOVE_POWER: Record<string, number> = {
  Tackle:40,"Vine Whip":45,"Razor Leaf":55,"Sleep Powder":0,"Solar Beam":120,Scratch:40,
  Ember:40,Flamethrower:90,"Dragon Rage":40,Slash:70,"Water Gun":40,"Bubble Beam":65,
  Withdraw:0,"Thunder Shock":40,"Quick Attack":40,Thunderbolt:90,Thunder:110,Agility:0,
  Gust:40,"Sand Attack":0,Bite:60,"Poison Sting":15,"String Shot":0,Harden:0,
  "Pin Missile":25,Twineedle:25,"Poison Powder":0,Confusion:50,Psybeam:65,
  "Hyper Fang":80,"Super Fang":1,"Wing Attack":60,"Air Slash":75,Tailwind:0,
  "Fire Blast":110,"Ice Beam":90,Surf:90,"Hydro Pump":110,"Poison Jab":80,
  Earthquake:100,Protect:0,"Thunder Wave":0,
};

function calcDmg(atk: number, def: number, power: number, rand = true) {
  if (!power || power <= 1) return power === 1 ? Math.max(1, Math.floor(atk / 2)) : 0;
  const r = rand ? 0.85 + Math.random() * 0.15 : 1;
  return Math.max(1, Math.floor(((atk * power) / (def * 5)) * r));
}

type Mon = PokemonTemplate & {
  uid?: string;
  nickname?: string;
  level: number; maxHp: number; currentHp: number;
  exp: number; expNeeded: number; status: string | null;
  ivAtk: number; ivDef: number; ivHp: number;
  ivSpa?: number; ivSpd?: number; ivSpe?: number;
  evHp?: number; evAtk?: number; evDef?: number; evSpa?: number; evSpd?: number; evSpe?: number;
  nature?: string;
  moves: string[];
  caughtAt?: number;
  origin?: "wild" | "safari" | "store" | "redeem" | "starter" | "trade" | "evolve";
};

// Convert an in-app Mon (which has level-scaled cached stats) to the wire format
// the battle engine expects (raw species base stats + IVs/EVs).
function toShippableMon(m: Mon) {
  const tpl = ALL_POKEMON.find((p) => p.id === m.id);
  return {
    id: m.id, name: m.name, level: m.level,
    type1: (tpl?.type1 ?? m.type1), type2: (tpl?.type2 ?? m.type2 ?? null),
    sprite: tpl?.sprite ?? m.sprite,
    hp: tpl?.hp ?? m.hp, atk: tpl?.atk ?? m.atk, def: tpl?.def ?? m.def,
    spa: tpl?.spa ?? m.spa, spd: (tpl as any)?.spd ?? (m as any).spd ?? m.spa, spe: tpl?.spe ?? m.spe,
    ivHp: m.ivHp, ivAtk: m.ivAtk, ivDef: m.ivDef,
    ivSpa: m.ivSpa, ivSpd: m.ivSpd, ivSpe: m.ivSpe,
    evHp: m.evHp ?? 0, evAtk: m.evAtk ?? 0, evDef: m.evDef ?? 0,
    evSpa: m.evSpa ?? 0, evSpd: m.evSpd ?? 0, evSpe: m.evSpe ?? 0,
    nature: m.nature ?? "Hardy",
    moves: (m.moves ?? []).slice(0, 4),
    uid: m.uid,
  };
}

function appMonToBattleMon(m: Mon): BattleMon {
  return fromAppMon(toShippableMon(m));
}

function npcTrainerToBattleMons(npc: NpcTrainer): BattleMon[] {
  return npc.team.map((n) => fromAppMon(npcMonToAppMon(n)));
}

let monUidCounter = 0;
function makeUid() {
  monUidCounter++;
  return `m-${Date.now().toString(36)}-${monUidCounter.toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

// 25 standard Pokémon natures.
const NATURE_NAMES = [
  "Hardy", "Lonely", "Brave", "Adamant", "Naughty",
  "Bold", "Docile", "Relaxed", "Impish", "Lax",
  "Timid", "Hasty", "Serious", "Jolly", "Naive",
  "Modest", "Mild", "Quiet", "Bashful", "Rash",
  "Calm", "Gentle", "Sassy", "Careful", "Quirky",
];
function randomNature(): string {
  return NATURE_NAMES[Math.floor(Math.random() * NATURE_NAMES.length)];
}

// Weighted random Total IV roll (max 186 = 31 × 6 stats).
// Tier distribution:
//   170–186: 7.4%   |  160–169: 14.8%  |  150–159: 18.5%
//   130–149: 25.9%  |    0–129: 33.4%
function rollTotalIv(): number {
  const r = Math.random();
  let lo: number, hi: number;
  if (r < 0.074)            { lo = 170; hi = 186; }
  else if (r < 0.222)       { lo = 160; hi = 169; }
  else if (r < 0.407)       { lo = 150; hi = 159; }
  else if (r < 0.666)       { lo = 130; hi = 149; }
  else                       { lo = 0;   hi = 129; }
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

// Distribute a target Total IV across 6 stats, respecting per-stat cap (0–31).
function generateIvs(): { ivHp: number; ivAtk: number; ivDef: number; ivSpa: number; ivSpd: number; ivSpe: number } {
  const target = Math.min(186, rollTotalIv());
  const buckets = [0, 0, 0, 0, 0, 0];
  let remaining = target;
  // Increment a random non-capped bucket until we've placed every point.
  while (remaining > 0) {
    const open: number[] = [];
    for (let i = 0; i < 6; i++) if (buckets[i] < 31) open.push(i);
    if (open.length === 0) break;
    const pick = open[Math.floor(Math.random() * open.length)];
    buckets[pick] += 1;
    remaining -= 1;
  }
  return { ivHp: buckets[0], ivAtk: buckets[1], ivDef: buckets[2], ivSpa: buckets[3], ivSpd: buckets[4], ivSpe: buckets[5] };
}

function makeMon(template: PokemonTemplate, level: number, origin: Mon["origin"] = "wild"): Mon {
  const s = level / 50;
  const maxHp = Math.floor(template.hp * s * 2 + level + 10);
  const ivs = generateIvs();
  return {
    ...template,
    uid: makeUid(),
    level,
    maxHp,
    currentHp: maxHp,
    atk: Math.max(5, Math.floor(template.atk * s + 5)),
    def: Math.max(5, Math.floor(template.def * s + 5)),
    spa: Math.max(5, Math.floor(template.spa * s + 5)),
    spe: Math.max(5, Math.floor(template.spe * s + 5)),
    exp: 0,
    expNeeded: Math.floor(level * level * 1.2),
    status: null,
    ...ivs,
    evHp: 0, evAtk: 0, evDef: 0, evSpa: 0, evSpd: 0, evSpe: 0,
    nature: randomNature(),
    caughtAt: Date.now(),
    origin,
  };
}

function getCP(m: Mon): number {
  const a = (m.atk + (m.ivAtk ?? 0));
  const d = Math.sqrt(m.def + (m.ivDef ?? 0));
  const h = Math.sqrt(m.maxHp + (m.ivHp ?? 0));
  return Math.max(10, Math.floor((a * d * h * (m.level / 50)) / 10) * 10);
}
function ivPercent(m: Mon): number {
  return Math.round((((m.ivAtk ?? 0) + (m.ivDef ?? 0) + (m.ivHp ?? 0)) / 45) * 100);
}

type RegionDef = { name: string; emoji: string; gen: number; minLv: number; maxLv: number };
// Wild Pokémon level range expanded to 5–89 across regions, with each region
// scaling progressively higher so the world still feels region-balanced.
const REGIONS: RegionDef[] = [
  { name: "Kanto",  emoji: "🔴", gen: 1, minLv: 5,  maxLv: 18 },
  { name: "Johto",  emoji: "⚪", gen: 2, minLv: 8,  maxLv: 25 },
  { name: "Hoenn",  emoji: "🟢", gen: 3, minLv: 12, maxLv: 35 },
  { name: "Sinnoh", emoji: "🔵", gen: 4, minLv: 18, maxLv: 45 },
  { name: "Unova",  emoji: "⚫", gen: 5, minLv: 25, maxLv: 55 },
  { name: "Kalos",  emoji: "🟡", gen: 6, minLv: 32, maxLv: 65 },
  { name: "Alola",  emoji: "🌺", gen: 7, minLv: 40, maxLv: 73 },
  { name: "Galar",  emoji: "🟣", gen: 8, minLv: 48, maxLv: 81 },
  { name: "Paldea", emoji: "🟠", gen: 9, minLv: 55, maxLv: 89 },
];

const LEGENDARIES: Record<number, number[]> = {
  1: [144, 145, 146, 150, 151],
  2: [243, 244, 245, 249, 250, 251],
  3: [377, 378, 379, 380, 381, 382, 383, 384, 385, 386],
  4: [480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493],
  5: [494, 638, 639, 640, 641, 642, 643, 644, 645, 646, 647, 648, 649],
  6: [716, 717, 718, 719, 720, 721],
  7: [772, 773, 785, 786, 787, 788, 789, 790, 791, 792, 800, 801, 802, 807, 808, 809],
  8: [888, 889, 890, 891, 892, 893, 894, 895, 896, 897, 898],
  9: [1001, 1002, 1003, 1004, 1007, 1008, 1014, 1015, 1016, 1017, 1024, 1025],
};
const ALL_LEGENDARY_IDS = new Set(Object.values(LEGENDARIES).flat());

const REGION_POOLS: Record<number, number[]> = {};
const REGION_LEGENDS: Record<number, number[]> = {};
for (const r of REGIONS) {
  const inGen = ALL_POKEMON.filter((p) => p.gen === r.gen).map((p) => p.id);
  REGION_POOLS[r.gen] = inGen.filter((id) => !ALL_LEGENDARY_IDS.has(id));
  REGION_LEGENDS[r.gen] = inGen.filter((id) => ALL_LEGENDARY_IDS.has(id));
}

type LogEntry = { msg: string; color: string; id: number };
type Player = { name: string; hometown: string; money: number; stardust: number; macroRegion: number; region: number; level: number; exp: number; expNeeded: number; sprite: string; id: number; rank: number; wins: number; losses: number; adventureStarted: string };

function makePlayerId() {
  return Math.floor(1_000_000_000 + Math.random() * 9_000_000_000);
}
function todayStr() {
  const d = new Date();
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
type Battle = { wild: Mon; pMon: Mon; phase: string; turnCount: number; canCatch: boolean; ballsThrown: number; selectedBall: string; fleeThreshold: number };
const MAX_BATTLE_BALLS = 5;
const BALL_BASE_MULT: Record<string, number> = {
  "Poké Ball": 1, "Pokeball": 1, "Great Ball": 1.5, "Ultra Ball": 2, "Master Ball": 255,
  "Level Ball": 1, "Timer Ball": 1, "Fast Ball": 1, "Repeat Ball": 1,
  "Nest Ball": 1, "Net Ball": 1, "Quick Ball": 1, "Beast Ball": 1,
};
const BALL_NAMES = [
  "Poké Ball", "Great Ball", "Ultra Ball", "Master Ball",
  "Level Ball", "Timer Ball", "Fast Ball", "Repeat Ball",
  "Nest Ball", "Net Ball", "Quick Ball", "Beast Ball",
];
const BALL_BLURB: Record<string, string> = {
  "Poké Ball": "×1 catch rate",
  "Great Ball": "×1.5 catch rate",
  "Ultra Ball": "×2 catch rate",
  "Master Ball": "Guaranteed catch (×255)",
  "Level Ball": "Better when your Pokémon out-levels the wild one",
  "Timer Ball": "Stronger the longer the battle lasts (up to ×4)",
  "Fast Ball": "×4 vs fast Pokémon (Speed ≥ 100)",
  "Repeat Ball": "×3.5 if you've caught one before",
  "Nest Ball": "Up to ×4 vs lower-level Pokémon",
  "Net Ball": "×3.5 vs Water or Bug types",
  "Quick Ball": "×5 if used on the first turn",
  "Beast Ball": "×5 on Ultra Beasts, ×0.1 otherwise",
};
const FAST_BALL_FAVORS = new Set([81, 82, 88, 89, 100, 101, 109, 110, 114, 125, 126]);
const ULTRA_BEASTS = new Set([793, 794, 795, 796, 797, 798, 799, 803, 804, 805, 806]);
type BallCtx = { wild: Mon; player: Mon | null; turnCount: number; alreadyCaughtSpecies: boolean };
function ballMultiplier(name: string, ctx: BallCtx): number {
  const wild = ctx.wild;
  switch (name) {
    case "Poké Ball": case "Pokeball": return 1;
    case "Great Ball": return 1.5;
    case "Ultra Ball": return 2;
    case "Master Ball": return 255;
    case "Level Ball": {
      const pl = ctx.player?.level ?? 0;
      if (pl >= wild.level * 4) return 8;
      if (pl >= wild.level * 2) return 4;
      if (pl > wild.level) return 2;
      return 1;
    }
    case "Timer Ball": {
      return Math.min(4, 1 + ctx.turnCount * 0.3);
    }
    case "Fast Ball": {
      if ((wild.spe ?? 0) >= 100 || FAST_BALL_FAVORS.has(wild.id)) return 4;
      return 1;
    }
    case "Repeat Ball": return ctx.alreadyCaughtSpecies ? 3.5 : 1;
    case "Nest Ball": {
      if (wild.level >= 30) return 1;
      return Math.max(1, Math.min(4, (30 - wild.level) / 7));
    }
    case "Net Ball": {
      const t1 = (wild.type1 ?? "").toLowerCase();
      const t2 = (wild.type2 ?? "").toLowerCase();
      return (t1 === "water" || t1 === "bug" || t2 === "water" || t2 === "bug") ? 3.5 : 1;
    }
    case "Quick Ball": return ctx.turnCount <= 1 ? 5 : 1;
    case "Beast Ball": return ULTRA_BEASTS.has(wild.id) ? 5 : 0.1;
    default: return BALL_BASE_MULT[name] ?? 1;
  }
}

const SAVE_KEY = "hexamon:save:v2";
export type TeamGroup = { id: string; name: string; mons: Mon[] };
type SaveData = {
  screen: string;
  player: Player;
  team?: Mon[];
  teams?: TeamGroup[];
  box?: Mon[];
  activeTeamIdx?: number;
  inventory: { name: string; qty: number }[];
  caught: number[];
  seen?: number[];
  muted: boolean;
  candies?: Record<number, number>;
  buddyIdx?: number;
  redeemedCodes?: string[];
  lastSpinTs?: number;
  catchStreak?: number;
  lastStreakDay?: string;
  safariBalls?: number;
  safariEnc?: Mon | null;
  safariCounter?: number;
  safariNextLegend?: number;
  safariCaught?: number;
  lastSafariDay?: string;
  lastSafariDayByRegion?: Record<number, string>;
  safariRegion?: number;
  lastSpinDay?: string;
  battleBoxRank?: number;
  battleBoxHistory?: { mode: string; result: "W" | "L"; opponent: string; delta: number; ts: number }[];
  badges?: string[];
  e4Cleared?: boolean;
  e4Streak?: number;
};
function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !data.player) return null;
    return data as SaveData;
  } catch { return null; }
}

export default function App() {
  const initial = typeof window !== "undefined" ? loadSave() : null;
  const [splashDone, setSplashDone] = useState(false);
  const [screen, setScreen] = useState<string>(initial ? (initial.screen === "battle" || initial.screen === "hunt" || initial.screen === "title" ? "world" : initial.screen) : "nameInput");
  const [player, setPlayer] = useState<Player>(initial?.player ?? {
    name: "Trainer",
    hometown: "Nuvema Town",
    money: 3000,
    stardust: 0,
    macroRegion: 0,
    region: 0,
    level: 1,
    exp: 0,
    expNeeded: 100,
    sprite: "hilbert",
    id: makePlayerId(),
    rank: 1000,
    wins: 0,
    losses: 0,
    adventureStarted: todayStr(),
  });
  const [teams, setTeams] = useState<TeamGroup[]>(() => {
    if (initial?.teams && initial.teams.length > 0) return initial.teams;
    const legacy = initial?.team ?? [];
    return [{ id: `t-${Date.now()}`, name: "Main", mons: legacy }];
  });
  const [activeTeamIdx, setActiveTeamIdx] = useState<number>(initial?.activeTeamIdx ?? 0);
  const [box, setBox] = useState<Mon[]>(initial?.box ?? []);
  const [monsSearch, setMonsSearch] = useState<string>("");
  const [monsView, setMonsView] = useState<"grid" | "list">("grid");
  const [monsSortKey, setMonsSortKey] = useState<string>("ivTotal");
  const [monsSortDir, setMonsSortDir] = useState<"max" | "min">("max");
  const [showMonsSort, setShowMonsSort] = useState(false);
  const [selectedMonUid, setSelectedMonUid] = useState<string | null>(null);
  const [monDetailTab, setMonDetailTab] = useState<"info" | "stats" | "iv" | "moves">("info");
  const team = teams[activeTeamIdx]?.mons ?? [];
  const setTeam = (updater: Mon[] | ((prev: Mon[]) => Mon[])) => {
    setTeams((prev) => prev.map((t, i) => i === activeTeamIdx
      ? { ...t, mons: typeof updater === "function" ? (updater as (p: Mon[]) => Mon[])(t.mons) : updater }
      : t));
  };
  const [inventory, setInventory] = useState<{ name: string; qty: number }[]>(initial?.inventory ?? []);
  const [storeCat, setStoreCat] = useState<string | null>(null);
  const [tmSearch, setTmSearch] = useState("");
  const [menuPage, setMenuPage] = useState(0);
  const [bagCat, setBagCat] = useState<string>("balls");
  const [scoutedWild, setScoutedWild] = useState<Mon | null>(null);
  const [moveAnim, setMoveAnim] = useState<{ target: "enemy" | "player"; type: string; key: number } | null>(null);
  const [muted, setMuted] = useState<boolean>(initial?.muted ?? false);
  const [caught, setCaught] = useState<Set<number>>(new Set(initial?.caught ?? []));
  const [seen, setSeen] = useState<Set<number>>(new Set(initial?.seen ?? initial?.caught ?? []));
  const [candies, setCandies] = useState<Record<number, number>>(initial?.candies ?? {});
  const [buddyIdx, setBuddyIdx] = useState<number>(initial?.buddyIdx ?? -1);
  const [redeemedCodes, setRedeemedCodes] = useState<string[]>(initial?.redeemedCodes ?? []);
  const [redeemInput, setRedeemInput] = useState<string>("");
  const [redeemMsg, setRedeemMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [lastSpinTs, setLastSpinTs] = useState<number>(initial?.lastSpinTs ?? 0);
  const [lastSafariDayByRegion, setLastSafariDayByRegion] = useState<Record<number, string>>(
    initial?.lastSafariDayByRegion ??
      (initial?.lastSafariDay ? { [initial?.safariRegion ?? 0]: initial.lastSafariDay } : {})
  );
  const [safariRegion, setSafariRegion] = useState<number>(initial?.safariRegion ?? 0);
  const [showSafariRegionPicker, setShowSafariRegionPicker] = useState(false);
  const [lastSpinDay, setLastSpinDay] = useState<string>(initial?.lastSpinDay ?? "");
  const [battleBoxHistory, setBattleBoxHistory] = useState<{ mode: string; result: "W" | "L"; opponent: string; delta: number; ts: number }[]>(initial?.battleBoxHistory ?? []);
  const [bbMode, setBbMode] = useState<"ranked" | "unranked" | "random" | null>(null);
  const [bbRoom, setBbRoom] = useState<{ code: string; isHost: boolean; status: "waiting" | "ready"; opponent?: string } | null>(null);
  const [bbJoinCode, setBbJoinCode] = useState("");
  const [bbSettings, setBbSettings] = useState({ levelCap: 50, allowLegendaries: true, turnTimer: 60, teamSize: 6, randomLevelMin: 40, randomLevelMax: 60 });
  const [bbShowSettings, setBbShowSettings] = useState(false);
  // ----- League state -----
  const [badges, setBadges] = useState<string[]>(initial?.badges ?? []);
  const [e4Cleared, setE4Cleared] = useState<boolean>(initial?.e4Cleared ?? false);
  const [e4Streak, setE4Streak] = useState<number>(initial?.e4Streak ?? 0);
  const [leagueBattle, setLeagueBattle] = useState<{
    state: BattleState;
    npc: NpcTrainer;
    awaitingMyAction: boolean;
    awaitingForceSwitch: boolean;
    pendingMyAction: BAction | null;
    isE4: boolean;
    e4Idx: number;          // index into ELITE_FOUR if isE4
    carryHpFromTeam?: BattleMon[];   // for E4 to carry HP into next match
  } | null>(null);
  const [leagueResultBanner, setLeagueResultBanner] = useState<string | null>(null);
  // ----- PvP state -----
  const [pvpBattle, setPvpBattle] = useState<{
    state: BattleState;
    mySide: 0 | 1;
    awaitingMyAction: boolean;
    awaitingForceSwitch: boolean;
    oppPicked: boolean;
    turnTimerSec: number | null;
    opponentName: string;
  } | null>(null);
  const [pvpBanner, setPvpBanner] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const myPlayerIdRef = useRef<string>(`p-${Math.random().toString(36).slice(2, 10)}`);
  // ----- Training -----
  const [trainingActiveUid, setTrainingActiveUid] = useState<string | null>(null);
  void trainingActiveUid;
  const [showBallPicker, setShowBallPicker] = useState(false);
  const [showAddMonPicker, setShowAddMonPicker] = useState(false);
  const [showTeamTools, setShowTeamTools] = useState(false);
  const [showRemovePicker, setShowRemovePicker] = useState(false);
  const [showOrderEditor, setShowOrderEditor] = useState(false);
  const [catchStreak, setCatchStreak] = useState<number>(initial?.catchStreak ?? 0);
  const [lastStreakDay, setLastStreakDay] = useState<string>(initial?.lastStreakDay ?? "");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [battle, setBattle] = useState<Battle | null>(null);
  const [shakeE, setShakeE] = useState(false);
  const [shakeP, setShakeP] = useState(false);
  const [ballAnim, setBallAnim] = useState<null | "throw" | "capture" | "wobble" | "success" | "fail">(null);
  const [ringActive, setRingActive] = useState(false);
  const [ringRadius, setRingRadius] = useState(110);
  const ringDirRef = useRef<1 | -1>(-1);
  const [spinTick, setSpinTick] = useState(0);
  const [showBuddyPicker, setShowBuddyPicker] = useState(false);
  const [showSwitchPicker, setShowSwitchPicker] = useState(false);
  const [evolving, setEvolving] = useState<{ from: string; to: string; sprite: string } | null>(null);
  const [dexFilter, setDexFilter] = useState("all");
  const [genFilter, setGenFilter] = useState<number>(0);
  const [pickedMacro, setPickedMacro] = useState(0);
  const [huntCount, setHuntCount] = useState(0);
  const [legendThreshold, setLegendThreshold] = useState(() => 20 + Math.floor(Math.random() * 16));
  const [safariBalls, setSafariBalls] = useState(initial?.safariBalls ?? 0);
  const [safariEnc, setSafariEnc] = useState<Mon | null>(initial?.safariEnc ?? null);
  const [safariCounter, setSafariCounter] = useState(initial?.safariCounter ?? 0);
  const [safariNextLegend, setSafariNextLegend] = useState(() => initial?.safariNextLegend ?? (3 + Math.floor(Math.random() * 3)));
  const [safariCaught, setSafariCaught] = useState(initial?.safariCaught ?? 0);
  const [safariThrowAnim, setSafariThrowAnim] = useState<"throw" | "wobble" | "burst" | "stars" | null>(null);
  // Status banner shown inside the safari encounter screen. Replaces the old
  // "A wild X appears" caption with the throw / catch / fled flow.
  const [safariStatusMsg, setSafariStatusMsg] = useState<{
    kind: "throw" | "caught" | "fled";
    text: string;
    stars?: number;          // 1..3 stars for "throw" animation
  } | null>(null);
  const [emptyTeamWarning, setEmptyTeamWarning] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = 99999; }, [log]);

  useEffect(() => {
    if (screen === "title" || screen === "nameInput" || screen === "starter") return;
    try {
      const data: SaveData = {
        screen, player, teams, activeTeamIdx, box, inventory,
        caught: Array.from(caught), seen: Array.from(seen), muted,
        candies, buddyIdx, redeemedCodes, lastSpinTs, catchStreak, lastStreakDay,
        safariBalls, safariEnc, safariCounter, safariNextLegend, safariCaught,
        lastSafariDayByRegion, safariRegion, lastSpinDay, battleBoxHistory,
        badges, e4Cleared, e4Streak,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch { /* ignore quota errors */ }
  }, [screen, player, teams, activeTeamIdx, box, inventory, caught, seen, muted, candies, buddyIdx, redeemedCodes, lastSpinTs, catchStreak, lastStreakDay, safariBalls, safariEnc, safariCounter, safariNextLegend, safariCaught, lastSafariDayByRegion, safariRegion, lastSpinDay, battleBoxHistory, badges, e4Cleared, e4Streak]);

  // Buddy walking — buddy earns 1 candy every 30s
  useEffect(() => {
    if (buddyIdx < 0 || !team[buddyIdx]) return;
    const buddy = team[buddyIdx];
    const id = setInterval(() => {
      setCandies((c) => ({ ...c, [buddy.id]: (c[buddy.id] ?? 0) + 1 }));
    }, 30000);
    return () => clearInterval(id);
  }, [buddyIdx, team]);

  // Pokestop cooldown ticker for live UI
  useEffect(() => {
    const id = setInterval(() => setSpinTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);


  // Catch ring shrinking animation
  useEffect(() => {
    if (!ringActive) return;
    let raf = 0;
    const step = () => {
      setRingRadius((r) => {
        if (r <= 28) ringDirRef.current = 1;
        else if (r >= 110) ringDirRef.current = -1;
        return r + ringDirRef.current * 1.6;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [ringActive]);

  function ringQuality(r: number): { label: string; mult: number; xp: number; color: string } {
    if (r < 36)  return { label: "EXCELLENT!", mult: 2.0, xp: 100, color: "#FFD700" };
    if (r < 56)  return { label: "Great!",     mult: 1.5, xp: 50,  color: "#26C6DA" };
    if (r < 80)  return { label: "Nice!",      mult: 1.2, xp: 20,  color: "#9CCC65" };
    return       { label: "OK",                mult: 1.0, xp: 10,  color: "#aaa" };
  }

  function awardCatchRewards(_speciesId: number, _mult: number, xpBonus: number) {
    setPlayer((p) => ({ ...p, exp: p.exp + xpBonus }));
  }

  function powerUp(teamIdx: number) {
    const m = team[teamIdx];
    if (!m) return;
    const cost = 25 + m.level * 5;
    const candyCost = 1 + Math.floor(m.level / 5);
    if ((player.stardust ?? 0) < cost) { addLog(`Need ${cost} stardust!`, "#F44336"); return; }
    if ((candies[m.id] ?? 0) < candyCost) { addLog(`Need ${candyCost} ${m.name} candy!`, "#F44336"); return; }
    setPlayer((p) => ({ ...p, stardust: p.stardust - cost }));
    setCandies((c) => ({ ...c, [m.id]: c[m.id] - candyCost }));
    setTeam((prev) => {
      const newT = [...prev];
      const upd = { ...newT[teamIdx] };
      upd.level += 1;
      upd.maxHp += Math.floor(upd.hp / 25) + 2;
      upd.currentHp = upd.maxHp;
      upd.atk += Math.floor(upd.atk / 20) + 1;
      upd.def += Math.floor(upd.def / 20) + 1;
      upd.spe += Math.floor(upd.spe / 25) + 1;
      newT[teamIdx] = upd;
      return newT;
    });
    sfx.levelUp();
    addLog(`💪 ${m.name} powered up to Lv${m.level + 1}! CP boosted.`, "#4CAF50");
  }

  function spinPokestop() {
    const today = todayStr();
    if (lastSpinDay === today) {
      addLog("You've already spun the Pokéstop today. Come back tomorrow!", "#F44336");
      sfx.menuBack();
      return;
    }
    setLastSpinDay(today);
    setLastSpinTs(Date.now());
    sfx.menuOpen();
    const dust = 100 + Math.floor(Math.random() * 400);
    setPlayer((p) => ({ ...p, stardust: (p.stardust ?? 0) + dust, money: p.money + 1000 }));
    addItem("Poké Ball", 5);
    addItem("Great Ball", 5);
    addItem("Ultra Ball", 5);
    addLog(`📍 Pokéstop! +${dust} ✨, +₽1000, +5 Poké Balls, +5 Great Balls, +5 Ultra Balls`, "#26C6DA");
  }

  function resetSave() {
    if (!window.confirm("Erase your save and start a new adventure?")) return;
    try { localStorage.removeItem(SAVE_KEY); } catch {}
    window.location.reload();
  }

  const addLog = useCallback((msg: string, color = "#ddd") => {
    setLog((p) => [...p.slice(-40), { msg, color, id: Date.now() + Math.random() }]);
  }, []);

  // ============ TRAINING: EV updates ============
  // Update EVs of a single mon (by uid) with caps; returns whether change was applied.
  const updateMonEvs = useCallback((uid: string, evDeltas: Partial<Record<"evHp" | "evAtk" | "evDef" | "evSpa" | "evSpd" | "evSpe", number>>): { ok: boolean; reason?: string; wasted?: number } => {
    let result: { ok: boolean; reason?: string; wasted?: number } = { ok: false };
    setTeams((prev) => {
      const next = prev.map((g) => ({ ...g, mons: [...g.mons] }));
      let found = false;
      for (const g of next) {
        const idx = g.mons.findIndex((m) => m.uid === uid);
        if (idx < 0) continue;
        found = true;
        const m = { ...g.mons[idx] } as Mon;
        const cur: Record<string, number> = {
          evHp: m.evHp ?? 0, evAtk: m.evAtk ?? 0, evDef: m.evDef ?? 0,
          evSpa: m.evSpa ?? 0, evSpd: m.evSpd ?? 0, evSpe: m.evSpe ?? 0,
        };
        const totalNow = cur.evHp + cur.evAtk + cur.evDef + cur.evSpa + cur.evSpd + cur.evSpe;
        const STAT_CAP = 252;
        const TOTAL_CAP = 510;
        let wasted = 0;
        let totalAfter = totalNow;
        for (const k of Object.keys(evDeltas) as (keyof typeof evDeltas)[]) {
          const want = evDeltas[k] ?? 0;
          if (want === 0) continue;
          let canAdd = Math.min(want, STAT_CAP - cur[k]);
          if (canAdd < 0) canAdd = 0;
          const totalRoom = TOTAL_CAP - totalAfter;
          if (canAdd > totalRoom) { wasted += canAdd - totalRoom; canAdd = totalRoom; }
          if (canAdd <= 0) { wasted += want; continue; }
          cur[k] += canAdd;
          totalAfter += canAdd;
          wasted += want - canAdd;
        }
        m.evHp = cur.evHp; m.evAtk = cur.evAtk; m.evDef = cur.evDef;
        m.evSpa = cur.evSpa; m.evSpd = cur.evSpd; m.evSpe = cur.evSpe;
        // Recompute maxHp based on the engine formula; preserve current HP ratio.
        const tpl = ALL_POKEMON.find((p) => p.id === m.id);
        if (tpl) {
          const newMax = calcMaxHp({ baseStats: { hp: tpl.hp }, ivs: { hp: m.ivHp ?? 0 }, evs: { hp: m.evHp ?? 0 }, level: m.level });
          const ratio = m.maxHp > 0 ? m.currentHp / m.maxHp : 1;
          m.maxHp = newMax;
          m.currentHp = Math.max(1, Math.round(newMax * ratio));
        }
        g.mons[idx] = m;
        result = { ok: true, wasted };
        break;
      }
      if (!found) result = { ok: false, reason: "Pokémon not found in your teams." };
      return next;
    });
    return result;
  }, []);

  // Set absolute EV value for one stat (used by paid instant training).
  const setMonEvAbsolute = useCallback((uid: string, stat: "evHp" | "evAtk" | "evDef" | "evSpa" | "evSpd" | "evSpe", value: number): { ok: boolean; reason?: string } => {
    let result: { ok: boolean; reason?: string } = { ok: false };
    setTeams((prev) => {
      const next = prev.map((g) => ({ ...g, mons: [...g.mons] }));
      for (const g of next) {
        const idx = g.mons.findIndex((m) => m.uid === uid);
        if (idx < 0) continue;
        const m = { ...g.mons[idx] } as Mon;
        const cur: Record<string, number> = {
          evHp: m.evHp ?? 0, evAtk: m.evAtk ?? 0, evDef: m.evDef ?? 0,
          evSpa: m.evSpa ?? 0, evSpd: m.evSpd ?? 0, evSpe: m.evSpe ?? 0,
        };
        const others = Object.keys(cur).filter((k) => k !== stat).reduce((s, k) => s + cur[k], 0);
        if (others + value > 510) { result = { ok: false, reason: "Total EVs would exceed 510." }; return prev; }
        cur[stat] = Math.min(252, Math.max(0, value));
        m.evHp = cur.evHp; m.evAtk = cur.evAtk; m.evDef = cur.evDef;
        m.evSpa = cur.evSpa; m.evSpd = cur.evSpd; m.evSpe = cur.evSpe;
        const tpl = ALL_POKEMON.find((p) => p.id === m.id);
        if (tpl) {
          const newMax = calcMaxHp({ baseStats: { hp: tpl.hp }, ivs: { hp: m.ivHp ?? 0 }, evs: { hp: m.evHp ?? 0 }, level: m.level });
          const ratio = m.maxHp > 0 ? m.currentHp / m.maxHp : 1;
          m.maxHp = newMax;
          m.currentHp = Math.max(1, Math.round(newMax * ratio));
        }
        g.mons[idx] = m;
        result = { ok: true };
        return next;
      }
      result = { ok: false, reason: "Pokémon not found." };
      return prev;
    });
    return result;
  }, []);

  const spendMoney = useCallback((cost: number): boolean => {
    if ((player.money ?? 0) < cost) return false;
    setPlayer((p) => ({ ...p, money: p.money - cost }));
    return true;
  }, [player.money]);

  // Generic mon mutator used by Training Zone (level up, evolve, learn moves).
  // Applies a partial patch to a single mon by uid, refreshes template-derived fields
  // when the species id changes, and recomputes maxHp/currentHp.
  const mutateMon = useCallback((uid: string, patch: Partial<Mon>) => {
    setTeams((prev) => prev.map((g) => ({
      ...g,
      mons: g.mons.map((m) => {
        if (m.uid !== uid) return m;
        const speciesChanged = patch.id != null && patch.id !== m.id;
        let next: Mon = { ...m, ...patch };
        if (speciesChanged) {
          const tpl = ALL_POKEMON.find((p) => p.id === next.id);
          if (tpl) {
            next.name = tpl.name;
            next.sprite = tpl.sprite;
            next.type1 = tpl.type1;
            next.type2 = tpl.type2;
            next.hp = tpl.hp; next.atk = tpl.atk; next.def = tpl.def;
            next.spa = tpl.spa; (next as any).spd = (tpl as any).spd ?? tpl.spa; next.spe = tpl.spe;
            next.canEvolve = tpl.canEvolve;
            next.evolveAt = tpl.evolveAt;
          }
        }
        const tplFinal = ALL_POKEMON.find((p) => p.id === next.id);
        if (tplFinal) {
          const newMax = calcMaxHp({ baseStats: { hp: tplFinal.hp }, ivs: { hp: next.ivHp ?? 0 }, evs: { hp: next.evHp ?? 0 }, level: next.level });
          const ratio = m.maxHp > 0 ? Math.min(1, m.currentHp / m.maxHp) : 1;
          next.maxHp = newMax;
          // Heal to full whenever level changed or species changed; otherwise keep ratio.
          if (next.level !== m.level || speciesChanged) next.currentHp = newMax;
          else next.currentHp = Math.max(1, Math.round(newMax * ratio));
        }
        return next;
      }),
    })));
  }, []);

  // ============ LEAGUE: bot-driven battle ============
  const startLeagueBattle = useCallback((npc: NpcTrainer, opts: { isE4: boolean; e4Idx: number; carryOverHp?: BattleMon[] }) => {
    const myTeam = team.slice(0, 6);
    if (myTeam.length === 0) { addLog("You need at least 1 Pokémon!", "#F44336"); return; }
    const myBattleMons = opts.carryOverHp ?? myTeam.map(appMonToBattleMon);
    if (myBattleMons.every((m) => m.currentHp <= 0)) { addLog("All your Pokémon have fainted.", "#F44336"); return; }
    const oppBattleMons = npcTrainerToBattleMons(npc);
    const teamA: BTeam = { ownerId: "you", ownerName: player.name || "You", mons: myBattleMons, activeIdx: myBattleMons.findIndex((m) => m.currentHp > 0) };
    const teamB: BTeam = { ownerId: "npc", ownerName: npc.name, mons: oppBattleMons, activeIdx: 0 };
    const state = makeBattleState(teamA, teamB);
    setLeagueBattle({ state, npc, awaitingMyAction: true, awaitingForceSwitch: false, pendingMyAction: null, isE4: opts.isE4, e4Idx: opts.e4Idx });
    setLeagueResultBanner(null);
    setScreen("leagueBattle");
    sfx.menuOpen();
  }, [team, player.name, addLog]);

  // When player submits an action, the bot picks one and we resolve.
  useEffect(() => {
    if (!leagueBattle || !leagueBattle.pendingMyAction || leagueBattle.state.finished) return;
    const lb = leagueBattle;
    const myAction = lb.pendingMyAction!;
    const botAction = chooseBotAction(lb.state, 1);
    const next = resolveTurn(lb.state, myAction, botAction, Math.random);
    // Check for force-switches.
    const myActive = next.teams[0].mons[next.teams[0].activeIdx];
    const oppActive = next.teams[1].mons[next.teams[1].activeIdx];
    let stateAfter = next;
    if (oppActive.currentHp <= 0 && next.teams[1].mons.some((m) => m.currentHp > 0)) {
      const sw = pickBotForceSwitch(next, 1);
      if (sw != null) stateAfter = forceSwitch(stateAfter, 1, sw);
    }
    const myStillFainted = stateAfter.teams[0].mons[stateAfter.teams[0].activeIdx].currentHp <= 0;
    const myHasReserve = stateAfter.teams[0].mons.some((m, i) => m.currentHp > 0 && i !== stateAfter.teams[0].activeIdx);
    if (stateAfter.finished) {
      handleLeagueEnd(stateAfter);
      return;
    }
    if (myStillFainted && myHasReserve) {
      setLeagueBattle({ ...lb, state: stateAfter, pendingMyAction: null, awaitingMyAction: false, awaitingForceSwitch: true });
    } else {
      setLeagueBattle({ ...lb, state: stateAfter, pendingMyAction: null, awaitingMyAction: true, awaitingForceSwitch: false });
    }
    void myActive;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueBattle?.pendingMyAction]);

  const handleLeagueAction = useCallback((act: BAction) => {
    if (!leagueBattle) return;
    if (leagueBattle.awaitingForceSwitch) {
      if (act.kind !== "switch") return;
      const after = forceSwitch(leagueBattle.state, 0, act.toIdx);
      // After force-switch the turn ends — opponent does nothing extra; just resume normal turn.
      setLeagueBattle({ ...leagueBattle, state: after, awaitingForceSwitch: false, awaitingMyAction: true, pendingMyAction: null });
      return;
    }
    if (!leagueBattle.awaitingMyAction) return;
    setLeagueBattle({ ...leagueBattle, pendingMyAction: act, awaitingMyAction: false });
  }, [leagueBattle]);

  function handleLeagueEnd(finalState: BattleState) {
    if (!leagueBattle) return;
    const won = finalState.winnerIdx === 0;
    const npc = leagueBattle.npc;
    const isE4 = leagueBattle.isE4;
    const e4Idx = leagueBattle.e4Idx;
    if (won) {
      sfx.victory();
      const reward = 1000 + 200 * (npc.team[npc.team.length - 1]?.level ?? 30);
      setPlayer((p) => ({ ...p, money: p.money + reward, wins: (p.wins ?? 0) + 1 }));
      addLog(`🏆 Defeated ${npc.name}! +₽${reward}`, "#4ade80");
      if (!isE4) {
        if (!badges.includes(npc.id)) setBadges((b) => [...b, npc.id]);
        setLeagueResultBanner(`Victory! Earned ${npc.name}'s badge.`);
        setLeagueBattle({ ...leagueBattle, state: finalState, awaitingMyAction: false, awaitingForceSwitch: false, pendingMyAction: null });
      } else {
        // Continue gauntlet — carry HP into next E4 match.
        const carry = finalState.teams[0].mons.map((m) => ({ ...m }));
        if (e4Idx + 1 < ELITE_FOUR.length) {
          setTimeout(() => startLeagueBattle(ELITE_FOUR[e4Idx + 1], { isE4: true, e4Idx: e4Idx + 1, carryOverHp: carry }), 1500);
          setLeagueResultBanner(`Win ${e4Idx + 1}/4 — onward!`);
          setLeagueBattle({ ...leagueBattle, state: finalState, awaitingMyAction: false, awaitingForceSwitch: false, pendingMyAction: null });
        } else {
          // Cleared all 4 → champion!
          setE4Cleared(true);
          setE4Streak((s) => s + 1);
          setLeagueResultBanner(`🏆 CHAMPION! E4 cleared (streak ${e4Streak + 1}).`);
          setLeagueBattle({ ...leagueBattle, state: finalState, awaitingMyAction: false, awaitingForceSwitch: false, pendingMyAction: null });
        }
      }
    } else {
      sfx.faint();
      setPlayer((p) => ({ ...p, losses: (p.losses ?? 0) + 1 }));
      if (isE4) {
        setE4Streak(0);
        setLeagueResultBanner(`Defeated by ${npc.name}. E4 streak reset.`);
      } else {
        setLeagueResultBanner(`Defeated by ${npc.name}. Try again!`);
      }
      addLog(`💀 Lost to ${npc.name}.`, "#f87171");
      setLeagueBattle({ ...leagueBattle, state: finalState, awaitingMyAction: false, awaitingForceSwitch: false, pendingMyAction: null });
    }
  }

  // ============ PvP: WebSocket connection + handlers ============
  const pvpConnect = useCallback((isHost: boolean, code: string | undefined, mode: "ranked" | "unranked" | "random", myTeamMons: Mon[]) => {
    try { wsRef.current?.close(); } catch { /* ignore */ }
    const wsUrl = `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/api/ws/battle`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    let myTeamSent = false;
    const sendTeam = () => {
      if (myTeamSent) return;
      myTeamSent = true;
      ws.send(JSON.stringify({ type: "team", playerId: myPlayerIdRef.current, team: myTeamMons.map(toShippableMon) }));
    };
    ws.onopen = () => {
      if (isHost) {
        ws.send(JSON.stringify({ type: "host", playerId: myPlayerIdRef.current, playerName: player.name || "Trainer", turnTimerSec: bbSettings.turnTimer }));
      } else {
        ws.send(JSON.stringify({ type: "join", playerId: myPlayerIdRef.current, playerName: player.name || "Trainer", code: (code ?? "").toUpperCase() }));
      }
    };
    ws.onerror = () => { addLog("Battle server connection error.", "#f87171"); };
    ws.onclose = () => {
      if (wsRef.current === ws) wsRef.current = null;
    };
    ws.onmessage = (ev) => {
      let msg: { type: string; [k: string]: unknown };
      try { msg = JSON.parse(String(ev.data)); } catch { return; }
      switch (msg.type) {
        case "hosted": {
          const newCode = String(msg["code"]);
          setBbRoom((prev) => prev ? { ...prev, code: newCode } : prev);
          addLog(`Room hosted: ${newCode} — waiting for opponent…`, "#60a5fa");
          break;
        }
        case "joined": {
          const hostName = (msg["hostName"] as string) || "Host";
          setBbRoom((prev) => prev ? { ...prev, status: "ready", opponent: hostName } : prev);
          sendTeam();
          break;
        }
        case "opponent_joined": {
          const joinerName = (msg["joinerName"] as string) || "Opponent";
          setBbRoom((prev) => prev ? { ...prev, status: "ready", opponent: joinerName } : prev);
          addLog(`${joinerName} joined the room!`, "#4ade80");
          sendTeam();
          break;
        }
        case "team_ok":
          break;
        case "state": {
          const state = msg["state"] as BattleState;
          const mySide = msg["mySide"] as 0 | 1;
          const awaitingForceSwitch = !!msg["awaitingForceSwitch"];
          const oppPicked = !!msg["oppPicked"];
          const turnTimerSec = msg["turnTimerSec"] as number | null;
          setPvpBattle((prev) => ({
            state, mySide,
            awaitingMyAction: !state.finished && !awaitingForceSwitch,
            awaitingForceSwitch,
            oppPicked,
            turnTimerSec: turnTimerSec ?? prev?.turnTimerSec ?? bbSettings.turnTimer,
            // Capture opponent name on the first state arrival so it survives even if
            // bbRoom is cleared by the time the result is finalized.
            opponentName: prev?.opponentName
              ?? state.teams[mySide === 0 ? 1 : 0]?.ownerName
              ?? bbRoom?.opponent
              ?? "Opponent",
          }));
          if (state && !state.finished) setScreen("pvpBattle");
          break;
        }
        case "turn_start":
          // Re-enable input on new turn (state message will follow with details).
          break;
        case "turn_end":
          break;
        case "game_over": {
          const winnerIdx = msg["winnerIdx"] as number;
          const won = winnerIdx === (pvpBattle?.mySide ?? 0);
          // We may not know the local mySide here yet; recompute from current state.
          finalizePvpResult(winnerIdx, mode);
          void won;
          break;
        }
        case "opponent_left":
          addLog("Opponent disconnected.", "#f87171");
          break;
        case "error":
          addLog(`Battle error: ${(msg["reason"] as string) || "unknown"}`, "#f87171");
          break;
      }
    };
    void code;
  }, [player.name, bbSettings.turnTimer, addLog]); // eslint-disable-line react-hooks/exhaustive-deps

  function finalizePvpResult(winnerIdx: number, mode: "ranked" | "unranked" | "random") {
    setPvpBattle((prev) => {
      if (!prev) return prev;
      const won = winnerIdx === prev.mySide;
      const oppName = prev.opponentName
        || prev.state.teams[prev.mySide === 0 ? 1 : 0]?.ownerName
        || bbRoom?.opponent
        || "Opponent";
      const result: "W" | "L" = won ? "W" : "L";
      let delta = 0;
      const myMons = prev.state.teams[prev.mySide].mons;
      const opMons = prev.state.teams[prev.mySide === 0 ? 1 : 0].mons;
      const battleMonScore = (m: BattleMon) =>
        calcMaxHp(m) + m.baseStats.atk + m.baseStats.def + m.baseStats.spa + m.baseStats.spd + m.baseStats.spe;
      const myCp = myMons.reduce((s, m) => s + battleMonScore(m), 0);
      const opCp = opMons.reduce((s, m) => s + battleMonScore(m), 0);
      if (mode === "ranked") {
        // Flat ±50 rank change per ranked match, regardless of opponent strength.
        delta = won ? 50 : -50;
      }
      setBattleBoxHistory((p2) => [{ mode, result, opponent: oppName, delta, ts: Date.now() }, ...p2].slice(0, 50));
      setPlayer((p) => {
        const next = { ...p };
        if (won) next.wins = (p.wins ?? 0) + 1; else next.losses = (p.losses ?? 0) + 1;
        if (mode === "ranked") next.rank = Math.max(0, (p.rank ?? 1000) + delta);
        return next;
      });
      setPvpBanner(`${won ? "🏆 Victory" : "💀 Defeat"} vs ${oppName}${mode === "ranked" ? ` (${delta >= 0 ? "+" : ""}${delta} rank)` : ""}`);
      if (won) sfx.victory(); else sfx.faint();
      return { ...prev, awaitingMyAction: false, awaitingForceSwitch: false };
    });
  }

  const handlePvpAction = useCallback((act: BAction) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== ws.OPEN) return;
    ws.send(JSON.stringify({ type: "action", playerId: myPlayerIdRef.current, action: act }));
    setPvpBattle((prev) => prev ? { ...prev, awaitingMyAction: false } : prev);
  }, []);

  // Cleanup WS on unmount.
  useEffect(() => () => { try { wsRef.current?.close(); } catch { /* ignore */ } }, []);
  // Memoize for key derivation; avoids unused-var warnings in some builds.
  const _leagueBgUnused = useMemo(() => null, []); void _leagueBgUnused;

  function inventoryQty(name: string): number {
    return inventory.find((it) => it.name === name)?.qty ?? 0;
  }
  function addItem(name: string, qty: number) {
    setInventory((inv) => {
      const i = inv.findIndex((x) => x.name === name);
      if (i >= 0) { const n = [...inv]; n[i] = { ...n[i], qty: n[i].qty + qty }; return n; }
      return [...inv, { name, qty }];
    });
  }
  function consumeItem(name: string, qty = 1): boolean {
    const have = inventoryQty(name);
    if (have < qty) return false;
    setInventory((inv) => inv.flatMap((x) => x.name === name ? (x.qty - qty > 0 ? [{ ...x, qty: x.qty - qty }] : []) : [x]));
    return true;
  }

  function getPokemon(id: number) { return ALL_POKEMON.find((p) => p.id === id)!; }

  function spawnWild(forceLegendary = false): Mon | null {
    const region = REGIONS[player.macroRegion] ?? REGIONS[0];
    const pool = REGION_POOLS[region.gen] ?? [];
    const legends = REGION_LEGENDS[region.gen] ?? [];
    let id: number;
    let isLegend = forceLegendary;
    if (!forceLegendary) {
      const next = huntCount + 1;
      if (next >= legendThreshold && legends.length > 0) {
        isLegend = true;
      }
    }
    if (isLegend && legends.length > 0) {
      id = legends[Math.floor(Math.random() * legends.length)];
      setHuntCount(0);
      setLegendThreshold(20 + Math.floor(Math.random() * 16));
      addLog(`✨ A LEGENDARY Pokémon appears!`, "#FFD700");
    } else {
      if (pool.length === 0) { addLog("No wild Pokémon here yet!", "#F44336"); return null; }
      id = pool[Math.floor(Math.random() * pool.length)];
      setHuntCount((c) => c + 1);
    }
    const template = getPokemon(id);
    // Wild Pokémon levels are now completely random across the whole 5–89 range,
    // independent of the player's region. Legendary still gets a small boost.
    const lv = isLegend
      ? Math.min(99, 60 + Math.floor(Math.random() * 30))
      : 5 + Math.floor(Math.random() * 85);
    return makeMon(template, lv);
  }

  function openHunt() {
    const w = spawnWild();
    if (!w) return;
    setScoutedWild(w);
    setSeen((prev) => prev.has(w.id) ? prev : new Set(prev).add(w.id));
    setScreen("hunt");
  }

  function spawnSafari(forceLegendary = false): Mon | null {
    const region = REGIONS[safariRegion] ?? REGIONS[0];
    const pool = REGION_POOLS[region.gen] ?? [];
    const legends = REGION_LEGENDS[region.gen] ?? [];
    const isLegend = forceLegendary && legends.length > 0;
    const id = isLegend
      ? legends[Math.floor(Math.random() * legends.length)]
      : pool[Math.floor(Math.random() * pool.length)];
    if (!id) return null;
    // Levels are random across the entire 5–89 range — no per-region cap.
    const lv = isLegend
      ? Math.min(99, 60 + Math.floor(Math.random() * 30))
      : 5 + Math.floor(Math.random() * 85);
    return makeMon(getPokemon(id), lv);
  }

  function enterSafari() {
    // Resume an active session instead of restarting
    if (safariBalls > 0 || safariEnc) {
      setScreen("safari");
      addLog("Resumed your Safari run.", "#26A69A");
      return;
    }
    sfx.menuOpen();
    setShowSafariRegionPicker(true);
  }

  function startSafariInRegion(regionIdx: number) {
    const today = todayStr();
    const usedToday = lastSafariDayByRegion[regionIdx] === today;
    const hasPass = inventoryQty("Safari Pass") > 0;
    if (usedToday && !hasPass) {
      addLog(`You've already entered the ${REGIONS[regionIdx].name} Safari today. Use a Safari Pass or come back tomorrow!`, "#F44336");
      sfx.menuBack();
      return;
    }
    if (player.money < 100) {
      addLog("Not enough money! Safari entry costs ₽100.", "#F44336");
      sfx.menuBack();
      return;
    }
    if (usedToday && hasPass) {
      consumeItem("Safari Pass", 1);
      addLog("Used 1 Safari Pass!", "#26C6DA");
    }
    setPlayer((p) => ({ ...p, money: p.money - 100 }));
    setSafariRegion(regionIdx);
    setShowSafariRegionPicker(false);
    setSafariBalls(30);
    setSafariCounter(0);
    setSafariCaught(0);
    setSafariNextLegend(3 + Math.floor(Math.random() * 3));
    const region = REGIONS[regionIdx];
    addLog(`Welcome to the ${region.name} Safari Zone! 30 balls, no battles — catch only.`, "#26A69A");
    const next = 1;
    const isLegend = next >= (3 + Math.floor(Math.random() * 3));
    // spawnSafari uses safariRegion state; call directly with the region we just picked
    const pool = REGION_POOLS[region.gen] ?? [];
    const legends = REGION_LEGENDS[region.gen] ?? [];
    const useLegend = isLegend && legends.length > 0;
    const id = useLegend
      ? legends[Math.floor(Math.random() * legends.length)]
      : pool[Math.floor(Math.random() * pool.length)];
    const sm = id ? makeMon(getPokemon(id), useLegend
      ? Math.min(99, 60 + Math.floor(Math.random() * 30))
      : 5 + Math.floor(Math.random() * 85)) : null;
    setSafariEnc(sm);
    if (sm) setSeen((prev) => prev.has(sm.id) ? prev : new Set(prev).add(sm.id));
    setSafariCounter(1);
    setScreen("safari");
  }

  function safariNext(currentBalls: number) {
    if (currentBalls <= 0) {
      addLog(`Safari ended! You caught ${safariCaught} Pokémon.`, "#FFD700");
      setSafariEnc(null);
      setSafariStatusMsg(null);
      setLastSafariDayByRegion((prev) => ({ ...prev, [safariRegion]: todayStr() }));
      setScreen("world");
      return;
    }
    const next = safariCounter + 1;
    const triggerLegend = next >= safariNextLegend;
    const region = REGIONS[safariRegion] ?? REGIONS[0];
    const legends = REGION_LEGENDS[region.gen] ?? [];
    const isLegend = triggerLegend && legends.length > 0;
    if (isLegend) {
      setSafariNextLegend(next + 3 + Math.floor(Math.random() * 3));
    }
    const sm = spawnSafari(isLegend);
    setSafariEnc(sm);
    setSafariStatusMsg(null);
    if (sm) setSeen((prev) => prev.has(sm.id) ? prev : new Set(prev).add(sm.id));
    setSafariCounter(next);
  }

  function safariThrow() {
    if (!safariEnc || safariBalls <= 0 || safariThrowAnim) return;
    const ballsLeft = safariBalls - 1;
    setSafariBalls(ballsLeft);
    sfx.click();
    const isLegend = ALL_LEGENDARY_IDS.has(safariEnc.id);
    const baseRate = isLegend ? 0.18 : 0.55;
    const lvPenalty = Math.max(0, (safariEnc.level - 20) * 0.01);
    const rate = Math.max(0.05, baseRate - lvPenalty);
    const success = Math.random() < rate;
    setSafariThrowAnim("throw");
    // Animate the "You threw a Safari" message with growing star tier ★ → ★★ → ★★★
    setSafariStatusMsg({ kind: "throw", text: "You threw a Safari", stars: 1 });
    setTimeout(() => setSafariStatusMsg({ kind: "throw", text: "You threw a Safari", stars: 2 }), 250);
    setTimeout(() => setSafariStatusMsg({ kind: "throw", text: "You threw a Safari", stars: 3 }), 500);
    setTimeout(() => setSafariThrowAnim("wobble"), 500);
    const encName = safariEnc.name;
    setTimeout(() => {
      if (success) {
        setSafariThrowAnim("stars");
        const caughtMon = safariEnc;
        sfx.victory();
        setCaught((prev) => new Set(prev).add(caughtMon.id));
        setCandies((prev) => ({ ...prev, [caughtMon.id]: (prev[caughtMon.id] ?? 0) + (isLegend ? 5 : 3) }));
        if (team.length < TEAM_MAX) {
          setTeam((prev) => prev.length < TEAM_MAX ? [...prev, caughtMon] : prev);
        } else {
          setBox((prev) => [...prev, caughtMon]);
        }
        setSafariCaught((c) => c + 1);
        setSafariStatusMsg({ kind: "caught", text: `You Caught A Wild ${encName}` });
      } else {
        setSafariThrowAnim("burst");
        setSafariStatusMsg({ kind: "fled", text: `Your Safari Failed And wild ${encName} Has fled.` });
      }
      setTimeout(() => {
        setSafariThrowAnim(null);
        safariNext(ballsLeft);
      }, 1400);
    }, 1500);
  }

  function safariRun() {
    if (safariThrowAnim) return;
    sfx.menuBack();
    safariNext(safariBalls);
  }

  function rescout() {
    sfx.click();
    const w = spawnWild();
    if (w) {
      setScoutedWild(w);
      setSeen((prev) => prev.has(w.id) ? prev : new Set(prev).add(w.id));
      // Hunting reward — small XP & coin per scout
      const reward = 5 + Math.floor(Math.random() * 10);
      setPlayer((p) => ({ ...p, money: p.money + reward, exp: p.exp + 5 }));
      addLog(`🔍 Hunt reward: +₽${reward}, +5 XP`, "#26A69A");
    }
  }

  function captureScouted() {
    if (!scoutedWild) return;
    const validTeam = team.filter((m) => m.currentHp > 0);
    if (validTeam.length === 0) {
      addLog("Your team is too exhausted to battle!", "#F44336");
      return;
    }
    const region = REGIONS[player.macroRegion] ?? REGIONS[0];
    const pMon = { ...validTeam[0] };
    addLog(`A wild ${scoutedWild.name} (Lv${scoutedWild.level}) appeared in ${region.name}!`, "#FFD700");
    // Hidden flee threshold: wild Pokémon flees the FIRST time the player
    // throws a ball that misses AFTER this many balls have been used.
    // Random 1–5 means some catches succeed/fail before the mon ever runs.
    const fleeThreshold = 1 + Math.floor(Math.random() * MAX_BATTLE_BALLS);
    setBattle({ wild: scoutedWild, pMon, phase: "choose", turnCount: 0, canCatch: true, ballsThrown: 0, selectedBall: "Poké Ball", fleeThreshold });
    setScoutedWild(null);
    setScreen("battle");
  }

  function doPlayerMove(move: string) {
    if (!battle || battle.phase !== "choose") return;
    let { wild, pMon } = battle;
    const logs: [string, string][] = [];
    wild = { ...wild }; pMon = { ...pMon };

    // Use real move data (power + accuracy) from move-data.ts so wild battles
    // line up with what's shown on the move buttons.
    const md = getMove(move);
    const pwr = md.power;
    const accuracy = md.accuracy;
    const hit = Math.random() * 100 < accuracy;
    playMoveSfx(move);
    setMoveAnim({ target: "enemy", type: moveTypeOf(move), key: Date.now() });
    setTimeout(() => setMoveAnim(null), 600);
    if (!hit) {
      logs.push([`💨 ${pMon.name}'s ${move} missed!`, "#FFB74D"]);
    } else {
      const dmg = calcDmg(pMon.atk, wild.def, pwr);
      if (dmg > 0) {
        wild.currentHp = Math.max(0, wild.currentHp - dmg);
        setShakeE(true); setTimeout(() => setShakeE(false), 350);
        setTimeout(() => sfx.hit(), 250);
        logs.push([`⚔️ ${pMon.name} used ${move}! (${dmg} dmg)`, "#81D4FA"]);
      } else {
        logs.push([`✨ ${pMon.name} used ${move}!`, "#aaa"]);
      }
    }

    if (wild.currentHp <= 0) {
      const expGain = Math.floor(wild.level * (wild.atk + wild.def) / 8);
      pMon.exp += expGain;
      logs.push([`⭐ Wild ${wild.name} fainted! +${expGain} EXP`, "#F44336"]);
      logs.forEach(([m, c]) => addLog(m, c));
      setTimeout(() => sfx.faint(), 400);
      setTimeout(() => sfx.victory(), 1100);
      finishBattle(pMon, true, expGain);
      return;
    }

    const eMove = wild.moves[Math.floor(Math.random() * wild.moves.length)];
    const eMd = getMove(eMove);
    const ePwr = eMd.power;
    const eAcc = eMd.accuracy;
    const eHit = Math.random() * 100 < eAcc;
    setTimeout(() => {
      playMoveSfx(eMove);
      setMoveAnim({ target: "player", type: moveTypeOf(eMove), key: Date.now() });
      setTimeout(() => setMoveAnim(null), 600);
    }, 700);
    if (!eHit) {
      logs.push([`💨 ${wild.name}'s ${eMove} missed!`, "#FFB74D"]);
    } else {
      const eDmg = calcDmg(wild.atk, pMon.def, ePwr);
      if (eDmg > 0) {
        pMon.currentHp = Math.max(0, pMon.currentHp - eDmg);
        setShakeP(true); setTimeout(() => setShakeP(false), 350);
        setTimeout(() => sfx.hurt(), 950);
        logs.push([`💢 ${wild.name} used ${eMove}! (${eDmg} dmg)`, "#FF7043"]);
      } else {
        logs.push([`${wild.name} used ${eMove}!`, "#aaa"]);
      }
    }

    logs.forEach(([m, c]) => addLog(m, c));

    if (pMon.currentHp <= 0) {
      setTimeout(() => sfx.faint(), 1000);
      addLog(`💀 ${pMon.name} fainted!`, "#F44336");
      // Persist the fainted state into the team
      setTeam((prev) => prev.map((m) => (m.id === pMon.id && m.level === pMon.level) ? { ...m, currentHp: 0 } : m));
      // Look for next available
      const aliveOthers = team.filter((m) => m.currentHp > 0 && !(m.id === pMon.id && m.level === pMon.level));
      if (aliveOthers.length === 0) {
        addLog("All your Pokémon fainted! You blacked out...", "#F44336");
        setTeam((prev) => prev.map((m) => ({ ...m, currentHp: m.maxHp, status: null })));
        addLog("Your team was fully healed!", "#4CAF50");
        setBattle(null);
        setScreen("world");
        return;
      }
      addLog(`Choose your next Pokémon!`, "#FFD700");
      setBattle((prev) => prev && ({ ...prev, wild, pMon, turnCount: prev.turnCount + 1 }));
      setShowSwitchPicker(true);
      return;
    }
    setBattle((prev) => prev && ({ ...prev, wild, pMon, turnCount: prev.turnCount + 1 }));
  }

  function openSwitchPicker() {
    if (!battle) return;
    const aliveOthers = team.filter((m) => m.currentHp > 0 && !(m.id === battle.pMon.id && m.level === battle.pMon.level));
    if (aliveOthers.length === 0) {
      addLog("No other Pokémon able to fight!", "#F44336");
      return;
    }
    sfx.menuOpen();
    setShowSwitchPicker(true);
  }

  function pickSwitchTo(target: Mon) {
    if (!battle) return;
    const { pMon } = battle;
    if (target.currentHp <= 0) return;
    if (target.id === pMon.id && target.level === pMon.level) { setShowSwitchPicker(false); return; }
    const next = { ...target };
    setTeam((prev) => {
      const newTeam = [...prev];
      const idx = newTeam.findIndex((m) => m.id === pMon.id && m.level === pMon.level);
      if (idx !== -1) newTeam[idx] = pMon;
      const nIdx = newTeam.findIndex((m) => m.id === next.id && m.level === next.level);
      if (nIdx > 0) { const tmp = newTeam[0]; newTeam[0] = newTeam[nIdx]; newTeam[nIdx] = tmp; }
      return newTeam;
    });
    setBattle((prev) => prev && ({ ...prev, pMon: next }));
    addLog(`Go, ${next.name}!`, "#FFD700");
    setShowSwitchPicker(false);
  }

  function startThrowAim(ballName?: string) {
    if (!battle || ballAnim || ringActive) return;
    if (battle.ballsThrown >= MAX_BATTLE_BALLS) {
      addLog(`Out of throw attempts this battle!`, "#F44336");
      return;
    }
    const ball = ballName ?? battle.selectedBall ?? "Poké Ball";
    if (inventoryQty(ball) <= 0) {
      addLog(`You have no ${ball}!`, "#F44336");
      return;
    }
    setBattle((prev) => prev && ({ ...prev, selectedBall: ball }));
    setShowBallPicker(false);
    setRingRadius(110);
    ringDirRef.current = -1;
    setRingActive(true);
  }

  function openBallPicker() {
    if (!battle || ballAnim) return;
    if (battle.ballsThrown >= MAX_BATTLE_BALLS) {
      addLog(`Out of throw attempts this battle!`, "#F44336");
      return;
    }
    setShowBallPicker(true);
  }

  function releaseThrow() {
    if (!battle || ballAnim || !ringActive) return;
    const { wild } = battle;
    const ballName = battle.selectedBall || "Poké Ball";
    if (!consumeItem(ballName, 1)) {
      addLog(`You have no ${ballName}!`, "#F44336");
      setRingActive(false);
      return;
    }
    const ctx: BallCtx = {
      wild,
      player: battle.pMon,
      turnCount: battle.turnCount,
      alreadyCaughtSpecies: caught.has(wild.id),
    };
    const ballMult = ballMultiplier(ballName, ctx);
    const isMaster = ballName === "Master Ball";
    const q = ringQuality(ringRadius);
    setRingActive(false);
    sfx.ballThrow();
    setBallAnim("throw");
    addLog(`Threw ${ballName} — ${q.label} (×${ballMult.toFixed(2)})`, q.color);
    setBattle((prev) => prev && ({ ...prev, ballsThrown: prev.ballsThrown + 1 }));
    const baseRate = 0.2 + (1 - wild.currentHp / wild.maxHp) * 0.6;
    const catchRate = isMaster ? 1 : Math.min(0.97, baseRate * q.mult * ballMult);
    const success = Math.random() < catchRate;

    setTimeout(() => setBallAnim("capture"), 600);
    setTimeout(() => { sfx.ballWobble(); setBallAnim("wobble"); }, 1100);
    setTimeout(() => sfx.ballWobble(), 1500);
    setTimeout(() => sfx.ballWobble(), 1900);

    setTimeout(() => {
      if (success) {
        setBallAnim("success");
        sfx.catchSuccess();
        addLog(`🎉 Gotcha! ${wild.name} (CP ${getCP(wild)}) was caught!`, "#4CAF50");
        const caughtMon = { ...wild, uid: wild.uid ?? makeUid(), origin: "wild" as const, caughtAt: Date.now(), currentHp: wild.maxHp };
        setCaught((prev) => new Set([...prev, wild.id]));
        if (team.length < TEAM_MAX) {
          setTeam((prev) => prev.length < TEAM_MAX
            ? [...prev.map((m) => ({ ...m, currentHp: m.maxHp, status: null })), caughtMon]
            : prev.map((m) => ({ ...m, currentHp: m.maxHp, status: null })));
        } else {
          setTeam((prev) => prev.map((m) => ({ ...m, currentHp: m.maxHp, status: null })));
          setBox((prev) => [...prev, caughtMon]);
          addLog(`Team is full (${TEAM_MAX}/${TEAM_MAX}) — ${caughtMon.name} sent to your Mons collection.`, "#FF9800");
        }
        awardCatchRewards(wild.id, q.mult, q.xp);
        addLog("Your team was fully healed!", "#4CAF50");
        setTimeout(() => {
          setBallAnim(null);
          setBattle(null);
          setScreen("hunt");
        }, 900);
      } else {
        setBallAnim("fail");
        sfx.catchFail();
        addLog(`${wild.name} broke free!`, "#F44336");
        setTimeout(() => setBallAnim(null), 500);
        // Wild flee logic: chance grows with throws; forced after MAX_BATTLE_BALLS
        setTimeout(() => {
          setBattle((prev) => {
            if (!prev) return prev;
            const thrown = prev.ballsThrown;
            // Wild flees once the player has thrown at least its (hidden)
            // flee threshold balls. Always flees by MAX_BATTLE_BALLS.
            const threshold = prev.fleeThreshold ?? MAX_BATTLE_BALLS;
            const shouldFlee = thrown >= threshold;
            if (shouldFlee) {
              addLog(`💨 Wild ${wild.name} fled!`, "#FF9800");
              setTimeout(() => { setBattle(null); setScreen("hunt"); }, 700);
            }
            return prev;
          });
        }, 800);
      }
    }, 2300);
  }

  function finishBattle(pMon: Mon, _won: boolean, playerExpGain: number) {
    let mon = { ...pMon };
    let didEvolve: { from: Mon; to: PokemonTemplate } | null = null;
    while (mon.exp >= mon.expNeeded) {
      mon.level += 1;
      mon.exp -= mon.expNeeded;
      mon.expNeeded = Math.floor(mon.level * mon.level * 1.2);
      const hpGain = Math.floor(mon.hp / 25) + 2;
      mon.maxHp += hpGain; mon.currentHp = Math.min(mon.currentHp + hpGain, mon.maxHp);
      mon.atk += Math.floor(mon.atk / 20) + 1;
      mon.def += Math.floor(mon.def / 20) + 1;
      mon.spe += Math.floor(mon.spe / 25) + 1;
      sfx.levelUp();
      addLog(`🆙 ${mon.name} leveled up to Lv${mon.level}!`, "#FFD700");

      if (mon.canEvolve && mon.evolveAt && mon.level >= mon.evolveAt) {
        const evo = ALL_POKEMON.find((p) => p.id === mon.canEvolve);
        if (evo) didEvolve = { from: mon, to: evo };
      }
    }

    setPlayer((prev) => {
      const p = { ...prev };
      p.exp += playerExpGain;
      while (p.exp >= p.expNeeded) {
        p.level += 1;
        p.exp -= p.expNeeded;
        p.expNeeded = Math.floor(p.level * p.level * 15);
        addLog(`🆙 You leveled up to Trainer Rank ${p.level}!`, "#FF9800");
      }
      return p;
    });

    setTeam((prev) => {
      const newTeam = prev.map((m) => m.id === mon.id ? mon : m);
      return newTeam.map((m) => ({ ...m, currentHp: m.maxHp, status: null }));
    });
    addLog("Your team was fully healed!", "#4CAF50");
    setCaught((prev) => new Set([...prev, mon.id]));
    setBattle(null);

    if (didEvolve) {
      const ev = didEvolve;
      setTimeout(() => {
        // Mutate-in-place: keep the original Pokémon's uid, nickname, IVs, EVs and nature.
        // Only species, moves and base stats roll over to the evolved form.
        const evolved = makeMon(ev.to, mon.level, "evolve");
        evolved.uid = ev.from.uid;
        evolved.nickname = ev.from.nickname;
        evolved.exp = mon.exp;
        evolved.expNeeded = mon.expNeeded;
        evolved.ivHp = ev.from.ivHp; evolved.ivAtk = ev.from.ivAtk; evolved.ivDef = ev.from.ivDef;
        evolved.ivSpa = ev.from.ivSpa; evolved.ivSpd = ev.from.ivSpd; evolved.ivSpe = ev.from.ivSpe;
        evolved.evHp = ev.from.evHp; evolved.evAtk = ev.from.evAtk; evolved.evDef = ev.from.evDef;
        evolved.evSpa = ev.from.evSpa; evolved.evSpd = ev.from.evSpd; evolved.evSpe = ev.from.evSpe;
        evolved.nature = ev.from.nature ?? evolved.nature;
        evolved.currentHp = evolved.maxHp;
        // Replace the SAME Pokémon (by uid) — never duplicates, never assumes index 0.
        setTeam((prev) => prev.map((m) => (m.uid && m.uid === ev.from.uid) ? evolved : m));
        setCaught((prev) => new Set([...prev, ev.to.id]));
        sfx.evolve();
        setEvolving({ from: ev.from.name, to: ev.to.name, sprite: ev.to.sprite });
        addLog(`✨ ${ev.from.name} evolved into ${ev.to.name}!`, "#CE93D8");
        setTimeout(() => setEvolving(null), 3000);
        setScreen("world");
      }, 500);
    } else {
      setScreen("world");
    }
  }

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap');
    * { box-sizing: border-box; }
    body { margin: 0; background: #09090b; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: #18181b; }
    ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 2px; }
    @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-7px)} 60%{transform:translateX(7px)} }
    @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
    @keyframes evoFlash { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0;transform:scale(1.5)} }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
    @keyframes mvFlash { 0%{opacity:0;transform:scale(0.4)} 30%{opacity:1;transform:scale(1.4)} 100%{opacity:0;transform:scale(1.8)} }
    @keyframes mvSlash { 0%{opacity:0;transform:translate(-40px,-40px) rotate(-45deg) scale(0.5)} 40%{opacity:1} 100%{opacity:0;transform:translate(40px,40px) rotate(-45deg) scale(1.4)} }
    @keyframes mvBeam { 0%{opacity:0;transform:scaleX(0)} 20%{opacity:1;transform:scaleX(1)} 80%{opacity:1;transform:scaleX(1)} 100%{opacity:0;transform:scaleX(1)} }
    @keyframes mvSpark { 0%{opacity:0;transform:scale(0.2) rotate(0deg)} 50%{opacity:1;transform:scale(1.2) rotate(180deg)} 100%{opacity:0;transform:scale(1.6) rotate(360deg)} }
    @keyframes mvBurst { 0%{opacity:0;box-shadow:0 0 0 0 currentColor} 50%{opacity:1;box-shadow:0 0 60px 20px currentColor} 100%{opacity:0;box-shadow:0 0 100px 40px transparent} }
    @keyframes mvSwirl { 0%{opacity:0;transform:rotate(0deg) scale(0.4)} 50%{opacity:1;transform:rotate(360deg) scale(1.2)} 100%{opacity:0;transform:rotate(720deg) scale(1.6)} }
    @keyframes ballThrow { 0%{left:40px;bottom:80px;transform:rotate(0deg) scale(0.6);opacity:1} 50%{left:50%;bottom:170px;transform:rotate(540deg) scale(1)} 100%{left:calc(100% - 90px);bottom:90px;transform:rotate(1080deg) scale(1);opacity:1} }
    @keyframes ballSuck { 0%{transform:scale(1);opacity:1} 100%{transform:scale(0.1);opacity:0} }
    @keyframes ballWobble { 0%,100%{transform:rotate(0deg)} 25%{transform:rotate(-22deg)} 75%{transform:rotate(22deg)} }
    @keyframes ballBurst { 0%{transform:scale(1);opacity:1} 50%{transform:scale(1.6);opacity:0.8} 100%{transform:scale(2.2);opacity:0} }
    @keyframes catchStars { 0%{transform:translateY(0) scale(0.4);opacity:0} 30%{opacity:1} 100%{transform:translateY(-30px) scale(1.2);opacity:0} }
    .ball-throw{position:absolute;width:32px;height:32px;animation:ballThrow 0.6s ease-in forwards;z-index:50;pointer-events:none}
    .ball-static{position:absolute;width:32px;height:32px;left:calc(100% - 90px);bottom:90px;z-index:50;pointer-events:none}
    .ball-wobble{animation:ballWobble 0.45s ease-in-out infinite}
    .ball-burst{animation:ballBurst 0.5s ease-out forwards}
    .mon-suck{animation:ballSuck 0.5s ease-in forwards}
    .catch-star{position:absolute;font-size:18px;animation:catchStars 0.9s ease-out forwards}
    .pokeball{width:100%;height:100%;border-radius:50%;background:linear-gradient(180deg,#ee1515 0%,#ee1515 48%,#222 48%,#222 52%,#fff 52%,#fff 100%);border:2px solid #111;box-shadow:0 2px 4px rgba(0,0,0,0.6),inset -3px -3px 0 rgba(0,0,0,0.25),inset 3px 3px 0 rgba(255,255,255,0.25);position:relative}
    .pokeball:after{content:"";position:absolute;left:50%;top:50%;width:10px;height:10px;background:#fff;border:2px solid #111;border-radius:50%;transform:translate(-50%,-50%)}
    .mon-float { }
    .mon-shake { animation: shake 0.35s; }
    .btn {
      background: transparent;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s;
      letter-spacing: 0.2px;
    }
    .btn:hover { transform: scale(1.04); }
    .btn:active { transform: scale(0.97); }

    /* ================ Modern UI (mockup-inspired) ================ */
    :root {
      --m-bg: #09090b;
      --m-card: #18181b;
      --m-input: #27272a;
      --m-text: #f4f4f5;
      --m-muted: #a1a1aa;
      --m-border: #27272a;
      --m-blue: #3b82f6;
      --m-bluebg: #1d4ed8;
      --m-pink: #ec4899;
      --m-green: #22c55e;
      --m-orange: #f97316;
      --m-purple: #a855f7;
      --m-teal: #14b8a6;
      --m-brown: #d97706;
      --m-yellow: #eab308;
      --m-cyan: #06b6d4;
    }
    .m-app { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; color: var(--m-text); background: var(--m-bg); padding-bottom: 80px; min-height: 100vh; display:flex; flex-direction:column; position:relative; }
    .m-topbar { display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid var(--m-border); }
    .m-game-title { color: var(--m-pink); font-size:13px; font-weight:700; letter-spacing:0.5px; text-transform:uppercase; }
    .m-location { color: var(--m-muted); font-size:11px; display:flex; align-items:center; gap:6px; margin-top:4px; }
    .m-location i { color: var(--m-pink); font-size:7px; }
    .m-pill { background: var(--m-card); border:1px solid var(--m-border); padding:6px 12px; border-radius:16px; display:inline-flex; align-items:center; gap:8px; font-size:11px; color:var(--m-muted); }
    .m-pill i { color: var(--m-blue); font-size:11px; }
    .m-card { background: var(--m-card); border:1px solid var(--m-border); border-radius:24px; padding:18px; }
    .m-trainer { margin:16px 16px 12px; display:flex; flex-direction:column; gap:14px; }
    .m-trainer-head { display:flex; justify-content:space-between; align-items:flex-start; }
    .m-trainer-title { font-size:18px; font-weight:700; margin:0; text-transform:uppercase; letter-spacing:1px; }
    .m-trainer-meta { text-align:right; display:flex; flex-direction:column; gap:4px; }
    .m-id { color:var(--m-muted); font-size:11px; font-family:'JetBrains Mono', ui-monospace, monospace; }
    .m-rank { font-size:13px; font-weight:600; color: var(--m-text); }
    .m-sub { font-size:12px; color:var(--m-text); display:flex; align-items:center; gap:8px; }
    .m-sub i { font-size:6px; color:var(--m-muted); }
    .m-tbody { display:flex; gap:14px; align-items:stretch; }
    .m-sprite-box { width:84px; height:104px; background: var(--m-bg); border:1px solid var(--m-border); border-radius:12px; display:flex; align-items:center; justify-content:center; overflow:hidden; }
    .m-sprite-box img { width:80%; image-rendering:pixelated; }
    .m-stats2 { display:grid; grid-template-columns:1fr 1fr; gap:8px; flex:1; }
    .m-stat-sm { background: var(--m-bg); border:1px solid var(--m-border); border-radius:12px; padding:8px 12px; display:flex; flex-direction:column; justify-content:center; }
    .m-stat-sm .lab { color:var(--m-muted); font-size:9px; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.4px; }
    .m-stat-sm .val { font-size:13px; font-weight:600; }
    .m-prog-labels { display:flex; justify-content:space-between; font-size:9px; color:var(--m-muted); text-transform:uppercase; margin-bottom:4px; letter-spacing:0.4px; }
    .m-prog { height:12px; background: var(--m-bg); border:1px solid var(--m-border); border-radius:6px; overflow:hidden; }
    .m-prog > div { height:100%; background: var(--m-bluebg); border-radius:6px; transition: width .4s; }
    .m-foot { text-align:right; font-size:10px; color:var(--m-muted); font-family:'JetBrains Mono', ui-monospace, monospace; }

    .m-team-row { padding: 0 20px; display:flex; align-items:center; gap:10px; margin-bottom:14px; overflow-x:auto; }
    .m-team-label { font-size:11px; color:var(--m-muted); text-transform:uppercase; letter-spacing:1px; }
    .m-team-sprite { width:36px; height:36px; background: var(--m-card); border:1px solid var(--m-border); border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; overflow:hidden; }
    .m-team-sprite img { width:30px; image-rendering:pixelated; }

    .m-menu { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; padding: 0 16px; margin-bottom: 16px; }
    .m-menu-btn { background: var(--m-card); border:1px solid var(--m-border); border-radius:16px; padding:14px 6px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; font-size:12px; font-weight:600; text-transform:uppercase; cursor:pointer; transition: background-color .2s, transform .15s; letter-spacing: 0.5px; color: var(--m-text); }
    .m-menu-btn i { font-size: 18px; }
    .m-menu-btn:hover { background: #1f1f24; }
    .m-menu-btn:active { transform: scale(0.97); }
    .m-menu-btn.locked { opacity: 0.45; cursor: not-allowed; color: var(--m-muted); border-style: dashed; }
    .m-menu-btn.locked:hover { background: var(--m-card); }
    .m-menu-carousel { overflow: hidden; padding: 0 16px; margin-bottom: 10px; touch-action: pan-y; }
    .m-menu-track { display: flex; gap: 17px; transition: transform 0.3s ease; }
    .m-menu-page { flex: 0 0 100%; display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
    .m-menu-dots { display: flex; justify-content: center; gap: 8px; margin-bottom: 16px; }
    .m-menu-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--m-border); cursor: pointer; transition: all 0.2s; border: none; padding: 0; }
    .m-menu-dot.active { background: var(--m-pink); width: 22px; border-radius: 4px; }

    .m-log { background: var(--m-card); border:1px solid var(--m-border); border-radius:16px; margin: 0 16px 16px; padding:16px; min-height: 100px; max-height: 160px; overflow-y:auto; }
    .m-log .ln { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size:11px; line-height:1.6; display:flex; gap:6px; }
    .m-log .ln::before { content:">"; opacity:.7; }

    /* Marketplace */
    .m-mkt-head { text-align:center; padding: 18px 20px 8px; }
    .m-mkt-title { color: var(--m-pink); font-size:15px; font-weight:700; letter-spacing:1px; text-transform:uppercase; margin:0; }
    .m-toggle-wrap { padding: 8px 32px; }
    .m-toggle { background: var(--m-card); border:1px solid var(--m-border); border-radius:12px; display:flex; padding:4px; }
    .m-toggle-btn { flex:1; padding:9px 0; text-align:center; font-size:13px; font-weight:500; color: var(--m-muted); border-radius:8px; cursor:pointer; transition: all .2s; }
    .m-toggle-btn.active { background: var(--m-input); color: var(--m-text); box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
    .m-search-row { display:flex; gap:10px; padding:8px 16px 16px; align-items:center; }
    .m-search { flex:1; background: var(--m-card); border:1px solid var(--m-border); border-radius:20px; padding:9px 14px; display:flex; align-items:center; gap:10px; }
    .m-search i { color: var(--m-muted); font-size:12px; }
    .m-search input { background:transparent; border:none; color: var(--m-text); width:100%; outline:none; font-size:13px; font-family:inherit; }
    .m-search input::placeholder { color: var(--m-muted); }
    .m-icon-btn { width:36px; height:36px; border-radius:50%; background: var(--m-card); border:1px solid var(--m-border); color: var(--m-muted); display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:13px; }
    .m-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; padding: 0 16px 16px; }
    .m-pcard { background: radial-gradient(circle at center, #2a2a35 0%, var(--m-card) 100%); border:1px solid var(--m-border); border-radius:16px; position:relative; overflow:hidden; aspect-ratio:3/4; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; transition: transform .2s; }
    .m-pcard:hover { transform: translateY(-2px); }
    .m-pcard img { width:auto; height:48%; max-height:96px; object-fit:contain; z-index:1; margin-bottom:36px; filter: drop-shadow(0 8px 6px rgba(0,0,0,0.5)); image-rendering: pixelated; transition: transform .3s; }
    .m-pcard:hover img { transform: scale(1.12); }
    .m-pcard .ovr { position:absolute; bottom:0; left:0; width:100%; padding:28px 0 12px; background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 60%, transparent 100%); z-index:2; display:flex; flex-direction:column; align-items:center; gap:3px; }
    .m-nature { font-size:9px; color: var(--m-muted); background: rgba(255,255,255,0.08); padding:2px 6px; border-radius:6px; text-transform:uppercase; letter-spacing:.5px; }
    .m-pname { font-size:14px; font-weight:600; color: var(--m-text); }
    .m-price { font-size:12px; color: var(--m-yellow); font-weight:500; }
    .m-rare { box-shadow: 0 0 15px rgba(236,72,153,0.18); border-color: rgba(236,72,153,0.35); }
    .m-legend { box-shadow: 0 0 15px rgba(234,179,8,0.18); border-color: rgba(234,179,8,0.35); }

    /* Profile */
    .m-cover { height:140px; background: linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.75)), linear-gradient(135deg, #5e2c73 0%, #1d4ed8 50%, #ec4899 100%); width:100%; }
    .m-prof { text-align:center; margin-top:-50px; padding: 0 20px; }
    .m-avatar { width:100px; height:100px; border-radius:50%; border:4px solid var(--m-bg); background: var(--m-card); margin: 0 auto 10px; position:relative; z-index:2; display:flex; align-items:center; justify-content:center; overflow:hidden; }
    .m-avatar img { width:90px; height:90px; image-rendering:pixelated; }
    .m-prof-name { font-size:21px; font-weight:600; margin: 0 0 4px; }
    .m-prof-handle { color: var(--m-muted); font-size:13px; margin:0; }
    .m-wallet { background: var(--m-card); border:1px solid var(--m-border); border-radius:24px; margin: 22px 16px; padding: 12px 18px; display:flex; justify-content:space-between; align-items:center; }
    .m-balance { background: var(--m-bluebg); color:#fff; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 15px; display:flex; align-items:center; gap:6px; }
    .m-level-badge { color: var(--m-text); font-size:14px; font-weight:600; background: rgba(255,255,255,0.08); padding: 6px 14px; border-radius: 16px; }
    .m-stats { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin: 0 16px 18px; }
    .m-statc { background: var(--m-card); border:1px solid var(--m-border); border-radius:18px; padding: 14px; display:flex; align-items:center; gap:12px; }
    .m-stat-ic { width:32px; height:32px; background: rgba(255,255,255,0.05); border-radius:50%; display:flex; align-items:center; justify-content:center; color: var(--m-muted); font-size:13px; flex-shrink:0; }
    .m-stat-lab { color: var(--m-muted); font-size:11px; margin-bottom: 3px; }
    .m-stat-val { font-size: 15px; font-weight:600; }
    .m-hl { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin: 0 16px 24px; }
    .m-hlc { background: var(--m-card); border:1px solid var(--m-border); border-radius:18px; padding: 16px 8px; display:flex; flex-direction:column; align-items:center; text-align:center; }
    .m-hl-iw { width:42px; height:42px; background: #121214; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:12px; font-size:16px; color: var(--m-muted); }
    .m-hl-lab { color: var(--m-muted); font-size:10px; font-weight:500; margin-bottom:6px; }
    .m-hl-val { font-size:18px; font-weight:600; display:flex; align-items:center; gap:5px; }
    .m-section-h { font-size:16px; font-weight:500; margin: 0 16px 10px; }
    .m-list { margin: 0 16px 22px; display:flex; flex-direction:column; gap:10px; }
    .m-li { background: var(--m-card); border:1px solid var(--m-border); border-radius:20px; padding: 14px 18px; display:flex; align-items:center; justify-content:space-between; cursor:pointer; }
    .m-li-l { display:flex; align-items:center; gap:14px; }
    .m-li-t { display:flex; flex-direction:column; }
    .m-li-tt { font-size:14px; font-weight:500; }
    .m-li-st { color: var(--m-muted); font-size:12px; margin-top:2px; }
    .m-arrow { color: var(--m-muted); }
    .m-pill-drop { background: rgba(255,255,255,0.05); border:1px solid var(--m-border); padding:6px 12px; border-radius:16px; display:flex; align-items:center; gap:8px; font-size:13px; color: var(--m-muted); }

    /* Bottom Nav */
    .m-bnav { position:fixed; bottom:0; left:50%; transform: translateX(-50%); width:100%; max-width:460px; background: var(--m-bg); border-top:1px solid var(--m-border); display:flex; justify-content:space-around; align-items:center; padding: 14px 0; padding-bottom: calc(14px + env(safe-area-inset-bottom, 0px)); z-index: 100; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
    .m-bnav i { color: var(--m-muted); font-size: 20px; cursor:pointer; transition: color .2s; }
    .m-bnav i.active { color: var(--m-blue); }
    .m-bnav .av { width:26px; height:26px; border-radius:50%; background: var(--m-card); border:2px solid transparent; cursor:pointer; overflow:hidden; display:flex; align-items:center; justify-content:center; }
    .m-bnav .av.active { border-color: var(--m-blue); }
    .m-bnav .av img { width:100%; height:100%; image-rendering: pixelated; object-fit: cover; }
  `;

  function BottomNav({ active, go }: { active: "home" | "market" | "profile"; go: (s: string) => void }) {
    return (
      <div className="m-bnav">
        <i className={`fa-solid fa-house ${active === "home" ? "active" : ""}`} onClick={() => { sfx.click(); go("world"); }} />
        <i className={`fa-solid fa-cart-shopping ${active === "market" ? "active" : ""}`} onClick={() => { sfx.click(); go("store"); }} />
        <div className={`av ${active === "profile" ? "active" : ""}`} onClick={() => { sfx.click(); go("profile"); }}>
          <img src={TRAINER_SPRITE(player.sprite)} alt="me" />
        </div>
      </div>
    );
  }

  const S: Record<string, React.CSSProperties> = {
    root: { fontFamily: "'Press Start 2P',monospace", background: "#09090b", minHeight: "100vh", display: "flex", justifyContent: "center" },
    wrap: { width: "100%", maxWidth: 460, minHeight: "100vh", background: "#09090b", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" },
    header: { background: "#0a0a0a", borderBottom: "1px solid #1f1f1f", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  };

  function typeTag(t: string | null) {
    if (!t) return null;
    return <span style={{ background: TYPE_COLORS[t] + "44", border: `1px solid ${TYPE_COLORS[t]}`, color: TYPE_COLORS[t], fontSize: 6, padding: "2px 5px", borderRadius: 3 }}>{t}</span>;
  }

  function HpBar({ cur, max, height = 8 }: { cur: number; max: number; height?: number }) {
    const pct = Math.max(0, Math.min(100, (cur / max) * 100));
    const col = pct > 50 ? "#4CAF50" : pct > 25 ? "#FFC107" : "#F44336";
    return (
      <div style={{ background: "#111", borderRadius: 3, height, overflow: "hidden", border: "1px solid #222" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: col, transition: "width 0.4s", borderRadius: 3 }} />
      </div>
    );
  }

  function ExpBar({ exp, needed }: { exp: number; needed: number }) {
    const pct = Math.min(100, (exp / needed) * 100);
    return (
      <div style={{ background: "#111", borderRadius: 2, height: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "#3F51B5" }} />
      </div>
    );
  }

  function MoveFx({ type }: { type: string }) {
    const c = MOVE_TYPE_COLOR[type] ?? "#fff";
    const base: React.CSSProperties = {
      position: "absolute", top: 0, left: 0, width: 90, height: 90,
      pointerEvents: "none", color: c, zIndex: 5,
    };
    if (type === "fire" || type === "water" || type === "ice" || type === "psychic" || type === "dragon" || type === "electric") {
      return (
        <div style={{ ...base, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{
            width: 90, height: 8, background: `linear-gradient(90deg, transparent, ${c}, transparent)`,
            boxShadow: `0 0 20px ${c}, 0 0 40px ${c}`,
            transformOrigin: "left center", animation: "mvBeam 0.55s ease-out forwards",
          }} />
        </div>
      );
    }
    if (type === "grass" || type === "bug" || type === "poison") {
      return (
        <div style={{ ...base, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{
            width: 60, height: 60, borderRadius: "50%",
            background: `radial-gradient(circle, ${c}cc 0%, ${c}44 60%, transparent 100%)`,
            animation: "mvSwirl 0.55s ease-out forwards",
          }} />
        </div>
      );
    }
    if (type === "flying") {
      return (
        <div style={{ ...base }}>
          <div style={{
            position: "absolute", top: "30%", left: "10%", width: 70, height: 4,
            background: c, borderRadius: 2, boxShadow: `0 0 12px ${c}`,
            animation: "mvSlash 0.5s ease-out forwards",
          }} />
        </div>
      );
    }
    if (type === "ground") {
      return (
        <div style={{ ...base, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{
            width: 70, height: 14,
            background: `linear-gradient(180deg, transparent, ${c})`,
            borderRadius: "50%",
            animation: "mvFlash 0.5s ease-out forwards",
          }} />
        </div>
      );
    }
    // normal: slash + spark
    return (
      <div style={{ ...base }}>
        <div style={{
          position: "absolute", top: "20%", left: "10%", width: 60, height: 4,
          background: c, boxShadow: `0 0 8px ${c}`, borderRadius: 2,
          animation: "mvSlash 0.45s ease-out forwards",
        }} />
        <div style={{
          position: "absolute", top: "40%", left: "40%", width: 18, height: 18,
          border: `3px solid ${c}`, borderRadius: 2,
          animation: "mvSpark 0.5s ease-out forwards",
        }} />
      </div>
    );
  }

  function MonSprite({ sprite, size = 80, back = false, className = "mon-float", style = {} }: { sprite: string; size?: number; back?: boolean; className?: string; style?: React.CSSProperties }) {
    const clean = sprite.toLowerCase().replace(/[^a-z0-9-]/g, "");
    const custom = CUSTOM_SPRITE_URL(clean);
    const customList = custom ? [custom] : [];
    const fallbacks = back
      ? [
          ...customList,
          `https://play.pokemonshowdown.com/sprites/ani-back/${clean}.gif`,
          `https://play.pokemonshowdown.com/sprites/gen5-back/${clean}.png`,
          `https://play.pokemonshowdown.com/sprites/gen5/${clean}.png`,
          `https://play.pokemonshowdown.com/sprites/dex/${clean}.png`,
          `https://play.pokemonshowdown.com/sprites/home/${clean}.png`,
        ]
      : [
          ...customList,
          `https://play.pokemonshowdown.com/sprites/ani/${clean}.gif`,
          `https://play.pokemonshowdown.com/sprites/gen5/${clean}.png`,
          `https://play.pokemonshowdown.com/sprites/dex/${clean}.png`,
          `https://play.pokemonshowdown.com/sprites/home/${clean}.png`,
        ];
    return (
      <img
        src={fallbacks[0]}
        data-step="0"
        alt={sprite}
        className={className}
        style={{ imageRendering: "pixelated", width: size, height: size, objectFit: "contain", ...style }}
        onError={(e) => {
          const img = e.target as HTMLImageElement;
          const step = Number(img.dataset.step ?? "0") + 1;
          if (step < fallbacks.length) {
            img.dataset.step = String(step);
            img.src = fallbacks[step];
          } else {
            img.style.display = "none";
          }
        }}
      />
    );
  }

  if (!splashDone) {
    return <SplashLoader onDone={() => setSplashDone(true)} />;
  }

  if (screen === "nameInput") return (
    <div style={S.root}><style>{css}</style>
      <div style={S.wrap}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 32 }}>
          <MonSprite sprite="pikachu" size={80} />
          <div style={{ fontSize: 10, color: "#ff6b35" }}>WHAT IS YOUR NAME?</div>
          <input id="nf" defaultValue="Trainer" maxLength={12}
            style={{ background: "#111", border: "2px solid #ff6b35", color: "#fff", fontFamily: "'Press Start 2P',monospace", fontSize: 11, padding: "10px 14px", borderRadius: 4, textAlign: "center", outline: "none", width: "100%", maxWidth: 260 }} />
          <button className="btn" style={{ border: "2px solid #4CAF50", color: "#4CAF50", padding: "10px 20px" }}
            onClick={() => { const v = (document.getElementById("nf") as HTMLInputElement).value || "Trainer"; setPlayer((p) => ({ ...p, name: v })); setScreen("starter"); }}>
            CONFIRM ▶
          </button>
        </div>
      </div>
    </div>
  );

  if (screen === "starter") {
    const starters = [
      { id: 1, desc: "Defensive Grass type" },
      { id: 4, desc: "Fast Fire attacker" },
      { id: 7, desc: "Bulky Water tank" },
      { id: 25, desc: "Speedy Electric type" },
    ];
    return (
      <div style={S.root}><style>{css}</style>
        <div style={S.wrap}>
          <div style={{ padding: "20px 16px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#ff6b35" }}>CHOOSE YOUR STARTER</div>
            <div style={{ fontSize: 7, color: "#666", marginTop: 6 }}>Your journey through Kanto begins!</div>
          </div>
          <div style={{ padding: "0 12px 20px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
            {starters.map((s) => {
              const p = getPokemon(s.id);
              return (
                <button key={s.id} className="btn"
                  style={{ background: `${TYPE_COLORS[p.type1]}11`, border: `2px solid ${TYPE_COLORS[p.type1]}`, borderRadius: 12, padding: "8px", display: "flex", flexDirection: "row", alignItems: "center", gap: 16, textAlign: "left" }}
                  onClick={() => {
                    const mon = makeMon(p, 5, "starter");
                    setTeam([mon]);
                    setCaught(new Set([p.id]));
                    addLog(`You chose ${p.name}! Your adventure begins!`, "#FFD700");
                    setScreen("world");
                  }}>
                  <MonSprite sprite={p.sprite} size={48} style={{ animation: "none" }} />
                  <div>
                    <div style={{ color: "#fff", fontSize: 8, marginBottom: 4 }}>{p.name}</div>
                    <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>{typeTag(p.type1)}{typeTag(p.type2)}</div>
                    <div style={{ color: "#888", fontSize: 6 }}>{s.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "world") {
    const region = REGIONS[player.macroRegion] ?? REGIONS[0];
    const expPct = Math.min(100, (player.exp / player.expNeeded) * 100);
    type MenuBtn = { label: string; icon: string; color: string; action?: () => void; locked?: boolean };
    const menuPage1: MenuBtn[] = [
      { label: "Hunt",   icon: "fa-dragon",          color: "var(--m-green)",  action: openHunt },
      { label: "Teams",  icon: "fa-users",           color: "var(--m-orange)", action: () => setScreen("team") },
      { label: "Card",   icon: "fa-id-card",         color: "var(--m-pink)",   action: () => setScreen("card") },
      { label: "Dex",    icon: "fa-book",            color: "var(--m-purple)", action: () => setScreen("poketalesDex") },
      { label: "Region", icon: "fa-map",             color: "var(--m-blue)",   action: () => setScreen("regionSelect") },
      { label: "Safari", icon: "fa-umbrella-beach",  color: "var(--m-teal)",   action: enterSafari },
      { label: "Bag",    icon: "fa-suitcase",        color: "var(--m-brown)",  action: () => setScreen("inventory") },
      { label: "Store",  icon: "fa-store",           color: "var(--m-yellow)", action: () => setScreen("store") },
      { label: "Mons",   icon: "fa-paw",             color: "var(--m-cyan)",   action: () => setScreen("mons") },
    ];
    const menuPage2: MenuBtn[] = [
      { label: "Battle Box",    icon: "fa-shield-halved", color: "var(--m-pink)",   action: () => { sfx.menuOpen(); setBbMode(null); setBbRoom(null); setScreen("battleBox"); } },
      { label: "Training Zone", icon: "fa-dumbbell",      color: "var(--m-orange)", action: () => { sfx.menuOpen(); setScreen("training"); } },
      { label: "League",        icon: "fa-trophy",        color: "var(--m-yellow)", action: () => { sfx.menuOpen(); setScreen("league"); } },
      { label: "Referrals",     icon: "fa-user-plus",     color: "var(--m-green)",  action: () => addLog("Referrals coming soon!", "#9C27B0"), locked: true },
      { label: "—", icon: "fa-lock", color: "var(--m-muted)", locked: true },
      { label: "—", icon: "fa-lock", color: "var(--m-muted)", locked: true },
      { label: "—", icon: "fa-lock", color: "var(--m-muted)", locked: true },
      { label: "—", icon: "fa-lock", color: "var(--m-muted)", locked: true },
      { label: "—", icon: "fa-lock", color: "var(--m-muted)", locked: true },
    ];
    const menuPages = [menuPage1, menuPage2];
    return (
      <div style={S.root}><style>{css}</style>
        <div style={{ ...S.wrap, background: "var(--m-bg)" }} className="m-app">
          {evolving && (
            <div style={{ position: "fixed", inset: 0, background: "#000a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 99, gap: 16 }}>
              <div style={{ fontSize: 14, color: "#CE93D8", textAlign: "center", animation: "pulse 0.5s infinite", fontFamily: "Inter,sans-serif", fontWeight: 700 }}>✨ EVOLVING! ✨</div>
              <div style={{ fontSize: 36, animation: "evoFlash 0.8s infinite" }}>🌟</div>
              <MonSprite sprite={evolving.sprite} size={100} />
              <div style={{ fontSize: 14, color: "#fff", fontFamily: "Inter,sans-serif" }}>{evolving.from} → {evolving.to}!</div>
            </div>
          )}

          <div className="m-topbar">
            <div>
              <div className="m-game-title">Pokémon &mdash; Crimson Sky</div>
              <div className="m-location"><i className="fa-solid fa-circle" /> {region.emoji} {region.name} &bull; Gen {region.gen}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="m-pill" style={{ cursor: "pointer" }}
                onClick={() => { const m = !muted; setMuted(m); sfx.setMuted(m); if (!m) sfx.click(); }}>
                <i className={`fa-solid ${muted ? "fa-volume-xmark" : "fa-volume-high"}`} style={{ color: muted ? "var(--m-muted)" : "var(--m-yellow)" }} />
              </span>
              <span className="m-pill"><i className="fa-solid fa-bullhorn" /> Caught: {caught.size}/{TOTAL_POKEMON}</span>
            </div>
          </div>

          <div style={{
            margin: "14px 16px 12px", background: "#0d0d1a", border: "2px solid #5e2c73", borderRadius: 12,
            padding: 14, boxShadow: "0 4px 10px rgba(0,0,0,0.5)", position: "relative",
            fontFamily: "'Press Start 2P', monospace",
          }}>
            <div style={{ textAlign: "right", fontSize: 8, color: "#aaa", marginBottom: 8, letterSpacing: 1 }}>
              IDNo. {player.id}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "1px solid #5e2c73", paddingBottom: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 14, color: "#fff", textShadow: "1px 1px #000", letterSpacing: 1 }}>TRAINER CARD</div>
              <div style={{ fontSize: 11, color: "#ddd" }}>Rank {player.level}</div>
            </div>
            <div style={{ fontSize: 9, color: "#bbb", marginBottom: 14, letterSpacing: 0.5 }}>
              {player.hometown} • {player.name}
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={TRAINER_SPRITE(player.sprite)} alt="Trainer" style={{ width: "100%", imageRendering: "pixelated" }} />
              </div>
              <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {[
                  { label: "EXP. POINTS", val: player.exp.toLocaleString(), col: "#fff" },
                  { label: "TO NEXT RANK", val: Math.max(0, player.expNeeded - player.exp).toLocaleString(), col: "#fff" },
                  { label: "WINS", val: player.wins, col: "#4CAF50" },
                  { label: "LOSSES", val: player.losses, col: "#F44336" },
                ].map((stat, i) => (
                  <div key={i} style={{ background: "#171022", border: "1px solid #312440", padding: 8, borderRadius: 4 }}>
                    <div style={{ fontSize: 6, color: "#aaa", marginBottom: 6, letterSpacing: 0.5 }}>{stat.label}</div>
                    <div style={{ fontSize: 9, color: stat.col }}>{stat.val}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 7, color: "#bbb", marginBottom: 6, letterSpacing: 0.5 }}>
                EXP PROGRESS ({player.exp} / {player.expNeeded})
              </div>
              <div style={{ background: "#222", height: 10, border: "1px solid #5e2c73", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${expPct}%`, background: "#9c27b0", height: "100%", transition: "width 0.3s" }} />
              </div>
            </div>
            <div style={{ borderTop: "1px solid #312440", paddingTop: 8, textAlign: "right", fontSize: 7, color: "#aaa" }}>
              Adventure started: {player.adventureStarted}
            </div>
          </div>

          <div style={{ margin: "0 16px 12px", display: "flex", gap: 8 }}>
            <div style={{ flex: 1, background: "linear-gradient(135deg,#7e3aed,#4c1d95)", borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 9, color: "#e9d5ff", letterSpacing: 0.5 }}>STARDUST</div>
                <div style={{ fontSize: 16, color: "#fff", fontWeight: 700 }}>✨ {(player.stardust ?? 0).toLocaleString()}</div>
              </div>
            </div>
            <div style={{ flex: 1, background: "linear-gradient(135deg,#0891b2,#155e75)", borderRadius: 12, padding: "10px 12px" }}>
              {(() => {
                void spinTick;
                const cd = 24 * 60 * 60 * 1000;
                const elapsed = Date.now() - lastSpinTs;
                const ready = lastSpinDay !== todayStr() && elapsed >= cd;
                const remainMs = Math.max(0, cd - elapsed);
                const h = Math.floor(remainMs / 3_600_000);
                const m = Math.floor((remainMs % 3_600_000) / 60_000);
                const s = Math.floor((remainMs % 60_000) / 1000);
                const fmt = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
                return (
                  <div onClick={ready ? spinPokestop : undefined}
                    style={{ cursor: ready ? "pointer" : "not-allowed", opacity: ready ? 1 : 0.85 }}>
                    <div style={{ fontSize: 9, color: "#cffafe", letterSpacing: 0.5 }}>POKÉSTOP</div>
                    <div style={{ fontSize: 14, color: "#fff", fontWeight: 700 }}>
                      {ready ? "📍 Spin!" : `⏱ ${fmt}`}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="m-team-row">
            <span className="m-team-label">Teams:</span>
            {team.length === 0 && <span style={{ fontSize: 11, color: "var(--m-muted)" }}>—</span>}
            {team.map((m, i) => (
              <div key={i} className="m-team-sprite" style={{ opacity: m.currentHp <= 0 ? 0.35 : 1 }}>
                <img src={SPRITE(m.sprite)} alt={m.name} />
              </div>
            ))}
          </div>

          <div
            className="m-menu-carousel"
            onTouchStart={(e) => { (e.currentTarget as any)._tx = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              const startX = (e.currentTarget as any)._tx as number | undefined;
              if (startX == null) return;
              const dx = e.changedTouches[0].clientX - startX;
              if (Math.abs(dx) > 40) {
                if (dx < 0 && menuPage < menuPages.length - 1) setMenuPage(menuPage + 1);
                else if (dx > 0 && menuPage > 0) setMenuPage(menuPage - 1);
              }
              (e.currentTarget as any)._tx = undefined;
            }}
          >
            <div className="m-menu-track" style={{ transform: `translateX(calc(${menuPage} * (-100% - 17px)))` }}>
              {menuPages.map((page, pi) => (
                <div key={pi} className="m-menu-page">
                  {page.map((b, bi) => (
                    <div key={`${pi}-${bi}-${b.label}`}
                      className={`m-menu-btn ${b.locked ? "locked" : ""}`}
                      style={{ color: b.color, borderColor: `${b.color}55` }}
                      onClick={() => { sfx.click(); b.action?.(); }}>
                      <i className={`fa-solid ${b.icon}`} />
                      <span>{b.label}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="m-menu-dots">
            {menuPages.map((_, i) => (
              <button key={i}
                className={`m-menu-dot ${menuPage === i ? "active" : ""}`}
                aria-label={`Go to menu page ${i + 1}`}
                onClick={() => { sfx.click(); setMenuPage(i); }} />
            ))}
          </div>

          <div ref={logRef} className="m-log">
            {log.length === 0 && <div className="ln" style={{ color: "var(--m-muted)" }}>Your adventure awaits...</div>}
            {log.map((l) => <div key={l.id} className="ln" style={{ color: l.color === "#ddd" ? "var(--m-yellow)" : l.color }}>{l.msg}</div>)}
          </div>

          <BottomNav active="home" go={setScreen} />

          {showSafariRegionPicker && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}
              onClick={() => { sfx.menuBack(); setShowSafariRegionPicker(false); }}>
              <div onClick={(e) => e.stopPropagation()}
                style={{ background: "var(--m-card)", border: "2px solid #26A69A", borderRadius: 16, padding: 18, width: "100%", maxWidth: 360, maxHeight: "85vh", overflow: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ color: "#26A69A", fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>SAFARI ZONE</div>
                  <button className="btn" style={{ border: "1px solid #555", color: "#888", padding: "4px 10px", borderRadius: 6, fontSize: 11 }}
                    onClick={() => { sfx.menuBack(); setShowSafariRegionPicker(false); }}>✕</button>
                </div>
                <div style={{ fontSize: 11, color: "var(--m-muted)", marginBottom: 14, lineHeight: 1.5 }}>
                  Pick a region for today's Safari run. Each region can only be visited once per day (use a Safari Pass to retry). Entry costs ₽100.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(() => {
                    // Reuse the same icon palette as the WORLD region picker so
                    // both screens stay visually consistent (no more emojis).
                    const safariRegionMeta: { icon: string; color: string }[] = [
                      { icon: "fa-fire",          color: "var(--m-orange)" },
                      { icon: "fa-droplet",       color: "var(--m-cyan)" },
                      { icon: "fa-leaf",          color: "var(--m-green)" },
                      { icon: "fa-snowflake",     color: "var(--m-blue)" },
                      { icon: "fa-bolt",          color: "var(--m-yellow)" },
                      { icon: "fa-crown",         color: "var(--m-pink)" },
                      { icon: "fa-umbrella-beach",color: "var(--m-teal)" },
                      { icon: "fa-chess-rook",    color: "var(--m-purple)" },
                      { icon: "fa-mountain-sun",  color: "var(--m-brown)" },
                    ];
                    return REGIONS.map((r, i) => {
                      const usedToday = lastSafariDayByRegion[i] === todayStr();
                      const hasPass = inventoryQty("Safari Pass") > 0;
                      const blocked = usedToday && !hasPass;
                      const meta = safariRegionMeta[i] ?? { icon: "fa-map", color: "var(--m-teal)" };
                      return (
                        <button key={i} className="btn"
                          disabled={blocked}
                          onClick={() => startSafariInRegion(i)}
                          style={{
                            display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                            border: `1.5px solid ${blocked ? "#3a3a3a" : "#26A69A"}`,
                            background: blocked ? "#161616" : "#0d2018",
                            borderRadius: 12, color: "#fff", textAlign: "left",
                            opacity: blocked ? 0.5 : 1, cursor: blocked ? "not-allowed" : "pointer",
                          }}>
                          <span style={{
                            width: 32, height: 32, borderRadius: "50%",
                            background: blocked ? "#222" : `${meta.color}22`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: blocked ? "#555" : meta.color, fontSize: 14, flexShrink: 0,
                          }}>
                            <i className={`fa-solid ${meta.icon}`} />
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>{r.name}</div>
                            <div style={{ fontSize: 9, color: "var(--m-muted)" }}>Gen {r.gen}</div>
                          </div>
                          <div style={{ fontSize: 10, color: usedToday ? (hasPass ? "#06b6d4" : "#f87171") : "#4ade80", fontWeight: 700 }}>
                            {usedToday ? (hasPass ? "USE PASS" : "USED TODAY") : "AVAILABLE"}
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (screen === "profile") {
    const dexPct = Math.round((caught.size / TOTAL_POKEMON) * 100);
    return (
      <div style={S.root}><style>{css}</style>
        <div style={{ ...S.wrap, background: "var(--m-bg)" }} className="m-app">
          <div className="m-cover" />
          <div className="m-prof">
            <div className="m-avatar"><img src={TRAINER_SPRITE(player.sprite)} alt="me" /></div>
            <h1 className="m-prof-name">{player.name}</h1>
            <p className="m-prof-handle">@{player.name.toLowerCase().replace(/\s+/g, "")}</p>
          </div>
          <div className="m-wallet">
            <div className="m-balance"><i className="fa-solid fa-coins" style={{ fontSize: 12 }} /> ₽{player.money.toLocaleString()}</div>
            <div className="m-balance" style={{ background: "linear-gradient(180deg,#7e3aed,#4c1d95)" }}>
              <i className="fa-solid fa-wand-sparkles" style={{ fontSize: 12 }} /> {(player.stardust ?? 0).toLocaleString()}
            </div>
            <span className="m-level-badge">Lvl {player.level}</span>
          </div>
          <h2 className="m-section-h">Redeem Centre</h2>
          <div style={{ padding: "0 16px", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", background: "#15151b", border: "1px solid #26262d", borderRadius: 999, padding: "8px", gap: 12, height: 52, boxSizing: "border-box" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#26262d", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", flexShrink: 0 }}>
                <i className="fa-solid fa-gift" style={{ fontSize: 14 }} />
              </div>
              {redeemMsg ? (
                <div style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, color: redeemMsg.ok ? "#4ade80" : "#f87171", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {redeemMsg.text}
                </div>
              ) : (
                <input
                  value={redeemInput}
                  onChange={(e) => setRedeemInput(e.target.value)}
                  placeholder="Enter redeem code"
                  style={{ flex: 1, minWidth: 0, padding: 0, border: "none", background: "transparent", color: "#fff", fontSize: 15, outline: "none" }}
                />
              )}
              <button
                onClick={() => {
                  sfx.click();
                  const code = redeemInput.trim();
                  let result: { text: string; ok: boolean };
                  if (!code) {
                    result = { text: "Enter a code first", ok: false };
                  } else if (code === "Jptx02z") {
                    if (redeemedCodes.includes(code)) {
                      result = { text: "Code already claimed", ok: false };
                    } else {
                      setPlayer((p) => ({ ...p, money: p.money + 100000, stardust: (p.stardust ?? 0) + 10000 }));
                      setRedeemedCodes((c) => [...c, code]);
                      result = { text: "Successfully redeemed!", ok: true };
                      addLog("Redeem code claimed! +₽100,000 +10,000 stardust", "#4ade80");
                    }
                  } else {
                    result = { text: "Wrong code", ok: false };
                  }
                  setRedeemInput("");
                  setRedeemMsg(result);
                  setTimeout(() => setRedeemMsg(null), 5000);
                }}
                style={{ height: 36, padding: "0 22px", borderRadius: 999, border: "none", background: "#2f7bff", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer", flexShrink: 0, lineHeight: 1 }}
              >
                Claim
              </button>
            </div>
          </div>
          <div className="m-stats">
            <div className="m-statc">
              <div className="m-stat-ic"><i className="fa-solid fa-gavel" /></div>
              <div><div className="m-stat-lab">Banned</div><div className="m-stat-val">No</div></div>
            </div>
            <div className="m-statc">
              <div className="m-stat-ic"><i className="fa-solid fa-shield" /></div>
              <div><div className="m-stat-lab">Rank</div><div className="m-stat-val">{player.level >= 30 ? "Gold" : player.level >= 15 ? "Silver" : "Bronze"}</div></div>
            </div>
            <div className="m-statc">
              <div className="m-stat-ic"><i className="fa-solid fa-book-open" /></div>
              <div><div className="m-stat-lab">Pokémon Seen</div><div className="m-stat-val">{seen.size}</div></div>
            </div>
            <div className="m-statc">
              <div className="m-stat-ic"><i className="fa-solid fa-circle-dot" /></div>
              <div><div className="m-stat-lab">Pokémon Caught</div><div className="m-stat-val">{caught.size}</div></div>
            </div>
          </div>
          <div className="m-hl">
            <div className="m-hlc">
              <div className="m-hl-iw"><i className="fa-solid fa-address-book" /></div>
              <span className="m-hl-lab">Pokédex</span>
              <span className="m-hl-val">{dexPct}%</span>
            </div>
            <div className="m-hl-c m-hlc">
              <div className="m-hl-iw"><i className="fa-solid fa-certificate" /></div>
              <span className="m-hl-lab">Wins</span>
              <span className="m-hl-val"><i className="fa-solid fa-sun" />{player.wins}</span>
            </div>
            <div className="m-hlc">
              <div className="m-hl-iw"><i className="fa-solid fa-wand-magic-sparkles" /></div>
              <span className="m-hl-lab">Team</span>
              <span className="m-hl-val"><i className="fa-regular fa-star" />{team.length}</span>
            </div>
          </div>
          <h2 className="m-section-h">Dex Stats</h2>
          <div className="m-list">
            <div className="m-li" onClick={() => { sfx.click(); setScreen("dex"); }}>
              <div className="m-li-l">
                <div className="m-stat-ic"><i className="fa-solid fa-book-open" /></div>
                <div className="m-li-t"><span className="m-li-tt">{seen.size} Pokémon Seen</span><span className="m-li-st">Browse</span></div>
              </div>
              <i className="fa-solid fa-caret-right m-arrow" />
            </div>
            <div className="m-li" onClick={() => { sfx.click(); setScreen("caught"); }}>
              <div className="m-li-l">
                <div className="m-stat-ic"><i className="fa-solid fa-circle-check" /></div>
                <div className="m-li-t"><span className="m-li-tt">{caught.size} Pokémon Caught</span><span className="m-li-st">By region</span></div>
              </div>
              <i className="fa-solid fa-caret-right m-arrow" />
            </div>
          </div>
          <h2 className="m-section-h">Preferences</h2>
          <div className="m-list">
            <div className="m-li" onClick={() => { const m = !muted; setMuted(m); sfx.setMuted(m); if (!m) sfx.click(); }}>
              <span className="m-li-tt">Sound</span>
              <div className="m-pill-drop">{muted ? "off" : "on"} <i className="fa-solid fa-chevron-down" style={{ fontSize: 10 }} /></div>
            </div>
            <div className="m-li" onClick={() => { sfx.click(); setScreen("card"); }}>
              <span className="m-li-tt">Edit Trainer Card</span>
              <i className="fa-solid fa-caret-right m-arrow" />
            </div>
            <div className="m-li" onClick={resetSave} style={{ borderColor: "#7f1d1d" }}>
              <span className="m-li-tt" style={{ color: "#f87171" }}>Reset Save</span>
              <i className="fa-solid fa-trash m-arrow" style={{ color: "#f87171" }} />
            </div>
          </div>
          <BottomNav active="profile" go={setScreen} />
          {showBuddyPicker && (
            <div onClick={() => setShowBuddyPicker(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <div onClick={(e) => e.stopPropagation()}
                style={{ background: "#0d0d1a", border: "2px solid #5e2c73", borderRadius: 14, padding: 16, width: "100%", maxWidth: 360, maxHeight: "70vh", overflowY: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ color: "#fff", margin: 0, fontSize: 16 }}>Choose Buddy</h3>
                  <button onClick={() => setShowBuddyPicker(false)}
                    style={{ background: "transparent", border: "1px solid #555", color: "#ccc", padding: "4px 10px", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>Close</button>
                </div>
                {team.length === 0 && <div style={{ color: "#888", textAlign: "center", padding: 30 }}>No Pokémon in team</div>}
                {team.map((m, i) => (
                  <div key={i}
                    onClick={() => { setBuddyIdx(i); setShowBuddyPicker(false); sfx.menuOpen(); addLog(`${m.name} is now your buddy!`, "#FFD700"); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, marginBottom: 6, border: `2px solid ${buddyIdx === i ? "#4ade80" : "#312440"}`, borderRadius: 10, cursor: "pointer", background: buddyIdx === i ? "rgba(74,222,128,0.1)" : "transparent" }}>
                    <MonSprite sprite={m.sprite} size={48} className="" />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#fff", fontWeight: 600 }}>{m.name}</div>
                      <div style={{ color: "#888", fontSize: 11 }}>Lv {m.level} • CP {getCP(m)}</div>
                    </div>
                    {buddyIdx === i && <span style={{ color: "#4ade80", fontSize: 18 }}>✓</span>}
                  </div>
                ))}
                {buddyIdx >= 0 && (
                  <button onClick={() => { setBuddyIdx(-1); setShowBuddyPicker(false); }}
                    style={{ width: "100%", marginTop: 8, padding: 10, background: "transparent", border: "1px solid #7f1d1d", color: "#f87171", borderRadius: 8, cursor: "pointer" }}>
                    Remove Buddy
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (screen === "card") return (
    <div style={S.root}><style>{css}</style>
      <div style={S.wrap}>
        <div style={S.header}>
          <span style={{ fontSize: 9, color: "#E91E63" }}>🪪 EDIT CARD</span>
          <button className="btn" style={{ border: "1px solid #555", color: "#888", padding: "5px 10px" }} onClick={() => setScreen("world")}>◀ BACK</button>
        </div>

        {/* Full-size preview */}
        <div style={{ margin: 16, background: "#0d0d1a", border: "3px solid #5e2c73", borderRadius: 12, padding: 18, boxShadow: "0 4px 15px rgba(0,0,0,0.5)" }}>
          <div style={{ textAlign: "right", fontSize: 8, color: "#888", marginBottom: 6, letterSpacing: 1 }}>
            IDNo. {player.id}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "2px solid #5e2c73", paddingBottom: 10, marginBottom: 14 }}>
            <div style={{ fontSize: 16, color: "#fff", textShadow: "1px 1px #000" }}>TRAINER CARD</div>
            <div style={{ fontSize: 12, color: "#ddd" }}>Rank {player.level}</div>
          </div>
          <div style={{ fontSize: 9, color: "#aaa", marginBottom: 16, letterSpacing: 0.5 }}>
            {player.hometown} • {player.name}
          </div>
          <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            <div style={{ width: 90, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src={TRAINER_SPRITE(player.sprite)} alt="Trainer" style={{ width: "100%", imageRendering: "pixelated" }} />
            </div>
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "EXP. POINTS", val: player.exp.toLocaleString(), col: "#fff" },
                { label: "TO NEXT RANK", val: Math.max(0, player.expNeeded - player.exp).toLocaleString(), col: "#fff" },
                { label: "WINS", val: player.wins, col: "#4CAF50" },
                { label: "LOSSES", val: player.losses, col: "#F44336" },
              ].map((stat, i) => (
                <div key={i} style={{ background: "#171022", border: "1px solid #312440", padding: 10, borderRadius: 4 }}>
                  <div style={{ fontSize: 6, color: "#888", marginBottom: 8 }}>{stat.label}</div>
                  <div style={{ fontSize: 9, color: stat.col }}>{stat.val}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 7, color: "#aaa", marginBottom: 8 }}>
              EXP PROGRESS ({player.exp} / {player.expNeeded})
            </div>
            <div style={{ background: "#222", height: 12, border: "1px solid #5e2c73", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${Math.min(100, (player.exp / player.expNeeded) * 100)}%`, background: "#9c27b0", height: "100%" }} />
            </div>
          </div>
          <div style={{ borderTop: "1px solid #312440", paddingTop: 10, textAlign: "right", fontSize: 7, color: "#777" }}>
            Adventure started: {player.adventureStarted}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ fontSize: 7, color: "#E91E63", marginBottom: 8 }}>TRAINER NAME</div>
            <input value={player.name} onChange={(e) => setPlayer({ ...player, name: e.target.value })} maxLength={12}
              style={{ background: "#111", border: "1px solid #333", color: "#fff", fontFamily: "'Press Start 2P',monospace", fontSize: 8, padding: "8px", borderRadius: 4, width: "100%" }} />
          </div>
          <div>
            <div style={{ fontSize: 7, color: "#E91E63", marginBottom: 8 }}>HOMETOWN</div>
            <input value={player.hometown} onChange={(e) => setPlayer({ ...player, hometown: e.target.value })} maxLength={20}
              style={{ background: "#111", border: "1px solid #333", color: "#fff", fontFamily: "'Press Start 2P',monospace", fontSize: 8, padding: "8px", borderRadius: 4, width: "100%" }} />
          </div>
          <div>
            <div style={{ fontSize: 7, color: "#E91E63", marginBottom: 8 }}>CHOOSE AVATAR (GEN V)</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {GEN_V_TRAINERS.map((ts) => (
                <button key={ts} className="btn"
                  style={{ border: `2px solid ${player.sprite === ts ? "#E91E63" : "#333"}`, background: player.sprite === ts ? "#E91E6322" : "transparent", padding: "8px", borderRadius: 8 }}
                  onClick={() => setPlayer({ ...player, sprite: ts })}>
                  <img src={TRAINER_SPRITE(ts)} style={{ height: 60, objectFit: "contain" }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (screen === "battle" && battle) {
    const { wild, pMon } = battle;
    const wildHpPct = Math.max(0, Math.min(100, (wild.currentHp / wild.maxHp) * 100));
    const wildHpClass = wildHpPct > 50 ? "#4ade80" : wildHpPct > 25 ? "#facc15" : "#f87171";
    const pHpPct = Math.max(0, Math.min(100, (pMon.currentHp / pMon.maxHp) * 100));
    const pHpClass = pHpPct > 50 ? "#4ade80" : pHpPct > 25 ? "#facc15" : "#f87171";
    const runAway = () => {
      if (ballAnim || ringActive) return;
      sfx.menuBack();
      addLog("Got away safely!", "#aaa");
      setTeam((prev) => prev.map((m) => ({ ...m, currentHp: m.maxHp, status: null })));
      addLog("Your team was fully healed!", "#4CAF50");
      setBattle(null);
      setScreen("hunt");
    };
    return (
      <div style={{ ...S.root, background: "#0a0a0c" }}>
        <style>{css}{`
          .wb-close-btn {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.08);
            color: #f0f0f0;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            backdrop-filter: blur(4px);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }
          .wb-info-card {
            background: rgba(10,10,14,0.82);
            border: 1px solid rgba(255,255,255,0.10);
            border-radius: 10px;
            padding: 8px 12px;
            backdrop-filter: blur(6px);
            min-width: 160px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }
          .wb-move-btn {
            background: linear-gradient(180deg, #1a1a22 0%, #111118 100%);
            border: 1px solid #a78bfa;
            border-radius: 10px;
            padding: 12px 14px;
            cursor: pointer;
            text-align: left;
            transition: all 0.18s ease;
            color: #f0f0f0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }
          .wb-move-btn:hover:not(:disabled) {
            background: linear-gradient(180deg, #26263a 0%, #1a1a28 100%);
            border-color: #c4b5fd;
            transform: translateY(-2px);
          }
          .wb-move-btn:active:not(:disabled) { transform: translateY(1px); }
          .wb-move-btn:disabled { opacity: 0.55; cursor: not-allowed; }
          .wb-action-btn {
            flex: 1;
            background: linear-gradient(180deg, #1c1c21 0%, #121216 100%);
            border: 1px solid rgba(255,255,255,0.08);
            color: #f0f0f0;
            padding: 16px 10px;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
            letter-spacing: 1px;
            text-transform: uppercase;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }
          .wb-action-btn:hover:not(:disabled) {
            background: linear-gradient(180deg, #2a2a32 0%, #1a1a20 100%);
            border-color: rgba(255,255,255,0.15);
            transform: translateY(-2px);
          }
          .wb-action-btn:active:not(:disabled) { transform: translateY(1px); }
          .wb-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        `}</style>
        <div style={{ ...S.wrap, background: "#0a0a0c", fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", padding: "16px 16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "2px solid #c0392b" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button className="wb-close-btn" onClick={runAway}>◀ BACK</button>
              <div style={{ fontSize: 14, letterSpacing: 3, fontWeight: 800, color: "#f87171" }}>WILD BATTLE</div>
            </div>
            <div style={{ fontSize: 12, color: "#888890", letterSpacing: 1 }}>Turn {battle.turnCount + 1}</div>
          </div>

          {/* Battle arena */}
          <div style={{
            height: 260,
            borderRadius: 16,
            border: "1px solid rgba(180,30,30,0.35)",
            backgroundImage: `url(${battleArenaBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            position: "relative",
            overflow: "hidden",
            boxShadow: "inset 0 0 60px rgba(0,0,0,0.7)",
          }}>
            {/* Enemy info card — top-left */}
            <div style={{ position: "absolute", top: 14, left: 14, zIndex: 4 }}>
              <div className="wb-info-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.5, color: "#f0f0f0" }}>{wild.name}</span>
                  <span style={{ fontSize: 11, color: "#888890" }}>Lv{wild.level}</span>
                </div>
                <div style={{ marginBottom: 5, display: "flex", gap: 4 }}>
                  {wild.type1 && (
                    <span style={{ display: "inline-block", padding: "1px 7px", borderRadius: 4, fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", background: (TYPE_COLORS[wild.type1] ?? "#444") + "33", color: TYPE_COLORS[wild.type1] ?? "#f0f0f0", border: `1px solid ${(TYPE_COLORS[wild.type1] ?? "#444")}66` }}>{wild.type1}</span>
                  )}
                  {wild.type2 && (
                    <span style={{ display: "inline-block", padding: "1px 7px", borderRadius: 4, fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", background: (TYPE_COLORS[wild.type2] ?? "#444") + "33", color: TYPE_COLORS[wild.type2] ?? "#f0f0f0", border: `1px solid ${(TYPE_COLORS[wild.type2] ?? "#444")}66` }}>{wild.type2}</span>
                  )}
                </div>
                <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden", marginBottom: 4 }}>
                  <div style={{ height: "100%", borderRadius: 3, transition: "width 0.4s ease", width: `${wildHpPct}%`, background: wildHpClass }} />
                </div>
                <div style={{ fontSize: 9, color: "#888890" }}>{wild.currentHp}/{wild.maxHp}</div>
              </div>
            </div>

            {/* Enemy sprite — top-right */}
            <div style={{ position: "absolute", top: 10, right: 14, zIndex: 3 }}>
              {ballAnim !== "capture" && ballAnim !== "wobble" && ballAnim !== "success" && (
                <MonSprite sprite={wild.sprite} size={110} className={
                  shakeE ? "mon-shake" : (ballAnim === "fail" ? "" : "mon-float")
                } style={{ filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.7))" }} />
              )}
              {ballAnim === "capture" && (
                <MonSprite sprite={wild.sprite} size={110} className="mon-suck" style={{ filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.7))" }} />
              )}
              {moveAnim?.target === "enemy" && <MoveFx key={moveAnim.key} type={moveAnim.type} />}
            </div>

            {/* Player sprite — bottom-left */}
            <div style={{ position: "absolute", bottom: 12, left: 12, zIndex: 3 }}>
              <MonSprite sprite={pMon.sprite} size={95} back className={shakeP ? "mon-shake" : "mon-float"} style={{ filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.8))" }} />
              {moveAnim?.target === "player" && <MoveFx key={moveAnim.key} type={moveAnim.type} />}
            </div>

            {/* Player info card — bottom-right */}
            <div style={{ position: "absolute", bottom: 12, right: 12, zIndex: 4 }}>
              <div className="wb-info-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.5, color: "#f0f0f0" }}>{pMon.name}</span>
                  <span style={{ fontSize: 11, color: "#888890" }}>Lv{pMon.level}</span>
                </div>
                <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden", marginBottom: 4 }}>
                  <div style={{ height: "100%", borderRadius: 3, transition: "width 0.4s ease", width: `${pHpPct}%`, background: pHpClass }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 9, color: "#888890" }}>{pMon.currentHp}/{pMon.maxHp}</span>
                  <span style={{ fontSize: 9, color: "#888890" }}>ATK: {pMon.atk}</span>
                </div>
              </div>
            </div>

            {/* Ball animations */}
            {ballAnim === "throw" && (
              <div className="ball-throw" style={{ zIndex: 5 }}><div className="pokeball" /></div>
            )}
            {(ballAnim === "capture" || ballAnim === "wobble") && (
              <div className="ball-static" style={{ zIndex: 5 }}>
                <div className={ballAnim === "wobble" ? "pokeball ball-wobble" : "pokeball"} />
              </div>
            )}
            {ballAnim === "success" && (
              <>
                <div className="ball-static" style={{ zIndex: 5 }}><div className="pokeball" /></div>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="catch-star" style={{
                    left: `calc(100% - ${60 + i * 14}px)`, bottom: `${110 + (i % 2) * 12}px`,
                    color: "#FFD700", animationDelay: `${i * 0.08}s`, zIndex: 5,
                  }}>✨</div>
                ))}
              </>
            )}
            {ballAnim === "fail" && (
              <div className="ball-static" style={{ zIndex: 5 }}><div className="pokeball ball-burst" /></div>
            )}

            {/* Aim ring */}
            {ringActive && (
              <>
                <div style={{
                  position: "absolute", top: 10, right: 14, width: 110, height: 110,
                  display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 6,
                }}>
                  <div style={{
                    width: ringRadius, height: ringRadius, borderRadius: "50%",
                    border: `3px solid ${ringQuality(ringRadius).color}`,
                    boxShadow: `0 0 12px ${ringQuality(ringRadius).color}88`,
                    transition: "border-color 0.1s",
                  }} />
                </div>
                <div style={{
                  position: "absolute", left: 0, right: 0, top: 6, textAlign: "center",
                  color: ringQuality(ringRadius).color, fontSize: 11, fontWeight: 700, letterSpacing: 2,
                  textShadow: "1px 1px 0 #000", zIndex: 7,
                }}>
                  {ringQuality(ringRadius).label}
                </div>
                <button onClick={releaseThrow}
                  style={{
                    position: "absolute", left: "50%", bottom: 8, transform: "translateX(-50%)",
                    background: "#4ade80", color: "#0a0e1a", border: "none",
                    padding: "8px 22px", borderRadius: 999, fontSize: 12, fontWeight: 800, letterSpacing: 1,
                    cursor: "pointer", boxShadow: "0 2px 10px rgba(74,222,128,0.5)", zIndex: 60,
                  }}>
                  TAP TO THROW
                </button>
              </>
            )}
          </div>

          {/* Terminal log */}
          <div style={{
            background: "#050508",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: "14px 16px",
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: 12,
            color: "#fb923c",
            lineHeight: 1.7,
            boxShadow: "inset 0 4px 10px rgba(0,0,0,0.5)",
            minHeight: 72,
            maxHeight: 96,
            overflowY: "auto",
          }}>
            {log.slice(-3).map((l) => (
              <div key={l.id} style={{ color: l.color || "#fb923c" }}>
                <span style={{ color: "#fb923c", marginRight: 6 }}>·</span>{l.msg}
              </div>
            ))}
          </div>

          {/* Moves */}
          <div style={{ fontSize: 10, letterSpacing: 2, color: "#888890", textTransform: "uppercase", paddingLeft: 2 }}>Choose a Move</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {pMon.moves.map((m) => {
              const md = getMove(m);
              return (
                <button key={m} className="wb-move-btn" onClick={() => doPlayerMove(m)}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{m}</div>
                  <div style={{ fontSize: 9, color: "#888890", letterSpacing: 0.3 }}>
                    PWR: {md.power || "—"} · ACC: {md.accuracy}% · {md.type}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <button className="wb-action-btn" onClick={openSwitchPicker}>Switch</button>
            <button className="wb-action-btn" onClick={runAway}>Run</button>
            <button className="wb-action-btn" onClick={openBallPicker}>
              Pokéballs <span style={{ fontSize: 10, color: "#888890", fontWeight: 400, letterSpacing: 0, textTransform: "none" }}>({MAX_BATTLE_BALLS - battle.ballsThrown})</span>
            </button>
          </div>

          {showSwitchPicker && (
            <div
              onClick={() => setShowSwitchPicker(false)}
              style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
                display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50,
              }}>
              <div onClick={(e) => e.stopPropagation()}
                style={{
                  background: "#10172a", border: "1.5px solid #4ade80", borderRadius: 14,
                  width: "100%", maxWidth: 320, padding: 14, display: "flex", flexDirection: "column", gap: 10,
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ color: "#4ade80", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>SWITCH POKÉMON</div>
                  <button className="btn"
                    style={{ border: "1px solid #555", color: "#888", padding: "3px 8px", borderRadius: 6, fontSize: 9 }}
                    onClick={() => setShowSwitchPicker(false)}>✕</button>
                </div>
                <div style={{ fontSize: 10, color: "#6b7896" }}>{teams[activeTeamIdx]?.name ?? "Team"} · choose your next fighter</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" }}>
                  {team.map((m, i) => {
                    const isActive = battle && m.id === battle.pMon.id && m.level === battle.pMon.level;
                    const fainted = m.currentHp <= 0;
                    const disabled = !!isActive || fainted;
                    return (
                      <button key={`sw-${i}`} className="btn"
                        disabled={disabled}
                        onClick={() => pickSwitchTo(m)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                          border: `1.5px solid ${isActive ? "#FFD700" : fainted ? "#3a1f1f" : "#2a3148"}`,
                          background: isActive ? "#1a1808" : fainted ? "#1a0d0d" : "#0a0e1a",
                          borderRadius: 10, color: "#cfd6e6", textAlign: "left",
                          opacity: disabled ? 0.55 : 1, cursor: disabled ? "not-allowed" : "pointer",
                        }}>
                        <MonSprite sprite={m.sprite} size={40} className="" style={{ animation: "none" }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{m.name}</span>
                            <span style={{ fontSize: 9, color: isActive ? "#FFD700" : "#888" }}>
                              {isActive ? "★ IN BATTLE" : fainted ? "FAINTED" : `Lv${m.level}`}
                            </span>
                          </div>
                          <div style={{ marginTop: 4 }}><HpBar cur={m.currentHp} max={m.maxHp} /></div>
                          <div style={{ fontSize: 8, color: "#6b7896", marginTop: 2 }}>
                            HP {m.currentHp}/{m.maxHp}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {showBallPicker && (
            <div
              onClick={() => setShowBallPicker(false)}
              style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
                display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50,
              }}>
              <div onClick={(e) => e.stopPropagation()}
                style={{
                  background: "#10172a", border: "1.5px solid #F44336", borderRadius: 14,
                  width: "100%", maxWidth: 320, padding: 14, display: "flex", flexDirection: "column", gap: 10,
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ color: "#F44336", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>CHOOSE A BALL</div>
                  <button className="btn"
                    style={{ border: "1px solid #555", color: "#888", padding: "3px 8px", borderRadius: 6, fontSize: 9 }}
                    onClick={() => setShowBallPicker(false)}>✕</button>
                </div>
                <div style={{ fontSize: 10, color: "#6b7896" }}>
                  Throws left this battle: {MAX_BATTLE_BALLS - battle.ballsThrown}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {BALL_NAMES.filter((n) => inventoryQty(n) > 0).map((name) => {
                    const qty = inventoryQty(name);
                    const ctx: BallCtx = {
                      wild: battle.wild,
                      player: battle.pMon,
                      turnCount: battle.turnCount,
                      alreadyCaughtSpecies: caught.has(battle.wild.id),
                    };
                    const mult = ballMultiplier(name, ctx);
                    const disabled = qty <= 0;
                    return (
                      <button key={name} className="btn"
                        disabled={disabled}
                        onClick={() => startThrowAim(name)}
                        style={{
                          display: "flex", flexDirection: "column", alignItems: "stretch",
                          padding: "10px 12px",
                          border: `1.5px solid ${disabled ? "#3a1f1f" : "#F44336"}`,
                          background: disabled ? "#1a0d0d" : "#1a0a0a",
                          borderRadius: 10, color: "#fff",
                          opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer",
                          textAlign: "left",
                        }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>🔴 {name}</span>
                          <span style={{ fontSize: 10, color: disabled ? "#666" : "#FFD700" }}>
                            ×{qty} · {name === "Master Ball" ? "100%" : `${mult.toFixed(2)}× now`}
                          </span>
                        </div>
                        <div style={{ fontSize: 9, color: "#9aa0b4", marginTop: 4 }}>{BALL_BLURB[name]}</div>
                      </button>
                    );
                  })}
                  {BALL_NAMES.filter((n) => inventoryQty(n) > 0).length === 0 && (
                    <div style={{ fontSize: 11, color: "#888", textAlign: "center", padding: 12 }}>
                      You have no Poké Balls. Visit the marketplace to stock up.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (screen === "team") return (
    <div style={S.root}><style>{css}</style>
      <div style={S.wrap}>
        <div style={S.header}>
          <span style={{ fontSize: 9, color: "#FF9800" }}>🎒 MY TEAMS ({team.length}/6)</span>
          <button className="btn" style={{ border: "1px solid #555", color: "#888", padding: "5px 10px" }} onClick={() => setScreen("world")}>◀ BACK</button>
        </div>
        <div style={{ padding: "10px 12px 6px", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {teams.map((t, i) => {
            const sel = i === activeTeamIdx;
            return (
              <button key={t.id} className="btn"
                onClick={() => { setActiveTeamIdx(i); setBuddyIdx(-1); }}
                style={{
                  border: `1.5px solid ${sel ? "#FF9800" : "#333"}`,
                  background: sel ? "#FF980022" : "transparent",
                  color: sel ? "#FF9800" : "#888",
                  padding: "6px 10px", borderRadius: 999, fontSize: 9, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                <i className="fa-solid fa-users" style={{ fontSize: 8 }} />
                {t.name} <span style={{ fontSize: 7, color: sel ? "#FFB74D" : "#555" }}>{t.mons.length}/{TEAM_MAX}</span>
              </button>
            );
          })}
          <button className="btn"
            onClick={() => {
              const name = (typeof window !== "undefined" ? window.prompt("Hello Trainer 👋, Enter Your Team Name!", `Team ${teams.length + 1}`) : "")?.trim();
              if (!name) return;
              const newTeam: TeamGroup = { id: `t-${Date.now()}`, name, mons: [] };
              setTeams((prev) => [...prev, newTeam]);
              setActiveTeamIdx(teams.length);
              setBuddyIdx(-1);
              addLog(`Created team "${name}"`, "#FF9800");
              // New teams start empty — show a friendly popup reminding the
              // trainer to add at least one Pokémon before battling.
              setEmptyTeamWarning(`"${name}" is empty! Please add at least 1 Pokémon to this team before battling.`);
            }}
            style={{
              border: "1.5px dashed #4ade80", background: "transparent", color: "#4ade80",
              padding: "6px 10px", borderRadius: 999, fontSize: 9, fontWeight: 700,
              display: "flex", alignItems: "center", gap: 6,
            }}>
            <i className="fa-solid fa-plus" style={{ fontSize: 9 }} /> ADD TEAM
          </button>
          {teams.length > 1 && (
            <button className="btn"
              onClick={() => {
                const delIdx = activeTeamIdx;
                const delTeam = teams[delIdx];
                if (typeof window !== "undefined" && !window.confirm(`Delete team "${delTeam.name}"? Pokémon will be moved to your remaining teams.`)) return;
                setTeams((prev) => {
                  const remaining = prev.filter((_, i) => i !== delIdx).map((t) => ({ ...t, mons: [...t.mons] }));
                  const movers = [...delTeam.mons];
                  let overflow = 0;
                  for (const m of movers) {
                    const target = remaining.find((t) => t.mons.length < TEAM_MAX);
                    if (target) target.mons.push(m);
                    else overflow++;
                  }
                  if (movers.length - overflow > 0) {
                    addLog(`Moved ${movers.length - overflow} Pokémon to your other teams.`, "#4CAF50");
                  }
                  if (overflow > 0) {
                    addLog(`⚠ ${overflow} Pokémon couldn't fit and were released.`, "#FF9800");
                  }
                  return remaining;
                });
                setActiveTeamIdx(0);
                setBuddyIdx(-1);
              }}
              style={{
                border: "1px solid #444", background: "transparent", color: "#777",
                padding: "6px 8px", borderRadius: 999, fontSize: 8,
              }}>
              <i className="fa-solid fa-trash" />
            </button>
          )}
        </div>

        <div style={{ padding: "0 12px 6px" }}>
          <button className="btn"
            onClick={() => setShowTeamTools(true)}
            style={{
              width: "100%", border: "1.5px solid #a855f7", background: "linear-gradient(180deg,#3b1066,#1c0a3a)",
              color: "#e9d5ff", padding: "10px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8, letterSpacing: 1,
            }}>
            <i className="fa-solid fa-sliders" /> CUSTOMIZE TEAM
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {team.map((m, i) => (
            <div key={i} style={{ background: "#0f0f24", border: `2px solid ${TYPE_COLORS[m.type1]}55`, borderRadius: 10, padding: "10px 12px", display: "flex", gap: 10, alignItems: "center" }}>
              <MonSprite sprite={m.sprite} size={60} className="mon-float" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 9, color: "#fff" }}>{m.name}</span>
                  <span style={{ fontSize: 7, color: i === 0 ? "#FFD700" : "#555" }}>{i === 0 ? "★ LEAD" : ""} Lv{m.level}</span>
                </div>
                <div style={{ display: "flex", gap: 3, marginBottom: 5 }}>{typeTag(m.type1)}{typeTag(m.type2)}</div>
                <HpBar cur={m.currentHp} max={m.maxHp} />
                <div style={{ fontSize: 6, color: "#888", marginTop: 3 }}>
                  HP:{m.currentHp}/{m.maxHp} ATK:{m.atk} DEF:{m.def}
                </div>
                <div style={{ fontSize: 6, color: "#555", marginTop: 2 }}>
                  {m.moves.join(" · ")}
                </div>
              </div>
            </div>
          ))}
          {team.length === 0 && <div style={{ textAlign: "center", color: "#333", fontSize: 8, marginTop: 40 }}>No Pokémon in team!</div>}
        </div>

        {showTeamTools && (() => {
          const tName = teams[activeTeamIdx]?.name ?? "Team";
          const tools = [
            { label: "Add Poke", icon: "fa-plus", color: "#4ade80",
              run: () => {
                if (team.length >= TEAM_MAX) { addLog(`Team is full! Max ${TEAM_MAX} Pokémon.`, "#F44336"); return; }
                if (caught.size === 0) { addLog("Catch a Pokémon first!", "#F44336"); return; }
                setShowTeamTools(false); setShowAddMonPicker(true);
              } },
            { label: "Remove Poke", icon: "fa-minus", color: "#F44336",
              run: () => {
                if (team.length <= TEAM_MIN) { addLog(`Team must keep at least ${TEAM_MIN} Pokémon.`, "#F44336"); return; }
                setShowTeamTools(false); setShowRemovePicker(true);
              } },
            { label: "Change Order", icon: "fa-arrows-up-down", color: "#FFD700",
              run: () => {
                if (team.length < 2) { addLog("Need at least 2 Pokémon to reorder.", "#F44336"); return; }
                setShowTeamTools(false); setShowOrderEditor(true);
              } },
            { label: "Randomize", icon: "fa-shuffle", color: "#26C6DA",
              run: () => {
                if (team.length < 2) { addLog("Need at least 2 Pokémon to randomize.", "#F44336"); return; }
                setTeam((prev) => {
                  const arr = [...prev];
                  for (let i = arr.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [arr[i], arr[j]] = [arr[j], arr[i]];
                  }
                  return arr;
                });
                setBuddyIdx(-1);
                addLog(`🔀 ${tName} order randomized!`, "#26C6DA");
              } },
            { label: "Reset Team", icon: "fa-rotate-left", color: "#FF9800",
              run: () => {
                if (team.length <= TEAM_MIN) { addLog(`Team already at minimum (${TEAM_MIN}). Nothing to reset.`, "#FF9800"); return; }
                if (typeof window !== "undefined" && !window.confirm(`Reset "${tName}"? All Pokémon except your lead will be sent back to your Mons collection.`)) return;
                // Send all removed mons back to the box instead of deleting them.
                const removed = team.slice(TEAM_MIN);
                setTeam((prev) => prev.slice(0, TEAM_MIN));
                setBox((prev) => [...prev, ...removed]);
                setBuddyIdx(-1);
                addLog(`♻ ${tName} reset — ${removed.length} Pokémon returned to your Mons collection.`, "#FF9800");
                setShowTeamTools(false);
              } },
            { label: "Main", icon: "fa-star", color: "#FFD700",
              run: () => {
                addLog(`★ ${tName} is now your active main team.`, "#FFD700");
                setShowTeamTools(false);
              } },
            { label: "Rename", icon: "fa-pen", color: "#a855f7",
              run: () => {
                const name = (typeof window !== "undefined" ? window.prompt("Rename team:", tName) : "")?.trim();
                if (!name) return;
                setTeams((prev) => prev.map((t, i) => i === activeTeamIdx ? { ...t, name } : t));
                addLog(`✏ Renamed to "${name}".`, "#a855f7");
                setShowTeamTools(false);
              } },
            { label: "Back", icon: "fa-arrow-left", color: "#888",
              run: () => setShowTeamTools(false) },
          ];
          return (
            <div onClick={() => setShowTeamTools(false)}
              style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)",
                display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50,
              }}>
              <div onClick={(e) => e.stopPropagation()}
                style={{
                  background: "linear-gradient(180deg,#1a0b2e,#0a0518)", border: "1.5px solid #a855f7", borderRadius: 14,
                  width: "100%", maxWidth: 360, padding: 16, display: "flex", flexDirection: "column", gap: 12,
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ color: "#e9d5ff", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>CUSTOMIZE — {tName.toUpperCase()}</div>
                  <button className="btn"
                    style={{ border: "1px solid #555", color: "#888", padding: "3px 8px", borderRadius: 6, fontSize: 9 }}
                    onClick={() => setShowTeamTools(false)}>✕</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {tools.map((t) => (
                    <button key={t.label} className="btn"
                      onClick={t.run}
                      style={{
                        background: "linear-gradient(180deg,rgba(168,85,247,0.25),rgba(60,20,110,0.55))",
                        border: `1.5px solid ${t.color}55`, color: "#fff",
                        padding: "16px 8px", borderRadius: 12, fontSize: 13, fontWeight: 700,
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                        cursor: "pointer",
                      }}>
                      <i className={`fa-solid ${t.icon}`} style={{ fontSize: 16, color: t.color }} />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {showRemovePicker && (
          <div onClick={() => setShowRemovePicker(false)}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)",
              display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50,
            }}>
            <div onClick={(e) => e.stopPropagation()}
              style={{
                background: "#10172a", border: "1.5px solid #F44336", borderRadius: 14,
                width: "100%", maxWidth: 340, padding: 14, display: "flex", flexDirection: "column", gap: 10,
                fontFamily: "'Inter', system-ui, sans-serif", maxHeight: "80vh",
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ color: "#F44336", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>REMOVE POKÉMON</div>
                <button className="btn"
                  style={{ border: "1px solid #555", color: "#888", padding: "3px 8px", borderRadius: 6, fontSize: 9 }}
                  onClick={() => setShowRemovePicker(false)}>✕</button>
              </div>
              <div style={{ fontSize: 10, color: "#6b7896" }}>Tap a Pokémon to send it back to your Mons collection.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
                {team.map((m, i) => (
                  <button key={`rm-${i}`} className="btn"
                    onClick={() => {
                      if (team.length <= TEAM_MIN) { addLog(`Team must keep at least ${TEAM_MIN} Pokémon.`, "#F44336"); return; }
                      if (typeof window !== "undefined" && !window.confirm(`Send ${m.name} back to your Mons collection?`)) return;
                      // Move the Pokémon from the team into the box (collection)
                      // instead of deleting it permanently.
                      setTeam((prev) => prev.filter((_, j) => j !== i));
                      setBox((prev) => [...prev, m]);
                      if (buddyIdx === i) setBuddyIdx(-1);
                      else if (buddyIdx > i) setBuddyIdx(buddyIdx - 1);
                      addLog(`${m.name} returned to your Mons collection.`, "#FFD54F");
                      if (team.length - 1 <= TEAM_MIN) setShowRemovePicker(false);
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                      border: "1.5px solid #3a2030", background: "#1a0a14",
                      borderRadius: 10, color: "#fff", textAlign: "left", cursor: "pointer",
                    }}>
                    <MonSprite sprite={m.sprite} size={36} className="" style={{ animation: "none" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 700 }}>{m.name}</div>
                      <div style={{ fontSize: 8, color: "#888" }}>Lv{m.level} · HP {m.currentHp}/{m.maxHp}</div>
                    </div>
                    <i className="fa-solid fa-trash" style={{ color: "#F44336" }} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {showOrderEditor && (
          <div onClick={() => setShowOrderEditor(false)}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)",
              display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50,
            }}>
            <div onClick={(e) => e.stopPropagation()}
              style={{
                background: "#10172a", border: "1.5px solid #FFD700", borderRadius: 14,
                width: "100%", maxWidth: 340, padding: 14, display: "flex", flexDirection: "column", gap: 10,
                fontFamily: "'Inter', system-ui, sans-serif", maxHeight: "80vh",
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ color: "#FFD700", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>CHANGE ORDER</div>
                <button className="btn"
                  style={{ border: "1px solid #555", color: "#888", padding: "3px 8px", borderRadius: 6, fontSize: 9 }}
                  onClick={() => setShowOrderEditor(false)}>Done</button>
              </div>
              <div style={{ fontSize: 10, color: "#6b7896" }}>Lead Pokémon at top is your battle starter.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
                {team.map((m, i) => (
                  <div key={`ord-${i}`}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                      border: `1.5px solid ${i === 0 ? "#FFD700" : "#2a3148"}`,
                      background: i === 0 ? "#1a1808" : "#0a0e1a",
                      borderRadius: 10, color: "#fff",
                    }}>
                    <span style={{ fontSize: 10, color: i === 0 ? "#FFD700" : "#888", width: 18 }}>#{i + 1}</span>
                    <MonSprite sprite={m.sprite} size={36} className="" style={{ animation: "none" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700 }}>{m.name}</div>
                      <div style={{ fontSize: 8, color: "#888" }}>Lv{m.level}{i === 0 ? " · ★ LEAD" : ""}</div>
                    </div>
                    <button className="btn"
                      disabled={i === 0}
                      onClick={() => setTeam((prev) => {
                        const arr = [...prev]; [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; return arr;
                      })}
                      style={{ border: "1px solid #444", color: i === 0 ? "#333" : "#aaa", background: "transparent",
                        padding: "4px 8px", borderRadius: 6, fontSize: 12, cursor: i === 0 ? "not-allowed" : "pointer" }}>
                      ▲
                    </button>
                    <button className="btn"
                      disabled={i === team.length - 1}
                      onClick={() => setTeam((prev) => {
                        const arr = [...prev]; [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; return arr;
                      })}
                      style={{ border: "1px solid #444", color: i === team.length - 1 ? "#333" : "#aaa", background: "transparent",
                        padding: "4px 8px", borderRadius: 6, fontSize: 12, cursor: i === team.length - 1 ? "not-allowed" : "pointer" }}>
                      ▼
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showAddMonPicker && (
          <div onClick={() => setShowAddMonPicker(false)}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)",
              display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50,
            }}>
            <div onClick={(e) => e.stopPropagation()}
              style={{
                background: "#10172a", border: "1.5px solid #4ade80", borderRadius: 14,
                width: "100%", maxWidth: 340, padding: 14, display: "flex", flexDirection: "column", gap: 10,
                fontFamily: "'Inter', system-ui, sans-serif", maxHeight: "80vh",
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ color: "#4ade80", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>ADD POKÉMON</div>
                <button className="btn"
                  style={{ border: "1px solid #555", color: "#888", padding: "3px 8px", borderRadius: 6, fontSize: 9 }}
                  onClick={() => setShowAddMonPicker(false)}>✕</button>
              </div>
              <div style={{ fontSize: 10, color: "#6b7896" }}>
                Pick from your Mons collection — moves the actual Pokémon (with its level, IVs &amp; EVs) into {teams[activeTeamIdx]?.name}.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, overflowY: "auto" }}>
                {box.length === 0 && (
                  <div style={{ gridColumn: "1 / -1", textAlign: "center", color: "#666", fontSize: 9, padding: 20 }}>
                    No Pokémon in your collection. Catch some in the wild!
                  </div>
                )}
                {box.map((bm) => (
                  <button key={bm.uid ?? `${bm.id}-${bm.caughtAt}`} className="btn"
                    onClick={() => {
                      if (team.length >= TEAM_MAX) { addLog(`Team is full! Max ${TEAM_MAX} Pokémon.`, "#F44336"); setShowAddMonPicker(false); return; }
                      // Move the existing instance from box to team — preserves uid, level, IVs, EVs, nature.
                      setBox((prev) => prev.filter((x) => (x.uid ?? `${x.id}-${x.caughtAt}`) !== (bm.uid ?? `${bm.id}-${bm.caughtAt}`)));
                      setTeam((prev) => prev.length < TEAM_MAX ? [...prev, bm] : prev);
                      addLog(`Added ${bm.nickname ?? bm.name} (Lv${bm.level}) to ${teams[activeTeamIdx]?.name}!`, "#4CAF50");
                      setShowAddMonPicker(false);
                    }}
                    style={{
                      background: `${TYPE_COLORS[bm.type1]}15`,
                      border: `2px solid ${TYPE_COLORS[bm.type1]}66`,
                      borderRadius: 8, padding: "6px 4px", textAlign: "center",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                      cursor: "pointer",
                    }}>
                    <div style={{ fontSize: 5, color: "#888" }}>#{String(bm.id).padStart(3, "0")} · Lv{bm.level}</div>
                    <MonSprite sprite={bm.sprite} size={40} className="" />
                    <div style={{ fontSize: 7, color: "#fff" }}>{bm.nickname ?? bm.name}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {emptyTeamWarning && (
          <div onClick={() => setEmptyTeamWarning(null)}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)",
              display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 80,
            }}>
            <div onClick={(e) => e.stopPropagation()}
              style={{
                background: "#1a0f1f", border: "2px solid #FF9800", borderRadius: 14,
                width: "100%", maxWidth: 320, padding: "18px 20px",
                display: "flex", flexDirection: "column", gap: 12, textAlign: "center",
                fontFamily: "'Inter', system-ui, sans-serif",
                boxShadow: "0 0 30px rgba(255,152,0,0.45)",
              }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 28, color: "#FF9800" }} />
              <div style={{ fontSize: 14, fontWeight: 800, color: "#FFB74D", letterSpacing: 1 }}>EMPTY TEAM</div>
              <div style={{ fontSize: 12, color: "#fff", lineHeight: 1.5 }}>{emptyTeamWarning}</div>
              <button className="btn"
                onClick={() => setEmptyTeamWarning(null)}
                style={{
                  border: "1.5px solid #FF9800", background: "#FF9800", color: "#1a0f1f",
                  padding: "10px 14px", borderRadius: 10, fontSize: 12, fontWeight: 800,
                  marginTop: 4, cursor: "pointer",
                }}>OK, GOT IT</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (screen === "inventory") return (
    <div style={S.root}><style>{css}</style>
      <div style={S.wrap}>
        <div style={S.header}>
          <span style={{ fontSize: 9, color: "#607D8B" }}>👜 BAG</span>
          <button className="btn" style={{ border: "1px solid #555", color: "#888", padding: "5px 10px" }} onClick={() => setScreen("world")}>◀ BACK</button>
        </div>
        {(() => {
          const bagCats = [
            { key: "balls", label: "BALLS", emoji: "🔴", color: "#F44336", match: (n: string) => /ball/i.test(n) },
            { key: "tms", label: "TMs", emoji: "💿", color: "#9C27B0", match: (n: string) => /^TM/i.test(n) || /^HM/i.test(n) },
            { key: "eggs", label: "EGGS", emoji: "🥚", color: "#FFEB3B", match: (n: string) => /egg/i.test(n) },
            // KEY ITEMS no longer matches "pass" — Safari Pass and similar
            // permit-style items belong under OTHERS instead.
            { key: "key", label: "KEY ITEMS", emoji: "🔑", color: "#FF9800", match: (n: string) => /(bike|rod|key|map|card|ticket|flute|stone tablet)/i.test(n) },
            { key: "stones", label: "STONES", emoji: "💎", color: "#03A9F4", match: (n: string) => /stone|shard/i.test(n) && !/stone tablet/i.test(n) },
            { key: "others", label: "OTHERS", emoji: "📦", color: "#26A69A", match: (_n: string) => true /* fallback; handled below */ },
          ];
          const active = bagCats.find((c) => c.key === bagCat)!;
          // OTHERS catches everything that doesn't fit the explicit categories above.
          const explicit = bagCats.filter((c) => c.key !== "others");
          const filtered = bagCat === "others"
            ? inventory.filter((it) => !explicit.some((c) => c.match(it.name)))
            : inventory.filter((it) => active.match(it.name));
          return (
            <>
              <div style={{ padding: "8px 10px 4px", display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 }}>
                {bagCats.map((c) => {
                  const sel = bagCat === c.key;
                  return (
                    <button key={c.key} className="btn"
                      style={{ border: `2px solid ${sel ? c.color : "#222"}`, background: sel ? `${c.color}11` : "transparent", color: sel ? c.color : "#666", padding: "6px 2px", borderRadius: 6, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}
                      onClick={() => setBagCat(c.key)}>
                      <span style={{ fontSize: 12 }}>{c.emoji}</span>
                      <span style={{ fontSize: 5 }}>{c.label}</span>
                    </button>
                  );
                })}
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "4px 10px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 7, color: active.color, marginBottom: 2 }}>{active.emoji} {active.label}</div>
                {filtered.length === 0 && (
                  <div style={{ textAlign: "center", color: "#333", fontSize: 8, marginTop: 30 }}>
                    No {active.label.toLowerCase()} in your bag
                  </div>
                )}
                {filtered.map((it) => (
                  <div key={it.name} style={{ border: "2px solid #222", borderRadius: 8, padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 7, color: "#ddd" }}>{it.name}</span>
                    <span style={{ fontSize: 7, color: "#FFC107" }}>×{it.qty}</span>
                  </div>
                ))}
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );

  if (screen === "hunt") {
    const region = REGIONS[player.macroRegion] ?? REGIONS[0];
    return (
      <div style={{ ...S.root, background: "#0a0a0c" }}>
        <style>{css}{`
          .hunt-act-btn {
            background: linear-gradient(180deg, #1c1c21 0%, #121216 100%);
            border: 1px solid rgba(255,255,255,0.08);
            color: #f0f0f0;
            padding: 18px 16px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            text-align: center;
            flex: 1;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }
          .hunt-act-btn:hover:not(:disabled) {
            background: linear-gradient(180deg, #2a2a32 0%, #1a1a20 100%);
            transform: translateY(-2px);
          }
          .hunt-act-btn:active:not(:disabled) { transform: translateY(1px); }
          .hunt-act-btn:disabled { opacity: 0.5; cursor: not-allowed; }
          .hunt-act-btn.hunt-go { border-color: rgba(74,222,128,0.25); }
          .hunt-act-btn.hunt-go:hover:not(:disabled) { border-color: rgba(74,222,128,0.45); }
          .hunt-act-btn.hunt-go .hunt-act-label { color: #4ade80; }
          .hunt-act-btn.hunt-go .hunt-act-icon { color: #4ade80; }
          .hunt-act-btn.hunt-bt { border-color: rgba(251,146,60,0.25); }
          .hunt-act-btn.hunt-bt:hover:not(:disabled) { border-color: rgba(251,146,60,0.45); }
          .hunt-act-btn.hunt-bt .hunt-act-label { color: #fb923c; }
          .hunt-act-btn.hunt-bt .hunt-act-icon { color: #fb923c; }
          .party-card-mini {
            flex: 1; min-width: 0;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 10px;
            padding: 8px 6px;
            display: flex; flex-direction: column; align-items: center; gap: 4px;
            cursor: pointer; transition: all 0.2s ease;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }
          .party-card-mini:hover:not(:disabled) {
            border-color: rgba(255,255,255,0.18);
            background: rgba(255,255,255,0.06);
          }
          .party-card-mini.lead {
            border-color: #fb923c;
            background: rgba(251,146,60,0.07);
          }
          .party-card-mini:disabled { cursor: default; }
        `}</style>
        <div style={{ ...S.wrap, background: "#0a0a0c", fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", padding: "16px 16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <button
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#f0f0f0", padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(4px)" }}
              onClick={() => { setScoutedWild(null); setScreen("world"); }}>
              ◀ BACK
            </button>
            <div style={{ fontSize: 14, letterSpacing: 2, fontWeight: 700, color: "#f0f0f0" }}>wild hunt</div>
            <div style={{ width: 50 }} />
          </div>

          {/* Region banner */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "10px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, backdropFilter: "blur(10px)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, color: "#f0f0f0" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#fb923c", display: "inline-block" }} />
              {region.name}
            </div>
            <div style={{ fontSize: 11, color: "#888890", letterSpacing: 0.5 }}>
              Hunts: {huntCount}/{legendThreshold} until legendary
            </div>
          </div>

          {/* Sprite showcase with forest backdrop */}
          <div style={{
            height: 280,
            borderRadius: 16,
            border: "1px solid rgba(180,30,30,0.35)",
            backgroundImage: `url(${huntForestBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
            boxShadow: "inset 0 0 60px rgba(0,0,0,0.75)",
            overflow: "hidden",
          }}>
            {scoutedWild ? (
              <div style={{ filter: "drop-shadow(0px 10px 20px rgba(0,0,0,0.8))", zIndex: 2 }}>
                <MonSprite sprite={scoutedWild.sprite} size={160} className="mon-float" />
              </div>
            ) : (
              <div style={{ color: "#f0f0f0", fontSize: 13, textAlign: "center", lineHeight: 1.7, padding: 20, textShadow: "0 2px 8px rgba(0,0,0,0.9)", zIndex: 2 }}>
                Tap HUNT to search<br />the tall grass...
              </div>
            )}
          </div>

          {/* Encounter banner */}
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "14px 16px",
            borderRadius: 12,
            textAlign: "center",
            fontSize: 15,
            fontWeight: 600,
            backdropFilter: "blur(10px)",
            color: "#f0f0f0",
          }}>
            {scoutedWild ? (
              <>A wild <span style={{ color: "#fb923c" }}>{scoutedWild.name}</span>
                <span style={{ background: "#1e1e26", padding: "2px 8px", borderRadius: 20, fontSize: 11, color: "#888890", margin: "0 4px", border: "1px solid #333" }}>Lv. {scoutedWild.level}</span>
                has appeared!
              </>
            ) : (
              <span style={{ color: "#888890" }}>No Pokémon nearby...</span>
            )}
          </div>

          {/* Party section */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "#888890", letterSpacing: 1, textTransform: "uppercase" }}>
              <span>Your Party · {teams[activeTeamIdx]?.name ?? "Team"}</span>
              <span style={{ color: "#fb923c", fontSize: 10, textTransform: "none" }}>tap to set lead</span>
            </div>
            {team.length === 0 ? (
              <div style={{ fontSize: 11, color: "#71717a", padding: "8px 4px" }}>No Pokémon in this team yet.</div>
            ) : (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {team.slice(0, 6).map((m, i) => {
                  const lead = i === 0;
                  const fainted = m.currentHp <= 0;
                  return (
                    <button key={`${m.id}-${m.level}-${i}`}
                      className={`party-card-mini${lead ? " lead" : ""}`}
                      disabled={lead || fainted}
                      onClick={() => {
                        if (i === 0 || fainted) return;
                        setTeam((prev) => {
                          const next = [...prev];
                          const tmp = next[0];
                          next[0] = next[i];
                          next[i] = tmp;
                          return next;
                        });
                        addLog(`${m.name} is now your lead!`, "#FFD700");
                      }}
                      style={{ opacity: fainted ? 0.45 : 1 }}>
                      <MonSprite sprite={m.sprite} size={44} className="" style={{ animation: "none" }} />
                      <span style={{ fontSize: 9, fontWeight: 600, color: "#f0f0f0", textAlign: "center", lineHeight: 1.2, maxWidth: 64, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
                      <span style={{ fontSize: lead ? 8 : 9, fontWeight: lead ? 700 : 400, color: lead ? "#fb923c" : "#888890", letterSpacing: lead ? 0.5 : 0 }}>
                        {lead ? "★ LEAD" : `Lv${m.level}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Terminal log */}
          <div style={{
            background: "#050508",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: 16,
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: 12,
            color: "#22d3ee",
            lineHeight: 1.6,
            boxShadow: "inset 0 4px 10px rgba(0,0,0,0.5)",
            minHeight: 100,
            maxHeight: 140,
            overflowY: "auto",
          }}>
            {log.slice(-6).map((l, idx) => (
              <div key={idx} style={{ color: l.color || "#22d3ee" }}>&gt; {l.msg}</div>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 12 }}>
            <button className="hunt-act-btn hunt-go" onClick={rescout}>
              <i className="fa-solid fa-shoe-prints hunt-act-icon" style={{ fontSize: 22 }} />
              <span className="hunt-act-label">HUNT</span>
            </button>
            <button className="hunt-act-btn hunt-bt"
              disabled={!scoutedWild}
              onClick={captureScouted}>
              <i className="fa-solid fa-bolt hunt-act-icon" style={{ fontSize: 22 }} />
              <span className="hunt-act-label">BATTLE</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "battleBox") {
    function genRoomCode() {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let s = "";
      for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
      return s;
    }
    function buildMyTeam(): Mon[] {
      if (bbMode === "random") {
        return Array.from({ length: bbSettings.teamSize }, () => {
          const pool = bbSettings.allowLegendaries ? ALL_POKEMON : ALL_POKEMON.filter((p) => !ALL_LEGENDARY_IDS.has(p.id));
          const tpl = pool[Math.floor(Math.random() * pool.length)];
          const lv = bbSettings.randomLevelMin + Math.floor(Math.random() * (bbSettings.randomLevelMax - bbSettings.randomLevelMin + 1));
          return makeMon(tpl, lv);
        });
      }
      return team.slice(0, bbSettings.teamSize);
    }
    function startHostRoom(mode: "ranked" | "unranked" | "random") {
      sfx.menuOpen();
      setBbMode(mode);
      setBbRoom({ code: "…", isHost: true, status: "waiting" });
      const myTeam = buildMyTeam();
      if (myTeam.length === 0) { addLog("You need at least 1 Pokémon to battle!", "#F44336"); setBbRoom(null); setBbMode(null); return; }
      pvpConnect(true, undefined, mode, myTeam);
    }
    function joinRoom(mode: "ranked" | "unranked" | "random") {
      if (bbJoinCode.trim().length < 4) { addLog("Enter a valid room code.", "#F44336"); return; }
      sfx.menuOpen();
      setBbMode(mode);
      const code = bbJoinCode.trim().toUpperCase();
      setBbRoom({ code, isHost: false, status: "waiting" });
      const myTeam = buildMyTeam();
      if (myTeam.length === 0) { addLog("You need at least 1 Pokémon to battle!", "#F44336"); setBbRoom(null); setBbMode(null); return; }
      pvpConnect(false, code, mode, myTeam);
    }
    function leaveRoom() {
      sfx.menuBack();
      try { wsRef.current?.close(); } catch { /* ignore */ }
      wsRef.current = null;
      setBbRoom(null);
      setBbMode(null);
    }
    function startBattleSim() {
      // Real PvP starts automatically once both teams are submitted (server emits state).
      // This button now just signals readiness.
      if (!bbMode || !bbRoom || bbRoom.status !== "ready") return;
      addLog("Waiting for opponent to lock in…", "#60a5fa");
    }
    const modeMeta: Record<string, { title: string; sub: string; color: string; icon: string }> = {
      ranked:   { title: "Ranked Battle",   sub: "Climb the leaderboard. Wins/losses count.", color: "#FFD700", icon: "fa-trophy" },
      unranked: { title: "Unranked Battle", sub: "Casual practice. No rank changes.",          color: "#60a5fa", icon: "fa-hand-fist" },
      random:   { title: "Random Battle",   sub: "Both players get random teams.",             color: "#a855f7", icon: "fa-dice" },
    };
    return (
      <div style={S.root}><style>{css}</style>
        <div style={{ ...S.wrap, background: "var(--m-bg)" }} className="m-app">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid var(--m-border)" }}>
            <button className="btn"
              style={{ border: "1px solid var(--m-border)", color: "var(--m-muted)", padding: "6px 12px", borderRadius: 8, background: "transparent", fontSize: 11, fontWeight: 600 }}
              onClick={() => { sfx.menuBack(); if (bbRoom) { setBbRoom(null); setBbMode(null); } else { setScreen("world"); } }}>
              ◀ BACK
            </button>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--m-pink)", letterSpacing: 1.5 }}>BATTLE BOX</div>
            <button className="btn"
              style={{ border: "1px solid var(--m-border)", color: "var(--m-muted)", padding: "6px 10px", borderRadius: 8, background: "transparent", fontSize: 11, fontWeight: 600 }}
              onClick={() => { sfx.click(); setBbShowSettings(true); }}>
              <i className="fa-solid fa-sliders" />
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, padding: "10px 16px", borderBottom: "1px solid var(--m-border)" }}>
            <div className="m-card" style={{ flex: 1, padding: 10, borderRadius: 12, textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "var(--m-muted)", letterSpacing: 1 }}>RANK</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#FFD700" }}>{player.rank ?? 1000}</div>
            </div>
            <div className="m-card" style={{ flex: 1, padding: 10, borderRadius: 12, textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "var(--m-muted)", letterSpacing: 1 }}>WINS</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#4ade80" }}>{player.wins}</div>
            </div>
            <div className="m-card" style={{ flex: 1, padding: 10, borderRadius: 12, textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "var(--m-muted)", letterSpacing: 1 }}>LOSSES</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#f87171" }}>{player.losses}</div>
            </div>
          </div>

          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {!bbRoom && !bbMode && (
              <>
                <div style={{ fontSize: 11, color: "var(--m-muted)", letterSpacing: 1, textTransform: "uppercase" }}>Choose Mode</div>
                {(["ranked", "unranked", "random"] as const).map((m) => {
                  const meta = modeMeta[m];
                  return (
                    <button key={m} className="btn"
                      onClick={() => { sfx.click(); setBbMode(m); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "14px 14px",
                        border: `2px solid ${meta.color}`, background: `${meta.color}10`,
                        borderRadius: 14, color: "#fff", textAlign: "left",
                      }}>
                      <div style={{ width: 42, height: 42, borderRadius: 10, background: `${meta.color}20`, display: "flex", alignItems: "center", justifyContent: "center", color: meta.color, fontSize: 18 }}>
                        <i className={`fa-solid ${meta.icon}`} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{meta.title}</div>
                        <div style={{ fontSize: 10, color: "var(--m-muted)", marginTop: 2 }}>{meta.sub}</div>
                      </div>
                      <i className="fa-solid fa-chevron-right" style={{ color: meta.color }} />
                    </button>
                  );
                })}
                {battleBoxHistory.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, color: "var(--m-muted)", letterSpacing: 1, textTransform: "uppercase", marginTop: 8 }}>Recent Matches</div>
                    {battleBoxHistory.slice(0, 6).map((h, i) => (
                      <div key={i} className="m-card" style={{ padding: "10px 12px", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 12, color: "var(--m-text)", fontWeight: 600 }}>vs {h.opponent}</div>
                          <div style={{ fontSize: 9, color: "var(--m-muted)", textTransform: "uppercase" }}>{h.mode}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {h.delta !== 0 && (
                            <span style={{ fontSize: 10, color: h.delta > 0 ? "#4ade80" : "#f87171", fontWeight: 600 }}>
                              {h.delta > 0 ? "+" : ""}{h.delta}
                            </span>
                          )}
                          <span style={{ fontSize: 14, fontWeight: 800, color: h.result === "W" ? "#4ade80" : "#f87171" }}>{h.result}</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}

            {bbMode && !bbRoom && (
              <>
                <div className="m-card" style={{ padding: 12, borderRadius: 12, borderColor: modeMeta[bbMode].color }}>
                  <div style={{ fontSize: 12, color: modeMeta[bbMode].color, fontWeight: 700 }}>
                    <i className={`fa-solid ${modeMeta[bbMode].icon}`} style={{ marginRight: 6 }} />{modeMeta[bbMode].title}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--m-muted)", marginTop: 4 }}>{modeMeta[bbMode].sub}</div>
                </div>
                <button className="btn"
                  onClick={() => startHostRoom(bbMode)}
                  style={{ padding: "14px 12px", border: `1.5px solid ${modeMeta[bbMode].color}`, background: `${modeMeta[bbMode].color}15`, color: "#fff", borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
                  <i className="fa-solid fa-plus" style={{ marginRight: 6 }} />HOST A ROOM
                </button>
                <div style={{ fontSize: 11, color: "var(--m-muted)", textAlign: "center" }}>or join with a friend's code</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    placeholder="ROOM CODE"
                    value={bbJoinCode}
                    onChange={(e) => setBbJoinCode(e.target.value.toUpperCase().slice(0, 8))}
                    style={{ flex: 1, padding: "12px 14px", border: "1.5px solid var(--m-border)", background: "var(--m-input)", color: "#fff", borderRadius: 10, fontSize: 13, fontFamily: "monospace", letterSpacing: 2, textAlign: "center", outline: "none" }}
                  />
                  <button className="btn"
                    onClick={() => joinRoom(bbMode)}
                    style={{ padding: "12px 18px", border: "1.5px solid var(--m-pink)", background: "var(--m-pink)", color: "#fff", borderRadius: 10, fontSize: 12, fontWeight: 700 }}>
                    JOIN
                  </button>
                </div>
                <button className="btn"
                  onClick={() => { sfx.menuBack(); setBbMode(null); }}
                  style={{ padding: "10px", border: "1px solid var(--m-border)", color: "var(--m-muted)", background: "transparent", borderRadius: 10, fontSize: 11 }}>
                  Change Mode
                </button>
              </>
            )}

            {bbRoom && (
              <>
                <div className="m-card" style={{ padding: 14, borderRadius: 14, textAlign: "center", borderColor: modeMeta[bbMode!].color }}>
                  <div style={{ fontSize: 10, color: "var(--m-muted)", letterSpacing: 1 }}>{bbRoom.isHost ? "YOUR ROOM CODE" : "JOINED ROOM"}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: modeMeta[bbMode!].color, fontFamily: "monospace", letterSpacing: 4, marginTop: 6 }}>
                    {bbRoom.code}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--m-muted)", marginTop: 8 }}>
                    {bbRoom.status === "waiting" ? "Waiting for opponent..." : `Ready vs ${bbRoom.opponent}`}
                  </div>
                  {bbRoom.isHost && bbRoom.status === "waiting" && (
                    <button className="btn"
                      onClick={() => { navigator.clipboard?.writeText(bbRoom.code).catch(() => {}); addLog("Code copied!", "#4ade80"); }}
                      style={{ marginTop: 10, padding: "6px 14px", border: "1px solid var(--m-border)", color: "var(--m-text)", background: "transparent", borderRadius: 8, fontSize: 11 }}>
                      <i className="fa-solid fa-copy" style={{ marginRight: 6 }} />COPY CODE
                    </button>
                  )}
                </div>

                <div className="m-card" style={{ padding: 12, borderRadius: 12, fontSize: 11, color: "var(--m-muted)", lineHeight: 1.6 }}>
                  <div style={{ color: "var(--m-text)", fontWeight: 600, marginBottom: 6 }}>Settings</div>
                  Format: {bbSettings.teamSize}v{bbSettings.teamSize} · Level cap: {bbSettings.levelCap} · Timer: {bbSettings.turnTimer}s<br />
                  Legendaries: {bbSettings.allowLegendaries ? "Allowed" : "Banned"}
                  {bbMode === "random" && <><br />Random level range: {bbSettings.randomLevelMin}–{bbSettings.randomLevelMax}</>}
                </div>

                <button className="btn"
                  disabled={bbRoom.status !== "ready"}
                  onClick={startBattleSim}
                  style={{
                    padding: "16px", border: `2px solid ${bbRoom.status === "ready" ? "#4ade80" : "var(--m-border)"}`,
                    background: bbRoom.status === "ready" ? "#0f2a1a" : "var(--m-card)",
                    color: bbRoom.status === "ready" ? "#4ade80" : "var(--m-muted)",
                    borderRadius: 12, fontSize: 14, fontWeight: 700, letterSpacing: 1,
                    cursor: bbRoom.status === "ready" ? "pointer" : "not-allowed",
                    opacity: bbRoom.status === "ready" ? 1 : 0.6,
                  }}>
                  {bbRoom.status === "ready" ? <><i className="fa-solid fa-bolt" style={{ marginRight: 6 }} />START BATTLE</> : "WAITING..."}
                </button>
                <button className="btn"
                  onClick={leaveRoom}
                  style={{ padding: "10px", border: "1px solid #f87171", color: "#f87171", background: "transparent", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                  LEAVE ROOM
                </button>
              </>
            )}
          </div>

          {bbShowSettings && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}
              onClick={() => setBbShowSettings(false)}>
              <div onClick={(e) => e.stopPropagation()}
                style={{ background: "var(--m-card)", border: "2px solid var(--m-pink)", borderRadius: 16, padding: 18, width: "100%", maxWidth: 360 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ color: "var(--m-pink)", fontWeight: 700, fontSize: 14 }}>BATTLE SETTINGS</div>
                  <button className="btn" style={{ border: "1px solid #555", color: "#888", padding: "4px 10px", borderRadius: 6, fontSize: 11 }}
                    onClick={() => setBbShowSettings(false)}>✕</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 12, color: "var(--m-text)" }}>
                  <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    Team size <input type="number" min={1} max={6} value={bbSettings.teamSize}
                      onChange={(e) => setBbSettings((s) => ({ ...s, teamSize: Math.max(1, Math.min(6, +e.target.value || 1)) }))}
                      style={{ width: 70, padding: 6, background: "var(--m-input)", border: "1px solid var(--m-border)", color: "#fff", borderRadius: 6, textAlign: "center" }} />
                  </label>
                  <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    Level cap <input type="number" min={5} max={100} value={bbSettings.levelCap}
                      onChange={(e) => setBbSettings((s) => ({ ...s, levelCap: Math.max(5, Math.min(100, +e.target.value || 50)) }))}
                      style={{ width: 70, padding: 6, background: "var(--m-input)", border: "1px solid var(--m-border)", color: "#fff", borderRadius: 6, textAlign: "center" }} />
                  </label>
                  <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    Turn timer (s) <input type="number" min={15} max={180} value={bbSettings.turnTimer}
                      onChange={(e) => setBbSettings((s) => ({ ...s, turnTimer: Math.max(15, Math.min(180, +e.target.value || 60)) }))}
                      style={{ width: 70, padding: 6, background: "var(--m-input)", border: "1px solid var(--m-border)", color: "#fff", borderRadius: 6, textAlign: "center" }} />
                  </label>
                  <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    Allow legendaries
                    <input type="checkbox" checked={bbSettings.allowLegendaries}
                      onChange={(e) => setBbSettings((s) => ({ ...s, allowLegendaries: e.target.checked }))}
                      style={{ width: 18, height: 18 }} />
                  </label>
                  <div style={{ borderTop: "1px solid var(--m-border)", paddingTop: 10, fontSize: 10, color: "var(--m-muted)", letterSpacing: 1 }}>RANDOM MODE</div>
                  <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    Min level <input type="number" min={1} max={100} value={bbSettings.randomLevelMin}
                      onChange={(e) => setBbSettings((s) => ({ ...s, randomLevelMin: Math.max(1, Math.min(s.randomLevelMax, +e.target.value || 1)) }))}
                      style={{ width: 70, padding: 6, background: "var(--m-input)", border: "1px solid var(--m-border)", color: "#fff", borderRadius: 6, textAlign: "center" }} />
                  </label>
                  <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    Max level <input type="number" min={1} max={100} value={bbSettings.randomLevelMax}
                      onChange={(e) => setBbSettings((s) => ({ ...s, randomLevelMax: Math.max(s.randomLevelMin, Math.min(100, +e.target.value || 60)) }))}
                      style={{ width: 70, padding: 6, background: "var(--m-input)", border: "1px solid var(--m-border)", color: "#fff", borderRadius: 6, textAlign: "center" }} />
                  </label>
                </div>
                <button className="btn" style={{ marginTop: 14, padding: "10px", width: "100%", background: "var(--m-pink)", border: "none", color: "#fff", borderRadius: 10, fontSize: 12, fontWeight: 700 }}
                  onClick={() => { sfx.click(); setBbShowSettings(false); addLog("Settings saved!", "#4ade80"); }}>
                  SAVE SETTINGS
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (screen === "caught") {
    const caughtList = ALL_POKEMON.filter((p) => caught.has(p.id));
    const byGen = new Map<number, PokemonTemplate[]>();
    const totalByGen = new Map<number, number>();
    for (const p of ALL_POKEMON) {
      totalByGen.set(p.gen, (totalByGen.get(p.gen) ?? 0) + 1);
    }
    for (const p of caughtList) {
      if (!byGen.has(p.gen)) byGen.set(p.gen, []);
      byGen.get(p.gen)!.push(p);
    }
    const totalSpecies = ALL_POKEMON.length;
    const overallPct = Math.round((caught.size / totalSpecies) * 100);
    return (
      <div style={S.root}><style>{css}</style>
        <div style={{ ...S.wrap, background: "var(--m-bg)" }} className="m-app">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid var(--m-border)" }}>
            <button className="btn"
              style={{ border: "1px solid var(--m-border)", color: "var(--m-muted)", padding: "6px 12px", borderRadius: 8, background: "transparent", fontSize: 11, fontWeight: 600 }}
              onClick={() => { sfx.menuBack(); setScreen("profile"); }}>
              ◀ BACK
            </button>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--m-pink)", letterSpacing: 1.5 }}>POKÉMON CAUGHT</div>
            <div style={{ width: 60 }} />
          </div>

          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "linear-gradient(135deg,#7e3aed,#4c1d95)", borderRadius: 14, padding: "14px 16px", color: "#fff" }}>
              <div style={{ fontSize: 10, color: "#e9d5ff", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Total Unique Caught</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 28, fontWeight: 800 }}>{caught.size}</span>
                <span style={{ fontSize: 13, color: "#e9d5ff" }}>/ {totalSpecies}</span>
                <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "#fbbf24" }}>{overallPct}%</span>
              </div>
              <div style={{ marginTop: 10, height: 6, background: "rgba(0,0,0,0.3)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${overallPct}%`, height: "100%", background: "#fbbf24", transition: "width .3s" }} />
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "var(--m-muted)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>By Region</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {REGIONS.map((reg) => {
                  const total = totalByGen.get(reg.gen) ?? 0;
                  const got = byGen.get(reg.gen)?.length ?? 0;
                  const pct = total > 0 ? Math.round((got / total) * 100) : 0;
                  return (
                    <div key={reg.gen} className="m-card" style={{ padding: 12, borderRadius: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        <span style={{ fontSize: 16 }}>{reg.emoji}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--m-text)" }}>{reg.name}</span>
                        <span style={{ marginLeft: "auto", fontSize: 9, color: "var(--m-muted)" }}>Gen {reg.gen}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: got > 0 ? "var(--m-yellow)" : "var(--m-muted)" }}>{got}</span>
                        <span style={{ fontSize: 11, color: "var(--m-muted)" }}>/ {total}</span>
                        <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--m-muted)" }}>{pct}%</span>
                      </div>
                      <div style={{ marginTop: 6, height: 4, background: "var(--m-border)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: got > 0 ? "var(--m-yellow)" : "transparent", transition: "width .3s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "var(--m-muted)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
                Caught List ({caught.size} unique)
              </div>
              {caughtList.length === 0 ? (
                <div className="m-card" style={{ padding: 20, textAlign: "center", color: "var(--m-muted)", fontSize: 12, borderRadius: 14 }}>
                  No Pokémon caught yet — head out and start hunting!
                </div>
              ) : (
                REGIONS.map((reg) => {
                  const list = (byGen.get(reg.gen) ?? []).sort((a, b) => a.id - b.id);
                  if (list.length === 0) return null;
                  return (
                    <div key={reg.gen} style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11, color: "var(--m-text)", fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                        <span>{reg.emoji}</span>
                        <span>{reg.name}</span>
                        <span style={{ color: "var(--m-muted)", fontWeight: 500 }}>· {list.length}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                        {list.map((p) => (
                          <div key={p.id} className="m-card" style={{ padding: 8, borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                            <img src={SPRITE(p.sprite)} alt={p.name} style={{ width: 48, height: 48, imageRendering: "pixelated" }} />
                            <div style={{ fontSize: 9, color: "var(--m-muted)" }}>#{String(p.id).padStart(3, "0")}</div>
                            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--m-text)", textAlign: "center", lineHeight: 1.1 }}>{p.name}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <BottomNav active="profile" go={setScreen} />
        </div>
      </div>
    );
  }

  if (screen === "mons") {
    const SORT_OPTIONS: { key: string; label: string }[] = [
      { key: "caughtOrder", label: "Caught Order" },
      { key: "name", label: "Name" },
      { key: "dex", label: "Dex Number" },
      { key: "level", label: "Level" },
      { key: "category", label: "Category" },
      { key: "ivTotal", label: "IV Total" },
      { key: "evTotal", label: "EV Total" },
      { key: "hp", label: "HP" },
      { key: "atk", label: "Attack" },
      { key: "def", label: "Defense" },
      { key: "spa", label: "Sp. Attack" },
      { key: "spd", label: "Sp. Defense" },
      { key: "spe", label: "Speed" },
      { key: "total", label: "Total Stats" },
    ];

    type OwnedMon = { mon: Mon; teamIdx: number; teamName: string | null; orderIdx: number };
    const teamOwned: OwnedMon[] = teams.flatMap((t, ti) =>
      t.mons.map((m) => ({ mon: m, teamIdx: ti, teamName: t.name, orderIdx: 0 }))
    );
    const boxOwned: OwnedMon[] = box.map((m) => ({ mon: m, teamIdx: -1, teamName: null, orderIdx: 0 }));
    const allOwned: OwnedMon[] = [...teamOwned, ...boxOwned].map((o, i) => ({ ...o, orderIdx: i }));

    const ivTotal = (m: Mon) => (m.ivHp ?? 0) + (m.ivAtk ?? 0) + (m.ivDef ?? 0) + (m.ivSpa ?? 0) + (m.ivSpd ?? 0) + (m.ivSpe ?? 0);
    const evTotal = (m: Mon) => (m.evHp ?? 0) + (m.evAtk ?? 0) + (m.evDef ?? 0) + (m.evSpa ?? 0) + (m.evSpd ?? 0) + (m.evSpe ?? 0);
    const totalStats = (m: Mon) => m.maxHp + m.atk + m.def + m.spa + m.spd + m.spe;
    const categoryRank = (m: Mon) => ALL_LEGENDARY_IDS.has(m.id) ? 2 : new Set([6, 9, 12, 15, 18, 25, 149, 130, 143, 248]).has(m.id) ? 1 : 0;

    const sortValue = (m: Mon, orderIdx: number, key: string): number | string => {
      switch (key) {
        case "caughtOrder": return m.caughtAt ?? orderIdx;
        case "name": return (m.nickname ?? m.name).toLowerCase();
        case "dex": return m.id;
        case "level": return m.level;
        case "category": return categoryRank(m);
        case "ivTotal": return ivTotal(m);
        case "evTotal": return evTotal(m);
        case "hp": return m.maxHp;
        case "atk": return m.atk;
        case "def": return m.def;
        case "spa": return m.spa;
        case "spd": return m.spd;
        case "spe": return m.spe;
        case "total": return totalStats(m);
        default: return 0;
      }
    };

    const q = monsSearch.trim().toLowerCase();
    const filtered = q
      ? allOwned.filter((o) =>
          (o.mon.nickname ?? "").toLowerCase().includes(q) ||
          o.mon.name.toLowerCase().includes(q) ||
          String(o.mon.id).includes(q) ||
          (o.mon.type1 ?? "").toLowerCase().includes(q) ||
          (o.mon.type2 ?? "").toLowerCase().includes(q))
      : allOwned;

    const sorted = [...filtered].sort((a, b) => {
      const av = sortValue(a.mon, a.orderIdx, monsSortKey);
      const bv = sortValue(b.mon, b.orderIdx, monsSortKey);
      let cmp: number;
      if (typeof av === "string" && typeof bv === "string") cmp = av.localeCompare(bv);
      else cmp = (av as number) - (bv as number);
      return monsSortDir === "max" ? -cmp : cmp;
    });

    const currentSortLabel = SORT_OPTIONS.find((s) => s.key === monsSortKey)?.label ?? "—";

    return (
      <div style={S.root}><style>{css}</style>
        <div style={S.wrap}>
          <div style={S.header}>
            <span style={{ fontSize: 9, color: "#26A69A" }}><i className="fa-solid fa-paw" /> MY MONS</span>
            <button className="btn" style={{ border: "1px solid #555", color: "#888", padding: "5px 10px" }} onClick={() => setScreen("world")}>◀ BACK</button>
          </div>

          <div style={{ padding: "10px 12px 4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 7, color: "#aaa" }}>{teamOwned.length} in teams · {boxOwned.length} in collection</span>
            <span style={{ fontSize: 8, color: "#26A69A" }}>{allOwned.length} owned</span>
          </div>

          <div style={{ padding: "4px 12px", display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, background: "#0d1322", border: "1px solid #2a3148", borderRadius: 8, padding: "6px 10px" }}>
              <i className="fa-solid fa-magnifying-glass" style={{ fontSize: 10, color: "#6b7896" }} />
              <input
                type="text"
                placeholder="Search by name, type, dex…"
                value={monsSearch}
                onChange={(e) => setMonsSearch(e.target.value)}
                style={{ flex: 1, background: "transparent", border: "none", color: "#fff", fontSize: 10, outline: "none", fontFamily: "'Inter', system-ui, sans-serif" }}
              />
              {monsSearch && (
                <button className="btn" onClick={() => setMonsSearch("")}
                  style={{ border: "none", background: "transparent", color: "#6b7896", fontSize: 10, padding: 0, cursor: "pointer" }}>✕</button>
              )}
            </div>
            <button className="btn"
              onClick={() => setMonsView((v) => v === "grid" ? "list" : "grid")}
              title={monsView === "grid" ? "Switch to list view" : "Switch to grid view"}
              style={{ border: "1px solid #2a3148", background: "#0d1322", color: "#26A69A", padding: "6px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>
              <i className={monsView === "grid" ? "fa-solid fa-list" : "fa-solid fa-grip"} />
            </button>
          </div>

          <div style={{ padding: "4px 12px 8px", display: "flex", gap: 6, alignItems: "center" }}>
            <button className="btn"
              onClick={() => setShowMonsSort(true)}
              style={{ flex: 1, border: "1px solid #2a3148", background: "#0d1322", color: "#fff", padding: "6px 10px", borderRadius: 8, fontSize: 9, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
              <span><i className="fa-solid fa-arrow-down-wide-short" style={{ marginRight: 6, color: "#26A69A" }} /> Sort: {currentSortLabel}</span>
              <i className="fa-solid fa-caret-down" style={{ color: "#6b7896" }} />
            </button>
            <button className="btn"
              onClick={() => setMonsSortDir((d) => d === "max" ? "min" : "max")}
              title={`Direction: ${monsSortDir === "max" ? "Max First" : "Min First"}`}
              style={{ border: "1px solid #2a3148", background: "#0d1322", color: monsSortDir === "max" ? "#FFD700" : "#26A69A", padding: "6px 10px", borderRadius: 8, fontSize: 9, cursor: "pointer", minWidth: 80 }}>
              {monsSortDir === "max" ? "↓ Max" : "↑ Min"}
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "4px 10px 14px" }}>
            {allOwned.length === 0 && (
              <div style={{ textAlign: "center", color: "#666", fontSize: 9, marginTop: 50, lineHeight: 2 }}>
                You don't own any Pokémon yet.<br />
                <span style={{ fontSize: 7, color: "#444" }}>Hunt, buy, or redeem to start your collection!</span>
              </div>
            )}
            {sorted.length === 0 && allOwned.length > 0 && (
              <div style={{ textAlign: "center", color: "#666", fontSize: 9, marginTop: 30 }}>
                No Pokémon match "{monsSearch}".
              </div>
            )}

            {monsView === "grid" ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {sorted.map((o) => {
                  const m = o.mon;
                  const iv = ivPercent(m);
                  return (
                    <button key={m.uid ?? `${m.id}-${o.orderIdx}`} className="btn"
                      onClick={() => { sfx.click(); setSelectedMonUid(m.uid ?? null); setMonDetailTab("info"); setScreen("monDetail"); }}
                      style={{
                        background: `${TYPE_COLORS[m.type1]}15`,
                        border: `2px solid ${o.teamIdx >= 0 ? "#FFD700" : `${TYPE_COLORS[m.type1]}66`}`,
                        borderRadius: 10, padding: "8px 4px", textAlign: "center",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                        cursor: "pointer", position: "relative",
                      }}>
                      {o.teamIdx >= 0 && (
                        <span style={{ position: "absolute", top: 2, right: 4, fontSize: 6, color: "#FFD700" }} title={o.teamName ?? ""}>
                          <i className="fa-solid fa-star" />
                        </span>
                      )}
                      <div style={{ fontSize: 5, color: "#888" }}>#{String(m.id).padStart(3, "0")}</div>
                      <MonSprite sprite={m.sprite} size={44} className="" />
                      <div style={{ fontSize: 7, color: "#fff", fontWeight: 700, lineHeight: 1.2 }}>{m.nickname ?? m.name}</div>
                      <div style={{ fontSize: 6, color: "#aaa" }}>Lv {m.level} · IV {iv}%</div>
                      <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>{typeTag(m.type1)}{m.type2 && typeTag(m.type2)}</div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {sorted.map((o) => {
                  const m = o.mon;
                  const cp = getCP(m);
                  const iv = ivPercent(m);
                  return (
                    <button key={m.uid ?? `${m.id}-${o.orderIdx}`} className="btn"
                      onClick={() => { sfx.click(); setSelectedMonUid(m.uid ?? null); setMonDetailTab("info"); setScreen("monDetail"); }}
                      style={{
                        background: `${TYPE_COLORS[m.type1]}10`,
                        border: `1.5px solid ${o.teamIdx >= 0 ? "#FFD70066" : `${TYPE_COLORS[m.type1]}55`}`,
                        borderRadius: 10, padding: "8px 10px",
                        display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textAlign: "left",
                      }}>
                      <MonSprite sprite={m.sprite} size={42} className="" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 10, color: "#fff", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {m.nickname ?? m.name} {o.teamIdx >= 0 && <i className="fa-solid fa-star" style={{ fontSize: 7, color: "#FFD700", marginLeft: 4 }} />}
                          </span>
                          <span style={{ fontSize: 8, color: "#FFD700" }}>CP {cp}</span>
                        </div>
                        <div style={{ display: "flex", gap: 4, marginTop: 3 }}>{typeTag(m.type1)}{m.type2 && typeTag(m.type2)}</div>
                        <div style={{ fontSize: 7, color: "#aaa", marginTop: 3 }}>
                          #{String(m.id).padStart(3, "0")} · Lv {m.level} · IV {iv}% · HP {m.currentHp}/{m.maxHp}
                          {o.teamName && <span style={{ color: "#FFD700" }}> · {o.teamName}</span>}
                        </div>
                      </div>
                      <i className="fa-solid fa-caret-right" style={{ color: "#6b7896" }} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {showMonsSort && (
            <div onClick={() => setShowMonsSort(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200 }}>
              <div onClick={(e) => e.stopPropagation()}
                style={{
                  background: "#10172a", border: "1.5px solid #26A69A", borderTopLeftRadius: 16, borderTopRightRadius: 16,
                  width: "100%", maxWidth: 420, padding: 14, display: "flex", flexDirection: "column", gap: 8, maxHeight: "75vh",
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ color: "#26A69A", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>How should I sort your Pokémon?</div>
                  <button className="btn"
                    style={{ border: "1px solid #555", color: "#888", padding: "3px 8px", borderRadius: 6, fontSize: 9 }}
                    onClick={() => setShowMonsSort(false)}>✕</button>
                </div>
                <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                  {SORT_OPTIONS.map((s, idx) => {
                    const active = monsSortKey === s.key;
                    return (
                      <button key={s.key} className="btn"
                        onClick={() => { setMonsSortKey(s.key); setShowMonsSort(false); }}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "10px 12px", borderRadius: 8,
                          border: `1.5px solid ${active ? "#26A69A" : "#2a3148"}`,
                          background: active ? "#0d2a26" : "#0d1322",
                          color: "#fff", fontSize: 11, cursor: "pointer", textAlign: "left",
                        }}>
                        <span><span style={{ color: "#6b7896", marginRight: 8 }}>{idx + 1}.</span>{s.label}</span>
                        {active && <i className="fa-solid fa-check" style={{ color: "#26A69A" }} />}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 6, paddingTop: 8, borderTop: "1px solid #2a3148" }}>
                  <div style={{ flex: 1, fontSize: 10, color: "#aaa" }}>
                    Direction:
                    <span style={{ color: monsSortDir === "max" ? "#FFD700" : "#26A69A", fontWeight: 700, marginLeft: 6 }}>
                      {monsSortDir === "max" ? "Max First" : "Min First"}
                    </span>
                  </div>
                  <button className="btn"
                    onClick={() => setMonsSortDir((d) => d === "max" ? "min" : "max")}
                    style={{ border: "1px solid #26A69A", background: "#0d2a26", color: "#26A69A", padding: "6px 12px", borderRadius: 8, fontSize: 10, cursor: "pointer" }}>
                    Switch
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (screen === "monDetail") {
    const findOwned = (): { mon: Mon | null; teamIdx: number; monIdx: number; inBox: boolean } => {
      for (let ti = 0; ti < teams.length; ti++) {
        const idx = teams[ti].mons.findIndex((m) => m.uid === selectedMonUid);
        if (idx >= 0) return { mon: teams[ti].mons[idx], teamIdx: ti, monIdx: idx, inBox: false };
      }
      const bi = box.findIndex((m) => m.uid === selectedMonUid);
      if (bi >= 0) return { mon: box[bi], teamIdx: -1, monIdx: bi, inBox: true };
      return { mon: null, teamIdx: -1, monIdx: -1, inBox: false };
    };
    const found = findOwned();
    const m = found.mon;
    if (!m) {
      return (
        <div style={S.root}><style>{css}</style>
          <div style={S.wrap}>
            <div style={S.header}>
              <span style={{ fontSize: 9, color: "#26A69A" }}>POKÉMON</span>
              <button className="btn" style={{ border: "1px solid #555", color: "#888", padding: "5px 10px" }} onClick={() => setScreen("mons")}>◀ BACK</button>
            </div>
            <div style={{ padding: 30, textAlign: "center", color: "#888", fontSize: 10 }}>This Pokémon is no longer in your collection.</div>
          </div>
        </div>
      );
    }
    const cp = getCP(m);
    const iv = ivPercent(m);
    const ivT = (m.ivHp ?? 0) + (m.ivAtk ?? 0) + (m.ivDef ?? 0) + (m.ivSpa ?? 0) + (m.ivSpd ?? 0) + (m.ivSpe ?? 0);
    const evT = (m.evHp ?? 0) + (m.evAtk ?? 0) + (m.evDef ?? 0) + (m.evSpa ?? 0) + (m.evSpd ?? 0) + (m.evSpe ?? 0);

    const updateMon = (updater: (mm: Mon) => Mon) => {
      if (found.inBox) {
        setBox((prev) => prev.map((mm) => mm.uid === m.uid ? updater(mm) : mm));
      } else {
        setTeams((prev) => prev.map((t, ti) => ti !== found.teamIdx ? t : { ...t, mons: t.mons.map((mm) => mm.uid === m.uid ? updater(mm) : mm) }));
      }
    };

    const releaseMon = () => {
      if (typeof window !== "undefined" && !window.confirm(`Release ${m.nickname ?? m.name} forever? This cannot be undone.`)) return;
      if (found.inBox) {
        setBox((prev) => prev.filter((mm) => mm.uid !== m.uid));
      } else {
        const teamMons = teams[found.teamIdx]?.mons ?? [];
        if (teamMons.length <= TEAM_MIN) { addLog(`Team must keep at least ${TEAM_MIN} Pokémon. Move ${m.nickname ?? m.name} to another team or your collection first.`, "#F44336"); return; }
        setTeams((prev) => prev.map((t, ti) => ti !== found.teamIdx ? t : { ...t, mons: t.mons.filter((mm) => mm.uid !== m.uid) }));
        if (found.teamIdx === activeTeamIdx) {
          if (buddyIdx === found.monIdx) setBuddyIdx(-1);
          else if (buddyIdx > found.monIdx) setBuddyIdx(buddyIdx - 1);
        }
      }
      addLog(`Released ${m.nickname ?? m.name}. Farewell!`, "#FF9800");
      sfx.menuBack();
      setScreen("mons");
    };

    const renameMon = () => {
      const next = (typeof window !== "undefined" ? window.prompt(`Nickname for ${m.name}:`, m.nickname ?? m.name) : "")?.trim();
      if (next === undefined || next === null) return;
      const finalName = next.length === 0 ? undefined : next.slice(0, 16);
      updateMon((mm) => ({ ...mm, nickname: finalName }));
      addLog(finalName ? `Nickname set to "${finalName}"!` : `Nickname cleared.`, "#4CAF50");
    };

    const evolveMon = () => {
      // Candy is no longer required to evolve — just confirm and go.
      const nextId = m.id + 1;
      const nextTpl = ALL_POKEMON.find((p) => p.id === nextId);
      if (!nextTpl) { addLog(`${m.name} cannot evolve further.`, "#F44336"); return; }
      if (typeof window !== "undefined" && !window.confirm(`Evolve ${m.nickname ?? m.name} into ${nextTpl.name}?`)) return;
      const evolved = makeMon(nextTpl, m.level, "evolve");
      evolved.uid = m.uid;
      evolved.nickname = m.nickname;
      evolved.exp = m.exp;
      evolved.expNeeded = m.expNeeded;
      evolved.ivHp = m.ivHp; evolved.ivAtk = m.ivAtk; evolved.ivDef = m.ivDef;
      evolved.ivSpa = m.ivSpa; evolved.ivSpd = m.ivSpd; evolved.ivSpe = m.ivSpe;
      evolved.evHp = m.evHp; evolved.evAtk = m.evAtk; evolved.evDef = m.evDef;
      evolved.evSpa = m.evSpa; evolved.evSpd = m.evSpd; evolved.evSpe = m.evSpe;
      evolved.caughtAt = m.caughtAt;
      updateMon(() => evolved);
      setCaught((prev) => new Set([...prev, nextTpl.id]));
      sfx.evolve();
      addLog(`${m.nickname ?? m.name} evolved into ${nextTpl.name}!`, "#FFD700");
    };

    const StatRow = ({ label, val, bonus, max = 200 }: { label: string; val: number; bonus?: string; max?: number }) => (
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: "#fff", padding: "3px 0" }}>
        <span style={{ width: 70, color: "#aaa" }}>{label}</span>
        <span style={{ width: 40, textAlign: "right", fontWeight: 700 }}>{val}</span>
        {bonus && <span style={{ fontSize: 9, color: bonus === "+" ? "#4ade80" : bonus === "-" ? "#F44336" : "#888" }}>({bonus})</span>}
        <div style={{ flex: 1, height: 6, background: "#0d1322", border: "1px solid #2a3148", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ width: `${Math.min(100, (val / max) * 100)}%`, height: "100%", background: "linear-gradient(90deg, #26A69A, #4ade80)" }} />
        </div>
      </div>
    );

    const tabs: { key: typeof monDetailTab; label: string }[] = [
      { key: "info", label: "Info" },
      { key: "stats", label: "Stats" },
      { key: "iv", label: "IVs/EVs" },
      { key: "moves", label: "Moveset" },
    ];

    const moveset = (m.moves && m.moves.length > 0 ? m.moves : ["Tackle", "Growl"]).slice(0, 4);

    return (
      <div style={S.root}><style>{css}</style>
        <div style={S.wrap}>
          <div style={S.header}>
            <span style={{ fontSize: 9, color: "#26A69A" }}><i className="fa-solid fa-paw" /> {m.nickname ?? m.name}</span>
            <button className="btn" style={{ border: "1px solid #555", color: "#888", padding: "5px 10px" }} onClick={() => setScreen("mons")}>◀ BACK</button>
          </div>

          <div style={{
            margin: "10px 12px 8px", padding: 12, borderRadius: 12,
            background: `linear-gradient(135deg, ${TYPE_COLORS[m.type1]}25, ${TYPE_COLORS[m.type2 ?? m.type1]}10)`,
            border: `2px solid ${TYPE_COLORS[m.type1]}66`,
            display: "flex", gap: 12, alignItems: "center",
          }}>
            <div style={{ width: 96, height: 96, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.25)", borderRadius: 10 }}>
              <MonSprite sprite={m.sprite} size={88} className="" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "#fff", fontWeight: 800 }}>{m.nickname ?? m.name}</div>
              {m.nickname && <div style={{ fontSize: 8, color: "#aaa" }}>({m.name})</div>}
              <div style={{ fontSize: 9, color: "#FFD700", marginTop: 2 }}>#{String(m.id).padStart(3, "0")} · CP {cp}</div>
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>{typeTag(m.type1)}{m.type2 && typeTag(m.type2)}</div>
              <div style={{ fontSize: 8, color: "#aaa", marginTop: 4 }}>
                Lv {m.level} · HP {m.currentHp}/{m.maxHp} · IV {iv}%
              </div>
              <div style={{ fontSize: 7, color: "#6b7896", marginTop: 2 }}>
                {found.inBox ? "📦 In your collection" : `★ In team: ${teams[found.teamIdx]?.name ?? "—"}`}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 4, padding: "0 12px 8px" }}>
            {tabs.map((t) => (
              <button key={t.key} className="btn"
                onClick={() => setMonDetailTab(t.key)}
                style={{
                  flex: 1, padding: "6px 4px", fontSize: 9, fontWeight: 700,
                  border: `1.5px solid ${monDetailTab === t.key ? "#26A69A" : "#2a3148"}`,
                  background: monDetailTab === t.key ? "#0d2a26" : "#0d1322",
                  color: monDetailTab === t.key ? "#26A69A" : "#aaa",
                  borderRadius: 8, cursor: "pointer",
                }}>
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "0 12px" }}>
            {monDetailTab === "info" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 10, color: "#fff" }}>
                <div><span style={{ color: "#aaa" }}>Level:</span> {m.level} <span style={{ color: "#666" }}>|</span> <span style={{ color: "#aaa" }}>Nature:</span> {m.nature ?? "Hardy"}</div>
                <div><span style={{ color: "#aaa" }}>Types:</span> {m.type1}{m.type2 ? ` / ${m.type2}` : ""}</div>
                <div><span style={{ color: "#aaa" }}>Gender:</span> {m.id % 8 === 0 ? "Genderless" : m.id % 2 === 0 ? "Female" : "Male"}</div>
                <div><span style={{ color: "#aaa" }}>Ability:</span> {(m as any).ability ?? "—"}</div>
                <div><span style={{ color: "#aaa" }}>Tera Type:</span> {m.type1}</div>
                <div><span style={{ color: "#aaa" }}>EXP:</span> {m.exp.toLocaleString()}</div>
                <div><span style={{ color: "#aaa" }}>Need To Next Level:</span> {Math.max(0, m.expNeeded - m.exp).toLocaleString()}</div>
                <div style={{ marginTop: 6, height: 8, background: "#0d1322", border: "1px solid #2a3148", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, (m.exp / Math.max(1, m.expNeeded)) * 100)}%`, height: "100%", background: "linear-gradient(90deg, #26A69A, #4ade80)" }} />
                </div>
                <div style={{ fontSize: 8, color: "#888" }}>Caught: {m.caughtAt ? new Date(m.caughtAt).toLocaleDateString() : "—"} · Origin: {m.origin ?? "—"}</div>
              </div>
            )}

            {monDetailTab === "stats" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#aaa", borderBottom: "1px dashed #2a3148", paddingBottom: 4, marginBottom: 4 }}>
                  <span>Stats</span><span>Points</span>
                </div>
                <StatRow label="HP" val={m.maxHp} max={400} />
                <StatRow label="Attack" val={m.atk} max={250} />
                <StatRow label="Defense" val={m.def} max={250} />
                <StatRow label="Sp. Attack" val={m.spa} max={250} />
                <StatRow label="Sp. Defense" val={m.spd} max={250} />
                <StatRow label="Speed" val={m.spe} max={250} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#FFD700", marginTop: 6, paddingTop: 6, borderTop: "1px dashed #2a3148" }}>
                  <span>Total</span><span>{m.maxHp + m.atk + m.def + m.spa + m.spd + m.spe}</span>
                </div>
              </div>
            )}

            {monDetailTab === "iv" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 10, color: "#fff" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 60px", fontSize: 9, color: "#aaa", borderBottom: "1px dashed #2a3148", paddingBottom: 4 }}>
                  <span>Stat</span><span style={{ textAlign: "right" }}>IV</span><span style={{ textAlign: "right" }}>EV</span>
                </div>
                {([
                  ["HP", m.ivHp ?? 0, m.evHp ?? 0],
                  ["Attack", m.ivAtk ?? 0, m.evAtk ?? 0],
                  ["Defense", m.ivDef ?? 0, m.evDef ?? 0],
                  ["Sp. Attack", m.ivSpa ?? 0, m.evSpa ?? 0],
                  ["Sp. Defense", m.ivSpd ?? 0, m.evSpd ?? 0],
                  ["Speed", m.ivSpe ?? 0, m.evSpe ?? 0],
                ] as [string, number, number][]).map(([label, ivv, evv]) => (
                  <div key={label} style={{ display: "grid", gridTemplateColumns: "1fr 60px 60px", padding: "3px 0" }}>
                    <span style={{ color: "#aaa" }}>{label}</span>
                    <span style={{ textAlign: "right", color: ivv >= 31 ? "#FFD700" : ivv >= 25 ? "#4ade80" : "#fff" }}>{ivv}</span>
                    <span style={{ textAlign: "right", color: "#26A69A" }}>{evv}</span>
                  </div>
                ))}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 60px", marginTop: 6, paddingTop: 6, borderTop: "1px dashed #2a3148", color: "#FFD700", fontWeight: 700 }}>
                  <span>Total</span>
                  <span style={{ textAlign: "right" }}>{ivT}</span>
                  <span style={{ textAlign: "right", color: "#26A69A" }}>{evT}</span>
                </div>
              </div>
            )}

            {monDetailTab === "moves" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {moveset.map((mv, i) => {
                  const mt = moveTypeOf(mv);
                  const color = MOVE_TYPE_COLOR[mt] ?? "#888";
                  return (
                    <div key={`${mv}-${i}`} style={{
                      padding: "8px 10px", borderRadius: 8,
                      background: `${color}15`, border: `1.5px solid ${color}66`,
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <span style={{ fontSize: 11, color: "#fff", fontWeight: 700 }}>{mv}</span>
                      <span style={{ fontSize: 8, color, padding: "2px 8px", border: `1px solid ${color}`, borderRadius: 999, background: `${color}22` }}>
                        {mt.toUpperCase()}
                      </span>
                    </div>
                  );
                })}
                {moveset.length === 0 && <div style={{ color: "#666", fontSize: 9, textAlign: "center", padding: 20 }}>No moves learned yet.</div>}
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, padding: "10px 12px 14px", borderTop: "1px solid #2a3148" }}>
            <button className="btn"
              onClick={renameMon}
              style={{ padding: "10px 6px", border: "1.5px solid #a855f7", background: "#1a0a2a", color: "#c084fc", borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
              <i className="fa-solid fa-pen" style={{ marginRight: 4 }} /> Nickname
            </button>
            <button className="btn"
              onClick={evolveMon}
              style={{ padding: "10px 6px", border: "1.5px solid #FFD700", background: "#1a1808", color: "#FFD700", borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
              <i className="fa-solid fa-wand-magic-sparkles" style={{ marginRight: 4 }} /> Evolve
            </button>
            <button className="btn"
              onClick={releaseMon}
              style={{ padding: "10px 6px", border: "1.5px solid #F44336", background: "#1a0a14", color: "#F44336", borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
              <i className="fa-solid fa-trash" style={{ marginRight: 4 }} /> Release
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "store") {
    const NATURES = ["Jolly", "Timid", "Modest", "Adamant", "Bold", "Calm", "Brave"];
    const RARE_IDS = new Set([6, 9, 12, 15, 18, 25]);
    const LEGEND_IDS = new Set<number>();
    function priceFor(p: PokemonTemplate) {
      const base = (p.hp + p.atk + p.def + p.spa + p.spd + p.spe);
      const tier = LEGEND_IDS.has(p.id) ? 200 : RARE_IDS.has(p.id) ? 60 : 30;
      return base * tier;
    }
    const stardustCats = new Set(["dust-balls", "dust-passes"]);
    const itemsCats = new Set(["balls", "boost", "tms"]);
    const marketTab: "pokemons" | "items" | "stardust" =
      stardustCats.has(storeCat ?? "") ? "stardust"
      : itemsCats.has(storeCat ?? "") ? "items"
      : "pokemons";
    const marketMons = ALL_POKEMON.slice(0, 12);
    const categories = [
      { key: "balls", label: "POKÉ BALLS", emoji: "🔴", color: "#F44336", desc: "Catch wild Pokémon",
        items: [
          { name: "Poké Ball", price: 100, info: BALL_BLURB["Poké Ball"] },
          { name: "Great Ball", price: 130, info: BALL_BLURB["Great Ball"] },
          { name: "Ultra Ball", price: 150, info: BALL_BLURB["Ultra Ball"] },
          { name: "Level Ball", price: 140, info: BALL_BLURB["Level Ball"] },
          { name: "Timer Ball", price: 130, info: BALL_BLURB["Timer Ball"] },
          { name: "Fast Ball", price: 140, info: BALL_BLURB["Fast Ball"] },
          { name: "Repeat Ball", price: 130, info: BALL_BLURB["Repeat Ball"] },
          { name: "Nest Ball", price: 120, info: BALL_BLURB["Nest Ball"] },
          { name: "Net Ball", price: 130, info: BALL_BLURB["Net Ball"] },
          { name: "Quick Ball", price: 150, info: BALL_BLURB["Quick Ball"] },
          { name: "Beast Ball", price: 150, info: BALL_BLURB["Beast Ball"] },
        ] },
      { key: "boost", label: "BOOST ITEMS", emoji: "💊", color: "#4CAF50", desc: "Heal & power up",
        items: [
          { name: "Potion", price: 300, info: "Restore 20 HP" },
          { name: "Super Potion", price: 700, info: "Restore 50 HP" },
          { name: "Hyper Potion", price: 1500, info: "Restore 200 HP" },
          { name: "Revive", price: 1500, info: "Revive fainted" },
          { name: "X Attack", price: 500, info: "+ATK in battle" },
          { name: "Rare Candy", price: 4800, info: "+1 Level" },
        ] },
      { key: "tms", label: "TMs", emoji: "💿", color: "#9C27B0", desc: "Teach new moves",
        items: tmStoreItems() },
    ];
    const stardustCategories = [
      { key: "dust-balls", label: "RARE BALLS", emoji: "🟣", color: "#a855f7", desc: "Premium Poké Balls",
        items: [
          { name: "Master Ball", price: 5000, info: "Guaranteed catch — works on any wild Pokémon" },
        ] },
      { key: "dust-passes", label: "PASSES", emoji: "🎟️", color: "#06b6d4", desc: "Bonus entries",
        items: [
          { name: "Safari Pass", price: 4500, info: "Enter the Safari Zone again on the same day" },
        ] },
    ];
    const allCats = [...categories, ...stardustCategories];
    const cat = allCats.find((c) => c.key === storeCat) ?? null;
    const visibleItems = (() => {
      const items = cat?.items ?? [];
      if (storeCat !== "tms" || !tmSearch.trim()) return items;
      const q = tmSearch.trim().toLowerCase();
      return items.filter((it) =>
        it.name.toLowerCase().includes(q) || it.info.toLowerCase().includes(q)
      );
    })();
    const isStardustCat = stardustCats.has(storeCat ?? "");
    return (
      <div style={S.root}><style>{css}</style>
        <div style={{ ...S.wrap, background: "var(--m-bg)" }} className="m-app">
          <div className="m-mkt-head" style={{ position: "relative" }}>
            <button className="btn"
              style={{
                position: "absolute", left: 12, top: 14,
                border: "1px solid var(--m-border)", color: "var(--m-muted)",
                padding: "6px 10px", borderRadius: 8, background: "transparent",
                fontSize: 11, fontWeight: 600,
              }}
              onClick={() => { sfx.menuBack(); setScreen("world"); }}>
              <i className="fa-solid fa-chevron-left" style={{ fontSize: 9, marginRight: 4 }} />BACK
            </button>
            <h1 className="m-mkt-title">Crimson Sky Marketplace</h1>
            <div style={{ marginTop: 6, display: "flex", justifyContent: "center", gap: 14, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--m-yellow)", fontWeight: 600 }}>
                <i className="fa-solid fa-coins" style={{ fontSize: 10, marginRight: 4 }} />₽{player.money.toLocaleString()}
              </span>
              <span style={{ fontSize: 12, color: "#c4b5fd", fontWeight: 600 }}>
                <i className="fa-solid fa-wand-sparkles" style={{ fontSize: 10, marginRight: 4 }} />{(player.stardust ?? 0).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="m-toggle-wrap">
            <div className="m-toggle">
              <div className={`m-toggle-btn ${marketTab === "pokemons" ? "active" : ""}`}
                onClick={() => { sfx.click(); setStoreCat(null); }}>Pokémons</div>
              <div className={`m-toggle-btn ${marketTab === "items" ? "active" : ""}`}
                onClick={() => { sfx.click(); setStoreCat("balls"); }}>Items</div>
              <div className={`m-toggle-btn ${marketTab === "stardust" ? "active" : ""}`}
                onClick={() => { sfx.click(); setStoreCat("dust-balls"); }}>Stardust</div>
            </div>
          </div>

          {marketTab === "pokemons" && (
            <>
              <div className="m-search-row">
                <div className="m-search">
                  <i className="fa-solid fa-magnifying-glass" />
                  <input type="text" placeholder="Search" />
                </div>
                <button className="m-icon-btn"><i className="fa-solid fa-filter" /></button>
                <button className="m-icon-btn"><i className="fa-solid fa-bars-staggered" /></button>
              </div>
              <div className="m-grid">
                {marketMons.map((p, i) => {
                  const price = priceFor(p);
                  const nature = NATURES[i % NATURES.length];
                  const cls = LEGEND_IDS.has(p.id) ? "m-legend" : RARE_IDS.has(p.id) ? "m-rare" : "";
                  const canAfford = player.money >= price;
                  return (
                    <div key={p.id} className={`m-pcard ${cls}`}
                      onClick={() => {
                        if (!canAfford) { addLog("Not enough Pokédollars!", "#F44336"); return; }
                        sfx.menuOpen();
                        const mon = makeMon(p, 5, "store");
                        setPlayer((pl) => ({ ...pl, money: pl.money - price }));
                        if (team.length < TEAM_MAX) {
                          setTeam((t) => t.length < TEAM_MAX ? [...t, mon] : t);
                          addLog(`Purchased ${p.name}! Added to team.`, "#FFD700");
                        } else {
                          setBox((bx) => [...bx, mon]);
                          addLog(`Purchased ${p.name}! Team full — sent to Mons collection.`, "#FFD700");
                        }
                        setCaught((c) => new Set([...c, p.id]));
                      }}>
                      <img src={SPRITE(p.sprite)} alt={p.name} />
                      <div className="ovr">
                        <span className="m-nature">{nature}</span>
                        <span className="m-pname">{p.name}{RARE_IDS.has(p.id) ? " ★" : ""}</span>
                        <span className="m-price">₽ {price.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {(marketTab === "items" || marketTab === "stardust") && (
            <>
              <div style={{ padding: "0 16px 8px", display: "flex", gap: 8, overflowX: "auto" }}>
                {(marketTab === "stardust" ? stardustCategories : categories).map((c) => (
                  <button key={c.key} className="m-icon-btn"
                    style={{
                      width: "auto", padding: "8px 14px", borderRadius: 16, fontSize: 12, fontWeight: 600,
                      color: storeCat === c.key ? c.color : "var(--m-muted)",
                      borderColor: storeCat === c.key ? c.color : "var(--m-border)",
                      background: storeCat === c.key ? `${c.color}15` : "var(--m-card)",
                      flexShrink: 0,
                    }}
                    onClick={() => { sfx.click(); setStoreCat(c.key); }}>
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>
              {storeCat === "tms" && (
                <div className="m-search-row">
                  <div className="m-search">
                    <i className="fa-solid fa-magnifying-glass" />
                    <input
                      type="text"
                      placeholder="Search TMs by name or type"
                      value={tmSearch}
                      onChange={(e) => setTmSearch(e.target.value)}
                    />
                    {tmSearch && (
                      <i
                        className="fa-solid fa-xmark"
                        style={{ cursor: "pointer" }}
                        onClick={() => { sfx.click(); setTmSearch(""); }}
                      />
                    )}
                  </div>
                </div>
              )}
              <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                {storeCat === "tms" && visibleItems.length === 0 && (
                  <div style={{ padding: "20px 12px", textAlign: "center", color: "var(--m-muted)", fontSize: 13 }}>
                    No TMs match "{tmSearch}"
                  </div>
                )}
                {visibleItems.map((it) => {
                  const balance = isStardustCat ? (player.stardust ?? 0) : player.money;
                  const canAfford = balance >= it.price;
                  const owned = inventoryQty(it.name);
                  return (
                    <div key={it.name} className="m-card" style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, borderRadius: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--m-text)" }}>
                          {it.name}{owned > 0 ? <span style={{ fontSize: 10, color: "var(--m-muted)", marginLeft: 6 }}>×{owned}</span> : null}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--m-muted)", marginTop: 2 }}>{it.info}</div>
                      </div>
                      <div style={{ fontSize: 13, color: isStardustCat ? "#c4b5fd" : "var(--m-yellow)", minWidth: 80, textAlign: "right", fontWeight: 600 }}>
                        {isStardustCat ? `✨ ${it.price.toLocaleString()}` : `₽${it.price.toLocaleString()}`}
                      </div>
                      <button
                        disabled={!canAfford}
                        style={{
                          background: canAfford ? (isStardustCat ? "linear-gradient(180deg,#7e3aed,#4c1d95)" : "var(--m-bluebg)") : "var(--m-input)",
                          color: canAfford ? "#fff" : "var(--m-muted)",
                          border: "none", padding: "8px 16px", borderRadius: 16, fontSize: 12, fontWeight: 600,
                          fontFamily: "inherit", cursor: canAfford ? "pointer" : "not-allowed", opacity: canAfford ? 1 : 0.5,
                        }}
                        onClick={() => {
                          if (!canAfford) return;
                          sfx.click();
                          if (isStardustCat) {
                            setPlayer((p) => ({ ...p, stardust: (p.stardust ?? 0) - it.price }));
                          } else {
                            setPlayer((p) => ({ ...p, money: p.money - it.price }));
                          }
                          setInventory((inv) => {
                            const found = inv.find((x) => x.name === it.name);
                            return found
                              ? inv.map((x) => x.name === it.name ? { ...x, qty: x.qty + 1 } : x)
                              : [...inv, { name: it.name, qty: 1 }];
                          });
                          addLog(`Bought ${it.name}!`, "#FFD700");
                        }}>BUY</button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <BottomNav active="market" go={setScreen} />
        </div>
      </div>
    );
  }

  if (screen === "safari") {
    const region = REGIONS[safariRegion] ?? REGIONS[0];
    const isLegend = safariEnc ? ALL_LEGENDARY_IDS.has(safariEnc.id) : false;
    return (
      <div style={{ ...S.root, background: "#0a0a0c" }}><style>{css}{`
        .safari-btn {
          background: linear-gradient(180deg, #1c1c21 0%, #121216 100%);
          border: 1px solid rgba(255,255,255,0.08);
          color: #f0f0f0;
          padding: 16px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          text-align: center;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .safari-btn:hover:not(:disabled) {
          background: linear-gradient(180deg, #2a2a32 0%, #1a1a20 100%);
          border-color: rgba(255,255,255,0.15);
          transform: translateY(-2px);
        }
        .safari-btn:active:not(:disabled) { transform: translateY(1px); }
        .safari-btn:disabled { opacity: 0.45; cursor: not-allowed; }
      `}</style>
        <div style={{ ...S.wrap, background: "#0a0a0c", fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", padding: "16px 16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <button
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#f0f0f0", padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(4px)" }}
              onClick={() => { setScreen("world"); }}>
              ◀
            </button>
            <div style={{ fontSize: 14, letterSpacing: 2, fontWeight: 700, color: "#f0f0f0" }}>safari zone</div>
            <div style={{ width: 50 }} />
          </div>

          {/* Stats bar */}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 20px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, backdropFilter: "blur(10px)" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", fontSize: 10, color: "#888890", textTransform: "uppercase", letterSpacing: 1 }}>
              Balls
              <div style={{ fontSize: 14, fontWeight: 700, color: safariBalls < 5 ? "#f87171" : "#f0f0f0", marginTop: 4 }}>⚪ {safariBalls}/30</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", fontSize: 10, color: "#888890", textTransform: "uppercase", letterSpacing: 1 }}>
              Caught
              <div style={{ fontSize: 14, fontWeight: 700, color: "#4ade80", marginTop: 4 }}>{safariCaught}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", fontSize: 10, color: "#888890", textTransform: "uppercase", letterSpacing: 1 }}>
              {region.name}
              <div style={{ fontSize: 14, fontWeight: 700, color: "#facc15", marginTop: 4 }}>#{safariCounter}</div>
            </div>
          </div>

          {/* Sprite showcase with forest background */}
          <div style={{
            height: 250,
            borderRadius: 16,
            border: `1px solid ${isLegend ? "#FFD700" : "rgba(255,255,255,0.08)"}`,
            backgroundImage: `url(${safariForestBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center bottom",
            backgroundRepeat: "no-repeat",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
            boxShadow: `${isLegend ? "0 0 24px rgba(255,215,0,0.35), " : ""}inset 0 0 50px rgba(0,0,0,0.8)`,
            overflow: "hidden",
          }}>
            {safariEnc && (
              <>
                <div style={{ animation: safariThrowAnim === "wobble" ? "ballWobble 0.9s" : "none", zIndex: 2 }}>
                  {safariThrowAnim !== "throw" && safariThrowAnim !== "wobble" && (
                    <div style={{ filter: "drop-shadow(0px 15px 15px rgba(0,0,0,0.6))" }}>
                      <MonSprite sprite={safariEnc.sprite} size={150} className="mon-float" />
                    </div>
                  )}
                </div>
                {safariThrowAnim === "throw" && (
                  <div style={{ position: "absolute", animation: "ballThrow 0.5s forwards", zIndex: 3 }}>
                    <div className="pokeball" style={{ width: 32, height: 32 }} />
                  </div>
                )}
                {safariThrowAnim === "wobble" && (
                  <div style={{ position: "absolute", animation: "ballWobble 0.9s", zIndex: 3 }}>
                    <div className="pokeball" style={{ width: 32, height: 32 }} />
                  </div>
                )}
                {safariThrowAnim === "stars" && (
                  <div style={{ position: "absolute", fontSize: 40, animation: "catchStars 0.9s", zIndex: 3 }}>✨🌟✨</div>
                )}
                {safariThrowAnim === "burst" && (
                  <div style={{ position: "absolute", fontSize: 40, animation: "ballBurst 0.6s", zIndex: 3 }}>💥</div>
                )}
              </>
            )}
            {isLegend && (
              <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(255,215,0,0.2)", border: "1px solid #FFD700", borderRadius: 6, padding: "3px 8px", fontSize: 10, color: "#FFD700", fontWeight: 700, zIndex: 3 }}>
                ★ LEGENDARY
              </div>
            )}
          </div>

          {/* Encounter banner */}
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${
              safariStatusMsg?.kind === "caught" ? "#4ade80" :
              safariStatusMsg?.kind === "fled"   ? "#f87171" :
              "rgba(255,255,255,0.08)"
            }`,
            padding: 16,
            borderRadius: 12,
            textAlign: "center",
            fontSize: 15,
            fontWeight: 600,
            backdropFilter: "blur(10px)",
            color: safariStatusMsg?.kind === "caught" ? "#4ade80" :
                   safariStatusMsg?.kind === "fled"   ? "#f87171" :
                   "#f0f0f0",
            minHeight: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            {safariStatusMsg ? (
              <span>
                {safariStatusMsg.text}
                {safariStatusMsg.kind === "throw" && (
                  <span style={{ marginLeft: 6, color: "#FFD700", letterSpacing: 2 }}>
                    {"★".repeat(safariStatusMsg.stars ?? 1)}
                  </span>
                )}
              </span>
            ) : safariEnc ? (
              <span>
                A wild {safariEnc.name}
                <span style={{ background: "#222", padding: "2px 6px", borderRadius: 4, fontSize: 11, color: "#888890", margin: "0 6px", border: "1px solid #333" }}>Lv. {safariEnc.level}</span>
                {isLegend ? "is watching..." : "appeared!"}
              </span>
            ) : "..."}
          </div>

          {/* Terminal log */}
          <div style={{
            background: "#050508",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: 16,
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: 12,
            color: "#22d3ee",
            lineHeight: 1.6,
            boxShadow: "inset 0 4px 10px rgba(0,0,0,0.5)",
            minHeight: 120,
            maxHeight: 160,
            overflowY: "auto",
          }}>
            {log.slice(-8).map((l, i) => (
              <div key={i} style={{ color: l.color || "#22d3ee" }}>&gt; {l.msg}</div>
            ))}
          </div>

          {/* Action stack */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button className="safari-btn"
              disabled={safariThrowAnim !== null || safariBalls <= 0}
              style={{ width: "100%" }}
              onClick={() => { if (safariBalls > 0) safariNext(safariBalls); }}>
              Hunt
            </button>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="safari-btn"
                disabled={!safariEnc || safariThrowAnim !== null || safariBalls <= 0}
                style={{ flex: 1 }}
                onClick={safariThrow}>
                Use Safari Ball
              </button>
              <button className="safari-btn"
                disabled={safariThrowAnim !== null}
                style={{ flex: 1 }}
                onClick={() => { setSafariEnc(null); setSafariBalls(0); setSafariCounter(0); setSafariCaught(0); addLog(`Safari ended. Caught ${safariCaught}.`, "#FFD700"); setScreen("world"); }}>
                Escape
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "regionSelect") {
    const regionMeta: { icon: string; color: string }[] = [
      { icon: "fa-fire",          color: "var(--m-orange)" },
      { icon: "fa-droplet",       color: "var(--m-cyan)" },
      { icon: "fa-leaf",          color: "var(--m-green)" },
      { icon: "fa-snowflake",     color: "var(--m-blue)" },
      { icon: "fa-bolt",          color: "var(--m-yellow)" },
      { icon: "fa-crown",         color: "var(--m-pink)" },
      { icon: "fa-umbrella-beach",color: "var(--m-teal)" },
      { icon: "fa-chess-rook",    color: "var(--m-purple)" },
      { icon: "fa-mountain-sun",  color: "var(--m-brown)" },
    ];
    return (
      <div className="m-app" style={{ ...S.root, background: "var(--m-bg)" }}><style>{css}</style>
        <div style={{ ...S.wrap, background: "var(--m-bg)", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--m-border)" }}>
            <button className="btn"
              style={{ border: "1.5px solid #f87171", color: "#f87171", padding: "5px 12px", borderRadius: 8, background: "transparent", fontSize: 11, fontWeight: 600 }}
              onClick={() => setScreen("world")}>◀ BACK</button>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--m-blue)", letterSpacing: 2 }}>SELECT REGION</div>
            <div style={{ width: 60 }} />
          </div>

          <div style={{ padding: "14px 20px 6px", fontSize: 12, color: "var(--m-muted)", lineHeight: 1.5 }}>
            Choose a region to explore. Each region's wild Pokémon are exclusive to its generation.
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {REGIONS.map((r, i) => {
                const current = player.macroRegion === i;
                const meta = regionMeta[i] ?? { icon: "fa-map", color: "var(--m-blue)" };
                return (
                  <div key={r.name} className="m-menu-btn"
                    style={{
                      color: meta.color,
                      borderColor: current ? meta.color : `${meta.color}33`,
                      background: current ? `${meta.color}14` : "var(--m-card)",
                      position: "relative",
                      paddingTop: 18, paddingBottom: 14,
                    }}
                    onClick={() => {
                      setPlayer((p) => ({ ...p, macroRegion: i, region: 0 }));
                      setHuntCount(0);
                      setLegendThreshold(20 + Math.floor(Math.random() * 16));
                      addLog(`Traveled to ${r.name} (Gen ${r.gen})!`, "#FFD700");
                      setScreen("world");
                    }}>
                    <i className={`fa-solid ${meta.icon}`} style={{ fontSize: 22 }} />
                    <span style={{ fontSize: 12, marginTop: 2 }}>{r.name}</span>
                    <span style={{ fontSize: 9, color: "var(--m-muted)", letterSpacing: 0.5, marginTop: 2 }}>Gen {r.gen}</span>
                    {current && (
                      <span style={{ position: "absolute", top: 6, right: 8, fontSize: 8, color: meta.color }}>★</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "poketalesDex") {
    return <PokeTalesDex onBack={() => setScreen("world")} onHome={() => setScreen("world")} />;
  }

  if (screen === "dex") {
    const types = ["all", ...Array.from(new Set(ALL_POKEMON.map((p) => p.type1)))].sort();
    const filtered = ALL_POKEMON.filter((p) =>
      (dexFilter === "all" || p.type1 === dexFilter || p.type2 === dexFilter) &&
      (genFilter === 0 || p.gen === genFilter)
    );
    return (
      <div style={S.root}><style>{css}</style>
        <div style={S.wrap}>
          <div style={S.header}>
            <span style={{ fontSize: 9, color: "#9C27B0" }}>📖 POKÉDEX ({seen.size}/{TOTAL_POKEMON} seen • {caught.size} caught)</span>
            <button className="btn" style={{ border: "1px solid #555", color: "#888", padding: "5px 10px" }} onClick={() => setScreen("world")}>◀ BACK</button>
          </div>
          <div style={{ padding: "8px 10px 4px", overflowX: "auto", display: "flex", gap: 4 }}>
            <button className="btn"
              style={{ border: "1px solid #555", color: genFilter === 0 ? "#fff" : "#888", padding: "4px 8px", borderRadius: 4, background: genFilter === 0 ? "#fff2" : "transparent", flexShrink: 0, fontSize: 7 }}
              onClick={() => setGenFilter(0)}>ALL GENS</button>
            {[1,2,3,4,5,6,7,8,9].map((g) => (
              <button key={g} className="btn"
                style={{ border: "1px solid #5e2c73", color: genFilter === g ? "#FFD700" : "#aaa", padding: "4px 8px", borderRadius: 4, background: genFilter === g ? "#fff2" : "transparent", flexShrink: 0, fontSize: 7 }}
                onClick={() => setGenFilter(g)}>G{g} {GEN_NAMES[g]}</button>
            ))}
          </div>
          <div style={{ padding: "4px 10px 4px", overflowX: "auto", display: "flex", gap: 4 }}>
            {types.map((t) => (
              <button key={t} className="btn"
                style={{ border: `1px solid ${t === "all" ? "#555" : TYPE_COLORS[t]}`, color: t === "all" ? "#888" : TYPE_COLORS[t], padding: "4px 8px", borderRadius: 4, background: dexFilter === t ? "#fff2" : "transparent", flexShrink: 0 }}
                onClick={() => setDexFilter(t)}>{t === "all" ? "ALL" : t}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
              {filtered.map((p) => {
                const isCaught = caught.has(p.id) || team.some((m) => m.id === p.id);
                const isSeen = isCaught || seen.has(p.id);
                return (
                  <div key={p.id} style={{ background: isSeen ? `${TYPE_COLORS[p.type1]}11` : "#18181b", border: `1px solid ${isSeen ? TYPE_COLORS[p.type1] + "66" : "#27272a"}`, borderRadius: 8, padding: "8px 4px", textAlign: "center", opacity: isSeen ? 1 : 0.45, position: "relative" }}>
                    {isSeen
                      ? <div style={{ filter: isCaught ? "none" : "grayscale(1) brightness(0.6)" }}><MonSprite sprite={p.sprite} size={52} className="" /></div>
                      : <div style={{ width: 52, height: 52, margin: "0 auto", background: "#111", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>❓</div>
                    }
                    {isCaught && <div style={{ position: "absolute", top: 4, right: 4, fontSize: 8, color: "#4ade80" }} title="Caught"><i className="fa-solid fa-circle-check" /></div>}
                    <div style={{ fontSize: 5, color: isSeen ? "#ddd" : "#333", marginTop: 3 }}>#{String(p.id).padStart(3, "0")}</div>
                    <div style={{ fontSize: 6, color: isSeen ? "#fff" : "#333", marginTop: 1 }}>{isSeen ? p.name : "????"}</div>
                    {isSeen && <div style={{ display: "flex", justifyContent: "center", gap: 2, marginTop: 3 }}>{typeTag(p.type1)}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ======================= TRAINING ZONE =======================
  if (screen === "training") {
    return (
      <div style={S.root}><style>{css}</style>
        <TrainingZone
          team={team as unknown as Parameters<typeof TrainingZone>[0]["team"]}
          money={player.money}
          onBack={() => { sfx.menuBack(); setScreen("world"); }}
          onUpdateMon={(uid, ev) => {
            // Apply each stat as an absolute set (validation done in TrainingZone).
            (Object.keys(ev) as ("hp" | "atk" | "def" | "spa" | "spd" | "spe")[]).forEach((k) => {
              const evKey = ("ev" + k.charAt(0).toUpperCase() + k.slice(1)) as "evHp" | "evAtk" | "evDef" | "evSpa" | "evSpd" | "evSpe";
              setMonEvAbsolute(uid, evKey, ev[k]);
            });
          }}
          onMutateMon={(uid, patch) => mutateMon(uid, patch as Partial<Mon>)}
          onSpendMoney={(amount) => { spendMoney(amount); }}
          toast={(msg, color) => addLog(msg, color ?? "#a78bfa")}
        />
      </div>
    );
  }

  // ======================= LEAGUE LIST =======================
  if (screen === "league") {
    return (
      <div style={S.root}><style>{css}</style>
        <LeagueScreen
          badges={badges}
          e4Cleared={e4Cleared}
          e4Streak={e4Streak}
          onBack={() => { sfx.menuBack(); setScreen("world"); }}
          onPickGym={(gym) => startLeagueBattle(gym, { isE4: false, e4Idx: 0 })}
          onStartElite4={() => {
            if (badges.length < GYM_LEADERS.length) { addLog("You need all 8 badges first.", "#F44336"); return; }
            startLeagueBattle(ELITE_FOUR[0], { isE4: true, e4Idx: 0 });
          }}
        />
      </div>
    );
  }

  // ======================= LEAGUE BATTLE =======================
  if (screen === "leagueBattle" && leagueBattle) {
    const lb = leagueBattle;
    return (
      <div style={S.root}><style>{css}</style>
        <BattleArena
          state={lb.state}
          mySide={0}
          mode="league"
          awaitingMyAction={lb.awaitingMyAction}
          awaitingForceSwitch={lb.awaitingForceSwitch}
          turnTimerSec={null}
          onAction={handleLeagueAction}
          bannerText={leagueResultBanner}
          onExit={() => {
            // If battle ended, persist mon current HP back into team for non-E4 (E4 carries inside engine).
            // Auto-heal the active team after every league battle (win or lose)
            // so the player is never blocked from the next gym by chip damage.
            setTeams((prev) => prev.map((g, gi) => gi !== activeTeamIdx ? g : ({
              ...g,
              mons: g.mons.map((m) => ({ ...m, currentHp: m.maxHp, status: null })),
            })));
            addLog("Your team was fully healed!", "#4CAF50");
            setLeagueBattle(null);
            setScreen("league");
          }}
        />
      </div>
    );
  }

  // ======================= PVP BATTLE =======================
  if (screen === "pvpBattle" && pvpBattle) {
    const pb = pvpBattle;
    return (
      <div style={S.root}><style>{css}</style>
        <BattleArena
          state={pb.state}
          mySide={pb.mySide}
          mode="pvp"
          awaitingMyAction={pb.awaitingMyAction}
          awaitingForceSwitch={pb.awaitingForceSwitch}
          oppPicked={pb.oppPicked}
          turnTimerSec={pb.turnTimerSec}
          onAction={handlePvpAction}
          bannerText={pvpBanner}
          onExit={() => {
            try { wsRef.current?.close(); } catch { /* ignore */ }
            wsRef.current = null;
            // Auto-heal active team after every PvP battle so players always
            // start the next match at full strength.
            setTeams((prev) => prev.map((g, gi) => gi !== activeTeamIdx ? g : ({
              ...g,
              mons: g.mons.map((m) => ({ ...m, currentHp: m.maxHp, status: null })),
            })));
            addLog("Your team was fully healed!", "#4CAF50");
            setPvpBattle(null);
            setPvpBanner(null);
            setBbRoom(null);
            setBbMode(null);
            setScreen("battleBox");
          }}
        />
      </div>
    );
  }

  return null;
}

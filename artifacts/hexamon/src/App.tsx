import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { sfx, playMoveSfx, moveTypeOf, TYPE_COLOR as MOVE_TYPE_COLOR } from "./sfx";
import { ALL_POKEMON, TOTAL_POKEMON, GEN_NAMES, movesForLevel, type PokemonTemplate } from "./lib/pokemon-data";
import { rankFromExp, rankProgress, rankTier, MAX_RANK } from "./lib/rank-system";
import {
  loadFriends, saveFriends, addFriend as addFriendOp, removeFriend as removeFriendOp,
  encodeMyCard, decodeFriendCode, type Friend,
} from "./lib/friends";
import { natureMult } from "./lib/natures";
import { tmStoreItems } from "./lib/tm-data";
import { POKEMON_FORMS, type FormEntry, type FormCategory } from "./lib/pokemon-forms";
import {
  fetchGlobalMarket, buyGlobalItem,
  fetchUserListings, createUserListing, buyUserListing, cancelUserListing,
  fetchPendingEarnings, claimPendingEarnings,
  type GlobalMarketItem, type UserListing,
} from "./lib/marketApi";
import {
  fetchMails, markMailRead, markAllMailRead, sendTransfer, fetchPendingTransfers, claimTransfers,
  proposeTrade, fetchPendingTrades, acceptTrade, acceptSellTrade, declineTrade, cancelTrade,
  registerPlayer, checkBanned, redeemDbCode,
  verifyAdmin, adminGetPlayer, adminBanPlayer, adminUnban, adminAnnounce, adminDrop, adminCreateCode, adminListCodes, adminDeleteCode,
  adminResetAccount, adminGetTransferHistory, adminGetTradeHistory,
  type SocialMail, type PendingTransfer, type TradeProp,
} from "./lib/socialApi";
import { PokeTalesDex } from "./components/PokeTalesDex";
import { SplashLoader } from "./components/SplashLoader";
import { StoryIntro } from "./components/StoryIntro";
import BattleArena from "./components/BattleArena";
import TrainingZone from "./components/TrainingZone";
import LeagueScreen from "./components/LeagueScreen";
import safariForestBg from "@assets/6155a54f-3b2d-4298-911f-596582b8196c_1777290294414.jpeg";
import huntForestBg from "@assets/0d36e278-0668-4064-8738-4427560706e9_1777293871555.jpeg";
import battleArenaBg from "@assets/battle_arena_meadow.jpeg";
import { GYM_LEADERS, ELITE_FOUR, npcMonToAppMon, type NpcTrainer } from "./lib/league-data";
import { BackBtn, BACK_BTN_STYLE } from "./components/BackBtn";
import {
  fromAppMon, makeBattleState, resolveTurn, forceSwitch, calcMaxHp,
  type Action as BAction, type BattleMon, type BattleState, type Team as BTeam,
} from "./lib/battle-engine";
import { chooseBotAction, pickBotForceSwitch } from "./lib/bot-ai";
import { getMove } from "./lib/move-data";
import { typeMultiplier, type PType } from "./lib/type-chart";

const SPRITE = (name: string) => `https://play.pokemonshowdown.com/sprites/ani/${name.replace(/[^a-z0-9]/g, "")}.gif`;
const SPRITE_BACK = (name: string) => `https://play.pokemonshowdown.com/sprites/ani-back/${name.replace(/[^a-z0-9]/g, "")}.gif`;
const SPRITE_SHINY = (name: string) => `https://play.pokemonshowdown.com/sprites/ani-shiny/${name.replace(/[^a-z0-9]/g, "")}.gif`;
const SPRITE_BACK_SHINY = (name: string) => `https://play.pokemonshowdown.com/sprites/ani-back-shiny/${name.replace(/[^a-z0-9]/g, "")}.gif`;

type MegaData = { megaSprite: string; type1: string; type2?: string | null; hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
const MEGA_STONES: Record<string, MegaData> = {
  "Venusaurite":    { megaSprite: "venusaur-mega",    type1:"Grass",    type2:"Poison",   hp:80,  atk:100, def:123, spa:122, spd:120, spe:80  },
  "Charizardite X": { megaSprite: "charizard-megax",  type1:"Fire",     type2:"Dragon",   hp:78,  atk:130, def:111, spa:130, spd:85,  spe:100 },
  "Charizardite Y": { megaSprite: "charizard-megay",  type1:"Fire",     type2:"Flying",   hp:78,  atk:104, def:78,  spa:159, spd:115, spe:100 },
  "Blastoisinite":  { megaSprite: "blastoise-mega",   type1:"Water",    type2:null,       hp:79,  atk:103, def:120, spa:135, spd:115, spe:78  },
  "Beedrillite":    { megaSprite: "beedrill-mega",    type1:"Bug",      type2:"Poison",   hp:65,  atk:150, def:40,  spa:15,  spd:80,  spe:145 },
  "Pidgeotite":     { megaSprite: "pidgeot-mega",     type1:"Normal",   type2:"Flying",   hp:83,  atk:80,  def:80,  spa:135, spd:80,  spe:121 },
  "Alakazite":      { megaSprite: "alakazam-mega",    type1:"Psychic",  type2:null,       hp:55,  atk:50,  def:65,  spa:175, spd:95,  spe:150 },
  "Slowbronite":    { megaSprite: "slowbro-mega",     type1:"Water",    type2:"Psychic",  hp:95,  atk:75,  def:180, spa:130, spd:80,  spe:30  },
  "Gengarite":      { megaSprite: "gengar-mega",      type1:"Ghost",    type2:"Poison",   hp:60,  atk:65,  def:80,  spa:170, spd:95,  spe:130 },
  "Kangaskhanite":  { megaSprite: "kangaskhan-mega",  type1:"Normal",   type2:null,       hp:105, atk:125, def:100, spa:60,  spd:100, spe:100 },
  "Pinsirite":      { megaSprite: "pinsir-mega",      type1:"Bug",      type2:"Flying",   hp:65,  atk:155, def:120, spa:65,  spd:90,  spe:105 },
  "Gyaradosite":    { megaSprite: "gyarados-mega",    type1:"Water",    type2:"Dark",     hp:95,  atk:155, def:109, spa:70,  spd:130, spe:81  },
  "Aerodactylite":  { megaSprite: "aerodactyl-mega",  type1:"Rock",     type2:"Flying",   hp:80,  atk:135, def:85,  spa:70,  spd:95,  spe:150 },
  "Mewtwonite X":   { megaSprite: "mewtwo-megax",     type1:"Psychic",  type2:"Fighting", hp:106, atk:190, def:100, spa:154, spd:100, spe:130 },
  "Mewtwonite Y":   { megaSprite: "mewtwo-megay",     type1:"Psychic",  type2:null,       hp:106, atk:150, def:70,  spa:194, spd:120, spe:140 },
  "Ampharosite":    { megaSprite: "ampharos-mega",    type1:"Electric", type2:"Dragon",   hp:90,  atk:95,  def:105, spa:165, spd:110, spe:45  },
  "Steelixite":     { megaSprite: "steelix-mega",     type1:"Steel",    type2:"Ground",   hp:75,  atk:125, def:230, spa:55,  spd:65,  spe:30  },
  "Scizorite":      { megaSprite: "scizor-mega",      type1:"Bug",      type2:"Steel",    hp:70,  atk:150, def:140, spa:65,  spd:100, spe:75  },
  "Heracronite":    { megaSprite: "heracross-mega",   type1:"Bug",      type2:"Fighting", hp:80,  atk:185, def:115, spa:40,  spd:105, spe:75  },
  "Houndoomite":    { megaSprite: "houndoom-mega",    type1:"Dark",     type2:"Fire",     hp:75,  atk:90,  def:90,  spa:140, spd:90,  spe:115 },
  "Tyranitarite":   { megaSprite: "tyranitar-mega",   type1:"Rock",     type2:"Dark",     hp:100, atk:164, def:150, spa:95,  spd:120, spe:71  },
  "Blazikenite":    { megaSprite: "blaziken-mega",    type1:"Fire",     type2:"Fighting", hp:80,  atk:160, def:80,  spa:130, spd:80,  spe:100 },
  "Gardevoirite":   { megaSprite: "gardevoir-mega",   type1:"Psychic",  type2:"Fairy",    hp:68,  atk:85,  def:65,  spa:165, spd:135, spe:100 },
  "Mawilite":       { megaSprite: "mawile-mega",      type1:"Steel",    type2:"Fairy",    hp:50,  atk:105, def:125, spa:55,  spd:95,  spe:50  },
  "Aggronite":      { megaSprite: "aggron-mega",      type1:"Steel",    type2:null,       hp:70,  atk:140, def:230, spa:60,  spd:80,  spe:50  },
  "Medichamite":    { megaSprite: "medicham-mega",    type1:"Fighting", type2:"Psychic",  hp:60,  atk:100, def:85,  spa:80,  spd:85,  spe:100 },
  "Manectite":      { megaSprite: "manectric-mega",   type1:"Electric", type2:null,       hp:70,  atk:75,  def:80,  spa:135, spd:80,  spe:135 },
  "Sharpedonite":   { megaSprite: "sharpedo-mega",    type1:"Water",    type2:"Dark",     hp:70,  atk:140, def:70,  spa:110, spd:65,  spe:105 },
  "Cameruptite":    { megaSprite: "camerupt-mega",    type1:"Fire",     type2:"Ground",   hp:70,  atk:120, def:100, spa:145, spd:105, spe:20  },
  "Altarianite":    { megaSprite: "altaria-mega",     type1:"Dragon",   type2:"Fairy",    hp:75,  atk:110, def:110, spa:110, spd:105, spe:80  },
  "Banettite":      { megaSprite: "banette-mega",     type1:"Ghost",    type2:null,       hp:64,  atk:165, def:75,  spa:93,  spd:83,  spe:75  },
  "Absolite":       { megaSprite: "absol-mega",       type1:"Dark",     type2:null,       hp:65,  atk:150, def:60,  spa:115, spd:60,  spe:115 },
  "Glalitite":      { megaSprite: "glalie-mega",      type1:"Ice",      type2:null,       hp:80,  atk:120, def:80,  spa:120, spd:80,  spe:100 },
  "Salamencite":    { megaSprite: "salamence-mega",   type1:"Dragon",   type2:"Flying",   hp:95,  atk:145, def:130, spa:120, spd:90,  spe:120 },
  "Metagrossite":   { megaSprite: "metagross-mega",   type1:"Steel",    type2:"Psychic",  hp:80,  atk:145, def:150, spa:105, spd:110, spe:110 },
  "Latiasite":      { megaSprite: "latias-mega",      type1:"Dragon",   type2:"Psychic",  hp:80,  atk:100, def:120, spa:140, spd:150, spe:110 },
  "Latiosite":      { megaSprite: "latios-mega",      type1:"Dragon",   type2:"Psychic",  hp:80,  atk:130, def:100, spa:160, spd:120, spe:110 },
  "Lucarionite":    { megaSprite: "lucario-mega",     type1:"Fighting", type2:"Steel",    hp:70,  atk:145, def:88,  spa:140, spd:70,  spe:112 },
  "Abomasite":      { megaSprite: "abomasnow-mega",   type1:"Grass",    type2:"Ice",      hp:90,  atk:132, def:105, spa:132, spd:105, spe:30  },
  "Lopunnite":      { megaSprite: "lopunny-mega",     type1:"Normal",   type2:"Fighting", hp:65,  atk:136, def:94,  spa:54,  spd:96,  spe:135 },
  "Garchompite":    { megaSprite: "garchomp-mega",    type1:"Dragon",   type2:"Ground",   hp:108, atk:170, def:115, spa:120, spd:95,  spe:92  },
  "Diancite":       { megaSprite: "diancie-mega",     type1:"Rock",     type2:"Fairy",    hp:50,  atk:160, def:110, spa:160, spd:110, spe:110 },
};
const STONE_TO_SPRITE: Record<string, string> = {
  "Venusaurite":"venusaur","Charizardite X":"charizard","Charizardite Y":"charizard",
  "Blastoisinite":"blastoise","Beedrillite":"beedrill","Pidgeotite":"pidgeot",
  "Alakazite":"alakazam","Slowbronite":"slowbro","Gengarite":"gengar",
  "Kangaskhanite":"kangaskhan","Pinsirite":"pinsir","Gyaradosite":"gyarados",
  "Aerodactylite":"aerodactyl","Mewtwonite X":"mewtwo","Mewtwonite Y":"mewtwo",
  "Ampharosite":"ampharos","Steelixite":"steelix","Scizorite":"scizor",
  "Heracronite":"heracross","Houndoomite":"houndoom","Tyranitarite":"tyranitar",
  "Blazikenite":"blaziken","Gardevoirite":"gardevoir","Mawilite":"mawile",
  "Aggronite":"aggron","Medichamite":"medicham","Manectite":"manectric",
  "Sharpedonite":"sharpedo","Cameruptite":"camerupt","Altarianite":"altaria",
  "Banettite":"banette","Absolite":"absol","Glalitite":"glalie",
  "Salamencite":"salamence","Metagrossite":"metagross","Latiasite":"latias",
  "Latiosite":"latios","Lucarionite":"lucario","Abomasite":"abomasnow",
  "Lopunnite":"lopunny","Garchompite":"garchomp","Diancite":"diancie",
};
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
  "urshifu-gmax": "sprites/custom/urshifu-gmax.gif",
  "urshifu-rapid-strike-gmax": "sprites/custom/urshifu-rapid-strike-gmax.gif",
  "cinderace-gmax": "sprites/custom/cinderace-gmax.gif",
  "rillaboom-gmax": "sprites/custom/rillaboom-gmax.gif",
  "melmetal-gmax": "sprites/custom/melmetal-gmax.gif",
  "venusaur-gmax": "sprites/custom/venusaur-gmax.gif",
  "venusaur-gmax-shiny": "sprites/custom/venusaur-gmax-shiny.gif",
  "blastoise-gmax": "sprites/custom/blastoise-gmax.gif",
  "blastoise-gmax-shiny": "sprites/custom/blastoise-gmax-shiny.gif",
  "chesnaught-mega": "sprites/custom/mega/chesnaught-mega.gif",
  "delphox-mega": "sprites/custom/mega/delphox-mega.gif",
  "emboar-mega": "sprites/custom/mega/emboar-mega.gif",
  "feraligatr-mega": "sprites/custom/mega/feraligatr-mega.gif",
  "greninja-mega": "sprites/custom/mega/greninja-mega.gif",
  "meganium-mega": "sprites/custom/mega/meganium-mega.gif",
  "barbaracle-mega": "sprites/custom/mega/barbaracle-mega.gif",
  "chandelure-mega": "sprites/custom/mega/chandelure-mega.gif",
  "dragalge-mega": "sprites/custom/mega/dragalge-mega.gif",
  "dragonite-mega": "sprites/custom/mega/dragonite-mega.gif",
  "drampa-mega": "sprites/custom/mega/drampa-mega.gif",
  "eelektross-mega": "sprites/custom/mega/eelektross-mega.gif",
  "excadrill-mega": "sprites/custom/mega/excadrill-mega.gif",
  "froslass-mega": "sprites/custom/mega/froslass-mega.gif",
  "hawlucha-mega": "sprites/custom/mega/hawlucha-mega.gif",
  "malamar-mega": "sprites/custom/mega/malamar-mega.gif",
  "pyroar-mega": "sprites/custom/mega/pyroar-mega.gif",
  "scolipede-mega": "sprites/custom/mega/scolipede-mega.gif",
  "scrafty-mega": "sprites/custom/mega/scrafty-mega.gif",
  "skarmory-mega": "sprites/custom/mega/skarmory-mega.gif",
  "victreebel-mega": "sprites/custom/mega/victreebel-mega.gif",
  "tatsugiri-droopy-mega": "sprites/custom/mega/tatsugiri-droopy-mega.gif",
  "tatsugiri-stretchy-mega": "sprites/custom/mega/tatsugiri-stretchy-mega.gif",
  "raichu-megax": "sprites/custom/mega/raichu-megax.gif",
  "raichu-megay": "sprites/custom/mega/raichu-megay.gif",
  "absol-megaz": "sprites/custom/mega/absol-megaz.gif",
  "garchomp-megaz": "sprites/custom/mega/garchomp-megaz.gif",
  "lucario-megaz": "sprites/custom/mega/lucario-megaz.gif",
  "chimecho-mega": "sprites/custom/mega/chimecho-mega.gif",
  "staraptor-mega": "sprites/custom/mega/staraptor-mega.gif",
  "golurk-mega": "sprites/custom/mega/golurk-mega.gif",
  "meowstic-mega": "sprites/custom/mega/meowstic-mega.gif",
  "crabominable-mega": "sprites/custom/mega/crabominable-mega.gif",
  "golisopod-mega": "sprites/custom/mega/golisopod-mega.gif",
  "scovillain-mega": "sprites/custom/mega/scovillain-mega.gif",
  "glimmora-mega": "sprites/custom/mega/glimmora-mega.gif",
  "tatsugiri-mega": "sprites/custom/mega/tatsugiri-mega.gif",
  "baxcalibur-mega": "sprites/custom/mega/baxcalibur-mega.gif",
  "heatran-mega": "sprites/custom/mega/heatran-mega.gif",
  "darkrai-mega": "sprites/custom/mega/darkrai-mega.gif",
  "magearna-mega": "sprites/custom/mega/magearna-mega.gif",
  "zeraora-mega": "sprites/custom/mega/zeraora-mega.gif",
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
  isShiny?: boolean;
};

// Convert an in-app Mon (which has level-scaled cached stats) to the wire format
// the battle engine expects (raw species base stats + IVs/EVs).
function toShippableMon(m: Mon) {
  const tpl = ALL_POKEMON.find((p) => p.id === m.id);
  const formTpl = !tpl ? POKEMON_FORMS.find((f) => f.id === m.id) : null;
  const base = tpl ?? formTpl;
  return {
    id: m.id, name: m.name, level: m.level,
    type1: (base?.type1 ?? m.type1), type2: (base?.type2 ?? m.type2 ?? null),
    sprite: base?.sprite ?? m.sprite,
    hp: base?.hp ?? m.hp, atk: base?.atk ?? m.atk, def: base?.def ?? m.def,
    spa: base?.spa ?? m.spa, spd: (base as any)?.spd ?? (m as any).spd ?? m.spa, spe: base?.spe ?? m.spe,
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

// Standard Gen 3+ stat formula. Used to seed every Mon's cached stat fields
// (atk/def/spa/spd/spe) so they reflect the species base + IVs + EVs + level +
// nature, not just a level-scaled base. The battle engine uses the same formula
// internally; this keeps in-app displays consistent.
function calcAppStat(
  base: number,
  iv: number,
  ev: number,
  level: number,
  nature: string | undefined,
  stat: "atk" | "def" | "spa" | "spd" | "spe",
): number {
  const raw = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
  return Math.max(1, Math.floor(raw * natureMult(nature, stat)));
}
function calcAppMaxHp(base: number, iv: number, ev: number, level: number): number {
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
}

// Refresh every cached stat on a Mon from its template + ivs/evs/level/nature.
// Preserves currentHp ratio when maxHp shifts.
function refreshMonStats(m: Mon, tpl?: PokemonTemplate): Mon {
  const t = tpl ?? ALL_POKEMON.find((p) => p.id === m.id);
  if (!t) return m;
  const lv = m.level;
  const nat = m.nature;
  const newMax = calcAppMaxHp(t.hp, m.ivHp ?? 0, m.evHp ?? 0, lv);
  const ratio = m.maxHp > 0 ? Math.min(1, m.currentHp / m.maxHp) : 1;
  return {
    ...m,
    atk: calcAppStat(t.atk, m.ivAtk ?? 0, m.evAtk ?? 0, lv, nat, "atk"),
    def: calcAppStat(t.def, m.ivDef ?? 0, m.evDef ?? 0, lv, nat, "def"),
    spa: calcAppStat(t.spa, m.ivSpa ?? 0, m.evSpa ?? 0, lv, nat, "spa"),
    spd: calcAppStat(t.spd, m.ivSpd ?? 0, m.evSpd ?? 0, lv, nat, "spd"),
    spe: calcAppStat(t.spe, m.ivSpe ?? 0, m.evSpe ?? 0, lv, nat, "spe"),
    maxHp: newMax,
    currentHp: Math.max(1, Math.round(newMax * ratio)),
  };
}

function makeMon(template: PokemonTemplate, level: number, origin: Mon["origin"] = "wild"): Mon {
  const ivs = generateIvs();
  // Strip the bulky learnset off each Mon instance and pick moves the species
  // could ACTUALLY know at this level (fixes Bulbasaur-knows-Solar-Beam bug).
  const { learn: _learn, moves: _ignoreMoves, ...rest } = template;
  const moves = movesForLevel(template, level);
  const nature = randomNature();
  // Standard Gen 3+ stat math: ((2*B + IV + floor(EV/4)) * L) / 100 + 5)*nature.
  const evHp = 0, evAtk = 0, evDef = 0, evSpa = 0, evSpd = 0, evSpe = 0;
  const maxHp = calcAppMaxHp(template.hp, ivs.ivHp, evHp, level);
  return {
    ...rest,
    learn: [],
    moves,
    uid: makeUid(),
    level,
    maxHp,
    currentHp: maxHp,
    atk: calcAppStat(template.atk, ivs.ivAtk, evAtk, level, nature, "atk"),
    def: calcAppStat(template.def, ivs.ivDef, evDef, level, nature, "def"),
    spa: calcAppStat(template.spa, ivs.ivSpa, evSpa, level, nature, "spa"),
    spd: calcAppStat(template.spd, ivs.ivSpd, evSpd, level, nature, "spd"),
    spe: calcAppStat(template.spe, ivs.ivSpe, evSpe, level, nature, "spe"),
    exp: 0,
    expNeeded: Math.floor(level * level * 1.2),
    status: null,
    ...ivs,
    evHp, evAtk, evDef, evSpa, evSpd, evSpe,
    nature,
    caughtAt: Date.now(),
    origin,
    isShiny: Math.random() < 1 / 4096,
  };
}

// Build a Mon from a FormEntry (no learnset — uses the form's fixed move list).
function makeMonFromForm(form: FormEntry, level: number, origin: Mon["origin"] = "wild"): Mon {
  const ivs = generateIvs();
  const nature = randomNature();
  const ev = 0;
  const maxHp = calcAppMaxHp(form.hp, ivs.ivHp, ev, level);
  return {
    id: form.id,
    name: form.name,
    sprite: form.sprite,
    type1: form.type1,
    type2: form.type2,
    hp: form.hp,
    gen: form.gen,
    learn: [],
    moves: form.moves.slice(0, 4),
    uid: makeUid(),
    level,
    maxHp,
    currentHp: maxHp,
    atk: calcAppStat(form.atk, ivs.ivAtk, ev, level, nature, "atk"),
    def: calcAppStat(form.def, ivs.ivDef, ev, level, nature, "def"),
    spa: calcAppStat(form.spa, ivs.ivSpa, ev, level, nature, "spa"),
    spd: calcAppStat(form.spd, ivs.ivSpd, ev, level, nature, "spd"),
    spe: calcAppStat(form.spe, ivs.ivSpe, ev, level, nature, "spe"),
    exp: 0,
    expNeeded: Math.floor(level * level * 1.2),
    status: null,
    ...ivs,
    evHp: 0, evAtk: 0, evDef: 0, evSpa: 0, evSpd: 0, evSpe: 0,
    nature,
    caughtAt: Date.now(),
    origin,
    isShiny: Math.random() < 1 / 4096,
  };
}

function getCP(m: Mon): number {
  const a = (m.atk + (m.ivAtk ?? 0));
  const d = Math.sqrt(m.def + (m.ivDef ?? 0));
  const h = Math.sqrt(m.maxHp + (m.ivHp ?? 0));
  return Math.max(10, Math.floor((a * d * h * (m.level / 50)) / 10) * 10);
}
function ivPercent(m: Mon): number {
  // Average of all 6 IVs out of the theoretical maximum (31 × 6 = 186).
  // 186 IV total → 100%, 0 IV total → 0%.
  const total =
    (m.ivHp ?? 0) + (m.ivAtk ?? 0) + (m.ivDef ?? 0) +
    (m.ivSpa ?? 0) + (m.ivSpd ?? 0) + (m.ivSpe ?? 0);
  return Math.min(100, Math.round((total / 186) * 100));
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

// Non-mega alternate forms that can appear in the wild, keyed by gen.
const FORM_POOLS: Record<number, FormEntry[]> = {};
for (const r of REGIONS) {
  FORM_POOLS[r.gen] = POKEMON_FORMS.filter(
    (f) => f.gen === r.gen && f.category !== "mega" && f.category !== "gmax"
  );
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
type Battle = { wild: Mon; pMon: Mon; phase: string; turnCount: number; canCatch: boolean; ballsThrown: number; selectedBall: string; fleeThreshold: number; hasMegaEvolved?: boolean };
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

// Migration: previous versions stored Mon stats from a broken `base*level/50+5`
// formula and tracked player EXP per-tier (subtracted on level-up). Normalize
// both on load so the new Trainer Rank system + correct stat formula reflect
// what the player has earned without invalidating their save.
function migrateMonsForRefresh(mons: Mon[] | undefined): Mon[] {
  if (!mons || mons.length === 0) return [];
  return mons.map((m) => {
    const tpl = ALL_POKEMON.find((p) => p.id === m.id);
    if (!tpl) return m;
    return refreshMonStats(m, tpl);
  });
}

// Bootstrap player.exp into cumulative form for the new rank table when the
// save file predates it. We approximate by treating "level" (the legacy
// trainer level) as a milestone the player already crossed and using the new
// table to pick the lowest matching milestone. New saves are unaffected.
function migratePlayerExp(p: Player): Player {
  if (!p) return p;
  const safeExp = Math.max(0, Math.floor(p.exp ?? 0));
  // If their per-tier exp already exceeds Rank 2's milestone OR they're past
  // Rank 1, treat the existing value as "close enough" and just keep it.
  // Otherwise leave at 0. This is intentionally conservative — the only
  // real cost is needing to re-earn EXP up to the next visible milestone.
  return { ...p, exp: safeExp, expNeeded: p.expNeeded ?? 100 };
}

export default function App() {
  const initial = typeof window !== "undefined" ? loadSave() : null;
  const [splashDone, setSplashDone] = useState(false);
  const [screen, setScreen] = useState<string>(initial ? (initial.screen === "battle" || initial.screen === "hunt" || initial.screen === "title" ? "world" : (initial.screen === "nameInput" || initial.screen === "starter") ? "story" : initial.screen) : "story");
  const [player, setPlayer] = useState<Player>(
    initial?.player ? migratePlayerExp(initial.player) : {
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
    }
  );
  const [teams, setTeams] = useState<TeamGroup[]>(() => {
    if (initial?.teams && initial.teams.length > 0) {
      return initial.teams.map((t) => ({ ...t, mons: migrateMonsForRefresh(t.mons) }));
    }
    const legacy = migrateMonsForRefresh(initial?.team ?? []);
    return [{ id: `t-${Date.now()}`, name: "Main", mons: legacy }];
  });
  const [activeTeamIdx, setActiveTeamIdx] = useState<number>(initial?.activeTeamIdx ?? 0);
  const [box, setBox] = useState<Mon[]>(() => migrateMonsForRefresh(initial?.box ?? []));
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
  // Marketplace state — Global Listings, User Listings, and the seller modal.
  type MarketTab = "global" | "user" | "items" | "stardust";
  const [marketTab, setMarketTab] = useState<MarketTab>("global");
  const [globalMarket, setGlobalMarket] = useState<GlobalMarketItem[]>([]);
  const [userListings, setUserListings] = useState<UserListing[]>([]);
  const [myListingIds, setMyListingIds] = useState<number[]>([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [marketBusyId, setMarketBusyId] = useState<string | null>(null);
  const [sellModal, setSellModal] = useState<{ uid: string; price: string; submitting: boolean } | null>(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [globalSort, setGlobalSort] = useState<"price" | "iv" | "nature">("price");
  const [globalView, setGlobalView] = useState<"grid" | "list">("grid");
  const [userSearch, setUserSearch] = useState("");
  const [userSort, setUserSort] = useState<"price" | "iv" | "nature">("price");
  const [userView, setUserView] = useState<"grid" | "list">("grid");
  const [buyQtyModal, setBuyQtyModal] = useState<{ name: string; price: number; isStardust: boolean; itemData: { name: string; price: number; info: string } } | null>(null);
  const [buyQty, setBuyQty] = useState(1);
  const [marketDetailMon, setMarketDetailMon] = useState<{ type: "global"; item: GlobalMarketItem } | { type: "user"; listing: UserListing } | null>(null);
  const [menuPage, setMenuPage] = useState(0);
  const [bagCat, setBagCat] = useState<string>("balls");
  const [scoutedWild, setScoutedWild] = useState<Mon | null>(null);
  const [moveAnim, setMoveAnim] = useState<{ target: "enemy" | "player"; type: string; key: number } | null>(null);
  // BGM mute state. Persisted to a dedicated localStorage key so it survives
  // page refreshes (and even brand-new sessions before any save data exists).
  const [muted, setMuted] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem("hexamon:bgmMuted");
      if (v != null) return v === "1";
    } catch { /* ignore */ }
    return initial?.muted ?? false;
  });
  useEffect(() => {
    try { localStorage.setItem("hexamon:bgmMuted", muted ? "1" : "0"); } catch { /* ignore */ }
    // Also forward to the audio engine so refreshing into a muted state
    // immediately silences any auto-played BGM/SFX.
    sfx.setMuted(muted);
  }, [muted]);
  // Local friends list. Stored in its own localStorage key (independent of the
  // main save) so adding/removing friends survives Reset Save and is shared
  // across save slots if the player ever has multiple.
  const [friends, setFriends] = useState<Friend[]>(() => loadFriends());
  useEffect(() => { saveFriends(friends); }, [friends]);

  // Notifications
  type GameNotification = { id: number; text: string; read: boolean; time: string };
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<GameNotification[]>([]);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  // ── Social state ─────────────────────────────────────────────────────────
  const [mailItems, setMailItems] = useState<SocialMail[]>([]);
  const [mailLoading, setMailLoading] = useState(false);
  const [selectedMail, setSelectedMail] = useState<SocialMail | null>(null);
  const [mailMsg, setMailMsg] = useState<{text:string;ok:boolean}|null>(null);
  const [transferInput, setTransferInput] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [transferMsg, setTransferMsg] = useState<{text:string;ok:boolean}|null>(null);
  const [transferLoading, setTransferLoading] = useState(false);
  const [pendingTransfers, setPendingTransfers] = useState<PendingTransfer[]>([]);
  const [transferSent, setTransferSent] = useState<PendingTransfer[]>([]);
  const [tradeTargetId, setTradeTargetId] = useState("");
  const [tradeMyMon, setTradeMyMon] = useState<Mon | null>(null);
  const [tradeMsg, setTradeMsg] = useState<{text:string;ok:boolean}|null>(null);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [pendingTrades, setPendingTrades] = useState<{incoming:TradeProp[];outgoing:TradeProp[];completed:TradeProp[]}>({incoming:[],outgoing:[],completed:[]});
  const [tradeSource, setTradeSource] = useState<"team"|"box">("team");
  const [tradeMode, setTradeMode] = useState<"swap"|"sell">("swap");
  const [tradePrice, setTradePrice] = useState("");
  const [tradePreviewTrade, setTradePreviewTrade] = useState<TradeProp | null>(null);
  const [redeemStoreInput, setRedeemStoreInput] = useState("");
  const [redeemStoreMsg, setRedeemStoreMsg] = useState<{text:string;ok:boolean}|null>(null);
  const [redeemStoreLoading, setRedeemStoreLoading] = useState(false);
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [adminKeyInput, setAdminKeyInput] = useState("");
  const [adminMsg, setAdminMsg] = useState<{text:string;ok:boolean}|null>(null);
  const [adminTab, setAdminTab] = useState<"spectate"|"ban"|"announce"|"drop"|"codes"|"reset"|"transfers"|"trades">("spectate");
  const [adminTargetId, setAdminTargetId] = useState("");
  const [adminTargetInfo, setAdminTargetInfo] = useState<any>(null);
  const [adminResetTarget, setAdminResetTarget] = useState("");
  const [adminResetResult, setAdminResetResult] = useState<string|null>(null);
  const [adminHistTarget, setAdminHistTarget] = useState("");
  const [adminHistTransfers, setAdminHistTransfers] = useState<any[]>([]);
  const [adminHistTrades, setAdminHistTrades] = useState<any[]>([]);
  const [adminAnnounceSubj, setAdminAnnounceSubj] = useState("");
  const [adminAnnounceBody, setAdminAnnounceBody] = useState("");
  const [adminAnnounceTarget, setAdminAnnounceTarget] = useState("");
  const [adminDropMoney, setAdminDropMoney] = useState("");
  const [adminDropItem, setAdminDropItem] = useState("");
  const [adminDropQty, setAdminDropQty] = useState("");
  const [adminDropMsg2, setAdminDropMsg2] = useState("");
  const [adminDropTarget, setAdminDropTarget] = useState("");
  const [adminCodeKey, setAdminCodeKey] = useState("");
  const [adminCodeMoney, setAdminCodeMoney] = useState("");
  const [adminCodeItem, setAdminCodeItem] = useState("");
  const [adminCodeQty, setAdminCodeQty] = useState("");
  const [adminCodeUses, setAdminCodeUses] = useState("1");
  const [adminCodesList, setAdminCodesList] = useState<any[]>([]);
  const [banReason, setBanReason] = useState("");
  const [isBanned, setIsBanned] = useState(false);
  const [banReasonText, setBanReasonText] = useState("");

  const addItemToInventory = useCallback((name: string, qty: number) => {
    setInventory(prev => {
      const idx = prev.findIndex(i => i.name === name);
      if (idx >= 0) return prev.map((i, j) => j === idx ? {...i, qty: i.qty + qty} : i);
      return [...prev, {name, qty}];
    });
  }, []);

  const loadMails = useCallback(async () => {
    setMailLoading(true);
    try { const items = await fetchMails(String(player.id)); setMailItems(items); } catch { /* ignore */ } finally { setMailLoading(false); }
  }, [player.id]);

  const loadTransfers = useCallback(async () => {
    try {
      const r = await fetchPendingTransfers(String(player.id));
      setPendingTransfers(r.pending ?? []);
      setTransferSent(r.sent ?? []);
    } catch { /* ignore */ }
  }, [player.id]);

  const claimAllTransfers = useCallback(async () => {
    try {
      const r = await claimTransfers(String(player.id));
      if (r.total > 0) {
        setPlayer(p => ({ ...p, money: p.money + r.total }));
        setNotifications(prev => [{ id: Date.now(), text: `💸 Claimed ₽${r.total.toLocaleString()} from transfers!`, read: false, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 19)]);
      }
      await loadTransfers();
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.id, loadTransfers]);

  const loadTrades = useCallback(async () => {
    try { const r = await fetchPendingTrades(String(player.id)); setPendingTrades(r); } catch { /* ignore */ }
  }, [player.id]);

  // Marketplace data loader — runs whenever the store screen opens. Also
  // auto-claims any pending earnings the player accrued while offline.
  const refreshMarket = useCallback(async () => {
    setMarketLoading(true);
    setMarketError(null);
    try {
      const [g, l, e] = await Promise.all([
        fetchGlobalMarket(player.id),
        fetchUserListings(player.id),
        fetchPendingEarnings(player.id),
      ]);
      setGlobalMarket(g.items);
      setUserListings(l.listings);
      setMyListingIds(l.mine);
      if (e.total > 0) {
        try {
          const claim = await claimPendingEarnings(player.id);
          if (claim.total > 0) {
            setPlayer((pl) => ({ ...pl, money: pl.money + claim.total }));
            addLog(`Claimed ₽${claim.total.toLocaleString()} from market sales while you were away!`, "#4ade80");
          }
        } catch {
          /* ignore claim failure — earnings stay pending */
        }
      }
    } catch (err) {
      setMarketError(err instanceof Error ? err.message : "Couldn't reach the marketplace.");
    } finally {
      setMarketLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.id]);

  useEffect(() => {
    if (screen !== "store") return;
    refreshMarket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // Register player with social system and check ban status on mount
  useEffect(() => {
    registerPlayer({ playerId: String(player.id), name: player.name, sprite: player.sprite, hometown: player.hometown });
    checkBanned(String(player.id)).then(r => { if (r.banned) { setIsBanned(true); setBanReasonText(r.reason || ""); } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.id]);
  const [friendInput, setFriendInput] = useState<string>("");
  const [friendMsg, setFriendMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [friendSearchResult, setFriendSearchResult] = useState<{ id: number; name: string; hometown: string; sprite: string; rank: number } | null>(null);
  const [friendProfileModal, setFriendProfileModal] = useState<{ id: number; name: string; hometown: string; sprite: string; rank: number; addedAt: number } | null>(null);

  const [caught, setCaught] = useState<Set<number>>(new Set(initial?.caught ?? []));
  const [seen, setSeen] = useState<Set<number>>(new Set(initial?.seen ?? initial?.caught ?? []));
  const [candies, setCandies] = useState<Record<number, number>>(initial?.candies ?? {});
  const [buddyIdx, setBuddyIdx] = useState<number>(initial?.buddyIdx ?? -1);
  const [redeemedCodes, setRedeemedCodes] = useState<string[]>(initial?.redeemedCodes ?? []);
  const [redeemInput, setRedeemInput] = useState<string>("");
  const [redeemMsg, setRedeemMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [lastSpinTs, setLastSpinTs] = useState<number>(initial?.lastSpinTs ?? 0);
  // Global daily Safari limit: ONE run per day across all regions. Older saves
  // may carry a per-region map (`lastSafariDayByRegion`); migrate by treating
  // it as "used today" if any region's date matches today.
  const [lastSafariDay, setLastSafariDay] = useState<string>(() => {
    if (initial?.lastSafariDay) return initial.lastSafariDay;
    const today = todayStr();
    const map = initial?.lastSafariDayByRegion ?? {};
    return Object.values(map).some((d) => d === today) ? today : "";
  });
  const [safariRegion, setSafariRegion] = useState<number>(initial?.safariRegion ?? 0);
  const [showSafariRegionPicker, setShowSafariRegionPicker] = useState(false);
  // When the daily limit is hit and the player owns a Safari Pass, clicking
  // "Use Safari Pass" flips this on so the region list re-appears (the pass
  // is consumed when they pick a region inside `startSafariInRegion`).
  const [safariBypassWithPass, setSafariBypassWithPass] = useState(false);
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
  const [dexMode, setDexMode] = useState<"base"|"forms">("base");
  const [dexFormCat, setDexFormCat] = useState<"all"|FormCategory>("all");
  const [dexShiny, setDexShiny] = useState(false);
  const [dexFormDetail, setDexFormDetail] = useState<FormEntry|null>(null);
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
    kind: "throw" | "caught" | "fled" | "broke";
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
        lastSafariDay, safariRegion, lastSpinDay, battleBoxHistory,
        badges, e4Cleared, e4Streak,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch { /* ignore quota errors */ }
  }, [screen, player, teams, activeTeamIdx, box, inventory, caught, seen, muted, candies, buddyIdx, redeemedCodes, lastSpinTs, catchStreak, lastStreakDay, safariBalls, safariEnc, safariCounter, safariNextLegend, safariCaught, lastSafariDay, safariRegion, lastSpinDay, battleBoxHistory, badges, e4Cleared, e4Streak]);

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
    setPlayer((p) => {
      const beforeRank = rankFromExp(p.exp);
      const newExp = (p.exp ?? 0) + xpBonus;
      const afterRank = rankFromExp(newExp);
      if (afterRank > beforeRank) {
        for (let r = beforeRank + 1; r <= afterRank; r++) {
          addLog(`🆙 You reached Trainer Rank ${r}!`, "#FF9800");
        }
      }
      const prog = rankProgress(newExp);
      return {
        ...p,
        exp: newExp,
        level: afterRank,
        expNeeded: prog.isMax ? Math.max(1, prog.totalExp) : prog.needed,
      };
    });
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
        // Recompute every cached stat (HP/Atk/Def/SpA/SpD/Spe) using the
        // standard Gen 3+ formula now that EVs have changed.
        g.mons[idx] = refreshMonStats(m);
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
        // Recompute every cached stat using the standard Gen 3+ formula.
        g.mons[idx] = refreshMonStats(m);
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
    sfx.itemPickup();
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
        const tplFinal = ALL_POKEMON.find((p) => p.id === next.id);
        if (speciesChanged && tplFinal) {
          next.name = tplFinal.name;
          next.sprite = tplFinal.sprite;
          next.type1 = tplFinal.type1;
          next.type2 = tplFinal.type2;
          next.hp = tplFinal.hp;
          next.canEvolve = tplFinal.canEvolve;
          next.evolveAt = tplFinal.evolveAt;
        }
        if (tplFinal) {
          // Recompute every stat with the canonical Gen 3+ formula. We then
          // override currentHp to "full" when the level or species changed.
          next = refreshMonStats(next, tplFinal);
          if (next.level !== m.level || speciesChanged) next.currentHp = next.maxHp;
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
    // Trainer battle audio: opponent's lead Pokémon cry + trainer theme.
    const oppLead = oppBattleMons[0];
    if (oppLead) sfx.playCry(oppLead.speciesId);
    sfx.playMusic(opts.isE4 ? "battle_kanto_champion" : "battle_trainer");
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
      sfx.trainerVictory();
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
  const pvpConnect = useCallback((
    isHost: boolean,
    code: string | undefined,
    mode: "ranked" | "unranked" | "random",
    mySettings: typeof bbSettings,
    buildTeam: (settings: typeof bbSettings) => Mon[],
  ) => {
    try { wsRef.current?.close(); } catch { /* ignore */ }
    const wsUrl = `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/api/ws/battle`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    // Settings actually used to build my team.  For host this stays as the
    // local settings; for joiner it gets overwritten with host's canonical
    // settings the moment we receive the "joined" event.
    let activeSettings: typeof bbSettings = mySettings;
    let myTeamSent = false;
    const sendTeam = () => {
      if (myTeamSent) return;
      const myTeamMons = buildTeam(activeSettings);
      if (!myTeamMons || myTeamMons.length === 0) {
        addLog("You need at least 1 Pokémon to battle!", "#F44336");
        try { ws.close(); } catch { /* ignore */ }
        setBbRoom(null); setBbMode(null);
        return;
      }
      myTeamSent = true;
      ws.send(JSON.stringify({ type: "team", playerId: myPlayerIdRef.current, team: myTeamMons.map(toShippableMon) }));
    };
    ws.onopen = () => {
      if (isHost) {
        // Host ships the full settings bundle so the server can relay it
        // to the joiner — guarantees both sides battle by the same rules.
        ws.send(JSON.stringify({
          type: "host",
          playerId: myPlayerIdRef.current,
          playerName: player.name || "Trainer",
          turnTimerSec: mySettings.turnTimer,
          settings: mySettings,
        }));
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
          // Mirror the host's canonical battle settings so this joiner plays
          // by exactly the same rules as the room creator.
          const hostSettings = msg["settings"] as typeof bbSettings | null | undefined;
          if (hostSettings && typeof hostSettings === "object") {
            activeSettings = { ...activeSettings, ...hostSettings };
            setBbSettings((s) => ({ ...s, ...hostSettings }));
            addLog("Synced battle settings from host.", "#60a5fa");
          }
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

  // ----- Music: title screen and overworld town BGM. Battle screens manage
  // their own music explicitly (cry → battle BGM, then stopMusic on exit).
  useEffect(() => {
    if (screen === "story") sfx.playMusic("title");
    else if (screen === "world") sfx.playMusic("town");
  }, [screen]);

  // ----- Low-HP alarm. Plays a single beep when the active mon's HP first
  // crosses below 20 % during a wild or league battle. Resets on switch / new
  // battle so the same mon can re-trigger after healing above the threshold.
  const lowHpTriggeredRef = useRef<string | null>(null);
  useEffect(() => {
    let cur: { uid: string; hp: number; max: number } | null = null;
    if (battle?.pMon) {
      const m = battle.pMon;
      cur = { uid: `wild:${m.id}:${m.level}`, hp: m.currentHp, max: m.maxHp };
    } else if (leagueBattle?.state) {
      const lm = leagueBattle.state.teams[0].mons[leagueBattle.state.teams[0].activeIdx];
      if (lm) cur = { uid: `lg:${lm.speciesId}:${lm.level}`, hp: lm.currentHp, max: calcMaxHp(lm) };
    }
    if (!cur) { lowHpTriggeredRef.current = null; return; }
    if (lowHpTriggeredRef.current !== cur.uid) {
      lowHpTriggeredRef.current = cur.uid;
      return; // first observation of this mon, don't fire
    }
    const ratio = cur.hp / Math.max(1, cur.max);
    if (ratio > 0 && ratio < 0.2) {
      const key = cur.uid + ":low";
      if (lowHpTriggeredRef.current !== key) {
        lowHpTriggeredRef.current = key;
        sfx.lowHp();
      }
    } else if (ratio >= 0.25) {
      // Re-arm once the mon recovers above 25 %.
      lowHpTriggeredRef.current = cur.uid;
    }
  }, [battle?.pMon?.currentHp, battle?.pMon?.id, battle?.pMon?.level, leagueBattle?.state]);

  // ----- League battle log watcher: scan new entries for engine-emitted
  // strings and play the matching SFX (super-effective, not-very-effective,
  // critical hit, stat up, stat down).
  const lastLeagueLogLenRef = useRef(0);
  useEffect(() => {
    const log = leagueBattle?.state.log;
    if (!log) { lastLeagueLogLenRef.current = 0; return; }
    const start = lastLeagueLogLenRef.current;
    lastLeagueLogLenRef.current = log.length;
    if (log.length <= start) return;
    for (let i = start; i < log.length; i++) {
      const t = log[i]?.text ?? "";
      if (/critical hit/i.test(t)) setTimeout(() => sfx.crit(), 60);
      else if (/super effective/i.test(t)) setTimeout(() => sfx.superEffective(), 100);
      else if (/not very effective/i.test(t)) setTimeout(() => sfx.notVeryEffective(), 100);
      else if (/\brose\.$/.test(t)) sfx.statUp();
      else if (/\bfell\.$/.test(t)) sfx.statDown();
    }
  }, [leagueBattle?.state.log.length, leagueBattle?.state.log]);
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

  // Map: speciesId -> level at which its PRE-evolution evolves into it.
  // Computed once. Used so that, say, Ivysaur only spawns at lvl 16+ (Bulbasaur's evolveAt),
  // and Venusaur only spawns at lvl 32+ (Ivysaur's evolveAt).
  const PRE_EVOLVE_AT = useMemo(() => {
    const m = new Map<number, number>();
    for (const p of ALL_POKEMON) {
      if (p.canEvolve && p.evolveAt) {
        m.set(p.canEvolve, p.evolveAt);
      }
    }
    return m;
  }, []);

  // Compute the wild level range for a given species:
  //   - min = pre-evolution's evolveAt (so the species would already be evolved by then)
  //          or 1 if it's a base form WITH a future evolution (e.g. Bulbasaur 1-16)
  //          or 32 if it has NO pre-evolution AND NO future evolution (legendaries / standalone mons)
  //   - max = its own evolveAt - 1 (so it doesn't appear at a level where it would have evolved)
  //          or 79 if it has no further evolution.
  function levelRangeFor(template: PokemonTemplate): { min: number; max: number } {
    const preLv = PRE_EVOLVE_AT.get(template.id);
    const ownEvo = template.evolveAt;
    let min: number;
    if (preLv !== undefined) {
      min = preLv;
    } else if (ownEvo !== undefined) {
      min = 1; // base form with a future evolution
    } else {
      min = 32; // standalone / legendary species
    }
    const max = ownEvo !== undefined ? Math.max(min, ownEvo) : 79;
    return { min, max };
  }

  function pickWildLevel(template: PokemonTemplate): number {
    const { min, max } = levelRangeFor(template);
    if (max <= min) return min;
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function spawnWild(forceLegendary = false): Mon | null {
    const region = REGIONS[player.macroRegion] ?? REGIONS[0];
    const pool = REGION_POOLS[region.gen] ?? [];
    const formPool = FORM_POOLS[region.gen] ?? [];
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
      // 18% chance to spawn an alternate form instead of a base species.
      if (formPool.length > 0 && Math.random() < 0.18) {
        const form = formPool[Math.floor(Math.random() * formPool.length)];
        const lv = region.minLv + Math.floor(Math.random() * (region.maxLv - region.minLv + 1));
        setHuntCount((c) => c + 1);
        return makeMonFromForm(form, lv, "wild");
      }
      if (pool.length === 0) { addLog("No wild Pokémon here yet!", "#F44336"); return null; }
      id = pool[Math.floor(Math.random() * pool.length)];
      setHuntCount((c) => c + 1);
    }
    const template = getPokemon(id);
    // Wild Pokémon levels are now bounded by their evolution stage:
    //   Bulbasaur 1–16, Ivysaur 16–32, Venusaur 32–79, Mewtwo (no pre/post) 32–79.
    const lv = pickWildLevel(template);
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
    const formPool = FORM_POOLS[region.gen] ?? [];
    const legends = REGION_LEGENDS[region.gen] ?? [];
    const isLegend = forceLegendary && legends.length > 0;
    if (isLegend) {
      const id = legends[Math.floor(Math.random() * legends.length)];
      if (!id) return null;
      const tpl = getPokemon(id);
      return makeMon(tpl, pickWildLevel(tpl));
    }
    // 18% chance to spawn an alternate form in safari.
    if (formPool.length > 0 && Math.random() < 0.18) {
      const form = formPool[Math.floor(Math.random() * formPool.length)];
      const lv = region.minLv + Math.floor(Math.random() * (region.maxLv - region.minLv + 1));
      return makeMonFromForm(form, lv, "safari");
    }
    const id = pool[Math.floor(Math.random() * pool.length)];
    if (!id) return null;
    // Levels are now bounded by the species' evolution stage (see levelRangeFor).
    const tpl = getPokemon(id);
    return makeMon(tpl, pickWildLevel(tpl));
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
    // Global daily limit: one Safari run per day, no matter which region.
    const usedToday = lastSafariDay === today;
    const hasPass = inventoryQty("Safari Pass") > 0;
    if (usedToday && !hasPass) {
      addLog("You've already done your Safari run today. Use a Safari Pass or come back tomorrow!", "#F44336");
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
    sfx.itemPickup();
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
    const formPool = FORM_POOLS[region.gen] ?? [];
    const legends = REGION_LEGENDS[region.gen] ?? [];
    const useLegend = isLegend && legends.length > 0;
    let sm: Mon | null = null;
    if (useLegend) {
      const id = legends[Math.floor(Math.random() * legends.length)];
      if (id) { const tpl = getPokemon(id); sm = makeMon(tpl, pickWildLevel(tpl)); }
    } else if (formPool.length > 0 && Math.random() < 0.18) {
      const form = formPool[Math.floor(Math.random() * formPool.length)];
      const lv = region.minLv + Math.floor(Math.random() * (region.maxLv - region.minLv + 1));
      sm = makeMonFromForm(form, lv, "safari");
    } else {
      const id = pool[Math.floor(Math.random() * pool.length)];
      if (id) { const tpl = getPokemon(id); sm = makeMon(tpl, pickWildLevel(tpl)); }
    }
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
      setLastSafariDay(todayStr());
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
    sfx.ballThrow();
    const isLegend = ALL_LEGENDARY_IDS.has(safariEnc.id);

    // ---- Step 1: roll the catch ----
    const baseRate = isLegend ? 0.18 : 0.55;
    const lvPenalty = Math.max(0, (safariEnc.level - 20) * 0.01);
    const catchRate = Math.max(0.05, baseRate - lvPenalty);
    const caught = Math.random() < catchRate;

    // ---- Step 2: only if catch failed, roll the flee chance (~18 %) ----
    // Legendaries are slightly more skittish but still mostly stick around so
    // the player can keep throwing balls.
    const fleeRate = isLegend ? 0.25 : 0.18;
    const fled = !caught && Math.random() < fleeRate;
    // ---- Step 3: otherwise, the Pokémon "broke free" and stays put ----

    // Star animation: full 3-star sweep on a catch, partial on miss.
    const finalStars = caught ? 3 : 1 + Math.floor(Math.random() * 3);
    const encName = safariEnc.name;

    setSafariThrowAnim("throw");
    setSafariStatusMsg({ kind: "throw", text: "You Threw A Safari Ball!", stars: 0 });
    const starTimers: ReturnType<typeof setTimeout>[] = [];
    for (let s = 1; s <= finalStars; s++) {
      starTimers.push(setTimeout(() => {
        setSafariStatusMsg({ kind: "throw", text: "You Threw A Safari Ball!", stars: s });
      }, s * 500));
    }
    // Wobble starts once the first star appears.
    setTimeout(() => setSafariThrowAnim("wobble"), 500);

    // Resolve 700 ms after the last star so the player can read the count.
    const resolveDelay = finalStars * 500 + 700;
    setTimeout(() => {
      if (caught) {
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
        setTimeout(() => {
          setSafariThrowAnim(null);
          safariNext(ballsLeft);
        }, 1400);
      } else if (fled) {
        setSafariThrowAnim("burst");
        sfx.faint();
        setSafariStatusMsg({ kind: "fled", text: `Your Safari Failed And wild ${encName} Has fled.` });
        setTimeout(() => {
          setSafariThrowAnim(null);
          safariNext(ballsLeft);
        }, 1400);
      } else {
        // Broke free — keep the encounter alive so the player can try again.
        setSafariThrowAnim(null);
        sfx.catchFail();
        setSafariStatusMsg({ kind: "broke", text: `Argh! ${encName} broke free!` });
        // Out of balls? End the encounter the same way safariNext(0) would.
        if (ballsLeft <= 0) {
          setTimeout(() => safariNext(ballsLeft), 1400);
        }
      }
    }, resolveDelay);
    // (Star timers are fire-and-forget — encounter cleanup resets the status
    // message so any late ones become harmless no-ops.)
    void starTimers;
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
    setBattle({ wild: scoutedWild, pMon, phase: "choose", turnCount: 0, canCatch: true, ballsThrown: 0, selectedBall: "Poké Ball", fleeThreshold, hasMegaEvolved: false });
    setScoutedWild(null);
    setScreen("battle");
    // Wild encounter audio: opponent's cry, then loop the wild battle theme.
    sfx.playCry(scoutedWild.id);
    sfx.playMusic("battle_wild");
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
      // Type-effectiveness multiplier vs the wild's type(s).
      const wTypes = [wild.type1, wild.type2].filter(Boolean) as PType[];
      const eff = pwr > 0 ? typeMultiplier(moveTypeOf(move) as PType, wTypes) : 1;
      // Crit roll (1/24, vanilla rate).
      const isCrit = pwr > 0 && Math.random() < 1 / 24;
      const dmg = Math.floor(calcDmg(pMon.atk, wild.def, pwr) * eff * (isCrit ? 1.5 : 1));
      if (dmg > 0) {
        wild.currentHp = Math.max(0, wild.currentHp - dmg);
        setShakeE(true); setTimeout(() => setShakeE(false), 350);
        setTimeout(() => sfx.hit(), 250);
        if (isCrit) setTimeout(() => sfx.crit(), 320);
        if (eff > 1) setTimeout(() => sfx.superEffective(), 380);
        else if (eff > 0 && eff < 1) setTimeout(() => sfx.notVeryEffective(), 380);
        const tag = isCrit ? " 🎯CRIT" : "";
        const effTag = eff > 1 ? " (super effective!)" : eff === 0 ? " (no effect)" : eff < 1 ? " (not very effective…)" : "";
        logs.push([`⚔️ ${pMon.name} used ${move}! (${dmg} dmg${tag})${effTag}`, "#81D4FA"]);
      } else if (eff === 0) {
        logs.push([`✨ ${move} had no effect on ${wild.name}…`, "#aaa"]);
      } else {
        logs.push([`✨ ${pMon.name} used ${move}!`, "#aaa"]);
      }
    }

    if (wild.currentHp <= 0) {
      const expGain = Math.floor(wild.level * (wild.atk + wild.def) / 8);
      pMon.exp += expGain;
      const killReward = 40 + Math.floor(Math.random() * 51); // 40–90 ₽
      setPlayer((p) => ({ ...p, money: p.money + killReward }));
      logs.push([`⭐ Wild ${wild.name} fainted! +${expGain} EXP, +₽${killReward}`, "#F44336"]);
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
      const pTypes = [pMon.type1, pMon.type2].filter(Boolean) as PType[];
      const eEff = ePwr > 0 ? typeMultiplier(moveTypeOf(eMove) as PType, pTypes) : 1;
      const eCrit = ePwr > 0 && Math.random() < 1 / 24;
      const eDmg = Math.floor(calcDmg(wild.atk, pMon.def, ePwr) * eEff * (eCrit ? 1.5 : 1));
      if (eDmg > 0) {
        pMon.currentHp = Math.max(0, pMon.currentHp - eDmg);
        setShakeP(true); setTimeout(() => setShakeP(false), 350);
        setTimeout(() => sfx.hurt(), 950);
        if (eCrit) setTimeout(() => sfx.crit(), 1020);
        if (eEff > 1) setTimeout(() => sfx.superEffective(), 1080);
        else if (eEff > 0 && eEff < 1) setTimeout(() => sfx.notVeryEffective(), 1080);
        const tag = eCrit ? " 🎯CRIT" : "";
        const effTag = eEff > 1 ? " (super effective!)" : eEff === 0 ? " (no effect)" : eEff < 1 ? " (not very effective…)" : "";
        logs.push([`💢 ${wild.name} used ${eMove}! (${eDmg} dmg${tag})${effTag}`, "#FF7043"]);
      } else if (eEff === 0) {
        logs.push([`${eMove} had no effect on ${pMon.name}…`, "#aaa"]);
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
        sfx.heal(); addLog("Your team was fully healed!", "#4CAF50");
        sfx.stopMusic();
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
    sfx.playCry(next.id);
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

  function doMegaEvolve() {
    if (!battle || battle.hasMegaEvolved) return;
    const m = battle.pMon;
    const entry = Object.entries(STONE_TO_SPRITE).find(
      ([stone, spr]) => spr === m.sprite && inventory.some((it) => it.name === stone && it.qty > 0)
    );
    if (!entry) return;
    const [stone] = entry;
    const sd = MEGA_STONES[stone];
    if (!sd) return;
    const megaMon: Mon = {
      ...m,
      sprite: sd.megaSprite,
      name: `Mega ${m.name}`,
      type1: sd.type1,
      type2: sd.type2 ?? null,
      atk: calcAppStat(sd.atk, m.ivAtk ?? 0, m.evAtk ?? 0, m.level, m.nature, "atk"),
      def: calcAppStat(sd.def, m.ivDef ?? 0, m.evDef ?? 0, m.level, m.nature, "def"),
      spa: calcAppStat(sd.spa, m.ivSpa ?? 0, m.evSpa ?? 0, m.level, m.nature, "spa"),
      spd: calcAppStat(sd.spd, m.ivSpd ?? 0, m.evSpd ?? 0, m.level, m.nature, "spd"),
      spe: calcAppStat(sd.spe, m.ivSpe ?? 0, m.evSpe ?? 0, m.level, m.nature, "spe"),
      maxHp: calcAppMaxHp(sd.hp, m.ivHp ?? 0, m.evHp ?? 0, m.level),
      currentHp: m.currentHp,
    };
    addLog(`🌟 ${m.name} Mega Evolved into Mega ${m.name}!`, "#FF69B4");
    setBattle((prev) => prev ? { ...prev, pMon: megaMon, hasMegaEvolved: true } : prev);
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
        sfx.heal(); addLog("Your team was fully healed!", "#4CAF50");
        setTimeout(() => {
          setBallAnim(null);
          sfx.stopMusic();
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
              setTimeout(() => { sfx.stopMusic(); setBattle(null); setScreen("hunt"); }, 700);
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
      const beforeRank = rankFromExp(p.exp);
      // Cumulative EXP. The Trainer Rank (1..10) is derived from this via
      // EXP_MILESTONES; we never subtract from p.exp anymore.
      p.exp += playerExpGain;
      const afterRank = rankFromExp(p.exp);
      if (afterRank > beforeRank) {
        for (let r = beforeRank + 1; r <= afterRank; r++) {
          addLog(`🆙 You reached Trainer Rank ${r}!`, "#FF9800");
        }
        // Keep legacy `level` mirrored to rank for any UI that still reads it.
        p.level = afterRank;
      } else {
        // Make sure legacy level always reflects the current rank.
        if (p.level !== afterRank) p.level = afterRank;
      }
      // Mirror "expNeeded" so legacy bars (still using exp/expNeeded) at least
      // animate sensibly toward the next milestone.
      const prog = rankProgress(p.exp);
      p.expNeeded = prog.isMax ? Math.max(1, prog.totalExp) : prog.needed;
      return p;
    });

    setTeam((prev) => {
      const newTeam = prev.map((m) => m.id === mon.id ? mon : m);
      return newTeam.map((m) => ({ ...m, currentHp: m.maxHp, status: null }));
    });
    sfx.heal(); addLog("Your team was fully healed!", "#4CAF50");
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
        // Return to the hunt screen so the player can immediately keep hunting
        // in the same region instead of being kicked back to the world map.
        setScreen("hunt");
      }, 500);
    } else {
      // Return to the hunt screen after defeating a wild so the player can
      // press HUNT again and continue searching the same region.
      setScreen("hunt");
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
    .m-menu-btn { background: var(--m-card); border:2px solid var(--m-border); border-radius:14px; padding:13px 6px 11px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:7px; font-size:11px; font-weight:700; text-transform:uppercase; cursor:pointer; transition: background-color .2s, transform .15s; letter-spacing: 0.8px; color: var(--m-text); }
    .m-menu-btn i { font-size: 20px; }
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
    .m-pcard.sold { opacity: 0.4; cursor: not-allowed; }
    .m-pcard.sold .m-price { color: #fca5a5; }
    .m-soldout { position:absolute; top:8px; right:8px; background:#dc2626; color:#fff; padding:3px 8px; border-radius:6px; font-size:9px; font-weight:700; letter-spacing:1px; z-index:3; }
    .m-mine-tag { position:absolute; top:8px; left:8px; background: rgba(167,139,250,0.95); color:#1e1b4b; padding:3px 8px; border-radius:6px; font-size:9px; font-weight:700; letter-spacing:0.5px; z-index:3; }
    .m-seller { font-size:9px; color:#a78bfa; background: rgba(167,139,250,0.12); padding:2px 6px; border-radius:6px; max-width: 90%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .m-mkt-status { padding: 24px 16px; text-align:center; color: var(--m-muted); font-size:13px; }
    .m-mkt-empty { margin: 0 16px; padding: 28px 16px; text-align:center; color: var(--m-muted); font-size:13px; background: var(--m-card); border: 1px dashed var(--m-border); border-radius: 16px; }
    .m-earn-banner { margin: 0 16px 12px; padding: 11px 14px; background: linear-gradient(90deg, rgba(74,222,128,0.18), rgba(74,222,128,0.04)); border: 1px solid rgba(74,222,128,0.35); border-radius: 14px; color:#bbf7d0; font-size:12px; display:flex; gap:10px; align-items:center; }
    .m-mkt-refresh { background: var(--m-card); border:1px solid var(--m-border); color: var(--m-muted); border-radius: 16px; padding: 6px 12px; font-size: 11px; cursor: pointer; display:inline-flex; align-items:center; gap:6px; }
    .m-mkt-refresh:hover { color: var(--m-text); }
    .m-modal-back { position:fixed; inset:0; background: rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:1000; padding: 20px; }
    .m-modal { background: var(--m-card); border:1px solid var(--m-border); border-radius: 18px; padding: 22px; width: 100%; max-width: 380px; }
    .m-modal h3 { margin: 0 0 6px; font-size: 16px; font-weight: 600; color: var(--m-text); }
    .m-modal p { margin: 0 0 14px; color: var(--m-muted); font-size: 12px; }
    .m-modal input { width: 100%; box-sizing: border-box; background: var(--m-input); border: 1px solid var(--m-border); border-radius: 10px; padding: 10px 12px; color: var(--m-text); font-size: 14px; outline: none; font-family: inherit; }
    .m-modal input:focus { border-color: var(--m-blue); }
    .m-modal-row { display:flex; gap:10px; margin-top: 16px; }
    .m-btn-primary { flex:1; background: var(--m-bluebg); border:none; color:#fff; padding: 10px 0; border-radius: 10px; font-weight:600; font-size: 13px; cursor:pointer; }
    .m-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .m-btn-ghost { flex:1; background: transparent; border:1px solid var(--m-border); color: var(--m-text); padding: 10px 0; border-radius: 10px; font-weight:500; font-size: 13px; cursor:pointer; }
    .m-action-btn { background: var(--m-bluebg); color:#fff; border:none; padding: 6px 14px; border-radius: 12px; font-size: 11px; font-weight: 600; cursor: pointer; }
    .m-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .m-cancel-btn { background: rgba(220,38,38,0.18); color:#fca5a5; border:1px solid rgba(220,38,38,0.35); padding: 6px 14px; border-radius: 12px; font-size: 11px; font-weight: 600; cursor: pointer; }
    .m-cancel-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .m-card-actions { display:flex; gap:6px; margin-top: 4px; padding: 0 8px; }
    .m-mkt-error { margin: 0 16px 12px; padding: 10px 14px; background: rgba(220,38,38,0.12); border: 1px solid rgba(220,38,38,0.35); border-radius: 12px; color: #fca5a5; font-size: 12px; display:flex; gap:10px; align-items:center; justify-content:space-between; }

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
    root: { fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", background: "#09090b", minHeight: "100vh", display: "flex", justifyContent: "center" },
    wrap: { width: "100%", maxWidth: 460, minHeight: "100vh", background: "#09090b", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" },
    header: { background: "#0a0a0a", borderBottom: "1px solid #1f1f1f", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  };

  function typeTag(t: string | null) {
    if (!t) return null;
    return <span style={{ background: TYPE_COLORS[t] + "44", border: `1px solid ${TYPE_COLORS[t]}`, color: TYPE_COLORS[t], fontSize: 10, padding: "2px 5px", borderRadius: 3 }}>{t}</span>;
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

  function MonSprite({ sprite, size = 80, back = false, isShiny = false, className = "mon-float", style = {} }: { sprite: string; size?: number; back?: boolean; isShiny?: boolean; className?: string; style?: React.CSSProperties }) {
    const clean = sprite.toLowerCase().replace(/[^a-z0-9-]/g, "");
    const custom = CUSTOM_SPRITE_URL(clean);
    const customList = custom ? [custom] : [];
    // For game-exclusive forms (mega/gmax) with no Showdown sprite, fall back to base Pokemon
    const baseClean = clean
      .replace(/-megax$/, "").replace(/-megay$/, "").replace(/-megaz$/, "")
      .replace(/-mega$/, "").replace(/-gmax$/, "");
    const baseExtras = baseClean !== clean
      ? [
          `https://play.pokemonshowdown.com/sprites/ani/${baseClean}.gif`,
          `https://play.pokemonshowdown.com/sprites/dex/${baseClean}.png`,
          `https://play.pokemonshowdown.com/sprites/home/${baseClean}.png`,
        ]
      : [];
    const fallbacks = back
      ? [
          ...customList,
          isShiny ? `https://play.pokemonshowdown.com/sprites/ani-back-shiny/${clean}.gif` : `https://play.pokemonshowdown.com/sprites/ani-back/${clean}.gif`,
          isShiny ? `https://play.pokemonshowdown.com/sprites/ani-back/${clean}.gif` : "",
          `https://play.pokemonshowdown.com/sprites/gen5-back/${clean}.png`,
          `https://play.pokemonshowdown.com/sprites/gen5/${clean}.png`,
          `https://play.pokemonshowdown.com/sprites/dex/${clean}.png`,
          `https://play.pokemonshowdown.com/sprites/home/${clean}.png`,
          ...baseExtras,
        ].filter(Boolean)
      : [
          ...customList,
          isShiny ? `https://play.pokemonshowdown.com/sprites/ani-shiny/${clean}.gif` : `https://play.pokemonshowdown.com/sprites/ani/${clean}.gif`,
          isShiny ? `https://play.pokemonshowdown.com/sprites/ani/${clean}.gif` : "",
          `https://play.pokemonshowdown.com/sprites/gen5/${clean}.png`,
          `https://play.pokemonshowdown.com/sprites/dex/${clean}.png`,
          `https://play.pokemonshowdown.com/sprites/home/${clean}.png`,
          ...baseExtras,
        ].filter(Boolean);
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

  if (screen === "story") {
    return (
      <StoryIntro
        onComplete={({ name, starterId }) => {
          const p = getPokemon(starterId);
          if (!p) {
            setScreen("world");
            return;
          }
          const mon = makeMon(p, 5, "starter");
          setPlayer((prev) => ({ ...prev, name }));
          setTeam([mon]);
          setCaught(new Set([p.id]));
          addLog(`You chose ${p.name}! Your adventure begins!`, "#FFD700");
          setScreen("world");
        }}
      />
    );
  }

  // Legacy fallback (unused) — keeps the old name input around in case anything
  // routes back to it. The main flow now goes through the "story" screen.
  if (screen === "nameInput") {
    const submitName = () => {
      const el = document.getElementById("nf") as HTMLInputElement | null;
      const v = (el?.value || "").trim() || "Trainer";
      setPlayer((p) => ({ ...p, name: v }));
      setScreen("starter");
    };
    return (
      <div style={{ minHeight: "100vh", background: "#000", color: "#d4d4d4", fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ width: "100%", maxWidth: 384, background: "#0a0a0a", border: "1px solid #404040", padding: 32, borderRadius: 16, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ padding: 8, background: "#171717", borderRadius: 9999, border: "1px solid #262626", display: "inline-flex" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 500, color: "#f5f5f5", margin: 0 }}>Enter your name</h2>
          </div>

          <input
            id="nf"
            type="text"
            defaultValue=""
            maxLength={15}
            placeholder="Your name..."
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter" && (e.currentTarget.value || "").trim()) submitName(); }}
            onInput={(e) => {
              const btn = document.getElementById("nf-confirm") as HTMLButtonElement | null;
              if (btn) {
                const has = (e.currentTarget as HTMLInputElement).value.trim().length > 0;
                btn.style.opacity = has ? "1" : "0.3";
                btn.style.cursor = has ? "pointer" : "not-allowed";
              }
            }}
            style={{ width: "100%", boxSizing: "border-box", background: "#000", border: "1px solid #262626", color: "#e5e5e5", padding: "12px 16px", borderRadius: 12, marginBottom: 32, outline: "none", fontSize: 18, fontFamily: "inherit" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#737373"; e.currentTarget.style.boxShadow = "0 0 0 1px #737373"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#262626"; e.currentTarget.style.boxShadow = "none"; }}
          />

          <button
            id="nf-confirm"
            onClick={submitName}
            style={{ width: "100%", background: "#e5e5e5", color: "#000", fontWeight: 600, padding: "14px 0", borderRadius: 12, border: "none", cursor: "not-allowed", opacity: 0.3, fontSize: 16, fontFamily: "inherit", boxShadow: "0 0 15px rgba(255,255,255,0.1)", transition: "all 0.2s" }}
            onMouseEnter={(e) => { if (e.currentTarget.style.opacity === "1") { e.currentTarget.style.background = "#fff"; e.currentTarget.style.boxShadow = "0 0 20px rgba(255,255,255,0.2)"; } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#e5e5e5"; e.currentTarget.style.boxShadow = "0 0 15px rgba(255,255,255,0.1)"; }}
          >
            Confirm
          </button>
        </div>
      </div>
    );
  }

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
            <div style={{ fontSize: 11, color: "#666", marginTop: 6 }}>Your journey through Kanto begins!</div>
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
                    <div style={{ color: "#fff", fontSize: 12, marginBottom: 4 }}>{p.name}</div>
                    <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>{typeTag(p.type1)}{typeTag(p.type2)}</div>
                    <div style={{ color: "#888", fontSize: 10 }}>{s.desc}</div>
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
    const rankProg = rankProgress(player.exp);
    const expPct = rankProg.pct;
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
      { label: "Battle Box",    icon: "fa-shield-halved", color: "var(--m-pink)",   action: () => { setBbMode(null); setBbRoom(null); setScreen("battleBox"); } },
      { label: "Training Zone", icon: "fa-dumbbell",      color: "var(--m-orange)", action: () => { setScreen("training"); } },
      { label: "League",        icon: "fa-trophy",        color: "var(--m-yellow)", action: () => { setScreen("league"); } },
      { label: "Friends",       icon: "fa-user-plus",     color: "var(--m-green)",  action: () => { setFriendInput(""); setFriendMsg(null); setScreen("friends"); } },
      { label: "Mails",    icon: "fa-envelope",      color: "var(--m-blue)",   action: () => { loadMails(); setScreen("mails"); } },
      { label: "Transfer", icon: "fa-money-bill-transfer", color: "var(--m-green)", action: () => { loadTransfers(); setScreen("transfer"); } },
      { label: "Trade",    icon: "fa-arrows-rotate",  color: "var(--m-orange)", action: () => { loadTrades(); setScreen("trade"); } },
      { label: "Redeem",   icon: "fa-ticket",         color: "var(--m-pink)",   action: () => { setRedeemStoreInput(""); setRedeemStoreMsg(null); setScreen("redeem-store"); } },
      { label: "Mod",      icon: "fa-shield-halved",  color: "var(--m-purple)", action: () => { setAdminMsg(null); setScreen("mod"); } },
    ];
    const menuPage3: MenuBtn[] = [
      { label: "—", icon: "fa-lock", color: "var(--m-muted)", locked: true },
      { label: "—", icon: "fa-lock", color: "var(--m-muted)", locked: true },
      { label: "—", icon: "fa-lock", color: "var(--m-muted)", locked: true },
      { label: "—", icon: "fa-lock", color: "var(--m-muted)", locked: true },
      { label: "—", icon: "fa-lock", color: "var(--m-muted)", locked: true },
      { label: "—", icon: "fa-lock", color: "var(--m-muted)", locked: true },
      { label: "—", icon: "fa-lock", color: "var(--m-muted)", locked: true },
      { label: "—", icon: "fa-lock", color: "var(--m-muted)", locked: true },
      { label: "—", icon: "fa-lock", color: "var(--m-muted)", locked: true },
    ];
    const menuPages = [menuPage1, menuPage2, menuPage3];
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
              <div className="m-game-title">Crimson Sky</div>
              <div className="m-location"><i className="fa-solid fa-circle" /> {region.emoji} {region.name} &bull; Gen {region.gen}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="m-pill" style={{ cursor: "pointer" }}
                onClick={() => { const m = !muted; setMuted(m); if (!m) sfx.click(); }}>
                <i className={`fa-solid ${muted ? "fa-volume-xmark" : "fa-volume-high"}`} style={{ color: muted ? "var(--m-muted)" : "var(--m-yellow)" }} />
              </span>

              <span className="m-pill" style={{ cursor: "pointer", position: "relative" }}
                onClick={() => { sfx.click(); setShowNotifications(true); }}>
                <i className="fa-solid fa-bell" style={{ color: unreadCount > 0 ? "var(--m-yellow)" : "var(--m-muted)" }} />
                {unreadCount > 0 && (
                  <span style={{ position: "absolute", top: -4, right: -4, background: "#ef4444", color: "#fff", borderRadius: "50%", width: 14, height: 14, fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                    {unreadCount}
                  </span>
                )}
              </span>
            </div>
          </div>

          <div style={{
            margin: "14px 16px 12px", background: "#0d0d1a", border: "2px solid #7c3aed", borderRadius: 8,
            padding: 14, boxShadow: "0 4px 10px rgba(0,0,0,0.5)", position: "relative",
            fontFamily: "'Press Start 2P', monospace",
          }}>
            <div style={{ textAlign: "right", fontSize: 9, color: "#aaa", marginBottom: 6, letterSpacing: 1 }}>
              IDNo. {player.id}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #7c3aed", paddingBottom: 8, marginBottom: 10 }}>
              <div style={{ fontSize: 13, color: "#fff", textShadow: "1px 1px #000", letterSpacing: 1 }}>TRAINER CARD</div>
              <div style={{ fontSize: 11, color: "#fff", fontWeight: 700 }}>Rank {rankProg.rank}{rankProg.isMax ? " ★" : ""}</div>
            </div>
            <div style={{ fontSize: 10, color: "#bbb", marginBottom: 12, letterSpacing: 0.5 }}>
              {player.hometown} • {player.name}
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 72, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={TRAINER_SPRITE(player.sprite)} alt="Trainer" style={{ width: "100%", imageRendering: "pixelated" }} />
              </div>
              <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {[
                  { label: "EXP. POINTS", val: rankProg.totalExp.toLocaleString(), col: "#fff" },
                  { label: rankProg.isMax ? "MAX RANK" : "TO NEXT RANK", val: rankProg.isMax ? "★" : rankProg.toNext.toLocaleString(), col: rankProg.isMax ? "#FFD700" : "#fff" },
                  { label: "WINS", val: player.wins, col: "#4CAF50" },
                  { label: "LOSSES", val: player.losses, col: "#F44336" },
                ].map((stat, i) => (
                  <div key={i} style={{ background: "#13102a", border: "1px solid #2d2050", padding: "7px 8px", borderRadius: 4 }}>
                    <div style={{ fontSize: 8, color: "#aaa", marginBottom: 5, letterSpacing: 0.5 }}>{stat.label}</div>
                    <div style={{ fontSize: 11, color: stat.col }}>{stat.val}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: "#bbb", marginBottom: 6, letterSpacing: 0.5 }}>
                {rankProg.isMax
                  ? `EXP PROGRESS — MAX RANK`
                  : `EXP PROGRESS (${rankProg.current.toLocaleString()} / ${rankProg.needed.toLocaleString()})`}
              </div>
              <div style={{ background: "#1a1a2e", height: 13, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${expPct}%`, background: rankProg.isMax ? "#FFD700" : "#8b22d9", height: "100%", transition: "width 0.3s" }} />
              </div>
            </div>
            <div style={{ borderTop: "1px solid #2d2050", paddingTop: 8, textAlign: "right", fontSize: 9, color: "#aaa" }}>
              Adventure started: {player.adventureStarted}
            </div>
          </div>

          <div style={{ margin: "0 16px 12px", display: "flex", gap: 8 }}>
            <div style={{ flex: 1, background: "linear-gradient(135deg,#7e3aed,#4c1d95)", borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12, color: "#e9d5ff", letterSpacing: 0.5 }}>STARDUST</div>
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
                    <div style={{ fontSize: 12, color: "#cffafe", letterSpacing: 0.5 }}>POKÉSTOP</div>
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

          {showSafariRegionPicker && (() => {
            const usedToday = lastSafariDay === todayStr();
            const passQty = inventoryQty("Safari Pass");
            const hasPass = passQty > 0;
            // When the daily run is gone we replace the region list with a
            // "wardens are resting" message + Safari Pass CTA. The list only
            // re-appears once the player chooses to spend a pass.
            const showRegions = !usedToday || safariBypassWithPass;
            const closePicker = () => {
              sfx.menuBack();
              setShowSafariRegionPicker(false);
              setSafariBypassWithPass(false);
            };
            return (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}
                onClick={closePicker}>
                <div onClick={(e) => e.stopPropagation()}
                  style={{ background: "var(--m-card)", border: "2px solid #26A69A", borderRadius: 16, padding: 18, width: "100%", maxWidth: 360, maxHeight: "85vh", overflow: "auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ color: "#26A69A", fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>SAFARI ZONE</div>
                    <button className="btn" style={{ border: "1px solid #555", color: "#888", padding: "4px 10px", borderRadius: 6, fontSize: 11 }}
                      onClick={closePicker}>✕</button>
                  </div>

                  {showRegions ? (
                    <>
                      <div style={{ fontSize: 11, color: "var(--m-muted)", marginBottom: 14, lineHeight: 1.5 }}>
                        {safariBypassWithPass
                          ? `Pick a region — your Safari Pass (×${passQty}) will be spent when you enter. Entry still costs ₽100.`
                          : "Pick a region for today's Safari run. One run per day across all regions (use a Safari Pass to retry). Entry costs ₽100."}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {(() => {
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
                            const meta = safariRegionMeta[i] ?? { icon: "fa-map", color: "var(--m-teal)" };
                            return (
                              <button key={i} className="btn"
                                onClick={() => { setSafariBypassWithPass(false); startSafariInRegion(i); }}
                                style={{
                                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                                  border: "1.5px solid #26A69A", background: "#0d2018",
                                  borderRadius: 12, color: "#fff", textAlign: "left", cursor: "pointer",
                                }}>
                                <span style={{
                                  width: 32, height: 32, borderRadius: "50%",
                                  background: `${meta.color}22`,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  color: meta.color, fontSize: 14, flexShrink: 0,
                                }}>
                                  <i className={`fa-solid ${meta.icon}`} />
                                </span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 13, fontWeight: 700 }}>{r.name}</div>
                                  <div style={{ fontSize: 12, color: "var(--m-muted)" }}>Gen {r.gen}</div>
                                </div>
                                <div style={{ fontSize: 10, color: safariBypassWithPass ? "#06b6d4" : "#4ade80", fontWeight: 700 }}>
                                  {safariBypassWithPass ? "USE PASS" : "AVAILABLE"}
                                </div>
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </>
                  ) : (
                    // Daily limit reached — show the wardens-resting panel.
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "12px 4px 4px" }}>
                      <div style={{
                        width: 64, height: 64, borderRadius: "50%",
                        background: "rgba(38,166,154,0.12)",
                        border: "1px solid rgba(38,166,154,0.4)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#26A69A", fontSize: 26,
                      }}>
                        <i className="fa-solid fa-moon" />
                      </div>
                      <div style={{ fontSize: 13, color: "#f0f0f0", textAlign: "center", lineHeight: 1.6, padding: "0 6px" }}>
                        <div style={{ fontWeight: 700, marginBottom: 6, color: "#26A69A", fontSize: 14 }}>
                          The Safari wardens are resting!
                        </div>
                        You've reached your daily Safari entry limit.
                        {hasPass
                          ? <> Present a Safari Pass to re-enter the Safari Zone.</>
                          : <> Pick up a Safari Pass at the Pokestore to re-enter today.</>}
                      </div>

                      {hasPass ? (
                        <button className="btn"
                          onClick={() => { sfx.itemPickup(); setSafariBypassWithPass(true); }}
                          style={{
                            width: "100%", padding: "12px 14px", borderRadius: 12,
                            background: "linear-gradient(180deg,#26A69A,#0f766e)",
                            border: "1px solid #26A69A", color: "#fff",
                            fontSize: 13, fontWeight: 700, letterSpacing: 0.5,
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                            cursor: "pointer",
                          }}>
                          <i className="fa-solid fa-ticket" />
                          Use Safari Pass <span style={{ opacity: 0.7, fontWeight: 500 }}>(×{passQty})</span>
                        </button>
                      ) : (
                        <button className="btn"
                          onClick={() => {
                            sfx.click();
                            setShowSafariRegionPicker(false);
                            setSafariBypassWithPass(false);
                            setStoreCat("balls");
                            setScreen("store");
                          }}
                          style={{
                            width: "100%", padding: "12px 14px", borderRadius: 12,
                            background: "linear-gradient(180deg,#facc15,#a16207)",
                            border: "1px solid #facc15", color: "#1a1a1a",
                            fontSize: 13, fontWeight: 700, letterSpacing: 0.5,
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                            cursor: "pointer",
                          }}>
                          <i className="fa-solid fa-cart-shopping" />
                          Buy Safari Pass at Pokestore
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        {/* Notifications modal */}
        {showNotifications && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 60 }}
            onClick={() => setShowNotifications(false)}>
            <div style={{ background: "rgba(18,18,24,0.95)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, width: "90%", maxWidth: 380, maxHeight: "70vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}
              onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                  <i className="fa-solid fa-bell" style={{ marginRight: 8, color: "var(--m-yellow)" }} />Notifications
                </span>
                <div style={{ display: "flex", gap: 10 }}>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Mark all read</button>
                  )}
                  <button onClick={() => setShowNotifications(false)} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
                </div>
              </div>
              <div style={{ overflowY: "auto", flex: 1 }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", color: "#6b7280", fontSize: 12 }}>No notifications yet.</div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 12, alignItems: "flex-start", background: n.read ? "transparent" : "rgba(250,204,21,0.05)", cursor: "pointer" }}
                      onClick={() => setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x))}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: n.read ? "transparent" : "#facc15", marginTop: 4, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: n.read ? "#9ca3af" : "#f0f0f0", lineHeight: 1.4 }}>{n.text}</div>
                        <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4 }}>{n.time}</div>
                      </div>
                    </div>
                  ))
                )}
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
            <span className="m-level-badge">Rank {rankFromExp(player.exp)} / {MAX_RANK}</span>
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
              <div><div className="m-stat-lab">Rank Tier</div><div className="m-stat-val">{rankTier(rankFromExp(player.exp))}</div></div>
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
            <div className="m-li" onClick={() => { const m = !muted; setMuted(m); if (!m) sfx.click(); }}>
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

  if (screen === "friends") {
    const myCardCode = encodeMyCard({
      id: player.id,
      name: player.name,
      hometown: player.hometown,
      sprite: player.sprite,
      rank: rankFromExp(player.exp),
    });
    const showMsg = (text: string, ok: boolean) => {
      setFriendMsg({ text, ok });
      setTimeout(() => setFriendMsg(null), 4000);
    };
    const handleSearch = () => {
      sfx.click();
      const decoded = decodeFriendCode(friendInput);
      if (!decoded) { showMsg("Invalid friend code or trainer ID.", false); setFriendSearchResult(null); return; }
      setFriendSearchResult({ id: decoded.id, name: decoded.name, hometown: decoded.hometown ?? "Unknown", sprite: decoded.sprite ?? "hilbert", rank: decoded.rank ?? 1 });
      setFriendMsg(null);
    };
    const handleAddFromResult = () => {
      if (!friendSearchResult) return;
      sfx.click();
      const decoded = decodeFriendCode(friendInput);
      if (!decoded) return;
      const result = addFriendOp(friends, decoded, player.id);
      if (!result.ok || !result.friend) { showMsg(result.reason ?? "Could not add friend.", false); return; }
      setFriends((prev) => [...prev, result.friend!]);
      setFriendInput("");
      setFriendSearchResult(null);
      showMsg(`Added ${result.friend.name} to your friends!`, true);
      addLog(`👋 Added ${result.friend.name} (#${result.friend.id}) to friends.`, "#4ade80");
    };
    const handleCopy = async () => {
      sfx.click();
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(myCardCode);
          showMsg("Friend code copied!", true);
        } else {
          showMsg(myCardCode, true);
        }
      } catch {
        showMsg(myCardCode, true);
      }
    };
    const handleRemove = (id: number, name: string) => {
      sfx.click();
      setFriends((prev) => removeFriendOp(prev, id));
      addLog(`🗑️ Removed ${name} from friends.`, "#F44336");
    };
    return (
      <div style={S.root}><style>{css}</style>
        <div style={S.wrap}>
          <div style={S.header}>
            <BackBtn onClick={() => { sfx.menuBack(); setScreen("world"); }} />
            <span className="page-header-title">Friends</span>
            <div style={{ width: 88 }} />
          </div>

          {/* Your friend card */}
          <div style={{ margin: 16, background: "#0d0d1a", border: "2px solid #4ade80", borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 12, color: "#4ade80", marginBottom: 8, letterSpacing: 1 }}>YOUR FRIEND CODE</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <img src={TRAINER_SPRITE(player.sprite)} alt="me" style={{ width: 56, height: 56, imageRendering: "pixelated" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: "#fff", fontWeight: 700 }}>{player.name}</div>
                <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>#{player.id} • Rank {rankFromExp(player.exp)}</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{player.hometown}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <code style={{ flex: 1, minWidth: 0, fontSize: 12, color: "#9ca3af", background: "#181820", border: "1px solid #2a2a32", padding: "8px 10px", borderRadius: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "ui-monospace, Menlo, monospace" }}>{myCardCode}</code>
              <button onClick={handleCopy} className="btn" style={{ padding: "8px 14px", borderRadius: 6, background: "#4ade80", color: "#062b16", fontWeight: 700, fontSize: 11, border: "none" }}>
                <i className="fa-solid fa-copy" /> Copy
              </button>
            </div>
            <div style={{ fontSize: 11, color: "#777", marginTop: 6 }}>Share this code with another HexaMon trainer to add each other.</div>
          </div>

          {/* Search a trainer */}
          <div style={{ margin: "0 16px 16px", background: "#15151b", border: "1px solid #26262d", borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 12, color: "#bbb", marginBottom: 8 }}>FIND A TRAINER</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={friendInput}
                onChange={(e) => { setFriendInput(e.target.value); setFriendSearchResult(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                placeholder="Paste friend code or Trainer ID"
                style={{ flex: 1, minWidth: 0, padding: "10px 12px", border: "1px solid #2a2a32", background: "#0d0d12", color: "#fff", fontSize: 12, outline: "none", borderRadius: 6 }}
              />
              <button onClick={handleSearch} className="btn" style={{ padding: "10px 16px", borderRadius: 6, background: "#2f7bff", color: "#fff", fontWeight: 700, fontSize: 12, border: "none" }}>
                <i className="fa-solid fa-magnifying-glass" />
              </button>
            </div>
            {friendMsg && (
              <div style={{ marginTop: 8, fontSize: 10, color: friendMsg.ok ? "#4ade80" : "#f87171", fontWeight: 600 }}>
                {friendMsg.text}
              </div>
            )}
            {friendSearchResult && (
              <div style={{ marginTop: 10, background: "rgba(255,255,255,0.04)", border: "1px solid #2a2a32", borderRadius: 10, padding: 10, display: "flex", alignItems: "center", gap: 12 }}>
                <img src={TRAINER_SPRITE(friendSearchResult.sprite)} alt={friendSearchResult.name} style={{ width: 48, height: 48, imageRendering: "pixelated", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "#fff", fontWeight: 700 }}>{friendSearchResult.name}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>#{friendSearchResult.id} · Rank {friendSearchResult.rank}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{friendSearchResult.hometown}</div>
                </div>
                <button onClick={handleAddFromResult} className="btn" style={{ padding: "8px 12px", borderRadius: 6, background: "#4ade80", color: "#062b16", fontWeight: 700, fontSize: 11, border: "none", flexShrink: 0 }}>
                  <i className="fa-solid fa-user-plus" /> Add
                </button>
              </div>
            )}
          </div>

          {/* Friends list */}
          <div style={{ padding: "0 16px 24px", flex: 1, overflowY: "auto" }}>
            <div style={{ fontSize: 10, color: "#bbb", marginBottom: 8, letterSpacing: 0.5 }}>
              YOUR FRIENDS ({friends.length})
            </div>
            {friends.length === 0 ? (
              <div style={{ background: "#15151b", border: "1px dashed #2a2a32", borderRadius: 12, padding: 20, textAlign: "center", color: "#777", fontSize: 11 }}>
                No friends yet. Share your friend code to get started!
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {friends.map((f) => (
                  <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "#15151b", border: "1px solid #26262d", borderRadius: 10, padding: 10 }}>
                    <div style={{ cursor: "pointer" }} onClick={() => { sfx.click(); setFriendProfileModal({ id: f.id, name: f.name, hometown: f.hometown ?? "", sprite: f.sprite || "hilbert", rank: f.rank ?? 1, addedAt: f.addedAt }); }}>
                      <img src={TRAINER_SPRITE(f.sprite || "hilbert")} alt={f.name} style={{ width: 44, height: 44, imageRendering: "pixelated", opacity: f.sprite ? 1 : 0.6 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => { sfx.click(); setFriendProfileModal({ id: f.id, name: f.name, hometown: f.hometown ?? "", sprite: f.sprite || "hilbert", rank: f.rank ?? 1, addedAt: f.addedAt }); }}>
                      <div style={{ fontSize: 12, color: "#fff", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                        #{f.id}{f.rank ? ` · Rank ${f.rank}` : ""}{f.hometown ? ` · ${f.hometown}` : ""}
                      </div>
                      <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                        Added {new Date(f.addedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button onClick={() => handleRemove(f.id, f.name)} className="btn" style={{ padding: "6px 10px", borderRadius: 6, background: "#7f1d1d", color: "#fff", fontSize: 10, border: "none" }}>
                      <i className="fa-solid fa-trash" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Friend profile modal */}
        {friendProfileModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setFriendProfileModal(null)}>
            <div style={{ background: "#0d0d1a", border: "2px solid #4ade80", borderRadius: 14, padding: 20, width: "88%", maxWidth: 340, boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}
              onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#4ade80", letterSpacing: 1 }}>TRAINER PROFILE</span>
                <button onClick={() => setFriendProfileModal(null)} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
              </div>
              <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
                <img src={TRAINER_SPRITE(friendProfileModal.sprite)} alt={friendProfileModal.name} style={{ width: 72, height: 72, imageRendering: "pixelated" }} />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{friendProfileModal.name}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>#{friendProfileModal.id} · Rank {friendProfileModal.rank}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{friendProfileModal.hometown || "Unknown Town"}</div>
                </div>
              </div>
              <div style={{ background: "#171022", border: "1px solid #312440", borderRadius: 8, padding: 10, display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontSize: 11, color: "#aaa" }}>Friends since</div>
                <div style={{ fontSize: 11, color: "#fff" }}>{new Date(friendProfileModal.addedAt).toLocaleDateString()}</div>
              </div>
              <button onClick={() => setFriendProfileModal(null)} style={{ marginTop: 14, width: "100%", background: "transparent", border: "1px solid #26262d", color: "#9ca3af", padding: "10px", borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Close</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── MAILS SCREEN ────────────────────────────────────────────────────────
  if (screen === "mails") {
    const unreadMails = mailItems.filter(m => !m.read).length;
    const doMarkAllRead = async () => {
      try { await markAllMailRead(String(player.id)); setMailItems(prev => prev.map(m => ({...m, read: true}))); } catch { /* ignore */ }
    };
    const claimMailReward = (mail: SocialMail) => {
      const d = mail.data as any;
      if (!d) return;
      if ((d.money || 0) > 0) setPlayer(p => ({...p, money: p.money + (d.money || 0)}));
      if (d.item && (d.qty || d.itemQty || 0) > 0) addItemToInventory(d.item, d.qty || d.itemQty || 1);
      if ((d.type === "trade_reward" || d.type === "trade_return") && d.mon) setBox(prev => [...prev, d.mon]);
      if (d.type === "sell_reward" && d.amount > 0) setPlayer(p => ({ ...p, money: p.money + d.amount }));
      if (d.type === "admin_reset") {
        try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
        window.location.reload();
        return;
      }
      markMailRead(mail.id, String(player.id)).catch(() => {});
      setMailItems(prev => prev.map(m => m.id === mail.id ? {...m, read: true, data: null} : m));
      setSelectedMail(null);
    };
    const isClaimable = (mail: SocialMail) => {
      const d = mail.data as any;
      if (!d) return false;
      const t = d.type;
      return t === "drop" || t === "redeem_reward" || t === "trade_reward" || t === "trade_return" || t === "sell_reward" || t === "admin_reset";
    };
    return (
      <div style={S.root}><style>{css}</style>
        <div style={S.wrap}>
          <div style={S.header}>
            <BackBtn onClick={() => { setSelectedMail(null); setScreen("world"); }} />
            <span className="page-header-title">
              <i className="fa-solid fa-envelope" style={{ marginRight: 6 }} />Mails
              {unreadMails > 0 && <span style={{ marginLeft: 8, background: "#ef4444", color: "#fff", borderRadius: 999, padding: "2px 6px", fontSize: 9 }}>{unreadMails}</span>}
            </span>
            <button onClick={doMarkAllRead} style={{ background: "transparent", border: "1px solid #444", color: "#9ca3af", padding: "4px 8px", borderRadius: 6, fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>All Read</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
            {mailLoading && <div style={{ textAlign: "center", padding: 24, color: "#6b7280", fontSize: 13 }}>Loading...</div>}
            {selectedMail ? (
              <div style={{ background: "#111827", border: "1px solid #374151", borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>From: <strong style={{ color: "#fff" }}>{selectedMail.fromName}</strong></div>
                  <div style={{ fontSize: 10, color: "#6b7280" }}>{new Date(selectedMail.createdAt).toLocaleDateString()}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 12 }}>{selectedMail.subject}</div>
                <div style={{ fontSize: 13, color: "#d1d5db", lineHeight: 1.6, marginBottom: 16 }}>{selectedMail.body}</div>
                {isClaimable(selectedMail) && (
                  <button onClick={() => claimMailReward(selectedMail)} style={{ width: "100%", background: "linear-gradient(135deg,#7c3aed,#db2777)", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 8, fontFamily: "inherit" }}>
                    <i className="fa-solid fa-gift" style={{ marginRight: 8 }} />Claim Reward
                  </button>
                )}
                <button onClick={() => setSelectedMail(null)} style={{ width: "100%", background: "transparent", border: "1px solid #374151", color: "#9ca3af", borderRadius: 8, padding: "10px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>← Back to Inbox</button>
              </div>
            ) : !mailLoading && mailItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: 64, color: "#6b7280" }}>
                <i className="fa-solid fa-inbox" style={{ fontSize: 48, marginBottom: 16, display: "block" }} />
                <div style={{ fontSize: 14 }}>No mails yet.</div>
              </div>
            ) : mailItems.map(mail => (
              <div key={mail.id} onClick={() => { setSelectedMail(mail); if (!mail.read) { markMailRead(mail.id, String(player.id)).catch(() => {}); setMailItems(p => p.map(m => m.id === mail.id ? {...m, read: true} : m)); } }}
                style={{ background: mail.read ? "#0d0d1a" : "#1a0f2e", border: `1px solid ${mail.read ? "#1f2937" : "#7c3aed"}`, borderRadius: 10, padding: 12, marginBottom: 8, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: mail.read ? 400 : 700, color: mail.read ? "#9ca3af" : "#fff", marginBottom: 3 }}>{mail.subject}</div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>From: {mail.fromName}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, marginLeft: 8 }}>
                    {!mail.read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#7c3aed", flexShrink: 0 }} />}
                    <div style={{ fontSize: 10, color: "#4b5563", whiteSpace: "nowrap" }}>{new Date(mail.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── TRANSFER SCREEN ─────────────────────────────────────────────────────
  if (screen === "transfer") {
    const totalPending = pendingTransfers.reduce((s, t) => s + t.amount, 0);
    const doSendTransfer = async () => {
      const toId = transferInput.trim();
      const amt = Number(transferAmount);
      if (!toId || !amt || amt <= 0) { setTransferMsg({ text: "Enter a valid player ID and amount.", ok: false }); return; }
      if (amt > player.money) { setTransferMsg({ text: "Not enough money.", ok: false }); return; }
      setTransferLoading(true);
      try {
        await sendTransfer(String(player.id), player.name, toId, amt, transferNote);
        setPlayer(p => ({ ...p, money: p.money - amt }));
        setTransferMsg({ text: `₽${amt.toLocaleString()} sent!`, ok: true });
        setTransferInput(""); setTransferAmount(""); setTransferNote("");
        await loadTransfers();
      } catch (e: any) {
        setTransferMsg({ text: e.message || "Error sending transfer.", ok: false });
      } finally {
        setTransferLoading(false);
        setTimeout(() => setTransferMsg(null), 4000);
      }
    };
    return (
      <div style={S.root}><style>{css}</style>
        <div style={S.wrap}>
          <div style={S.header}>
            <BackBtn onClick={() => setScreen("world")} />
            <span className="page-header-title"><i className="fa-solid fa-money-bill-transfer" style={{ marginRight: 6 }} />Transfer</span>
            <div style={{ fontSize: 11, color: "#4ade80", fontWeight: 700 }}>₽{player.money.toLocaleString()}</div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
            {transferMsg && <div style={{ background: transferMsg.ok ? "#14532d" : "#7f1d1d", border: `1px solid ${transferMsg.ok ? "#166534" : "#991b1b"}`, borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 12, color: "#fff" }}>{transferMsg.text}</div>}
            {pendingTransfers.length > 0 && (
              <div style={{ background: "#14532d", border: "1px solid #166534", borderRadius: 12, padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#4ade80", marginBottom: 8 }}>Incoming: ₽{totalPending.toLocaleString()} Pending</div>
                {pendingTransfers.slice(0, 5).map(t => (
                  <div key={t.id} style={{ fontSize: 11, color: "#a7f3d0", marginBottom: 4 }}>From {t.fromName}: +₽{t.amount.toLocaleString()}{t.note ? ` "${t.note}"` : ""}</div>
                ))}
                <button onClick={claimAllTransfers} style={{ marginTop: 8, width: "100%", background: "linear-gradient(135deg,#16a34a,#166534)", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Claim All ₽{totalPending.toLocaleString()}
                </button>
              </div>
            )}
            <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Send Money</div>
              <input value={transferInput} onChange={e => setTransferInput(e.target.value)} placeholder="Target Player ID (10 digits)" style={{ width: "100%", background: "#0d0d1a", border: "1px solid #374151", color: "#fff", borderRadius: 8, padding: "10px 12px", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 8 }} />
              <input value={transferAmount} onChange={e => setTransferAmount(e.target.value)} placeholder={`Amount (max ₽${player.money.toLocaleString()})`} type="number" min="1" style={{ width: "100%", background: "#0d0d1a", border: "1px solid #374151", color: "#fff", borderRadius: 8, padding: "10px 12px", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 8 }} />
              <input value={transferNote} onChange={e => setTransferNote(e.target.value)} placeholder="Note (optional)" style={{ width: "100%", background: "#0d0d1a", border: "1px solid #374151", color: "#fff", borderRadius: 8, padding: "10px 12px", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 10 }} />
              <button onClick={doSendTransfer} disabled={transferLoading} style={{ width: "100%", background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: transferLoading ? 0.6 : 1 }}>
                {transferLoading ? "Sending..." : "Send Transfer"}
              </button>
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 12 }}>Your Player ID: <span style={{ color: "#9ca3af", fontFamily: "monospace" }}>{player.id}</span></div>
            {transferSent.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", marginBottom: 8 }}>Sent History</div>
                {transferSent.map((t, i) => (
                  <div key={i} style={{ background: "#0d0d1a", border: "1px solid #1f2937", borderRadius: 8, padding: 10, marginBottom: 6, fontSize: 11, color: "#9ca3af" }}>
                    To ID …{String(t.toId).slice(-4)}: -₽{t.amount.toLocaleString()}{t.note ? ` · "${t.note}"` : ""}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── REDEEM STORE SCREEN ─────────────────────────────────────────────────
  if (screen === "redeem-store") {
    const doRedeem = async () => {
      const code = redeemStoreInput.trim().toUpperCase();
      if (!code) { setRedeemStoreMsg({ text: "Enter a code.", ok: false }); return; }
      setRedeemStoreLoading(true);
      try {
        const r = await redeemDbCode(code, String(player.id), player.name);
        const { money, item, qty } = r.reward ?? {};
        let msg = "Code redeemed!";
        if (money > 0) { msg += ` +₽${money.toLocaleString()}`; setPlayer(p => ({ ...p, money: p.money + money })); }
        if (item && qty > 0) { msg += ` +×${qty} ${item}`; addItemToInventory(item, qty); }
        setRedeemStoreMsg({ text: msg, ok: true });
        setRedeemStoreInput("");
      } catch (e: any) {
        setRedeemStoreMsg({ text: e.message || "Invalid or expired code.", ok: false });
      } finally { setRedeemStoreLoading(false); }
    };
    return (
      <div style={S.root}><style>{css}</style>
        <div style={S.wrap}>
          <div style={S.header}>
            <BackBtn onClick={() => setScreen("world")} />
            <span className="page-header-title"><i className="fa-solid fa-ticket" style={{ marginRight: 6 }} />Redeem Store</span>
            <div style={{ width: 60 }} />
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 16, padding: 24, textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🎫</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Got a code?</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 20 }}>Enter your alphanumeric code to claim rewards — items, Pokédollars, or special Pokémon.</div>
              {redeemStoreMsg && (
                <div style={{ background: redeemStoreMsg.ok ? "#14532d" : "#7f1d1d", border: `1px solid ${redeemStoreMsg.ok ? "#166534" : "#991b1b"}`, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13, color: "#fff" }}>
                  {redeemStoreMsg.text}
                </div>
              )}
              <input
                value={redeemStoreInput}
                onChange={e => setRedeemStoreInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && doRedeem()}
                placeholder="E.G. LAUNCH2024"
                style={{ width: "100%", background: "#0d0d1a", border: "2px solid #374151", color: "#fff", borderRadius: 10, padding: "14px 16px", fontSize: 15, fontFamily: "'Courier New', monospace", boxSizing: "border-box", marginBottom: 12, letterSpacing: 2, textAlign: "center" }}
              />
              <button
                onClick={doRedeem}
                disabled={redeemStoreLoading || !redeemStoreInput.trim()}
                style={{ width: "100%", background: "linear-gradient(135deg,#ec4899,#db2777)", color: "#fff", border: "none", borderRadius: 10, padding: "14px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: (redeemStoreLoading || !redeemStoreInput.trim()) ? 0.5 : 1 }}
              >
                {redeemStoreLoading ? "Redeeming..." : "Redeem Code"}
              </button>
            </div>
            <div style={{ fontSize: 11, color: "#4b5563", textAlign: "center" }}>Codes are case-insensitive and can only be redeemed once per account. Check Mails after redeeming to claim your reward.</div>
          </div>
        </div>
      </div>
    );
  }

  // ── TRADE SCREEN ────────────────────────────────────────────────────────
  if (screen === "trade") {
    const tradeSrcMons = tradeSource === "team" ? team : box;
    const monSpriteUrl = (m: Mon) => {
      const key = (m.formSprite || (m.species || m.name).toLowerCase().replace(/[^a-z0-9-]/g, "")).replace(/\s/g, "-");
      return CUSTOM_SPRITE_URL(key) ?? `https://play.pokemonshowdown.com/sprites/ani/${key}.gif`;
    };
    const STAT_LABELS: Record<string, string> = { hp: "HP", atk: "Atk", def: "Def", spa: "SpA", spd: "SpD", spe: "Spe" };
    const renderMonPreview = (t: TradeProp) => {
      const m = t.proposerMonJson as any;
      if (!m) return null;
      const sprKey = (m.formSprite || (m.species || m.name || "").toLowerCase().replace(/[^a-z0-9-]/g, "")).replace(/\s/g, "-");
      const sprUrl = CUSTOM_SPRITE_URL(sprKey) ?? `https://play.pokemonshowdown.com/sprites/ani/${sprKey}.gif`;
      const statKeys = ["hp", "atk", "def", "spa", "spd", "spe"];
      return (
        <div style={{ background: "#0a0a1a", border: "1px solid #4c1d95", borderRadius: 10, padding: 12, marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
            <img src={sprUrl} alt={m.name} style={{ width: 72, height: 72, imageRendering: "pixelated", objectFit: "contain" }}
              onError={(e) => { (e.target as HTMLImageElement).src = `https://play.pokemonshowdown.com/sprites/dex/${(m.species || m.name || "").toLowerCase().replace(/[^a-z0-9]/g, "")}.png`; }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{m.name}</div>
              <div style={{ fontSize: 11, color: "#a78bfa" }}>{m.species}{m.form ? ` (${m.form})` : ""}</div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>Lv. {m.level} · {m.gender || "—"}</div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>{m.nature} · {m.ability}</div>
            </div>
          </div>
          {m.moves && m.moves.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 4, fontWeight: 700 }}>MOVES</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {m.moves.map((mv: any, i: number) => (
                  <span key={i} style={{ background: "#1f2937", borderRadius: 4, padding: "3px 7px", fontSize: 10, color: "#d1d5db" }}>{mv.name || mv}</span>
                ))}
              </div>
            </div>
          )}
          {m.stats && (
            <div>
              <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 4, fontWeight: 700 }}>STATS (Base / IV / EV)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 8px" }}>
                {statKeys.map(k => (
                  <div key={k} style={{ fontSize: 10, color: "#d1d5db", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#9ca3af" }}>{STAT_LABELS[k]}</span>
                    <span>{m.stats[k] ?? "—"} / <span style={{ color: "#60a5fa" }}>{m.ivs?.[k] ?? "—"}</span> / <span style={{ color: "#4ade80" }}>{m.evs?.[k] ?? "—"}</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    };
    const doProposeTrade = async () => {
      if (!tradeMyMon) { setTradeMsg({ text: "Select a Pokémon to offer.", ok: false }); return; }
      if (!tradeTargetId.trim()) { setTradeMsg({ text: "Enter the target Player ID.", ok: false }); return; }
      if (tradeMode === "sell") {
        const p = Number(tradePrice);
        if (!p || p <= 0) { setTradeMsg({ text: "Enter a valid price for sell mode.", ok: false }); return; }
      }
      setTradeLoading(true);
      try {
        const price = tradeMode === "sell" ? Number(tradePrice) : 0;
        await proposeTrade(String(player.id), player.name, tradeTargetId.trim(), tradeMyMon, tradeMyMon.name, tradeMode, price);
        if (tradeSource === "team") setTeam(prev => prev.filter(m => m !== tradeMyMon));
        else setBox(prev => prev.filter(m => m !== tradeMyMon));
        const msg = tradeMode === "sell"
          ? `Sale posted! ${tradeMyMon.name} is listed for ₽${Number(tradePrice).toLocaleString()} until bought or cancelled.`
          : `Offer sent! ${tradeMyMon.name} is held until accepted or cancelled.`;
        setTradeMsg({ text: msg, ok: true });
        setTradeMyMon(null); setTradeTargetId(""); setTradePrice("");
        await loadTrades();
      } catch (e: any) {
        setTradeMsg({ text: e.message || "Error sending trade.", ok: false });
      } finally { setTradeLoading(false); }
    };
    const doAcceptSwapTrade = async (t: TradeProp) => {
      if (!tradeMyMon) { setTradeMsg({ text: "Select a Pokémon to offer in return.", ok: false }); return; }
      setTradeLoading(true);
      try {
        const r = await acceptTrade(t.id, String(player.id), tradeMyMon, tradeMyMon.name);
        if (tradeSource === "team") setTeam(prev => prev.filter(m => m !== tradeMyMon));
        else setBox(prev => prev.filter(m => m !== tradeMyMon));
        if (r.proposerMon) setBox(prev => [...prev, r.proposerMon as Mon]);
        setTradeMsg({ text: `Trade complete! You received ${t.proposerMonName}!`, ok: true });
        setTradeMyMon(null); setTradePreviewTrade(null);
        await loadTrades();
      } catch (e: any) {
        setTradeMsg({ text: e.message || "Error accepting trade.", ok: false });
      } finally { setTradeLoading(false); }
    };
    const doAcceptSellTrade = async (t: TradeProp) => {
      const price = t.price ?? 0;
      if (player.money < price) { setTradeMsg({ text: `Not enough Pokédollars. Need ₽${price.toLocaleString()}.`, ok: false }); return; }
      setTradeLoading(true);
      try {
        const r = await acceptSellTrade(t.id, String(player.id));
        setPlayer(p => ({ ...p, money: p.money - price }));
        if (r.proposerMon) setBox(prev => [...prev, r.proposerMon as Mon]);
        setTradeMsg({ text: `Purchase complete! You bought ${t.proposerMonName} for ₽${price.toLocaleString()}!`, ok: true });
        setTradePreviewTrade(null);
        await loadTrades();
      } catch (e: any) {
        setTradeMsg({ text: e.message || "Error completing purchase.", ok: false });
      } finally { setTradeLoading(false); }
    };
    const doDeclineTrade = async (t: TradeProp) => {
      try { await declineTrade(t.id, String(player.id)); setTradeMsg({ text: "Trade declined.", ok: true }); setTradePreviewTrade(null); await loadTrades(); } catch { /* ignore */ }
    };
    const doCancelTrade = async (t: TradeProp) => {
      try {
        const r = await cancelTrade(t.id, String(player.id));
        if (r.proposerMon) setBox(prev => [...prev, r.proposerMon as Mon]);
        setTradeMsg({ text: `Cancelled. ${t.proposerMonName} returned.`, ok: true });
        await loadTrades();
      } catch { /* ignore */ }
    };
    return (
      <div style={S.root}><style>{css}</style>
        <div style={S.wrap}>
          <div style={S.header}>
            <BackBtn onClick={() => { setTradeMyMon(null); setTradePreviewTrade(null); setScreen("world"); }} />
            <span className="page-header-title"><i className="fa-solid fa-arrows-rotate" style={{ marginRight: 6 }} />Trade</span>
            <div style={{ width: 60 }} />
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
            {tradeMsg && <div style={{ background: tradeMsg.ok ? "#14532d" : "#7f1d1d", border: `1px solid ${tradeMsg.ok ? "#166534" : "#991b1b"}`, borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 12, color: "#fff" }}>{tradeMsg.text}</div>}
            {pendingTrades.incoming.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 10 }}>Incoming Offers ({pendingTrades.incoming.length})</div>
                {pendingTrades.incoming.map(t => {
                  const isPreviewing = tradePreviewTrade?.id === t.id;
                  const isSell = (t.mode ?? "swap") === "sell";
                  return (
                    <div key={t.id} style={{ background: "#1a0f2e", border: `1px solid ${isPreviewing ? "#a78bfa" : "#7c3aed"}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div>
                          <span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>{t.proposerName}</span>
                          <span style={{ fontSize: 11, color: "#c4b5fd" }}> {isSell ? "is selling" : "offers"} </span>
                          <span style={{ fontSize: 12, color: "#a78bfa", fontWeight: 700 }}>{t.proposerMonName}</span>
                          {isSell && <span style={{ fontSize: 12, color: "#4ade80", fontWeight: 700 }}> · ₽{(t.price ?? 0).toLocaleString()}</span>}
                        </div>
                        <span style={{ fontSize: 10, color: "#6b7280", background: isSell ? "#14532d" : "#1e1b4b", padding: "2px 7px", borderRadius: 4 }}>{isSell ? "SELL" : "SWAP"}</span>
                      </div>
                      <button onClick={() => setTradePreviewTrade(isPreviewing ? null : t)} style={{ width: "100%", background: "#1f2937", color: "#c4b5fd", border: "1px solid #374151", borderRadius: 8, padding: "7px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", marginBottom: isPreviewing ? 10 : 0 }}>
                        {isPreviewing ? "Hide Details ▲" : "Preview Details ▼"}
                      </button>
                      {isPreviewing && (
                        <>
                          {renderMonPreview(t)}
                          {isSell ? (
                            <div>
                              <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8, textAlign: "center" }}>
                                Your balance: <strong style={{ color: "#4ade80" }}>₽{player.money.toLocaleString()}</strong>
                              </div>
                              <div style={{ display: "flex", gap: 8 }}>
                                <button onClick={() => doAcceptSellTrade(t)} disabled={tradeLoading || player.money < (t.price ?? 0)} style={{ flex: 1, background: "linear-gradient(135deg,#16a34a,#15803d)", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: (tradeLoading || player.money < (t.price ?? 0)) ? 0.5 : 1 }}>
                                  Buy for ₽{(t.price ?? 0).toLocaleString()}
                                </button>
                                <button onClick={() => doDeclineTrade(t)} disabled={tradeLoading} style={{ background: "transparent", border: "1px solid #ef4444", color: "#ef4444", borderRadius: 8, padding: "10px 12px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Pass</button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>Select your Pokémon below to offer in return, then accept.</div>
                              <div style={{ display: "flex", gap: 8 }}>
                                <button onClick={() => doAcceptSwapTrade(t)} disabled={!tradeMyMon || tradeLoading} style={{ flex: 1, background: "linear-gradient(135deg,#16a34a,#15803d)", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: (!tradeMyMon || tradeLoading) ? 0.5 : 1 }}>
                                  {tradeMyMon ? `Swap ${tradeMyMon.name} → get ${t.proposerMonName}` : "Pick a Pokémon below first"}
                                </button>
                                <button onClick={() => doDeclineTrade(t)} disabled={tradeLoading} style={{ background: "transparent", border: "1px solid #ef4444", color: "#ef4444", borderRadius: 8, padding: "10px 12px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Decline</button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {pendingTrades.outgoing.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#9ca3af", marginBottom: 10 }}>Your Pending Offers</div>
                {pendingTrades.outgoing.map(t => (
                  <div key={t.id} style={{ background: "#0d0d1a", border: "1px solid #374151", borderRadius: 12, padding: 12, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#d1d5db" }}>
                        {t.proposerMonName}
                        {(t.mode ?? "swap") === "sell" ? <span style={{ color: "#4ade80" }}> · ₽{(t.price ?? 0).toLocaleString()}</span> : " ⇄ swap"}
                        <span style={{ color: "#6b7280" }}> → …{String(t.targetId).slice(-4)}</span>
                      </div>
                      <div style={{ fontSize: 10, color: "#6b7280" }}>Waiting...</div>
                    </div>
                    <button onClick={() => doCancelTrade(t)} style={{ background: "transparent", border: "1px solid #4b5563", color: "#9ca3af", borderRadius: 8, padding: "6px 10px", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 10 }}>New Trade Offer</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                <button onClick={() => setTradeMode("swap")} style={{ flex: 1, background: tradeMode === "swap" ? "#7c3aed" : "#1f2937", color: "#fff", border: "none", borderRadius: 8, padding: "9px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: tradeMode === "swap" ? 700 : 400 }}>
                  Swap (mon for mon)
                </button>
                <button onClick={() => setTradeMode("sell")} style={{ flex: 1, background: tradeMode === "sell" ? "#15803d" : "#1f2937", color: "#fff", border: "none", borderRadius: 8, padding: "9px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: tradeMode === "sell" ? 700 : 400 }}>
                  Sell (mon for ₽)
                </button>
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <button onClick={() => setTradeSource("team")} style={{ flex: 1, background: tradeSource === "team" ? "#4c1d95" : "#1f2937", color: "#fff", border: "none", borderRadius: 6, padding: "7px", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>Team</button>
                <button onClick={() => setTradeSource("box")} style={{ flex: 1, background: tradeSource === "box" ? "#4c1d95" : "#1f2937", color: "#fff", border: "none", borderRadius: 6, padding: "7px", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>Box ({box.length})</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 10, maxHeight: 200, overflowY: "auto" }}>
                {tradeSrcMons.map((m, i) => (
                  <div key={i} onClick={() => setTradeMyMon(m === tradeMyMon ? null : m)} style={{ background: m === tradeMyMon ? "#4c1d95" : "#0d0d1a", border: `1px solid ${m === tradeMyMon ? "#7c3aed" : "#1f2937"}`, borderRadius: 8, padding: 6, cursor: "pointer", textAlign: "center" }}>
                    <img src={monSpriteUrl(m)} alt={m.name} style={{ width: 52, height: 52, imageRendering: "pixelated", objectFit: "contain" }} onError={(e) => { const t2 = e.target as HTMLImageElement; t2.src = `https://play.pokemonshowdown.com/sprites/dex/${(m.species || m.name).toLowerCase().replace(/[^a-z0-9]/g,"")}.png`; }} />
                    <div style={{ fontSize: 9, color: "#e5e7eb", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                    <div style={{ fontSize: 8, color: "#6b7280" }}>Lv.{m.level}</div>
                  </div>
                ))}
              </div>
              {tradeMode === "sell" && (
                <input value={tradePrice} onChange={e => setTradePrice(e.target.value)} type="number" placeholder="Sale price in Pokédollars" min={1} style={{ width: "100%", background: "#0d0d1a", border: "1px solid #374151", color: "#fff", borderRadius: 8, padding: "10px 12px", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 8 }} />
              )}
              <input value={tradeTargetId} onChange={e => setTradeTargetId(e.target.value)} placeholder="Target Player ID (10 digits)" style={{ width: "100%", background: "#0d0d1a", border: "1px solid #374151", color: "#fff", borderRadius: 8, padding: "10px 12px", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 10 }} />
              <button onClick={doProposeTrade} disabled={!tradeMyMon || tradeLoading} style={{ width: "100%", background: tradeMode === "sell" ? "linear-gradient(135deg,#16a34a,#15803d)" : "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: (!tradeMyMon || tradeLoading) ? 0.5 : 1 }}>
                {tradeLoading ? "Sending..." : tradeMode === "sell" ? `List ${tradeMyMon?.name || "..."} for ₽${Number(tradePrice)||0}` : `Offer ${tradeMyMon?.name || "..."}`}
              </button>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8, textAlign: "center" }}>Your ID: {player.id}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── MOD SCREEN ──────────────────────────────────────────────────────────
  if (screen === "mod") {
    const TAB_BTNS: Array<{id: "spectate"|"ban"|"announce"|"drop"|"codes"|"reset"|"transfers"|"trades"; label: string}> = [
      { id: "spectate", label: "Spectate" }, { id: "ban", label: "Ban/Unban" },
      { id: "announce", label: "Announce" }, { id: "drop", label: "Drop" },
      { id: "codes", label: "Codes" }, { id: "reset", label: "Reset Acc." },
      { id: "transfers", label: "Tx History" }, { id: "trades", label: "Trade Log" },
    ];
    const inp: React.CSSProperties = { width: "100%", background: "#0d0d1a", border: "1px solid #374151", color: "#fff", borderRadius: 8, padding: "10px 12px", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 8 };
    const doVerify = async () => {
      const ok = await verifyAdmin(adminKeyInput);
      if (ok) {
        setAdminAuthed(true); setAdminMsg({ text: "Admin access granted.", ok: true });
        adminListCodes(adminKeyInput).then(r => setAdminCodesList(r.codes || [])).catch(() => {});
      } else { setAdminMsg({ text: "Invalid key.", ok: false }); }
    };
    const doSpectate = async () => {
      try { const r = await adminGetPlayer(adminKeyInput, adminTargetId.trim()); setAdminTargetInfo(r.player); setAdminMsg({ text: `Found: ${r.player?.name}`, ok: true }); }
      catch (e: any) { setAdminMsg({ text: e.message, ok: false }); }
    };
    const doBan = async (ban: boolean) => {
      try {
        if (ban) await adminBanPlayer(adminKeyInput, adminTargetId.trim(), banReason);
        else await adminUnban(adminKeyInput, adminTargetId.trim());
        setAdminMsg({ text: `Player ${ban ? "banned" : "unbanned"}.`, ok: true });
      } catch (e: any) { setAdminMsg({ text: e.message, ok: false }); }
    };
    const doAnnounce = async () => {
      try {
        const r = await adminAnnounce(adminKeyInput, adminAnnounceSubj, adminAnnounceBody, adminAnnounceTarget || undefined);
        setAdminMsg({ text: `Announcement sent to ${r.count} players.`, ok: true });
        setAdminAnnounceSubj(""); setAdminAnnounceBody("");
      } catch (e: any) { setAdminMsg({ text: e.message, ok: false }); }
    };
    const doDrop = async () => {
      try {
        const r = await adminDrop(adminKeyInput, Number(adminDropMoney) || 0, adminDropItem, Number(adminDropQty) || 0, adminDropMsg2, adminDropTarget || undefined);
        setAdminMsg({ text: `Drop sent to ${r.count} players.`, ok: true });
      } catch (e: any) { setAdminMsg({ text: e.message, ok: false }); }
    };
    const doCreateCode = async () => {
      try {
        const r = await adminCreateCode(adminKeyInput, adminCodeKey, Number(adminCodeMoney) || 0, adminCodeItem, Number(adminCodeQty) || 0, Number(adminCodeUses) || 1);
        setAdminMsg({ text: `Code "${r.code}" created!`, ok: true });
        setAdminCodeKey(""); setAdminCodeMoney(""); setAdminCodeItem(""); setAdminCodeQty(""); setAdminCodeUses("1");
        adminListCodes(adminKeyInput).then(r2 => setAdminCodesList(r2.codes || [])).catch(() => {});
      } catch (e: any) { setAdminMsg({ text: e.message, ok: false }); }
    };
    const doRevokeCode = async (code: string) => {
      try {
        await adminDeleteCode(adminKeyInput, code);
        setAdminMsg({ text: `Code "${code}" revoked.`, ok: true });
        adminListCodes(adminKeyInput).then(r => setAdminCodesList(r.codes || [])).catch(() => {});
      } catch (e: any) { setAdminMsg({ text: e.message, ok: false }); }
    };
    const doResetAccount = async () => {
      if (!adminResetTarget.trim()) { setAdminMsg({ text: "Enter a Player ID.", ok: false }); return; }
      try {
        const r = await adminResetAccount(adminKeyInput, adminResetTarget.trim());
        setAdminResetResult(`Reset mail sent to ${r.name} (${adminResetTarget.trim()}). They will start fresh on next login.`);
        setAdminMsg({ text: `Account reset for ${r.name}.`, ok: true });
        setAdminResetTarget("");
      } catch (e: any) { setAdminMsg({ text: e.message, ok: false }); setAdminResetResult(null); }
    };
    const doGetTransferHistory = async () => {
      if (!adminHistTarget.trim()) { setAdminMsg({ text: "Enter a Player ID.", ok: false }); return; }
      try {
        const r = await adminGetTransferHistory(adminKeyInput, adminHistTarget.trim());
        setAdminHistTransfers(r.transfers || []);
        setAdminMsg({ text: `Loaded ${(r.transfers || []).length} transfers.`, ok: true });
      } catch (e: any) { setAdminMsg({ text: e.message, ok: false }); }
    };
    const doGetTradeHistory = async () => {
      if (!adminHistTarget.trim()) { setAdminMsg({ text: "Enter a Player ID.", ok: false }); return; }
      try {
        const r = await adminGetTradeHistory(adminKeyInput, adminHistTarget.trim());
        setAdminHistTrades(r.trades || []);
        setAdminMsg({ text: `Loaded ${(r.trades || []).length} trades.`, ok: true });
      } catch (e: any) { setAdminMsg({ text: e.message, ok: false }); }
    };
    return (
      <div style={S.root}><style>{css}</style>
        <div style={S.wrap}>
          <div style={S.header}>
            <BackBtn onClick={() => setScreen("world")} />
            <span className="page-header-title"><i className="fa-solid fa-shield-halved" style={{ marginRight: 6 }} />Mod Panel</span>
            {adminAuthed && <span style={{ fontSize: 10, color: "#4ade80" }}>✓ Auth</span>}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
            {adminMsg && <div style={{ background: adminMsg.ok ? "#14532d" : "#7f1d1d", border: `1px solid ${adminMsg.ok ? "#166534" : "#991b1b"}`, borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 12, color: "#fff" }}>{adminMsg.text}</div>}
            {!adminAuthed ? (
              <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 12 }}><i className="fa-solid fa-lock" style={{ marginRight: 8, color: "#7c3aed" }} />Admin Login</div>
                <input value={adminKeyInput} onChange={e => setAdminKeyInput(e.target.value)} type="password" placeholder="Admin Key" style={inp} onKeyDown={e => e.key === "Enter" && doVerify()} />
                <button onClick={doVerify} style={{ width: "100%", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#fff", border: "none", borderRadius: 8, padding: "11px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Verify Key</button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
                  {TAB_BTNS.map(t => (
                    <button key={t.id} onClick={() => setAdminTab(t.id)} style={{ background: adminTab === t.id ? "#7c3aed" : "#1f2937", color: "#fff", border: "none", borderRadius: 8, padding: "8px 10px", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>{t.label}</button>
                  ))}
                </div>
                <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 14 }}>
                  {adminTab === "spectate" && <>
                    <input value={adminTargetId} onChange={e => setAdminTargetId(e.target.value)} placeholder="Player ID" style={inp} />
                    <button onClick={doSpectate} style={{ width: "100%", background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff", border: "none", borderRadius: 8, padding: "11px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 10 }}>Fetch Player</button>
                    {adminTargetInfo && <div style={{ background: "#0d0d1a", border: "1px solid #374151", borderRadius: 8, padding: 10, fontSize: 12, color: "#d1d5db" }}>
                      <div style={{ marginBottom: 4 }}><b style={{ color: "#9ca3af" }}>Name:</b> {adminTargetInfo.name}</div>
                      <div style={{ marginBottom: 4 }}><b style={{ color: "#9ca3af" }}>Town:</b> {adminTargetInfo.hometown}</div>
                      <div style={{ marginBottom: 4 }}><b style={{ color: "#9ca3af" }}>Sprite:</b> {adminTargetInfo.sprite}</div>
                      <div><b style={{ color: "#9ca3af" }}>Banned:</b> <span style={{ color: adminTargetInfo.isBanned ? "#ef4444" : "#4ade80" }}>{adminTargetInfo.isBanned ? `Yes — ${adminTargetInfo.banReason}` : "No"}</span></div>
                    </div>}
                  </>}
                  {adminTab === "ban" && <>
                    <input value={adminTargetId} onChange={e => setAdminTargetId(e.target.value)} placeholder="Player ID to ban/unban" style={inp} />
                    <input value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Ban reason" style={inp} />
                    <button onClick={() => doBan(true)} style={{ width: "100%", background: "linear-gradient(135deg,#dc2626,#b91c1c)", color: "#fff", border: "none", borderRadius: 8, padding: "11px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 8 }}>Ban Player</button>
                    <button onClick={() => doBan(false)} style={{ width: "100%", background: "linear-gradient(135deg,#16a34a,#15803d)", color: "#fff", border: "none", borderRadius: 8, padding: "11px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Unban Player</button>
                  </>}
                  {adminTab === "announce" && <>
                    <input value={adminAnnounceSubj} onChange={e => setAdminAnnounceSubj(e.target.value)} placeholder="Subject" style={inp} />
                    <textarea value={adminAnnounceBody} onChange={e => setAdminAnnounceBody(e.target.value)} placeholder="Message body" style={{ ...inp, minHeight: 80, resize: "vertical" }} />
                    <input value={adminAnnounceTarget} onChange={e => setAdminAnnounceTarget(e.target.value)} placeholder="Target Player ID (blank = all players)" style={inp} />
                    <button onClick={doAnnounce} style={{ width: "100%", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#fff", border: "none", borderRadius: 8, padding: "11px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Send Announcement</button>
                  </>}
                  {adminTab === "drop" && <>
                    <input value={adminDropMoney} onChange={e => setAdminDropMoney(e.target.value)} placeholder="Money amount" type="number" style={inp} />
                    <input value={adminDropItem} onChange={e => setAdminDropItem(e.target.value)} placeholder="Item name (optional)" style={inp} />
                    <input value={adminDropQty} onChange={e => setAdminDropQty(e.target.value)} placeholder="Item quantity" type="number" style={inp} />
                    <input value={adminDropMsg2} onChange={e => setAdminDropMsg2(e.target.value)} placeholder="Message" style={inp} />
                    <input value={adminDropTarget} onChange={e => setAdminDropTarget(e.target.value)} placeholder="Target Player ID (blank = all)" style={inp} />
                    <button onClick={doDrop} style={{ width: "100%", background: "linear-gradient(135deg,#ea580c,#c2410c)", color: "#fff", border: "none", borderRadius: 8, padding: "11px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Send Drop</button>
                  </>}
                  {adminTab === "codes" && <>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 10 }}>Create Redeem Code</div>
                    <input value={adminCodeKey} onChange={e => setAdminCodeKey(e.target.value)} placeholder="Code (e.g. LAUNCH2024)" style={inp} />
                    <input value={adminCodeMoney} onChange={e => setAdminCodeMoney(e.target.value)} placeholder="Money reward (0 = none)" type="number" style={inp} />
                    <input value={adminCodeItem} onChange={e => setAdminCodeItem(e.target.value)} placeholder="Item reward (optional)" style={inp} />
                    <input value={adminCodeQty} onChange={e => setAdminCodeQty(e.target.value)} placeholder="Item qty" type="number" style={inp} />
                    <input value={adminCodeUses} onChange={e => setAdminCodeUses(e.target.value)} placeholder="Max uses (default 1)" type="number" style={inp} />
                    <button onClick={doCreateCode} style={{ width: "100%", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#fff", border: "none", borderRadius: 8, padding: "11px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 14 }}>Create Code</button>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af" }}>Active Codes ({adminCodesList.length})</div>
                      <button onClick={() => adminListCodes(adminKeyInput).then(r => setAdminCodesList(r.codes || [])).catch(() => {})} style={{ background: "#1f2937", color: "#9ca3af", border: "1px solid #374151", borderRadius: 6, padding: "4px 8px", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>Refresh</button>
                    </div>
                    {adminCodesList.map((c, i) => (
                      <div key={i} style={{ background: "#0d0d1a", border: "1px solid #1f2937", borderRadius: 6, padding: "7px 10px", marginBottom: 4, fontSize: 10, color: "#d1d5db", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <strong style={{ color: "#fff" }}>{c.code}</strong>
                          {c.money > 0 && <span style={{ color: "#4ade80" }}> +₽{c.money.toLocaleString()}</span>}
                          {c.item && <span style={{ color: "#a78bfa" }}> ×{c.itemQty} {c.item}</span>}
                          <span style={{ color: "#6b7280" }}> ({c.useCount}/{c.maxUses} uses)</span>
                        </div>
                        <button onClick={() => doRevokeCode(c.code)} style={{ flexShrink: 0, background: "#7f1d1d", color: "#fca5a5", border: "1px solid #991b1b", borderRadius: 5, padding: "4px 8px", fontSize: 9, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>Revoke</button>
                      </div>
                    ))}
                    {adminCodesList.length === 0 && <div style={{ fontSize: 11, color: "#4b5563", textAlign: "center" }}>No active codes. Create one above.</div>}
                  </>}
                  {adminTab === "reset" && <>
                    <div style={{ fontSize: 12, color: "#fca5a5", marginBottom: 10, background: "#7f1d1d", border: "1px solid #991b1b", borderRadius: 6, padding: "8px 10px" }}>
                      Warning: This sends a reset command to the player. Their progress will be wiped on next login.
                    </div>
                    <input value={adminResetTarget} onChange={e => setAdminResetTarget(e.target.value)} placeholder="Player ID to reset" style={inp} />
                    <button onClick={doResetAccount} style={{ width: "100%", background: "linear-gradient(135deg,#dc2626,#b91c1c)", color: "#fff", border: "none", borderRadius: 8, padding: "11px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 10 }}>Reset Account</button>
                    {adminResetResult && <div style={{ background: "#0d0d1a", border: "1px solid #374151", borderRadius: 8, padding: 10, fontSize: 11, color: "#9ca3af" }}>{adminResetResult}</div>}
                  </>}
                  {adminTab === "transfers" && <>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8 }}>Shows last 20 transactions (sent + received) for the player.</div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                      <input value={adminHistTarget} onChange={e => setAdminHistTarget(e.target.value)} placeholder="Player ID" style={{ ...inp, marginBottom: 0, flex: 1 }} />
                      <button onClick={doGetTransferHistory} style={{ flexShrink: 0, background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Search</button>
                    </div>
                    {adminHistTransfers.length === 0 && <div style={{ fontSize: 11, color: "#4b5563", textAlign: "center" }}>No results yet.</div>}
                    {adminHistTransfers.map((t, i) => (
                      <div key={i} style={{ background: "#0d0d1a", border: "1px solid #1f2937", borderRadius: 6, padding: "7px 10px", marginBottom: 4, fontSize: 10, color: "#d1d5db" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: t.fromId === adminHistTarget ? "#ef4444" : "#4ade80" }}>
                            {t.fromId === adminHistTarget ? `→ ${String(t.toId).slice(-6)}` : `← ${t.fromName}`}
                          </span>
                          <span style={{ color: t.fromId === adminHistTarget ? "#ef4444" : "#4ade80", fontWeight: 700 }}>
                            {t.fromId === adminHistTarget ? "-" : "+"}₽{t.amount.toLocaleString()}
                          </span>
                        </div>
                        {t.note && <div style={{ color: "#6b7280", fontSize: 9, marginTop: 2 }}>"{t.note}"</div>}
                        <div style={{ color: "#4b5563", fontSize: 9 }}>{new Date(t.createdAt).toLocaleString()}</div>
                      </div>
                    ))}
                  </>}
                  {adminTab === "trades" && <>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8 }}>Shows last 10 trades involving this player.</div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                      <input value={adminHistTarget} onChange={e => setAdminHistTarget(e.target.value)} placeholder="Player ID" style={{ ...inp, marginBottom: 0, flex: 1 }} />
                      <button onClick={doGetTradeHistory} style={{ flexShrink: 0, background: "linear-gradient(135deg,#ea580c,#c2410c)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Search</button>
                    </div>
                    {adminHistTrades.length === 0 && <div style={{ fontSize: 11, color: "#4b5563", textAlign: "center" }}>No results yet.</div>}
                    {adminHistTrades.map((t, i) => (
                      <div key={i} style={{ background: "#0d0d1a", border: "1px solid #1f2937", borderRadius: 6, padding: "7px 10px", marginBottom: 4, fontSize: 10, color: "#d1d5db" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                          <span style={{ color: "#a78bfa", fontWeight: 700 }}>{t.proposerMonName}</span>
                          <span style={{ background: t.status === "accepted" ? "#14532d" : t.status === "declined" ? "#7f1d1d" : "#1f2937", padding: "1px 6px", borderRadius: 3, fontSize: 9, color: "#fff" }}>{t.mode === "sell" ? "SELL" : "SWAP"} · {t.status}</span>
                        </div>
                        <div style={{ color: "#6b7280" }}>
                          {t.proposerName} → …{String(t.targetId).slice(-4)}
                          {t.mode === "sell" && <span style={{ color: "#4ade80" }}> · ₽{(t.price||0).toLocaleString()}</span>}
                        </div>
                        <div style={{ color: "#4b5563", fontSize: 9 }}>{new Date(t.createdAt).toLocaleString()}</div>
                      </div>
                    ))}
                  </>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "card") return (
    <div style={S.root}><style>{css}</style>
      <div style={S.wrap}>
        <div style={S.header}>
          <BackBtn onClick={() => setScreen("world")} />
          <span className="page-header-title">Edit Card</span>
          <div style={{ width: 88 }} />
        </div>

        {/* Full-size preview */}
        <div style={{ margin: 16, background: "#0d0d1a", border: "2px solid #7c3aed", borderRadius: 8, padding: 16, boxShadow: "0 4px 15px rgba(0,0,0,0.5)", fontFamily: "'Press Start 2P', monospace" }}>
          <div style={{ textAlign: "right", fontSize: 9, color: "#aaa", marginBottom: 6, letterSpacing: 1 }}>
            IDNo. {player.id}
          </div>
          {(() => {
            const cardProg = rankProgress(player.exp);
            const cardPct = cardProg.isMax ? 100 : Math.min(100, Math.round((cardProg.current / cardProg.needed) * 100));
            return (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #7c3aed", paddingBottom: 8, marginBottom: 10 }}>
                  <div style={{ fontSize: 13, color: "#fff", textShadow: "1px 1px #000", letterSpacing: 1 }}>TRAINER CARD</div>
                  <div style={{ fontSize: 11, color: "#fff", fontWeight: 700 }}>Rank {cardProg.rank}{cardProg.isMax ? " ★" : ""}</div>
                </div>
                <div style={{ fontSize: 10, color: "#bbb", marginBottom: 12, letterSpacing: 0.5 }}>
                  {player.hometown} • {player.name}
                </div>
                <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src={TRAINER_SPRITE(player.sprite)} alt="Trainer" style={{ width: "100%", imageRendering: "pixelated" }} />
                  </div>
                  <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {[
                      { label: "EXP. POINTS", val: cardProg.totalExp.toLocaleString(), col: "#fff" },
                      { label: cardProg.isMax ? "MAX RANK" : "TO NEXT RANK", val: cardProg.isMax ? "★" : cardProg.toNext.toLocaleString(), col: cardProg.isMax ? "#FFD700" : "#fff" },
                      { label: "WINS", val: player.wins, col: "#4CAF50" },
                      { label: "LOSSES", val: player.losses, col: "#F44336" },
                    ].map((stat, i) => (
                      <div key={i} style={{ background: "#13102a", border: "1px solid #2d2050", padding: "7px 8px", borderRadius: 4 }}>
                        <div style={{ fontSize: 8, color: "#aaa", marginBottom: 5, letterSpacing: 0.5 }}>{stat.label}</div>
                        <div style={{ fontSize: 11, color: stat.col }}>{stat.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 9, color: "#bbb", marginBottom: 6, letterSpacing: 0.5 }}>
                    {cardProg.isMax
                      ? `EXP PROGRESS — MAX RANK`
                      : `EXP PROGRESS (${cardProg.current.toLocaleString()} / ${cardProg.needed.toLocaleString()})`}
                  </div>
                  <div style={{ background: "#1a1a2e", height: 13, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${cardPct}%`, background: cardProg.isMax ? "#FFD700" : "#8b22d9", height: "100%" }} />
                  </div>
                </div>
              </>
            );
          })()}
          <div style={{ borderTop: "1px solid #2d2050", paddingTop: 8, textAlign: "right", fontSize: 9, color: "#aaa" }}>
            Adventure started: {player.adventureStarted}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: "#E91E63", marginBottom: 8 }}>TRAINER NAME</div>
            <input value={player.name} onChange={(e) => setPlayer({ ...player, name: e.target.value })} maxLength={12}
              style={{ background: "#111", border: "1px solid #333", color: "#fff", fontSize: 14, padding: "8px", borderRadius: 4, width: "100%" }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#E91E63", marginBottom: 8 }}>HOMETOWN</div>
            <input value={player.hometown} onChange={(e) => setPlayer({ ...player, hometown: e.target.value })} maxLength={20}
              style={{ background: "#111", border: "1px solid #333", color: "#fff", fontSize: 14, padding: "8px", borderRadius: 4, width: "100%" }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#E91E63", marginBottom: 8 }}>CHOOSE AVATAR (GEN V)</div>
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
      sfx.heal(); addLog("Your team was fully healed!", "#4CAF50");
      setBattle(null);
      setScreen("hunt");
    };
    return (
      <div style={{ ...S.root, background: "#0a0a0c" }}>
        <style>{css}{`
          .wb-close-btn {
            background: #1c1c1e;
            border: 1px solid #2a2a2d;
            color: #ffffff;
            padding: 8px 14px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 1px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            flex-shrink: 0;
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
          @keyframes megaPulse {
            0%, 100% { box-shadow: 0 0 20px rgba(219,39,119,0.6), 0 0 40px rgba(124,58,237,0.4); transform: scale(1); }
            50% { box-shadow: 0 0 30px rgba(219,39,119,0.9), 0 0 60px rgba(124,58,237,0.7); transform: scale(1.02); }
          }
        `}</style>
        <div style={{ ...S.wrap, background: "#0a0a0c", fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", padding: "16px 16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "2px solid #c0392b" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button className="wb-close-btn" onClick={runAway}>◀ BACK</button>
              <div className="page-header-title">Wild Battle</div>
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
                  <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.5, color: wild.isShiny ? "#FFD700" : "#f0f0f0" }}>{wild.isShiny ? "✨ " : ""}{wild.name}</span>
                  <span style={{ fontSize: 11, color: "#888890" }}>Lv{wild.level}</span>
                </div>
                <div style={{ marginBottom: 5, display: "flex", gap: 4 }}>
                  {wild.type1 && (
                    <span style={{ display: "inline-block", padding: "1px 7px", borderRadius: 4, fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", background: (TYPE_COLORS[wild.type1] ?? "#444") + "33", color: TYPE_COLORS[wild.type1] ?? "#f0f0f0", border: `1px solid ${(TYPE_COLORS[wild.type1] ?? "#444")}66` }}>{wild.type1}</span>
                  )}
                  {wild.type2 && (
                    <span style={{ display: "inline-block", padding: "1px 7px", borderRadius: 4, fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", background: (TYPE_COLORS[wild.type2] ?? "#444") + "33", color: TYPE_COLORS[wild.type2] ?? "#f0f0f0", border: `1px solid ${(TYPE_COLORS[wild.type2] ?? "#444")}66` }}>{wild.type2}</span>
                  )}
                </div>
                <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden", marginBottom: 4 }}>
                  <div style={{ height: "100%", borderRadius: 3, transition: "width 0.4s ease", width: `${wildHpPct}%`, background: wildHpClass }} />
                </div>
                <div style={{ fontSize: 12, color: "#888890" }}>{wild.currentHp}/{wild.maxHp}</div>
              </div>
            </div>

            {/* Enemy sprite — top-right */}
            <div style={{ position: "absolute", top: 10, right: 14, zIndex: 3 }}>
              {ballAnim !== "capture" && ballAnim !== "wobble" && ballAnim !== "success" && (
                <MonSprite sprite={wild.sprite} size={110} isShiny={wild.isShiny} className={
                  shakeE ? "mon-shake" : (ballAnim === "fail" ? "" : "mon-float")
                } style={{ filter: wild.isShiny ? "drop-shadow(0 6px 18px rgba(255,215,0,0.8))" : "drop-shadow(0 6px 12px rgba(0,0,0,0.7))" }} />
              )}
              {ballAnim === "capture" && (
                <MonSprite sprite={wild.sprite} size={110} isShiny={wild.isShiny} className="mon-suck" style={{ filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.7))" }} />
              )}
              {moveAnim?.target === "enemy" && <MoveFx key={moveAnim.key} type={moveAnim.type} />}
            </div>

            {/* Player sprite — bottom-left */}
            <div style={{ position: "absolute", bottom: 12, left: 12, zIndex: 3 }}>
              <MonSprite sprite={pMon.sprite} size={95} back isShiny={pMon.isShiny} className={shakeP ? "mon-shake" : "mon-float"} style={{ filter: pMon.isShiny ? "drop-shadow(0 6px 18px rgba(255,215,0,0.8))" : "drop-shadow(0 6px 12px rgba(0,0,0,0.8))" }} />
              {moveAnim?.target === "player" && <MoveFx key={moveAnim.key} type={moveAnim.type} />}
            </div>

            {/* Player info card — bottom-right */}
            <div style={{ position: "absolute", bottom: 12, right: 12, zIndex: 4 }}>
              <div className="wb-info-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.5, color: pMon.isShiny ? "#FFD700" : "#f0f0f0" }}>{pMon.isShiny ? "✨ " : ""}{pMon.name}</span>
                  <span style={{ fontSize: 11, color: "#888890" }}>Lv{pMon.level}</span>
                </div>
                <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden", marginBottom: 4 }}>
                  <div style={{ height: "100%", borderRadius: 3, transition: "width 0.4s ease", width: `${pHpPct}%`, background: pHpClass }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "#888890" }}>{pMon.currentHp}/{pMon.maxHp}</span>
                  <span style={{ fontSize: 12, color: "#888890" }}>ATK: {pMon.atk}</span>
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
                  <div style={{ fontSize: 12, color: "#888890", letterSpacing: 0.3 }}>
                    PWR: {md.power || "—"} · ACC: {md.accuracy}% · {md.type}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Mega Evolve button */}
          {(() => {
            const megaEntry = Object.entries(STONE_TO_SPRITE).find(
              ([stone, spr]) => spr === pMon.sprite && inventory.some((it) => it.name === stone && it.qty > 0)
            );
            if (!megaEntry || battle.hasMegaEvolved) return null;
            return (
              <button
                onClick={doMegaEvolve}
                style={{
                  width: "100%", padding: "14px 10px", borderRadius: 12, fontSize: 13, fontWeight: 800,
                  letterSpacing: 2, textTransform: "uppercase", cursor: "pointer",
                  background: "linear-gradient(135deg, #7c3aed 0%, #db2777 100%)",
                  border: "2px solid #f0abfc", color: "#fff",
                  boxShadow: "0 0 20px rgba(219,39,119,0.6), 0 0 40px rgba(124,58,237,0.4)",
                  animation: "megaPulse 1.5s ease-in-out infinite",
                }}>
                🌟 MEGA EVOLVE
              </button>
            );
          })()}

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
                    style={{ border: "1px solid #555", color: "#888", padding: "3px 8px", borderRadius: 6, fontSize: 12 }}
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
                            <span style={{ fontSize: 12, color: isActive ? "#FFD700" : "#888" }}>
                              {isActive ? "★ IN BATTLE" : fainted ? "FAINTED" : `Lv${m.level}`}
                            </span>
                          </div>
                          <div style={{ marginTop: 4 }}><HpBar cur={m.currentHp} max={m.maxHp} /></div>
                          <div style={{ fontSize: 12, color: "#6b7896", marginTop: 2 }}>
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
                    style={{ border: "1px solid #555", color: "#888", padding: "3px 8px", borderRadius: 6, fontSize: 12 }}
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
                        <div style={{ fontSize: 12, color: "#9aa0b4", marginTop: 4 }}>{BALL_BLURB[name]}</div>
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
          <BackBtn onClick={() => setScreen("world")} />
          <span className="page-header-title">My Teams</span>
          <div style={{ width: 88 }} />
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
                  padding: "6px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                <i className="fa-solid fa-users" style={{ fontSize: 12 }} />
                {t.name} <span style={{ fontSize: 11, color: sel ? "#FFB74D" : "#555" }}>{t.mons.length}/{TEAM_MAX}</span>
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
              padding: "6px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700,
              display: "flex", alignItems: "center", gap: 6,
            }}>
            <i className="fa-solid fa-plus" style={{ fontSize: 12 }} /> ADD TEAM
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
                padding: "6px 8px", borderRadius: 999, fontSize: 12,
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
                  <span style={{ fontSize: 12, color: "#fff" }}>{m.name}</span>
                  <span style={{ fontSize: 11, color: i === 0 ? "#FFD700" : "#555" }}>{i === 0 ? "★ LEAD" : ""} Lv{m.level}</span>
                </div>
                <div style={{ display: "flex", gap: 3, marginBottom: 5 }}>{typeTag(m.type1)}{typeTag(m.type2)}</div>
                <HpBar cur={m.currentHp} max={m.maxHp} />
                <div style={{ fontSize: 10, color: "#888", marginTop: 3 }}>
                  HP:{m.currentHp}/{m.maxHp} ATK:{m.atk} DEF:{m.def}
                </div>
                <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>
                  {m.moves.join(" · ")}
                </div>
              </div>
            </div>
          ))}
          {team.length === 0 && <div style={{ textAlign: "center", color: "#333", fontSize: 12, marginTop: 40 }}>No Pokémon in team!</div>}
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
                    style={{ border: "1px solid #555", color: "#888", padding: "3px 8px", borderRadius: 6, fontSize: 12 }}
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
                  style={{ border: "1px solid #555", color: "#888", padding: "3px 8px", borderRadius: 6, fontSize: 12 }}
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
                      <div style={{ fontSize: 12, color: "#888" }}>Lv{m.level} · HP {m.currentHp}/{m.maxHp}</div>
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
                  style={{ border: "1px solid #555", color: "#888", padding: "3px 8px", borderRadius: 6, fontSize: 12 }}
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
                      <div style={{ fontSize: 12, color: "#888" }}>Lv{m.level}{i === 0 ? " · ★ LEAD" : ""}</div>
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
                  style={{ border: "1px solid #555", color: "#888", padding: "3px 8px", borderRadius: 6, fontSize: 12 }}
                  onClick={() => setShowAddMonPicker(false)}>✕</button>
              </div>
              <div style={{ fontSize: 10, color: "#6b7896" }}>
                Pick from your Mons collection — moves the actual Pokémon (with its level, IVs &amp; EVs) into {teams[activeTeamIdx]?.name}.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, overflowY: "auto" }}>
                {box.length === 0 && (
                  <div style={{ gridColumn: "1 / -1", textAlign: "center", color: "#666", fontSize: 12, padding: 20 }}>
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
                    <div style={{ fontSize: 11, color: "#fff" }}>{bm.nickname ?? bm.name}</div>
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
          <BackBtn onClick={() => setScreen("world")} />
          <span className="page-header-title">Bag</span>
          <div style={{ width: 88 }} />
        </div>
        {(() => {
          const bagCats = [
            { key: "balls", label: "BALLS", emoji: "🔴", color: "#F44336", match: (n: string) => /ball/i.test(n) },
            { key: "tms", label: "TMs", emoji: "💿", color: "#9C27B0", match: (n: string) => /^TM/i.test(n) || /^HM/i.test(n) },
            { key: "eggs", label: "EGGS", emoji: "🥚", color: "#FFEB3B", match: (n: string) => /egg/i.test(n) },
            // KEY ITEMS no longer matches "pass" — Safari Pass and similar
            // permit-style items belong under OTHERS instead.
            { key: "key", label: "KEY ITEMS", emoji: "🔑", color: "#FF9800", match: (n: string) => /(bike|rod|key|map|card|ticket|flute|stone tablet)/i.test(n) },
            { key: "stones", label: "STONES", emoji: "💎", color: "#03A9F4", match: (n: string) => (/stone|shard/i.test(n) && !/stone tablet/i.test(n)) || n in MEGA_STONES },
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
                <div style={{ fontSize: 11, color: active.color, marginBottom: 2 }}>{active.emoji} {active.label}</div>
                {filtered.length === 0 && (
                  <div style={{ textAlign: "center", color: "#333", fontSize: 12, marginTop: 30 }}>
                    No {active.label.toLowerCase()} in your bag
                  </div>
                )}
                {filtered.map((it) => (
                  <div key={it.name} style={{ border: "2px solid #222", borderRadius: 8, padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#ddd" }}>{it.name}</span>
                    <span style={{ fontSize: 11, color: "#FFC107" }}>×{it.qty}</span>
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
            <BackBtn onClick={() => { setScoutedWild(null); setScreen("world"); }} />
            <div className="page-header-title">Wild Hunt</div>
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
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#f0f0f0", textAlign: "center", lineHeight: 1.2, maxWidth: 64, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
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
              <span className="hunt-act-label">HUNT</span>
            </button>
            <button className="hunt-act-btn hunt-bt"
              disabled={!scoutedWild}
              onClick={captureScouted}>
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
    // Build a team using the EFFECTIVE settings (host's own settings, or the
    // host's settings synced down to the joiner via the WebSocket).
    function buildTeamWith(mode: "ranked" | "unranked" | "random", s: typeof bbSettings): Mon[] {
      if (mode === "random") {
        return Array.from({ length: s.teamSize }, () => {
          const pool = s.allowLegendaries ? ALL_POKEMON : ALL_POKEMON.filter((p) => !ALL_LEGENDARY_IDS.has(p.id));
          const tpl = pool[Math.floor(Math.random() * pool.length)];
          const lv = s.randomLevelMin + Math.floor(Math.random() * (s.randomLevelMax - s.randomLevelMin + 1));
          return makeMon(tpl, lv);
        });
      }
      return team.slice(0, s.teamSize);
    }
    function startHostRoom(mode: "ranked" | "unranked" | "random") {
      sfx.menuOpen();
      setBbMode(mode);
      setBbRoom({ code: "…", isHost: true, status: "waiting" });
      // Host: use my own settings as the canonical settings. They get shipped
      // to the server and from there to whoever joins.
      pvpConnect(true, undefined, mode, bbSettings, (s) => buildTeamWith(mode, s));
    }
    function joinRoom(mode: "ranked" | "unranked" | "random") {
      if (bbJoinCode.trim().length < 4) { addLog("Enter a valid room code.", "#F44336"); return; }
      sfx.menuOpen();
      setBbMode(mode);
      const code = bbJoinCode.trim().toUpperCase();
      setBbRoom({ code, isHost: false, status: "waiting" });
      // Joiner: pass our own settings as a placeholder; pvpConnect will replace
      // them with the host's canonical settings when "joined" arrives, then
      // build our team using the synced settings.
      pvpConnect(false, code, mode, bbSettings, (s) => buildTeamWith(mode, s));
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
            <BackBtn onClick={() => { sfx.menuBack(); if (bbRoom) { setBbRoom(null); setBbMode(null); } else { setScreen("world"); } }} />
            <div className="page-header-title">Battle Box</div>
            <button className="btn"
              style={{ border: "1px solid var(--m-border)", color: "var(--m-muted)", padding: "6px 10px", borderRadius: 8, background: "transparent", fontSize: 11, fontWeight: 600 }}
              onClick={() => { sfx.click(); setBbShowSettings(true); }}>
              <i className="fa-solid fa-sliders" />
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, padding: "10px 16px", borderBottom: "1px solid var(--m-border)" }}>
            <div className="m-card" style={{ flex: 1, padding: 10, borderRadius: 12, textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "var(--m-muted)", letterSpacing: 1 }}>RANK</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#FFD700" }}>{player.rank ?? 1000}</div>
            </div>
            <div className="m-card" style={{ flex: 1, padding: 10, borderRadius: 12, textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "var(--m-muted)", letterSpacing: 1 }}>WINS</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#4ade80" }}>{player.wins}</div>
            </div>
            <div className="m-card" style={{ flex: 1, padding: 10, borderRadius: 12, textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "var(--m-muted)", letterSpacing: 1 }}>LOSSES</div>
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
                          <div style={{ fontSize: 12, color: "var(--m-muted)", textTransform: "uppercase" }}>{h.mode}</div>
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
            <BackBtn onClick={() => { sfx.menuBack(); setScreen("profile"); }} />
            <div className="page-header-title">Pokémon Caught</div>
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
                        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--m-muted)" }}>Gen {reg.gen}</span>
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
                            <div style={{ fontSize: 12, color: "var(--m-muted)" }}>#{String(p.id).padStart(3, "0")}</div>
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
            <BackBtn onClick={() => setScreen("world")} />
            <span className="page-header-title">My Mons</span>
            <div style={{ width: 88 }} />
          </div>

          <div style={{ padding: "10px 12px 4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#aaa" }}>{teamOwned.length} in teams · {boxOwned.length} in collection</span>
            <span style={{ fontSize: 12, color: "#26A69A" }}>{allOwned.length} owned</span>
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
              style={{ flex: 1, border: "1px solid #2a3148", background: "#0d1322", color: "#fff", padding: "6px 10px", borderRadius: 8, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
              <span><i className="fa-solid fa-arrow-down-wide-short" style={{ marginRight: 6, color: "#26A69A" }} /> Sort: {currentSortLabel}</span>
              <i className="fa-solid fa-caret-down" style={{ color: "#6b7896" }} />
            </button>
            <button className="btn"
              onClick={() => setMonsSortDir((d) => d === "max" ? "min" : "max")}
              title={`Direction: ${monsSortDir === "max" ? "Max First" : "Min First"}`}
              style={{ border: "1px solid #2a3148", background: "#0d1322", color: monsSortDir === "max" ? "#FFD700" : "#26A69A", padding: "6px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer", minWidth: 80 }}>
              {monsSortDir === "max" ? "↓ Max" : "↑ Min"}
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "4px 10px 14px" }}>
            {allOwned.length === 0 && (
              <div style={{ textAlign: "center", color: "#666", fontSize: 12, marginTop: 50, lineHeight: 2 }}>
                You don't own any Pokémon yet.<br />
                <span style={{ fontSize: 11, color: "#444" }}>Hunt, buy, or redeem to start your collection!</span>
              </div>
            )}
            {sorted.length === 0 && allOwned.length > 0 && (
              <div style={{ textAlign: "center", color: "#666", fontSize: 12, marginTop: 30 }}>
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
                        <span style={{ position: "absolute", top: 2, right: 4, fontSize: 10, color: "#FFD700" }} title={o.teamName ?? ""}>
                          <i className="fa-solid fa-star" />
                        </span>
                      )}
                      <div style={{ fontSize: 5, color: "#888" }}>#{String(m.id).padStart(3, "0")}</div>
                      <MonSprite sprite={m.sprite} size={44} className="" />
                      <div style={{ fontSize: 11, color: "#fff", fontWeight: 700, lineHeight: 1.2 }}>{m.nickname ?? m.name}</div>
                      <div style={{ fontSize: 10, color: "#aaa" }}>Lv {m.level} · IV {iv}%</div>
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
                            {m.nickname ?? m.name} {o.teamIdx >= 0 && <i className="fa-solid fa-star" style={{ fontSize: 11, color: "#FFD700", marginLeft: 4 }} />}
                          </span>
                          <span style={{ fontSize: 12, color: "#FFD700" }}>CP {cp}</span>
                        </div>
                        <div style={{ display: "flex", gap: 4, marginTop: 3 }}>{typeTag(m.type1)}{m.type2 && typeTag(m.type2)}</div>
                        <div style={{ fontSize: 11, color: "#aaa", marginTop: 3 }}>
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
                    style={{ border: "1px solid #555", color: "#888", padding: "3px 8px", borderRadius: 6, fontSize: 12 }}
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
              <BackBtn onClick={() => setScreen("mons")} />
              <span className="page-header-title">Pokémon</span>
              <div style={{ width: 88 }} />
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
      // Use the species template's canEvolve / evolveAt fields (Dex-based) so
      // evolution only triggers when the proper conditions are met.
      const curTpl = ALL_POKEMON.find((p) => p.id === m.id);
      const nextId = curTpl?.canEvolve;
      // No next stage at all → final form, cannot evolve.
      if (!curTpl || !nextId) {
        if (typeof window !== "undefined") {
          window.alert(`${m.nickname ?? m.name} cannot evolve any further — it is already in its final form.`);
        }
        addLog(`${m.nickname ?? m.name} cannot evolve any further.`, "#F44336");
        return;
      }
      const nextTpl = ALL_POKEMON.find((p) => p.id === nextId);
      if (!nextTpl) {
        if (typeof window !== "undefined") {
          window.alert(`${m.nickname ?? m.name} cannot evolve any further.`);
        }
        addLog(`${m.nickname ?? m.name} cannot evolve any further.`, "#F44336");
        return;
      }
      // Level-based evolution gate (Dex evolveAt).
      const requiredLevel = curTpl.evolveAt ?? null;
      if (requiredLevel != null && m.level < requiredLevel) {
        const need = requiredLevel - m.level;
        if (typeof window !== "undefined") {
          window.alert(
            `Conditions to evolve ${m.nickname ?? m.name} have not been met.\n\n` +
            `Required: Level ${requiredLevel}\n` +
            `Current:  Level ${m.level}\n` +
            `Train ${need} more level${need === 1 ? "" : "s"} for ${m.name} to evolve into ${nextTpl.name}.`
          );
        }
        addLog(`${m.nickname ?? m.name} needs Lv ${requiredLevel} to evolve (currently Lv ${m.level}).`, "#F44336");
        return;
      }
      // All conditions met — confirm and evolve.
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
        {bonus && <span style={{ fontSize: 12, color: bonus === "+" ? "#4ade80" : bonus === "-" ? "#F44336" : "#888" }}>({bonus})</span>}
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

    // ---- New Mons stats UI (matches the iOS-style mockup) ----
    const FONT_BASE = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    const FONT_MONO = "'Courier New', Courier, monospace";
    const C = {
      bgDark: "#000000",
      bgPanel: "#222224",
      bgBlackPanel: "#050505",
      textMain: "#ffffff",
      textMuted: "#8e8e93",
      cyan: "#32d4e5",
      btnDark: "#1c1c1e",
      borderDim: "#1a1a1a",
      borderTab: "#333333",
    };

    const typeBadge = (t: string) => {
      const bg = TYPE_COLORS[t] ?? "#999";
      // Pick a readable text color: light bg → black text, dark bg → white text.
      const lightTypes = new Set(["Normal", "Electric", "Ice", "Ground", "Bug", "Steel", "Fairy"]);
      const fg = lightTypes.has(t) ? "#000" : "#fff";
      return (
        <span key={t} style={{
          padding: "4px 12px",
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 600,
          background: bg,
          color: fg,
          fontFamily: FONT_BASE,
        }}>{t}</span>
      );
    };

    const typeText = m.type1 + (m.type2 ? ` / ${m.type2}` : "");
    const expPct = Math.min(100, (m.exp / Math.max(1, m.expNeeded)) * 100);
    const needNext = Math.max(0, m.expNeeded - m.exp);
    const gender = m.id % 8 === 0 ? "Genderless" : m.id % 2 === 0 ? "Female" : "Male";

    // Sprite URL for the new UI — custom sprite if available, otherwise Showdown animated gif.
    const _spriteKey = (m.sprite || m.name).toLowerCase().replace(/[^a-z0-9-]/g, "");
    const spriteUrl = CUSTOM_SPRITE_URL(_spriteKey) ?? `https://play.pokemonshowdown.com/sprites/ani/${_spriteKey}.gif`;

    // Plays this Pokémon's cry from the bundled PokeRogue assets, falling
    // back to PokéAPI's cries CDN if the local file is missing.
    const playCry = () => {
      sfx.click();
      const localUrl = `/audio/cry/${m.id}.m4a`;
      const remoteFallback = `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${m.id}.ogg`;
      const a = new Audio(localUrl);
      a.volume = 0.6;
      a.onerror = () => {
        const b = new Audio(remoteFallback);
        b.volume = 0.5;
        b.play().catch(() => {});
      };
      a.play().catch(() => {
        const b = new Audio(remoteFallback);
        b.volume = 0.5;
        b.play().catch(() => {});
      });
    };

    // Stat row used in the Stats tab — keeps the new monochrome look.
    const newStatRow = (label: string, val: number, max: number) => (
      <div key={label} style={{ marginBottom: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
          <span style={{ color: C.textMuted }}>{label}</span>
          <span style={{ color: C.textMain, fontWeight: 600 }}>{val}</span>
        </div>
        <div style={{ width: "100%", height: 6, background: "#1a1a2e", borderRadius: 3, border: "1px solid #2a2a4a", overflow: "hidden" }}>
          <div style={{ width: `${Math.min(100, (val / max) * 100)}%`, height: "100%", background: C.cyan }} />
        </div>
      </div>
    );

    return (
      <div style={{ background: C.bgDark, minHeight: "100vh", display: "flex", justifyContent: "center", color: C.textMain, fontFamily: FONT_BASE }}>
        <div style={{
          width: "100%",
          maxWidth: 400,
          background: C.bgDark,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          paddingBottom: 100,
          position: "relative",
        }}>
          {/* Header */}
          <header style={{ display: "flex", alignItems: "center", padding: 16, position: "relative" }}>
            <BackBtn onClick={() => { sfx.menuBack(); setScreen("mons"); }} />
            <div className="page-header-title" style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              flex: "unset",
            }}>{m.nickname ?? m.name}</div>
          </header>

          {/* Sprite display — entire panel is tappable to play the Pokémon's cry */}
          <div
            onClick={playCry}
            title="Tap to play cry"
            style={{
              background: C.bgPanel,
              margin: "0 16px",
              borderRadius: 12,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "40px 0 16px 0",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <img
              src={spriteUrl}
              alt={`${m.name} sprite`}
              style={{ height: 120, imageRendering: "pixelated", pointerEvents: "none" }}
              onError={(e) => {
                const t = e.currentTarget;
                if (!t.dataset.fallback) {
                  t.dataset.fallback = "1";
                  t.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${m.id}.png`;
                }
              }}
            />
            <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 6, color: C.textMuted, fontSize: 12 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={C.textMuted}>
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
              Tap to play cry
            </div>
          </div>

          {/* Title + types box */}
          <div style={{
            background: C.bgBlackPanel,
            margin: "16px 16px 0 16px",
            padding: "12px 16px",
            borderRadius: 8,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            border: `1px solid ${C.borderDim}`,
          }}>
            <h1 style={{ fontSize: 24, fontWeight: "bold", margin: 0, color: C.textMain, fontFamily: FONT_BASE }}>
              {m.nickname ?? m.name}
            </h1>
            <div style={{ display: "flex", gap: 8 }}>
              {typeBadge(m.type1)}
              {m.type2 && typeBadge(m.type2)}
            </div>
          </div>

          {/* Tab content panel (matches the .stats-content black panel) */}
          <div style={{
            background: C.bgBlackPanel,
            margin: "16px 16px 0 16px",
            padding: 16,
            borderRadius: 12,
            fontFamily: FONT_BASE,
            fontSize: 13,
            lineHeight: 1.5,
            color: C.textMain,
            border: `1px solid ${C.borderDim}`,
          }}>
            {monDetailTab === "info" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div><span style={{ color: C.textMuted }}>Level: </span><b style={{ fontWeight: 600 }}>{m.level}</b> <span style={{ color: C.textMuted }}>| Nature: </span><b style={{ fontWeight: 600 }}>{m.nature ?? "Hardy"}</b></div>
                <div><span style={{ color: C.textMuted }}>Types: </span><b style={{ fontWeight: 600 }}>{typeText}</b></div>
                <div><span style={{ color: C.textMuted }}>Gender: </span><b style={{ fontWeight: 600 }}>{gender}</b></div>

                <div><span style={{ color: C.textMuted }}>EXP: </span><b style={{ fontWeight: 600 }}>{m.exp.toLocaleString()}</b></div>
                <div><span style={{ color: C.textMuted }}>Need To Next Level: </span><b style={{ fontWeight: 600 }}>{needNext.toLocaleString()}</b></div>
                <div style={{ width: "100%", height: 6, background: "#1a1a2e", borderRadius: 3, margin: "8px 0 4px", border: "1px solid #2a2a4a", position: "relative", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.max(2, expPct)}%`, background: "#3b3b6d" }} />
                </div>
                <div style={{ fontSize: 11, color: C.textMuted }}>
                  Caught: {m.caughtAt ? new Date(m.caughtAt).toLocaleDateString() : "—"} • Origin: {m.origin ?? "—"}
                </div>
              </div>
            )}

            {monDetailTab === "stats" && (
              <div>
                {newStatRow("HP", m.maxHp, 400)}
                {newStatRow("Attack", m.atk, 250)}
                {newStatRow("Defense", m.def, 250)}
                {newStatRow("Sp. Attack", m.spa, 250)}
                {newStatRow("Sp. Defense", m.spd, 250)}
                {newStatRow("Speed", m.spe, 250)}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.cyan, marginTop: 6, paddingTop: 6, borderTop: "1px solid #1a1a2e" }}>
                  <span>Total</span>
                  <span style={{ fontWeight: 700 }}>{m.maxHp + m.atk + m.def + m.spa + m.spd + m.spe}</span>
                </div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                  CP {cp} • IV Avg {iv}%
                </div>
              </div>
            )}

            {monDetailTab === "iv" && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 70px", fontSize: 12, color: C.textMuted, paddingBottom: 4, borderBottom: "1px solid #1a1a2e", marginBottom: 4 }}>
                  <span>Stat</span>
                  <span style={{ textAlign: "right" }}>IV</span>
                  <span style={{ textAlign: "right" }}>EV</span>
                </div>
                {([
                  ["HP", m.ivHp ?? 0, m.evHp ?? 0],
                  ["Attack", m.ivAtk ?? 0, m.evAtk ?? 0],
                  ["Defense", m.ivDef ?? 0, m.evDef ?? 0],
                  ["Sp. Attack", m.ivSpa ?? 0, m.evSpa ?? 0],
                  ["Sp. Defense", m.ivSpd ?? 0, m.evSpd ?? 0],
                  ["Speed", m.ivSpe ?? 0, m.evSpe ?? 0],
                ] as [string, number, number][]).map(([label, ivv, evv]) => (
                  <div key={label} style={{ display: "grid", gridTemplateColumns: "1fr 70px 70px", padding: "2px 0", fontSize: 13, lineHeight: 1.3 }}>
                    <span style={{ color: C.textMuted }}>{label}</span>
                    <span style={{ textAlign: "right", color: ivv >= 31 ? C.cyan : C.textMain, fontWeight: ivv >= 31 ? 700 : 400 }}>{ivv}</span>
                    <span style={{ textAlign: "right", color: C.textMain }}>{evv}</span>
                  </div>
                ))}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 70px", marginTop: 4, paddingTop: 4, borderTop: "1px solid #1a1a2e", color: C.cyan, fontWeight: 700, lineHeight: 1.3 }}>
                  <span>Total</span>
                  <span style={{ textAlign: "right" }}>{ivT}</span>
                  <span style={{ textAlign: "right" }}>{evT}</span>
                </div>
              </div>
            )}

            {monDetailTab === "moves" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontFamily: FONT_BASE }}>
                {moveset.map((mv, i) => {
                  const mt = moveTypeOf(mv);
                  const moveColor = MOVE_TYPE_COLOR[mt] ?? "#888";
                  return (
                    <div key={`${mv}-${i}`} style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: C.btnDark,
                      border: `1px solid ${C.borderDim}`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}>
                      <span style={{ fontSize: 13, color: C.textMain, fontWeight: 600 }}>{mv}</span>
                      <span style={{
                        fontSize: 10,
                        color: "#000",
                        padding: "3px 10px",
                        borderRadius: 6,
                        background: moveColor,
                        fontWeight: 600,
                      }}>{mt.toUpperCase()}</span>
                    </div>
                  );
                })}
                {moveset.length === 0 && (
                  <div style={{ color: C.textMuted, fontSize: 12, textAlign: "center", padding: 20 }}>
                    No moves learned yet.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 8, margin: 16 }}>
            {tabs.map((t) => {
              const active = monDetailTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => { sfx.click(); setMonDetailTab(t.key); }}
                  style={{
                    flex: 1,
                    background: active ? "rgba(50, 212, 229, 0.05)" : "transparent",
                    border: `1px solid ${active ? C.cyan : C.borderTab}`,
                    color: active ? C.cyan : C.textMuted,
                    padding: "8px 0",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: FONT_BASE,
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Fixed bottom actions */}
          <div style={{
            position: "fixed",
            bottom: 0,
            width: "100%",
            maxWidth: 400,
            background: C.bgDark,
            display: "flex",
            gap: 8,
            padding: 16,
            borderTop: `1px solid ${C.borderDim}`,
            zIndex: 100,
            boxSizing: "border-box",
          }}>
            <button
              onClick={renameMon}
              style={{
                flex: 1, background: C.btnDark, border: `1px solid #222`, color: C.textMain,
                borderRadius: 8, padding: "12px 0", display: "flex", flexDirection: "column",
                alignItems: "center", gap: 6, fontSize: 11, fontWeight: 500, cursor: "pointer",
                fontFamily: FONT_BASE,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#b678ff">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
              </svg>
              Nickname
            </button>
            <button
              onClick={evolveMon}
              style={{
                flex: 1, background: C.btnDark, border: `1px solid #222`, color: C.textMain,
                borderRadius: 8, padding: "12px 0", display: "flex", flexDirection: "column",
                alignItems: "center", gap: 6, fontSize: 11, fontWeight: 500, cursor: "pointer",
                fontFamily: FONT_BASE,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#fdd835">
                <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" />
                <circle cx="16" cy="18" r="1.5" /><circle cx="20" cy="18" r="1.5" /><circle cx="12" cy="18" r="1.5" /><circle cx="8" cy="18" r="1.5" />
              </svg>
              Evolve
            </button>
            <button
              onClick={() => {
                if (!m.uid) { addLog("This Pokémon can't be listed yet.", "#F44336"); return; }
                if (!found.inBox && (teams[found.teamIdx]?.mons.length ?? 0) <= TEAM_MIN) {
                  addLog(`Team must keep at least ${TEAM_MIN} Pokémon. Move ${m.nickname ?? m.name} to your collection first.`, "#F44336");
                  return;
                }
                sfx.menuOpen();
                setMarketTab("user");
                setSellModal({ uid: m.uid, price: "", submitting: false });
                setScreen("store");
              }}
              style={{
                flex: 1, background: C.btnDark, border: `1px solid #222`, color: C.textMain,
                borderRadius: 8, padding: "12px 0", display: "flex", flexDirection: "column",
                alignItems: "center", gap: 6, fontSize: 11, fontWeight: 500, cursor: "pointer",
                fontFamily: FONT_BASE,
              }}
            >
              <i className="fa-solid fa-tag" style={{ fontSize: 18, color: "#a78bfa" }} />
              Sell on Market
            </button>
            <button
              onClick={releaseMon}
              style={{
                flex: 1, background: C.btnDark, border: `1px solid #222`, color: C.textMain,
                borderRadius: 8, padding: "12px 0", display: "flex", flexDirection: "column",
                alignItems: "center", gap: 6, fontSize: 11, fontWeight: 500, cursor: "pointer",
                fontFamily: FONT_BASE,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#ff5252">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
              </svg>
              Release
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "store") {
    const stardustCats = new Set(["dust-balls", "dust-passes"]);
    const itemsCats = new Set(["balls", "boost", "tms"]);
    // Keep legacy Items/Stardust selection in sync with the inner item category.
    if ((marketTab === "items" || marketTab === "stardust") && !storeCat) {
      // no-op; categories component handles initial selection
    }

    // --- Global Market handlers ---
    const handleBuyGlobal = async (item: GlobalMarketItem) => {
      if (item.isSold) return;
      if (player.money < item.price) { addLog("Not enough Pokédollars!", "#F44336"); return; }
      if (marketBusyId) return;
      setMarketBusyId(`g-${item.id}`);
      try {
        const result = await buyGlobalItem(player.id, item.id);
        sfx.menuOpen();
        // Build the Mon locally from species template + server-rolled stats.
        const tpl = getPokemon(result.item.pokemonId);
        const mon = makeMon(tpl, result.item.level, "store");
        mon.nature = result.item.nature;
        mon.ivHp = result.item.ivHp;
        mon.ivAtk = result.item.ivAtk;
        mon.ivDef = result.item.ivDef;
        mon.ivSpa = result.item.ivSpa;
        mon.ivSpd = result.item.ivSpd;
        mon.ivSpe = result.item.ivSpe;
        setPlayer((pl) => ({ ...pl, money: pl.money - item.price }));
        if (team.length < TEAM_MAX) {
          setTeam((t) => t.length < TEAM_MAX ? [...t, mon] : t);
          addLog(`Purchased ${tpl.name}! Added to team.`, "#FFD700");
        } else {
          setBox((bx) => [...bx, mon]);
          addLog(`Purchased ${tpl.name}! Team full — sent to Mons collection.`, "#FFD700");
        }
        setCaught((c) => new Set([...c, tpl.id]));
        setGlobalMarket((prev) => prev.map((it) => it.id === item.id ? result.item : it));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Purchase failed.";
        if ((err as { status?: number })?.status === 409) {
          addLog("Too slow! Another trainer just bought it.", "#F44336");
          setGlobalMarket((prev) => prev.map((it) => it.id === item.id ? { ...it, isSold: true } : it));
        } else {
          addLog(msg, "#F44336");
        }
      } finally {
        setMarketBusyId(null);
      }
    };

    // --- User Listings handlers ---
    const handleBuyListing = async (listing: UserListing) => {
      if (player.money < listing.price) { addLog("Not enough Pokédollars!", "#F44336"); return; }
      if (marketBusyId) return;
      setMarketBusyId(`u-${listing.id}`);
      try {
        const result = await buyUserListing(player.id, listing.id);
        sfx.menuOpen();
        const monPayload = result.mon as Mon;
        const incoming: Mon = { ...monPayload, uid: monPayload.uid ?? `${monPayload.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
        setPlayer((pl) => ({ ...pl, money: pl.money - listing.price }));
        if (team.length < TEAM_MAX) {
          setTeam((t) => t.length < TEAM_MAX ? [...t, incoming] : t);
          addLog(`Bought ${incoming.nickname ?? incoming.name} from ${listing.sellerName}!`, "#FFD700");
        } else {
          setBox((bx) => [...bx, incoming]);
          addLog(`Bought ${incoming.nickname ?? incoming.name}! Team full — sent to Mons collection.`, "#FFD700");
        }
        setCaught((c) => new Set([...c, incoming.id]));
        setUserListings((prev) => prev.filter((l) => l.id !== listing.id));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Purchase failed.";
        addLog(msg, "#F44336");
        if ((err as { status?: number })?.status === 404 || (err as { status?: number })?.status === 409) {
          setUserListings((prev) => prev.filter((l) => l.id !== listing.id));
        }
      } finally {
        setMarketBusyId(null);
      }
    };

    const handleCancelListing = async (listing: UserListing) => {
      if (marketBusyId) return;
      setMarketBusyId(`u-${listing.id}`);
      try {
        const result = await cancelUserListing(player.id, listing.id);
        const monPayload = result.mon as Mon;
        const returned: Mon = { ...monPayload, uid: monPayload.uid ?? `${monPayload.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
        if (team.length < TEAM_MAX) {
          setTeam((t) => t.length < TEAM_MAX ? [...t, returned] : t);
        } else {
          setBox((bx) => [...bx, returned]);
        }
        setUserListings((prev) => prev.filter((l) => l.id !== listing.id));
        setMyListingIds((prev) => prev.filter((id) => id !== listing.id));
        addLog(`Listing for ${returned.nickname ?? returned.name} cancelled.`, "#a78bfa");
      } catch (err) {
        addLog(err instanceof Error ? err.message : "Cancel failed.", "#F44336");
      } finally {
        setMarketBusyId(null);
      }
    };
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
            <div style={{ position: "absolute", left: 12, top: 14 }}>
              <BackBtn onClick={() => { sfx.menuBack(); setScreen("world"); }} />
            </div>
            <h1 className="page-header-title" style={{ margin: 0 }}>Marketplace</h1>
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
              <div className={`m-toggle-btn ${marketTab === "global" ? "active" : ""}`}
                onClick={() => { sfx.click(); setMarketTab("global"); setStoreCat(null); }}>Global</div>
              <div className={`m-toggle-btn ${marketTab === "user" ? "active" : ""}`}
                onClick={() => { sfx.click(); setMarketTab("user"); setStoreCat(null); }}>User</div>
              <div className={`m-toggle-btn ${marketTab === "items" ? "active" : ""}`}
                onClick={() => { sfx.click(); setMarketTab("items"); setStoreCat("balls"); }}>Items</div>
              <div className={`m-toggle-btn ${marketTab === "stardust" ? "active" : ""}`}
                onClick={() => { sfx.click(); setMarketTab("stardust"); setStoreCat("dust-balls"); }}>Stardust</div>
            </div>
          </div>

          {marketError && (
            <div className="m-mkt-error">
              <span><i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }} />{marketError}</span>
              <button className="m-mkt-refresh" onClick={() => { sfx.click(); refreshMarket(); }}>
                <i className="fa-solid fa-rotate" /> Retry
              </button>
            </div>
          )}

          {marketTab === "global" && (
            <>
              <div className="m-search-row" style={{ paddingBottom: 8 }}>
                <div className="m-search">
                  <i className="fa-solid fa-magnifying-glass" />
                  <input type="text" placeholder="Search Pokémon…" value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} />
                  {globalSearch && <i className="fa-solid fa-xmark" style={{ cursor: "pointer" }} onClick={() => setGlobalSearch("")} />}
                </div>
                <select value={globalSort} onChange={(e) => setGlobalSort(e.target.value as "price"|"iv"|"nature")}
                  style={{ background: "var(--m-card)", border: "1px solid var(--m-border)", color: "var(--m-text)", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontFamily: "inherit", cursor: "pointer" }}>
                  <option value="price">Price ↑</option>
                  <option value="iv">IV ↓</option>
                  <option value="nature">Nature A-Z</option>
                </select>
                <button className="m-icon-btn" onClick={() => setGlobalView((v) => v === "grid" ? "list" : "grid")} style={{ flexShrink: 0 }}>
                  <i className={`fa-solid ${globalView === "grid" ? "fa-list" : "fa-grip"}`} />
                </button>
                <button className="m-mkt-refresh" onClick={() => { sfx.click(); refreshMarket(); }} disabled={marketLoading}>
                  <i className={`fa-solid fa-rotate ${marketLoading ? "fa-spin" : ""}`} />
                </button>
              </div>
              {marketLoading && globalMarket.length === 0 ? (
                <div className="m-mkt-status"><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />Loading marketplace…</div>
              ) : globalMarket.length === 0 ? (
                <div className="m-mkt-empty">No items in the global market right now.</div>
              ) : (() => {
                const totalIv = (it: GlobalMarketItem) => (it.ivHp ?? 0) + (it.ivAtk ?? 0) + (it.ivDef ?? 0) + (it.ivSpa ?? 0) + (it.ivSpd ?? 0) + (it.ivSpe ?? 0);
                const filtered = globalMarket
                  .filter((it) => !globalSearch || it.pokemonName.toLowerCase().includes(globalSearch.toLowerCase()))
                  .sort((a, b) => globalSort === "price" ? a.price - b.price : globalSort === "iv" ? totalIv(b) - totalIv(a) : (a.nature ?? "").localeCompare(b.nature ?? ""));
                return globalView === "grid" ? (
                  <div className="m-grid">
                    {filtered.map((it) => {
                      const sold = it.isSold;
                      return (
                        <div key={it.id} className={`m-pcard ${sold ? "sold" : ""}`}
                          onClick={() => { if (!sold) { sfx.click(); setMarketDetailMon({ type: "global", item: it }); } }}>
                          {sold && <span className="m-soldout">SOLD OUT</span>}
                          <img src={SPRITE(it.pokemonSprite)} alt={it.pokemonName} />
                          <div className="ovr">
                            <span className="m-nature">Lv {it.level} · {it.nature}</span>
                            <span className="m-pname">{it.pokemonName}</span>
                            <span className="m-price"><i className="fa-solid fa-coins" style={{ marginRight: 4, fontSize: 10 }} />₽{it.price.toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="m-list">
                    {filtered.map((it) => {
                      const sold = it.isSold;
                      return (
                        <div key={it.id} className="m-card" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, opacity: sold ? 0.5 : 1, cursor: sold ? "default" : "pointer" }}
                          onClick={() => { if (!sold) { sfx.click(); setMarketDetailMon({ type: "global", item: it }); } }}>
                          <img src={SPRITE(it.pokemonSprite)} alt={it.pokemonName} style={{ width: 44, height: 44, imageRendering: "pixelated" }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--m-text)" }}>{it.pokemonName}</div>
                            <div style={{ fontSize: 11, color: "var(--m-muted)" }}>Lv {it.level} · {it.nature}{sold ? " · SOLD OUT" : ""}</div>
                          </div>
                          <div style={{ fontSize: 13, color: "var(--m-yellow)", fontWeight: 600 }}>₽{it.price.toLocaleString()}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </>
          )}

          {marketTab === "user" && (
            <>
              <div className="m-search-row" style={{ paddingBottom: 8 }}>
                <div className="m-search">
                  <i className="fa-solid fa-magnifying-glass" />
                  <input type="text" placeholder="Search Pokémon…" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
                  {userSearch && <i className="fa-solid fa-xmark" style={{ cursor: "pointer" }} onClick={() => setUserSearch("")} />}
                </div>
                <select value={userSort} onChange={(e) => setUserSort(e.target.value as "price"|"iv"|"nature")}
                  style={{ background: "var(--m-card)", border: "1px solid var(--m-border)", color: "var(--m-text)", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontFamily: "inherit", cursor: "pointer" }}>
                  <option value="price">Price ↑</option>
                  <option value="iv">IV ↓</option>
                  <option value="nature">Nature A-Z</option>
                </select>
                <button className="m-icon-btn" onClick={() => setUserView((v) => v === "grid" ? "list" : "grid")} style={{ flexShrink: 0 }}>
                  <i className={`fa-solid ${userView === "grid" ? "fa-list" : "fa-grip"}`} />
                </button>
                <button className="m-mkt-refresh" onClick={() => { sfx.click(); refreshMarket(); }} disabled={marketLoading}>
                  <i className={`fa-solid fa-rotate ${marketLoading ? "fa-spin" : ""}`} />
                </button>
              </div>
              {marketLoading && userListings.length === 0 ? (
                <div className="m-mkt-status"><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />Loading listings…</div>
              ) : userListings.length === 0 ? (
                <div className="m-mkt-empty">
                  No active listings. Visit a Pokémon's detail screen and tap <strong>Sell on Market</strong> to list one.
                </div>
              ) : (() => {
                const totalIvU = (l: UserListing) => { const mj = l.monJson ?? {}; return (mj.ivHp ?? 0) + (mj.ivAtk ?? 0) + (mj.ivDef ?? 0) + (mj.ivSpa ?? 0) + (mj.ivSpd ?? 0) + (mj.ivSpe ?? 0); };
                const filteredUser = userListings
                  .filter((l) => !userSearch || l.pokemonName.toLowerCase().includes(userSearch.toLowerCase()))
                  .sort((a, b) => userSort === "price" ? a.price - b.price : userSort === "iv" ? totalIvU(b) - totalIvU(a) : (a.nature ?? "").localeCompare(b.nature ?? ""));
                return userView === "grid" ? (
                  <div className="m-grid">
                    {filteredUser.map((l) => {
                      const mine = myListingIds.includes(l.id) || l.sellerId === String(player.id);
                      const busy = marketBusyId === `u-${l.id}`;
                      return (
                        <div key={l.id} className="m-pcard" style={{ cursor: mine ? "default" : "pointer" }}
                          onClick={() => { if (!mine && !busy) { sfx.click(); setMarketDetailMon({ type: "user", listing: l }); } }}>
                          {mine && <span className="m-mine-tag">MINE</span>}
                          <img src={SPRITE(l.pokemonSprite)} alt={l.pokemonName} />
                          <div className="ovr">
                            <span className="m-seller"><i className="fa-solid fa-user" style={{ marginRight: 4, fontSize: 12 }} />{l.sellerName}</span>
                            <span className="m-pname">{l.pokemonName}</span>
                            <span className="m-nature">Lv {l.level} · {l.nature}</span>
                            <span className="m-price"><i className="fa-solid fa-coins" style={{ marginRight: 4, fontSize: 10 }} />₽{l.price.toLocaleString()}</span>
                            {mine && (
                              <button className="m-cancel-btn" disabled={busy}
                                onClick={(e) => { e.stopPropagation(); sfx.click(); handleCancelListing(l); }} style={{ marginTop: 4 }}>
                                {busy ? <><i className="fa-solid fa-spinner fa-spin" /> Cancelling…</> : <><i className="fa-solid fa-xmark" /> Cancel</>}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="m-list">
                    {filteredUser.map((l) => {
                      const mine = myListingIds.includes(l.id) || l.sellerId === String(player.id);
                      const busy = marketBusyId === `u-${l.id}`;
                      return (
                        <div key={l.id} className="m-card" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, cursor: mine ? "default" : "pointer" }}
                          onClick={() => { if (!mine && !busy) { sfx.click(); setMarketDetailMon({ type: "user", listing: l }); } }}>
                          <img src={SPRITE(l.pokemonSprite)} alt={l.pokemonName} style={{ width: 44, height: 44, imageRendering: "pixelated" }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--m-text)" }}>{l.pokemonName}</div>
                            <div style={{ fontSize: 11, color: "var(--m-muted)" }}>Lv {l.level} · {l.nature} · {l.sellerName}{mine ? " (Mine)" : ""}</div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                            <div style={{ fontSize: 13, color: "var(--m-yellow)", fontWeight: 600 }}>₽{l.price.toLocaleString()}</div>
                            {mine && (
                              <button className="m-cancel-btn" disabled={busy}
                                onClick={(e) => { e.stopPropagation(); sfx.click(); handleCancelListing(l); }} style={{ fontSize: 9, padding: "3px 8px" }}>
                                {busy ? <i className="fa-solid fa-spinner fa-spin" /> : "Cancel"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
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
                          setBuyQty(1);
                          setBuyQtyModal({ name: it.name, price: it.price, isStardust: isStardustCat, itemData: it });
                        }}>BUY</button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <BottomNav active="market" go={setScreen} />
        </div>
        {sellModal && (() => {
          const target = [...box, ...teams.flatMap((t) => t.mons)].find((m) => m.uid === sellModal.uid);
          if (!target) return null;
          const priceNum = Number(sellModal.price);
          const valid = Number.isInteger(priceNum) && priceNum >= 10 && priceNum <= 10_000_000;
          const tax = valid ? Math.floor(priceNum * 0.05) : 0;
          const sellerTake = valid ? priceNum - tax : 0;
          const submitSale = async () => {
            if (!valid || sellModal.submitting) return;
            setSellModal({ ...sellModal, submitting: true });
            try {
              await createUserListing(player.id, {
                sellerName: player.name,
                mon: target,
                price: priceNum,
              });
              // Remove from local team/box (also handles team-min guard).
              const inTeamIdx = teams.findIndex((t) => t.mons.some((m) => m.uid === target.uid));
              if (inTeamIdx >= 0) {
                const teamMons = teams[inTeamIdx].mons;
                if (teamMons.length <= TEAM_MIN) {
                  addLog(`Team must keep at least ${TEAM_MIN} Pokémon. Move ${target.nickname ?? target.name} first.`, "#F44336");
                  // Best-effort: cancel the listing we just created.
                  setSellModal(null);
                  return;
                }
                setTeams((prev) => prev.map((t, ti) => ti !== inTeamIdx ? t : { ...t, mons: t.mons.filter((m) => m.uid !== target.uid) }));
                if (inTeamIdx === activeTeamIdx) {
                  const monIdx = teamMons.findIndex((m) => m.uid === target.uid);
                  if (buddyIdx === monIdx) setBuddyIdx(-1);
                  else if (buddyIdx > monIdx) setBuddyIdx(buddyIdx - 1);
                }
              } else {
                setBox((prev) => prev.filter((m) => m.uid !== target.uid));
              }
              addLog(`Listed ${target.nickname ?? target.name} for ₽${priceNum.toLocaleString()}.`, "#a78bfa");
              setSellModal(null);
              refreshMarket();
              setMarketTab("user");
            } catch (err) {
              addLog(err instanceof Error ? err.message : "Could not create listing.", "#F44336");
              setSellModal({ ...sellModal, submitting: false });
            }
          };
          return (
            <div className="m-modal-back" onClick={() => { if (!sellModal.submitting) setSellModal(null); }}>
              <div className="m-modal" onClick={(e) => e.stopPropagation()}>
                <h3>Sell {target.nickname ?? target.name}</h3>
                <p>Lv {target.level} · {target.nature ?? "Hardy"} · Set a price between ₽10 and ₽10,000,000.</p>
                <input
                  type="number"
                  inputMode="numeric"
                  min={10}
                  max={10_000_000}
                  placeholder="Price (₽)"
                  value={sellModal.price}
                  onChange={(e) => setSellModal({ ...sellModal, price: e.target.value })}
                  autoFocus
                />
                <p style={{ marginTop: 10, marginBottom: 0, fontSize: 11 }}>
                  {valid ? (
                    <>5% market tax: ₽{tax.toLocaleString()} · You receive: <strong style={{ color: "var(--m-yellow)" }}>₽{sellerTake.toLocaleString()}</strong></>
                  ) : (
                    <span style={{ color: "#fca5a5" }}>Enter a whole number between 10 and 10,000,000.</span>
                  )}
                </p>
                <div className="m-modal-row">
                  <button className="m-btn-ghost" onClick={() => setSellModal(null)} disabled={sellModal.submitting}>Cancel</button>
                  <button className="m-btn-primary" onClick={submitSale} disabled={!valid || sellModal.submitting}>
                    {sellModal.submitting ? <><i className="fa-solid fa-spinner fa-spin" /> Listing…</> : "List for sale"}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Market detail modal */}
        {marketDetailMon && (() => {
          const isGlobal = marketDetailMon.type === "global";
          const name = isGlobal ? marketDetailMon.item.pokemonName : marketDetailMon.listing.pokemonName;
          const sprite = isGlobal ? marketDetailMon.item.pokemonSprite : marketDetailMon.listing.pokemonSprite;
          const level = isGlobal ? marketDetailMon.item.level : marketDetailMon.listing.level;
          const nature = isGlobal ? marketDetailMon.item.nature : marketDetailMon.listing.nature;
          const price = isGlobal ? marketDetailMon.item.price : marketDetailMon.listing.price;
          const mj = !isGlobal ? (marketDetailMon.listing.monJson ?? {}) : {};
          const ivHp = isGlobal ? marketDetailMon.item.ivHp : (mj.ivHp ?? 0);
          const ivAtk = isGlobal ? marketDetailMon.item.ivAtk : (mj.ivAtk ?? 0);
          const ivDef = isGlobal ? marketDetailMon.item.ivDef : (mj.ivDef ?? 0);
          const ivSpa = isGlobal ? marketDetailMon.item.ivSpa : (mj.ivSpa ?? 0);
          const ivSpd = isGlobal ? marketDetailMon.item.ivSpd : (mj.ivSpd ?? 0);
          const ivSpe = isGlobal ? marketDetailMon.item.ivSpe : (mj.ivSpe ?? 0);
          const totalIv = ivHp + ivAtk + ivDef + ivSpa + ivSpd + ivSpe;
          const ivPct = Math.round((totalIv / 186) * 100);
          const canAfford = player.money >= price;
          const isBusy = isGlobal ? marketBusyId === `g-${marketDetailMon.item.id}` : marketBusyId === `u-${marketDetailMon.listing.id}`;
          return (
            <div className="m-modal-back" onClick={() => setMarketDetailMon(null)}>
              <div className="m-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 340 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <img src={SPRITE(sprite)} alt={name} style={{ width: 72, height: 72, imageRendering: "pixelated", flexShrink: 0 }} />
                  <div>
                    <h3 style={{ margin: "0 0 4px" }}>{name}</h3>
                    <div style={{ fontSize: 12, color: "var(--m-muted)" }}>Lv {level} · {nature}</div>
                    {!isGlobal && <div style={{ fontSize: 11, color: "var(--m-muted)", marginTop: 2 }}>Seller: {(marketDetailMon as { type: "user"; listing: UserListing }).listing.sellerName}</div>}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 14 }}>
                  {[["HP", ivHp], ["Atk", ivAtk], ["Def", ivDef], ["SpA", ivSpa], ["SpD", ivSpd], ["Spe", ivSpe]].map(([lbl, val]) => (
                    <div key={lbl as string} style={{ background: "var(--m-input)", borderRadius: 8, padding: "6px 8px", textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "var(--m-muted)" }}>{lbl}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: Number(val) === 31 ? "#4ade80" : "var(--m-text)" }}>{val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: "var(--m-muted)", marginBottom: 14 }}>Total IV: {totalIv}/186 ({ivPct}%)</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "var(--m-yellow)" }}>₽{price.toLocaleString()}</span>
                  {!canAfford && <span style={{ fontSize: 11, color: "#f87171" }}>Insufficient funds</span>}
                </div>
                <div className="m-modal-row">
                  <button className="m-btn-ghost" onClick={() => setMarketDetailMon(null)}>Cancel</button>
                  <button className="m-btn-primary" disabled={!canAfford || isBusy}
                    onClick={async () => {
                      setMarketDetailMon(null);
                      if (isGlobal) await handleBuyGlobal(marketDetailMon.item);
                      else await handleBuyListing((marketDetailMon as { type: "user"; listing: UserListing }).listing);
                    }}>
                    {isBusy ? <><i className="fa-solid fa-spinner fa-spin" /> Buying…</> : `BUY for ₽${price.toLocaleString()}`}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Bulk item buy modal */}
        {buyQtyModal && (() => {
          const qty = Math.max(1, buyQty);
          const totalCost = qty * buyQtyModal.price;
          const balance = buyQtyModal.isStardust ? (player.stardust ?? 0) : player.money;
          const canAfford = balance >= totalCost;
          const confirmBuy = () => {
            if (!canAfford) return;
            sfx.itemPickup();
            if (buyQtyModal.isStardust) {
              setPlayer((p) => ({ ...p, stardust: (p.stardust ?? 0) - totalCost }));
            } else {
              setPlayer((p) => ({ ...p, money: p.money - totalCost }));
            }
            setInventory((inv) => {
              const found = inv.find((x) => x.name === buyQtyModal.name);
              return found
                ? inv.map((x) => x.name === buyQtyModal.name ? { ...x, qty: x.qty + qty } : x)
                : [...inv, { name: buyQtyModal.name, qty }];
            });
            addLog(`Bought ×${qty} ${buyQtyModal.name}!`, "#FFD700");
            setBuyQtyModal(null);
          };
          return (
            <div className="m-modal-back" onClick={() => setBuyQtyModal(null)}>
              <div className="m-modal" onClick={(e) => e.stopPropagation()}>
                <h3>Buy {buyQtyModal.name}</h3>
                <p style={{ marginBottom: 14 }}>{buyQtyModal.itemData.info}</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: "var(--m-muted)" }}>Quantity</span>
                  <input type="number" min={1} value={qty}
                    onChange={(e) => setBuyQty(Math.max(1, Number(e.target.value) || 1))}
                    style={{ width: 80, background: "var(--m-input)", border: "1px solid var(--m-border)", color: "var(--m-text)", borderRadius: 8, padding: "6px 10px", fontSize: 14, fontFamily: "inherit", textAlign: "center" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--m-input)", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
                  <span style={{ fontSize: 12, color: "var(--m-muted)" }}>Total cost</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: buyQtyModal.isStardust ? "#c4b5fd" : "var(--m-yellow)" }}>
                    {buyQtyModal.isStardust ? `✨ ${totalCost.toLocaleString()}` : `₽${totalCost.toLocaleString()}`}
                  </span>
                </div>
                {!canAfford && <p style={{ color: "#f87171", fontSize: 11, marginBottom: 10 }}>Insufficient funds for this quantity.</p>}
                <div className="m-modal-row">
                  <button className="m-btn-ghost" onClick={() => setBuyQtyModal(null)}>Cancel</button>
                  <button className="m-btn-primary" disabled={!canAfford} onClick={confirmBuy}>Confirm Purchase</button>
                </div>
              </div>
            </div>
          );
        })()}
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
            <BackBtn onClick={() => { setScreen("world"); }} />
            <div className="page-header-title">Safari Zone</div>
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
              safariStatusMsg?.kind === "broke"  ? "#facc15" :
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
                   safariStatusMsg?.kind === "broke"  ? "#facc15" :
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
            <BackBtn onClick={() => setScreen("world")} />
            <div className="page-header-title">Select Region</div>
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
                    <span style={{ fontSize: 12, color: "var(--m-muted)", letterSpacing: 0.5, marginTop: 2 }}>Gen {r.gen}</span>
                    {current && (
                      <span style={{ position: "absolute", top: 6, right: 8, fontSize: 12, color: meta.color }}>★</span>
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
    const DEX_FORM_CATS: { key: "all"|FormCategory; label: string; color: string }[] = [
      { key: "all",      label: "ALL",       color: "#aaa" },
      { key: "mega",     label: "MEGA",      color: "#db2777" },
      { key: "gmax",     label: "G-MAX",     color: "#f97316" },
      { key: "alolan",   label: "ALOLAN",    color: "#f59e0b" },
      { key: "galarian", label: "GALARIAN",  color: "#3b82f6" },
      { key: "hisuian",  label: "HISUIAN",   color: "#10b981" },
      { key: "paldean",  label: "PALDEAN",   color: "#ef4444" },
      { key: "other",    label: "OTHER",     color: "#a78bfa" },
    ];

    const types = ["all", ...Array.from(new Set(ALL_POKEMON.map((p) => p.type1)))].sort();
    const filtered = ALL_POKEMON.filter((p) =>
      (dexFilter === "all" || p.type1 === dexFilter || p.type2 === dexFilter) &&
      (genFilter === 0 || p.gen === genFilter)
    );

    const filteredForms = POKEMON_FORMS.filter((f) =>
      dexFormCat === "all" || f.category === dexFormCat
    );

    const statBar = (val: number, color: string) => (
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <div style={{ width: 24, textAlign: "right", fontSize: 10, color: "#aaa", flexShrink: 0 }}>{val}</div>
        <div style={{ flex: 1, height: 6, background: "#27272a", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ width: `${Math.min(100, (val / 255) * 100)}%`, height: "100%", background: color, borderRadius: 3 }} />
        </div>
      </div>
    );

    return (
      <div style={S.root}><style>{css}</style>
        <div style={S.wrap}>
          {/* ── header ── */}
          <div style={S.header}>
            <BackBtn onClick={() => setScreen("world")} />
            <span className="page-header-title">Pokédex</span>
            <button
              onClick={() => setDexShiny((v) => !v)}
              style={{ marginRight: 8, background: dexShiny ? "#fbbf2420" : "transparent", border: `1px solid ${dexShiny ? "#fbbf24" : "#555"}`, borderRadius: 8, padding: "4px 10px", color: dexShiny ? "#fbbf24" : "#aaa", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
              ✨ Shiny
            </button>
          </div>

          {/* ── mode tabs ── */}
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #27272a", padding: "0 12px" }}>
            {(["base","forms"] as const).map((m) => (
              <button key={m} onClick={() => setDexMode(m)} style={{ flex: 1, padding: "10px 0", background: "transparent", border: "none", borderBottom: `2px solid ${dexMode === m ? "#a78bfa" : "transparent"}`, color: dexMode === m ? "#a78bfa" : "#888", fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all .15s" }}>
                {m === "base" ? `📖 BASE DEX (${ALL_POKEMON.length})` : `🌀 ALT FORMS (${POKEMON_FORMS.length})`}
              </button>
            ))}
          </div>

          {/* ── BASE DEX filters ── */}
          {dexMode === "base" && (
            <>
              <div style={{ padding: "8px 10px 4px", overflowX: "auto", display: "flex", gap: 4 }}>
                <button className="btn" style={{ border: "1px solid #555", color: genFilter === 0 ? "#fff" : "#888", padding: "4px 8px", borderRadius: 4, background: genFilter === 0 ? "#fff2" : "transparent", flexShrink: 0, fontSize: 11 }} onClick={() => setGenFilter(0)}>ALL GENS</button>
                {[1,2,3,4,5,6,7,8,9].map((g) => (
                  <button key={g} className="btn" style={{ border: "1px solid #5e2c73", color: genFilter === g ? "#FFD700" : "#aaa", padding: "4px 8px", borderRadius: 4, background: genFilter === g ? "#fff2" : "transparent", flexShrink: 0, fontSize: 11 }} onClick={() => setGenFilter(g)}>G{g} {GEN_NAMES[g]}</button>
                ))}
              </div>
              <div style={{ padding: "4px 10px 4px", overflowX: "auto", display: "flex", gap: 4 }}>
                {types.map((t) => (
                  <button key={t} className="btn" style={{ border: `1px solid ${t === "all" ? "#555" : TYPE_COLORS[t]}`, color: t === "all" ? "#888" : TYPE_COLORS[t], padding: "4px 8px", borderRadius: 4, background: dexFilter === t ? "#fff2" : "transparent", flexShrink: 0 }} onClick={() => setDexFilter(t)}>{t === "all" ? "ALL" : t}</button>
                ))}
              </div>
            </>
          )}

          {/* ── FORMS filters ── */}
          {dexMode === "forms" && (
            <div style={{ padding: "8px 10px 4px", overflowX: "auto", display: "flex", gap: 4 }}>
              {DEX_FORM_CATS.map((c) => (
                <button key={c.key} className="btn"
                  style={{ border: `1px solid ${c.color}`, color: dexFormCat === c.key ? c.color : "#666", padding: "4px 10px", borderRadius: 14, background: dexFormCat === c.key ? `${c.color}20` : "transparent", flexShrink: 0, fontSize: 11, fontWeight: 700 }}
                  onClick={() => setDexFormCat(c.key)}>{c.label}</button>
              ))}
            </div>
          )}

          {/* ── BASE DEX grid ── */}
          {dexMode === "base" && (
            <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                {filtered.map((p) => {
                  const isCaught = caught.has(p.id) || team.some((m) => m.id === p.id);
                  const isSeen = isCaught || seen.has(p.id);
                  return (
                    <div key={p.id} style={{ background: isSeen ? `${TYPE_COLORS[p.type1]}11` : "#18181b", border: `1px solid ${isSeen ? TYPE_COLORS[p.type1] + "66" : "#27272a"}`, borderRadius: 8, padding: "8px 4px", textAlign: "center", opacity: isSeen ? 1 : 0.45, position: "relative" }}>
                      {isSeen
                        ? <div style={{ filter: isCaught ? "none" : "grayscale(1) brightness(0.6)" }}><MonSprite sprite={p.sprite} size={52} className="" isShiny={dexShiny} /></div>
                        : <div style={{ width: 52, height: 52, margin: "0 auto", background: "#111", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>❓</div>
                      }
                      {isCaught && <div style={{ position: "absolute", top: 4, right: 4, fontSize: 12, color: "#4ade80" }} title="Caught"><i className="fa-solid fa-circle-check" /></div>}
                      {dexShiny && isSeen && <div style={{ position: "absolute", top: 4, left: 4, fontSize: 10 }}>✨</div>}
                      <div style={{ fontSize: 9, color: isSeen ? "#ddd" : "#333", marginTop: 3 }}>#{String(p.id).padStart(3, "0")}</div>
                      <div style={{ fontSize: 10, color: isSeen ? "#fff" : "#333", marginTop: 1 }}>{isSeen ? p.name : "????"}</div>
                      {isSeen && <div style={{ display: "flex", justifyContent: "center", gap: 2, marginTop: 3 }}>{typeTag(p.type1)}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── FORMS grid ── */}
          {dexMode === "forms" && (
            <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                {filteredForms.map((f) => {
                  const catColor = DEX_FORM_CATS.find((c) => c.key === f.category)?.color ?? "#aaa";
                  return (
                    <div key={f.id} onClick={() => setDexFormDetail(f)} style={{ background: `${TYPE_COLORS[f.type1] ?? "#555"}11`, border: `1px solid ${(TYPE_COLORS[f.type1] ?? "#555") + "55"}`, borderRadius: 8, padding: "8px 4px", textAlign: "center", cursor: "pointer", position: "relative" }}>
                      <div style={{ position: "absolute", top: 3, left: 3, fontSize: 8, fontWeight: 700, color: catColor, background: `${catColor}20`, borderRadius: 4, padding: "1px 4px", textTransform: "uppercase" }}>{f.category}</div>
                      {dexShiny && <div style={{ position: "absolute", top: 3, right: 3, fontSize: 10 }}>✨</div>}
                      <MonSprite sprite={f.sprite} size={52} className="" isShiny={dexShiny} />
                      <div style={{ fontSize: 9, color: "#aaa", marginTop: 2 }}>#{String(f.id).padStart(5, "0")}</div>
                      <div style={{ fontSize: 9, color: "#fff", marginTop: 1, lineHeight: 1.2 }}>{f.name}</div>
                      <div style={{ display: "flex", justifyContent: "center", gap: 2, marginTop: 3 }}>
                        {typeTag(f.type1)}
                        {f.type2 && typeTag(f.type2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Form Detail Modal ── */}
          {dexFormDetail && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 300, padding: 16 }}
              onClick={() => setDexFormDetail(null)}>
              <div style={{ background: "#1c1c1e", border: `1px solid ${(TYPE_COLORS[dexFormDetail.type1] ?? "#555") + "88"}`, borderRadius: 18, padding: "20px 16px", width: "100%", maxWidth: 420, maxHeight: "80vh", overflowY: "auto" }}
                onClick={(e) => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{dexFormDetail.name}</div>
                    <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                      {typeTag(dexFormDetail.type1)}
                      {dexFormDetail.type2 && typeTag(dexFormDetail.type2)}
                    </div>
                  </div>
                  <MonSprite sprite={dexFormDetail.sprite} size={72} className="" isShiny={dexShiny} />
                </div>
                <div style={{ fontSize: 11, color: "#888", marginBottom: 12, textTransform: "capitalize" }}>
                  {dexFormDetail.category === "mega" ? "Mega Evolution" : dexFormDetail.category === "gmax" ? "Gigantamax Form" : dexFormDetail.category === "alolan" ? "Alolan Form" : dexFormDetail.category === "galarian" ? "Galarian Form" : dexFormDetail.category === "hisuian" ? "Hisuian Form" : dexFormDetail.category === "paldean" ? "Paldean Form" : "Alternate Form"}
                  {" · "}Gen {dexFormDetail.gen}
                </div>

                {/* Base Stats */}
                <div style={{ fontSize: 12, fontWeight: 700, color: "#aaa", marginBottom: 6, letterSpacing: 1 }}>BASE STATS</div>
                {[
                  ["HP",  dexFormDetail.hp,  "#4ade80"],
                  ["ATK", dexFormDetail.atk, "#f97316"],
                  ["DEF", dexFormDetail.def, "#3b82f6"],
                  ["SpA", dexFormDetail.spa, "#a78bfa"],
                  ["SpD", dexFormDetail.spd, "#06b6d4"],
                  ["Spe", dexFormDetail.spe, "#fbbf24"],
                ].map(([label, val, color]) => (
                  <div key={label as string} style={{ display: "grid", gridTemplateColumns: "30px 1fr", gap: 6, alignItems: "center", marginBottom: 4 }}>
                    <div style={{ fontSize: 10, color: "#aaa", textAlign: "right" }}>{label}</div>
                    {statBar(val as number, color as string)}
                  </div>
                ))}
                <div style={{ borderTop: "1px solid #27272a", marginTop: 4, paddingTop: 4, fontSize: 11, color: "#aaa", textAlign: "right" }}>
                  BST: {dexFormDetail.hp + dexFormDetail.atk + dexFormDetail.def + dexFormDetail.spa + dexFormDetail.spd + dexFormDetail.spe}
                </div>

                {/* Moves */}
                <div style={{ fontSize: 12, fontWeight: 700, color: "#aaa", margin: "12px 0 6px", letterSpacing: 1 }}>SIGNATURE MOVES</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {dexFormDetail.moves.map((mv) => (
                    <span key={mv} style={{ background: "#27272a", color: "#e2e8f0", fontSize: 11, padding: "3px 8px", borderRadius: 10, border: "1px solid #3f3f46" }}>{mv}</span>
                  ))}
                </div>

                <button onClick={() => setDexFormDetail(null)} style={{ width: "100%", marginTop: 16, padding: "10px 0", background: "#27272a", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Close</button>
              </div>
            </div>
          )}
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
            sfx.heal(); addLog("Your team was fully healed!", "#4CAF50");
            sfx.stopMusic();
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
            sfx.heal(); addLog("Your team was fully healed!", "#4CAF50");
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

  if (screen === "new-page") {
    return (
      <div style={S.root}><style>{css}</style>
        <div style={S.wrap}>
          <div style={S.header}>
            <BackBtn onClick={() => setScreen("world")} />
            <span className="page-header-title"><i className="fa-solid fa-star" style={{ marginRight: 6 }} />New Page</span>
            <div style={{ width: 60 }} />
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 16, padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🚧</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Coming Soon</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>This page is under construction. Check back later!</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

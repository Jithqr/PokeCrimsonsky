import { useState, useEffect, useRef, useCallback } from "react";
import { sfx, playMoveSfx, moveTypeOf, TYPE_COLOR as MOVE_TYPE_COLOR } from "./sfx";
import { ALL_POKEMON, TOTAL_POKEMON, GEN_NAMES, type PokemonTemplate } from "./lib/pokemon-data";
import { tmStoreItems } from "./lib/tm-data";
import { PokeTalesDex } from "./components/PokeTalesDex";
import { SplashLoader } from "./components/SplashLoader";

const SPRITE = (name: string) => `https://play.pokemonshowdown.com/sprites/ani/${name.replace(/[^a-z0-9]/g, "")}.gif`;
const SPRITE_BACK = (name: string) => `https://play.pokemonshowdown.com/sprites/ani-back/${name.replace(/[^a-z0-9]/g, "")}.gif`;
const TRAINER_SPRITE = (name: string) => `https://play.pokemonshowdown.com/sprites/trainers/${name}.png`;

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
  Steel:"#B8B8D0",Fairy:"#EE99AC",
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
  caughtAt?: number;
  origin?: "wild" | "safari" | "store" | "redeem" | "starter" | "trade" | "evolve";
};

let monUidCounter = 0;
function makeUid() {
  monUidCounter++;
  return `m-${Date.now().toString(36)}-${monUidCounter.toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function makeMon(template: PokemonTemplate, level: number, origin: Mon["origin"] = "wild"): Mon {
  const s = level / 50;
  const maxHp = Math.floor(template.hp * s * 2 + level + 10);
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
    ivAtk: Math.floor(Math.random() * 16),
    ivDef: Math.floor(Math.random() * 16),
    ivHp: Math.floor(Math.random() * 16),
    ivSpa: Math.floor(Math.random() * 16),
    ivSpd: Math.floor(Math.random() * 16),
    ivSpe: Math.floor(Math.random() * 16),
    evHp: 0, evAtk: 0, evDef: 0, evSpa: 0, evSpd: 0, evSpe: 0,
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
const REGIONS: RegionDef[] = [
  { name: "Kanto",  emoji: "🔴", gen: 1, minLv: 3,  maxLv: 25 },
  { name: "Johto",  emoji: "⚪", gen: 2, minLv: 5,  maxLv: 30 },
  { name: "Hoenn",  emoji: "🟢", gen: 3, minLv: 8,  maxLv: 35 },
  { name: "Sinnoh", emoji: "🔵", gen: 4, minLv: 10, maxLv: 40 },
  { name: "Unova",  emoji: "⚫", gen: 5, minLv: 12, maxLv: 45 },
  { name: "Kalos",  emoji: "🟡", gen: 6, minLv: 15, maxLv: 50 },
  { name: "Alola",  emoji: "🌺", gen: 7, minLv: 18, maxLv: 55 },
  { name: "Galar",  emoji: "🟣", gen: 8, minLv: 20, maxLv: 60 },
  { name: "Paldea", emoji: "🟠", gen: 9, minLv: 22, maxLv: 65 },
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
type Battle = { wild: Mon; pMon: Mon; phase: string; turnCount: number; canCatch: boolean; ballsThrown: number; selectedBall: string };
const MAX_BATTLE_BALLS = 5;
const BALL_MULT: Record<string, number> = { "Poké Ball": 1, "Pokeball": 1, "Great Ball": 1.5, "Ultra Ball": 2, "Master Ball": 999 };
const BALL_NAMES = ["Poké Ball", "Great Ball", "Ultra Ball", "Master Ball"];

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
  lastSpinDay?: string;
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
  const [screen, setScreen] = useState<string>(initial ? (initial.screen === "battle" || initial.screen === "hunt" ? "world" : initial.screen) : "title");
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
    rank: 1,
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
  const [lastSafariDay, setLastSafariDay] = useState<string>(initial?.lastSafariDay ?? "");
  const [lastSpinDay, setLastSpinDay] = useState<string>(initial?.lastSpinDay ?? "");
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
        lastSafariDay, lastSpinDay,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch { /* ignore quota errors */ }
  }, [screen, player, teams, activeTeamIdx, box, inventory, caught, seen, muted, candies, buddyIdx, redeemedCodes, lastSpinTs, catchStreak, lastStreakDay, safariBalls, safariEnc, safariCounter, safariNextLegend, safariCaught, lastSafariDay, lastSpinDay]);

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

  function awardCatchRewards(speciesId: number, mult: number, xpBonus: number) {
    const today = todayStr();
    let streak = catchStreak;
    if (lastStreakDay !== today) {
      streak = lastStreakDay === "" ? 1 : streak + 1;
      setLastStreakDay(today);
      setCatchStreak(streak);
    }
    const baseDust = 100;
    const streakBonus = Math.min(streak, 7) * 20;
    const dust = Math.floor((baseDust + streakBonus) * mult);
    const candy = Math.max(1, Math.floor(3 * mult));
    setPlayer((p) => ({ ...p, money: p.money + Math.floor(50 * mult), exp: p.exp + xpBonus, stardust: p.stardust + dust }));
    setCandies((c) => ({ ...c, [speciesId]: (c[speciesId] ?? 0) + candy }));
    addLog(`+${dust} ✨ Stardust, +${candy} 🍬 Candy`, "#FFD700");
    if (streak > 1 && lastStreakDay !== today) addLog(`🔥 Catch streak: Day ${Math.min(streak, 7)}`, "#FF9800");
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
    const lv = isLegend
      ? Math.min(70, region.maxLv + 5 + Math.floor(Math.random() * 6))
      : region.minLv + Math.floor(Math.random() * (region.maxLv - region.minLv + 1));
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
    const region = REGIONS[player.macroRegion] ?? REGIONS[0];
    const pool = REGION_POOLS[region.gen] ?? [];
    const legends = REGION_LEGENDS[region.gen] ?? [];
    const isLegend = forceLegendary && legends.length > 0;
    const id = isLegend
      ? legends[Math.floor(Math.random() * legends.length)]
      : pool[Math.floor(Math.random() * pool.length)];
    if (!id) return null;
    const lv = isLegend
      ? Math.min(70, region.maxLv + 5 + Math.floor(Math.random() * 6))
      : region.minLv + Math.floor(Math.random() * (region.maxLv - region.minLv + 1));
    return makeMon(getPokemon(id), lv);
  }

  function enterSafari() {
    // Resume an active session instead of restarting
    if (safariBalls > 0 || safariEnc) {
      setScreen("safari");
      addLog("Resumed your Safari run.", "#26A69A");
      return;
    }
    const today = todayStr();
    if (lastSafariDay === today) {
      addLog("You've already entered the Safari Zone today. Come back tomorrow!", "#F44336");
      sfx.menuBack();
      return;
    }
    if (player.money < 100) {
      addLog("Not enough money! Safari entry costs ₽100.", "#F44336");
      sfx.menuBack();
      return;
    }
    setPlayer((p) => ({ ...p, money: p.money - 100 }));
    setSafariBalls(30);
    setSafariCounter(0);
    setSafariCaught(0);
    setSafariNextLegend(3 + Math.floor(Math.random() * 3));
    const region = REGIONS[player.macroRegion] ?? REGIONS[0];
    addLog(`Welcome to the ${region.name} Safari Zone! 30 balls, no battles — catch only.`, "#26A69A");
    const next = 1;
    const isLegend = next >= (3 + Math.floor(Math.random() * 3));
    const sm = spawnSafari(isLegend);
    setSafariEnc(sm);
    if (sm) setSeen((prev) => prev.has(sm.id) ? prev : new Set(prev).add(sm.id));
    setSafariCounter(1);
    setScreen("safari");
  }

  function safariNext(currentBalls: number) {
    if (currentBalls <= 0) {
      addLog(`Safari ended! You caught ${safariCaught} Pokémon.`, "#FFD700");
      setSafariEnc(null);
      setLastSafariDay(todayStr());
      setScreen("world");
      return;
    }
    const next = safariCounter + 1;
    const triggerLegend = next >= safariNextLegend;
    const region = REGIONS[player.macroRegion] ?? REGIONS[0];
    const legends = REGION_LEGENDS[region.gen] ?? [];
    const isLegend = triggerLegend && legends.length > 0;
    if (isLegend) {
      setSafariNextLegend(next + 3 + Math.floor(Math.random() * 3));
      addLog(`✨ A LEGENDARY appears in the safari!`, "#FFD700");
    }
    const sm = spawnSafari(isLegend);
    setSafariEnc(sm);
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
    setTimeout(() => setSafariThrowAnim("wobble"), 500);
    setTimeout(() => {
      if (success) {
        setSafariThrowAnim("stars");
        const caughtMon = safariEnc;
        addLog(`Gotcha! ${caughtMon.name} (Lv${caughtMon.level}) was caught!`, "#4CAF50");
        sfx.victory();
        setCaught((prev) => new Set(prev).add(caughtMon.id));
        setCandies((prev) => ({ ...prev, [caughtMon.id]: (prev[caughtMon.id] ?? 0) + (isLegend ? 5 : 3) }));
        if (team.length < TEAM_MAX) {
          setTeam((prev) => prev.length < TEAM_MAX ? [...prev, caughtMon] : prev);
        } else {
          setBox((prev) => [...prev, caughtMon]);
          addLog(`Team is full — ${caughtMon.name} sent to your Mons collection.`, "#FF9800");
        }
        setSafariCaught((c) => c + 1);
      } else {
        setSafariThrowAnim("burst");
        addLog(`Oh no! ${safariEnc.name} broke free!`, "#F44336");
      }
      setTimeout(() => {
        setSafariThrowAnim(null);
        safariNext(ballsLeft);
      }, 900);
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
    setBattle({ wild: scoutedWild, pMon, phase: "choose", turnCount: 0, canCatch: true, ballsThrown: 0, selectedBall: "Poké Ball" });
    setScoutedWild(null);
    setScreen("battle");
  }

  function doPlayerMove(move: string) {
    if (!battle || battle.phase !== "choose") return;
    let { wild, pMon } = battle;
    const logs: [string, string][] = [];
    wild = { ...wild }; pMon = { ...pMon };

    const pwr = MOVE_POWER[move] ?? 40;
    const dmg = calcDmg(pMon.atk, wild.def, pwr);
    playMoveSfx(move);
    setMoveAnim({ target: "enemy", type: moveTypeOf(move), key: Date.now() });
    setTimeout(() => setMoveAnim(null), 600);
    if (dmg > 0) {
      wild.currentHp = Math.max(0, wild.currentHp - dmg);
      setShakeE(true); setTimeout(() => setShakeE(false), 350);
      setTimeout(() => sfx.hit(), 250);
      logs.push([`⚔️ ${pMon.name} used ${move}! (${dmg} dmg)`, "#81D4FA"]);
    } else {
      logs.push([`✨ ${pMon.name} used ${move}!`, "#aaa"]);
    }

    if (wild.currentHp <= 0) {
      const expGain = Math.floor(wild.level * (wild.atk + wild.def) / 8);
      const killCoin = 30 + wild.level * 5;
      const killDust = 20 + wild.level * 3;
      pMon.exp += expGain;
      logs.push([`⭐ Wild ${wild.name} fainted! +${expGain} EXP`, "#F44336"]);
      logs.push([`💰 Kill reward: +₽${killCoin}, +${killDust} ✨`, "#FFD700"]);
      logs.forEach(([m, c]) => addLog(m, c));
      setPlayer((p) => ({ ...p, wins: p.wins + 1, money: p.money + killCoin, stardust: (p.stardust ?? 0) + killDust }));
      setTimeout(() => sfx.faint(), 400);
      setTimeout(() => sfx.victory(), 1100);
      finishBattle(pMon, true, expGain);
      return;
    }

    const eMove = wild.moves[Math.floor(Math.random() * wild.moves.length)];
    const ePwr = MOVE_POWER[eMove] ?? 30;
    const eDmg = calcDmg(wild.atk, pMon.def, ePwr);
    setTimeout(() => {
      playMoveSfx(eMove);
      setMoveAnim({ target: "player", type: moveTypeOf(eMove), key: Date.now() });
      setTimeout(() => setMoveAnim(null), 600);
    }, 700);
    if (eDmg > 0) {
      pMon.currentHp = Math.max(0, pMon.currentHp - eDmg);
      setShakeP(true); setTimeout(() => setShakeP(false), 350);
      setTimeout(() => sfx.hurt(), 950);
      logs.push([`💢 ${wild.name} used ${eMove}! (${eDmg} dmg)`, "#FF7043"]);
    } else {
      logs.push([`${wild.name} used ${eMove}!`, "#aaa"]);
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
        setPlayer((p) => ({ ...p, losses: p.losses + 1 }));
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
    const ballMult = BALL_MULT[ballName] ?? 1;
    const isMaster = ballName === "Master Ball";
    const q = ringQuality(ringRadius);
    setRingActive(false);
    sfx.ballThrow();
    setBallAnim("throw");
    addLog(`Threw ${ballName} — ${q.label}`, q.color);
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
            const fleeChance = thrown >= MAX_BATTLE_BALLS ? 1 : 0.08 * thrown;
            if (Math.random() < fleeChance) {
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
        const evolved = makeMon(ev.to, mon.level);
        evolved.currentHp = evolved.maxHp;
        evolved.exp = mon.exp;
        evolved.expNeeded = mon.expNeeded;
        setTeam((prev) => [evolved, ...prev.slice(1)]);
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
    body { margin: 0; background: #05050f; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: #0a0a1e; }
    ::-webkit-scrollbar-thumb { background: #ff6b35; border-radius: 2px; }
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
    .m-bnav { position:absolute; bottom:0; left:0; width:100%; background: var(--m-bg); border-top:1px solid var(--m-border); display:flex; justify-content:space-around; align-items:center; padding: 14px 0; z-index: 100; }
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
        <i className={`fa-solid fa-magnifying-glass ${active === "market" ? "active" : ""}`} onClick={() => { sfx.click(); go("store"); }} />
        <div className={`av ${active === "profile" ? "active" : ""}`} onClick={() => { sfx.click(); go("profile"); }}>
          <img src={TRAINER_SPRITE(player.sprite)} alt="me" />
        </div>
      </div>
    );
  }

  const S: Record<string, React.CSSProperties> = {
    root: { fontFamily: "'Press Start 2P',monospace", background: "#05050f", minHeight: "100vh", display: "flex", justifyContent: "center" },
    wrap: { width: "100%", maxWidth: 460, minHeight: "100vh", background: "#0a0a1e", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" },
    header: { background: "linear-gradient(90deg,#150030,#0a0a1e)", borderBottom: "2px solid #ff6b35", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" },
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
    const fallbacks = back
      ? [
          `https://play.pokemonshowdown.com/sprites/ani-back/${clean}.gif`,
          `https://play.pokemonshowdown.com/sprites/gen5-back/${clean}.png`,
          `https://play.pokemonshowdown.com/sprites/gen5/${clean}.png`,
          `https://play.pokemonshowdown.com/sprites/dex/${clean}.png`,
        ]
      : [
          `https://play.pokemonshowdown.com/sprites/ani/${clean}.gif`,
          `https://play.pokemonshowdown.com/sprites/gen5/${clean}.png`,
          `https://play.pokemonshowdown.com/sprites/dex/${clean}.png`,
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

  if (screen === "title") return (
    <div style={S.root}>
      <style>{css}</style>
      <div style={S.wrap}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, padding: 32 }}>
          <div style={{ display: "flex", gap: 4, animation: "float 2s infinite" }}>
            {[25, 4, 7, 1].map((id) => <MonSprite key={id} sprite={getPokemon(id).sprite} size={56} style={{ animation: "none" }} />)}
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, color: "#ff6b35", letterSpacing: 3, textShadow: "0 0 30px #ff6b35cc" }}>POKÉMON</div>
            <div style={{ fontSize: 20, color: "#ff3b6b", letterSpacing: 2, textShadow: "0 0 30px #ff3b6bcc", marginTop: 6 }}>
              <span>CRIMSON</span><span style={{ display: "inline-block", width: 10 }} /><span>SKY</span>
            </div>
            <div style={{ fontSize: 7, color: "#555", marginTop: 8, letterSpacing: 3 }}>GEN I · KANTO REGION</div>
          </div>
          <div style={{ fontSize: 7, color: "#444", textAlign: "center", lineHeight: 2.2 }}>
            1025 Pokémon · Hunt · Catch · Battle · Evolve
          </div>
          <button className="btn" style={{ border: "2px solid #ff6b35", color: "#ff6b35", padding: "12px 24px", fontSize: 10 }}
            onClick={() => setScreen("nameInput")}>▶ START</button>
        </div>
      </div>
    </div>
  );

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
    const menu = [
      { label: "Hunt",   icon: "fa-dragon",          color: "var(--m-green)",  action: openHunt },
      { label: "Teams",  icon: "fa-users",           color: "var(--m-orange)", action: () => setScreen("team") },
      { label: "Card",   icon: "fa-id-card",         color: "var(--m-pink)",   action: () => setScreen("card") },
      { label: "Dex",    icon: "fa-book",            color: "var(--m-purple)", action: () => setScreen("poketalesDex") },
      { label: "Region", icon: "fa-map",             color: "var(--m-blue)",   action: () => setScreen("regionSelect") },
      { label: "Safari", icon: "fa-umbrella-beach",  color: "var(--m-teal)",   action: enterSafari },
      { label: "Bag",    icon: "fa-suitcase",        color: "var(--m-brown)",  action: () => setScreen("inventory") },
      { label: "Store",  icon: "fa-store",           color: "var(--m-yellow)", action: () => setScreen("store") },
      { label: "Mons", icon: "fa-paw",              color: "var(--m-cyan)",   action: () => setScreen("mons") },
    ];
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

          <div className="m-menu">
            {menu.map((b) => (
              <div key={b.label} className="m-menu-btn"
                style={{ color: b.color, borderColor: `${b.color}55` }}
                onClick={() => { sfx.click(); b.action(); }}>
                <i className={`fa-solid ${b.icon}`} />
                <span>{b.label}</span>
              </div>
            ))}
          </div>

          <div ref={logRef} className="m-log">
            {log.length === 0 && <div className="ln" style={{ color: "var(--m-muted)" }}>Your adventure awaits...</div>}
            {log.map((l) => <div key={l.id} className="ln" style={{ color: l.color === "#ddd" ? "var(--m-yellow)" : l.color }}>{l.msg}</div>)}
          </div>

          <BottomNav active="home" go={setScreen} />
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
            <div className="m-li" onClick={() => { sfx.click(); setScreen("mons"); }}>
              <div className="m-li-l">
                <div className="m-stat-ic"><i className="fa-solid fa-paw" /></div>
                <div className="m-li-t"><span className="m-li-tt">{teams.flatMap(t => t.mons).length + box.length} My Mons</span><span className="m-li-st">Browse</span></div>
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
    return (
      <div style={S.root}><style>{css}</style>
        <div style={S.wrap}>
          <div style={S.header}>
            <span style={{ fontSize: 8, color: "#ff6b35" }}>⚔️ WILD BATTLE</span>
            <span style={{ fontSize: 6, color: "#555" }}>Turn {battle.turnCount + 1}</span>
          </div>

          <div style={{ position: "relative", height: 210, background: "linear-gradient(180deg,#0f0f2a,#05050f)", margin: "10px 10px 0", borderRadius: 12, border: "1px solid #1a1a3a", overflow: "hidden" }}>
            <div style={{ position: "absolute", bottom: 50, left: 0, right: 0, height: 2, background: "#1a2a1a" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 50, background: "#0a1a0a" }} />

            <div style={{ position: "absolute", top: 10, right: 30 }}>
              {ballAnim !== "capture" && ballAnim !== "wobble" && ballAnim !== "success" && (
                <MonSprite sprite={wild.sprite} size={90} className={
                  shakeE ? "mon-shake" : (ballAnim === "fail" ? "" : "mon-float")
                } />
              )}
              {ballAnim === "capture" && (
                <MonSprite sprite={wild.sprite} size={90} className="mon-suck" />
              )}
              {moveAnim?.target === "enemy" && <MoveFx key={moveAnim.key} type={moveAnim.type} />}
            </div>
            {ballAnim === "throw" && (
              <div className="ball-throw"><div className="pokeball" /></div>
            )}
            {(ballAnim === "capture" || ballAnim === "wobble") && (
              <div className="ball-static">
                <div className={ballAnim === "wobble" ? "pokeball ball-wobble" : "pokeball"} />
              </div>
            )}
            {ballAnim === "success" && (
              <>
                <div className="ball-static"><div className="pokeball" /></div>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="catch-star" style={{
                    left: `calc(100% - ${60 + i * 14}px)`, bottom: `${110 + (i % 2) * 12}px`,
                    color: "#FFD700", animationDelay: `${i * 0.08}s`,
                  }}>✨</div>
                ))}
              </>
            )}
            {ballAnim === "fail" && (
              <div className="ball-static"><div className="pokeball ball-burst" /></div>
            )}

            {ringActive && (
              <>
                <div style={{
                  position: "absolute", top: 10, right: 30, width: 90, height: 90,
                  display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none",
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
                  textShadow: "1px 1px 0 #000", fontFamily: "'Inter', system-ui, sans-serif",
                }}>
                  {ringQuality(ringRadius).label}
                </div>
                <button onClick={releaseThrow}
                  style={{
                    position: "absolute", left: "50%", bottom: 8, transform: "translateX(-50%)",
                    background: "#4ade80", color: "#0a0e1a", border: "none",
                    padding: "8px 22px", borderRadius: 999, fontSize: 12, fontWeight: 800, letterSpacing: 1,
                    cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif",
                    boxShadow: "0 2px 10px rgba(74,222,128,0.5)", zIndex: 60,
                  }}>
                  TAP TO THROW
                </button>
              </>
            )}
            <div style={{ position: "absolute", bottom: 18, left: 20 }}>
              <MonSprite sprite={pMon.sprite} size={90} back className={shakeP ? "mon-shake" : "mon-float"} />
              {moveAnim?.target === "player" && <MoveFx key={moveAnim.key} type={moveAnim.type} />}
            </div>

            <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.8)", border: `1px solid ${TYPE_COLORS[wild.type1]}88`, borderRadius: 8, padding: "6px 10px", minWidth: 140 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ fontSize: 8, color: "#fff" }}>{wild.name}</span>
                <span style={{ fontSize: 7, color: "#aaa" }}>Lv{wild.level}</span>
              </div>
              <div style={{ display: "flex", gap: 3, marginBottom: 4 }}>{typeTag(wild.type1)}{typeTag(wild.type2)}</div>
              <HpBar cur={wild.currentHp} max={wild.maxHp} />
              <div style={{ fontSize: 6, color: "#aaa", marginTop: 2 }}>{wild.currentHp}/{wild.maxHp}</div>
            </div>

            <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.8)", border: `1px solid ${TYPE_COLORS[pMon.type1]}88`, borderRadius: 8, padding: "6px 10px", minWidth: 140 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ fontSize: 8, color: "#fff" }}>{pMon.name}</span>
                <span style={{ fontSize: 7, color: "#aaa" }}>Lv{pMon.level}</span>
              </div>
              <HpBar cur={pMon.currentHp} max={pMon.maxHp} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                <span style={{ fontSize: 6, color: "#aaa" }}>{pMon.currentHp}/{pMon.maxHp}</span>
                <span style={{ fontSize: 6, color: "#aaa" }}>ATK:{pMon.atk}</span>
              </div>
            </div>
          </div>

          <div style={{ margin: "6px 10px 0", background: "#050510", border: "1px solid #1a1a2a", borderRadius: 6, padding: "6px 10px", height: 48, overflowY: "auto" }}>
            {log.slice(-3).map((l) => <div key={l.id} style={{ fontSize: 7, color: l.color, marginBottom: 1 }}>▸ {l.msg}</div>)}
          </div>

          <div style={{ padding: "8px 10px 4px" }}>
            <div style={{ fontSize: 7, color: "#555", marginBottom: 6 }}>CHOOSE A MOVE</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {pMon.moves.map((m) => {
                const pwr = MOVE_POWER[m] ?? 40;
                return (
                  <button key={m} className="btn"
                    style={{ border: "2px solid #1E88E5", color: "#90CAF9", padding: "9px 6px", borderRadius: 6, textAlign: "left" }}
                    onClick={() => doPlayerMove(m)}>
                    <div style={{ fontSize: 8 }}>{m}</div>
                    <div style={{ fontSize: 6, color: "#555", marginTop: 2 }}>PWR: {pwr || "—"}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ padding: "6px 10px 14px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[
              { label: "Switch", action: openSwitchPicker },
              { label: "Run", action: () => { if (ballAnim || ringActive) return; sfx.menuBack(); addLog("Got away safely!", "#aaa"); setTeam((prev) => prev.map((m) => ({ ...m, currentHp: m.maxHp, status: null }))); addLog("Your team was fully healed!", "#4CAF50"); setBattle(null); setScreen("hunt"); } },
              { label: `Pokeballs (${MAX_BATTLE_BALLS - battle.ballsThrown})`, action: openBallPicker },
            ].map((b) => (
              <button key={b.label} className="btn"
                style={{
                  background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff",
                  padding: "14px 8px",
                  borderRadius: 14,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: 14,
                  fontWeight: 500,
                  letterSpacing: 0.3,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                }}
                onClick={b.action}>{b.label}</button>
            ))}
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
                  {BALL_NAMES.map((name) => {
                    const qty = inventoryQty(name);
                    const mult = BALL_MULT[name] ?? 1;
                    const disabled = qty <= 0;
                    return (
                      <button key={name} className="btn"
                        disabled={disabled}
                        onClick={() => startThrowAim(name)}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "10px 12px",
                          border: `1.5px solid ${disabled ? "#3a1f1f" : "#F44336"}`,
                          background: disabled ? "#1a0d0d" : "#1a0a0a",
                          borderRadius: 10, color: "#fff",
                          opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer",
                        }}>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>🔴 {name}</span>
                        <span style={{ fontSize: 10, color: disabled ? "#666" : "#FFD700" }}>
                          ×{qty} · {name === "Master Ball" ? "100%" : `${mult}× rate`}
                        </span>
                      </button>
                    );
                  })}
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
                if (typeof window !== "undefined" && !window.confirm(`Reset "${tName}"? All Pokémon except your lead will be removed.`)) return;
                setTeam((prev) => prev.slice(0, TEAM_MIN));
                setBuddyIdx(-1);
                addLog(`♻ ${tName} reset to lead Pokémon.`, "#FF9800");
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
              <div style={{ fontSize: 10, color: "#6b7896" }}>Tap a Pokémon to release it from this team.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
                {team.map((m, i) => (
                  <button key={`rm-${i}`} className="btn"
                    onClick={() => {
                      if (team.length <= TEAM_MIN) { addLog(`Team must keep at least ${TEAM_MIN} Pokémon.`, "#F44336"); return; }
                      if (typeof window !== "undefined" && !window.confirm(`Remove ${m.name} from this team?`)) return;
                      setTeam((prev) => prev.filter((_, j) => j !== i));
                      if (buddyIdx === i) setBuddyIdx(-1);
                      else if (buddyIdx > i) setBuddyIdx(buddyIdx - 1);
                      addLog(`Removed ${m.name} from the team.`, "#F44336");
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
                Pick a caught species — joins {teams[activeTeamIdx]?.name} at Lv5.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, overflowY: "auto" }}>
                {ALL_POKEMON.filter((p) => caught.has(p.id)).map((p) => (
                  <button key={p.id} className="btn"
                    onClick={() => {
                      if (team.length >= TEAM_MAX) { addLog(`Team is full! Max ${TEAM_MAX} Pokémon.`, "#F44336"); setShowAddMonPicker(false); return; }
                      const m = makeMon(p, 5);
                      setTeam((prev) => prev.length < TEAM_MAX ? [...prev, m] : prev);
                      addLog(`Added ${p.name} to ${teams[activeTeamIdx]?.name}!`, "#4CAF50");
                      setShowAddMonPicker(false);
                    }}
                    style={{
                      background: `${TYPE_COLORS[p.type1]}15`,
                      border: `2px solid ${TYPE_COLORS[p.type1]}66`,
                      borderRadius: 8, padding: "6px 4px", textAlign: "center",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                      cursor: "pointer",
                    }}>
                    <div style={{ fontSize: 5, color: "#888" }}>#{String(p.id).padStart(3, "0")}</div>
                    <MonSprite sprite={p.sprite} size={40} className="" />
                    <div style={{ fontSize: 7, color: "#fff" }}>{p.name}</div>
                  </button>
                ))}
              </div>
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
            { key: "key", label: "KEY ITEMS", emoji: "🔑", color: "#FF9800", match: (n: string) => /(bike|rod|key|pass|map|card|ticket|flute|stone tablet)/i.test(n) },
            { key: "stones", label: "STONES", emoji: "💎", color: "#03A9F4", match: (n: string) => /stone|shard/i.test(n) && !/stone tablet/i.test(n) },
          ];
          const active = bagCats.find((c) => c.key === bagCat)!;
          const filtered = inventory.filter((it) => active.match(it.name));
          return (
            <>
              <div style={{ padding: "8px 10px 4px", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4 }}>
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
      <div style={{ ...S.root, background: "#0a0e1a" }}>
        <style>{css}</style>
        <div style={{ ...S.wrap, background: "#0a0e1a", fontFamily: "'Inter', system-ui, sans-serif" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 18px 12px", borderBottom: "1px solid #1a1f33" }}>
            <div style={{ width: 78 }} />
            <div style={{ fontSize: 17, fontWeight: 700, color: "#e8efe8", letterSpacing: 3 }}>WILD HUNT</div>
            <button className="btn"
              style={{ border: "1.5px solid #4ade80", color: "#4ade80", padding: "6px 14px", borderRadius: 10, background: "transparent", fontSize: 11, fontWeight: 600, letterSpacing: 1, fontFamily: "'Inter', system-ui, sans-serif" }}
              onClick={() => { setScoutedWild(null); setScreen("world"); }}>
              <i className="fa-solid fa-chevron-left" style={{ fontSize: 9, marginRight: 5 }} />BACK
            </button>
          </div>

          <div style={{ textAlign: "center", padding: "22px 18px 18px", fontSize: 13, color: "#cfd6e6", letterSpacing: 0.4 }}>
            {region.emoji} {region.name} <span style={{ color: "#6b7896", margin: "0 6px" }}>•</span> Lv {region.minLv}–{region.maxLv}
            <div style={{ fontSize: 10, color: "#6b7896", marginTop: 4 }}>
              Hunts: {huntCount}/{legendThreshold} until legendary
            </div>
          </div>

          <div style={{ padding: "0 18px" }}>
            <div style={{
              width: "100%", aspectRatio: "1/1",
              border: "2px solid #4ade80",
              borderRadius: 14,
              background: "linear-gradient(180deg,#1a3a2a 0%,#0d2218 60%,#08180e 100%)",
              boxShadow: "0 0 20px rgba(74,222,128,0.15), inset 0 0 30px rgba(0,0,0,0.6)",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", inset: 0, background:
                "radial-gradient(ellipse at 20% 30%, rgba(46,90,55,0.55) 0%, transparent 35%)," +
                "radial-gradient(ellipse at 80% 25%, rgba(34,70,42,0.5) 0%, transparent 38%)," +
                "radial-gradient(ellipse at 50% 90%, rgba(26,52,32,0.7) 0%, transparent 55%)",
                pointerEvents: "none",
              }} />
              <div style={{ position: "absolute", left: "12%", top: "18%", width: 36, height: "70%", background: "linear-gradient(180deg,#1a2e1f,#0d1a12)", borderRadius: "6px 6px 0 0", opacity: 0.7 }} />
              <div style={{ position: "absolute", right: "14%", top: "22%", width: 28, height: "65%", background: "linear-gradient(180deg,#162a1c,#0a160f)", borderRadius: "5px 5px 0 0", opacity: 0.65 }} />
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 30,
                background: "repeating-linear-gradient(90deg,#1f3a26 0 6px,#172e1d 6px 12px)" }} />

              {scoutedWild ? (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MonSprite sprite={scoutedWild.sprite} size={170} className="mon-float" />
                </div>
              ) : (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#7a9a82", fontSize: 12, textAlign: "center", lineHeight: 1.8, padding: 20 }}>
                  Tap HUNT to search<br />the tall grass...
                </div>
              )}
            </div>

            <div style={{ textAlign: "center", padding: "16px 6px 0", fontSize: 13, color: "#FFD700", letterSpacing: 0.3 }}>
              {scoutedWild ? (
                <>A wild <span style={{ color: "#fff" }}>{scoutedWild.name}</span>{" "}
                  <span style={{
                    background: "#1a1f33", border: "1px solid #2d3450", color: "#fff",
                    padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                    margin: "0 4px",
                  }}>Lv. {scoutedWild.level}</span>
                  <span style={{ color: "#FFD700" }}>has appeared!</span></>
              ) : (
                <span style={{ color: "#6b7896" }}>No Pokémon nearby...</span>
              )}
            </div>
          </div>

          <div style={{ padding: "16px 18px 0" }}>
            <div style={{ fontSize: 10, color: "#6b7896", letterSpacing: 1, marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
              <span>YOUR PARTY · {teams[activeTeamIdx]?.name ?? "Team"}</span>
              <span style={{ color: "#FFD700" }}>tap to set lead</span>
            </div>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
              {team.length === 0 && (
                <div style={{ fontSize: 10, color: "#6b7896", padding: "8px 4px" }}>No Pokémon in this team yet.</div>
              )}
              {team.map((m, i) => {
                const lead = i === 0;
                const fainted = m.currentHp <= 0;
                return (
                  <button key={`${m.id}-${m.level}-${i}`} className="btn"
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
                    style={{
                      flexShrink: 0, width: 64, padding: 6,
                      border: `1.5px solid ${lead ? "#FFD700" : fainted ? "#3a1f1f" : "#2a3148"}`,
                      background: lead ? "#1a1808" : fainted ? "#1a0d0d" : "#10172a",
                      borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                      opacity: fainted ? 0.5 : 1, cursor: lead || fainted ? "default" : "pointer",
                    }}>
                    <MonSprite sprite={m.sprite} size={36} className="" style={{ animation: "none" }} />
                    <span style={{ fontSize: 8, color: "#cfd6e6", maxWidth: 56, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
                    <span style={{ fontSize: 7, color: lead ? "#FFD700" : "#6b7896" }}>{lead ? "★ LEAD" : `Lv${m.level}`}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, padding: "16px 18px 24px" }}>
            <button className="btn"
              style={{ flex: 1, border: "1.5px solid #4ade80", color: "#4ade80", padding: "16px 8px", borderRadius: 14, background: "#10172a", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, fontFamily: "'Inter', system-ui, sans-serif" }}
              onClick={rescout}>
              <i className="fa-solid fa-shoe-prints" style={{ fontSize: 18 }} />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2 }}>HUNT</span>
            </button>
            <button className="btn"
              disabled={!scoutedWild}
              style={{ flex: 1, border: `1.5px solid ${scoutedWild ? "#4ade80" : "#2a3148"}`, color: scoutedWild ? "#4ade80" : "#3d4566", padding: "16px 8px", borderRadius: 14, background: "#10172a", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: scoutedWild ? 1 : 0.6, cursor: scoutedWild ? "pointer" : "not-allowed", fontFamily: "'Inter', system-ui, sans-serif" }}
              onClick={captureScouted}>
              <i className="fa-solid fa-bolt" style={{ fontSize: 18 }} />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2 }}>BATTLE</span>
            </button>
          </div>
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
      const candy = candies[m.id] ?? 0;
      const cost = 25;
      if (candy < cost) { addLog(`Need ${cost} ${m.name} candy to evolve. (have ${candy})`, "#F44336"); return; }
      const nextId = m.id + 1;
      const nextTpl = ALL_POKEMON.find((p) => p.id === nextId);
      if (!nextTpl) { addLog(`${m.name} cannot evolve further.`, "#F44336"); return; }
      if (typeof window !== "undefined" && !window.confirm(`Evolve ${m.nickname ?? m.name} into ${nextTpl.name}? This will use ${cost} candy.`)) return;
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
      setCandies((prev) => ({ ...prev, [m.id]: Math.max(0, candy - cost) }));
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
                <div><span style={{ color: "#aaa" }}>Level:</span> {m.level} <span style={{ color: "#666" }}>|</span> <span style={{ color: "#aaa" }}>Nature:</span> {m.nickname ? "Hardy" : "Hardy"}</div>
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
    const marketTab: "pokemons" | "items" = storeCat === "items" || storeCat === "balls" || storeCat === "boost" || storeCat === "tms" ? "items" : "pokemons";
    const marketMons = ALL_POKEMON.slice(0, 12);
    const categories = [
      { key: "balls", label: "POKÉ BALLS", emoji: "🔴", color: "#F44336", desc: "Catch wild Pokémon",
        items: [
          { name: "Poké Ball", price: 200, info: "Standard ball" },
          { name: "Great Ball", price: 600, info: "1.5× catch rate" },
          { name: "Ultra Ball", price: 1200, info: "2× catch rate" },
          { name: "Master Ball", price: 9999, info: "Always catches" },
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
    const cat = categories.find((c) => c.key === storeCat) ?? null;
    const visibleItems = (() => {
      const items = cat?.items ?? [];
      if (storeCat !== "tms" || !tmSearch.trim()) return items;
      const q = tmSearch.trim().toLowerCase();
      return items.filter((it) =>
        it.name.toLowerCase().includes(q) || it.info.toLowerCase().includes(q)
      );
    })();
    return (
      <div style={S.root}><style>{css}</style>
        <div style={{ ...S.wrap, background: "var(--m-bg)" }} className="m-app">
          <div className="m-mkt-head">
            <h1 className="m-mkt-title">Crimson Sky Marketplace</h1>
            <div style={{ marginTop: 6, fontSize: 12, color: "var(--m-yellow)", fontWeight: 600 }}>₽{player.money.toLocaleString()}</div>
          </div>

          <div className="m-toggle-wrap">
            <div className="m-toggle">
              <div className={`m-toggle-btn ${marketTab === "pokemons" ? "active" : ""}`}
                onClick={() => { sfx.click(); setStoreCat(null); }}>Pokémons</div>
              <div className={`m-toggle-btn ${marketTab === "items" ? "active" : ""}`}
                onClick={() => { sfx.click(); setStoreCat("balls"); }}>Items</div>
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

          {marketTab === "items" && (
            <>
              <div style={{ padding: "0 16px 8px", display: "flex", gap: 8, overflowX: "auto" }}>
                {categories.map((c) => (
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
                  const canAfford = player.money >= it.price;
                  return (
                    <div key={it.name} className="m-card" style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, borderRadius: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--m-text)" }}>{it.name}</div>
                        <div style={{ fontSize: 11, color: "var(--m-muted)", marginTop: 2 }}>{it.info}</div>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--m-yellow)", minWidth: 70, textAlign: "right", fontWeight: 600 }}>₽{it.price.toLocaleString()}</div>
                      <button
                        disabled={!canAfford}
                        style={{
                          background: canAfford ? "var(--m-bluebg)" : "var(--m-input)",
                          color: canAfford ? "#fff" : "var(--m-muted)",
                          border: "none", padding: "8px 16px", borderRadius: 16, fontSize: 12, fontWeight: 600,
                          fontFamily: "inherit", cursor: canAfford ? "pointer" : "not-allowed", opacity: canAfford ? 1 : 0.5,
                        }}
                        onClick={() => {
                          if (!canAfford) return;
                          sfx.click();
                          setPlayer((p) => ({ ...p, money: p.money - it.price }));
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
    const region = REGIONS[player.macroRegion] ?? REGIONS[0];
    const isLegend = safariEnc ? ALL_LEGENDARY_IDS.has(safariEnc.id) : false;
    return (
      <div style={{ ...S.root, background: "#0a0e1a" }}><style>{css}</style>
        <div style={{ ...S.wrap, background: "#0a0e1a", fontFamily: "'Inter', system-ui, sans-serif" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #1a1f33" }}>
            <button className="btn"
              style={{ border: "1.5px solid #f87171", color: "#f87171", padding: "5px 12px", borderRadius: 8, background: "transparent", fontSize: 10, fontWeight: 600 }}
              onClick={() => { setScreen("world"); }}>
              ◀ BACK
            </button>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#26A69A", letterSpacing: 2 }}>SAFARI ZONE</div>
            <div style={{ width: 60 }} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-around", padding: "10px 16px", borderBottom: "1px solid #1a1f33", fontSize: 11, color: "#fff" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 8, color: "#888" }}>BALLS</div>
              <div style={{ color: safariBalls < 5 ? "#f87171" : "#fff", fontWeight: 700 }}>⚪ {safariBalls}/30</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 8, color: "#888" }}>CAUGHT</div>
              <div style={{ color: "#4ade80", fontWeight: 700 }}>{safariCaught}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 8, color: "#888" }}>{region.name.toUpperCase()}</div>
              <div style={{ color: "#FFD700", fontWeight: 700 }}>#{safariCounter}</div>
            </div>
          </div>

          <div style={{ padding: "16px 18px" }}>
            <div style={{
              width: "100%", aspectRatio: "1/1",
              border: `2px solid ${isLegend ? "#FFD700" : "#26A69A"}`,
              borderRadius: 14,
              background: "linear-gradient(180deg,#3a2e1a 0%,#1a1208 60%,#0e0804 100%)",
              boxShadow: `0 0 24px ${isLegend ? "rgba(255,215,0,0.35)" : "rgba(38,166,154,0.18)"}, inset 0 0 30px rgba(0,0,0,0.6)`,
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 36,
                background: "repeating-linear-gradient(90deg,#3d2f1a 0 6px,#2a2010 6px 12px)" }} />
              {safariEnc && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ animation: safariThrowAnim === "wobble" ? "ballWobble 0.9s" : "none" }}>
                    {safariThrowAnim !== "throw" && safariThrowAnim !== "wobble" && (
                      <MonSprite sprite={safariEnc.sprite} size={170} className="mon-float" />
                    )}
                  </div>
                  {safariThrowAnim === "throw" && (
                    <div style={{ position: "absolute", animation: "ballThrow 0.5s forwards" }}>
                      <div className="pokeball" style={{ width: 32, height: 32 }} />
                    </div>
                  )}
                  {safariThrowAnim === "wobble" && (
                    <div style={{ position: "absolute", animation: "ballWobble 0.9s" }}>
                      <div className="pokeball" style={{ width: 32, height: 32 }} />
                    </div>
                  )}
                  {safariThrowAnim === "stars" && (
                    <div style={{ position: "absolute", fontSize: 40, animation: "catchStars 0.9s" }}>✨🌟✨</div>
                  )}
                  {safariThrowAnim === "burst" && (
                    <div style={{ position: "absolute", fontSize: 40, animation: "ballBurst 0.6s" }}>💥</div>
                  )}
                </div>
              )}
              {isLegend && (
                <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(255,215,0,0.2)", border: "1px solid #FFD700", borderRadius: 6, padding: "3px 8px", fontSize: 9, color: "#FFD700", fontWeight: 700 }}>
                  ★ LEGENDARY
                </div>
              )}
            </div>

            <div style={{ textAlign: "center", padding: "14px 6px 0", fontSize: 13, color: "#26A69A" }}>
              {safariEnc ? (
                <>A wild <span style={{ color: "#fff" }}>{safariEnc.name}</span>{" "}
                  <span style={{ background: "#1a1f33", border: "1px solid #2d3450", color: "#fff", padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600, margin: "0 4px" }}>Lv. {safariEnc.level}</span>
                  {isLegend ? "watches you carefully..." : "appeared!"}</>
              ) : "..."}
            </div>
          </div>

          <div style={{
            margin: "4px 18px 0",
            background: "#0d0d12",
            border: "1.5px solid #2a2a3a",
            borderRadius: 10,
            padding: "10px 12px",
            flex: 1,
            minHeight: 110,
            overflowY: "auto",
            fontFamily: "'Press Start 2P', ui-monospace, monospace",
            fontSize: 9,
            lineHeight: 1.7,
            color: "#9bd17a",
          }}>
            {log.slice(-12).map((l, i) => (
              <div key={i} style={{ color: l.color || "#9bd17a" }}>&gt; {l.msg}</div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "14px 18px 24px", marginTop: "auto" }}>
            <button className="btn"
              disabled={safariThrowAnim !== null || safariBalls <= 0}
              style={{ width: "100%", border: "1.5px solid #2a3a55", color: safariThrowAnim ? "#555" : "#fff", padding: "18px 8px", borderRadius: 16, background: "#10172a", fontSize: 17, fontWeight: 500, opacity: (!safariThrowAnim && safariBalls > 0) ? 1 : 0.5 }}
              onClick={() => { if (safariBalls > 0) safariNext(safariBalls); }}>
              Hunt
            </button>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn"
                disabled={!safariEnc || safariThrowAnim !== null || safariBalls <= 0}
                style={{ flex: 1, border: "1.5px solid #2a3a55", color: safariThrowAnim ? "#555" : "#fff", padding: "18px 8px", borderRadius: 16, background: "#10172a", fontSize: 15, fontWeight: 500, opacity: (safariEnc && !safariThrowAnim && safariBalls > 0) ? 1 : 0.5 }}
                onClick={safariThrow}>
                Use Safari Ball
              </button>
              <button className="btn"
                disabled={safariThrowAnim !== null}
                style={{ flex: 1, border: "1.5px solid #2a3a55", color: safariThrowAnim ? "#444" : "#fff", padding: "18px 8px", borderRadius: 16, background: "#10172a", fontSize: 15, fontWeight: 500 }}
                onClick={() => { setSafariEnc(null); setSafariBalls(0); setSafariCounter(0); setSafariCaught(0); setLastSafariDay(todayStr()); addLog(`Safari ended. Caught ${safariCaught}.`, "#FFD700"); setScreen("world"); }}>
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
                  <div key={p.id} style={{ background: isSeen ? `${TYPE_COLORS[p.type1]}11` : "#0a0a1e", border: `1px solid ${isSeen ? TYPE_COLORS[p.type1] + "66" : "#1a1a1a"}`, borderRadius: 8, padding: "8px 4px", textAlign: "center", opacity: isSeen ? 1 : 0.45, position: "relative" }}>
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

  return null;
}

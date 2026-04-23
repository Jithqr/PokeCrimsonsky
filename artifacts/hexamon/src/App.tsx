import { useState, useEffect, useRef, useCallback } from "react";
import { sfx, playMoveSfx, moveTypeOf, TYPE_COLOR as MOVE_TYPE_COLOR } from "./sfx";

const SPRITE = (name: string) => `https://play.pokemonshowdown.com/sprites/ani/${name.replace(/[^a-z0-9]/g, "")}.gif`;
const SPRITE_BACK = (name: string) => `https://play.pokemonshowdown.com/sprites/ani-back/${name.replace(/[^a-z0-9]/g, "")}.gif`;
const TRAINER_SPRITE = (name: string) => `https://play.pokemonshowdown.com/sprites/trainers/${name}.png`;

const GEN_V_TRAINERS = [
  "hilbert", "hilda", "cheren", "bianca", "n", "ghetsis", "alder",
  "cilan", "chili", "cress", "lenora", "burgh", "elesa", "clay", "skyla", "brycen", "drayden", "iris",
];

type Template = {
  id: number; name: string; sprite: string;
  type1: string; type2: string | null;
  hp: number; atk: number; def: number; spa: number; spd: number; spe: number;
  moves: string[];
  canEvolve?: number; evolveAt?: number;
};

const ALL_POKEMON: Template[] = [
  { id:1,  name:"Bulbasaur",  sprite:"bulbasaur",  type1:"Grass",  type2:"Poison",   hp:45,atk:49,def:49,spa:65,spd:65,spe:45, moves:["Tackle","Vine Whip","Razor Leaf","Sleep Powder"], canEvolve:2,  evolveAt:16 },
  { id:2,  name:"Ivysaur",    sprite:"ivysaur",    type1:"Grass",  type2:"Poison",   hp:60,atk:62,def:63,spa:80,spd:80,spe:60, moves:["Vine Whip","Razor Leaf","Poison Powder","Solar Beam"], canEvolve:3, evolveAt:32 },
  { id:3,  name:"Venusaur",   sprite:"venusaur",   type1:"Grass",  type2:"Poison",   hp:80,atk:82,def:83,spa:100,spd:100,spe:80, moves:["Razor Leaf","Solar Beam","Earthquake","Sleep Powder"] },
  { id:4,  name:"Charmander", sprite:"charmander", type1:"Fire",   type2:null,       hp:39,atk:52,def:43,spa:60,spd:50,spe:65, moves:["Scratch","Ember","Dragon Rage","Slash"], canEvolve:5, evolveAt:16 },
  { id:5,  name:"Charmeleon", sprite:"charmeleon", type1:"Fire",   type2:null,       hp:58,atk:64,def:58,spa:80,spd:65,spe:80, moves:["Ember","Flamethrower","Slash","Dragon Rage"], canEvolve:6, evolveAt:36 },
  { id:6,  name:"Charizard",  sprite:"charizard",  type1:"Fire",   type2:"Flying",   hp:78,atk:84,def:78,spa:109,spd:85,spe:100, moves:["Flamethrower","Fire Blast","Slash","Dragon Rage"] },
  { id:7,  name:"Squirtle",   sprite:"squirtle",   type1:"Water",  type2:null,       hp:44,atk:48,def:65,spa:50,spd:64,spe:43, moves:["Tackle","Water Gun","Bite","Withdraw"], canEvolve:8, evolveAt:16 },
  { id:8,  name:"Wartortle",  sprite:"wartortle",  type1:"Water",  type2:null,       hp:59,atk:63,def:80,spa:65,spd:80,spe:58, moves:["Water Gun","Bubble Beam","Bite","Protect"], canEvolve:9, evolveAt:36 },
  { id:9,  name:"Blastoise",  sprite:"blastoise",  type1:"Water",  type2:null,       hp:79,atk:83,def:100,spa:85,spd:105,spe:78, moves:["Surf","Hydro Pump","Ice Beam","Bite"] },
  { id:10, name:"Caterpie",   sprite:"caterpie",   type1:"Bug",    type2:null,       hp:45,atk:30,def:35,spa:20,spd:20,spe:45, moves:["Tackle","String Shot"], canEvolve:11, evolveAt:7 },
  { id:11, name:"Metapod",    sprite:"metapod",    type1:"Bug",    type2:null,       hp:50,atk:20,def:55,spa:25,spd:25,spe:30, moves:["Harden"], canEvolve:12, evolveAt:10 },
  { id:12, name:"Butterfree", sprite:"butterfree", type1:"Bug",    type2:"Flying",   hp:60,atk:45,def:50,spa:90,spd:80,spe:70, moves:["Confusion","Sleep Powder","Psybeam","Gust"] },
  { id:13, name:"Weedle",     sprite:"weedle",     type1:"Bug",    type2:"Poison",   hp:40,atk:35,def:30,spa:20,spd:20,spe:50, moves:["Poison Sting","String Shot"], canEvolve:14, evolveAt:7 },
  { id:14, name:"Kakuna",     sprite:"kakuna",     type1:"Bug",    type2:"Poison",   hp:45,atk:25,def:50,spa:25,spd:25,spe:35, moves:["Harden"], canEvolve:15, evolveAt:10 },
  { id:15, name:"Beedrill",   sprite:"beedrill",   type1:"Bug",    type2:"Poison",   hp:65,atk:90,def:40,spa:45,spd:80,spe:75, moves:["Twineedle","Pin Missile","Poison Jab","Agility"] },
  { id:16, name:"Pidgey",     sprite:"pidgey",     type1:"Normal", type2:"Flying",   hp:40,atk:45,def:40,spa:35,spd:35,spe:56, moves:["Tackle","Gust","Quick Attack","Sand Attack"], canEvolve:17, evolveAt:18 },
  { id:17, name:"Pidgeotto",  sprite:"pidgeotto",  type1:"Normal", type2:"Flying",   hp:63,atk:60,def:55,spa:50,spd:50,spe:71, moves:["Gust","Quick Attack","Wing Attack","Agility"], canEvolve:18, evolveAt:36 },
  { id:18, name:"Pidgeot",    sprite:"pidgeot",    type1:"Normal", type2:"Flying",   hp:83,atk:80,def:75,spa:70,spd:70,spe:101, moves:["Wing Attack","Agility","Air Slash","Tailwind"] },
  { id:19, name:"Rattata",    sprite:"rattata",    type1:"Normal", type2:null,       hp:30,atk:56,def:35,spa:25,spd:35,spe:72, moves:["Tackle","Quick Attack","Bite","Hyper Fang"], canEvolve:20, evolveAt:20 },
  { id:20, name:"Raticate",   sprite:"raticate",   type1:"Normal", type2:null,       hp:55,atk:81,def:60,spa:50,spd:70,spe:97, moves:["Hyper Fang","Quick Attack","Bite","Super Fang"] },
  { id:25, name:"Pikachu",    sprite:"pikachu",    type1:"Electric",type2:null,      hp:35,atk:55,def:40,spa:50,spd:50,spe:90, moves:["Thunder Shock","Quick Attack","Thunderbolt","Thunder Wave"], canEvolve:26, evolveAt:999 },
];

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

type Mon = Template & {
  level: number; maxHp: number; currentHp: number;
  exp: number; expNeeded: number; status: string | null;
  ivAtk: number; ivDef: number; ivHp: number;
};

function makeMon(template: Template, level: number): Mon {
  const s = level / 50;
  const maxHp = Math.floor(template.hp * s * 2 + level + 10);
  return {
    ...template,
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

type Area = { name: string; minLv: number; maxLv: number; pool: number[] };
type MacroRegion = { name: string; emoji: string; available: boolean; areas: Area[] };

const MACRO_REGIONS: MacroRegion[] = [
  { name: "Kanto",  emoji: "🔴", available: true, areas: [
    { name: "Pallet Town",     minLv: 2, maxLv: 6,  pool: [16, 19, 10, 13, 4, 1, 7] },
    { name: "Viridian Forest", minLv: 5, maxLv: 12, pool: [10, 11, 12, 13, 14, 15, 16, 25] },
    { name: "Mt. Moon",        minLv: 8, maxLv: 18, pool: [16, 19, 10] },
  ]},
  { name: "Johto",   emoji: "⚪", available: false, areas: [] },
  { name: "Hoenn",   emoji: "🟢", available: false, areas: [] },
  { name: "Sinnoh",  emoji: "🔵", available: false, areas: [] },
  { name: "Unova",   emoji: "⚫", available: false, areas: [] },
  { name: "Kalos",   emoji: "🟡", available: false, areas: [] },
  { name: "Alola",   emoji: "🌺", available: false, areas: [] },
  { name: "Galar",   emoji: "🟣", available: false, areas: [] },
  { name: "Paldea",  emoji: "🟠", available: false, areas: [] },
];

type LogEntry = { msg: string; color: string; id: number };
type Player = { name: string; hometown: string; money: number; stardust: number; macroRegion: number; region: number; level: number; exp: number; expNeeded: number; sprite: string; id: number; rank: number; wins: number; losses: number; adventureStarted: string };

function makePlayerId() {
  return Math.floor(1_000_000_000 + Math.random() * 9_000_000_000);
}
function todayStr() {
  const d = new Date();
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
type Battle = { wild: Mon; pMon: Mon; phase: string; turnCount: number; canCatch: boolean };

const SAVE_KEY = "hexamon:save:v2";
type SaveData = {
  screen: string;
  player: Player;
  team: Mon[];
  inventory: { name: string; qty: number }[];
  caught: number[];
  muted: boolean;
  candies?: Record<number, number>;
  buddyIdx?: number;
  lastSpinTs?: number;
  catchStreak?: number;
  lastStreakDay?: string;
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
  const [team, setTeam] = useState<Mon[]>(initial?.team ?? []);
  const [inventory, setInventory] = useState<{ name: string; qty: number }[]>(initial?.inventory ?? []);
  const [storeCat, setStoreCat] = useState<string | null>(null);
  const [bagCat, setBagCat] = useState<string>("balls");
  const [scoutedWild, setScoutedWild] = useState<Mon | null>(null);
  const [moveAnim, setMoveAnim] = useState<{ target: "enemy" | "player"; type: string; key: number } | null>(null);
  const [muted, setMuted] = useState<boolean>(initial?.muted ?? false);
  const [caught, setCaught] = useState<Set<number>>(new Set(initial?.caught ?? []));
  const [candies, setCandies] = useState<Record<number, number>>(initial?.candies ?? {});
  const [buddyIdx, setBuddyIdx] = useState<number>(initial?.buddyIdx ?? -1);
  const [lastSpinTs, setLastSpinTs] = useState<number>(initial?.lastSpinTs ?? 0);
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
  const [evolving, setEvolving] = useState<{ from: string; to: string; sprite: string } | null>(null);
  const [dexFilter, setDexFilter] = useState("all");
  const [pickedMacro, setPickedMacro] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = 99999; }, [log]);

  useEffect(() => {
    if (screen === "title" || screen === "nameInput" || screen === "starter") return;
    try {
      const data: SaveData = {
        screen, player, team, inventory,
        caught: Array.from(caught), muted,
        candies, buddyIdx, lastSpinTs, catchStreak, lastStreakDay,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch { /* ignore quota errors */ }
  }, [screen, player, team, inventory, caught, muted, candies, buddyIdx, lastSpinTs, catchStreak, lastStreakDay]);

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
    const cd = 60_000;
    const elapsed = Date.now() - lastSpinTs;
    if (elapsed < cd) return;
    setLastSpinTs(Date.now());
    sfx.menuOpen();
    const dust = 50 + Math.floor(Math.random() * 100);
    setPlayer((p) => ({ ...p, stardust: p.stardust + dust, money: p.money + 30 }));
    const drops = ["Pokeball", "Pokeball", "Great Ball", "Potion", "Berry"];
    const item = drops[Math.floor(Math.random() * drops.length)];
    setInventory((inv) => {
      const i = inv.findIndex((x) => x.name === item);
      if (i >= 0) { const n = [...inv]; n[i] = { ...n[i], qty: n[i].qty + 1 }; return n; }
      return [...inv, { name: item, qty: 1 }];
    });
    addLog(`📍 Pokéstop spun! +${dust} ✨, +1 ${item}`, "#26C6DA");
  }

  function resetSave() {
    if (!window.confirm("Erase your save and start a new adventure?")) return;
    try { localStorage.removeItem(SAVE_KEY); } catch {}
    window.location.reload();
  }

  const addLog = useCallback((msg: string, color = "#ddd") => {
    setLog((p) => [...p.slice(-40), { msg, color, id: Date.now() + Math.random() }]);
  }, []);

  function getPokemon(id: number) { return ALL_POKEMON.find((p) => p.id === id)!; }

  function spawnWild(): Mon | null {
    const macro = MACRO_REGIONS[player.macroRegion];
    const region = macro.areas[player.region];
    if (!region) {
      addLog(`No areas to explore in ${macro.name} yet!`, "#F44336");
      return null;
    }
    const poolId = region.pool[Math.floor(Math.random() * region.pool.length)];
    const template = getPokemon(poolId);
    const lv = region.minLv + Math.floor(Math.random() * (region.maxLv - region.minLv + 1));
    return makeMon(template, lv);
  }

  function openHunt() {
    const w = spawnWild();
    if (!w) return;
    setScoutedWild(w);
    setScreen("hunt");
  }

  function rescout() {
    sfx.click();
    const w = spawnWild();
    if (w) setScoutedWild(w);
  }

  function captureScouted() {
    if (!scoutedWild) return;
    const validTeam = team.filter((m) => m.currentHp > 0);
    if (validTeam.length === 0) {
      addLog("Your team is too exhausted to battle!", "#F44336");
      return;
    }
    const macro = MACRO_REGIONS[player.macroRegion];
    const region = macro.areas[player.region];
    const pMon = { ...validTeam[0] };
    addLog(`A wild ${scoutedWild.name} (Lv${scoutedWild.level}) appeared in ${region?.name ?? "the wild"}!`, "#FFD700");
    setBattle({ wild: scoutedWild, pMon, phase: "choose", turnCount: 0, canCatch: true });
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
      pMon.exp += expGain;
      logs.push([`⭐ Wild ${wild.name} fainted! +${expGain} EXP`, "#F44336"]);
      logs.forEach(([m, c]) => addLog(m, c));
      setPlayer((p) => ({ ...p, wins: p.wins + 1 }));
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
      addLog(`💀 ${pMon.name} fainted! You blacked out...`, "#F44336");
      setPlayer((p) => ({ ...p, losses: p.losses + 1 }));
      setTeam((prev) => prev.map((m) => ({ ...m, currentHp: m.maxHp, status: null })));
      addLog("Your team was fully healed!", "#4CAF50");
      setBattle(null);
      setScreen("world");
      return;
    }
    setBattle((prev) => prev && ({ ...prev, wild, pMon, turnCount: prev.turnCount + 1 }));
  }

  function doSwitchPokemon() {
    if (!battle) return;
    const { pMon } = battle;
    const aliveOthers = team.filter((m) => m.currentHp > 0 && !(m.id === pMon.id && m.level === pMon.level));
    if (aliveOthers.length === 0) {
      addLog("No other Pokémon able to fight!", "#F44336");
      return;
    }
    const next = { ...aliveOthers[0] };
    sfx.menuOpen();
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
  }

  function startThrowAim() {
    if (!battle || ballAnim || ringActive) return;
    setRingRadius(110);
    ringDirRef.current = -1;
    setRingActive(true);
  }

  function releaseThrow() {
    if (!battle || ballAnim || !ringActive) return;
    const { wild } = battle;
    const q = ringQuality(ringRadius);
    setRingActive(false);
    sfx.ballThrow();
    setBallAnim("throw");
    addLog(`${q.label}`, q.color);
    const baseRate = 0.2 + (1 - wild.currentHp / wild.maxHp) * 0.6;
    const catchRate = Math.min(0.97, baseRate * q.mult);
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
        const caughtMon = { ...wild, currentHp: wild.maxHp };
        setCaught((prev) => new Set([...prev, wild.id]));
        setTeam((prev) => [...prev.map((m) => ({ ...m, currentHp: m.maxHp, status: null })), caughtMon]);
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
      }
    }, 2300);
  }

  function finishBattle(pMon: Mon, _won: boolean, playerExpGain: number) {
    let mon = { ...pMon };
    let didEvolve: { from: Mon; to: Template } | null = null;
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
    .mon-float { animation: float 2s ease-in-out infinite; }
    .mon-shake { animation: shake 0.35s; }
    .btn {
      background: transparent;
      font-family: 'Press Start 2P', monospace;
      font-size: 8px;
      cursor: pointer;
      transition: all 0.15s;
      letter-spacing: 0.5px;
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
    const url = back ? SPRITE_BACK(sprite) : SPRITE(sprite);
    return (
      <img
        src={url}
        alt={sprite}
        className={className}
        style={{ imageRendering: "pixelated", width: size, height: size, objectFit: "contain", ...style }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    );
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
            151 Pokémon · Hunt · Catch · Battle · Evolve
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
                    const mon = makeMon(p, 5);
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
    const macro = MACRO_REGIONS[player.macroRegion];
    const region = macro.areas[player.region] ?? { name: "—", minLv: 0, maxLv: 0, pool: [] };
    const expPct = Math.min(100, (player.exp / player.expNeeded) * 100);
    const menu = [
      { label: "Hunt",   icon: "fa-dragon",          color: "var(--m-green)",  action: openHunt },
      { label: "Teams",  icon: "fa-users",           color: "var(--m-orange)", action: () => setScreen("team") },
      { label: "Card",   icon: "fa-id-card",         color: "var(--m-pink)",   action: () => setScreen("card") },
      { label: "Dex",    icon: "fa-book",            color: "var(--m-purple)", action: () => setScreen("dex") },
      { label: "Region", icon: "fa-map",             color: "var(--m-blue)",   action: () => setScreen("regionSelect") },
      { label: "Safari", icon: "fa-umbrella-beach",  color: "var(--m-teal)",   action: () => setScreen("regionSelect") },
      { label: "Bag",    icon: "fa-suitcase",        color: "var(--m-brown)",  action: () => setScreen("inventory") },
      { label: "Store",  icon: "fa-store",           color: "var(--m-yellow)", action: () => setScreen("store") },
      { label: "Caught", icon: "fa-trophy",          color: "var(--m-cyan)",   action: () => setScreen("caughtList") },
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
              <div className="m-location"><i className="fa-solid fa-circle" /> {macro.name} &bull; {region.name}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="m-pill" style={{ cursor: "pointer" }}
                onClick={() => { const m = !muted; setMuted(m); sfx.setMuted(m); if (!m) sfx.click(); }}>
                <i className={`fa-solid ${muted ? "fa-volume-xmark" : "fa-volume-high"}`} style={{ color: muted ? "var(--m-muted)" : "var(--m-yellow)" }} />
              </span>
              <span className="m-pill"><i className="fa-solid fa-bullhorn" /> Caught: {caught.size}/151</span>
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
                const elapsed = Date.now() - lastSpinTs;
                const cd = 60_000;
                const ready = elapsed >= cd;
                const remain = Math.max(0, Math.ceil((cd - elapsed) / 1000));
                void spinTick;
                return (
                  <div onClick={ready ? spinPokestop : undefined}
                    style={{ cursor: ready ? "pointer" : "not-allowed", opacity: ready ? 1 : 0.7 }}>
                    <div style={{ fontSize: 9, color: "#cffafe", letterSpacing: 0.5 }}>POKÉSTOP</div>
                    <div style={{ fontSize: 14, color: "#fff", fontWeight: 700 }}>
                      {ready ? "📍 Spin!" : `⏱ ${remain}s`}
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
    const dexPct = Math.round((caught.size / 151) * 100);
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
          <h2 className="m-section-h">Buddy Pokémon</h2>
          <div className="m-list">
            {buddyIdx >= 0 && team[buddyIdx] ? (
              <div className="m-li" onClick={() => { sfx.click(); setShowBuddyPicker(true); }}>
                <div className="m-li-l">
                  <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${team[buddyIdx].id}.png`}
                    alt={team[buddyIdx].name} style={{ width: 40, height: 40, imageRendering: "pixelated" }} />
                  <div className="m-li-t">
                    <span className="m-li-tt">{team[buddyIdx].name}</span>
                    <span className="m-li-st">CP {getCP(team[buddyIdx])} • Earns 1 🍬 / 30s</span>
                  </div>
                </div>
                <i className="fa-solid fa-pencil m-arrow" />
              </div>
            ) : (
              <div className="m-li" onClick={() => { sfx.click(); setShowBuddyPicker(true); }}>
                <div className="m-li-l">
                  <div className="m-stat-ic"><i className="fa-solid fa-paw" /></div>
                  <div className="m-li-t"><span className="m-li-tt">Set a Buddy</span><span className="m-li-st">Earns candy as you play</span></div>
                </div>
                <i className="fa-solid fa-caret-right m-arrow" />
              </div>
            )}
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
              <div><div className="m-stat-lab">Pokémon Seen</div><div className="m-stat-val">{caught.size}</div></div>
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
                <div className="m-li-t"><span className="m-li-tt">{caught.size} Pokémon Seen</span><span className="m-li-st">Browse</span></div>
              </div>
              <i className="fa-solid fa-caret-right m-arrow" />
            </div>
            <div className="m-li" onClick={() => { sfx.click(); setScreen("caughtList"); }}>
              <div className="m-li-l">
                <div className="m-stat-ic"><i className="fa-solid fa-circle-dot" /></div>
                <div className="m-li-t"><span className="m-li-tt">{caught.size} Pokémon Caught</span><span className="m-li-st">Browse</span></div>
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
              { label: "Switch", action: doSwitchPokemon },
              { label: "Run", action: () => { sfx.menuBack(); addLog("Got away safely!", "#aaa"); setTeam((prev) => prev.map((m) => ({ ...m, currentHp: m.maxHp, status: null }))); addLog("Your team was fully healed!", "#4CAF50"); setBattle(null); setScreen("hunt"); } },
              { label: "Pokeballs", action: startThrowAim },
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
        </div>
      </div>
    );
  }

  if (screen === "team") return (
    <div style={S.root}><style>{css}</style>
      <div style={S.wrap}>
        <div style={S.header}>
          <span style={{ fontSize: 9, color: "#FF9800" }}>🎒 MY TEAM ({team.length}/6)</span>
          <button className="btn" style={{ border: "1px solid #555", color: "#888", padding: "5px 10px" }} onClick={() => setScreen("world")}>◀ BACK</button>
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
    const macro = MACRO_REGIONS[player.macroRegion];
    const region = macro.areas[player.region];
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
            {macro.name} <span style={{ color: "#6b7896", margin: "0 6px" }}>•</span> {region?.name ?? "—"}
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

          <div style={{ display: "flex", gap: 12, padding: "20px 18px 24px" }}>
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

  if (screen === "caughtList") {
    const caughtMons = ALL_POKEMON.filter((p) => caught.has(p.id)).sort((a, b) => a.id - b.id);
    return (
      <div style={S.root}><style>{css}</style>
        <div style={S.wrap}>
          <div style={S.header}>
            <span style={{ fontSize: 9, color: "#26A69A" }}>🏆 CAUGHT LIST</span>
            <button className="btn" style={{ border: "1px solid #555", color: "#888", padding: "5px 10px" }} onClick={() => setScreen("world")}>◀ BACK</button>
          </div>
          <div style={{ padding: "10px 12px 4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 7, color: "#aaa" }}>Pokémon Caught</span>
            <span style={{ fontSize: 8, color: "#26A69A" }}>{caughtMons.length} / 151</span>
          </div>
          <div style={{ padding: "4px 12px 8px", display: "flex", gap: 8, fontSize: 9, color: "#fff" }}>
            <div style={{ background: "#7e3aed", padding: "5px 10px", borderRadius: 999 }}>
              <i className="fa-solid fa-wand-sparkles" /> {(player.stardust ?? 0).toLocaleString()}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 10px 10px" }}>
            {caughtMons.length === 0 && (
              <div style={{ textAlign: "center", color: "#333", fontSize: 8, marginTop: 50, lineHeight: 2 }}>
                No Pokémon caught yet<br />
                <span style={{ fontSize: 6, color: "#444" }}>Go hunt and catch some!</span>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {team.map((m, idx) => {
                const cp = getCP(m);
                const iv = ivPercent(m);
                const candy = candies[m.id] ?? 0;
                const cost = 25 + m.level * 5;
                const candyCost = 1 + Math.floor(m.level / 5);
                const canPower = (player.stardust ?? 0) >= cost && candy >= candyCost;
                return (
                  <div key={`team-${idx}`} style={{
                    background: `${TYPE_COLORS[m.type1]}15`,
                    border: `2px solid ${TYPE_COLORS[m.type1]}66`,
                    borderRadius: 10, padding: 10, display: "flex", gap: 10, alignItems: "center",
                  }}>
                    <MonSprite sprite={m.sprite} size={56} className="" />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}>{m.name}</span>
                        <span style={{ fontSize: 8, color: "#FFD700" }}>CP {cp}</span>
                      </div>
                      <div style={{ display: "flex", gap: 4, marginTop: 3 }}>{typeTag(m.type1)}{m.type2 && typeTag(m.type2)}</div>
                      <div style={{ fontSize: 7, color: "#aaa", marginTop: 4 }}>
                        Lv {m.level} • IV {iv}% • 🍬 {candy}{buddyIdx === idx ? " • 👣 Buddy" : ""}
                      </div>
                    </div>
                    <button className="btn"
                      disabled={!canPower}
                      onClick={() => powerUp(idx)}
                      style={{
                        border: `1.5px solid ${canPower ? "#4ade80" : "#333"}`,
                        color: canPower ? "#4ade80" : "#555",
                        background: canPower ? "#0d2218" : "transparent",
                        padding: "8px 10px", borderRadius: 8, fontSize: 7, fontWeight: 700,
                        opacity: canPower ? 1 : 0.5, cursor: canPower ? "pointer" : "not-allowed",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 64,
                      }}>
                      <span style={{ fontSize: 9 }}>POWER UP</span>
                      <span style={{ fontSize: 6 }}>✨{cost} 🍬{candyCost}</span>
                    </button>
                  </div>
                );
              })}
            </div>
            <h3 style={{ fontSize: 8, color: "#aaa", margin: "16px 4px 8px", letterSpacing: 1 }}>POKÉDEX</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {caughtMons.map((p) => (
                <div key={p.id} style={{
                  background: `${TYPE_COLORS[p.type1]}15`,
                  border: `2px solid ${TYPE_COLORS[p.type1]}66`,
                  borderRadius: 8,
                  padding: "8px 4px",
                  textAlign: "center",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                }}>
                  <div style={{ fontSize: 5, color: "#888" }}>#{String(p.id).padStart(3, "0")}</div>
                  <MonSprite sprite={p.sprite} size={48} className="" />
                  <div style={{ fontSize: 6, color: "#fff" }}>{p.name}</div>
                  <div style={{ fontSize: 6, color: "#FFC107" }}>🍬 {candies[p.id] ?? 0}</div>
                  <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>{typeTag(p.type1)}{p.type2 && typeTag(p.type2)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "store") {
    const NATURES = ["Jolly", "Timid", "Modest", "Adamant", "Bold", "Calm", "Brave"];
    const RARE_IDS = new Set([6, 9, 12, 15, 18, 25]);
    const LEGEND_IDS = new Set<number>();
    function priceFor(p: Template) {
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
        items: [
          { name: "TM01 Mega Punch", price: 3000, info: "Normal · 80 pwr" },
          { name: "TM05 Mega Kick", price: 3000, info: "Normal · 120 pwr" },
          { name: "TM13 Ice Beam", price: 4000, info: "Ice · 90 pwr" },
          { name: "TM24 Thunderbolt", price: 4000, info: "Electric · 90 pwr" },
          { name: "TM35 Flamethrower", price: 4000, info: "Fire · 90 pwr" },
          { name: "TM50 Substitute", price: 2000, info: "Status" },
        ] },
    ];
    const cat = categories.find((c) => c.key === storeCat) ?? null;
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
                        if (team.length >= 6) { addLog("Your team is full!", "#F44336"); return; }
                        sfx.menuOpen();
                        const mon = makeMon(p, 5);
                        setPlayer((pl) => ({ ...pl, money: pl.money - price }));
                        setTeam((t) => [...t, mon]);
                        setCaught((c) => new Set([...c, p.id]));
                        addLog(`Purchased ${p.name}!`, "#FFD700");
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
              <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                {(cat?.items ?? []).map((it) => {
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

  if (screen === "regionSelect") {
    const viewMacro = MACRO_REGIONS[pickedMacro];
    return (
      <div style={S.root}><style>{css}</style>
        <div style={S.wrap}>
          <div style={S.header}>
            <span style={{ fontSize: 9, color: "#795548" }}>🗺️ SELECT REGION</span>
            <button className="btn" style={{ border: "1px solid #555", color: "#888", padding: "5px 10px" }} onClick={() => setScreen("world")}>◀ BACK</button>
          </div>

          <div style={{ padding: "10px 10px 4px" }}>
            <div style={{ fontSize: 7, color: "#888", marginBottom: 6, letterSpacing: 1 }}>WORLD MAP</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {MACRO_REGIONS.map((m, i) => {
                const selected = pickedMacro === i;
                const current = player.macroRegion === i;
                return (
                  <button key={m.name} className="btn"
                    disabled={!m.available}
                    style={{
                      border: `2px solid ${selected ? "#ff6b35" : current ? "#4CAF50" : m.available ? "#555" : "#222"}`,
                      background: selected ? "#ff6b3511" : "transparent",
                      color: m.available ? (selected ? "#ff6b35" : "#ddd") : "#444",
                      padding: "10px 4px", borderRadius: 8,
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      cursor: m.available ? "pointer" : "not-allowed",
                      opacity: m.available ? 1 : 0.5,
                    }}
                    onClick={() => m.available && setPickedMacro(i)}>
                    <span style={{ fontSize: 14 }}>{m.emoji}</span>
                    <span style={{ fontSize: 7 }}>{m.name}</span>
                    {!m.available && <span style={{ fontSize: 5, color: "#666" }}>SOON</span>}
                    {current && m.available && <span style={{ fontSize: 5, color: "#4CAF50" }}>HERE</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ borderTop: "1px solid #1a1a3a", margin: "10px 10px 0", paddingTop: 8 }}>
            <div style={{ fontSize: 7, color: "#888", marginBottom: 6, letterSpacing: 1 }}>
              {viewMacro.emoji} {viewMacro.name.toUpperCase()} AREAS
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
            {viewMacro.areas.length === 0 && (
              <div style={{ textAlign: "center", color: "#444", fontSize: 8, marginTop: 30, lineHeight: 2 }}>
                No areas available yet<br />
                <span style={{ fontSize: 6, color: "#333" }}>Coming soon!</span>
              </div>
            )}
            {viewMacro.areas.map((a, i) => {
              const myLv = team[0]?.level ?? 5;
              const danger = myLv < a.minLv - 5 ? "⚠️ DANGER" : myLv > a.maxLv + 10 ? "✅ EASY" : "⚔️ GOOD";
              const isCurrent = player.macroRegion === pickedMacro && player.region === i;
              return (
                <button key={i} className="btn"
                  style={{ border: `2px solid ${isCurrent ? "#ff6b35" : "#222"}`, background: isCurrent ? "#ff6b3511" : "transparent", borderRadius: 8, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", color: isCurrent ? "#ff6b35" : "#aaa" }}
                  onClick={() => {
                    setPlayer((p) => ({ ...p, macroRegion: pickedMacro, region: i }));
                    addLog(`Traveled to ${a.name}, ${viewMacro.name}!`, "#FFD700");
                    setScreen("world");
                  }}>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 8 }}>{a.name}</div>
                    <div style={{ fontSize: 6, color: "#555", marginTop: 2 }}>Lv{a.minLv}–{a.maxLv}</div>
                  </div>
                  <div style={{ fontSize: 7 }}>{danger}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "dex") {
    const types = ["all", ...Array.from(new Set(ALL_POKEMON.map((p) => p.type1)))].sort();
    const filtered = ALL_POKEMON.filter((p) => dexFilter === "all" || p.type1 === dexFilter || p.type2 === dexFilter);
    return (
      <div style={S.root}><style>{css}</style>
        <div style={S.wrap}>
          <div style={S.header}>
            <span style={{ fontSize: 9, color: "#9C27B0" }}>📖 POKÉDEX ({caught.size}/151)</span>
            <button className="btn" style={{ border: "1px solid #555", color: "#888", padding: "5px 10px" }} onClick={() => setScreen("world")}>◀ BACK</button>
          </div>
          <div style={{ padding: "8px 10px 4px", overflowX: "auto", display: "flex", gap: 4 }}>
            {types.map((t) => (
              <button key={t} className="btn"
                style={{ border: `1px solid ${t === "all" ? "#555" : TYPE_COLORS[t]}`, color: t === "all" ? "#888" : TYPE_COLORS[t], padding: "4px 8px", borderRadius: 4, background: dexFilter === t ? "#fff2" : "transparent", flexShrink: 0 }}
                onClick={() => setDexFilter(t)}>{t === "all" ? "ALL" : t}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
              {filtered.map((p) => {
                const seen = caught.has(p.id) || team.some((m) => m.id === p.id);
                return (
                  <div key={p.id} style={{ background: seen ? `${TYPE_COLORS[p.type1]}11` : "#0a0a1e", border: `1px solid ${seen ? TYPE_COLORS[p.type1] + "66" : "#1a1a1a"}`, borderRadius: 8, padding: "8px 4px", textAlign: "center", opacity: seen ? 1 : 0.45 }}>
                    {seen
                      ? <MonSprite sprite={p.sprite} size={52} className="" />
                      : <div style={{ width: 52, height: 52, margin: "0 auto", background: "#111", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>❓</div>
                    }
                    <div style={{ fontSize: 5, color: seen ? "#ddd" : "#333", marginTop: 3 }}>#{String(p.id).padStart(3, "0")}</div>
                    <div style={{ fontSize: 6, color: seen ? "#fff" : "#333", marginTop: 1 }}>{seen ? p.name : "????"}</div>
                    {seen && <div style={{ display: "flex", justifyContent: "center", gap: 2, marginTop: 3 }}>{typeTag(p.type1)}</div>}
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

import { useState, useEffect, useRef, useCallback } from "react";

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
  };
}

const REGIONS = [
  { name: "Pallet Town",     minLv: 2, maxLv: 6,  pool: [16, 19, 10, 13, 4, 1, 7] },
  { name: "Viridian Forest", minLv: 5, maxLv: 12, pool: [10, 11, 12, 13, 14, 15, 16, 25] },
  { name: "Mt. Moon",        minLv: 8, maxLv: 18, pool: [16, 19, 10] },
];

type LogEntry = { msg: string; color: string; id: number };
type Player = { name: string; hometown: string; money: number; region: number; level: number; exp: number; expNeeded: number; sprite: string };
type Battle = { wild: Mon; pMon: Mon; phase: string; turnCount: number; canCatch: boolean };

export default function App() {
  const [screen, setScreen] = useState("title");
  const [player, setPlayer] = useState<Player>({
    name: "Trainer",
    hometown: "Nuvema Town",
    money: 3000,
    region: 0,
    level: 1,
    exp: 0,
    expNeeded: 100,
    sprite: "hilbert",
  });
  const [team, setTeam] = useState<Mon[]>([]);
  const [inventory] = useState<unknown[]>([]);
  const [caught, setCaught] = useState<Set<number>>(new Set());
  const [log, setLog] = useState<LogEntry[]>([]);
  const [battle, setBattle] = useState<Battle | null>(null);
  const [shakeE, setShakeE] = useState(false);
  const [shakeP, setShakeP] = useState(false);
  const [evolving, setEvolving] = useState<{ from: string; to: string; sprite: string } | null>(null);
  const [dexFilter, setDexFilter] = useState("all");
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = 99999; }, [log]);

  const addLog = useCallback((msg: string, color = "#ddd") => {
    setLog((p) => [...p.slice(-40), { msg, color, id: Date.now() + Math.random() }]);
  }, []);

  function getPokemon(id: number) { return ALL_POKEMON.find((p) => p.id === id)!; }

  function startWildBattle() {
    const region = REGIONS[player.region];
    const poolId = region.pool[Math.floor(Math.random() * region.pool.length)];
    const template = getPokemon(poolId);
    const lv = region.minLv + Math.floor(Math.random() * (region.maxLv - region.minLv + 1));
    const wild = makeMon(template, lv);

    const validTeam = team.filter((m) => m.currentHp > 0);
    if (validTeam.length === 0) {
      addLog("Your team is too exhausted to battle!", "#F44336");
      return;
    }

    const pMon = { ...validTeam[0] };
    addLog(`A wild ${wild.name} (Lv${lv}) appeared in ${region.name}!`, "#FFD700");
    setBattle({ wild, pMon, phase: "choose", turnCount: 0, canCatch: true });
    setScreen("battle");
  }

  function doPlayerMove(move: string) {
    if (!battle || battle.phase !== "choose") return;
    let { wild, pMon } = battle;
    const logs: [string, string][] = [];
    wild = { ...wild }; pMon = { ...pMon };

    const pwr = MOVE_POWER[move] ?? 40;
    const dmg = calcDmg(pMon.atk, wild.def, pwr);
    if (dmg > 0) {
      wild.currentHp = Math.max(0, wild.currentHp - dmg);
      setShakeE(true); setTimeout(() => setShakeE(false), 350);
      logs.push([`${pMon.name} used ${move}! (${dmg} dmg)`, "#81D4FA"]);
    } else {
      logs.push([`${pMon.name} used ${move}!`, "#aaa"]);
    }

    if (wild.currentHp <= 0) {
      const expGain = Math.floor(wild.level * (wild.atk + wild.def) / 8);
      pMon.exp += expGain;
      logs.push([`Wild ${wild.name} fainted! +${expGain} EXP`, "#F44336"]);
      logs.forEach(([m, c]) => addLog(m, c));
      finishBattle(pMon, true, expGain);
      return;
    }

    const eMove = wild.moves[Math.floor(Math.random() * wild.moves.length)];
    const ePwr = MOVE_POWER[eMove] ?? 30;
    const eDmg = calcDmg(wild.atk, pMon.def, ePwr);
    if (eDmg > 0) {
      pMon.currentHp = Math.max(0, pMon.currentHp - eDmg);
      setShakeP(true); setTimeout(() => setShakeP(false), 350);
      logs.push([`${wild.name} used ${eMove}! (${eDmg} dmg)`, "#FF7043"]);
    } else {
      logs.push([`${wild.name} used ${eMove}!`, "#aaa"]);
    }

    logs.forEach(([m, c]) => addLog(m, c));

    if (pMon.currentHp <= 0) {
      addLog(`${pMon.name} fainted! You blacked out...`, "#F44336");
      setTeam((prev) => {
        const newTeam = [...prev];
        const idx = newTeam.findIndex((m) => m.id === pMon.id && m.level === pMon.level);
        if (idx !== -1) newTeam[idx] = pMon;
        return newTeam;
      });
      setBattle(null);
      setScreen("world");
      return;
    }
    setBattle((prev) => prev && ({ ...prev, wild, pMon, turnCount: prev.turnCount + 1 }));
  }

  function doThrowBall() {
    if (!battle) return;
    const { wild } = battle;
    const catchRate = 0.2 + (1 - wild.currentHp / wild.maxHp) * 0.6;
    if (Math.random() < catchRate) {
      addLog(`Gotcha! ${wild.name} was caught!`, "#4CAF50");
      const caughtMon = { ...wild, currentHp: wild.maxHp };
      setCaught((prev) => new Set([...prev, wild.id]));
      setTeam((prev) => [...prev, caughtMon]);
      setBattle(null);
      setScreen("world");
    } else {
      addLog(`${wild.name} broke free!`, "#F44336");
    }
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
      addLog(`${mon.name} leveled up to Lv${mon.level}!`, "#FFD700");

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
        addLog(`You leveled up to Trainer Lv${p.level}!`, "#FF9800");
      }
      return p;
    });

    setTeam((prev) => {
      const newTeam = [...prev];
      const idx = newTeam.findIndex((m) => m.id === mon.id);
      if (idx !== -1) newTeam[idx] = mon;
      return newTeam;
    });
    setCaught((prev) => new Set([...prev, mon.id]));
    setBattle(null);

    if (didEvolve) {
      const ev = didEvolve;
      setTimeout(() => {
        const evolved = makeMon(ev.to, mon.level);
        evolved.currentHp = Math.min(evolved.maxHp, mon.currentHp + 20);
        evolved.exp = mon.exp;
        evolved.expNeeded = mon.expNeeded;
        setTeam((prev) => [evolved, ...prev.slice(1)]);
        setCaught((prev) => new Set([...prev, ev.to.id]));
        setEvolving({ from: ev.from.name, to: ev.to.name, sprite: ev.to.sprite });
        addLog(`${ev.from.name} evolved into ${ev.to.name}!`, "#CE93D8");
        setTimeout(() => setEvolving(null), 3000);
        setScreen("world");
      }, 500);
    } else {
      setScreen("world");
    }
  }

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
    * { box-sizing: border-box; }
    body { margin: 0; background: #05050f; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: #0a0a1e; }
    ::-webkit-scrollbar-thumb { background: #ff6b35; border-radius: 2px; }
    @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-7px)} 60%{transform:translateX(7px)} }
    @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
    @keyframes evoFlash { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0;transform:scale(1.5)} }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
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
  `;

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
            <div style={{ fontSize: 26, color: "#ff6b35", letterSpacing: 4, textShadow: "0 0 30px #ff6b35cc" }}>HEXAMON</div>
            <div style={{ fontSize: 7, color: "#555", marginTop: 6, letterSpacing: 3 }}>GEN I · KANTO REGION</div>
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
    const region = REGIONS[player.region];
    return (
      <div style={S.root}><style>{css}</style>
        <div style={S.wrap}>
          {evolving && (
            <div style={{ position: "fixed", inset: 0, background: "#000a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 99, gap: 16 }}>
              <div style={{ fontSize: 10, color: "#CE93D8", textAlign: "center", animation: "pulse 0.5s infinite" }}>✨ EVOLVING! ✨</div>
              <div style={{ fontSize: 36, animation: "evoFlash 0.8s infinite" }}>🌟</div>
              <MonSprite sprite={evolving.sprite} size={100} />
              <div style={{ fontSize: 9, color: "#fff" }}>{evolving.from} → {evolving.to}!</div>
            </div>
          )}

          <div style={S.header}>
            <div>
              <div style={{ fontSize: 9, color: "#ff6b35" }}>HEXAMON</div>
              <div style={{ fontSize: 6, color: "#666", marginTop: 2 }}>{region.name}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 6, color: "#555", marginTop: 2 }}>Caught: {caught.size}/151</div>
            </div>
          </div>

          <div style={{ margin: "12px 12px 8px", background: "#0f0f24", border: `2px solid #E91E6366`, borderRadius: 12, padding: "12px 14px", display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#F44336", display: "flex", alignItems: "flex-end", justifyContent: "center", overflow: "hidden", border: "3px solid #fff", flexShrink: 0 }}>
              <img src={TRAINER_SPRITE(player.sprite)} style={{ width: 80, height: 80, objectFit: "contain", marginBottom: -10 }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 9, color: "#fff" }}>{player.name}</span>
                <span style={{ fontSize: 7, color: "#888" }}>Lv{player.level}</span>
              </div>
              <div style={{ fontSize: 6, color: "#aaa", marginBottom: 8 }}>{player.hometown}</div>
              <ExpBar exp={player.exp} needed={player.expNeeded} />
              <div style={{ fontSize: 5, color: "#444", marginTop: 3 }}>EXP {player.exp}/{player.expNeeded}</div>
            </div>
          </div>

          {team.length > 0 && (
            <div style={{ margin: "0 12px 8px", display: "flex", gap: 6, alignItems: "center", overflowX: "auto", paddingBottom: 4 }}>
              <span style={{ fontSize: 6, color: "#555" }}>TEAM:</span>
              {team.map((m, i) => (
                <div key={i} style={{ position: "relative", flexShrink: 0 }}>
                  <MonSprite sprite={m.sprite} size={28} style={{ opacity: m.currentHp <= 0 ? 0.3 : 1 }} />
                </div>
              ))}
            </div>
          )}

          <div style={{ padding: "0 12px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
            {[
              { label: "🌲 HUNT", color: "#4CAF50", action: startWildBattle },
              { label: "🎒 TEAM", color: "#FF9800", action: () => setScreen("team") },
              { label: "🪪 CARD", color: "#E91E63", action: () => setScreen("card") },
              { label: "📖 DEX", color: "#9C27B0", action: () => setScreen("dex") },
              { label: "🗺️ REGION", color: "#795548", action: () => setScreen("regionSelect") },
              { label: "👜 INV", color: "#607D8B", action: () => setScreen("inventory") },
            ].map((b) => (
              <button key={b.label} className="btn"
                style={{ border: `2px solid ${b.color}`, color: b.color, padding: "10px 4px", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}
                onClick={b.action}>
                <span style={{ fontSize: 9 }}>{b.label}</span>
              </button>
            ))}
          </div>

          <div ref={logRef} style={{ flex: 1, margin: "0 12px 12px", background: "#050510", border: "1px solid #1a1a3a", borderRadius: 8, padding: "8px 10px", overflowY: "auto", minHeight: 100, maxHeight: 160 }}>
            {log.length === 0 && <div style={{ fontSize: 7, color: "#333" }}>▸ Your adventure awaits...</div>}
            {log.map((l) => <div key={l.id} style={{ fontSize: 7, color: l.color, marginBottom: 3, lineHeight: 1.8 }}>▸ {l.msg}</div>)}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "card") return (
    <div style={S.root}><style>{css}</style>
      <div style={S.wrap}>
        <div style={S.header}>
          <span style={{ fontSize: 9, color: "#E91E63" }}>🪪 PLAYER CARD</span>
          <button className="btn" style={{ border: "1px solid #555", color: "#888", padding: "5px 10px" }} onClick={() => setScreen("world")}>◀ BACK</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
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
            <button className="btn" style={{ border: "1px solid #555", color: "#888", padding: "4px 8px", fontSize: 7 }} onClick={() => { addLog("Got away safely!", "#aaa"); setBattle(null); setScreen("world"); }}>RUN🏃</button>
          </div>

          <div style={{ position: "relative", height: 210, background: "linear-gradient(180deg,#0f0f2a,#05050f)", margin: "10px 10px 0", borderRadius: 12, border: "1px solid #1a1a3a", overflow: "hidden" }}>
            <div style={{ position: "absolute", bottom: 50, left: 0, right: 0, height: 2, background: "#1a2a1a" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 50, background: "#0a1a0a" }} />

            <div style={{ position: "absolute", top: 10, right: 30 }}>
              <MonSprite sprite={wild.sprite} size={90} className={shakeE ? "mon-shake" : "mon-float"} />
            </div>
            <div style={{ position: "absolute", bottom: 18, left: 20 }}>
              <MonSprite sprite={pMon.sprite} size={90} back className={shakeP ? "mon-shake" : "mon-float"} />
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

          <div style={{ padding: "6px 10px 14px", display: "flex", gap: 6 }}>
            <button className="btn" style={{ flex: 1, border: "2px solid #FFD700", color: "#FFD700", padding: "10px 6px", borderRadius: 6, fontSize: 8 }}
              onClick={doThrowBall}>🎯 THROW BALL</button>
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
          <span style={{ fontSize: 9, color: "#607D8B" }}>👜 INVENTORY</span>
          <button className="btn" style={{ border: "1px solid #555", color: "#888", padding: "5px 10px" }} onClick={() => setScreen("world")}>◀ BACK</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
          {inventory.length === 0 && <div style={{ textAlign: "center", color: "#333", fontSize: 8, marginTop: 40 }}>Your inventory is empty</div>}
        </div>
      </div>
    </div>
  );

  if (screen === "regionSelect") return (
    <div style={S.root}><style>{css}</style>
      <div style={S.wrap}>
        <div style={S.header}>
          <span style={{ fontSize: 9, color: "#795548" }}>🗺️ KANTO REGIONS</span>
          <button className="btn" style={{ border: "1px solid #555", color: "#888", padding: "5px 10px" }} onClick={() => setScreen("world")}>◀ BACK</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {REGIONS.map((a, i) => {
            const myLv = team[0]?.level ?? 5;
            const recMin = a.minLv; const recMax = a.maxLv;
            const danger = myLv < recMin - 5 ? "⚠️ DANGER" : myLv > recMax + 10 ? "✅ EASY" : "⚔️ GOOD";
            return (
              <button key={i} className="btn"
                style={{ border: `2px solid ${player.region === i ? "#ff6b35" : "#222"}`, background: player.region === i ? "#ff6b3511" : "transparent", borderRadius: 8, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", color: player.region === i ? "#ff6b35" : "#aaa" }}
                onClick={() => { setPlayer((p) => ({ ...p, region: i })); addLog(`Traveled to ${a.name}!`, "#FFD700"); setScreen("world"); }}>
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

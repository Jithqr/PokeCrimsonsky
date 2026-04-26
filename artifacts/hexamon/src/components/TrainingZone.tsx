import { useState, useMemo } from "react";
import { ALL_POKEMON, type PokemonTemplate } from "../lib/pokemon-data";

const SPRITE = (name: string) => `https://play.pokemonshowdown.com/sprites/ani/${name.replace(/[^a-z0-9]/g, "")}.gif`;

// EV stat keys aligned to Mon.evHp/evAtk/...
type EvKey = "hp" | "atk" | "def" | "spa" | "spd" | "spe";

const EV_LABEL: Record<EvKey, string> = { hp: "HP", atk: "Attack", def: "Defense", spa: "Sp. Atk", spd: "Sp. Def", spe: "Speed" };
const EV_ICON:  Record<EvKey, string> = { hp: "❤️", atk: "⚔️", def: "🛡️", spa: "✨", spd: "🌀", spe: "💨" };
const EV_COLOR: Record<EvKey, string> = { hp: "#F44336", atk: "#FF7043", def: "#FBC02D", spa: "#42A5F5", spd: "#26A69A", spe: "#AB47BC" };

const EV_TOTAL_CAP = 510;
const EV_PER_STAT_CAP = 252;
const PAID_INJECT_COST = 15000;   // ₽ per stat to instantly max it

// Build encounter pools by stat. Pick 8 species per stat: those with the highest base stat
// in that category make sensible "yields N EVs in X" gym/route fillers.
function buildPools(): Record<EvKey, PokemonTemplate[]> {
  const result: Record<EvKey, PokemonTemplate[]> = { hp: [], atk: [], def: [], spa: [], spd: [], spe: [] };
  const pickedIds = new Set<number>();
  const pick = (key: EvKey, getBase: (p: PokemonTemplate) => number) => {
    const sorted = [...ALL_POKEMON]
      .filter((p) => !pickedIds.has(p.id))
      .sort((a, b) => getBase(b) - getBase(a))
      .slice(0, 12);   // some breathing room
    sorted.forEach((p) => pickedIds.add(p.id));
    result[key] = sorted.slice(0, 8);
  };
  // Order matters — pick HP, then offensive stats, etc., so we don't double-up species.
  pick("hp",  (p) => p.hp);
  pick("atk", (p) => p.atk);
  pick("def", (p) => p.def);
  pick("spa", (p) => p.spa);
  pick("spd", (p) => (p as any).spd ?? p.spa);
  pick("spe", (p) => p.spe);
  return result;
}

const POOLS = buildPools();

// EV yield amount based on the species' base stat — stronger mons give more.
function evYieldFor(p: PokemonTemplate, stat: EvKey): number {
  const base = stat === "spd" ? ((p as any).spd ?? p.spa) : (p as any)[stat] as number;
  if (base >= 130) return 3;
  if (base >= 100) return 2;
  return 1;
}

type Mon = {
  uid?: string; id: number; name: string; sprite: string; level: number;
  evHp?: number; evAtk?: number; evDef?: number; evSpa?: number; evSpd?: number; evSpe?: number;
  hp: number; atk: number; def: number; spa: number; spd?: number; spe: number;
  ivHp: number; ivAtk: number; ivDef: number; ivSpa?: number; ivSpd?: number; ivSpe?: number;
  maxHp: number; currentHp: number;
  // any others we leave alone
};

type Props = {
  team: Mon[];
  money: number;
  onUpdateMon: (uid: string, ev: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number }) => void;
  onSpendMoney: (amount: number) => void;
  onBack: () => void;
  toast: (msg: string, color?: string) => void;
};

function evTotal(m: Mon): number {
  return (m.evHp ?? 0) + (m.evAtk ?? 0) + (m.evDef ?? 0) + (m.evSpa ?? 0) + (m.evSpd ?? 0) + (m.evSpe ?? 0);
}

export default function TrainingZone(props: Props) {
  const { team, money, onUpdateMon, onSpendMoney, onBack, toast } = props;
  const trainable = team.filter((m) => m.uid);
  const [activeIdx, setActiveIdx] = useState(0);
  const [zone, setZone] = useState<EvKey>("atk");
  const [encounter, setEncounter] = useState<{ p: PokemonTemplate; yield: number; stat: EvKey } | null>(null);
  const [busy, setBusy] = useState(false);

  const active = trainable[activeIdx];
  const evs = useMemo(() => active ? {
    hp: active.evHp ?? 0, atk: active.evAtk ?? 0, def: active.evDef ?? 0,
    spa: active.evSpa ?? 0, spd: active.evSpd ?? 0, spe: active.evSpe ?? 0,
  } : { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, [active]);
  const total = active ? evTotal(active) : 0;

  if (!active) {
    return (
      <div style={pageStyle}>
        <Header onBack={onBack} />
        <div style={{ padding: 30, textAlign: "center" }}>
          <h2 style={{ marginTop: 30 }}>No team Pokémon to train.</h2>
          <p>Catch a Pokémon and add it to your team first.</p>
        </div>
      </div>
    );
  }

  function findWild() {
    setBusy(true);
    setTimeout(() => {
      const pool = POOLS[zone];
      const p = pool[Math.floor(Math.random() * pool.length)];
      setEncounter({ p, yield: evYieldFor(p, zone), stat: zone });
      setBusy(false);
    }, 250);
  }

  function applyEvGain(stat: EvKey, amount: number) {
    if (!active.uid) return;
    const next = { ...evs };
    const room = Math.max(0, EV_PER_STAT_CAP - next[stat]);
    const totalRoom = Math.max(0, EV_TOTAL_CAP - total);
    const granted = Math.min(amount, room, totalRoom);
    const wasted = amount - granted;
    next[stat] = next[stat] + granted;
    onUpdateMon(active.uid, next);
    if (granted > 0) toast(`+${granted} ${EV_LABEL[stat]} EV gained!`, EV_COLOR[stat]);
    if (wasted > 0) toast(`Wasted ${wasted} EV (cap reached).`, "#FF9800");
  }

  function captureEncounter() {
    if (!encounter) return;
    // Simple capture: 70% success.
    const success = Math.random() < 0.70;
    if (!success) {
      toast(`The wild ${encounter.p.name} broke free!`, "#F44336");
      setEncounter(null);
      return;
    }
    applyEvGain(encounter.stat, encounter.yield);
    setEncounter(null);
  }

  function paidInject(stat: EvKey) {
    if (!active.uid) return;
    if (money < PAID_INJECT_COST) { toast(`Need ₽${PAID_INJECT_COST.toLocaleString()}.`, "#F44336"); return; }
    const current = evs[stat];
    if (current >= EV_PER_STAT_CAP) { toast(`${EV_LABEL[stat]} is already maxed.`, "#FF9800"); return; }
    const wouldAdd = EV_PER_STAT_CAP - current;
    if (total + wouldAdd > EV_TOTAL_CAP) { toast(`Total EV cap (510) would be exceeded.`, "#F44336"); return; }
    onSpendMoney(PAID_INJECT_COST);
    const next = { ...evs };
    next[stat] = EV_PER_STAT_CAP;
    onUpdateMon(active.uid, next);
    toast(`Injected 252 ${EV_LABEL[stat]} EVs!`, EV_COLOR[stat]);
  }

  return (
    <div style={pageStyle}>
      <Header onBack={onBack} />
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Trainee selector */}
        <div style={card}>
          <div style={cardTitle}>Active Trainee</div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "4px 0" }}>
            {trainable.map((m, i) => (
              <button key={m.uid ?? i} onClick={() => setActiveIdx(i)}
                style={{
                  ...miniMonStyle,
                  borderColor: i === activeIdx ? "#4CAF50" : "rgba(255,255,255,0.15)",
                  background: i === activeIdx ? "rgba(76,175,80,0.18)" : "rgba(255,255,255,0.05)",
                }}>
                <img src={SPRITE(m.sprite)} alt={m.name} style={{ width: 48, height: 48, imageRendering: "pixelated" }} />
                <div style={{ fontSize: 11, fontWeight: 700 }}>{m.name}</div>
                <div style={{ fontSize: 10, opacity: 0.75 }}>Lv{m.level} · EV {evTotal(m)}/{EV_TOTAL_CAP}</div>
              </button>
            ))}
          </div>
        </div>

        {/* EV bars */}
        <div style={card}>
          <div style={cardTitle}>EV Distribution — Total {total}/{EV_TOTAL_CAP}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
            {(Object.keys(EV_LABEL) as EvKey[]).map((k) => (
              <div key={k}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                  <span>{EV_ICON[k]} {EV_LABEL[k]}</span>
                  <span>{evs[k]} / {EV_PER_STAT_CAP}</span>
                </div>
                <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: 6, height: 10, overflow: "hidden" }}>
                  <div style={{
                    width: `${(evs[k] / EV_PER_STAT_CAP) * 100}%`, height: "100%",
                    background: EV_COLOR[k], transition: "width 400ms ease",
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* EV Zones (encounter system) */}
        <div style={card}>
          <div style={cardTitle}>EV Zones — Catch wild Pokémon to grind EVs</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginTop: 6 }}>
            {(Object.keys(EV_LABEL) as EvKey[]).map((k) => (
              <button key={k} onClick={() => { setZone(k); setEncounter(null); }}
                style={{
                  background: zone === k ? `linear-gradient(135deg, ${EV_COLOR[k]}, ${EV_COLOR[k]}aa)` : "rgba(255,255,255,0.05)",
                  border: "1px solid " + (zone === k ? "#fff" : "rgba(255,255,255,0.15)"),
                  color: "#fff", borderRadius: 10, padding: "8px 6px", cursor: "pointer", fontWeight: 700, fontSize: 12,
                }}>
                <div style={{ fontSize: 18 }}>{EV_ICON[k]}</div>
                <div>{EV_LABEL[k]}</div>
              </button>
            ))}
          </div>

          {!encounter && (
            <button onClick={findWild} disabled={busy}
              style={{ ...primaryBtn, marginTop: 12, background: EV_COLOR[zone] }}>
              {busy ? "Searching…" : `Find Wild ${EV_LABEL[zone]} Pokémon`}
            </button>
          )}

          {encounter && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: 12, background: "rgba(0,0,0,0.35)", borderRadius: 12 }}>
              <img src={SPRITE(encounter.p.sprite)} alt={encounter.p.name} style={{ width: 96, height: 96, imageRendering: "pixelated" }} />
              <div style={{ fontWeight: 800, fontSize: 16 }}>Wild {encounter.p.name}!</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Yields <strong style={{ color: EV_COLOR[encounter.stat] }}>+{encounter.yield} {EV_LABEL[encounter.stat]} EV</strong> on capture</div>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button onClick={captureEncounter} style={{ ...primaryBtn, background: "#4CAF50" }}>Capture</button>
                <button onClick={() => setEncounter(null)} style={{ ...primaryBtn, background: "#777" }}>Run</button>
              </div>
            </div>
          )}
        </div>

        {/* Glassy paid instant training */}
        <div style={glassCard}>
          <div style={{ ...cardTitle, color: "#fff" }}>⚡ Instant Training — ₽{PAID_INJECT_COST.toLocaleString()}/stat</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 8 }}>
            Spend money to instantly max out a stat to 252 EVs. Respects the 510 total cap.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {(Object.keys(EV_LABEL) as EvKey[]).map((k) => {
              const maxed = evs[k] >= EV_PER_STAT_CAP;
              const wouldFit = total + (EV_PER_STAT_CAP - evs[k]) <= EV_TOTAL_CAP;
              const canAfford = money >= PAID_INJECT_COST;
              const enabled = !maxed && wouldFit && canAfford;
              return (
                <button key={k} disabled={!enabled} onClick={() => paidInject(k)}
                  style={{
                    background: enabled ? `linear-gradient(135deg, ${EV_COLOR[k]}88, ${EV_COLOR[k]}44)` : "rgba(255,255,255,0.04)",
                    border: "1px solid " + (enabled ? `${EV_COLOR[k]}` : "rgba(255,255,255,0.12)"),
                    color: "#fff", borderRadius: 10, padding: 8, cursor: enabled ? "pointer" : "not-allowed",
                    opacity: enabled ? 1 : 0.5, fontWeight: 700, fontSize: 12,
                    backdropFilter: "blur(6px)",
                  }}>
                  <div style={{ fontSize: 16 }}>{EV_ICON[k]}</div>
                  <div>{EV_LABEL[k]}</div>
                  <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>
                    {maxed ? "Maxed" : !wouldFit ? "Cap" : !canAfford ? "₽" : "Inject 252"}
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span>Wallet</span>
            <strong>₽{money.toLocaleString()}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Styles ----

const pageStyle: React.CSSProperties = {
  position: "fixed", inset: 0, overflowY: "auto",
  background: "linear-gradient(180deg, #1f2640 0%, #2a1f4a 100%)",
  color: "#fff", fontFamily: "system-ui", zIndex: 8500,
};
const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 16, padding: 12,
};
const glassCard: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))",
  border: "1px solid rgba(255,255,255,0.18)", borderRadius: 16, padding: 14,
  backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
};
const cardTitle: React.CSSProperties = { fontWeight: 800, fontSize: 14, marginBottom: 4 };
const primaryBtn: React.CSSProperties = {
  width: "100%", padding: "10px 14px", border: 0, borderRadius: 10,
  color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
};
const miniMonStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 10, padding: "6px 10px", color: "#fff", cursor: "pointer", minWidth: 90,
};

function Header({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 1, padding: "12px 14px", background: "rgba(0,0,0,0.45)", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <button onClick={onBack} style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>← Back</button>
      <div style={{ fontWeight: 800, fontSize: 16 }}>🏋️ Training Zone</div>
      <div style={{ width: 60 }} />
    </div>
  );
}

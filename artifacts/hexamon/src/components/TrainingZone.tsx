import { useState, useEffect } from "react";
import { ALL_POKEMON, type PokemonTemplate } from "../lib/pokemon-data";

const SPRITE = (name: string) => `https://play.pokemonshowdown.com/sprites/ani/${name.replace(/[^a-z0-9]/g, "")}.gif`;

type EvKey = "hp" | "atk" | "def" | "spa" | "spd" | "spe";

const EV_LABEL: Record<EvKey, string> = { hp: "HP", atk: "Attack", def: "Defense", spa: "Sp. Atk", spd: "Sp. Def", spe: "Speed" };
const EV_COLOR: Record<EvKey, string> = { hp: "#ef4444", atk: "#fb923c", def: "#facc15", spa: "#60a5fa", spd: "#34d399", spe: "#c084fc" };

const EV_TOTAL_CAP = 510;
const EV_PER_STAT_CAP = 252;
const PAID_COST_PER_EV = 1; // ₽1 per EV in Paid Zone
const FREE_ZONE_COUNT = 50;

// Build encounter pools by stat (highest base stat in that category).
function buildPools(): Record<EvKey, PokemonTemplate[]> {
  const result: Record<EvKey, PokemonTemplate[]> = { hp: [], atk: [], def: [], spa: [], spd: [], spe: [] };
  const pickedIds = new Set<number>();
  const pick = (key: EvKey, getBase: (p: PokemonTemplate) => number) => {
    const sorted = [...ALL_POKEMON].filter((p) => !pickedIds.has(p.id))
      .sort((a, b) => getBase(b) - getBase(a)).slice(0, 12);
    sorted.forEach((p) => pickedIds.add(p.id));
    result[key] = sorted.slice(0, 8);
  };
  pick("hp",  (p) => p.hp);
  pick("atk", (p) => p.atk);
  pick("def", (p) => p.def);
  pick("spa", (p) => p.spa);
  pick("spd", (p) => (p as any).spd ?? p.spa);
  pick("spe", (p) => p.spe);
  return result;
}

const POOLS = buildPools();

function evYieldFor(p: PokemonTemplate, stat: EvKey): number {
  const base = stat === "spd" ? ((p as any).spd ?? p.spa) : (p as any)[stat] as number;
  if (base >= 130) return 3;
  if (base >= 100) return 2;
  return 1;
}

type Mon = {
  uid?: string; id: number; name: string; sprite: string; level: number;
  type1?: string; type2?: string | null;
  moves: string[];
  evHp?: number; evAtk?: number; evDef?: number; evSpa?: number; evSpd?: number; evSpe?: number;
  hp: number; atk: number; def: number; spa: number; spd?: number; spe: number;
  ivHp: number; ivAtk: number; ivDef: number; ivSpa?: number; ivSpd?: number; ivSpe?: number;
  maxHp: number; currentHp: number;
  canEvolve?: number; evolveAt?: number;
};

type Props = {
  team: Mon[];
  money: number;
  onUpdateMon: (uid: string, ev: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number }) => void;
  onMutateMon: (uid: string, patch: Partial<Mon>) => void;
  onSpendMoney: (amount: number) => void;
  onBack: () => void;
  toast: (msg: string, color?: string) => void;
};

function evTotal(m: Mon): number {
  return (m.evHp ?? 0) + (m.evAtk ?? 0) + (m.evDef ?? 0) + (m.evSpa ?? 0) + (m.evSpd ?? 0) + (m.evSpe ?? 0);
}

// Each level up may produce events the player must review.
type LearnEvent = { type: "learn"; move: string };
type EvolveEvent = { type: "evolve"; toId: number; toName: string; toSprite: string };
type AnyEvent = LearnEvent | EvolveEvent;

export default function TrainingZone(props: Props) {
  const { team, money, onUpdateMon, onMutateMon, onSpendMoney, onBack, toast } = props;
  const trainable = team.filter((m) => m.uid);
  const [activeIdx, setActiveIdx] = useState(0);
  const [view, setView] = useState<"select" | "paid" | "free" | "freeHunt">("select");
  const [freeStat, setFreeStat] = useState<EvKey>("atk");

  const active = trainable[activeIdx];
  if (!active) {
    return (
      <div style={pageStyle}>
        <Header onBack={onBack} title="Training Zone" />
        <div style={{ padding: 30, textAlign: "center" }}>
          <h2 style={{ marginTop: 30 }}>No team Pokémon to train.</h2>
          <p style={{ opacity: 0.7 }}>Catch a Pokémon and add it to your team first.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {view === "select" && (
        <>
          <Header onBack={onBack} title="Training Zone" />
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
            <TraineePicker trainable={trainable} activeIdx={activeIdx} setActiveIdx={setActiveIdx} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button onClick={() => setView("free")} style={zoneBtn("#34d399")}>
                <div style={{ fontSize: 28 }}>🌿</div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Free Zone</div>
                <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>Grind EVs by defeating wild Pokémon</div>
              </button>
              <button onClick={() => setView("paid")} style={zoneBtn("#facc15")}>
                <div style={{ fontSize: 28 }}>💰</div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Paid Zone</div>
                <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>₽1 per EV · Free leveling</div>
              </button>
            </div>
            <ActiveMonSummary mon={active} />
          </div>
        </>
      )}

      {view === "paid" && (
        <PaidZone
          mon={active}
          money={money}
          onBack={() => setView("select")}
          onCommitEv={onUpdateMon}
          onMutateMon={onMutateMon}
          onSpendMoney={onSpendMoney}
          toast={toast}
        />
      )}

      {view === "free" && (
        <FreeZonePicker
          mon={active}
          stat={freeStat}
          setStat={setFreeStat}
          onBack={() => setView("select")}
          onStart={() => setView("freeHunt")}
        />
      )}

      {view === "freeHunt" && (
        <FreeZoneHunt
          mon={active}
          stat={freeStat}
          onUpdateMon={onUpdateMon}
          onExit={() => setView("free")}
          toast={toast}
        />
      )}
    </div>
  );
}

/* ============================ TRAINEE PICKER ============================ */
function TraineePicker({ trainable, activeIdx, setActiveIdx }: { trainable: Mon[]; activeIdx: number; setActiveIdx: (i: number) => void }) {
  return (
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
  );
}

function ActiveMonSummary({ mon }: { mon: Mon }) {
  const tpl = ALL_POKEMON.find((p) => p.id === mon.id);
  return (
    <div style={card}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <img src={SPRITE(mon.sprite)} alt={mon.name} style={{ width: 80, height: 80, imageRendering: "pixelated" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{mon.name} <span style={{ color: "#9aa3b8", fontSize: 12, fontWeight: 600 }}>Lv {mon.level}</span></div>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>
            EVs: <strong>{evTotal(mon)}/{EV_TOTAL_CAP}</strong>
            {tpl?.canEvolve != null && <> · Evolves to <strong>{ALL_POKEMON.find((p) => p.id === tpl.canEvolve)?.name ?? "?"}</strong> at Lv {tpl.evolveAt}</>}
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {(mon.moves ?? []).map((mv) => (
              <span key={mv} style={{ fontSize: 10, padding: "3px 6px", borderRadius: 6, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>{mv}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================ PAID ZONE ============================ */
function PaidZone({ mon, money, onBack, onCommitEv, onMutateMon, onSpendMoney, toast }: {
  mon: Mon; money: number; onBack: () => void;
  onCommitEv: Props["onUpdateMon"]; onMutateMon: Props["onMutateMon"]; onSpendMoney: Props["onSpendMoney"]; toast: Props["toast"];
}) {
  const tpl = ALL_POKEMON.find((p) => p.id === mon.id);

  // Local edit buffer for sliders (committed when user releases the thumb).
  const [draft, setDraft] = useState<Record<EvKey, number>>(() => ({
    hp: mon.evHp ?? 0, atk: mon.evAtk ?? 0, def: mon.evDef ?? 0,
    spa: mon.evSpa ?? 0, spd: mon.evSpd ?? 0, spe: mon.evSpe ?? 0,
  }));
  // Re-sync draft when active mon changes (e.g., after evolve / level-up changes EV totals).
  useEffect(() => {
    setDraft({
      hp: mon.evHp ?? 0, atk: mon.evAtk ?? 0, def: mon.evDef ?? 0,
      spa: mon.evSpa ?? 0, spd: mon.evSpd ?? 0, spe: mon.evSpe ?? 0,
    });
  }, [mon.uid, mon.id, mon.evHp, mon.evAtk, mon.evDef, mon.evSpa, mon.evSpd, mon.evSpe]);

  const draftTotal = (Object.keys(draft) as EvKey[]).reduce((s, k) => s + draft[k], 0);

  // Pending event queue: shown one at a time after each level-up.
  const [eventQueue, setEventQueue] = useState<AnyEvent[]>([]);

  function setStat(k: EvKey, value: number) {
    const clamped = Math.max(0, Math.min(EV_PER_STAT_CAP, value));
    const others = (Object.keys(draft) as EvKey[]).filter((x) => x !== k).reduce((s, x) => s + draft[x], 0);
    const finalVal = Math.min(clamped, EV_TOTAL_CAP - others);
    setDraft((d) => ({ ...d, [k]: finalVal }));
  }

  function commit(k: EvKey) {
    const oldVal = (mon as any)["ev" + k.charAt(0).toUpperCase() + k.slice(1)] ?? 0;
    const delta = draft[k] - oldVal;
    if (delta === 0) return;
    if (delta > 0) {
      const cost = delta * PAID_COST_PER_EV;
      if (money < cost) {
        toast(`Need ₽${cost.toLocaleString()} (you have ₽${money.toLocaleString()}).`, "#F44336");
        // Snap draft back to current saved EV.
        setDraft((d) => ({ ...d, [k]: oldVal }));
        return;
      }
      onSpendMoney(cost);
      toast(`+${delta} ${EV_LABEL[k]} EV  (−₽${cost.toLocaleString()})`, EV_COLOR[k]);
    } else {
      toast(`−${-delta} ${EV_LABEL[k]} EV refunded`, EV_COLOR[k]);
      // No refund of money on decrease (training-only consumable).
    }
    onCommitEv(mon.uid!, draft);
  }

  function resetEvs() {
    if (!window.confirm("Reset all EVs to 0?")) return;
    const zeros = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } as Record<EvKey, number>;
    setDraft(zeros);
    onCommitEv(mon.uid!, zeros);
    toast("All EVs reset.", "#9aa3b8");
  }

  /** Apply N level-ups, queueing learn/evolve events. */
  function levelUpBy(n: number) {
    if (!mon.uid) return;
    const tplCur = ALL_POKEMON.find((p) => p.id === mon.id);
    if (!tplCur) return;
    const newEvents: AnyEvent[] = [];
    let lvl = mon.level;
    let knownMoves = [...(mon.moves ?? [])];
    let speciesId = mon.id;
    let speciesTpl = tplCur;
    let evolutionOffered = false;
    for (let i = 0; i < n; i++) {
      lvl = Math.min(100, lvl + 1);
      // Move-learn event: pick a random move from species template that mon doesn't know.
      const candidates = (speciesTpl.moves ?? []).filter((mv) => !knownMoves.includes(mv));
      if (candidates.length > 0 && lvl % 2 === 0) {
        // Offer one new move per even level for some pacing.
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        newEvents.push({ type: "learn", move: pick });
        if (knownMoves.length < 4) knownMoves.push(pick); // optimistic preview only
      }
      // Evolution check (only first time it's reached).
      if (!evolutionOffered && speciesTpl.canEvolve != null && speciesTpl.evolveAt != null && lvl >= speciesTpl.evolveAt) {
        const evTpl = ALL_POKEMON.find((p) => p.id === speciesTpl.canEvolve!);
        if (evTpl) {
          newEvents.push({ type: "evolve", toId: evTpl.id, toName: evTpl.name, toSprite: evTpl.sprite });
          evolutionOffered = true;
          speciesId = evTpl.id; // for further evolution checks within the loop
          speciesTpl = evTpl;
        }
      }
    }
    onMutateMon(mon.uid, { level: lvl });
    toast(`Lv ${mon.level} → Lv ${lvl}`, "#5dc26b");
    if (newEvents.length > 0) setEventQueue((q) => [...q, ...newEvents]);
  }

  // Process top of queue (one popup at a time).
  const head = eventQueue[0] ?? null;

  function dequeue() { setEventQueue((q) => q.slice(1)); }

  return (
    <>
      <Header onBack={onBack} title={`Paid Zone · ${mon.name}`} />
      <div style={{ padding: 14, paddingBottom: 90, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#cbd5e1", fontSize: 13 }}>
          <span>EVs: <strong style={{ color: "#fff" }}>{draftTotal}/{EV_TOTAL_CAP}</strong></span>
          <span>Wallet: <strong style={{ color: "#fff" }}>₽{money.toLocaleString()}</strong></span>
        </div>

        {(Object.keys(EV_LABEL) as EvKey[]).map((k) => {
          const base = k === "spd" ? ((tpl as any)?.spd ?? tpl?.spa ?? 0) : (tpl as any)?.[k] ?? 0;
          const others = (Object.keys(draft) as EvKey[]).filter((x) => x !== k).reduce((s, x) => s + draft[x], 0);
          const allowedMax = Math.min(EV_PER_STAT_CAP, EV_TOTAL_CAP - others);
          return (
            <div key={k} style={statRow}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{EV_LABEL[k]} <span style={{ color: "#94a3b8", fontWeight: 500, fontSize: 12, marginLeft: 4 }}>({base})</span></div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                <span style={{ fontSize: 12, color: "#94a3b8", width: 24 }}>EV</span>
                <input type="range" min={0} max={allowedMax} value={draft[k]}
                  onChange={(e) => setStat(k, +e.target.value)}
                  onMouseUp={() => commit(k)}
                  onTouchEnd={() => commit(k)}
                  style={{ flex: 1, accentColor: EV_COLOR[k] }}
                />
                <input type="number" min={0} max={EV_PER_STAT_CAP} value={draft[k]}
                  onChange={(e) => setStat(k, +e.target.value || 0)}
                  onBlur={() => commit(k)}
                  style={evNumberInput}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky bottom bar */}
      <div style={stickyBar}>
        <button onClick={resetEvs} style={barBtn("#374151")}>Reset EVs</button>
        <button onClick={() => levelUpBy(10)} style={barBtn("#1f2937")}>lvl + 10</button>
        <button onClick={() => levelUpBy(1)} style={barBtn("#1f2937")}>lvl + 1</button>
      </div>

      {/* Modal popups */}
      {head?.type === "evolve" && (
        <EvolvePopup
          mon={mon}
          to={{ id: head.toId, name: head.toName, sprite: head.toSprite }}
          onAccept={() => { onMutateMon(mon.uid!, { id: head.toId }); toast(`${mon.name} evolved into ${head.toName}!`, "#FFD700"); dequeue(); }}
          onReject={() => { toast(`${mon.name} did not evolve.`, "#94a3b8"); dequeue(); }}
        />
      )}
      {head?.type === "learn" && (
        <LearnMovePopup
          mon={mon}
          newMove={head.move}
          onLearn={(replaceIdx) => {
            const moves = [...(mon.moves ?? [])];
            if (moves.length < 4 && replaceIdx == null) {
              moves.push(head.move);
            } else if (replaceIdx != null) {
              moves[replaceIdx] = head.move;
            }
            onMutateMon(mon.uid!, { moves });
            toast(`${mon.name} learned ${head.move}!`, "#5dc26b");
            dequeue();
          }}
          onSkip={() => { toast(`${mon.name} did not learn ${head.move}.`, "#94a3b8"); dequeue(); }}
        />
      )}
    </>
  );
}

/* ============================ FREE ZONE ============================ */
function FreeZonePicker({ mon, stat, setStat, onBack, onStart }: {
  mon: Mon; stat: EvKey; setStat: (k: EvKey) => void; onBack: () => void; onStart: () => void;
}) {
  return (
    <>
      <Header onBack={onBack} title="Free Zone" />
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={card}>
          <div style={cardTitle}>Choose a stat to train</div>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 8 }}>{FREE_ZONE_COUNT} wild Pokémon will appear in sequence. Defeat each to gain EVs for <strong>{mon.name}</strong>.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {(Object.keys(EV_LABEL) as EvKey[]).map((k) => (
              <button key={k} onClick={() => setStat(k)}
                style={{
                  background: stat === k ? `linear-gradient(135deg, ${EV_COLOR[k]}, ${EV_COLOR[k]}aa)` : "rgba(255,255,255,0.06)",
                  border: "1px solid " + (stat === k ? "#fff" : "rgba(255,255,255,0.15)"),
                  color: "#fff", borderRadius: 12, padding: "12px 6px", cursor: "pointer", fontWeight: 700, fontSize: 13,
                }}>{EV_LABEL[k]}</button>
            ))}
          </div>
        </div>
        <button onClick={onStart} style={{ ...primaryBtn, background: EV_COLOR[stat] }}>
          Start {EV_LABEL[stat]} Training ({FREE_ZONE_COUNT} mons)
        </button>
      </div>
    </>
  );
}

function FreeZoneHunt({ mon, stat, onUpdateMon, onExit, toast }: {
  mon: Mon; stat: EvKey; onUpdateMon: Props["onUpdateMon"]; onExit: () => void; toast: Props["toast"];
}) {
  const pool = POOLS[stat];
  // Pre-roll the 50-mon queue so each one has a stable EV yield.
  const [queue] = useState<{ p: PokemonTemplate; yield: number }[]>(() =>
    Array.from({ length: FREE_ZONE_COUNT }, () => {
      const p = pool[Math.floor(Math.random() * pool.length)];
      return { p, yield: evYieldFor(p, stat) };
    })
  );
  const [idx, setIdx] = useState(0);
  const [defeating, setDefeating] = useState(false);
  const [hitFlash, setHitFlash] = useState(false);

  const current = queue[idx];
  const done = idx >= FREE_ZONE_COUNT;

  function defeat() {
    if (!current || defeating || done) return;
    setDefeating(true);
    setHitFlash(true);
    setTimeout(() => setHitFlash(false), 350);
    setTimeout(() => {
      // Apply EV gain for the active mon.
      const evs = {
        hp: mon.evHp ?? 0, atk: mon.evAtk ?? 0, def: mon.evDef ?? 0,
        spa: mon.evSpa ?? 0, spd: mon.evSpd ?? 0, spe: mon.evSpe ?? 0,
      };
      const total = evs.hp + evs.atk + evs.def + evs.spa + evs.spd + evs.spe;
      const stat252Room = EV_PER_STAT_CAP - evs[stat];
      const totalRoom = EV_TOTAL_CAP - total;
      const granted = Math.max(0, Math.min(current.yield, stat252Room, totalRoom));
      if (granted > 0) {
        evs[stat] = evs[stat] + granted;
        onUpdateMon(mon.uid!, evs);
        toast(`+${granted} ${EV_LABEL[stat]} EV (${current.p.name})`, EV_COLOR[stat]);
      } else {
        toast(`EV cap reached — no gain.`, "#FF9800");
      }
      setIdx((i) => i + 1);
      setDefeating(false);
    }, 450);
  }

  return (
    <>
      <Header onBack={onExit} title={`Free Zone · ${EV_LABEL[stat]}`} />
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#cbd5e1" }}>
          <span>Wild defeated: <strong style={{ color: "#fff" }}>{idx}/{FREE_ZONE_COUNT}</strong></span>
          <span>EV {EV_LABEL[stat]}: <strong style={{ color: EV_COLOR[stat] }}>{(mon as any)["ev" + stat.charAt(0).toUpperCase() + stat.slice(1)] ?? 0}/{EV_PER_STAT_CAP}</strong></span>
        </div>

        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div style={{ height: 220, position: "relative", background: "linear-gradient(180deg,#3a8a4f 0%,#1d4d2c 60%,#0e3318 100%)" }}>
            {!done && current && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img
                  src={SPRITE(current.p.sprite)} alt={current.p.name}
                  style={{
                    width: 130, height: 130, imageRendering: "pixelated",
                    filter: hitFlash ? "brightness(2.2) hue-rotate(-30deg)" : "drop-shadow(0 4px 8px rgba(0,0,0,0.5))",
                    transform: hitFlash ? "translate(4px, -2px)" : "none",
                    transition: "transform 80ms steps(2)",
                    opacity: defeating && !hitFlash ? 0.0 : 1,
                  }}
                />
              </div>
            )}
            {done && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", gap: 10 }}>
                <div style={{ fontSize: 24, fontWeight: 900 }}>Training complete!</div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>{FREE_ZONE_COUNT} {EV_LABEL[stat]} mons defeated.</div>
              </div>
            )}
            <div style={{ position: "absolute", left: 12, top: 12, background: "rgba(0,0,0,0.55)", padding: "4px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
              {!done && current ? `${current.p.name} · +${current.yield} EV` : "Done"}
            </div>
          </div>

          {/* Active mon strip */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", padding: 10, background: "rgba(0,0,0,0.4)" }}>
            <img src={SPRITE(mon.sprite)} alt={mon.name} style={{ width: 44, height: 44, imageRendering: "pixelated" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 13 }}>{mon.name} <span style={{ fontSize: 11, color: "#9aa3b8", marginLeft: 4 }}>Lv {mon.level}</span></div>
              <div style={{ fontSize: 11, opacity: 0.75 }}>Total EVs: {evTotal(mon)}/{EV_TOTAL_CAP}</div>
            </div>
          </div>

          {/* Action — no Pokéballs in Free Zone */}
          <div style={{ display: "flex", gap: 10, padding: 12 }}>
            {!done ? (
              <>
                <button onClick={defeat} disabled={defeating} style={{ ...primaryBtn, background: "#ef4444", flex: 2 }}>
                  {defeating ? "Attacking…" : `Defeat (use ${mon.moves?.[0] ?? "Tackle"})`}
                </button>
                <button onClick={onExit} style={{ ...primaryBtn, background: "#475569", flex: 1 }}>Run</button>
              </>
            ) : (
              <button onClick={onExit} style={{ ...primaryBtn, background: "#22c55e" }}>Return</button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ============================ POPUPS ============================ */
function EvolvePopup({ mon, to, onAccept, onReject }: {
  mon: Mon; to: { id: number; name: string; sprite: string };
  onAccept: () => void; onReject: () => void;
}) {
  return (
    <div style={modalBackdrop}>
      <div style={modalCard}>
        <div style={{ fontSize: 16, fontWeight: 800, textAlign: "center", marginBottom: 12 }}>
          Whoa! Your {mon.name} is evolving!
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, padding: "8px 0" }}>
          <img src={SPRITE(mon.sprite)} alt={mon.name} style={{ width: 80, height: 80, imageRendering: "pixelated" }} />
          <div style={{ fontSize: 28 }}>→</div>
          <img src={SPRITE(to.sprite)} alt={to.name} style={{ width: 90, height: 90, imageRendering: "pixelated", filter: "drop-shadow(0 0 12px rgba(255,215,0,0.8))" }} />
        </div>
        <div style={{ textAlign: "center", fontSize: 13, opacity: 0.85, marginBottom: 14 }}>
          Evolve into <strong style={{ color: "#FFD700" }}>{to.name}</strong>?
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onAccept} style={{ ...primaryBtn, background: "#22c55e", flex: 1 }}>Evolve!</button>
          <button onClick={onReject} style={{ ...primaryBtn, background: "#475569", flex: 1 }}>Not now</button>
        </div>
      </div>
    </div>
  );
}

function LearnMovePopup({ mon, newMove, onLearn, onSkip }: {
  mon: Mon; newMove: string;
  onLearn: (replaceIdx: number | null) => void; onSkip: () => void;
}) {
  const moves = mon.moves ?? [];
  const full = moves.length >= 4;
  return (
    <div style={modalBackdrop}>
      <div style={modalCard}>
        <div style={{ fontSize: 15, fontWeight: 800, textAlign: "center", marginBottom: 6 }}>
          {mon.name} can learn a new move!
        </div>
        <div style={{ textAlign: "center", color: "#FFD700", fontSize: 18, fontWeight: 800, margin: "8px 0 14px" }}>
          {newMove}
        </div>
        {!full && (
          <>
            <div style={{ fontSize: 12, opacity: 0.8, textAlign: "center", marginBottom: 10 }}>
              There's room in {mon.name}'s moveset.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => onLearn(null)} style={{ ...primaryBtn, background: "#22c55e", flex: 1 }}>Learn</button>
              <button onClick={onSkip} style={{ ...primaryBtn, background: "#475569", flex: 1 }}>Skip</button>
            </div>
          </>
        )}
        {full && (
          <>
            <div style={{ fontSize: 12, opacity: 0.8, textAlign: "center", marginBottom: 10 }}>
              Moveset is full. Replace one?
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              {moves.map((mv, i) => (
                <button key={i} onClick={() => onLearn(i)} style={{ ...primaryBtn, background: "#1e293b", border: "1px solid #475569", padding: "10px 8px", textAlign: "left" }}>
                  <div style={{ fontSize: 11, opacity: 0.6 }}>Slot {i + 1}</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{mv}</div>
                </button>
              ))}
            </div>
            <button onClick={onSkip} style={{ ...primaryBtn, background: "#475569" }}>Don't learn it</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ============================ Header / Styles ============================ */
function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 1, padding: "12px 14px", background: "rgba(0,0,0,0.55)", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center", backdropFilter: "blur(6px)" }}>
      <button onClick={onBack} style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}>← Back</button>
      <div style={{ fontWeight: 800, fontSize: 14, textAlign: "center", flex: 1, padding: "0 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
      <div style={{ width: 60 }} />
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  position: "fixed", inset: 0, overflowY: "auto",
  background: "linear-gradient(180deg, #1f2640 0%, #2a1f4a 100%)",
  color: "#fff", fontFamily: "system-ui", zIndex: 8500,
};
const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 16, padding: 12,
};
const cardTitle: React.CSSProperties = { fontWeight: 800, fontSize: 14, marginBottom: 4 };
const primaryBtn: React.CSSProperties = {
  width: "100%", padding: "12px 14px", border: 0, borderRadius: 10,
  color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
};
const miniMonStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 10, padding: "6px 10px", color: "#fff", cursor: "pointer", minWidth: 90,
};
const statRow: React.CSSProperties = {
  background: "#1d2235", border: "1px solid #2a3046", borderRadius: 12, padding: "10px 12px",
};
const evNumberInput: React.CSSProperties = {
  width: 60, padding: "6px 8px", borderRadius: 8, border: "1px solid #475569",
  background: "#0f172a", color: "#fff", fontWeight: 700, fontSize: 13, textAlign: "right",
};
const stickyBar: React.CSSProperties = {
  position: "fixed", left: 0, right: 0, bottom: 0, padding: "10px 12px",
  background: "rgba(10,10,30,0.92)", borderTop: "1px solid #1c1c33",
  display: "flex", gap: 8, justifyContent: "space-between", maxWidth: 460, margin: "0 auto",
  backdropFilter: "blur(8px)",
};
function barBtn(bg: string): React.CSSProperties {
  return { flex: 1, background: bg, color: "#fff", border: "1px solid #2a3046", borderRadius: 10, padding: "10px 8px", fontWeight: 700, fontSize: 13, cursor: "pointer" };
}
function zoneBtn(borderColor: string): React.CSSProperties {
  return {
    background: "rgba(255,255,255,0.06)", border: `2px solid ${borderColor}`, borderRadius: 16,
    padding: "18px 12px", color: "#fff", cursor: "pointer", textAlign: "center",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
  };
}
const modalBackdrop: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex",
  alignItems: "center", justifyContent: "center", zIndex: 9500, padding: 20,
};
const modalCard: React.CSSProperties = {
  background: "#1d2235", border: "1px solid #2a3046", borderRadius: 16,
  padding: 20, maxWidth: 360, width: "100%", color: "#fff",
};

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
const STAT_BAR_COLOR: Record<EvKey, string> = {
  hp: "#ff3b30", atk: "#ff9500", def: "#ffcc00",
  spa: "#007aff", spd: "#34c759", spe: "#ff2d55",
};
const STAT_BAR_MAX = 255; // % bar denominator

function typeBadgeColor(t?: string | null): string {
  const map: Record<string, string> = {
    Normal: "#A8A878", Fire: "#F08030", Water: "#6890F0", Electric: "#F8D030",
    Grass: "#78C850", Ice: "#98D8D8", Fighting: "#C03028", Poison: "#A040A0",
    Ground: "#E0C068", Flying: "#A890F0", Psychic: "#F85888", Bug: "#A8B820",
    Rock: "#B8A038", Ghost: "#705898", Dragon: "#7038F8", Dark: "#705848",
    Steel: "#B8B8D0", Fairy: "#EE99AC",
  };
  return (t && map[t]) || "#6b7280";
}

/** Compute a stat from base + IV + EV at level (Gen3+ formula, no nature mult). */
function calcStatPreview(base: number, iv: number, ev: number, level: number, isHp: boolean): number {
  const inner = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100);
  return isHp ? inner + level + 10 : inner + 5;
}

function PaidZone({ mon, money, onBack, onCommitEv, onMutateMon, onSpendMoney, toast }: {
  mon: Mon; money: number; onBack: () => void;
  onCommitEv: Props["onUpdateMon"]; onMutateMon: Props["onMutateMon"]; onSpendMoney: Props["onSpendMoney"]; toast: Props["toast"];
}) {
  const tpl = ALL_POKEMON.find((p) => p.id === mon.id);

  // Committed EVs (from the actual mon).
  const committed: Record<EvKey, number> = {
    hp: mon.evHp ?? 0, atk: mon.evAtk ?? 0, def: mon.evDef ?? 0,
    spa: mon.evSpa ?? 0, spd: mon.evSpd ?? 0, spe: mon.evSpe ?? 0,
  };
  // Local draft (preview only, NOT applied until "Pay" pressed).
  const [draft, setDraft] = useState<Record<EvKey, number>>(committed);
  // Re-sync draft when active mon changes (after evolve / level-up / payment).
  useEffect(() => {
    setDraft({
      hp: mon.evHp ?? 0, atk: mon.evAtk ?? 0, def: mon.evDef ?? 0,
      spa: mon.evSpa ?? 0, spd: mon.evSpd ?? 0, spe: mon.evSpe ?? 0,
    });
  }, [mon.uid, mon.id, mon.evHp, mon.evAtk, mon.evDef, mon.evSpa, mon.evSpd, mon.evSpe]);

  const draftTotal = (Object.keys(draft) as EvKey[]).reduce((s, k) => s + draft[k], 0);
  // Cost = sum of *positive* deltas only. Decreases are free but no money refund.
  const pendingCost = (Object.keys(draft) as EvKey[]).reduce((s, k) => s + Math.max(0, draft[k] - committed[k]), 0) * PAID_COST_PER_EV;
  const dirty = (Object.keys(draft) as EvKey[]).some((k) => draft[k] !== committed[k]);
  const canAfford = money >= pendingCost;

  // Pending event queue (level-up popups).
  const [eventQueue, setEventQueue] = useState<AnyEvent[]>([]);

  function ivOf(k: EvKey): number {
    const map: Record<EvKey, number> = {
      hp: mon.ivHp ?? 0, atk: mon.ivAtk ?? 0, def: mon.ivDef ?? 0,
      spa: mon.ivSpa ?? 0, spd: mon.ivSpd ?? 0, spe: mon.ivSpe ?? 0,
    };
    return map[k];
  }
  function baseOf(k: EvKey): number {
    if (k === "spd") return ((tpl as any)?.spd ?? tpl?.spa ?? 0);
    return ((tpl as any)?.[k] ?? 0) as number;
  }

  // Live preview stats from draft.
  const liveStat: Record<EvKey, number> = {
    hp:  calcStatPreview(baseOf("hp"),  ivOf("hp"),  draft.hp,  mon.level, true),
    atk: calcStatPreview(baseOf("atk"), ivOf("atk"), draft.atk, mon.level, false),
    def: calcStatPreview(baseOf("def"), ivOf("def"), draft.def, mon.level, false),
    spa: calcStatPreview(baseOf("spa"), ivOf("spa"), draft.spa, mon.level, false),
    spd: calcStatPreview(baseOf("spd"), ivOf("spd"), draft.spd, mon.level, false),
    spe: calcStatPreview(baseOf("spe"), ivOf("spe"), draft.spe, mon.level, false),
  };
  const liveTotal = (Object.keys(liveStat) as EvKey[]).reduce((s, k) => s + liveStat[k], 0);

  function setStat(k: EvKey, value: number) {
    const clamped = Math.max(0, Math.min(EV_PER_STAT_CAP, value));
    const others = (Object.keys(draft) as EvKey[]).filter((x) => x !== k).reduce((s, x) => s + draft[x], 0);
    const finalVal = Math.min(clamped, EV_TOTAL_CAP - others);
    setDraft((d) => ({ ...d, [k]: finalVal }));
  }

  /** Commit all pending EV changes, deducting money for the net increase. */
  function payAndApply() {
    if (!dirty) return;
    if (!canAfford) {
      toast(`Need ₽${pendingCost.toLocaleString()} (you have ₽${money.toLocaleString()}).`, "#F44336");
      return;
    }
    if (pendingCost > 0) onSpendMoney(pendingCost);
    onCommitEv(mon.uid!, draft);
    if (pendingCost > 0) toast(`Applied EVs · −₽${pendingCost.toLocaleString()}`, "#5dc26b");
    else toast(`EVs updated.`, "#5dc26b");
  }

  function discardChanges() {
    setDraft({ ...committed });
    toast("Pending EV changes discarded.", "#94a3b8");
  }

  function resetEvs() {
    if (!window.confirm("Reset draft EVs to 0? (You still need to press Pay to apply.)")) return;
    setDraft({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
  }

  /** Apply N level-ups, queueing learn/evolve events. */
  function levelUpBy(n: number) {
    if (!mon.uid) return;
    const tplCur = ALL_POKEMON.find((p) => p.id === mon.id);
    if (!tplCur) return;
    const newEvents: AnyEvent[] = [];
    let lvl = mon.level;
    let knownMoves = [...(mon.moves ?? [])];
    let speciesTpl = tplCur;
    let evolutionOffered = false;
    for (let i = 0; i < n; i++) {
      lvl = Math.min(100, lvl + 1);
      const candidates = (speciesTpl.moves ?? []).filter((mv) => !knownMoves.includes(mv));
      if (candidates.length > 0 && lvl % 2 === 0) {
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        newEvents.push({ type: "learn", move: pick });
        if (knownMoves.length < 4) knownMoves.push(pick);
      }
      if (!evolutionOffered && speciesTpl.canEvolve != null && speciesTpl.evolveAt != null && lvl >= speciesTpl.evolveAt) {
        const evTpl = ALL_POKEMON.find((p) => p.id === speciesTpl.canEvolve!);
        if (evTpl) {
          newEvents.push({ type: "evolve", toId: evTpl.id, toName: evTpl.name, toSprite: evTpl.sprite });
          evolutionOffered = true;
          speciesTpl = evTpl;
        }
      }
    }
    onMutateMon(mon.uid, { level: lvl });
    toast(`Lv ${mon.level} → Lv ${lvl}`, "#5dc26b");
    if (newEvents.length > 0) setEventQueue((q) => [...q, ...newEvents]);
  }

  const head = eventQueue[0] ?? null;
  function dequeue() { setEventQueue((q) => q.slice(1)); }

  // Stat row helper
  const statOrder: EvKey[] = ["hp", "atk", "def", "spa", "spd", "spe"];

  // EV grid order (matches mockup: HP, Sp.Atk, Atk, Sp.Def, Def, Speed)
  const evGridOrder: EvKey[] = ["hp", "spa", "atk", "spd", "def", "spe"];

  return (
    <>
      <Header onBack={onBack} title={`Paid Zone · ${mon.name}`} />
      <div style={{ padding: "16px 14px 110px", display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Hero */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{mon.name}</div>
            {mon.type1 && <span style={{ ...typeBadge, background: typeBadgeColor(mon.type1) }}>{mon.type1}</span>}
            {mon.type2 && <span style={{ ...typeBadge, background: typeBadgeColor(mon.type2) }}>{mon.type2}</span>}
            <span style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8" }}>Lv {mon.level}</span>
          </div>
          <div style={{ background: "#1a1a1f", borderRadius: 12, padding: 16, display: "flex", justifyContent: "center", alignItems: "center", minHeight: 160 }}>
            <img src={SPRITE(mon.sprite)} alt={mon.name} style={{ width: 150, height: 150, imageRendering: "pixelated" }} />
          </div>
        </div>

        {/* Current Stats (live) */}
        <div>
          <h2 style={sectionTitle}>Current Stats</h2>
          {statOrder.map((k) => {
            const v = liveStat[k];
            const pct = Math.min(100, Math.round((v / STAT_BAR_MAX) * 100));
            const dirtyHere = draft[k] !== committed[k];
            return (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 10, fontSize: 14 }}>
                <div style={{ width: 64, color: "#8e8e93" }}>{EV_LABEL[k]}</div>
                <div style={{ width: 38, fontWeight: 700, textAlign: "right", marginRight: 12, color: dirtyHere ? STAT_BAR_COLOR[k] : "#fff" }}>{v}</div>
                <div style={{ flex: 1, height: 6, background: "#2c2c35", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: pct + "%", background: STAT_BAR_COLOR[k], borderRadius: 3, transition: "width 120ms ease" }} />
                </div>
                <div style={{ width: 44, textAlign: "right", color: "#8e8e93", fontSize: 12 }}>{pct}%</div>
              </div>
            );
          })}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: "1px solid #2c2c35", fontWeight: 700, fontSize: 16 }}>
            <span>Total</span>
            <span style={{ color: "#ff3b30" }}>{liveTotal}</span>
          </div>
        </div>

        {/* EV Enhancer */}
        <div>
          <h2 style={{ ...sectionTitle, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#ff3b30", fontSize: 16 }}>◎</span> EV Enhancer
          </h2>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0 0 8px", fontSize: 12, color: "#8e8e93" }}>
            <span>EVs: <strong style={{ color: draftTotal > EV_TOTAL_CAP ? "#ff3b30" : "#fff" }}>{draftTotal}/{EV_TOTAL_CAP}</strong></span>
            <span>₽1 per EV</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {evGridOrder.map((k) => {
              const others = (Object.keys(draft) as EvKey[]).filter((x) => x !== k).reduce((s, x) => s + draft[x], 0);
              const allowedMax = Math.min(EV_PER_STAT_CAP, EV_TOTAL_CAP - others);
              const isDirty = draft[k] !== committed[k];
              return (
                <div key={k} style={{ background: "#1a1a1f", borderRadius: 12, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 14 }}>
                    <span style={{ fontWeight: 700 }}>{EV_LABEL[k]}</span>
                    <span style={{ color: "#8e8e93" }}>({baseOf(k)})</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: "#8e8e93" }}>EV</span>
                    <input type="text" inputMode="numeric" value={draft[k]}
                      onChange={(e) => setStat(k, +e.target.value.replace(/[^0-9]/g, "") || 0)}
                      style={{
                        background: "transparent", border: `1px solid ${isDirty ? STAT_BAR_COLOR[k] : "#3a3a44"}`,
                        color: "#fff", borderRadius: 4, width: 50, padding: "4px", textAlign: "center", fontSize: 12,
                      }}
                    />
                  </div>
                  <input type="range" min={0} max={allowedMax} value={draft[k]}
                    onChange={(e) => setStat(k, +e.target.value)}
                    style={{ width: "100%", accentColor: STAT_BAR_COLOR[k] }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Action buttons row */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => levelUpBy(1)} style={actionBtn}>lvl + 1</button>
          <button onClick={() => levelUpBy(10)} style={actionBtn}>lvl + 10</button>
        </div>

        <button onClick={resetEvs} style={resetBtn}>Reset EVs</button>
      </div>

      {/* Sticky Pay bar (only shown when there are pending EV changes) */}
      {dirty && (
        <div style={payBar}>
          <div style={{ flex: 1, fontSize: 12, color: "#cbd5e1" }}>
            <div style={{ fontWeight: 700, color: "#fff", fontSize: 13 }}>
              Pending: {pendingCost > 0 ? `₽${pendingCost.toLocaleString()}` : "free"}
            </div>
            <div>Wallet: ₽{money.toLocaleString()}</div>
          </div>
          <button onClick={discardChanges} style={{ ...barBtn("#374151"), flex: 0, padding: "10px 14px" }}>Discard</button>
          <button onClick={payAndApply} disabled={!canAfford}
            style={{ ...barBtn(canAfford ? "#22c55e" : "#4b5563"), flex: 0, padding: "10px 18px", opacity: canAfford ? 1 : 0.65, cursor: canAfford ? "pointer" : "not-allowed" }}>
            {pendingCost > 0 ? `Pay ₽${pendingCost.toLocaleString()}` : "Apply"}
          </button>
        </div>
      )}

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
            if (moves.length < 4 && replaceIdx == null) moves.push(head.move);
            else if (replaceIdx != null) moves[replaceIdx] = head.move;
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
  background: "#0d0d12",
  color: "#fff", fontFamily: "system-ui", zIndex: 8500,
};
const typeBadge: React.CSSProperties = {
  padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, color: "#fff",
};
const sectionTitle: React.CSSProperties = {
  fontSize: 18, fontWeight: 600, margin: "0 0 14px", paddingBottom: 8,
  borderBottom: "1px solid #2c2c35",
};
const actionBtn: React.CSSProperties = {
  flex: 1, background: "#2c2c3a", color: "#fff", border: 0, padding: "12px",
  borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer",
};
const resetBtn: React.CSSProperties = {
  display: "block", width: "100%", background: "#2c2c3a", color: "#fff",
  border: 0, padding: 16, borderRadius: 24, fontSize: 18, fontWeight: 700, cursor: "pointer",
};
const payBar: React.CSSProperties = {
  position: "fixed", left: 0, right: 0, bottom: 0, padding: "10px 14px",
  background: "rgba(13,13,18,0.96)", borderTop: "1px solid #2c2c35",
  display: "flex", gap: 10, alignItems: "center", maxWidth: 480, margin: "0 auto",
  backdropFilter: "blur(8px)",
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

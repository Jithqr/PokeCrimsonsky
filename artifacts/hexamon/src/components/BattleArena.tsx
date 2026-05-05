import { useEffect, useRef, useState } from "react";
import type { Action, BattleMon, BattleState, LogEntry } from "../lib/battle-engine";
import { calcMaxHp } from "../lib/battle-engine";
import { getMove } from "../lib/move-data";
import { TYPE_COLORS } from "../lib/type-chart";

const BASE = import.meta.env.BASE_URL ?? "/";

// Build fallback URL list for a sprite key, checking local custom sprites first
function spriteFallbacks(sprite: string, back = false): string[] {
  const clean = sprite.toLowerCase().replace(/[^a-z0-9-]/g, ""); // keep hyphens for local path
  const ps = clean.replace(/-/g, ""); // no hyphens for PokéShowdown
  const psBase = ps
    .replace(/megax$/, "").replace(/megay$/, "").replace(/megaz$/, "")
    .replace(/mega$/, "").replace(/gmax$/, "")
    .replace(/alola$/, "").replace(/galar$/, "")
    .replace(/hisui$/, "").replace(/paldea$/, "")
    .replace(/paldeacombat$/, "").replace(/paldeafire$/, "").replace(/paldeawater$/, "");
  const extras = psBase !== ps
    ? [`https://play.pokemonshowdown.com/sprites/ani/${psBase}.gif`,
       `https://play.pokemonshowdown.com/sprites/dex/${psBase}.png`]
    : [];
  return [
    `${BASE}sprites/custom/${clean}.gif`,
    back
      ? `https://play.pokemonshowdown.com/sprites/ani-back/${ps}.gif`
      : `https://play.pokemonshowdown.com/sprites/ani/${ps}.gif`,
    `https://play.pokemonshowdown.com/sprites/gen5${back ? "-back" : ""}/${ps}.png`,
    `https://play.pokemonshowdown.com/sprites/dex/${ps}.png`,
    ...extras,
  ];
}

function BattleSprite({ sprite, back = false, style }: { sprite: string; back?: boolean; style?: React.CSSProperties }) {
  const urls = spriteFallbacks(sprite, back);
  return (
    <img
      src={urls[0]}
      data-step="0"
      alt={sprite}
      style={style}
      onError={(e) => {
        const img = e.target as HTMLImageElement;
        const step = Number(img.dataset.step ?? "0") + 1;
        if (step < urls.length) { img.dataset.step = String(step); img.src = urls[step]; }
        else img.style.opacity = "0";
      }}
    />
  );
}

const SPRITE_FRONT = (clean: string) =>
  `${BASE}sprites/custom/${clean.toLowerCase().replace(/[^a-z0-9-]/g, "")}.gif`;
const SPRITE_BACK = (clean: string) =>
  `https://play.pokemonshowdown.com/sprites/ani-back/${clean.replace(/[^a-z0-9]/g, "")}.gif`;

type Props = {
  state: BattleState;
  mySide: 0 | 1;
  mode: "league" | "pvp";
  awaitingMyAction: boolean;
  awaitingForceSwitch: boolean;
  oppPicked?: boolean;
  turnTimerSec?: number | null;
  onAction: (a: Action) => void;
  onForfeit?: () => void;
  bannerText?: string | null;
  onExit?: () => void;
};

const STATUS_COLORS: Record<string, string> = {
  Burn: "#FF6B6B", Poison: "#A040A0", Paralyze: "#F8D030", Sleep: "#90A4AE", Freeze: "#81D4FA",
};

/* ---------- Pokéball icon (alive vs fainted) ---------- */
function Pokeball({ alive, size = 14 }: { alive: boolean; size?: number }) {
  const top = alive ? "#ef4444" : "#5b6173";
  const bottom = alive ? "#f7f7f7" : "#a0a4b0";
  const stroke = alive ? "#1f2330" : "#2c2f38";
  const center = alive ? "#f7f7f7" : "#cfd2da";
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} style={{ display: "block" }}>
      <circle cx="16" cy="16" r="14" fill={bottom} stroke={stroke} strokeWidth="2" />
      <path d="M2,16 A14,14 0 0,1 30,16 Z" fill={top} stroke={stroke} strokeWidth="2" />
      <line x1="2" y1="16" x2="30" y2="16" stroke={stroke} strokeWidth="2" />
      <circle cx="16" cy="16" r="4.5" fill={center} stroke={stroke} strokeWidth="2" />
      <circle cx="16" cy="16" r="1.7" fill={stroke} />
    </svg>
  );
}

function PokeballRow({ mons, align }: { mons: BattleMon[]; align: "left" | "right" }) {
  // Always render 6 slots (classic Pokémon style); fill from team length.
  const slots = Array.from({ length: 6 }, (_, i) => mons[i] ?? null);
  return (
    <div style={{ display: "flex", gap: 4, justifyContent: align === "left" ? "flex-start" : "flex-end" }}>
      {slots.map((m, i) => {
        if (!m) {
          return <div key={i} style={{ width: 14, height: 14, opacity: 0.25 }}><Pokeball alive={false} size={14} /></div>;
        }
        return <Pokeball key={m.uid} alive={m.currentHp > 0} size={14} />;
      })}
    </div>
  );
}

/* ---------- Classic name plate ---------- */
function NamePlate({
  mon, side, showHpNumbers, showExp,
}: { mon: BattleMon; side: "opp" | "me"; showHpNumbers?: boolean; showExp?: boolean }) {
  const max = calcMaxHp(mon);
  const pct = Math.max(0, Math.min(100, (mon.currentHp / max) * 100));
  const hpColor = pct > 50 ? "#5dc26b" : pct > 20 ? "#f0c020" : "#e64545";
  return (
    <div style={{
      position: "relative", background: "linear-gradient(180deg,#fff8e3 0%,#ecdfb8 100%)",
      border: "2px solid #2a2618", borderRadius: 6,
      boxShadow: side === "me" ? "3px 3px 0 #2a2618" : "-3px 3px 0 #2a2618",
      padding: "6px 8px", color: "#231d10", minWidth: 168, maxWidth: 200,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      transform: side === "me" ? "skew(-6deg, 0)" : "skew(-6deg, 0)",
    }}>
      <div style={{ transform: "skew(6deg, 0)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, lineHeight: 1.2 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 3, fontWeight: 700 }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100, textTransform: "uppercase" }}>{mon.name}</span>
            {mon.status && <span title={mon.status} style={{ background: STATUS_COLORS[mon.status] ?? "#555", color: "#fff", padding: "1px 3px", borderRadius: 2, fontSize: 11 }}>{mon.status.slice(0,3).toUpperCase()}</span>}
          </span>
          <span style={{ fontSize: 12 }}>Lv{mon.level}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
          <span style={{ fontSize: 11, color: "#7a3d1f", fontWeight: 700 }}>HP</span>
          <div style={{ flex: 1, height: 5, background: "#3b342a", borderRadius: 2, overflow: "hidden", border: "1px solid #2a2618" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: hpColor, transition: "width 600ms ease, background 400ms ease" }} />
          </div>
        </div>
        {showHpNumbers && (
          <div style={{ textAlign: "right", fontSize: 12, marginTop: 2 }}>{Math.max(0, Math.floor(mon.currentHp))}/{max}</div>
        )}
        {showExp && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
            <span style={{ fontSize: 11, color: "#1f3d7a", fontWeight: 700 }}>EXP</span>
            <div style={{ flex: 1, height: 3, background: "#3b342a", borderRadius: 1, overflow: "hidden", border: "1px solid #2a2618" }}>
              <div style={{ width: `${(mon.level % 10) * 10}%`, height: "100%", background: "#5fa8e6" }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================ */

export default function BattleArena(props: Props) {
  const { state, mySide, awaitingMyAction, awaitingForceSwitch, oppPicked, turnTimerSec, onAction, onForfeit, bannerText, onExit, mode } = props;
  const me = state.teams[mySide];
  const opp = state.teams[(1 - mySide) as 0 | 1];
  const myActive = me.mons[me.activeIdx];
  const oppActive = opp.mons[opp.activeIdx];

  const [actionMode, setActionMode] = useState<"main" | "fight" | "switch" | "items">("main");
  const [intro, setIntro] = useState(true); // true while pokeball intro plays
  const prevMyHp = useRef(myActive.currentHp);
  const prevOppHp = useRef(oppActive.currentHp);
  const prevMyUid = useRef(myActive.uid);
  const prevOppUid = useRef(oppActive.uid);
  const logRef = useRef<HTMLDivElement | null>(null);

  // VFX state
  const [myHitClass, setMyHitClass] = useState("");
  const [oppHitClass, setOppHitClass] = useState("");
  const [myLunge, setMyLunge] = useState(false);
  const [oppLunge, setOppLunge] = useState(false);
  const [myDmgFloat, setMyDmgFloat] = useState<{ dmg: number; eff: number; key: number } | null>(null);
  const [oppDmgFloat, setOppDmgFloat] = useState<{ dmg: number; eff: number; key: number } | null>(null);
  const [moveFx, setMoveFx] = useState<{ type: string; fromMy: boolean; key: number } | null>(null);
  const [arenaHit, setArenaHit] = useState(false);
  const pendingEffRef = useRef<number>(1);
  const prevShownCountForVfxRef = useRef(0);

  // Battle-start intro animation
  useEffect(() => {
    const t = setTimeout(() => setIntro(false), 1100);
    return () => clearTimeout(t);
  }, []);

  // Track HP changes to keep refs in sync
  useEffect(() => {
    if (myActive.uid !== prevMyUid.current) {
      prevMyUid.current = myActive.uid;
    }
    prevMyHp.current = myActive.currentHp;
  }, [myActive.currentHp, myActive.uid]);

  useEffect(() => {
    if (oppActive.uid !== prevOppUid.current) {
      prevOppUid.current = oppActive.uid;
    }
    prevOppHp.current = oppActive.currentHp;
  }, [oppActive.currentHp, oppActive.uid]);

  // Auto-scroll log
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.log.length]);

  // Sequential log display — reveal entries one at a time with a delay
  const shownCountRef = useRef(0);
  const [shownCount, setShownCount] = useState(0);
  useEffect(() => {
    if (state.log.length <= shownCountRef.current) return;
    const step = () => {
      if (shownCountRef.current >= state.log.length) return;
      shownCountRef.current++;
      setShownCount(shownCountRef.current);
      setTimeout(step, 480);
    };
    step();
  }, [state.log.length]);

  // Auto-open switch mode if forced
  useEffect(() => {
    if (awaitingForceSwitch) setActionMode("switch");
    else if (!awaitingMyAction) setActionMode("main");
  }, [awaitingForceSwitch, awaitingMyAction]);

  // VFX: process newly-shown log entries to drive animations
  useEffect(() => {
    if (shownCount <= prevShownCountForVfxRef.current) return;
    for (let i = prevShownCountForVfxRef.current; i < shownCount; i++) {
      const entry = state.log[i];
      if (!entry) continue;
      const iMeAttacking = entry.side === mySide;

      if (entry.kind === "move") {
        const match = entry.text.match(/used (.+?)!$/);
        if (match) {
          try {
            const def = getMove(match[1]);
            setMoveFx({ type: def.type.toLowerCase(), fromMy: iMeAttacking, key: Date.now() + i });
          } catch {}
        }
        if (iMeAttacking) {
          setMyLunge(true);
          setTimeout(() => setMyLunge(false), 320);
        } else {
          setOppLunge(true);
          setTimeout(() => setOppLunge(false), 320);
        }
      }

      if (entry.kind === "info" && /super effective/i.test(entry.text)) pendingEffRef.current = 2;
      if (entry.kind === "info" && /not very effective/i.test(entry.text)) pendingEffRef.current = 0.5;

      if (entry.kind === "info" && /took \d+ damage/i.test(entry.text)) {
        const dmgMatch = entry.text.match(/took (\d+) damage/i);
        if (dmgMatch) {
          const dmgAmt = parseInt(dmgMatch[1]);
          const eff = pendingEffRef.current;
          pendingEffRef.current = 1;
          const defName = entry.text.split(" took")[0].trim();
          const oppHit = defName === oppActive.name;
          if (oppHit) {
            setOppHitClass("pq-hit");
            setOppDmgFloat({ dmg: dmgAmt, eff, key: Date.now() + i });
            setTimeout(() => setOppHitClass(""), 520);
          } else {
            setMyHitClass("pq-hit");
            setMyDmgFloat({ dmg: dmgAmt, eff, key: Date.now() + i });
            setTimeout(() => setMyHitClass(""), 520);
          }
          setArenaHit(true);
          setTimeout(() => setArenaHit(false), 280);
        }
      }
    }
    prevShownCountForVfxRef.current = shownCount;
  }, [shownCount]);

  const benchMe = me.mons.map((m, i) => ({ m, i })).filter((x) => x.i !== me.activeIdx);
  const displayedLog = state.log.slice(Math.max(0, shownCount - 2), shownCount);
  const headerLabel =
    mode === "pvp" ? `BATTLE BOX · ${(opp.ownerName || "Opponent").toUpperCase()}` :
    `LEAGUE BATTLE · ${(opp.ownerName || "Trainer").toUpperCase()}`;

  const myFainted = myActive.currentHp <= 0;
  const oppFainted = oppActive.currentHp <= 0;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9000, display: "flex", justifyContent: "center",
      background: "#05050f", color: "#fff", fontFamily: "system-ui",
    }}>
      <style>{css}</style>
      <div style={{
        width: "100%", maxWidth: 460, minHeight: "100vh", background: "#0a0a1e",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: "1px solid #1c1c33" }}>
          <button
            onClick={() => { if (state.finished && onExit) onExit(); else if (onForfeit) onForfeit(); else if (onExit) onExit(); }}
            style={{ background: "#1a1a2e", color: "#cdd2e0", border: "1px solid #2a2a44", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: 1, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}
          >‹ BACK</button>
          <div style={{ flex: 1, fontSize: 12, fontWeight: 800, letterSpacing: 1.5, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", color: "#fff", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {headerLabel}
          </div>
          {turnTimerSec != null && (
            <div style={{ background: turnTimerSec < 10 ? "#F44336" : "#1a1a2e", border: "1px solid #2a2a44", padding: "4px 8px", borderRadius: 8, fontWeight: 800, fontSize: 11, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>{turnTimerSec}s</div>
          )}
        </div>

        {/* Battle stage */}
        <div className={`bx-stage ${arenaHit ? "pq-arena-hit" : ""}`}>
          {/* Sky/ground */}
          <div className="bx-sky" />
          <div className="bx-ground" />
          {/* CRT scanline overlay */}
          <div className="bt-scanlines" />

          {/* Move type FX particle */}
          {moveFx && (
            <div
              key={moveFx.key}
              className={`pq-move-fx pq-fx-${moveFx.type} ${moveFx.fromMy ? "pq-fx-from-me" : "pq-fx-from-opp"}`}
            />
          )}

          {/* Opponent: name plate top-left, sprite further right */}
          <div className="bx-opp-plate">
            <NamePlate mon={oppActive} side="opp" />
            <div style={{ marginTop: 4, paddingLeft: 4 }}>
              <PokeballRow mons={opp.mons} align="left" />
            </div>
          </div>
          <div className={`bx-opp-platform ${intro ? "bx-slide-in-right" : ""}`} />
          <div className={`bx-opp-sprite ${intro ? "bx-slide-in-right" : ""} ${oppFainted ? "bx-faint" : ""} ${oppLunge ? "pq-lunge-left" : ""} ${oppHitClass}`}>
            {intro ? (
              <div className="bx-pokeball-throw bx-pokeball-throw-opp"><Pokeball alive size={28} /></div>
            ) : (
              <>
                <BattleSprite
                  sprite={oppActive.sprite || oppActive.name.toLowerCase()}
                  back={false}
                  style={{ width: 110, height: 110, imageRendering: "pixelated", objectFit: "contain", background: "transparent", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.5))" }}
                />
                {oppDmgFloat && (
                  <div key={oppDmgFloat.key} style={{ position: "absolute", top: 0, left: "50%", pointerEvents: "none", zIndex: 20 }}>
                    <div className="pq-dmg-float">{oppDmgFloat.dmg}</div>
                    {oppDmgFloat.eff >= 2 && <div className="pq-dmg-eff">Super effective!</div>}
                    {oppDmgFloat.eff > 0 && oppDmgFloat.eff < 1 && <div className="pq-dmg-eff" style={{ color: "#90caf9" }}>Not very effective…</div>}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Player: sprite bottom-left, name plate bottom-right */}
          <div className={`bx-me-platform ${intro ? "bx-slide-in-left" : ""}`} />
          <div className={`bx-me-sprite ${intro ? "bx-slide-in-left" : ""} ${myFainted ? "bx-faint" : ""} ${myLunge ? "pq-lunge-right" : ""} ${myHitClass} pq-bob`}>
            {intro ? (
              <div className="bx-pokeball-throw bx-pokeball-throw-me"><Pokeball alive size={28} /></div>
            ) : (
              <>
                <BattleSprite
                  sprite={myActive.sprite || myActive.name.toLowerCase()}
                  back={true}
                  style={{ width: 170, height: 170, imageRendering: "pixelated", objectFit: "contain", background: "transparent" }}
                />
                {myDmgFloat && (
                  <div key={myDmgFloat.key} style={{ position: "absolute", top: 0, left: "50%", pointerEvents: "none", zIndex: 20 }}>
                    <div className="pq-dmg-float">{myDmgFloat.dmg}</div>
                    {myDmgFloat.eff >= 2 && <div className="pq-dmg-eff">Super effective!</div>}
                    {myDmgFloat.eff > 0 && myDmgFloat.eff < 1 && <div className="pq-dmg-eff" style={{ color: "#90caf9" }}>Not very effective…</div>}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="bx-me-plate">
            <NamePlate mon={myActive} side="me" showHpNumbers showExp />
            <div style={{ marginTop: 4, display: "flex", justifyContent: "flex-end", paddingRight: 4 }}>
              <PokeballRow mons={me.mons} align="right" />
            </div>
          </div>

          {/* Battle text dialog */}
          <div className="bx-dialog">
            {!awaitingMyAction && !awaitingForceSwitch && !state.finished && !intro && (
              <div className="bx-dialog-text">
                {oppPicked ? "Opponent is ready…" : "Waiting for opponent…"}
              </div>
            )}
            {intro && (
              <div className="bx-dialog-text">
                {opp.ownerName || "Opponent"} sent out {oppActive.name}!<br />
                Go, {myActive.name}!
              </div>
            )}
            {!intro && displayedLog.map((l: LogEntry, i: number) => (
              <div key={i} className="bx-dialog-text" style={{
                color: l.kind === "faint" ? "#FF8A80" : l.kind === "move" ? "#FFE082" : l.kind === "status" ? "#B39DDB" : "#fff",
              }}>{l.text}</div>
            ))}
          </div>

          {/* Result overlay */}
          {(state.finished || bannerText) && (
            <div className="bx-result">
              <div className="bx-result-title">
                {state.finished
                  ? (state.winnerIdx === mySide ? "VICTORY!" : state.winnerIdx == null ? "DRAW" : "DEFEAT")
                  : bannerText}
              </div>
              {onExit && <button className="bx-continue" onClick={onExit}>CONTINUE</button>}
            </div>
          )}
        </div>

        {/* Action panel */}
        <div className="bx-panel">
          {/* Force-switch */}
          {awaitingForceSwitch && (
            <>
              <div className="bx-section-h">CHOOSE NEXT POKÉMON</div>
              <div className="bx-bench-grid">
                {benchMe.map(({ m, i }) => (
                  <button key={m.uid} disabled={m.currentHp <= 0} onClick={() => onAction({ kind: "switch", toIdx: i })} className="bx-bench-btn">
                    <BenchCard mon={m} />
                  </button>
                ))}
                {benchMe.every((b) => b.m.currentHp <= 0) && (
                  <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 16, opacity: 0.6, fontSize: 11 }}>No Pokémon left.</div>
                )}
              </div>
            </>
          )}

          {/* Main → fight / switch / items */}
          {awaitingMyAction && !awaitingForceSwitch && (
            <>
              {actionMode === "main" && (
                <>
                  <div className="bx-section-h">WHAT WILL {myActive.name.toUpperCase()} DO?</div>
                  <div className="bx-main-grid">
                    <button className="bx-main-btn bx-main-fight" onClick={() => setActionMode("fight")}>
                      <i style={{ fontStyle: "normal", fontSize: 18 }}>⚔</i><span>FIGHT</span>
                    </button>
                    <button className="bx-main-btn" onClick={() => setActionMode("switch")}>
                      <i style={{ fontStyle: "normal", fontSize: 18 }}>↻</i><span>SWITCH</span>
                    </button>
                    <button className="bx-main-btn" onClick={() => setActionMode("items")}>
                      <i style={{ fontStyle: "normal", fontSize: 18 }}>🎒</i><span>ITEMS</span>
                    </button>
                    <button className="bx-main-btn bx-main-escape" onClick={() => { if (onForfeit) onForfeit(); else if (onExit) onExit(); }}>
                      <i style={{ fontStyle: "normal", fontSize: 18 }}>⤴</i><span>ESCAPE</span>
                    </button>
                  </div>
                </>
              )}

              {actionMode === "fight" && (
                <>
                  <div className="bx-row-h">
                    <button className="bx-back-mini" onClick={() => setActionMode("main")}>‹</button>
                    <span>CHOOSE A MOVE</span>
                  </div>
                  <div className="bx-move-grid">
                    {[0, 1, 2, 3].map((i) => {
                      const name = myActive.moves[i];
                      if (!name) return <div key={i} className="bx-move-empty" />;
                      const def = getMove(name);
                      const pp = myActive.pp?.[name] ?? def.pp;
                      const colour = TYPE_COLORS[def.type] ?? "#888";
                      return (
                        <button key={i} disabled={pp <= 0} onClick={() => onAction({ kind: "move", moveIdx: i })} className="bx-move-card" style={{ borderColor: colour, opacity: pp <= 0 ? 0.4 : 1 }}>
                          <div className="bx-move-name">{def.name}</div>
                          <div className="bx-move-sub">
                            <span style={{ color: colour }}>{def.type.toUpperCase()}</span>
                            <span>PWR: {def.power || "—"}</span>
                            <span>PP {pp}/{def.pp}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {actionMode === "switch" && (
                <>
                  <div className="bx-row-h">
                    <button className="bx-back-mini" onClick={() => setActionMode("main")}>‹</button>
                    <span>SWITCH POKÉMON</span>
                  </div>
                  <div className="bx-bench-grid">
                    {benchMe.length === 0 && <div style={{ gridColumn: "1 / -1", textAlign: "center", opacity: 0.6, fontSize: 11, padding: 16 }}>No other Pokémon available.</div>}
                    {benchMe.map(({ m, i }) => (
                      <button key={m.uid} disabled={m.currentHp <= 0} onClick={() => onAction({ kind: "switch", toIdx: i })} className="bx-bench-btn">
                        <BenchCard mon={m} />
                      </button>
                    ))}
                  </div>
                </>
              )}

              {actionMode === "items" && (
                <>
                  <div className="bx-row-h">
                    <button className="bx-back-mini" onClick={() => setActionMode("main")}>‹</button>
                    <span>ITEMS</span>
                  </div>
                  <div style={{ textAlign: "center", padding: 22, opacity: 0.6, fontSize: 11 }}>No usable items in this battle.</div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BenchCard({ mon }: { mon: BattleMon }) {
  const max = calcMaxHp(mon);
  const pct = Math.max(0, Math.min(100, (mon.currentHp / max) * 100));
  const fainted = mon.currentHp <= 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: fainted ? 0.4 : 1, filter: fainted ? "grayscale(1)" : "none" }}>
      <BattleSprite sprite={mon.sprite || mon.name.toLowerCase()} style={{ width: 54, height: 54, imageRendering: "pixelated", objectFit: "contain" }} />
      <div style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 2 }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mon.name}</span>
          <span>L{mon.level}</span>
        </div>
        <div style={{ height: 4, background: "rgba(0,0,0,0.6)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: pct > 50 ? "#5dc26b" : pct > 20 ? "#f0c020" : "#e64545", transition: "width 400ms" }} />
        </div>
      </div>
    </div>
  );
}

/* ---------- CSS (animations + layout) ---------- */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

.bx-stage {
  position: relative; height: 380px; width: 100%; overflow: hidden;
  background: linear-gradient(180deg, #b6e7ff 0%, #b6e7ff 50%, #d6c08a 50%, #c2a866 100%);
}
.bx-sky { position: absolute; inset: 0 0 50% 0; background: linear-gradient(180deg,#9adfff 0%,#cfeeff 100%); }
.bx-ground { position: absolute; inset: 50% 0 0 0; background: linear-gradient(180deg,#d6c08a 0%,#a88e58 100%); }

/* ── Scanlines ── */
.bt-scanlines {
  position: absolute; inset: 0; pointer-events: none; z-index: 10;
  background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 4px);
}

.bx-opp-plate { position: absolute; top: 10px; left: 10px; z-index: 5; }
/* Player plate sits in the band above the dialog, lower-right */
.bx-me-plate  { position: absolute; bottom: 100px; right: 10px; z-index: 5; }

/* Opponent shadow: darker pooled drop-shadow with blur for true depth */
.bx-opp-platform {
  position: absolute; top: 142px; right: 38px; width: 170px; height: 26px;
  background: radial-gradient(ellipse at 50% 60%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0) 75%);
  border-radius: 50%;
  filter: blur(2px);
}
/* Player platform: lighter shadow, slightly blurred */
.bx-me-platform {
  position: absolute; bottom: 92px; left: 14px; width: 210px; height: 28px;
  background: radial-gradient(ellipse at 50% 60%, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.22) 50%, rgba(0,0,0,0) 75%);
  border-radius: 50%;
  filter: blur(2px);
}
/* Enemy: feet land on the upper portion of the shadow (perspective).
   Promoted to its own GPU layer so the GIF doesn't flicker as the browser
   recomposites it over the semi-transparent shadow gradient. */
.bx-opp-sprite {
  position: absolute; top: 38px; right: 60px; width: 120px; height: 115px;
  display:flex; align-items:flex-end; justify-content:center; z-index: 4;
  transform: translateZ(0); will-change: transform; backface-visibility: hidden;
}
/* Player: bigger foreground sprite, also isolated to its own layer */
.bx-me-sprite  {
  position: absolute; bottom: 80px; left: 8px; width: 180px; height: 180px;
  display:flex; align-items:flex-end; justify-content:center; z-index: 4;
  transform: translateZ(0); will-change: transform; backface-visibility: hidden;
}

@keyframes bx-slide-in-right { from { transform: translateX(180%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes bx-slide-in-left  { from { transform: translateX(-180%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
.bx-slide-in-right { animation: bx-slide-in-right 700ms cubic-bezier(0.22, 1, 0.36, 1); }
.bx-slide-in-left  { animation: bx-slide-in-left  700ms cubic-bezier(0.22, 1, 0.36, 1); }

@keyframes bx-faint { from { transform: translateY(0); opacity: 1; } to { transform: translateY(40px); opacity: 0; } }
.bx-faint img { animation: bx-faint 600ms forwards ease-in; }

@keyframes bx-throw-opp { 0% { transform: translate(-160px, 60px) rotate(0deg); opacity: 0; } 30% { opacity: 1; } 70% { transform: translate(20px, -10px) rotate(540deg); } 100% { transform: translate(0,0) rotate(720deg); opacity: 0; } }
@keyframes bx-throw-me  { 0% { transform: translate(160px, 60px) rotate(0deg); opacity: 0; }  30% { opacity: 1; } 70% { transform: translate(-20px, -10px) rotate(-540deg); } 100% { transform: translate(0,0) rotate(-720deg); opacity: 0; } }
.bx-pokeball-throw-opp { animation: bx-throw-opp 900ms ease-out forwards; }
.bx-pokeball-throw-me  { animation: bx-throw-me  900ms ease-out forwards; }

/* ── Idle bob (player sprite) ── */
@keyframes pq-bob { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-6px) rotate(0.8deg)} }
.pq-bob { animation: pq-bob 2.6s ease-in-out infinite; }
.pq-bob.bx-faint { animation: bx-faint 600ms forwards ease-in; }

/* ── Hit flash (red burst on img) ── */
@keyframes pq-flash-red-img {
  0%  { filter: brightness(1.4) sepia(1) saturate(8) hue-rotate(-25deg) drop-shadow(0 0 8px #ff3030); }
  20% { filter: brightness(1.4) sepia(1) saturate(8) hue-rotate(-25deg) drop-shadow(0 0 8px #ff3030); }
  60% { filter: brightness(1.4) sepia(1) saturate(8) hue-rotate(-25deg) drop-shadow(0 0 6px #ff3030); }
  100%{ filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5)); }
}
/* ── Shake on hit (container) ── */
@keyframes pq-shake-kf { 0%,100%{transform:translateX(0)} 18%{transform:translateX(-9px)} 36%{transform:translateX(9px)} 54%{transform:translateX(-5px)} 72%{transform:translateX(5px)} 90%{transform:translateX(-2px)} }
.pq-hit { animation: pq-shake-kf 450ms ease-out; }
.pq-hit img { animation: pq-flash-red-img 320ms ease-out forwards; }

/* ── Lunge ── */
@keyframes pq-lunge-r { 0%{transform:translateX(0)} 40%{transform:translateX(34px)} 100%{transform:translateX(0)} }
@keyframes pq-lunge-l { 0%{transform:translateX(0)} 40%{transform:translateX(-34px)} 100%{transform:translateX(0)} }
.pq-lunge-right { animation: pq-lunge-r 200ms ease-out; }
.pq-lunge-left  { animation: pq-lunge-l 200ms ease-out; }

/* ── Arena screen shake + red vignette ── */
@keyframes pq-arena-hit-kf {
  0%   { box-shadow: inset 0 0 0 transparent; transform: translate(0,0); }
  15%  { box-shadow: inset 0 0 60px rgba(255,80,80,0.30); transform: translate(-4px, 2px); }
  30%  { box-shadow: inset 0 0 60px rgba(255,80,80,0.30); transform: translate(3px,-2px); }
  50%  { box-shadow: inset 0 0 30px rgba(255,80,80,0.15); transform: translate(-2px, 1px); }
  70%  { transform: translate(2px,-1px); }
  100% { box-shadow: none; transform: translate(0,0); }
}
.pq-arena-hit { animation: pq-arena-hit-kf 260ms ease-out; }

/* ── Floating damage number ── */
@keyframes pq-dmg-float-kf {
  0%   { transform: translateX(-50%) translateY(0)   scale(0.6); opacity: 1; }
  10%  { transform: translateX(-50%) translateY(-8px) scale(1.1); opacity: 1; }
  20%  { transform: translateX(-50%) translateY(-14px) scale(1);  opacity: 1; }
  65%  { opacity: 1; }
  100% { transform: translateX(-50%) translateY(-60px) scale(1); opacity: 0; }
}
.pq-dmg-float {
  position: absolute; top: 0; left: 0; white-space: nowrap; pointer-events: none;
  animation: pq-dmg-float-kf 1000ms ease-out forwards;
  font-family: 'Press Start 2P', 'Courier New', monospace; font-size: 14px; font-weight: 900;
  color: #f43f5e;
  text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000,
               0 0 12px #f43f5e, 0 0 24px rgba(244,63,94,0.5);
}
@keyframes pq-dmg-eff-kf {
  0%   { transform: translateX(-50%) translateY(16px) scale(0.8); opacity: 0; }
  15%  { opacity: 1; }
  65%  { opacity: 1; }
  100% { transform: translateX(-50%) translateY(-44px); opacity: 0; }
}
.pq-dmg-eff {
  position: absolute; top: 0; left: 0; white-space: nowrap; pointer-events: none;
  animation: pq-dmg-eff-kf 1100ms 80ms ease-out forwards;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 9px; font-weight: 700; color: #ffd54f;
  text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
}

/* ── Move type FX particle ── */
.pq-move-fx {
  position: absolute; width: 54px; height: 54px; border-radius: 50%;
  pointer-events: none; z-index: 15;
}
/* from-me: start bottom-left, fly toward top-right */
.pq-fx-from-me  { bottom: 130px; left: 60px; }
/* from-opp: start top-right, fly toward bottom-left (mirrored) */
.pq-fx-from-opp { top: 60px; right: 80px; transform: scaleX(-1); }

@keyframes pq-fx-slide-r   { 0%{opacity:1;transform:translateX(0)} 100%{opacity:0;transform:translateX(100px) translateY(-30px)} }
@keyframes pq-fx-slide-shrink { 0%{opacity:1;transform:translateX(0) scale(1)} 100%{opacity:0;transform:translateX(90px) translateY(-20px) scale(0.3)} }
@keyframes pq-fx-flicker   { 0%,20%,40%,60%,80%{opacity:1} 10%,30%,50%,70%{opacity:0.2} 100%{opacity:0;transform:translateX(70px)} }
@keyframes pq-fx-arc       { 0%{opacity:1;transform:translate(0,0) rotate(0deg)} 50%{transform:translate(50px,-32px) rotate(180deg)} 100%{opacity:0;transform:translate(90px,0) rotate(360deg)} }
@keyframes pq-fx-burst     { 0%{opacity:1;transform:scale(0)} 50%{opacity:0.9;transform:scale(2.5)} 100%{opacity:0;transform:scale(4.5)} }
@keyframes pq-fx-diag      { 0%{opacity:1;transform:translate(0,0) rotate(0deg)} 100%{opacity:0;transform:translate(70px,20px) rotate(180deg)} }
@keyframes pq-fx-up        { 0%{opacity:1;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-70px) scale(0.4)} }
@keyframes pq-fx-grow      { 0%{opacity:0.8;transform:translate(0,0) scale(1)} 100%{opacity:0;transform:translate(70px,0) scale(1.6)} }
@keyframes pq-fx-squish    { 0%{opacity:1;transform:translateX(0) scaleY(1)} 50%{transform:translateX(40px) scaleY(0.25)} 100%{opacity:0;transform:translateX(90px) scaleY(1)} }
@keyframes pq-fx-spin      { 0%{opacity:1;transform:scale(1) rotate(0deg)} 50%{transform:scale(1.5) rotate(180deg)} 100%{opacity:0;transform:scale(0.4) rotate(360deg)} }
@keyframes pq-fx-lunge     { 0%{opacity:1;transform:translateX(0)} 50%{transform:translateX(30px)} 100%{opacity:0;transform:translateX(50px)} }
@keyframes pq-fx-skew      { 0%{opacity:1;transform:translateX(0) skewX(0deg)} 100%{opacity:0;transform:translateX(90px) skewX(-25deg)} }

.pq-fx-fire     { animation: pq-fx-slide-shrink 380ms ease-in  forwards; background: radial-gradient(circle,#ff8c00,#ff4400); box-shadow: 0 0 16px #ff6600; }
.pq-fx-water    { animation: pq-fx-skew         380ms ease-out forwards; background: radial-gradient(circle,#6dd5ed,#2193b0); }
.pq-fx-electric { animation: pq-fx-flicker      340ms linear   forwards; background: radial-gradient(circle,#ffe600,#ffb700); box-shadow: 0 0 20px #ffe600; }
.pq-fx-grass    { animation: pq-fx-arc          480ms ease-in-out forwards; background: radial-gradient(circle,#74b955,#228B22); }
.pq-fx-psychic  { animation: pq-fx-burst        480ms ease-out forwards; background: radial-gradient(circle,#ff85d0,#e040fb,transparent); }
.pq-fx-ice      { animation: pq-fx-diag         380ms ease-out forwards; background: radial-gradient(circle,#a8edea,#5ab4d4); transform: rotate(45deg); }
.pq-fx-ground   { animation: pq-fx-slide-r      380ms ease-out forwards; background: radial-gradient(circle,#d2b48c,#8B4513); }
.pq-fx-poison   { animation: pq-fx-up           560ms ease-out forwards; background: radial-gradient(circle,#c77dff,#7b2d8b); }
.pq-fx-ghost    { animation: pq-fx-grow         460ms ease-out forwards; background: radial-gradient(circle,rgba(149,117,205,0.85),rgba(94,53,177,0.5)); box-shadow: 0 0 14px rgba(149,117,205,0.7); }
.pq-fx-rock     { animation: pq-fx-diag         380ms ease-in  forwards; background: radial-gradient(circle,#a0937d,#6d5944); border-radius: 28%; }
.pq-fx-flying   { animation: pq-fx-squish       400ms ease-out forwards; background: radial-gradient(circle,#98d8f0,#5fb8d4); }
.pq-fx-dragon   { animation: pq-fx-spin         480ms ease-in-out forwards; background: radial-gradient(circle,#9d4edd,#5a189a); box-shadow: 0 0 18px rgba(157,78,221,0.7); }
.pq-fx-dark     { animation: pq-fx-slide-r      360ms ease-in  forwards; background: radial-gradient(circle,#424242,#212121); box-shadow: 0 0 10px rgba(0,0,0,0.8); }
.pq-fx-steel    { animation: pq-fx-slide-r      360ms ease-out forwards; background: radial-gradient(circle,#b8c0cc,#7a8395); box-shadow: 0 0 8px #b8c0cc; }
.pq-fx-fairy    { animation: pq-fx-burst        460ms ease-out forwards; background: radial-gradient(circle,#ffb3d9,#ff69b4,transparent); }
.pq-fx-bug      { animation: pq-fx-arc          420ms ease-in-out forwards; background: radial-gradient(circle,#a8b820,#6d7a10); }
.pq-fx-normal   { animation: pq-fx-lunge        200ms ease-out forwards; background: radial-gradient(circle,#a8a8a8,#686868); }
.pq-fx-fighting { animation: pq-fx-lunge        200ms ease-out forwards; background: radial-gradient(circle,#c07030,#9a3824); }

.bx-dialog {
  position: absolute; left: 12px; right: 12px; bottom: 8px; z-index: 6;
  background: #6cb4b1; border: 3px solid #c0392b; border-radius: 8px;
  min-height: 56px; padding: 8px 10px;
  box-shadow: 0 3px 0 rgba(0,0,0,0.35);
}
.bx-dialog-text { color: #0a0a1e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 9px; line-height: 1.4; }

.bx-result { position: absolute; inset: 0; background: rgba(0,0,0,0.7); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; z-index: 20; }
.bx-result-title { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 22px; color: #ffd54f; text-shadow: 0 3px 0 #000; letter-spacing: 2px; }
.bx-continue { background: #4CAF50; color: #fff; border: 2px solid #2e7d32; border-radius: 10px; padding: 10px 22px; font-weight: 800; font-size: 12px; cursor: pointer; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; letter-spacing: 1.5px; }

/* Bottom action panel */
.bx-panel { padding: 12px; background: #0a0a1e; border-top: 1px solid #1c1c33; min-height: 230px; }
.bx-section-h { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 9px; color: #8794ad; letter-spacing: 1.5px; margin: 4px 4px 10px; text-transform: uppercase; }
.bx-row-h { display:flex; align-items: center; gap: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 9px; color: #8794ad; letter-spacing: 1.5px; margin: 0 4px 10px; }
.bx-back-mini { background: #1a1a2e; border: 1px solid #2a2a44; color: #cdd2e0; border-radius: 6px; padding: 3px 8px; cursor: pointer; font-weight: 800; }

.bx-main-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.bx-main-btn { background: #15172a; border: 1px solid #2a2a44; color: #fff; border-radius: 12px; padding: 14px 10px; cursor: pointer; display: flex; align-items: center; gap: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; letter-spacing: 1px; transition: transform 100ms, background 150ms; }
.bx-main-btn:hover { background: #1f223a; }
.bx-main-btn:active { transform: scale(0.97); }
.bx-main-fight { border-color: #e64545; background: linear-gradient(180deg,#2a1320,#15172a); }
.bx-main-escape { border-color: #f0c020; }

.bx-move-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.bx-move-card { background: #0f1226; border: 1.5px solid #3b6cb3; color: #fff; border-radius: 10px; padding: 10px 12px; text-align: left; cursor: pointer; transition: transform 100ms, background 150ms; }
.bx-move-card:hover:not(:disabled) { background: #161a36; }
.bx-move-card:active:not(:disabled) { transform: scale(0.97); }
.bx-move-card:disabled { cursor: not-allowed; }
.bx-move-name { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; margin-bottom: 6px; letter-spacing: 0.5px; }
.bx-move-sub { display: flex; justify-content: space-between; gap: 6px; font-size: 9px; color: #8794ad; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
.bx-move-empty { background: rgba(255,255,255,0.03); border-radius: 10px; min-height: 64px; }

.bx-bench-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.bx-bench-btn { background: #15172a; border: 1px solid #2a2a44; color: #fff; border-radius: 10px; padding: 8px; cursor: pointer; }
.bx-bench-btn:disabled { background: #0d0e1d; cursor: not-allowed; }
`;

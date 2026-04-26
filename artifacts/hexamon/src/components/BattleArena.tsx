import { useEffect, useRef, useState } from "react";
import type { Action, BattleMon, BattleState, LogEntry } from "../lib/battle-engine";
import { calcMaxHp } from "../lib/battle-engine";
import { getMove } from "../lib/move-data";
import { TYPE_COLORS } from "../lib/type-chart";

const SPRITE_FRONT = (clean: string) =>
  `https://play.pokemonshowdown.com/sprites/ani/${clean.replace(/[^a-z0-9]/g, "")}.gif`;
const SPRITE_BACK = (clean: string) =>
  `https://play.pokemonshowdown.com/sprites/ani-back/${clean.replace(/[^a-z0-9]/g, "")}.gif`;

type Props = {
  state: BattleState;
  mySide: 0 | 1;
  mode: "league" | "pvp";
  awaitingMyAction: boolean;
  awaitingForceSwitch: boolean;
  oppPicked?: boolean;            // true when opponent has locked in their action (PvP only)
  turnTimerSec?: number | null;   // remaining seconds, or null = no timer
  onAction: (a: Action) => void;
  onForfeit?: () => void;
  bannerText?: string | null;     // e.g. "Opponent left", "Champion!", etc.
  onExit?: () => void;            // shown on the result banner
};

const STATUS_COLORS: Record<string, string> = {
  Burn: "#FF6B6B", Poison: "#A040A0", Paralyze: "#F8D030", Sleep: "#90A4AE", Freeze: "#81D4FA",
};

function HpBar({ now, max, big }: { now: number; max: number; big?: boolean }) {
  const pct = Math.max(0, Math.min(100, (now / max) * 100));
  const colour = pct > 50 ? "#4CAF50" : pct > 20 ? "#FFC107" : "#F44336";
  return (
    <div style={{ background: "rgba(0,0,0,0.45)", borderRadius: 6, height: big ? 14 : 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.15)" }}>
      <div style={{
        width: `${pct}%`, height: "100%",
        background: `linear-gradient(180deg, ${colour}, ${colour}cc)`,
        transition: "width 600ms ease, background 400ms ease",
      }} />
    </div>
  );
}

function MonCard({ mon, big, back }: { mon: BattleMon; big?: boolean; back?: boolean }) {
  const max = calcMaxHp(mon);
  const sprite = mon.sprite || mon.name.toLowerCase();
  const url = back ? SPRITE_BACK(sprite) : SPRITE_FRONT(sprite);
  const fainted = mon.currentHp <= 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: fainted ? 0.35 : 1, filter: fainted ? "grayscale(1)" : "none" }}>
      <img
        src={url}
        alt={mon.name}
        style={{
          width: big ? 140 : 56, height: big ? 140 : 56, imageRendering: "pixelated",
          objectFit: "contain", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.4))",
        }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).src = SPRITE_FRONT(sprite); }}
      />
      <div style={{ width: big ? 220 : 70 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: big ? 14 : 9, color: "#fff", fontWeight: 700, marginBottom: 2 }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mon.name}</span>
          <span>Lv{mon.level}</span>
        </div>
        <HpBar now={mon.currentHp} max={max} big={big} />
        {big && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#fff", marginTop: 4 }}>
          <span>HP {mon.currentHp}/{max}</span>
          {mon.status && <span style={{ background: STATUS_COLORS[mon.status] ?? "#555", color: "#fff", padding: "1px 6px", borderRadius: 6, fontSize: 10, fontWeight: 700 }}>{mon.status}</span>}
        </div>}
      </div>
    </div>
  );
}

export default function BattleArena(props: Props) {
  const { state, mySide, awaitingMyAction, awaitingForceSwitch, oppPicked, turnTimerSec, onAction, onForfeit, bannerText, onExit, mode } = props;
  const me = state.teams[mySide];
  const opp = state.teams[(1 - mySide) as 0 | 1];
  const myActive = me.mons[me.activeIdx];
  const oppActive = opp.mons[opp.activeIdx];

  const [tab, setTab] = useState<"fight" | "switch">("fight");
  const logRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.log.length]);

  // Auto-open switch tab when force-switch is required.
  useEffect(() => {
    if (awaitingForceSwitch) setTab("switch");
  }, [awaitingForceSwitch]);

  const benchOpp = opp.mons.map((m, i) => ({ m, i })).filter((x) => x.i !== opp.activeIdx);
  const benchMe = me.mons.map((m, i) => ({ m, i })).filter((x) => x.i !== me.activeIdx);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)",
      display: "flex", flexDirection: "column", color: "#fff", fontFamily: "system-ui",
      zIndex: 9000,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)" }}>
        <div style={{ fontSize: 13, opacity: 0.85 }}>
          <strong>{mode === "pvp" ? "PvP Battle" : "League Battle"}</strong> · Turn {state.turn}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {turnTimerSec != null && <div style={{ background: turnTimerSec < 10 ? "#F44336" : "rgba(255,255,255,0.12)", padding: "4px 10px", borderRadius: 12, fontWeight: 700, fontSize: 13 }}>⏱ {turnTimerSec}s</div>}
          {onForfeit && !state.finished && <button onClick={onForfeit} style={{ background: "#444", color: "#fff", border: 0, borderRadius: 8, padding: "6px 12px", fontWeight: 700, cursor: "pointer" }}>Forfeit</button>}
        </div>
      </div>

      {/* Battlefield */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "12px 16px", position: "relative" }}>
        {/* Opponent row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{opp.ownerName}</div>
            <div style={{ display: "flex", gap: 4 }}>
              {opp.mons.map((m, i) => (
                <div key={m.uid} title={m.name} style={{
                  width: 14, height: 14, borderRadius: 7,
                  background: m.currentHp <= 0 ? "#444" : (i === opp.activeIdx ? "#4CAF50" : "rgba(255,255,255,0.55)"),
                  border: "1px solid rgba(0,0,0,0.4)",
                }} />
              ))}
            </div>
            {oppPicked && <div style={{ fontSize: 11, color: "#FFD54F", marginTop: 4 }}>● Opponent ready</div>}
          </div>
          <MonCard mon={oppActive} big />
        </div>

        {/* My row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <MonCard mon={myActive} big back />
          <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, alignItems: "flex-end" }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{me.ownerName}</div>
            <div style={{ display: "flex", gap: 4 }}>
              {me.mons.map((m, i) => (
                <div key={m.uid} title={m.name} style={{
                  width: 14, height: 14, borderRadius: 7,
                  background: m.currentHp <= 0 ? "#444" : (i === me.activeIdx ? "#4CAF50" : "rgba(255,255,255,0.55)"),
                  border: "1px solid rgba(0,0,0,0.4)",
                }} />
              ))}
            </div>
          </div>
        </div>

        {/* Result banner */}
        {(state.finished || bannerText) && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16,
          }}>
            <div style={{ fontSize: 36, fontWeight: 900, textShadow: "0 2px 8px #000" }}>
              {state.finished
                ? (state.winnerIdx === mySide ? "Victory!" : state.winnerIdx == null ? "Draw." : "Defeat.")
                : bannerText}
            </div>
            {onExit && <button onClick={onExit} style={{ background: "#4CAF50", color: "#fff", border: 0, borderRadius: 12, padding: "10px 24px", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>Continue</button>}
          </div>
        )}
      </div>

      {/* Bottom panel */}
      <div style={{ background: "rgba(0,0,0,0.55)", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        {/* Log */}
        <div ref={logRef} style={{ maxHeight: 110, overflowY: "auto", padding: "8px 14px", fontSize: 12, fontFamily: "ui-monospace, monospace", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          {state.log.slice(-50).map((l: LogEntry, i: number) => (
            <div key={i} style={{ color: l.kind === "faint" ? "#FF8A80" : l.kind === "move" ? "#FFE082" : l.kind === "status" ? "#B39DDB" : "#fff", opacity: 0.92 }}>
              {l.text}
            </div>
          ))}
        </div>

        {/* Action zone */}
        <div style={{ padding: 12, minHeight: 150 }}>
          {!awaitingMyAction && !awaitingForceSwitch && !state.finished && (
            <div style={{ textAlign: "center", padding: 24, opacity: 0.7 }}>Waiting for opponent…</div>
          )}

          {awaitingForceSwitch && (
            <>
              <div style={{ fontSize: 13, marginBottom: 8, fontWeight: 700 }}>Choose your next Pokémon:</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {benchMe.map(({ m, i }) => (
                  <button key={m.uid} disabled={m.currentHp <= 0}
                    onClick={() => onAction({ kind: "switch", toIdx: i })}
                    style={{
                      background: m.currentHp <= 0 ? "#333" : "rgba(76, 175, 80, 0.25)",
                      border: "1px solid " + (m.currentHp <= 0 ? "#222" : "#4CAF50"),
                      borderRadius: 10, padding: 10, cursor: m.currentHp <= 0 ? "not-allowed" : "pointer",
                      color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    }}>
                    <MonCard mon={m} />
                  </button>
                ))}
              </div>
            </>
          )}

          {awaitingMyAction && !awaitingForceSwitch && (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <button onClick={() => setTab("fight")} style={tabBtn(tab === "fight")}>Fight</button>
                <button onClick={() => setTab("switch")} style={tabBtn(tab === "switch")}>Switch</button>
              </div>
              {tab === "fight" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[0, 1, 2, 3].map((i) => {
                    const name = myActive.moves[i];
                    if (!name) return <div key={i} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, height: 56 }} />;
                    const def = getMove(name);
                    const pp = myActive.pp?.[name] ?? def.pp;
                    const colour = TYPE_COLORS[def.type] ?? "#888";
                    return (
                      <button key={i} disabled={pp <= 0}
                        onClick={() => onAction({ kind: "move", moveIdx: i })}
                        style={{
                          background: `linear-gradient(135deg, ${colour}, ${colour}aa)`,
                          border: "2px solid rgba(255,255,255,0.18)", color: "#fff",
                          borderRadius: 10, padding: "8px 10px", cursor: pp <= 0 ? "not-allowed" : "pointer",
                          textAlign: "left", opacity: pp <= 0 ? 0.4 : 1,
                        }}>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>{def.name}</div>
                        <div style={{ fontSize: 10, opacity: 0.95, display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                          <span>{def.type} · {def.category}</span>
                          <span>PP {pp}/{def.pp}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {tab === "switch" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {benchMe.length === 0 && <div style={{ gridColumn: "1 / -1", textAlign: "center", opacity: 0.6, padding: 12 }}>No other Pokémon available.</div>}
                  {benchMe.map(({ m, i }) => (
                    <button key={m.uid} disabled={m.currentHp <= 0}
                      onClick={() => onAction({ kind: "switch", toIdx: i })}
                      style={{
                        background: m.currentHp <= 0 ? "#333" : "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.18)", color: "#fff",
                        borderRadius: 10, padding: 8, cursor: m.currentHp <= 0 ? "not-allowed" : "pointer",
                      }}>
                      <MonCard mon={m} />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function tabBtn(active: boolean): React.CSSProperties {
  return {
    flex: 1, background: active ? "rgba(76, 175, 80, 0.28)" : "rgba(255,255,255,0.05)",
    border: "1px solid " + (active ? "#4CAF50" : "rgba(255,255,255,0.18)"),
    color: "#fff", borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontWeight: 700,
  };
}

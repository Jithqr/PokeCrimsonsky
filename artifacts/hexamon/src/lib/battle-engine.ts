// Pure deterministic Pokémon-style battle engine.
// Used by both client-side League battles and the server-authoritative PvP server.
// No React, no DOM — just types in and types out.

import { typeMultiplier, type PType } from "./type-chart";
import { getMove, type MoveDef, type StatusName } from "./move-data";
import { natureMult } from "./natures";

// ----- Types ------------------------------------------------------------

export type BattleStat = "hp" | "atk" | "def" | "spa" | "spd" | "spe";

export type BattleMon = {
  uid: string;
  speciesId: number;
  name: string;
  level: number;
  types: PType[];                 // 1 or 2 entries
  baseStats: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  ivs: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  evs: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  nature: string;
  moves: string[];                // up to 4 move names
  // Live state:
  currentHp: number;
  status: StatusName | null;
  // Per-battle stat-stage modifiers in -6..+6 (only modified during battle).
  stages: { atk: number; def: number; spa: number; spd: number; spe: number };
  // PP per move (parallel to moves[]).
  pp?: Record<string, number>;
  // Sprite / display key (for UI use only)
  sprite?: string;
};

export type Team = {
  ownerId: string;
  ownerName: string;
  mons: BattleMon[];
  activeIdx: number;
};

export type BattleState = {
  teams: [Team, Team];
  turn: number;
  log: LogEntry[];
  finished: boolean;
  winnerIdx: 0 | 1 | null;        // null = draw / unfinished
};

export type LogEntry = {
  ts: number;
  side: 0 | 1 | "system";
  text: string;
  kind?: "move" | "switch" | "faint" | "status" | "info" | "result";
};

export type Action =
  | { kind: "move"; moveIdx: number }
  | { kind: "switch"; toIdx: number };

export type RNG = () => number;   // returns 0..1, seedable.
export const defaultRng: RNG = Math.random;

// ----- Stat math --------------------------------------------------------

// Standard Gen 3+ stat formula:
// HP   = floor(((2*Base + IV + floor(EV/4)) * Level) / 100) + Level + 10
// Stat = floor((((2*Base + IV + floor(EV/4)) * Level) / 100 + 5) * NatureMult)

export function calcMaxHp(m: { baseStats: { hp: number }; ivs: { hp: number }; evs: { hp: number }; level: number }) {
  const base = m.baseStats.hp;
  const iv = m.ivs.hp;
  const ev = m.evs.hp;
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * m.level) / 100) + m.level + 10;
}

export function calcStat(
  m: BattleMon,
  stat: "atk" | "def" | "spa" | "spd" | "spe",
): number {
  const base = m.baseStats[stat];
  const iv = m.ivs[stat];
  const ev = m.evs[stat];
  const raw = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * m.level) / 100) + 5;
  return Math.floor(raw * natureMult(m.nature, stat));
}

// Stage modifier table for normal stats: -6..+6 → multiplier.
const STAGE_MULT = [2/8, 2/7, 2/6, 2/5, 2/4, 2/3, 1, 3/2, 4/2, 5/2, 6/2, 7/2, 8/2];
function withStage(base: number, stage: number): number {
  const idx = Math.max(-6, Math.min(6, stage)) + 6;
  return Math.floor(base * STAGE_MULT[idx]);
}

export function effectiveStat(m: BattleMon, stat: "atk" | "def" | "spa" | "spd" | "spe"): number {
  let s = withStage(calcStat(m, stat), m.stages[stat]);
  if (stat === "atk" && m.status === "Burn") s = Math.floor(s / 2);
  if (stat === "spe" && m.status === "Paralyze") s = Math.floor(s / 2);
  return Math.max(1, s);
}

// ----- Damage calc ------------------------------------------------------

export function calcDamage(
  attacker: BattleMon,
  defender: BattleMon,
  move: MoveDef,
  rng: RNG,
): { damage: number; eff: number; crit: boolean; missed: boolean } {
  if (move.category === "Status" || move.power <= 0) {
    return { damage: 0, eff: 1, crit: false, missed: false };
  }

  // Accuracy roll.
  if (move.accuracy < 100 && rng() * 100 >= move.accuracy) {
    return { damage: 0, eff: 1, crit: false, missed: true };
  }

  const A = move.category === "Physical" ? effectiveStat(attacker, "atk") : effectiveStat(attacker, "spa");
  const D = move.category === "Physical" ? effectiveStat(defender, "def") : effectiveStat(defender, "spd");

  // Base damage formula (Gen-style simplified).
  const lvl = attacker.level;
  let dmg = Math.floor((((2 * lvl) / 5 + 2) * move.power * (A / Math.max(1, D))) / 50) + 2;

  // STAB.
  if (attacker.types.includes(move.type)) dmg = Math.floor(dmg * 1.5);

  // Type effectiveness.
  const eff = typeMultiplier(move.type, defender.types);
  if (eff === 0) return { damage: 0, eff: 0, crit: false, missed: false };
  dmg = Math.floor(dmg * eff);

  // Crit (1/24 base rate).
  const crit = rng() < (1 / 24);
  if (crit) dmg = Math.floor(dmg * 1.5);

  // Random factor 0.85..1.0.
  dmg = Math.floor(dmg * (0.85 + rng() * 0.15));

  return { damage: Math.max(1, dmg), eff, crit, missed: false };
}

// ----- Turn priority/resolution ----------------------------------------

type SideAction = { side: 0 | 1; action: Action };

/**
 * Order two actions per the priority rules:
 *  1) Switching > all moves.
 *  2) Higher move priority goes first.
 *  3) Speed tiebreaker; equal speed = 50/50 RNG.
 */
function orderActions(state: BattleState, a: SideAction, b: SideAction, rng: RNG): [SideAction, SideAction] {
  const aIsSwitch = a.action.kind === "switch";
  const bIsSwitch = b.action.kind === "switch";
  if (aIsSwitch && !bIsSwitch) return [a, b];
  if (!aIsSwitch && bIsSwitch) return [b, a];
  if (aIsSwitch && bIsSwitch) {
    // Both switching: speed order (active mons can be assumed; use whatever's currently out).
    return speedOrder(state, a, b, rng);
  }
  // Both moves: priority then speed.
  const moveA = getMove((state.teams[a.side].mons[state.teams[a.side].activeIdx].moves[(a.action as { moveIdx: number }).moveIdx] || ""));
  const moveB = getMove((state.teams[b.side].mons[state.teams[b.side].activeIdx].moves[(b.action as { moveIdx: number }).moveIdx] || ""));
  if (moveA.priority !== moveB.priority) {
    return moveA.priority > moveB.priority ? [a, b] : [b, a];
  }
  return speedOrder(state, a, b, rng);
}

function speedOrder(state: BattleState, a: SideAction, b: SideAction, rng: RNG): [SideAction, SideAction] {
  const sa = effectiveStat(state.teams[a.side].mons[state.teams[a.side].activeIdx], "spe");
  const sb = effectiveStat(state.teams[b.side].mons[state.teams[b.side].activeIdx], "spe");
  if (sa > sb) return [a, b];
  if (sb > sa) return [b, a];
  return rng() < 0.5 ? [a, b] : [b, a];
}

// ----- Turn execution ---------------------------------------------------

function pushLog(state: BattleState, entry: Omit<LogEntry, "ts">) {
  state.log.push({ ts: Date.now(), ...entry });
}

function isFainted(m: BattleMon): boolean {
  return m.currentHp <= 0;
}

function applyStatChange(state: BattleState, target: BattleMon, stat: "atk" | "def" | "spa" | "spd" | "spe", stages: number, side: 0 | 1) {
  const before = target.stages[stat];
  const after = Math.max(-6, Math.min(6, before + stages));
  target.stages[stat] = after;
  const dir = stages > 0 ? "rose" : "fell";
  pushLog(state, { side, kind: "status", text: `${target.name}'s ${stat.toUpperCase()} ${dir}.` });
}

function maybeApplyStatus(state: BattleState, defender: BattleMon, status: StatusName, side: 0 | 1) {
  if (defender.status) return;
  // Type immunities.
  if (status === "Burn" && defender.types.includes("Fire")) return;
  if (status === "Poison" && (defender.types.includes("Poison") || defender.types.includes("Steel"))) return;
  if (status === "Paralyze" && defender.types.includes("Electric")) return;
  defender.status = status;
  pushLog(state, { side, kind: "status", text: `${defender.name} was ${status.toLowerCase()}ed!` });
}

/** Execute one action (move or switch) by `actorSide`. Returns true if a faint occurred. */
function executeAction(state: BattleState, actorSide: 0 | 1, action: Action, rng: RNG): { faintedDefender: boolean; faintedAttacker: boolean } {
  const team = state.teams[actorSide];
  const enemy = state.teams[(1 - actorSide) as 0 | 1];
  const attacker = team.mons[team.activeIdx];

  if (isFainted(attacker)) return { faintedDefender: false, faintedAttacker: true };

  // SWITCH.
  if (action.kind === "switch") {
    const target = team.mons[action.toIdx];
    if (!target || isFainted(target) || action.toIdx === team.activeIdx) {
      pushLog(state, { side: actorSide, kind: "info", text: `${team.ownerName} couldn't switch.` });
      return { faintedDefender: false, faintedAttacker: false };
    }
    pushLog(state, { side: actorSide, kind: "switch", text: `${team.ownerName} sent out ${target.name}!` });
    team.activeIdx = action.toIdx;
    return { faintedDefender: false, faintedAttacker: false };
  }

  // MOVE.
  // Status effect can prevent action entirely.
  if (attacker.status === "Sleep" && rng() > 0.33) {
    pushLog(state, { side: actorSide, kind: "status", text: `${attacker.name} is fast asleep.` });
    return { faintedDefender: false, faintedAttacker: false };
  }
  if (attacker.status === "Freeze" && rng() > 0.20) {
    pushLog(state, { side: actorSide, kind: "status", text: `${attacker.name} is frozen solid.` });
    return { faintedDefender: false, faintedAttacker: false };
  }
  if (attacker.status === "Paralyze" && rng() < 0.25) {
    pushLog(state, { side: actorSide, kind: "status", text: `${attacker.name} is paralyzed and can't move!` });
    return { faintedDefender: false, faintedAttacker: false };
  }

  const moveName = attacker.moves[action.moveIdx] || "Tackle";
  const move = getMove(moveName);

  // PP system removed — moves can be used unlimited times.

  pushLog(state, { side: actorSide, kind: "move", text: `${attacker.name} used ${move.name}!` });

  const defender = enemy.mons[enemy.activeIdx];

  // Status moves: apply effect and exit.
  if (move.category === "Status" || move.power <= 0) {
    if (move.effect?.status) {
      // Accuracy roll for status moves.
      if (move.accuracy < 100 && rng() * 100 >= move.accuracy) {
        pushLog(state, { side: actorSide, kind: "info", text: `It missed!` });
      } else {
        maybeApplyStatus(state, defender, move.effect.status, actorSide);
      }
    } else if (move.effect?.statChange) {
      const tgt = move.effect.statChange.target === "self" ? attacker : defender;
      const tgtSide: 0 | 1 = move.effect.statChange.target === "self" ? actorSide : (1 - actorSide) as 0 | 1;
      applyStatChange(state, tgt, move.effect.statChange.stat as "atk" | "def" | "spa" | "spd" | "spe", move.effect.statChange.stages, tgtSide);
    } else if (move.name === "Recover" || move.name === "Synthesis") {
      const max = calcMaxHp(attacker);
      const heal = Math.floor(max / 2);
      attacker.currentHp = Math.min(max, attacker.currentHp + heal);
      pushLog(state, { side: actorSide, kind: "status", text: `${attacker.name} recovered ${heal} HP.` });
    } else {
      pushLog(state, { side: actorSide, kind: "info", text: `But nothing happened…` });
    }
    return { faintedDefender: false, faintedAttacker: false };
  }

  // Damaging move.
  const result = calcDamage(attacker, defender, move, rng);
  if (result.missed) {
    pushLog(state, { side: actorSide, kind: "info", text: `${attacker.name}'s attack missed!` });
    return { faintedDefender: false, faintedAttacker: false };
  }
  if (result.eff === 0) {
    pushLog(state, { side: actorSide, kind: "info", text: `It doesn't affect ${defender.name}…` });
    return { faintedDefender: false, faintedAttacker: false };
  }
  defender.currentHp = Math.max(0, defender.currentHp - result.damage);
  if (result.crit) pushLog(state, { side: actorSide, kind: "info", text: `A critical hit!` });
  if (result.eff > 1) pushLog(state, { side: actorSide, kind: "info", text: `It's super effective!` });
  if (result.eff < 1) pushLog(state, { side: actorSide, kind: "info", text: `It's not very effective…` });
  pushLog(state, { side: actorSide, kind: "info", text: `${defender.name} took ${result.damage} damage.` });

  // Secondary effect roll.
  if (move.effect?.status && rng() < move.effect.chance) {
    maybeApplyStatus(state, defender, move.effect.status, actorSide);
  }

  const defenderFainted = defender.currentHp <= 0;
  if (defenderFainted) {
    pushLog(state, { side: (1 - actorSide) as 0 | 1, kind: "faint", text: `${defender.name} fainted!` });
  }
  // Recoil for self-damage moves (Brave Bird / Flare Blitz / Volt Tackle / Double Edge).
  if (["Brave Bird", "Flare Blitz", "Volt Tackle", "Double Edge"].includes(move.name)) {
    const recoil = Math.floor(result.damage / 3);
    attacker.currentHp = Math.max(0, attacker.currentHp - recoil);
    pushLog(state, { side: actorSide, kind: "info", text: `${attacker.name} took ${recoil} recoil damage.` });
  }
  return { faintedDefender: defenderFainted, faintedAttacker: attacker.currentHp <= 0 };
}

function endOfTurn(state: BattleState) {
  for (const side of [0, 1] as const) {
    const m = state.teams[side].mons[state.teams[side].activeIdx];
    if (!m || isFainted(m)) continue;
    const max = calcMaxHp(m);
    if (m.status === "Burn") {
      const dmg = Math.max(1, Math.floor(max / 16));
      m.currentHp = Math.max(0, m.currentHp - dmg);
      pushLog(state, { side, kind: "status", text: `${m.name} is hurt by its burn.` });
      if (m.currentHp <= 0) pushLog(state, { side, kind: "faint", text: `${m.name} fainted!` });
    } else if (m.status === "Poison") {
      const dmg = Math.max(1, Math.floor(max / 8));
      m.currentHp = Math.max(0, m.currentHp - dmg);
      pushLog(state, { side, kind: "status", text: `${m.name} is hurt by poison.` });
      if (m.currentHp <= 0) pushLog(state, { side, kind: "faint", text: `${m.name} fainted!` });
    }
  }
}

function checkWin(state: BattleState) {
  const a = state.teams[0].mons.every(isFainted);
  const b = state.teams[1].mons.every(isFainted);
  if (a && b) { state.finished = true; state.winnerIdx = null; }
  else if (a) { state.finished = true; state.winnerIdx = 1; }
  else if (b) { state.finished = true; state.winnerIdx = 0; }
}

/** Resolve one full turn given both sides' chosen actions. Returns the new state. */
export function resolveTurn(
  state: BattleState,
  action0: Action,
  action1: Action,
  rng: RNG = defaultRng,
): BattleState {
  if (state.finished) return state;

  const ordered = orderActions(state, { side: 0, action: action0 }, { side: 1, action: action1 }, rng);

  // Action 1
  const r1 = executeAction(state, ordered[0].side, ordered[0].action, rng);
  checkWin(state);
  if (state.finished) return state;

  // If the defender (second actor's active mon) fainted, Action 2 is cancelled per spec.
  // The "defender of Action 1" === the mon from the OTHER side — which is the second actor's active mon.
  // (Switches don't cause faints, so this only matters for moves.)
  if (r1.faintedDefender || r1.faintedAttacker) {
    // If second actor's active mon is alive, they still get to act (only cancel if THEIR mon fainted).
    const secondTeam = state.teams[ordered[1].side];
    const secondActive = secondTeam.mons[secondTeam.activeIdx];
    if (isFainted(secondActive)) {
      // skip second action, end of turn
      endOfTurn(state);
      state.turn += 1;
      checkWin(state);
      return state;
    }
  }

  executeAction(state, ordered[1].side, ordered[1].action, rng);
  checkWin(state);
  if (state.finished) return state;

  endOfTurn(state);
  state.turn += 1;
  checkWin(state);
  return state;
}

/** Force-switch when active mon fainted; return new state with chosen mon out. */
export function forceSwitch(state: BattleState, side: 0 | 1, toIdx: number): BattleState {
  const t = state.teams[side];
  if (!t.mons[toIdx] || isFainted(t.mons[toIdx])) return state;
  t.activeIdx = toIdx;
  pushLog(state, { side, kind: "switch", text: `${t.ownerName} sent out ${t.mons[toIdx].name}!` });
  return state;
}

// ----- Helpers ----------------------------------------------------------

/** Initialize battle state from two teams. */
export function makeBattleState(teamA: Team, teamB: Team): BattleState {
  return {
    teams: [teamA, teamB],
    turn: 1,
    log: [{ ts: Date.now(), side: "system", kind: "info", text: `Battle started: ${teamA.ownerName} vs ${teamB.ownerName}!` }],
    finished: false,
    winnerIdx: null,
  };
}

/** Build a BattleMon from app's `Mon` shape (keeping it loose to avoid import cycle). */
export function fromAppMon(m: {
  id: number; name: string; type1: string; type2: string | null; level: number;
  hp: number; atk: number; def: number; spa: number; spd?: number; spe: number;
  ivAtk?: number; ivDef?: number; ivHp?: number; ivSpa?: number; ivSpd?: number; ivSpe?: number;
  evHp?: number; evAtk?: number; evDef?: number; evSpa?: number; evSpd?: number; evSpe?: number;
  nature?: string; moves: string[]; uid?: string; sprite?: string;
}, ownerNature?: string): BattleMon {
  const ivs = {
    hp: m.ivHp ?? 0, atk: m.ivAtk ?? 0, def: m.ivDef ?? 0,
    spa: m.ivSpa ?? 0, spd: m.ivSpd ?? 0, spe: m.ivSpe ?? 0,
  };
  const evs = {
    hp: m.evHp ?? 0, atk: m.evAtk ?? 0, def: m.evDef ?? 0,
    spa: m.evSpa ?? 0, spd: m.evSpd ?? 0, spe: m.evSpe ?? 0,
  };
  const baseStats = {
    hp: m.hp ?? 50, atk: m.atk ?? 50, def: m.def ?? 50,
    spa: m.spa ?? 50, spd: m.spd ?? 50, spe: m.spe ?? 50,
  };
  const types: PType[] = [m.type1 as PType];
  if (m.type2) types.push(m.type2 as PType);
  const nature = m.nature ?? ownerNature ?? "Hardy";
  const bm: BattleMon = {
    uid: m.uid ?? `bm-${m.id}-${Math.random().toString(36).slice(2, 8)}`,
    speciesId: m.id,
    name: m.name,
    level: m.level,
    types,
    baseStats,
    ivs, evs,
    nature,
    moves: m.moves.slice(0, 4),
    currentHp: 0,
    status: null,
    stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    sprite: m.sprite,
  };
  bm.currentHp = calcMaxHp(bm);
  return bm;
}

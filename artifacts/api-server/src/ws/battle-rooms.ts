// In-memory battle room registry + battle session driver.
// One process; rooms live until both clients disconnect or the game ends.

import type { WebSocket } from "ws";
import {
  forceSwitch,
  fromAppMon,
  makeBattleState,
  resolveTurn,
  type Action,
  type BattleMon,
  type BattleState,
  type Team,
} from "../battle/battle-engine";

type ClientMeta = {
  ws: WebSocket;
  playerName: string;
  team: BattleMon[] | null;
  pendingAction: Action | null;
  pendingForceSwitchIdx: number | null;
};

export type Room = {
  code: string;
  hostId: string;
  joinerId: string | null;
  clients: Map<string, ClientMeta>;       // playerId → meta
  state: BattleState | null;
  turnTimerSec: number;
  turnDeadlineMs: number | null;
  turnTimer: NodeJS.Timeout | null;
  awaitingForceSwitch: { side: 0 | 1; pid: string }[];
  createdAt: number;
  // Host's full battle settings — broadcast to the joiner so both sides
  // play with the exact same rules (team size, level cap, legendaries, etc.).
  settings: Record<string, unknown> | null;
};

const ROOMS: Map<string, Room> = new Map();

function makeRoomCode(): string {
  // 6-char alphanumeric, uppercase, no ambiguous chars.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return ROOMS.has(s) ? makeRoomCode() : s;
}

export function send(ws: WebSocket, type: string, data: Record<string, unknown> = {}) {
  if (ws.readyState !== ws.OPEN) return;
  try { ws.send(JSON.stringify({ type, ...data })); } catch { /* ignore */ }
}

function broadcast(room: Room, type: string, data: Record<string, unknown> = {}) {
  for (const c of room.clients.values()) send(c.ws, type, data);
}

function broadcastState(room: Room) {
  if (!room.state) return;
  for (const [pid, c] of room.clients.entries()) {
    const mySide: 0 | 1 = pid === room.hostId ? 0 : 1;
    const fs = room.awaitingForceSwitch.find((f) => f.pid === pid);
    send(c.ws, "state", {
      state: room.state,
      mySide,
      awaitingForceSwitch: !!fs,
      turnDeadlineMs: room.turnDeadlineMs,
      turnTimerSec: room.turnTimerSec,
      oppPicked: anyOpponentPicked(room, pid),
    });
  }
}

function anyOpponentPicked(room: Room, myPid: string): boolean {
  for (const [pid, c] of room.clients.entries()) {
    if (pid === myPid) continue;
    if (c.pendingAction) return true;
  }
  return false;
}

// ---------- Public room ops ----------

export function hostRoom(
  playerId: string,
  playerName: string,
  ws: WebSocket,
  turnTimerSec = 60,
  settings: Record<string, unknown> | null = null,
): string {
  const code = makeRoomCode();
  const room: Room = {
    code,
    hostId: playerId,
    joinerId: null,
    clients: new Map(),
    state: null,
    turnTimerSec,
    turnDeadlineMs: null,
    turnTimer: null,
    awaitingForceSwitch: [],
    createdAt: Date.now(),
    settings,
  };
  room.clients.set(playerId, { ws, playerName, team: null, pendingAction: null, pendingForceSwitchIdx: null });
  ROOMS.set(code, room);
  return code;
}

export function joinRoom(code: string, playerId: string, playerName: string, ws: WebSocket): { ok: true; room: Room } | { ok: false; reason: string } {
  const room = ROOMS.get(code);
  if (!room) return { ok: false, reason: "Room not found" };
  if (room.joinerId) return { ok: false, reason: "Room is full" };
  if (room.hostId === playerId) return { ok: false, reason: "Already in room" };
  room.joinerId = playerId;
  room.clients.set(playerId, { ws, playerName, team: null, pendingAction: null, pendingForceSwitchIdx: null });
  return { ok: true, room };
}

export function getRoom(code: string): Room | undefined {
  return ROOMS.get(code);
}

export function setTeam(room: Room, playerId: string, rawTeam: unknown[]): { ok: boolean; reason?: string } {
  const c = room.clients.get(playerId);
  if (!c) return { ok: false, reason: "Not in room" };
  if (!Array.isArray(rawTeam) || rawTeam.length < 1 || rawTeam.length > 6) return { ok: false, reason: "Invalid team size" };
  try {
    c.team = rawTeam.map((m) => fromAppMon(m as Parameters<typeof fromAppMon>[0]));
  } catch (e) {
    return { ok: false, reason: "Invalid team data" };
  }
  // If both teams now set, start battle.
  const hostMeta = room.clients.get(room.hostId);
  const joinMeta = room.joinerId ? room.clients.get(room.joinerId) : null;
  if (hostMeta?.team && joinMeta?.team) {
    startBattle(room);
  }
  return { ok: true };
}

function startBattle(room: Room) {
  const hostMeta = room.clients.get(room.hostId)!;
  const joinMeta = room.clients.get(room.joinerId!)!;
  const teamA: Team = { ownerId: room.hostId,    ownerName: hostMeta.playerName, mons: hostMeta.team!, activeIdx: 0 };
  const teamB: Team = { ownerId: room.joinerId!, ownerName: joinMeta.playerName, mons: joinMeta.team!, activeIdx: 0 };
  room.state = makeBattleState(teamA, teamB);
  beginTurn(room);
}

function beginTurn(room: Room) {
  if (!room.state || room.state.finished) return;
  // Reset pending actions.
  for (const c of room.clients.values()) {
    c.pendingAction = null;
    c.pendingForceSwitchIdx = null;
  }
  room.awaitingForceSwitch = [];
  room.turnDeadlineMs = Date.now() + room.turnTimerSec * 1000;
  if (room.turnTimer) clearTimeout(room.turnTimer);
  room.turnTimer = setTimeout(() => onTurnTimeout(room), room.turnTimerSec * 1000 + 100);
  broadcast(room, "turn_start", { turn: room.state.turn, deadlineMs: room.turnDeadlineMs });
  broadcastState(room);
}

function onTurnTimeout(room: Room) {
  // Auto-pick first available action for any client without one.
  if (!room.state || room.state.finished) return;
  for (const [pid, c] of room.clients.entries()) {
    if (c.pendingAction) continue;
    const side: 0 | 1 = pid === room.hostId ? 0 : 1;
    const myMon = room.state.teams[side].mons[room.state.teams[side].activeIdx];
    // Default to first move with PP.
    let mvIdx = 0;
    for (let i = 0; i < myMon.moves.length; i++) {
      const name = myMon.moves[i];
      const pp = myMon.pp?.[name] ?? 1;
      if (pp > 0) { mvIdx = i; break; }
    }
    c.pendingAction = { kind: "move", moveIdx: mvIdx };
  }
  tryResolveTurn(room);
}

export function submitAction(room: Room, playerId: string, action: Action): { ok: boolean; reason?: string } {
  if (!room.state || room.state.finished) return { ok: false, reason: "No active battle" };
  const c = room.clients.get(playerId);
  if (!c) return { ok: false, reason: "Not in room" };
  // If this player owes a force-switch, treat any submitted action as a switch.
  const fs = room.awaitingForceSwitch.find((f) => f.pid === playerId);
  if (fs) {
    if (action.kind !== "switch") return { ok: false, reason: "Must switch (your active mon fainted)" };
    c.pendingForceSwitchIdx = action.toIdx;
    tryResolveForceSwitch(room);
    return { ok: true };
  }
  // Validate basic shape.
  if (action.kind !== "move" && action.kind !== "switch") return { ok: false, reason: "Bad action" };
  c.pendingAction = action;
  // Notify opponent that this side is locked in.
  broadcastState(room);
  tryResolveTurn(room);
  return { ok: true };
}

function tryResolveTurn(room: Room) {
  if (!room.state || room.state.finished) return;
  if (room.awaitingForceSwitch.length > 0) return;
  const hostC = room.clients.get(room.hostId);
  const joinC = room.joinerId ? room.clients.get(room.joinerId) : null;
  if (!hostC?.pendingAction || !joinC?.pendingAction) return;
  if (room.turnTimer) { clearTimeout(room.turnTimer); room.turnTimer = null; }

  const a0 = hostC.pendingAction;
  const a1 = joinC.pendingAction;
  hostC.pendingAction = null;
  joinC.pendingAction = null;

  room.state = resolveTurn(room.state, a0, a1, Math.random);
  broadcast(room, "turn_end", { turn: room.state.turn });

  // Check for fainted active mons that need force-switch.
  const fsList: { side: 0 | 1; pid: string }[] = [];
  ([0, 1] as const).forEach((side) => {
    const t = room.state!.teams[side];
    const active = t.mons[t.activeIdx];
    if (active.currentHp <= 0 && t.mons.some((m) => m.currentHp > 0)) {
      const pid = side === 0 ? room.hostId : room.joinerId!;
      fsList.push({ side, pid });
    }
  });
  room.awaitingForceSwitch = fsList;

  if (room.state.finished) {
    broadcast(room, "game_over", { winnerIdx: room.state.winnerIdx });
    broadcastState(room);
    return;
  }

  if (fsList.length > 0) {
    broadcastState(room);
    // Force-switches don't have a hard deadline; safety auto-switch after timer.
    room.turnDeadlineMs = Date.now() + room.turnTimerSec * 1000;
    room.turnTimer = setTimeout(() => onForceSwitchTimeout(room), room.turnTimerSec * 1000 + 100);
    return;
  }

  beginTurn(room);
}

function onForceSwitchTimeout(room: Room) {
  if (!room.state) return;
  for (const fs of room.awaitingForceSwitch) {
    const c = room.clients.get(fs.pid);
    if (!c) continue;
    if (c.pendingForceSwitchIdx == null) {
      const t = room.state.teams[fs.side];
      const aliveIdx = t.mons.findIndex((m, i) => m.currentHp > 0 && i !== t.activeIdx);
      if (aliveIdx >= 0) c.pendingForceSwitchIdx = aliveIdx;
    }
  }
  tryResolveForceSwitch(room);
}

function tryResolveForceSwitch(room: Room) {
  if (!room.state || room.awaitingForceSwitch.length === 0) return;
  const allReady = room.awaitingForceSwitch.every((fs) => {
    const c = room.clients.get(fs.pid);
    return c && c.pendingForceSwitchIdx != null;
  });
  if (!allReady) return;
  if (room.turnTimer) { clearTimeout(room.turnTimer); room.turnTimer = null; }
  for (const fs of room.awaitingForceSwitch) {
    const c = room.clients.get(fs.pid)!;
    room.state = forceSwitch(room.state, fs.side, c.pendingForceSwitchIdx!);
    c.pendingForceSwitchIdx = null;
  }
  room.awaitingForceSwitch = [];
  beginTurn(room);
}

export function handleDisconnect(playerId: string) {
  for (const room of ROOMS.values()) {
    const c = room.clients.get(playerId);
    if (!c) continue;
    room.clients.delete(playerId);
    if (room.state && !room.state.finished) {
      // Other side wins by forfeit.
      const otherSide: 0 | 1 = playerId === room.hostId ? 1 : 0;
      room.state.finished = true;
      room.state.winnerIdx = otherSide;
      room.state.log.push({ ts: Date.now(), side: "system", kind: "result", text: `Opponent disconnected — game over.` });
      broadcast(room, "opponent_left", {});
      broadcast(room, "game_over", { winnerIdx: otherSide });
      broadcastState(room);
    }
    if (room.clients.size === 0) {
      if (room.turnTimer) clearTimeout(room.turnTimer);
      ROOMS.delete(room.code);
    }
  }
}

// Periodic cleanup of stale empty rooms (>1h old, no battle started).
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const r of ROOMS.values()) {
    if (r.createdAt < cutoff && !r.state) {
      if (r.turnTimer) clearTimeout(r.turnTimer);
      ROOMS.delete(r.code);
    }
  }
}, 5 * 60 * 1000).unref?.();

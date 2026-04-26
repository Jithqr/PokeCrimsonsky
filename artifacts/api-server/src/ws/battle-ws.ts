// WebSocket message handlers for /api/ws/battle.

import { WebSocketServer, type WebSocket } from "ws";
import type { Server } from "node:http";
import { logger } from "../lib/logger";
import {
  getRoom, handleDisconnect, hostRoom, joinRoom, send, setTeam, submitAction,
} from "./battle-rooms";

type IncomingMessage =
  | { type: "host"; playerId: string; playerName: string; turnTimerSec?: number }
  | { type: "join"; playerId: string; playerName: string; code: string }
  | { type: "team"; playerId: string; team: unknown[] }
  | { type: "action"; playerId: string; action: { kind: "move"; moveIdx: number } | { kind: "switch"; toIdx: number } }
  | { type: "ping" };

export function attachBattleWs(httpServer: Server) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (req, socket, head) => {
    const url = req.url ?? "";
    // Match either /api/ws/battle or /ws/battle (the ingress proxy may strip /api).
    if (!url.startsWith("/api/ws/battle") && !url.startsWith("/ws/battle")) return;
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws: WebSocket) => {
    let myPlayerId: string | null = null;
    let myRoomCode: string | null = null;

    ws.on("message", (data) => {
      let msg: IncomingMessage;
      try {
        msg = JSON.parse(String(data));
      } catch {
        send(ws, "error", { reason: "Invalid JSON" });
        return;
      }

      switch (msg.type) {
        case "ping":
          send(ws, "pong", { ts: Date.now() });
          return;
        case "host": {
          const code = hostRoom(msg.playerId, msg.playerName, ws, msg.turnTimerSec ?? 60);
          myPlayerId = msg.playerId;
          myRoomCode = code;
          send(ws, "hosted", { code });
          return;
        }
        case "join": {
          const r = joinRoom(msg.code.toUpperCase(), msg.playerId, msg.playerName, ws);
          if (!r.ok) { send(ws, "error", { reason: r.reason }); return; }
          myPlayerId = msg.playerId;
          myRoomCode = r.room.code;
          // Notify both sides.
          send(ws, "joined", { code: r.room.code, hostName: r.room.clients.get(r.room.hostId)?.playerName });
          const hostMeta = r.room.clients.get(r.room.hostId);
          if (hostMeta) send(hostMeta.ws, "opponent_joined", { joinerName: msg.playerName });
          return;
        }
        case "team": {
          if (!myRoomCode) { send(ws, "error", { reason: "Not in a room" }); return; }
          const room = getRoom(myRoomCode);
          if (!room) { send(ws, "error", { reason: "Room missing" }); return; }
          const r = setTeam(room, msg.playerId, msg.team);
          if (!r.ok) { send(ws, "error", { reason: r.reason ?? "Bad team" }); return; }
          send(ws, "team_ok", {});
          return;
        }
        case "action": {
          if (!myRoomCode) { send(ws, "error", { reason: "Not in a room" }); return; }
          const room = getRoom(myRoomCode);
          if (!room) { send(ws, "error", { reason: "Room missing" }); return; }
          const r = submitAction(room, msg.playerId, msg.action);
          if (!r.ok) send(ws, "error", { reason: r.reason ?? "Bad action" });
          return;
        }
        default:
          send(ws, "error", { reason: "Unknown message type" });
      }
    });

    ws.on("close", () => {
      if (myPlayerId) handleDisconnect(myPlayerId);
    });

    ws.on("error", (err) => { logger.warn({ err }, "ws error"); });
  });

  logger.info("Battle WebSocket server attached at /api/ws/battle");
  return wss;
}

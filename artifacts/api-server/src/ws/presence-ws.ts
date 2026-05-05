// Lightweight presence WebSocket server at /api/ws/presence.
// Clients connect and send { type: "connect", playerId: string }.
// The server tracks who is online and broadcasts presence_update events
// to all connected clients whenever someone joins or leaves.

import { WebSocketServer, type WebSocket } from "ws";
import type { Server } from "node:http";
import { logger } from "../lib/logger";

const onlinePlayers = new Map<string, WebSocket>();

export function isOnline(playerId: string): boolean {
  const ws = onlinePlayers.get(playerId);
  return ws !== undefined && ws.readyState === ws.OPEN;
}

export function getOnlineSet(): Set<string> {
  const result = new Set<string>();
  for (const [id, ws] of onlinePlayers) {
    if (ws.readyState === ws.OPEN) result.add(id);
  }
  return result;
}

function sendPresenceUpdate() {
  const online = Array.from(getOnlineSet());
  const msg = JSON.stringify({ type: "presence_update", online });
  for (const ws of onlinePlayers.values()) {
    if (ws.readyState === ws.OPEN) {
      try { ws.send(msg); } catch { /* ignore */ }
    }
  }
}

export function attachPresenceWs(httpServer: Server) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (req, socket, head) => {
    const url = req.url ?? "";
    if (!url.startsWith("/api/ws/presence") && !url.startsWith("/ws/presence")) return;
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws: WebSocket) => {
    let myPlayerId: string | null = null;

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(String(data));
        if (msg.type === "connect" && msg.playerId) {
          myPlayerId = String(msg.playerId).trim().slice(0, 64);
          onlinePlayers.set(myPlayerId, ws);
          sendPresenceUpdate();
        } else if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
        }
      } catch { /* ignore */ }
    });

    ws.on("close", () => {
      if (myPlayerId) {
        onlinePlayers.delete(myPlayerId);
        sendPresenceUpdate();
      }
    });

    ws.on("error", (err) => { logger.warn({ err }, "presence ws error"); });
  });

  logger.info("Presence WebSocket server attached at /api/ws/presence");
  return wss;
}

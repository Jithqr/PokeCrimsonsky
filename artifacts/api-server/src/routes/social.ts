import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, or, desc, ilike, sql } from "drizzle-orm";
import {
  db,
  playerRegistry,
  mailItems,
  moneyTransfers,
  tradeProposals,
  dbRedeemCodes,
  friendships,
} from "@workspace/db";
import { isOnline } from "../ws/presence-ws";

const router: IRouter = Router();

function pid(req: Request): string | null {
  const raw = req.header("x-player-id") ?? req.body?.playerId;
  if (!raw) return null;
  return String(raw).trim().slice(0, 64) || null;
}

/** Normalize a friendship pair so player1Id < player2Id (lexicographic). */
function normPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

// ── Register / heartbeat ──────────────────────────────────────────────────────
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { playerId, name, sprite, hometown } = req.body ?? {};
    if (!playerId || !name) { res.status(400).json({ error: "Missing fields." }); return; }
    await db.insert(playerRegistry).values({
      playerId: String(playerId),
      name: String(name).slice(0, 64),
      sprite: String(sprite || "hilbert").slice(0, 64),
      hometown: String(hometown || "").slice(0, 128),
      lastSeen: new Date(),
    }).onConflictDoUpdate({
      target: playerRegistry.playerId,
      set: { name: String(name).slice(0, 64), sprite: String(sprite || "hilbert").slice(0, 64), hometown: String(hometown || "").slice(0, 128), lastSeen: new Date() },
    });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: "Server error." }); throw err; }
});

// ── Player lookup ─────────────────────────────────────────────────────────────
router.get("/player/:id", async (req: Request, res: Response) => {
  try {
    const rows = await db.select().from(playerRegistry).where(eq(playerRegistry.playerId, req.params.id)).limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Player not found." }); return; }
    const { isBanned, banReason, name, sprite, hometown, lastSeen } = rows[0];
    res.json({ player: { name, sprite, hometown, lastSeen, isBanned, banReason } });
  } catch (err) { res.status(500).json({ error: "Server error." }); throw err; }
});

// ── Player search (by ID or name) ─────────────────────────────────────────────
router.get("/search", async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q ?? "").trim().slice(0, 64);
    if (!q) { res.json({ results: [] }); return; }
    // Try exact player ID first
    const byId = await db.select({
      playerId: playerRegistry.playerId,
      name: playerRegistry.name,
      sprite: playerRegistry.sprite,
      hometown: playerRegistry.hometown,
    }).from(playerRegistry)
      .where(and(eq(playerRegistry.playerId, q), eq(playerRegistry.isBanned, false)))
      .limit(1);
    if (byId.length > 0) {
      res.json({ results: byId.map(r => ({ ...r, isOnline: isOnline(r.playerId) })) });
      return;
    }
    // Otherwise search by name (case-insensitive partial match)
    const byName = await db.select({
      playerId: playerRegistry.playerId,
      name: playerRegistry.name,
      sprite: playerRegistry.sprite,
      hometown: playerRegistry.hometown,
    }).from(playerRegistry)
      .where(and(ilike(playerRegistry.name, `%${q}%`), eq(playerRegistry.isBanned, false)))
      .limit(10);
    res.json({ results: byName.map(r => ({ ...r, isOnline: isOnline(r.playerId) })) });
  } catch (err) { res.status(500).json({ error: "Server error." }); throw err; }
});

// ── Ban check ──────────────────────────────────────────────────────────────────
router.get("/check-ban/:playerId", async (req: Request, res: Response) => {
  try {
    const rows = await db.select({ isBanned: playerRegistry.isBanned, banReason: playerRegistry.banReason })
      .from(playerRegistry).where(eq(playerRegistry.playerId, req.params.playerId)).limit(1);
    if (!rows[0]) { res.json({ banned: false }); return; }
    res.json({ banned: rows[0].isBanned, reason: rows[0].banReason });
  } catch (err) { res.status(500).json({ error: "Server error." }); throw err; }
});

// ── Mails ─────────────────────────────────────────────────────────────────────
router.get("/mail/:playerId", async (req: Request, res: Response) => {
  try {
    const items = await db.select().from(mailItems)
      .where(eq(mailItems.playerId, req.params.playerId))
      .orderBy(desc(mailItems.createdAt))
      .limit(100);
    res.json({ mails: items });
  } catch (err) { res.status(500).json({ error: "Server error." }); throw err; }
});

router.post("/mail/read", async (req: Request, res: Response) => {
  try {
    const { mailId, playerId } = req.body ?? {};
    if (!mailId || !playerId) { res.status(400).json({ error: "Missing fields." }); return; }
    await db.update(mailItems).set({ read: true })
      .where(and(eq(mailItems.id, Number(mailId)), eq(mailItems.playerId, String(playerId))));
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: "Server error." }); throw err; }
});

router.post("/mail/read-all", async (req: Request, res: Response) => {
  try {
    const playerId = pid(req);
    if (!playerId) { res.status(400).json({ error: "Missing player id." }); return; }
    await db.update(mailItems).set({ read: true }).where(eq(mailItems.playerId, playerId));
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: "Server error." }); throw err; }
});

router.delete("/mail/:mailId", async (req: Request, res: Response) => {
  try {
    const playerId = pid(req);
    if (!playerId) { res.status(400).json({ error: "Missing player id." }); return; }
    await db.delete(mailItems)
      .where(and(eq(mailItems.id, Number(req.params.mailId)), eq(mailItems.playerId, playerId)));
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: "Server error." }); throw err; }
});

// ── Friends ───────────────────────────────────────────────────────────────────

// Send a friend request — creates a mail in the target's inbox
router.post("/friend/request", async (req: Request, res: Response) => {
  try {
    const { senderId, senderName, senderSprite, targetId } = req.body ?? {};
    if (!senderId || !targetId) { res.status(400).json({ error: "Missing fields." }); return; }
    if (String(senderId) === String(targetId)) { res.status(400).json({ error: "Cannot add yourself." }); return; }

    // Check target exists
    const target = await db.select({ playerId: playerRegistry.playerId, name: playerRegistry.name })
      .from(playerRegistry).where(eq(playerRegistry.playerId, String(targetId))).limit(1);
    if (!target[0]) { res.status(404).json({ error: "Player not found." }); return; }

    // Check not already friends
    const [p1, p2] = normPair(String(senderId), String(targetId));
    const existing = await db.select({ id: friendships.id }).from(friendships)
      .where(and(eq(friendships.player1Id, p1), eq(friendships.player2Id, p2))).limit(1);
    if (existing.length > 0) { res.status(400).json({ error: "Already friends." }); return; }

    // Check no pending request already sent by this sender to this target
    const pendingCheck = await db.select({ id: mailItems.id }).from(mailItems)
      .where(and(
        eq(mailItems.playerId, String(targetId)),
        sql`data->>'type' = 'friend_request' AND data->>'senderId' = ${String(senderId)}`,
      )).limit(1);
    if (pendingCheck.length > 0) { res.status(400).json({ error: "Request already sent." }); return; }

    await db.insert(mailItems).values({
      playerId: String(targetId),
      fromName: String(senderName || "A trainer").slice(0, 64),
      subject: `Friend Request from ${String(senderName || "A trainer").slice(0, 40)}`,
      body: `${String(senderName || "A trainer")} has sent you a friend request. Do you want to be friends with them?`,
      data: {
        type: "friend_request",
        senderId: String(senderId),
        senderName: String(senderName || "").slice(0, 64),
        senderSprite: String(senderSprite || "hilbert").slice(0, 64),
      },
    });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: "Server error." }); throw err; }
});

// Accept a friend request — creates the friendship + deletes the mail
router.post("/friend/accept", async (req: Request, res: Response) => {
  try {
    const { playerId, senderId, mailId } = req.body ?? {};
    if (!playerId || !senderId || !mailId) { res.status(400).json({ error: "Missing fields." }); return; }

    const [p1, p2] = normPair(String(playerId), String(senderId));

    // Upsert friendship (idempotent)
    await db.insert(friendships).values({ player1Id: p1, player2Id: p2 })
      .onConflictDoNothing();

    // Delete the request mail
    await db.delete(mailItems)
      .where(and(eq(mailItems.id, Number(mailId)), eq(mailItems.playerId, String(playerId))));

    // Notify the sender
    const meRow = await db.select({ name: playerRegistry.name }).from(playerRegistry)
      .where(eq(playerRegistry.playerId, String(playerId))).limit(1);
    const myName = meRow[0]?.name ?? "A trainer";
    await db.insert(mailItems).values({
      playerId: String(senderId),
      fromName: "System",
      subject: `${myName} accepted your friend request!`,
      body: `You and ${myName} are now friends. Check your Friends list to see them online!`,
      data: { type: "friend_accepted", friendId: String(playerId), friendName: myName },
    });

    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: "Server error." }); throw err; }
});

// Decline a friend request — just deletes the mail
router.post("/friend/decline", async (req: Request, res: Response) => {
  try {
    const { playerId, mailId } = req.body ?? {};
    if (!playerId || !mailId) { res.status(400).json({ error: "Missing fields." }); return; }
    await db.delete(mailItems)
      .where(and(eq(mailItems.id, Number(mailId)), eq(mailItems.playerId, String(playerId))));
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: "Server error." }); throw err; }
});

// Get friends list with online status
router.get("/friends/:playerId", async (req: Request, res: Response) => {
  try {
    const me = req.params.playerId;
    const rows = await db.select({
      player1Id: friendships.player1Id,
      player2Id: friendships.player2Id,
      createdAt: friendships.createdAt,
    }).from(friendships)
      .where(or(eq(friendships.player1Id, me), eq(friendships.player2Id, me)));

    const friendIds = rows.map(r => r.player1Id === me ? r.player2Id : r.player1Id);
    const createdAtMap = new Map(rows.map(r => {
      const fid = r.player1Id === me ? r.player2Id : r.player1Id;
      return [fid, r.createdAt];
    }));

    if (friendIds.length === 0) { res.json({ friends: [] }); return; }

    // Look up friend profiles
    const profiles = await db.select({
      playerId: playerRegistry.playerId,
      name: playerRegistry.name,
      sprite: playerRegistry.sprite,
      hometown: playerRegistry.hometown,
    }).from(playerRegistry)
      .where(or(...friendIds.map(id => eq(playerRegistry.playerId, id))));

    const friends = profiles.map(p => ({
      playerId: p.playerId,
      name: p.name,
      sprite: p.sprite,
      hometown: p.hometown,
      createdAt: createdAtMap.get(p.playerId)?.toISOString() ?? "",
      isOnline: isOnline(p.playerId),
    }));

    // Sort: online first, then alphabetically
    friends.sort((a, b) => {
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    res.json({ friends });
  } catch (err) { res.status(500).json({ error: "Server error." }); throw err; }
});

// Remove a friendship
router.post("/friend/remove", async (req: Request, res: Response) => {
  try {
    const { playerId, friendId } = req.body ?? {};
    if (!playerId || !friendId) { res.status(400).json({ error: "Missing fields." }); return; }
    const [p1, p2] = normPair(String(playerId), String(friendId));
    await db.delete(friendships)
      .where(and(eq(friendships.player1Id, p1), eq(friendships.player2Id, p2)));
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: "Server error." }); throw err; }
});

// ── Money Transfers ───────────────────────────────────────────────────────────
router.post("/transfer", async (req: Request, res: Response) => {
  try {
    const { fromId, fromName, toId, amount, note } = req.body ?? {};
    if (!fromId || !toId || !amount) { res.status(400).json({ error: "Missing fields." }); return; }
    const amt = Number(amount);
    if (!Number.isInteger(amt) || amt <= 0 || amt > 10_000_000) { res.status(400).json({ error: "Invalid amount." }); return; }
    if (String(fromId) === String(toId)) { res.status(400).json({ error: "Cannot transfer to yourself." }); return; }
    await db.insert(moneyTransfers).values({
      fromId: String(fromId), fromName: String(fromName || "Unknown").slice(0, 64),
      toId: String(toId), amount: amt,
      note: String(note || "").slice(0, 256),
    });
    await db.insert(mailItems).values({
      playerId: String(toId),
      fromName: String(fromName || "Unknown").slice(0, 64),
      subject: `₽${amt.toLocaleString()} Transfer Incoming`,
      body: `${fromName} sent you ₽${amt.toLocaleString()}. ${note ? `Note: "${note}"` : ""} Open the Transfer screen to claim it.`,
      data: { type: "transfer_notify", fromId: String(fromId), amount: amt },
    });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: "Server error." }); throw err; }
});

router.get("/transfer/pending/:playerId", async (req: Request, res: Response) => {
  try {
    const pending = await db.select().from(moneyTransfers)
      .where(and(eq(moneyTransfers.toId, req.params.playerId), eq(moneyTransfers.claimed, false)))
      .orderBy(desc(moneyTransfers.createdAt)).limit(50);
    const sent = await db.select().from(moneyTransfers)
      .where(eq(moneyTransfers.fromId, req.params.playerId))
      .orderBy(desc(moneyTransfers.createdAt)).limit(20);
    res.json({ pending, sent });
  } catch (err) { res.status(500).json({ error: "Server error." }); throw err; }
});

router.post("/transfer/claim", async (req: Request, res: Response) => {
  try {
    const playerId = pid(req);
    if (!playerId) { res.status(400).json({ error: "Missing player id." }); return; }
    const unclaimed = await db.select().from(moneyTransfers)
      .where(and(eq(moneyTransfers.toId, playerId), eq(moneyTransfers.claimed, false)));
    const total = unclaimed.reduce((s, r) => s + r.amount, 0);
    if (unclaimed.length > 0) {
      await db.update(moneyTransfers).set({ claimed: true, claimedAt: new Date() })
        .where(and(eq(moneyTransfers.toId, playerId), eq(moneyTransfers.claimed, false)));
    }
    res.json({ ok: true, total, count: unclaimed.length });
  } catch (err) { res.status(500).json({ error: "Server error." }); throw err; }
});

// ── Trades ────────────────────────────────────────────────────────────────────
router.post("/trade/propose", async (req: Request, res: Response) => {
  try {
    const { proposerId, proposerName, targetId, monJson, monName, mode, price } = req.body ?? {};
    if (!proposerId || !targetId || !monJson) { res.status(400).json({ error: "Missing fields." }); return; }
    if (String(proposerId) === String(targetId)) { res.status(400).json({ error: "Cannot trade with yourself." }); return; }
    const tradeMode = mode === "sell" ? "sell" : "swap";
    const tradePrice = tradeMode === "sell" ? Math.max(0, Number(price) || 0) : 0;
    const active = await db.select({ id: tradeProposals.id }).from(tradeProposals)
      .where(and(eq(tradeProposals.proposerId, String(proposerId)), eq(tradeProposals.status, "pending"))).limit(1);
    if (active.length > 0) { res.status(400).json({ error: "You already have a pending trade. Cancel it first." }); return; }
    const [row] = await db.insert(tradeProposals).values({
      proposerId: String(proposerId), proposerName: String(proposerName || "Unknown").slice(0, 64),
      targetId: String(targetId), proposerMonJson: monJson,
      proposerMonName: String(monName || "Unknown").slice(0, 64),
      mode: tradeMode, price: tradePrice,
    }).returning();
    const subject = tradeMode === "sell"
      ? `${proposerName} is selling ${monName} for ₽${tradePrice.toLocaleString()}`
      : `Trade Offer: ${monName}`;
    const body = tradeMode === "sell"
      ? `${proposerName} wants to sell their ${monName} for ₽${tradePrice.toLocaleString()}. Open the Trade screen to preview and buy it.`
      : `${proposerName} wants to trade their ${monName} with you. Open the Trade screen to accept or decline.`;
    await db.insert(mailItems).values({
      playerId: String(targetId), fromName: String(proposerName || "Unknown").slice(0, 64),
      subject, body, data: { type: "trade_notify", tradeId: row.id },
    });
    res.json({ ok: true, tradeId: row.id });
  } catch (err) { res.status(500).json({ error: "Server error." }); throw err; }
});

router.get("/trade/pending/:playerId", async (req: Request, res: Response) => {
  try {
    const incoming = await db.select().from(tradeProposals)
      .where(and(eq(tradeProposals.targetId, req.params.playerId), eq(tradeProposals.status, "pending")))
      .orderBy(desc(tradeProposals.createdAt)).limit(20);
    const outgoing = await db.select().from(tradeProposals)
      .where(and(eq(tradeProposals.proposerId, req.params.playerId), eq(tradeProposals.status, "pending")))
      .orderBy(desc(tradeProposals.createdAt)).limit(10);
    const completed = await db.select().from(tradeProposals)
      .where(and(eq(tradeProposals.proposerId, req.params.playerId), eq(tradeProposals.status, "accepted")))
      .orderBy(desc(tradeProposals.createdAt)).limit(10);
    res.json({ incoming, outgoing, completed });
  } catch (err) { res.status(500).json({ error: "Server error." }); throw err; }
});

router.post("/trade/accept", async (req: Request, res: Response) => {
  try {
    const { tradeId, targetId, targetMonJson, targetMonName } = req.body ?? {};
    if (!tradeId || !targetId) { res.status(400).json({ error: "Missing fields." }); return; }
    const rows = await db.select().from(tradeProposals)
      .where(and(eq(tradeProposals.id, Number(tradeId)), eq(tradeProposals.targetId, String(targetId)), eq(tradeProposals.status, "pending"))).limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Trade not found or already resolved." }); return; }
    const trade = rows[0];

    if (trade.mode === "sell") {
      await db.update(tradeProposals).set({
        status: "accepted", resolvedAt: new Date(),
      }).where(eq(tradeProposals.id, Number(tradeId)));
      await db.insert(mailItems).values({
        playerId: trade.proposerId,
        fromName: "System",
        subject: `Sale Complete! ₽${trade.price.toLocaleString()} received`,
        body: `Your ${trade.proposerMonName} was sold for ₽${trade.price.toLocaleString()}!`,
        data: { type: "sell_reward", amount: trade.price, tradeId: Number(tradeId) },
      });
      res.json({ ok: true, proposerMon: trade.proposerMonJson, mode: "sell", price: trade.price });
    } else {
      if (!targetMonJson) { res.status(400).json({ error: "Missing target Pokémon for swap trade." }); return; }
      await db.update(tradeProposals).set({
        status: "accepted", targetMonJson, targetMonName: String(targetMonName || "Unknown").slice(0, 64), resolvedAt: new Date(),
      }).where(eq(tradeProposals.id, Number(tradeId)));
      await db.insert(mailItems).values({
        playerId: trade.proposerId,
        fromName: String(targetId).slice(0, 64),
        subject: `Trade Complete! You received ${targetMonName}`,
        body: `Your trade was accepted! You received ${targetMonName} in exchange for your ${trade.proposerMonName}. Open the Trade screen to claim your new Pokémon.`,
        data: { type: "trade_reward", mon: targetMonJson, tradeId: Number(tradeId) },
      });
      res.json({ ok: true, proposerMon: trade.proposerMonJson, mode: "swap" });
    }
  } catch (err) { res.status(500).json({ error: "Server error." }); throw err; }
});

router.post("/trade/decline", async (req: Request, res: Response) => {
  try {
    const { tradeId, targetId } = req.body ?? {};
    if (!tradeId || !targetId) { res.status(400).json({ error: "Missing fields." }); return; }
    const rows = await db.select().from(tradeProposals)
      .where(and(eq(tradeProposals.id, Number(tradeId)), eq(tradeProposals.targetId, String(targetId)), eq(tradeProposals.status, "pending"))).limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Trade not found." }); return; }
    const trade = rows[0];
    await db.update(tradeProposals).set({ status: "declined", resolvedAt: new Date() })
      .where(eq(tradeProposals.id, Number(tradeId)));
    await db.insert(mailItems).values({
      playerId: trade.proposerId,
      fromName: "System",
      subject: trade.mode === "sell" ? `Sale Declined` : `Trade Declined`,
      body: trade.mode === "sell"
        ? `Your sale offer for ${trade.proposerMonName} was declined. Your Pokémon has been returned.`
        : `Your trade offer for ${trade.proposerMonName} was declined. Your Pokémon has been returned to you.`,
      data: { type: "trade_return", mon: trade.proposerMonJson, tradeId: Number(tradeId) },
    });
    res.json({ ok: true, proposerMon: trade.proposerMonJson });
  } catch (err) { res.status(500).json({ error: "Server error." }); throw err; }
});

router.post("/trade/cancel", async (req: Request, res: Response) => {
  try {
    const { tradeId, proposerId } = req.body ?? {};
    if (!tradeId || !proposerId) { res.status(400).json({ error: "Missing fields." }); return; }
    const rows = await db.select().from(tradeProposals)
      .where(and(eq(tradeProposals.id, Number(tradeId)), eq(tradeProposals.proposerId, String(proposerId)), eq(tradeProposals.status, "pending"))).limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Trade not found." }); return; }
    await db.update(tradeProposals).set({ status: "cancelled", resolvedAt: new Date() })
      .where(eq(tradeProposals.id, Number(tradeId)));
    res.json({ ok: true, proposerMon: rows[0].proposerMonJson });
  } catch (err) { res.status(500).json({ error: "Server error." }); throw err; }
});

// ── Redeem Codes ──────────────────────────────────────────────────────────────
router.post("/redeem", async (req: Request, res: Response) => {
  try {
    const { code, playerId, playerName } = req.body ?? {};
    if (!code || !playerId) { res.status(400).json({ error: "Missing fields." }); return; }
    const rows = await db.select().from(dbRedeemCodes).where(eq(dbRedeemCodes.code, String(code).trim().toUpperCase())).limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Code not found." }); return; }
    const row = rows[0];
    const usedBy: string[] = Array.isArray(row.usedByJson) ? row.usedByJson as string[] : [];
    if (usedBy.includes(String(playerId))) { res.status(400).json({ error: "You already redeemed this code." }); return; }
    if (row.useCount >= row.maxUses) { res.status(400).json({ error: "This code has expired." }); return; }
    const newUsedBy = [...usedBy, String(playerId)];
    await db.update(dbRedeemCodes).set({ useCount: row.useCount + 1, usedByJson: newUsedBy })
      .where(eq(dbRedeemCodes.id, row.id));
    if (row.money > 0 || row.item) {
      let body = `You redeemed code ${code}!`;
      if (row.money > 0) body += ` You received ₽${row.money.toLocaleString()}.`;
      if (row.item && row.itemQty > 0) body += ` You received ×${row.itemQty} ${row.item}.`;
      await db.insert(mailItems).values({
        playerId: String(playerId), fromName: "System",
        subject: `Code Redeemed: ${code}`,
        body,
        data: { type: "redeem_reward", money: row.money, item: row.item, qty: row.itemQty },
      });
    }
    res.json({ ok: true, reward: { money: row.money, item: row.item, qty: row.itemQty } });
  } catch (err) { res.status(500).json({ error: "Server error." }); throw err; }
});

export default router;

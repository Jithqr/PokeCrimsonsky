import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import {
  db,
  playerRegistry,
  mailItems,
  moneyTransfers,
  tradeProposals,
  dbRedeemCodes,
} from "@workspace/db";

const router: IRouter = Router();

const ADMIN_KEY = process.env.ADMIN_KEY || "CRIMSON_ADMIN_2024";

function checkAdmin(req: Request, res: Response): boolean {
  const key = req.header("x-admin-key") ?? req.body?.adminKey;
  if (!key || String(key) !== ADMIN_KEY) {
    res.status(403).json({ error: "Invalid admin key." });
    return false;
  }
  return true;
}

// ── Verify admin key ──────────────────────────────────────────────────────────
router.post("/verify", async (req: Request, res: Response) => {
  const key = req.body?.adminKey;
  if (!key || String(key) !== ADMIN_KEY) {
    res.status(403).json({ ok: false });
    return;
  }
  res.json({ ok: true });
});

// ── Spectate player ───────────────────────────────────────────────────────────
router.get("/player/:id", async (req: Request, res: Response) => {
  if (!checkAdmin(req, res)) return;
  try {
    const rows = await db.select().from(playerRegistry)
      .where(eq(playerRegistry.playerId, req.params.id)).limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Player not found." }); return; }
    const mails = await db.select().from(mailItems)
      .where(eq(mailItems.playerId, req.params.id)).limit(20);
    const transfers = await db.select().from(moneyTransfers)
      .where(eq(moneyTransfers.fromId, req.params.id)).limit(20);
    const trades = await db.select().from(tradeProposals)
      .where(eq(tradeProposals.proposerId, req.params.id)).limit(20);
    res.json({ player: rows[0], mails, transfers, trades });
  } catch (err) { res.status(500).json({ error: "Server error." }); throw err; }
});

// ── Ban player ────────────────────────────────────────────────────────────────
router.post("/ban", async (req: Request, res: Response) => {
  if (!checkAdmin(req, res)) return;
  try {
    const { playerId, reason } = req.body ?? {};
    if (!playerId) { res.status(400).json({ error: "Missing playerId." }); return; }
    await db.update(playerRegistry).set({ isBanned: true, banReason: String(reason || "Banned by admin.").slice(0, 256) })
      .where(eq(playerRegistry.playerId, String(playerId)));
    await db.insert(mailItems).values({
      playerId: String(playerId), fromName: "System",
      subject: "Account Action",
      body: `Your account has been flagged. Reason: ${reason || "Policy violation."}`,
      data: { type: "ban_notice" },
    });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: "Server error." }); throw err; }
});

// ── Unban player ──────────────────────────────────────────────────────────────
router.post("/unban", async (req: Request, res: Response) => {
  if (!checkAdmin(req, res)) return;
  try {
    const { playerId } = req.body ?? {};
    if (!playerId) { res.status(400).json({ error: "Missing playerId." }); return; }
    await db.update(playerRegistry).set({ isBanned: false, banReason: null })
      .where(eq(playerRegistry.playerId, String(playerId)));
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: "Server error." }); throw err; }
});

// ── Announce (mail to one player) ─────────────────────────────────────────────
router.post("/announce", async (req: Request, res: Response) => {
  if (!checkAdmin(req, res)) return;
  try {
    const { subject, body, targetId } = req.body ?? {};
    if (!subject || !body) { res.status(400).json({ error: "Missing subject or body." }); return; }
    if (targetId) {
      await db.insert(mailItems).values({
        playerId: String(targetId), fromName: "Admin",
        subject: String(subject).slice(0, 128),
        body: String(body).slice(0, 2048),
        data: { type: "announcement" },
      });
      res.json({ ok: true, count: 1 });
    } else {
      const players = await db.select({ playerId: playerRegistry.playerId }).from(playerRegistry).limit(500);
      if (players.length === 0) { res.json({ ok: true, count: 0 }); return; }
      await db.insert(mailItems).values(players.map((p) => ({
        playerId: p.playerId, fromName: "Admin",
        subject: String(subject).slice(0, 128),
        body: String(body).slice(0, 2048),
        data: { type: "announcement" },
      })));
      res.json({ ok: true, count: players.length });
    }
  } catch (err) { res.status(500).json({ error: "Server error." }); throw err; }
});

// ── Drop (give money/items to all or one) ────────────────────────────────────
router.post("/drop", async (req: Request, res: Response) => {
  if (!checkAdmin(req, res)) return;
  try {
    const { money, item, qty, message, targetId } = req.body ?? {};
    const amt = Number(money) || 0;
    const itemQty = Number(qty) || 0;
    const itemName = String(item || "");
    const msg = String(message || "");
    let subject = "Special Drop!";
    let body = msg || "The admin has gifted you something!";
    if (amt > 0) body += ` +₽${amt.toLocaleString()}`;
    if (itemName && itemQty > 0) body += ` +×${itemQty} ${itemName}`;
    const data = { type: "drop", money: amt, item: itemName, qty: itemQty };
    if (targetId) {
      await db.insert(mailItems).values({ playerId: String(targetId), fromName: "Admin", subject, body, data });
      res.json({ ok: true, count: 1 });
    } else {
      const players = await db.select({ playerId: playerRegistry.playerId }).from(playerRegistry).limit(500);
      if (players.length === 0) { res.json({ ok: true, count: 0 }); return; }
      await db.insert(mailItems).values(players.map((p) => ({ playerId: p.playerId, fromName: "Admin", subject, body, data })));
      res.json({ ok: true, count: players.length });
    }
  } catch (err) { res.status(500).json({ error: "Server error." }); throw err; }
});

// ── Create redeem code ────────────────────────────────────────────────────────
router.post("/redeem/create", async (req: Request, res: Response) => {
  if (!checkAdmin(req, res)) return;
  try {
    const { code, money, item, qty, maxUses } = req.body ?? {};
    if (!code) { res.status(400).json({ error: "Missing code." }); return; }
    const clean = String(code).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 32);
    if (!clean) { res.status(400).json({ error: "Invalid code format." }); return; }
    await db.insert(dbRedeemCodes).values({
      code: clean,
      money: Number(money) || 0,
      item: String(item || "").slice(0, 64),
      itemQty: Number(qty) || 0,
      maxUses: Math.max(1, Number(maxUses) || 1),
    });
    res.json({ ok: true, code: clean });
  } catch (err: any) {
    if (err?.code === "23505") { res.status(400).json({ error: "Code already exists." }); return; }
    res.status(500).json({ error: "Server error." }); throw err;
  }
});

// ── List redeem codes ─────────────────────────────────────────────────────────
router.get("/redeem/list", async (req: Request, res: Response) => {
  if (!checkAdmin(req, res)) return;
  try {
    const codes = await db.select({
      id: dbRedeemCodes.id, code: dbRedeemCodes.code,
      money: dbRedeemCodes.money, item: dbRedeemCodes.item, itemQty: dbRedeemCodes.itemQty,
      maxUses: dbRedeemCodes.maxUses, useCount: dbRedeemCodes.useCount,
      createdAt: dbRedeemCodes.createdAt,
    }).from(dbRedeemCodes).limit(200);
    res.json({ codes });
  } catch (err) { res.status(500).json({ error: "Server error." }); throw err; }
});

// ── Delete redeem code ────────────────────────────────────────────────────────
router.delete("/redeem/:code", async (req: Request, res: Response) => {
  if (!checkAdmin(req, res)) return;
  try {
    await db.delete(dbRedeemCodes).where(eq(dbRedeemCodes.code, req.params.code.toUpperCase()));
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: "Server error." }); throw err; }
});

export default router;

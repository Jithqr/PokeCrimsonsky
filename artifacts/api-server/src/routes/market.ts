import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, isNull, sql } from "drizzle-orm";
import {
  db,
  globalMarketItems,
  pendingEarnings,
  userListings,
} from "@workspace/db";
import { SPECIES, type SpeciesEntry } from "../data/species";

const router: IRouter = Router();

const NATURES = [
  "Hardy", "Lonely", "Brave", "Adamant", "Naughty",
  "Bold", "Docile", "Relaxed", "Impish", "Lax",
  "Timid", "Hasty", "Serious", "Jolly", "Naive",
  "Modest", "Mild", "Quiet", "Bashful", "Rash",
  "Calm", "Gentle", "Sassy", "Careful", "Quirky",
];

const MARKET_TAX_RATE = 0.05;
const DAILY_ITEM_COUNT = 50;
const MIN_LEVEL = 5;
const MAX_LEVEL = 60;

function todayDateString(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function rollIv(): number {
  return Math.floor(Math.random() * 32);
}

function randomLevel(): number {
  return MIN_LEVEL + Math.floor(Math.random() * (MAX_LEVEL - MIN_LEVEL + 1));
}

function randomNature(): string {
  return NATURES[Math.floor(Math.random() * NATURES.length)];
}

function pickSpecies(): SpeciesEntry {
  return SPECIES[Math.floor(Math.random() * SPECIES.length)];
}

/**
 * Pricing formula
 *   bst       - base stat total (sum of 6 base stats)
 *   levelMul  - 0.6 (lvl 5) → 1.6 (lvl 60), scales with level
 *   ivQuality - 0.5 (avg IV 0) → 1.5 (avg IV 31)
 *   tier      - bonus multiplier for high-BST species (~legendary territory)
 * Final price is rounded to the nearest 10.
 */
function calculatePrice(
  species: SpeciesEntry,
  level: number,
  ivs: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number },
): number {
  const bst = species.hp + species.atk + species.def + species.spa + species.spd + species.spe;
  const ivAvg = (ivs.hp + ivs.atk + ivs.def + ivs.spa + ivs.spd + ivs.spe) / 6;
  const ivQuality = 0.5 + (ivAvg / 31);
  const levelMul = 0.5 + (level / 60);
  const tier = bst >= 600 ? 200 : bst >= 500 ? 60 : 30;
  const raw = bst * levelMul * ivQuality * tier;
  return Math.max(50, Math.round(raw / 10) * 10);
}

function generateMarketRow(date: string) {
  const sp = pickSpecies();
  const level = randomLevel();
  const ivs = {
    hp: rollIv(), atk: rollIv(), def: rollIv(),
    spa: rollIv(), spd: rollIv(), spe: rollIv(),
  };
  const price = calculatePrice(sp, level, ivs);
  return {
    pokemonId: sp.id,
    pokemonName: sp.name,
    pokemonSprite: sp.sprite,
    type1: sp.type1,
    type2: sp.type2,
    level,
    nature: randomNature(),
    ivHp: ivs.hp, ivAtk: ivs.atk, ivDef: ivs.def,
    ivSpa: ivs.spa, ivSpd: ivs.spd, ivSpe: ivs.spe,
    price,
    isSold: false,
    soldToPlayerId: null,
    soldAt: null,
    dateGenerated: date,
  };
}

function getPlayerId(req: Request): string | null {
  const raw = req.header("x-player-id");
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 64);
}

let refreshLock: Promise<void> | null = null;

async function ensureFreshGlobalMarket(): Promise<void> {
  const today = todayDateString();
  const existing = await db
    .select({ dateGenerated: globalMarketItems.dateGenerated })
    .from(globalMarketItems)
    .limit(1);

  const currentDate = existing[0]?.dateGenerated;
  if (currentDate === today) return;

  if (refreshLock) {
    await refreshLock;
    return;
  }

  refreshLock = (async () => {
    try {
      const recheck = await db
        .select({ dateGenerated: globalMarketItems.dateGenerated })
        .from(globalMarketItems)
        .limit(1);
      if (recheck[0]?.dateGenerated === today) return;

      await db.delete(globalMarketItems);
      const rows = Array.from({ length: DAILY_ITEM_COUNT }, () =>
        generateMarketRow(today),
      );
      await db.insert(globalMarketItems).values(rows);
    } finally {
      refreshLock = null;
    }
  })();

  await refreshLock;
}

router.get("/global", async (_req: Request, res: Response) => {
  try {
    await ensureFreshGlobalMarket();
    const items = await db
      .select()
      .from(globalMarketItems)
      .orderBy(globalMarketItems.id);
    res.json({ items, dateGenerated: items[0]?.dateGenerated ?? todayDateString() });
  } catch (err) {
    res.status(500).json({ error: "Failed to load global market." });
    throw err;
  }
});

router.post("/global/buy", async (req: Request, res: Response) => {
  try {
    const playerId = getPlayerId(req);
    if (!playerId) {
      res.status(400).json({ error: "Missing trainer identity (x-player-id header)." });
      return;
    }
    const itemIdRaw = req.body?.itemId;
    const itemId = Number(itemIdRaw);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      res.status(400).json({ error: "Invalid itemId." });
      return;
    }

    await ensureFreshGlobalMarket();

    // Atomic claim: only succeeds if the row is still unsold.
    const claimed = await db
      .update(globalMarketItems)
      .set({ isSold: true, soldToPlayerId: playerId, soldAt: new Date() })
      .where(and(eq(globalMarketItems.id, itemId), eq(globalMarketItems.isSold, false)))
      .returning();

    if (claimed.length === 0) {
      const existing = await db
        .select()
        .from(globalMarketItems)
        .where(eq(globalMarketItems.id, itemId))
        .limit(1);
      if (existing.length === 0) {
        res.status(404).json({ error: "That listing no longer exists." });
        return;
      }
      res.status(409).json({
        error: "Too slow! Another trainer already bought this Pokémon.",
        item: existing[0],
      });
      return;
    }

    res.json({ ok: true, item: claimed[0] });
  } catch (err) {
    res.status(500).json({ error: "Purchase failed." });
    throw err;
  }
});

router.get("/listings", async (req: Request, res: Response) => {
  try {
    const playerId = getPlayerId(req);
    const rows = await db
      .select()
      .from(userListings)
      .orderBy(sql`${userListings.listedAt} desc`)
      .limit(200);
    res.json({
      listings: rows,
      mine: playerId ? rows.filter((r) => r.sellerId === playerId).map((r) => r.id) : [],
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load user listings." });
    throw err;
  }
});

router.post("/listings", async (req: Request, res: Response) => {
  try {
    const playerId = getPlayerId(req);
    if (!playerId) {
      res.status(400).json({ error: "Missing trainer identity (x-player-id header)." });
      return;
    }
    const { sellerName, mon, price } = req.body ?? {};
    if (!mon || typeof mon !== "object") {
      res.status(400).json({ error: "Missing mon payload." });
      return;
    }
    const priceNum = Number(price);
    if (!Number.isInteger(priceNum) || priceNum < 10 || priceNum > 10_000_000) {
      res.status(400).json({ error: "Price must be between ₽10 and ₽10,000,000." });
      return;
    }
    const monUid = String(mon.uid ?? "").trim();
    if (!monUid) {
      res.status(400).json({ error: "Mon must have a uid." });
      return;
    }
    // Prevent duplicate listings of the same mon.
    const existing = await db
      .select({ id: userListings.id })
      .from(userListings)
      .where(eq(userListings.monUid, monUid))
      .limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "This Pokémon is already listed." });
      return;
    }

    const inserted = await db
      .insert(userListings)
      .values({
        sellerId: playerId,
        sellerName: String(sellerName ?? "Trainer").slice(0, 32),
        monUid,
        monJson: mon,
        pokemonId: Number(mon.id) || 0,
        pokemonName: String(mon.nickname ?? mon.name ?? "Pokémon").slice(0, 32),
        pokemonSprite: String(mon.sprite ?? ""),
        level: Number(mon.level) || 1,
        nature: String(mon.nature ?? "Hardy"),
        price: priceNum,
      })
      .returning();

    res.json({ ok: true, listing: inserted[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to create listing." });
    throw err;
  }
});

router.post("/listings/:id/buy", async (req: Request, res: Response) => {
  try {
    const playerId = getPlayerId(req);
    if (!playerId) {
      res.status(400).json({ error: "Missing trainer identity (x-player-id header)." });
      return;
    }
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid listing id." });
      return;
    }

    const result = await db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(userListings)
        .where(eq(userListings.id, id))
        .limit(1);
      const listing = rows[0];
      if (!listing) return { kind: "missing" as const };
      if (listing.sellerId === playerId) return { kind: "self" as const };

      const deleted = await tx
        .delete(userListings)
        .where(eq(userListings.id, id))
        .returning();
      if (deleted.length === 0) return { kind: "missing" as const };

      const tax = Math.floor(deleted[0].price * MARKET_TAX_RATE);
      const sellerTake = deleted[0].price - tax;
      await tx.insert(pendingEarnings).values({
        playerId: deleted[0].sellerId,
        amount: sellerTake,
        reason: `Sold ${deleted[0].pokemonName} (Lv.${deleted[0].level}) on the market`,
      });

      return { kind: "ok" as const, listing: deleted[0], tax, sellerTake };
    });

    if (result.kind === "missing") {
      res.status(409).json({ error: "Too slow! That listing is no longer available." });
      return;
    }
    if (result.kind === "self") {
      res.status(400).json({ error: "You can't buy your own listing." });
      return;
    }

    res.json({
      ok: true,
      listing: result.listing,
      mon: result.listing.monJson,
      tax: result.tax,
      sellerTake: result.sellerTake,
    });
  } catch (err) {
    res.status(500).json({ error: "Purchase failed." });
    throw err;
  }
});

router.post("/listings/:id/cancel", async (req: Request, res: Response) => {
  try {
    const playerId = getPlayerId(req);
    if (!playerId) {
      res.status(400).json({ error: "Missing trainer identity (x-player-id header)." });
      return;
    }
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid listing id." });
      return;
    }

    const deleted = await db
      .delete(userListings)
      .where(and(eq(userListings.id, id), eq(userListings.sellerId, playerId)))
      .returning();
    if (deleted.length === 0) {
      res.status(404).json({ error: "Listing not found or not yours." });
      return;
    }

    res.json({ ok: true, listing: deleted[0], mon: deleted[0].monJson });
  } catch (err) {
    res.status(500).json({ error: "Cancel failed." });
    throw err;
  }
});

router.get("/earnings", async (req: Request, res: Response) => {
  try {
    const playerId = getPlayerId(req);
    if (!playerId) {
      res.status(400).json({ error: "Missing trainer identity (x-player-id header)." });
      return;
    }
    const rows = await db
      .select()
      .from(pendingEarnings)
      .where(and(eq(pendingEarnings.playerId, playerId), isNull(pendingEarnings.claimedAt)));
    const total = rows.reduce((sum, r) => sum + r.amount, 0);
    res.json({ earnings: rows, total });
  } catch (err) {
    res.status(500).json({ error: "Failed to load earnings." });
    throw err;
  }
});

router.post("/earnings/claim", async (req: Request, res: Response) => {
  try {
    const playerId = getPlayerId(req);
    if (!playerId) {
      res.status(400).json({ error: "Missing trainer identity (x-player-id header)." });
      return;
    }
    const claimed = await db
      .update(pendingEarnings)
      .set({ claimedAt: new Date() })
      .where(and(eq(pendingEarnings.playerId, playerId), isNull(pendingEarnings.claimedAt)))
      .returning();
    const total = claimed.reduce((sum, r) => sum + r.amount, 0);
    res.json({ ok: true, claimed, total });
  } catch (err) {
    res.status(500).json({ error: "Failed to claim earnings." });
    throw err;
  }
});

export default router;

import {
  pgTable, serial, integer, text, boolean, jsonb, timestamp, index, uniqueIndex,
} from "drizzle-orm/pg-core";

export const playerRegistry = pgTable("player_registry", {
  id: serial("id").primaryKey(),
  playerId: text("player_id").notNull().unique(),
  name: text("name").notNull(),
  sprite: text("sprite").notNull().default("hilbert"),
  hometown: text("hometown").notNull().default(""),
  lastSeen: timestamp("last_seen").notNull().defaultNow(),
  isBanned: boolean("is_banned").notNull().default(false),
  banReason: text("ban_reason"),
}, (t) => ({
  playerIdIdx: index("pr_player_id_idx").on(t.playerId),
}));

export type PlayerRegistry = typeof playerRegistry.$inferSelect;

export const mailItems = pgTable("mail_items", {
  id: serial("id").primaryKey(),
  playerId: text("player_id").notNull(),
  fromName: text("from_name").notNull().default("System"),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  data: jsonb("data"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  playerIdx: index("mi_player_id_idx").on(t.playerId),
}));

export type MailItem = typeof mailItems.$inferSelect;

export const moneyTransfers = pgTable("money_transfers", {
  id: serial("id").primaryKey(),
  fromId: text("from_id").notNull(),
  fromName: text("from_name").notNull(),
  toId: text("to_id").notNull(),
  amount: integer("amount").notNull(),
  note: text("note").notNull().default(""),
  claimed: boolean("claimed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  claimedAt: timestamp("claimed_at"),
}, (t) => ({
  toIdIdx: index("mt_to_id_idx").on(t.toId),
  fromIdIdx: index("mt_from_id_idx").on(t.fromId),
}));

export type MoneyTransfer = typeof moneyTransfers.$inferSelect;

export const tradeProposals = pgTable("trade_proposals", {
  id: serial("id").primaryKey(),
  proposerId: text("proposer_id").notNull(),
  proposerName: text("proposer_name").notNull(),
  targetId: text("target_id").notNull(),
  proposerMonJson: jsonb("proposer_mon_json").notNull(),
  proposerMonName: text("proposer_mon_name").notNull(),
  targetMonJson: jsonb("target_mon_json"),
  targetMonName: text("target_mon_name"),
  mode: text("mode").notNull().default("swap"),
  price: integer("price").notNull().default(0),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
}, (t) => ({
  proposerIdx: index("tp_proposer_id_idx").on(t.proposerId),
  targetIdx: index("tp_target_id_idx").on(t.targetId),
}));

export type TradeProposal = typeof tradeProposals.$inferSelect;

export const dbRedeemCodes = pgTable("db_redeem_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  money: integer("money").notNull().default(0),
  item: text("item").notNull().default(""),
  itemQty: integer("item_qty").notNull().default(0),
  maxUses: integer("max_uses").notNull().default(1),
  useCount: integer("use_count").notNull().default(0),
  usedByJson: jsonb("used_by_json").notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  codeIdx: index("rc_code_idx").on(t.code),
}));

export type DbRedeemCode = typeof dbRedeemCodes.$inferSelect;

/**
 * Friendships — one row per accepted mutual friendship.
 * player1Id is always lexicographically < player2Id to ensure uniqueness.
 */
export const friendships = pgTable("friendships", {
  id: serial("id").primaryKey(),
  player1Id: text("player1_id").notNull(),
  player2Id: text("player2_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  pairIdx: uniqueIndex("fs_pair_idx").on(t.player1Id, t.player2Id),
  p1Idx: index("fs_p1_idx").on(t.player1Id),
  p2Idx: index("fs_p2_idx").on(t.player2Id),
}));

export type Friendship = typeof friendships.$inferSelect;

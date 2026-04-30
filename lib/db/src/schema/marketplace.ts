import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  date,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

/**
 * GlobalMarketItem
 * One row per Pokémon currently on sale in the daily Global Listings shop.
 * The whole table is regenerated lazily once the date_generated falls behind today.
 */
export const globalMarketItems = pgTable(
  "global_market_items",
  {
    id: serial("id").primaryKey(),
    pokemonId: integer("pokemon_id").notNull(),
    pokemonName: text("pokemon_name").notNull(),
    pokemonSprite: text("pokemon_sprite").notNull(),
    type1: text("type_1").notNull(),
    type2: text("type_2"),
    level: integer("level").notNull(),
    nature: text("nature").notNull(),
    ivHp: integer("iv_hp").notNull(),
    ivAtk: integer("iv_atk").notNull(),
    ivDef: integer("iv_def").notNull(),
    ivSpa: integer("iv_spa").notNull(),
    ivSpd: integer("iv_spd").notNull(),
    ivSpe: integer("iv_spe").notNull(),
    price: integer("price").notNull(),
    isSold: boolean("is_sold").notNull().default(false),
    soldToPlayerId: text("sold_to_player_id"),
    soldAt: timestamp("sold_at"),
    dateGenerated: date("date_generated").notNull(),
  },
  (t) => ({
    dateGeneratedIdx: index("gmi_date_generated_idx").on(t.dateGenerated),
    isSoldIdx: index("gmi_is_sold_idx").on(t.isSold),
  }),
);

export type GlobalMarketItem = typeof globalMarketItems.$inferSelect;

/**
 * UserListing
 * One row per Pokémon listed by a player on the User Listings tab.
 * The full Mon JSON is stored on the server so the buyer can claim it from any device.
 */
export const userListings = pgTable(
  "user_listings",
  {
    id: serial("id").primaryKey(),
    sellerId: text("seller_id").notNull(),
    sellerName: text("seller_name").notNull(),
    monUid: text("mon_uid").notNull(),
    monJson: jsonb("mon_json").notNull(),
    pokemonId: integer("pokemon_id").notNull(),
    pokemonName: text("pokemon_name").notNull(),
    pokemonSprite: text("pokemon_sprite").notNull(),
    level: integer("level").notNull(),
    nature: text("nature").notNull(),
    price: integer("price").notNull(),
    listedAt: timestamp("listed_at").notNull().defaultNow(),
  },
  (t) => ({
    sellerIdx: index("ul_seller_idx").on(t.sellerId),
  }),
);

export type UserListing = typeof userListings.$inferSelect;

/**
 * PendingEarnings
 * Inbox of money owed to sellers when a buyer purchases their listing while
 * the seller is offline. The seller claims these the next time they open the
 * marketplace, which credits the funds to their local wallet.
 */
export const pendingEarnings = pgTable(
  "pending_earnings",
  {
    id: serial("id").primaryKey(),
    playerId: text("player_id").notNull(),
    amount: integer("amount").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    claimedAt: timestamp("claimed_at"),
  },
  (t) => ({
    playerIdx: index("pe_player_idx").on(t.playerId),
  }),
);

export type PendingEarning = typeof pendingEarnings.$inferSelect;

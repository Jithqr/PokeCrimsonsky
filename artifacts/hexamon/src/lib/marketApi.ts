// Thin client wrapper around the marketplace REST endpoints.
// All requests carry the local player id via the `x-player-id` header so the
// server can track ownership without needing a real auth system.

export type GlobalMarketItem = {
  id: number;
  pokemonId: number;
  pokemonName: string;
  pokemonSprite: string;
  type1: string;
  type2: string | null;
  level: number;
  nature: string;
  ivHp: number;
  ivAtk: number;
  ivDef: number;
  ivSpa: number;
  ivSpd: number;
  ivSpe: number;
  price: number;
  isSold: boolean;
  soldToPlayerId: string | null;
  soldAt: string | null;
  dateGenerated: string;
};

export type UserListing = {
  id: number;
  sellerId: string;
  sellerName: string;
  monUid: string;
  monJson: any;
  pokemonId: number;
  pokemonName: string;
  pokemonSprite: string;
  level: number;
  nature: string;
  price: number;
  listedAt: string;
};

export type PendingEarning = {
  id: number;
  playerId: string;
  amount: number;
  reason: string;
  createdAt: string;
  claimedAt: string | null;
};

const BASE = "/api/market";

function buildHeaders(playerId: string | number, extra?: HeadersInit): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-player-id": String(playerId),
    ...(extra ?? {}),
  };
}

async function handle<T>(res: Response): Promise<T> {
  const ct = res.headers.get("content-type") ?? "";
  const body: any = ct.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = (body && typeof body === "object" && body.error) || `Request failed (${res.status}).`;
    const err = new Error(msg) as Error & { status?: number; payload?: any };
    err.status = res.status;
    err.payload = body;
    throw err;
  }
  return body as T;
}

export async function fetchGlobalMarket(playerId: string | number): Promise<{ items: GlobalMarketItem[]; dateGenerated: string }> {
  const res = await fetch(`${BASE}/global`, {
    headers: buildHeaders(playerId),
  });
  return handle(res);
}

export async function buyGlobalItem(playerId: string | number, itemId: number): Promise<{ ok: true; item: GlobalMarketItem }> {
  const res = await fetch(`${BASE}/global/buy`, {
    method: "POST",
    headers: buildHeaders(playerId),
    body: JSON.stringify({ itemId }),
  });
  return handle(res);
}

export async function fetchUserListings(playerId: string | number): Promise<{ listings: UserListing[]; mine: number[] }> {
  const res = await fetch(`${BASE}/listings`, {
    headers: buildHeaders(playerId),
  });
  return handle(res);
}

export async function createUserListing(
  playerId: string | number,
  payload: { sellerName: string; mon: unknown; price: number },
): Promise<{ ok: true; listing: UserListing }> {
  const res = await fetch(`${BASE}/listings`, {
    method: "POST",
    headers: buildHeaders(playerId),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function buyUserListing(
  playerId: string | number,
  listingId: number,
): Promise<{ ok: true; listing: UserListing; mon: any; tax: number; sellerTake: number }> {
  const res = await fetch(`${BASE}/listings/${listingId}/buy`, {
    method: "POST",
    headers: buildHeaders(playerId),
  });
  return handle(res);
}

export async function cancelUserListing(
  playerId: string | number,
  listingId: number,
): Promise<{ ok: true; listing: UserListing; mon: any }> {
  const res = await fetch(`${BASE}/listings/${listingId}/cancel`, {
    method: "POST",
    headers: buildHeaders(playerId),
  });
  return handle(res);
}

export async function fetchPendingEarnings(playerId: string | number): Promise<{ earnings: PendingEarning[]; total: number }> {
  const res = await fetch(`${BASE}/earnings`, {
    headers: buildHeaders(playerId),
  });
  return handle(res);
}

export async function claimPendingEarnings(playerId: string | number): Promise<{ ok: true; claimed: PendingEarning[]; total: number }> {
  const res = await fetch(`${BASE}/earnings/claim`, {
    method: "POST",
    headers: buildHeaders(playerId),
  });
  return handle(res);
}

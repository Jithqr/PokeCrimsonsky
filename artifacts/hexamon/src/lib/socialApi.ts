const BASE = "/api/social";
const ADMIN_BASE = "/api/admin";

async function apiFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...opts });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

export type SocialMail = {
  id: number;
  playerId: string;
  fromName: string;
  subject: string;
  body: string;
  data: Record<string, any> | null;
  read: boolean;
  createdAt: string;
};

export type PendingTransfer = {
  id: number;
  fromId: string;
  fromName: string;
  amount: number;
  note: string;
  createdAt: string;
};

export type TradeProp = {
  id: number;
  proposerId: string;
  proposerName: string;
  targetId: string;
  proposerMonJson: any;
  proposerMonName: string;
  targetMonJson: any;
  targetMonName: string | null;
  mode: string;
  price: number;
  status: string;
  createdAt: string;
};

export type ServerFriend = {
  playerId: string;
  name: string;
  sprite: string;
  hometown: string;
  createdAt: string;
  isOnline: boolean;
};

export type PlayerSearchResult = {
  playerId: string;
  name: string;
  sprite: string;
  hometown: string;
  isOnline: boolean;
};

export type LeaderboardEntry = {
  playerId: string;
  name: string;
  sprite: string;
  wins: number;
  losses: number;
  caughtCount: number;
  pvpRank: number;
};

// ── Player Registry ───────────────────────────────────────────────────────────
export async function registerPlayer(p: { playerId: string; name: string; sprite: string; hometown: string; wins?: number; losses?: number; caughtCount?: number; pvpRank?: number; saveData?: any }) {
  try { await apiFetch(`${BASE}/register`, { method: "POST", body: JSON.stringify(p) }); } catch { /* silent */ }
}

export async function lookupPlayer(playerId: string): Promise<{ name: string; sprite: string; hometown: string; isBanned: boolean } | null> {
  try { return (await apiFetch(`${BASE}/player/${playerId}`)).player ?? null; } catch { return null; }
}

export async function checkBanned(playerId: string): Promise<{ banned: boolean; reason?: string; resetPending?: boolean }> {
  try { return await apiFetch(`${BASE}/check-ban/${playerId}`); } catch { return { banned: false }; }
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  try { return (await apiFetch(`${BASE}/leaderboard`)).players ?? []; } catch { return []; }
}

export async function searchPlayers(q: string): Promise<PlayerSearchResult[]> {
  try { return (await apiFetch(`${BASE}/search?q=${encodeURIComponent(q)}`)).results ?? []; } catch { return []; }
}

// ── Mails ─────────────────────────────────────────────────────────────────────
export async function fetchMails(playerId: string): Promise<SocialMail[]> {
  return (await apiFetch(`${BASE}/mail/${playerId}`)).mails ?? [];
}

export async function markMailRead(mailId: number, playerId: string) {
  await apiFetch(`${BASE}/mail/read`, { method: "POST", body: JSON.stringify({ mailId, playerId }) });
}

export async function markAllMailRead(playerId: string) {
  await apiFetch(`${BASE}/mail/read-all`, { method: "POST", body: JSON.stringify({ playerId }) });
}

export async function deleteMail(mailId: number, playerId: string) {
  await apiFetch(`${BASE}/mail/${mailId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", "x-player-id": playerId },
  });
}

// ── Friends ───────────────────────────────────────────────────────────────────
export async function sendFriendRequest(senderId: string, senderName: string, senderSprite: string, targetId: string) {
  return apiFetch(`${BASE}/friend/request`, {
    method: "POST",
    body: JSON.stringify({ senderId, senderName, senderSprite, targetId }),
  });
}

export async function acceptFriendRequest(playerId: string, senderId: string, mailId: number) {
  return apiFetch(`${BASE}/friend/accept`, {
    method: "POST",
    body: JSON.stringify({ playerId, senderId, mailId }),
  });
}

export async function declineFriendRequest(playerId: string, mailId: number) {
  return apiFetch(`${BASE}/friend/decline`, {
    method: "POST",
    body: JSON.stringify({ playerId, mailId }),
  });
}

export async function fetchServerFriends(playerId: string): Promise<ServerFriend[]> {
  return (await apiFetch(`${BASE}/friends/${playerId}`)).friends ?? [];
}

export async function removeServerFriend(playerId: string, friendId: string) {
  return apiFetch(`${BASE}/friend/remove`, {
    method: "POST",
    body: JSON.stringify({ playerId, friendId }),
  });
}

// ── Transfers ─────────────────────────────────────────────────────────────────
export async function sendTransfer(fromId: string, fromName: string, toId: string, amount: number, note: string) {
  return apiFetch(`${BASE}/transfer`, { method: "POST", body: JSON.stringify({ fromId, fromName, toId, amount, note }) });
}

export async function fetchPendingTransfers(playerId: string): Promise<{ pending: PendingTransfer[]; sent: PendingTransfer[] }> {
  return apiFetch(`${BASE}/transfer/pending/${playerId}`);
}

export async function claimTransfers(playerId: string): Promise<{ total: number; count: number }> {
  return apiFetch(`${BASE}/transfer/claim`, { method: "POST", body: JSON.stringify({ playerId }) });
}

// ── Trades ────────────────────────────────────────────────────────────────────
export async function proposeTrade(proposerId: string, proposerName: string, targetId: string, monJson: any, monName: string, mode: "swap" | "sell" = "swap", price = 0) {
  return apiFetch(`${BASE}/trade/propose`, { method: "POST", body: JSON.stringify({ proposerId, proposerName, targetId, monJson, monName, mode, price }) });
}

export async function fetchPendingTrades(playerId: string): Promise<{ incoming: TradeProp[]; outgoing: TradeProp[]; completed: TradeProp[] }> {
  return apiFetch(`${BASE}/trade/pending/${playerId}`);
}

export async function acceptTrade(tradeId: number, targetId: string, targetMonJson: any, targetMonName: string): Promise<{ proposerMon: any; mode: string; price: number }> {
  return apiFetch(`${BASE}/trade/accept`, { method: "POST", body: JSON.stringify({ tradeId, targetId, targetMonJson, targetMonName }) });
}

export async function acceptSellTrade(tradeId: number, targetId: string): Promise<{ proposerMon: any; mode: string; price: number }> {
  return apiFetch(`${BASE}/trade/accept`, { method: "POST", body: JSON.stringify({ tradeId, targetId }) });
}

export async function declineTrade(tradeId: number, targetId: string): Promise<{ proposerMon: any }> {
  return apiFetch(`${BASE}/trade/decline`, { method: "POST", body: JSON.stringify({ tradeId, targetId }) });
}

export async function cancelTrade(tradeId: number, proposerId: string): Promise<{ proposerMon: any }> {
  return apiFetch(`${BASE}/trade/cancel`, { method: "POST", body: JSON.stringify({ tradeId, proposerId }) });
}

// ── Redeem Codes ──────────────────────────────────────────────────────────────
export async function redeemDbCode(code: string, playerId: string, playerName: string) {
  return apiFetch(`${BASE}/redeem`, { method: "POST", body: JSON.stringify({ code, playerId, playerName }) });
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export async function verifyAdmin(adminKey: string): Promise<boolean> {
  try { const r = await apiFetch(`${ADMIN_BASE}/verify`, { method: "POST", body: JSON.stringify({ adminKey }) }); return !!r.ok; } catch { return false; }
}

export async function adminGetPlayer(adminKey: string, playerId: string) {
  return apiFetch(`${ADMIN_BASE}/player/${playerId}`, { headers: { "Content-Type": "application/json", "x-admin-key": adminKey } });
}

export async function adminBanPlayer(adminKey: string, playerId: string, reason: string) {
  return apiFetch(`${ADMIN_BASE}/ban`, { method: "POST", body: JSON.stringify({ adminKey, playerId, reason }) });
}

export async function adminUnban(adminKey: string, playerId: string) {
  return apiFetch(`${ADMIN_BASE}/unban`, { method: "POST", body: JSON.stringify({ adminKey, playerId }) });
}

export async function adminResetAccount(adminKey: string, playerId: string) {
  return apiFetch(`${ADMIN_BASE}/reset-account`, { method: "POST", body: JSON.stringify({ adminKey, playerId }) });
}

export async function adminGetTransferHistory(adminKey: string, playerId: string) {
  return apiFetch(`${ADMIN_BASE}/transfer-history/${playerId}`, { headers: { "Content-Type": "application/json", "x-admin-key": adminKey } });
}

export async function adminGetTradeHistory(adminKey: string, playerId: string) {
  return apiFetch(`${ADMIN_BASE}/trade-history/${playerId}`, { headers: { "Content-Type": "application/json", "x-admin-key": adminKey } });
}

export async function adminAnnounce(adminKey: string, subject: string, body: string, targetId?: string) {
  return apiFetch(`${ADMIN_BASE}/announce`, { method: "POST", body: JSON.stringify({ adminKey, subject, body, targetId }) });
}

export async function adminDrop(adminKey: string, money: number, item: string, qty: number, message: string, targetId?: string) {
  return apiFetch(`${ADMIN_BASE}/drop`, { method: "POST", body: JSON.stringify({ adminKey, money, item, qty, message, targetId }) });
}

export async function adminCreateCode(adminKey: string, code: string, money: number, item: string, qty: number, maxUses: number) {
  return apiFetch(`${ADMIN_BASE}/redeem/create`, { method: "POST", body: JSON.stringify({ adminKey, code, money, item, qty, maxUses }) });
}

export async function adminListCodes(adminKey: string) {
  return apiFetch(`${ADMIN_BASE}/redeem/list`, { headers: { "Content-Type": "application/json", "x-admin-key": adminKey } });
}

export async function adminDeleteCode(adminKey: string, code: string) {
  return apiFetch(`${ADMIN_BASE}/redeem/${code}`, { method: "DELETE", headers: { "Content-Type": "application/json", "x-admin-key": adminKey } });
}

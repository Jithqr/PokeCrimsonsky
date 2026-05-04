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
  status: string;
  createdAt: string;
};

// ── Player Registry ───────────────────────────────────────────────────────────
export async function registerPlayer(p: { playerId: string; name: string; sprite: string; hometown: string }) {
  try { await apiFetch(`${BASE}/register`, { method: "POST", body: JSON.stringify(p) }); } catch { /* silent */ }
}

export async function lookupPlayer(playerId: string): Promise<{ name: string; sprite: string; hometown: string; isBanned: boolean } | null> {
  try { return (await apiFetch(`${BASE}/player/${playerId}`)).player ?? null; } catch { return null; }
}

export async function checkBanned(playerId: string): Promise<{ banned: boolean; reason?: string }> {
  try { return await apiFetch(`${BASE}/check-ban/${playerId}`); } catch { return { banned: false }; }
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
export async function proposeTrade(proposerId: string, proposerName: string, targetId: string, monJson: any, monName: string) {
  return apiFetch(`${BASE}/trade/propose`, { method: "POST", body: JSON.stringify({ proposerId, proposerName, targetId, monJson, monName }) });
}

export async function fetchPendingTrades(playerId: string): Promise<{ incoming: TradeProp[]; outgoing: TradeProp[]; completed: TradeProp[] }> {
  return apiFetch(`${BASE}/trade/pending/${playerId}`);
}

export async function acceptTrade(tradeId: number, targetId: string, targetMonJson: any, targetMonName: string): Promise<{ proposerMon: any }> {
  return apiFetch(`${BASE}/trade/accept`, { method: "POST", body: JSON.stringify({ tradeId, targetId, targetMonJson, targetMonName }) });
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

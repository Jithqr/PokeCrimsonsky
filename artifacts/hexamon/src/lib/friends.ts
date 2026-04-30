// Local-only friends system. The original spec is Flask/Python with a per-user
// backend; this game has no auth or user-server, so friends live in
// localStorage and are identified by the in-game Trainer ID (numeric, on the
// trainer card).

const FRIENDS_KEY = "hexamon:friends:v1";
const REQUESTS_KEY = "hexamon:friend_requests:v1";

export type Friend = {
  id: number;            // trainer id (numeric)
  name: string;          // display name
  hometown?: string;
  sprite?: string;       // trainer sprite key
  addedAt: number;       // ms epoch
  note?: string;         // optional user note
  rank?: number;         // last known trainer rank (1..10)
};

export type FriendRequest = {
  id: number;            // requester trainer id
  name: string;
  sprite?: string;
  hometown?: string;
  note?: string;
  ts: number;
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const data = JSON.parse(raw);
    return (data as T) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

export function loadFriends(): Friend[] {
  const list = readJson<Friend[]>(FRIENDS_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function saveFriends(list: Friend[]): void {
  writeJson(FRIENDS_KEY, list);
}

export function loadRequests(): FriendRequest[] {
  const list = readJson<FriendRequest[]>(REQUESTS_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function saveRequests(list: FriendRequest[]): void {
  writeJson(REQUESTS_KEY, list);
}

export type AddResult = { ok: boolean; reason?: string; friend?: Friend };

export function addFriend(
  current: Friend[],
  candidate: Friend,
  selfId: number,
): AddResult {
  if (!candidate || !Number.isFinite(candidate.id)) {
    return { ok: false, reason: "Invalid trainer ID." };
  }
  if (candidate.id === selfId) {
    return { ok: false, reason: "You can't add yourself." };
  }
  if (current.some((f) => f.id === candidate.id)) {
    return { ok: false, reason: "Already in your friends list." };
  }
  const friend: Friend = {
    id: candidate.id,
    name: candidate.name?.trim() || `Trainer #${candidate.id}`,
    hometown: candidate.hometown?.trim() || undefined,
    sprite: candidate.sprite || undefined,
    addedAt: Date.now(),
    note: candidate.note?.trim() || undefined,
    rank: candidate.rank,
  };
  return { ok: true, friend };
}

export function removeFriend(current: Friend[], id: number): Friend[] {
  return current.filter((f) => f.id !== id);
}

// Encode the player's own card to a short shareable string. This isn't a
// network call — it's just a token the player can copy/paste to a friend.
//
// Format: hxm:<id>:<base64(name|hometown|sprite|rank)>
export function encodeMyCard(card: { id: number; name: string; hometown?: string; sprite?: string; rank?: number }): string {
  const safe = (s: string | undefined) => (s ?? "").replace(/\|/g, "/");
  const payload = [safe(card.name), safe(card.hometown), safe(card.sprite), String(card.rank ?? 1)].join("|");
  let b64 = "";
  try { b64 = btoa(unescape(encodeURIComponent(payload))); } catch { b64 = ""; }
  return `hxm:${card.id}:${b64}`;
}

export function decodeFriendCode(code: string): Friend | null {
  if (!code) return null;
  const trimmed = code.trim();
  // Plain numeric ID is allowed too — we just don't get a name with it.
  if (/^\d{6,12}$/.test(trimmed)) {
    return { id: Number(trimmed), name: `Trainer #${trimmed}`, addedAt: Date.now() };
  }
  const m = trimmed.match(/^hxm:(\d+):([A-Za-z0-9+/=]*)$/);
  if (!m) return null;
  const id = Number(m[1]);
  if (!Number.isFinite(id)) return null;
  let payload = "";
  try { payload = decodeURIComponent(escape(atob(m[2] || ""))); } catch { payload = ""; }
  const [name, hometown, sprite, rankStr] = payload.split("|");
  const rank = Number(rankStr);
  return {
    id,
    name: name?.trim() || `Trainer #${id}`,
    hometown: hometown?.trim() || undefined,
    sprite: sprite?.trim() || undefined,
    rank: Number.isFinite(rank) ? rank : undefined,
    addedAt: Date.now(),
  };
}

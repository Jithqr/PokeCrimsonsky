// Trainer rank system. Ranks 1..10 are unlocked once the player's
// CUMULATIVE EXP crosses each milestone below.
//
//   Rank 1   →       0 EXP  (everyone starts here)
//   Rank 2   →   1,000 EXP
//   Rank 3   →   4,000 EXP
//   Rank 4   →  12,000 EXP
//   Rank 5   →  30,000 EXP
//   Rank 6   →  70,000 EXP
//   Rank 7   → 150,000 EXP
//   Rank 8   → 300,000 EXP
//   Rank 9   → 600,000 EXP
//   Rank 10  → 1,000,000 EXP   (max)

export const EXP_MILESTONES: Record<number, number> = {
  1: 0,
  2: 1_000,
  3: 4_000,
  4: 12_000,
  5: 30_000,
  6: 70_000,
  7: 150_000,
  8: 300_000,
  9: 600_000,
  10: 1_000_000,
};

export const MAX_RANK = 10;

export function expForRank(rank: number): number {
  const r = Math.max(1, Math.min(MAX_RANK, Math.floor(rank)));
  return EXP_MILESTONES[r] ?? 0;
}

export function rankFromExp(totalExp: number): number {
  let rank = 1;
  for (let r = MAX_RANK; r >= 1; r--) {
    if (totalExp >= EXP_MILESTONES[r]) { rank = r; break; }
  }
  return rank;
}

export type RankProgress = {
  rank: number;          // 1..10
  isMax: boolean;        // true when rank === MAX_RANK
  current: number;       // EXP earned within current rank
  needed: number;        // EXP needed to span the current rank (next - this)
  toNext: number;        // EXP remaining to reach next rank
  pct: number;           // 0..100 progress within current rank
  totalExp: number;      // raw cumulative EXP
};

export function rankProgress(totalExp: number): RankProgress {
  const safe = Math.max(0, Math.floor(totalExp || 0));
  const rank = rankFromExp(safe);
  const thisMs = EXP_MILESTONES[rank];
  if (rank >= MAX_RANK) {
    return { rank, isMax: true, current: 0, needed: 0, toNext: 0, pct: 100, totalExp: safe };
  }
  const nextMs = EXP_MILESTONES[rank + 1];
  const needed = Math.max(1, nextMs - thisMs);
  const current = Math.max(0, safe - thisMs);
  const toNext = Math.max(0, nextMs - safe);
  const pct = Math.min(100, Math.max(0, Math.round((current / needed) * 100)));
  return { rank, isMax: false, current, needed, toNext, pct, totalExp: safe };
}

// Pretty rank-tier label (purely cosmetic; legacy code used Bronze/Silver/Gold).
export function rankTier(rank: number): string {
  if (rank >= 9) return "Master";
  if (rank >= 7) return "Diamond";
  if (rank >= 5) return "Gold";
  if (rank >= 3) return "Silver";
  return "Bronze";
}

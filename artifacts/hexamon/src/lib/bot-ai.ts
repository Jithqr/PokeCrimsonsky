// Deterministic-ish bot policy for League opponents.
// Evaluates each move's expected damage on the opposing active mon and picks
// the strongest. Will switch out only when low HP AND quad-weak to opposing type.

import type { Action, BattleState } from "./battle-engine";
import { calcDamage, calcMaxHp } from "./battle-engine";
import { getMove } from "./move-data";
import { typeMultiplier } from "./type-chart";

export function chooseBotAction(state: BattleState, side: 0 | 1): Action {
  const me = state.teams[side];
  const opp = state.teams[(1 - side) as 0 | 1];
  const myMon = me.mons[me.activeIdx];
  const oppMon = opp.mons[opp.activeIdx];

  // 1) If we're below 25% HP AND opponent has a 4× advantage on us, consider switching.
  const myMax = calcMaxHp(myMon);
  const lowHp = myMon.currentHp / myMax < 0.25;
  // Worst incoming type multiplier from any of opponent's moves:
  let worstIn = 1;
  for (const mvName of oppMon.moves) {
    const mv = getMove(mvName);
    if (mv.power <= 0) continue;
    const t = typeMultiplier(mv.type, myMon.types);
    if (t > worstIn) worstIn = t;
  }
  if (lowHp && worstIn >= 4) {
    // Find a bench mon resistant to opponent active.
    let bestIdx = -1; let bestScore = -Infinity;
    me.mons.forEach((bm, i) => {
      if (i === me.activeIdx || bm.currentHp <= 0) return;
      let score = 0;
      for (const mvName of oppMon.moves) {
        const mv = getMove(mvName);
        if (mv.power <= 0) continue;
        score -= typeMultiplier(mv.type, bm.types) * mv.power;
      }
      // Bonus for offensive coverage on opponent.
      for (const mvName of bm.moves) {
        const mv = getMove(mvName);
        score += typeMultiplier(mv.type, oppMon.types) * mv.power * 0.5;
      }
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    });
    if (bestIdx >= 0) return { kind: "switch", toIdx: bestIdx };
  }

  // 2) Pick highest expected-damage move on the current target (deterministic-ish RNG).
  const fixedRng = (() => { let s = state.turn * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; })();
  let bestMove = 0; let bestDmg = -1;
  for (let i = 0; i < myMon.moves.length; i++) {
    const mv = getMove(myMon.moves[i]);
    if (mv.power <= 0) {
      // Status moves: small intrinsic value.
      if (bestDmg < 5) { bestDmg = 5; bestMove = i; }
      continue;
    }
    const sample = calcDamage(myMon, oppMon, mv, fixedRng);
    if (sample.damage > bestDmg) { bestDmg = sample.damage; bestMove = i; }
  }
  return { kind: "move", moveIdx: bestMove };
}

/** Force-switch picker for the bot when its active mon faints. */
export function pickBotForceSwitch(state: BattleState, side: 0 | 1): number {
  const me = state.teams[side];
  const opp = state.teams[(1 - side) as 0 | 1];
  const oppMon = opp.mons[opp.activeIdx];
  let bestIdx = -1; let bestScore = -Infinity;
  me.mons.forEach((bm, i) => {
    if (bm.currentHp <= 0 || i === me.activeIdx) return;
    let score = 0;
    for (const mvName of oppMon.moves) {
      const mv = getMove(mvName);
      if (mv.power <= 0) continue;
      score -= typeMultiplier(mv.type, bm.types) * mv.power;
    }
    for (const mvName of bm.moves) {
      const mv = getMove(mvName);
      score += typeMultiplier(mv.type, oppMon.types) * mv.power * 0.4;
    }
    if (score > bestScore) { bestScore = score; bestIdx = i; }
  });
  if (bestIdx < 0) {
    // Fall back to first non-fainted mon.
    bestIdx = me.mons.findIndex((m) => m.currentHp > 0);
  }
  return Math.max(0, bestIdx);
}

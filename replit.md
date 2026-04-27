# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## HexaMon (artifacts/hexamon)

Pokémon-style React + Vite + TS web game. Major in-game systems:

- **Battle engine** (`src/lib/battle-engine.ts`) — pure deterministic Gen-style engine: types, STAB, priority, speed tiebreak, faint cancellation, status (burn/poison ticks). Helpers: `calcMaxHp`, `calcStat`, `calcDamage`, `resolveTurn`, `forceSwitch`, `makeBattleState`, `fromAppMon`. Companion data: `type-chart.ts`, `move-data.ts`, `natures.ts`.
- **League** (`src/lib/league-data.ts`, `src/components/LeagueScreen.tsx`) — 8 Gym Leaders + 4 Elite 4 trainers with full IVs/natures/movesets. Bot AI in `src/lib/bot-ai.ts` (`chooseBotAction`, `pickBotForceSwitch`). E4 is a 4-match gauntlet: HP carries between matches; full wipe resets streak; clearing all 4 sets `e4Cleared=true`.
- **Training Zone** (`src/components/TrainingZone.tsx`) — 6 EV zones (HP/Atk/Def/SpA/SpD/Spe) with capture-based EV grinding (252/stat, 510 total caps) plus paid instant training (₽15,000/stat). EV changes recompute `maxHp` via `calcMaxHp` while preserving HP ratio.
- **Battle Box (PvP)** — real WebSocket battle. Server lives in `artifacts/api-server/src/ws/battle-ws.ts` + `battle-rooms.ts`, attached to the HTTP server in `index.ts` at `/api/ws/battle`. Engine files are duplicated under `artifacts/api-server/src/battle/` for server-authoritative resolution. Client connects via `wss://${host}/api/ws/battle` from `App.tsx`.
- **Shared `BattleArena` component** (`src/components/BattleArena.tsx`) — used by both League (local engine) and PvP (WS-driven) modes. Pure presentational view of `BattleState`.
- **Save schema** (`SAVE_KEY = "hexamon:save:v2"` in `App.tsx`) now also persists `badges: string[]`, `e4Cleared: boolean`, `e4Streak: number`.
- **Mon→engine adapter**: in-app `Mon` objects store level-scaled stats; converting to engine-shape requires the species' base stats. `toShippableMon(m)` in `App.tsx` (and the same idea in `npcMonToAppMon`) does this lookup before `fromAppMon`.
- **PP system removed** (battle-engine.ts ~L249) — moves are unlimited use; no PP enforcement, no Struggle fallback.
- **Mon generation (`makeMon` in App.tsx ~L174)** — every spawn (wild, marketplace, NPC) gets:
  - `nature`: random from 25 standard natures via `randomNature()`.
  - **Weighted IVs (per-stat 0–31, total cap 186)**: `rollTotalIv()` picks a target Total IV by tier (170–186: 7.4%, 160–169: 14.8%, 150–159: 18.5%, 130–149: 25.9%, 0–129: 33.4%), then `generateIvs()` distributes that total across 6 stats respecting the per-stat cap.
- **Evolution duplication fix** (App.tsx `finishBattle` ~L1453) — evolved Mon copies the original's `uid`, `nickname`, IVs, EVs, nature, exp; team replacement uses `prev.map((m) => m.uid === ev.from.uid ? evolved : m)` (no longer assumes index 0).
- **AddMon picker** (App.tsx ~L2962) — pulls instances from `box` (preserves uid/level/IVs/EVs/nature) instead of creating new Lv5 mon from `caught` species set.
- **Wild level range 5–89** — region table in `REGIONS` (App.tsx ~L212) scales Kanto 5–18 → Paldea 55–89 progressively.
- **Safari ball flee threshold** — `Battle.fleeThreshold` (random 1–5, hidden) controls when wild flees on a missed catch; replaces the prior gradual 8% × throws formula.
- **Inventory categories** — `OTHERS` tab catches anything not matching balls/TMs/eggs/key/stones; KEY ITEMS regex no longer captures "pass" (Safari Pass now lives under OTHERS).
- **Ranked PvP** — flat ±50 rank delta per ranked match (replaces ELO formula).

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

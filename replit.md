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
- **Wild level range 5–89 (region-independent)** — `spawnWild`, `spawnSafari`, and `startSafariInRegion` ignore the per-region `minLv/maxLv` and roll a uniform 5–89 level for normal mons (legendaries roll 60–89). The `REGIONS` table still ships level ranges but they're no longer used for spawning.
- **Wild battle move power & accuracy** — `doPlayerMove` (App.tsx) uses `getMove(name)` from `lib/move-data.ts` for both `power` and `accuracy`, with explicit miss handling (`💨 ... missed!`). The move buttons in the wild battle UI also display real PWR/ACC/Type from `getMove`. (Trainer/PvP battles already use `move-data.ts` via the engine.)
- **TYPE_COLORS includes Dark** — `Dark: "#705848"` added so dark-type moves/badges render properly.
- **Auto-heal after every battle** — wild battle (run/win/black-out), league battle exit, and PvP battle exit all reset every team mon's `currentHp` to `maxHp` and clear `status`.
- **Evolve has no candy cost** — `evolveMon` in `monDetail` simply confirms and evolves; candy-related logic was removed.
- **Audio assets (PokeRogue, beta branch of `pagefaultgames/pokerogue-assets`)** bundled at `artifacts/hexamon/public/audio/`:
  - `cry/` — all 1200 species cries (m4a, named by national dex id)
  - `se/` — 37 sound effects (hit, faint, pb_throw, pb_catch, level_up, exp, shine, etc.)
  - `ui/` — 3 UI sounds (select, menu_open, error)
  - `battle_anims/` — 1310 move SFX (Fire1-4, Water1-5, PRSFX-* per-move clips)
  - `bgm/` — curated 16 tracks (title, battle_wild, battle_trainer, battle_kanto_gym, battle_kanto_champion, battle_legendary_kanto, town, meadow, grass, menu, end, etc.). Most BGM was skipped to keep the bundle small.
- **Audio service** lives in `src/audio-assets.ts` (real-asset playback, BGM singleton with loop, master/sfx/music volumes, `playCry(dexId)`, `playMusic(track)`, `stopMusic()`, `playMoveByName(move,type)` with curated per-move and type-fallback maps). `src/sfx.ts` keeps its existing exported `sfx` API (`click`/`hit`/`faint`/`ballThrow`/...) but each helper now plays the matching real wav/m4a and falls back to the original Web Audio synth on failure, so the ~50 existing call sites in App.tsx work unchanged.
- **Battle audio hooks in App.tsx**:
  - Wild battle entry (~L1355): plays the wild Pokémon's cry, then loops `battle_wild`.
  - Wild battle exit (catch / flee / blackout): `sfx.stopMusic()` before screen change.
  - League battle entry (~L810): plays opponent lead's cry + loops `battle_trainer` (or `battle_kanto_champion` for E4).
  - League battle exit (~L5440): `sfx.stopMusic()`.
  - Switch-in (`pickSwitchTo` ~L1467): plays the new active Pokémon's cry.
  - Mon Detail playCry button: now plays `/audio/cry/{id}.m4a` first, with PokéAPI as a remote fallback.
- **Move SFX**: `playMoveSfx(move)` in `sfx.ts` now tries `playMoveByName(move,type)` first (real PokeRogue clip from `battle_anims/`) and falls back to the synth move sound if no asset is mapped.
- **Type-effectiveness + crit in wild battles** (App.tsx ~L1380 player path, ~L1430 enemy path): both sides apply `typeMultiplier(moveType, defenderTypes)` from `lib/type-chart` and roll a 1/24 crit (×1.5). The log now reads `(N dmg 🎯CRIT) (super effective!)` / `(not very effective…)` / `(no effect)`. SFX layer: `sfx.crit()` (sparkle), `sfx.superEffective()` (hit_strong), `sfx.notVeryEffective()` (hit_weak), all delayed slightly after the move hit so they layer cleanly.
- **League log → SFX bridge** (App.tsx ~L1118): a `useEffect` watches `leagueBattle.state.log.length`, scans new entries, and fires `sfx.crit/superEffective/notVeryEffective/statUp/statDown` on engine-emitted strings ("A critical hit!", "It's super effective!", "It's not very effective…", "X's STAT rose./fell."). This auto-wires the league/E4 battles without touching the engine.
- **Trainer-victory jingle**: league win at ~L869 plays `sfx.trainerVictory()` (PokeRogue `shing.wav`) instead of the generic `sfx.victory()` ladder.
- **Heal & item-pickup SFX**: every "Your team was fully healed!" log line (post-blackout, post-catch, training-evo healing, safari-flee, league/PvP exit) is now preceded by `sfx.heal()` (`restore.wav`). All purchase points (`spendMoney` callback, Safari pass entry fee, Market BUY button) play `sfx.itemPickup()` (`buy.wav`).
- **Low-HP alarm**: a `useEffect` (~L1088) tracks the active mon's HP across both wild (`battle.pMon`) and league (`leagueBattle.state.teams[0]`) battles and plays `sfx.lowHp()` (`danger.wav`) once when the ratio first crosses below 0.20. It re-arms when HP recovers above 0.25 and resets when the active mon changes.
- **Title & overworld music** (`useEffect` on `screen` ~L1079): `screen === "story"` loops the `title` BGM, `screen === "world"` loops the `town` BGM. Battle screens still own their own music; their existing `stopMusic()` on exit lets this effect resume the correct ambient track when returning to world.
- **Remove-from-team / Reset-Team return mons to box** — pulling a Pokémon out of a team (or resetting a team) now pushes it into `box` (the Mons collection) instead of releasing it forever.
- **Empty-team popup on creation** — `emptyTeamWarning` state shows a fixed modal reminding the trainer to add at least 1 Pokémon to a freshly created team before battling.
- **Safari encounter status box** — fixed-height (64px) banner under the encounter sprite. Replaces "appeared!/watches you carefully..." with three states: "You threw a Safari ★/★★/★★★" (animated), "You Caught A Wild X" (green), "Your Safari Failed And wild X Has fled." (red). Driven by `safariStatusMsg` state set in `safariThrow`.
- **Safari region picker FA icons** — `safari` region list reuses the same `regionMeta` icon palette as `regionSelect` (fa-fire, fa-droplet, fa-leaf, …) instead of `r.emoji`, with circular tinted backgrounds.
- **Hunt back button on the LEFT** — header layout in the `hunt` screen swapped so BACK is leading and the title is centered. Region level range "Lv X–Y" caption removed (levels are now random).
- **Gym badge images** — `LeagueScreen` renders real PokeAPI badge sprites (`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/{1..8}.png`), grayscaled until earned, with an emoji fallback on image error.
- **Gen-9 sprite fallback** — `MonSprite` now also tries `play.pokemonshowdown.com/sprites/home/{name}.png` as the last fallback, which covers every Gen-9 species (paradox, treasures of ruin, DLC mons) without needing entries in `CUSTOM_SPRITES`.
- **Safari ball flee threshold** — `Battle.fleeThreshold` (random 1–5, hidden) controls when wild flees on a missed catch; replaces the prior gradual 8% × throws formula.
- **Inventory categories** — `OTHERS` tab catches anything not matching balls/TMs/eggs/key/stones; KEY ITEMS regex no longer captures "pass" (Safari Pass now lives under OTHERS).
- **Ranked PvP** — flat ±50 rank delta per ranked match (replaces ELO formula).

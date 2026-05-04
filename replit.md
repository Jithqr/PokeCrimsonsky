# Overview

This project is a pnpm workspace monorepo utilizing TypeScript, designed for a Pokémon-style React + Vite web game named HexaMon. The game features a comprehensive battle engine, a League mode with AI trainers, a Training Zone for EV grinding, and a real-time PvP battle system. A key component is the server-driven Crimson Sky Marketplace, enabling player-to-player trading and global listings. The project aims to provide a rich, engaging experience for players, complete with alternate form spawning, a detailed in-game Pokedex, and an immersive audio system. The architecture is built with modern web technologies, focusing on scalability and a robust user experience, positioning HexaMon as a competitive entry in the browser-based monster-collecting game market.

# User Preferences

I prefer concise and accurate responses. When making changes, prioritize correctness and maintainability. For major architectural decisions or significant feature implementations, please ask for confirmation before proceeding. I value clear explanations for complex logic or design choices. Do not make changes to files outside the `artifacts/hexamon` and `artifacts/api-server` directories without explicit instruction.

# System Architecture

## Core Technologies

- **Monorepo Tool**: pnpm workspaces
- **Node.js**: v24
- **Package Manager**: pnpm
- **TypeScript**: v5.9
- **API Framework**: Express 5
- **Database**: PostgreSQL with Drizzle ORM
- **Validation**: Zod (v4) and `drizzle-zod`
- **API Codegen**: Orval (from OpenAPI spec)
- **Build Tool**: esbuild (CJS bundle)

## UI/UX and Game Features

- **HexaMon Game**: A React + Vite + TS web game with a Pokémon-style experience.
- **Battle Engine**: Pure, deterministic Gen-style engine managing battle mechanics, including types, STAB, priority, and status effects. Shared across League and PvP modes.
- **League Mode**: Features 8 Gym Leaders and 4 Elite 4 trainers with advanced bot AI. Progress is a 4-match gauntlet for the Elite Four, with HP carrying over.
- **Training Zone**: Allows players to grind EVs (Effort Values) through capture-based training or paid instant training, with recomputation of stats to preserve HP ratios.
- **PvP Battle System**: Real-time WebSocket-based battles with a server-authoritative engine for fair play.
- **Marketplace**: Server-driven system with Global Listings, User Listings (player-to-player trading with a 5% tax), and a Pending Earnings inbox for seller payouts. Pricing is dynamically calculated based on BST, level, IVs, and tier.
- **Alternate Form Spawning**: Wild and Safari encounters can yield non-mega alternate forms, with specific rules for G-Max exclusion.
- **Crimson Sky Dex**: Comprehensive Pokedex displaying all 1109 base Pokémon and 306 alternate forms, with filtering by category (BASE, SHINY, MEGA, G-MAX, ALOLAN, GALARIAN, HISUIAN, PALDEAN, ALT FORM). Includes shiny sprite toggles and robust sprite fallback logic.
- **Mon Generation**: New Pokémon spawns (wild, marketplace, NPC) are assigned random natures and weighted IVs, with a total IV cap.
- **Evolution**: Streamlined evolution process with no candy cost, preserving original Pokémon attributes (UID, nickname, IVs, EVs, nature, exp).
- **Wild Battle Mechanics**: Wild battles now incorporate move power, accuracy, type effectiveness, and critical hits, with corresponding SFX.
- **Audio System**: Utilizes bundled audio assets (cries, sound effects, UI sounds, battle animations, BGM) for an immersive experience. Features an audio service for managing playback, volumes, and context-specific music.
- **Inventory Management**: Categorized inventory system with a dedicated "OTHERS" tab for miscellaneous items.
- **Ranked PvP**: Simplified ranking system with a flat ±50 rank change per match.
- **UI Enhancements**: Includes gym badge images, improved safari UI with status boxes and region picker icons, and adjusted header layouts for better navigation.

## Design Patterns & Implementations

- **Monorepo Structure**: Uses pnpm workspaces for efficient package management.
- **API Integration**: Client-side API calls (`artifacts/hexamon/src/lib/marketApi.ts`) use `x-player-id` headers for authentication.
- **State Management**: `SAVE_KEY = "hexamon:save:v2"` for game state persistence.
- **Event-driven SFX**: `useEffect` hooks in `App.tsx` trigger audio events based on game state changes (e.g., battle entry/exit, low HP alarms, battle log events).
- **Data Adapters**: `toShippableMon` and `fromAppMon` handle conversion between in-app Pokémon objects and engine-compatible formats.

# External Dependencies

- **PostgreSQL**: Primary database for persistent data storage.
- **Drizzle ORM**: Used for interacting with the PostgreSQL database.
- **PokeAPI**: Used for fetching Pokémon data, including sprite fallbacks and badge images.
- **Showdown's `ani-shiny/` URLs**: For shiny sprites in the Pokedex.
- **`play.pokemonshowdown.com/sprites/home/`**: As a fallback for Gen-9 Pokémon sprites.
- **`pagefaultgames/pokerogue-assets` (beta branch)**: Source for audio assets (cries, SFX, BGM).
# Pokémon Crimson Rift — Full Feature Specification
> Give this document to Replit AI as the complete product brief. Every feature, every interaction, every data rule is described below in implementation-ready detail.

---

## 1. Overview & Concept

**Pokémon Crimson Rift** is a single-page mobile-first web app (max-width 480 px) styled like a dark fantasy tower-challenge game. It is inspired by Genshin Impact's Spiral Abyss. Players climb a 12-floor tower, each floor split into 3 chambers. Before fighting they pick two teams of 4 Pokémon (one for each half of a chamber). Each chamber runs a turn-based Pokémon battle against waves of "Corrupted" enemy Pokémon. Stars are awarded per chamber; rewards are gated behind star thresholds.

**Tech stack:** Single HTML file, vanilla JS, no frameworks, no build step. External fonts from Google Fonts (Cinzel + Crimson Pro). Sprites from PokéAPI and Pokémon Showdown CDN.

**Color palette (CSS variables):**
```
--gold: #c9952a          --gold-light: #f0c060    --gold-dim: #7a5a18
--deep: #0a0812          --surface: #130f1e        --surface2: #1c1630
--accent-blue: #4a90d9   --accent-red: #cc3333
--text-main: #e8dfc8     --text-muted: #8a7a5a
--corrupt: #8b00ff       --corrupt-light: #bf5fff  --corrupt-dark: #3d0080
```

---

## 2. Global Layout

### 2.1 Background (body::before)
A fixed full-screen pseudo-element sits behind everything (z-index 0, pointer-events none). It renders:
- 8 tiny radial-gradient "star" dots scattered at hard-coded percentage positions (white, 0.3–0.7 opacity, 1 px).
- A purple vignette at the top (`rgba(74,50,130,0.4)` ellipse fading to transparent at 60%).
- A dark vignette at the bottom (`rgba(20,10,50,0.8)` ellipse fading to transparent at 50%).

### 2.2 Main container
`.container` — `position: relative`, `z-index: 1`, `max-width: 480 px`, centered, `padding: 0 12px 80px` (bottom padding leaves room for the fixed nav bar).

### 2.3 Bottom Navigation Bar
Fixed to the bottom of the viewport. Four equal-width icon+label buttons:
| Tab | Icon (inline SVG) | Label |
|-----|-------------------|-------|
| Tower (default active) | House/home icon | Tower |
| Party | Globe icon | Party |
| Ranks | Star/polygon icon | Ranks |
| Rewards | 4-square grid icon | Rewards |

Active tab: color `--gold-light`. Inactive: `--text-muted`. Font: Cinzel 9 px, letter-spacing 0.5 px. Background: `rgba(10,8,18,0.95)` + `backdrop-filter: blur(12px)`. Border-top: `1px solid rgba(201,149,42,0.15)`. Respects `safe-area-inset-bottom` for iOS.

> **Current implementation note:** Only the Tower tab is wired. The other three tabs are visual placeholders. Replit AI should implement them or at minimum prevent broken states when tapped.

---

## 3. Tower Screen (Main View)

### 3.1 Header
- **Emblem SVG** (52 × 52 px) centered above the title. Applies a pulsing gold drop-shadow animation (`pulse-glow`, 3 s infinite ease-in-out, between 8 px and 20 px blur).
- **Title:** "POKÉMON CRIMSON RIFT" — Cinzel 22 px 800 weight, gold-light, 3 px letter-spacing.
- **Subtitle:** "ENTER THE RIFT" — Cinzel 10 px, text-muted, 6 px letter-spacing.
- **Decorative divider:** flex row with a left line, a `♦` gold symbol, a right line. Lines are `linear-gradient(transparent → --gold-dim → transparent)`.

### 3.2 Season Bar
Sits between header and floor grid. Three columns:
- **Left:** Season label (Cinzel 11 px, gold-light) + season time text (12 px, text-muted) — e.g. "SEASON I" and "16 days remaining".
- **Right:** Reset badge — small pill reading "RESETS 16TH", Cinzel, gold color, gold-tinted border.

Background: `linear-gradient(135deg, rgba(201,149,42,0.1), rgba(74,50,130,0.2))`. Border: `1px solid rgba(201,149,42,0.2)`. Blur backdrop.

### 3.3 Floor Grid Layout
The 12 floors are divided into **4 rows of 3 banners each**, separated by styled dividers.

**Divider between rows:**
- A horizontal rule with a centered label, e.g. "— ABYSSAL MOON SPIRE —" (Cinzel 9 px, gold-dim, 3 px letter-spacing).
- The label sits between two `linear-gradient` lines.

**Floor banner (`.floor-banner`):**
- `aspect-ratio: 0.42` (tall narrow banner shape like a Gothic arch).
- Cursor pointer, `touch-action: manipulation`, no tap highlight.
- On `:active`: `transform: scale(0.96)`.
- Entrance animation: `fadeUp` (translateY 20 px → 0, opacity 0 → 1, 0.5 s), staggered delay of `0.04s × floor index`.
- Three possible states: **cleared**, **active**, **locked**.

**Banner SVG (arch shape, `viewBox="0 80 190"`):**
- Outer arch path: `M8,180 L8,70 Q8,10 40,5 Q72,10 72,70 L72,180 Q72,188 64,188 L16,188 Q8,188 8,180 Z`
- If a `FLOOR_IMAGES[id]` URL exists: clip the image to the arch shape using `<clipPath>` referencing the same path. Overlay with `rgba(0,0,0,0.38)` fill for legibility.
- Outer stroke (`arch-stroke`): cleared = `#3a8a55`, active = `#c9952a`, locked = `#2e2844`. Stroke-width 1.5.
- Inner deco stroke: a slightly inset version of the arch + a small arch near the top. Colors: cleared = `#236635`, active = `#8a6018`, locked = `#1e1835`.
- Top and bottom diamond accents: 4-point polygon `40,2 42.5,6 40,10 37.5,6` filled with the stroke color.
- Glow SVG filter (`feGaussianBlur stdDeviation=2`) applied to arch-stroke for active and cleared floors, except floors 1, 2, 5.

**Banner content (overlaid on SVG):**
- **Floor number circle:** 32 × 32 px, circular border (1.5 px, color matches state), dark background + backdrop blur. Number inside in Cinzel 14 px 600 weight.
  - Cleared: `#6fc98a`
  - Active: `#f0c060`
  - Locked: `#4a4060`
- **Star row** (bottom of banner, above 14% from bottom): 3 stars, 10 × 10 px SVG polygons. Filled = state color, empty = `rgba(255,255,255,0.12)`.

**Click behavior:** Tapping any banner calls `openDetailModal(floorIndex)`. Even locked floors show the modal (but the Enter button should be disabled or hidden for locked floors).

---

## 4. Detail Modal

Triggered by tapping a floor banner. Slides in as a centered overlay (`modal-overlay` with `display: flex` when `.open`).

**Background overlay:** `rgba(5,3,12,0.9)` + `backdrop-filter: blur(6px)`.

**Card (`.detail-card`):**
- `background: linear-gradient(160deg, #1a1530, #0e0b1e)`
- Border: `1px solid rgba(201,149,42,0.3)`, radius 14 px.
- Max height 90 vh, scrollable.

### 4.1 Header Row (two columns)
**Left column — mini banner (56 × 120 px):**
- Rounded pill shape (`border-radius: 28px 28px 18px 18px`).
- Shows the floor image as a background if available (`<img>` inside, `object-fit: cover`, opacity 0.7).
- Floor number as a centered badge over the image (dark circle, Cinzel 18 px 700 weight).
- Border color: cleared = `#3a8a55`, else `#c9952a`.

**Right column — info:**
- Floor tag: "Floor X" — Cinzel 18 px 700 weight, `#f0c060`.
- Floor name (italic): e.g. "Meadow Trial" — 13 px, text-muted.
- Divergence badge: small outlined chip with text "DIVERGENCE" — Cinzel 10 px, gold, 1 px letter-spacing.
- Disorder box: dark bordered box with title "RIFT DISORDER" (Cinzel 10 px gold) and the disorder description text (11 px, text-muted, 1.6 line-height). First half text styled with class `first` (gold-light, bold). Second half with class `second` (blue `#88aaff`, bold).

### 4.2 Chambers Section
Title: "CHAMBERS" — Cinzel 12 px, gold-light.

Three `chamber-row` divs stacked vertically:
- Each shows `Chamber 1 / 2 / 3` on the left (Cinzel 12 px).
- Three 14 × 14 px gold stars on the right (filled = `#c9952a`, empty = `rgba(201,149,42,0.2)`).
- `Chamber 1` always gets class `active-chamber` (slightly highlighted: `border-color: rgba(201,149,42,0.3)`, `background: rgba(201,149,42,0.06)`).

### 4.3 Hint Text
Center-aligned italic 11 px text: "Challenge will start from Floor X, Chamber 1."

### 4.4 Button Row
Two buttons side-by-side:
- **Close button** (flex 1): transparent background, gold-tinted border, text-muted text. Calls `closeDetailModal()`.
- **Enter button** (flex 2): gold gradient background (`linear-gradient(135deg, #b8851f, #e0a830)`), dark text `#1a0f00`, Cinzel 13 px 700. Text changes based on floor status:
  - Cleared → "↩ RETRY"
  - Active → "⚔ SELECT TEAM"
  - Locked → should be disabled or say "🔒 LOCKED"
  - Clicking calls `openTeamModal()`.

---

## 5. Team Select Modal

Opens after clicking the Enter button in the Detail Modal. Closes the Detail Modal first (`closeDetailModal()`), then opens itself.

**Card layout (`.team-card`):**
- Flex column, `max-height: 92vh`, no outer scroll (inner panels scroll independently).
- Same dark gradient background as detail card.

### 5.1 Header Strip
- Back button (←) — calls `closeTeamModal()` which re-opens the Detail Modal.
- Title: "SELECT TEAM" — Cinzel 14 px 600.
- Floor label: "Floor X · Divergence" — Cinzel 11 px, gold.

### 5.2 Disorder Bar
Below header, dark background. Title "RIFT DISORDER" (Cinzel 9 px, gold, 1 px letter-spacing). Disorder text (11 px, text-muted) — same colored spans as in the Detail Modal.

### 5.3 Split Layout: Roster Panel (left 52%) + Party Panel (right 48%)

**Roster Panel:**

*Filter row:*
- Label "TYPE:" (Cinzel 9 px, text-muted).
- Type chip buttons for "All" + every unique type present in `POKEMON_ROSTER`.
- Active chip: `background: rgba(201,149,42,0.2)`, `border-color: rgba(201,149,42,0.5)`, gold text.
- Inactive chip: near-transparent with `rgba(255,255,255,0.12)` border, text-muted.
- Tapping a chip sets `typeFilter` and re-renders roster.

*Roster grid (3 columns, scrollable):*
- Each `.poke-card` shows:
  - A 44 × 44 px pixelated sprite from PokéAPI (`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{id}.png`).
  - Pokémon name in its type color (from `TYPE_COLORS` map), 8 px, Cinzel.
  - Level "Lv.XX", 8 px, gold.
  - A small gold circle badge (✓) in the top-right corner, visible only when the card has class `selected`.
- **States:**
  - Default: faint border, very dark bg.
  - **Selected** (in the currently active half): gold border, gold-tinted bg, badge shows.
  - **In other half** (`in-other-half`): `opacity: 0.35`, `pointer-events: none` — cannot be assigned to the opposite team.
- **Click behavior (`assignPokemon(id)`):**
  - If already in the current half → remove it (toggle off), slot becomes empty.
  - If not yet assigned → place in the active slot (or the first empty slot in the current half).
  - After placing, auto-advance `activeSlotIdx` to the next empty slot in the same half, then the other half, then wrap.
  - Re-render roster and party slots.

**Party Panel:**

Title row: "PARTY SETUP" label + small hint "Tap slot, then pick Pokémon".

Two half-sections (First Half and Second Half):
- **First Half label:** gold (`#f0c060`)
- **Second Half label:** blue (`#88aaff`)

Each half has:
- 4 party slots in a 4-column grid (`.slots-row`).
- A "filled stars" progress bar (4 stars below the slot row, filled count = number of Pokémon assigned to that half).

**Party slot (`.party-slot`):**
- Square with `aspect-ratio: 1`.
- **Empty:** dashed `rgba(255,255,255,0.15)` border, `+` icon.
- **Filled:** solid `rgba(201,149,42,0.5)` border, gold-tinted bg. Shows the Pokémon's sprite. A small red ✕ badge appears on hover/touch in the top-right corner → calls `removeSlot(half, idx)`.
- **Active slot** (the slot currently accepting assignment): gold border + `box-shadow: 0 0 8px rgba(201,149,42,0.3)`.
- Clicking a slot calls `selectSlot(half, idx)`, updating `activeHalf` and `activeSlotIdx`, then re-renders.

**Bottom button row:**
- **Preset button** (flex 1): "AUTO FILL" or similar — fills with sensible defaults. *(Not fully implemented in source; Replit AI should implement: fill First Half with the top 4 Pokémon by level, Second Half with the next 4.)*
- **Start button** (flex 2): gold gradient. "ENTER THE RIFT ▶". Calls `startChallenge()`. Should be disabled (or show a warning) if no Pokémon are selected at all.

---

## 6. Battle Screen (Full-Screen Modal)

`#modal-battle` is a `position: fixed; inset: 0` overlay at `z-index: 300`. It contains a `.battle-screen` flex column that fills the viewport (max-width 480 px, centered).

When opened: the team modal closes, `startChallenge()` builds the battle state, then `initBattleScreen()` renders everything.

### 6.1 Battle State Object
```js
battle = {
  floorIdx,          // index into FLOOR_DATA
  chamberIdx,        // 0-based (currently always 0)
  enemies: [],       // deep copies of CHAMBER_1_ENEMIES with runtime .hp and .status
  enemyIdx,          // which enemy in the wave is active (0 = Bulbasaur, 1 = Ivysaur, 2 = Venusaur)
  playerParty: [],   // [{poke, hp, maxHp, moves, status, fainted}]
  playerIdx,         // which player Pokémon is active
  turn,              // increments each full round
  phase,             // 'player' | 'animating' | 'result'
}
```

### 6.2 Battle Background
`#battle-bg-img` is an `absolutely positioned` div with `background-size: cover`, `background-position: center top`, `opacity: 0.85`, `filter: saturate(0.85) brightness(0.75)`. It transitions opacity over 1 s.

The background image is chosen by priority:
1. `CHAMBER_IMAGES[floorId][chamberIndex]` (per-chamber override)
2. `FLOOR_IMAGES[floorId]` (floor-wide fallback)
3. No image (none)

A gradient overlay `(.battle-bg-overlay)` fades the image to dark at the bottom (transparent → transparent at 60% → `rgba(10,6,18,0.55)` at 85% → `rgba(10,6,18,0.8)` at 100%).

### 6.3 Corruption Particle System
`#corruption-particles` is an absolute inset div. On battle init, `spawnParticles()` creates 18 `<div class="cp">` elements:
- Random size 2–7 px, circular.
- Random horizontal position 10–90% from left.
- Random starting vertical position 0–60% from bottom.
- Color randomly either `#8b00ff` or `#bf5fff`.
- Some have `filter: blur(2px)`.
- Animation `cp-float` (linear, infinite): floats up ~140 px, fades in then out, over 3–8 s with a random delay up to 4 s.

### 6.4 Top HUD Bar (`.battle-hud-top`)
Horizontal flex row, dark gradient from top, z-index 10:
- **Floor tag** (flex 1): "Floor X · Chamber 1" — Cinzel 10 px, gold, 2 px letter-spacing.
- **Turn tag**: "TURN N" — Cinzel 10 px, corrupt-light, bordered pill. Updates each turn.
- **Flee button**: "FLEE" — red tinted, Cinzel 10 px. Calls `handleFlee()` → `fleeBattle()` → shows the result overlay with flee message and no rewards.

### 6.5 Battle Field (Visual)
`.battle-field` is absolutely positioned at the bottom half of the screen (`height: 55%`, z-index 1, no pointer events, `perspective: 200px`).

**Enemy vortex** (`.vortex-enemy`): Large glowing ellipse (`150 × 60 px`), centered horizontally at 12% from bottom. Purple radial gradient + strong purple box-shadow. `rotateX(70deg)` for perspective. Two spinning rings via `::before` and `::after`:
- `::before`: solid ring, spins clockwise `vortex-ring-spin` (1.6 s).
- `::after`: dashed ring, spins counter-clockwise `vortex-ring-rev` (2.4 s).
- Parent pulses via `vortex-pulse` animation (2 s, scale + opacity).

**Player vortex** (`.vortex-player`): Smaller golden ellipse (`80 × 32 px`), positioned top-right (6% from right, 8% from top of field div). Same two-ring setup but gold colored, slower spin.

### 6.6 Enemy Zone (`.battle-enemy-zone`)
Positioned near the top of the screen, flex row, z-index 5.

**Enemy Info Card (left, flex 1):**
- Dark bg, purple border, blur backdrop, slides in from left on render.
- "CORRUPTED" badge (Cinzel 7 px, corrupt-light).
- Enemy name (Cinzel 13 px 700, `#e8d0ff`) + Level ("Lv.XX", corrupt-light).
- HP bar: track `rgba(255,255,255,0.08)`, fill purple gradient (`#6600cc → #aa44ff`). Turns red when HP < 25% (`hp-low` class).
- HP text: "XX / YY" below the bar.

**Enemy Sprite (right):**
- `#enemy-sprite-wrap`: 120 × 120 px container, relative positioning.
- `#enemy-canvas`: an `<img>` (not a canvas despite the variable name) showing the animated front sprite from Showdown: `https://play.pokemonshowdown.com/sprites/ani/{spriteName}.gif`. Falls back to PokéAPI static PNG on error.
- **Corrupted eye overlay:** Two absolutely-positioned purple glow orbs (`enemy-eye-left`, `enemy-eye-right`), 10 × 10 px circles, `background: #8b00ff`, `box-shadow: 0 0 6px 2px rgba(160,0,255,0.5)`, animation `bubbleRise` (floats up 70 px and fades, 1.5–2.5 s looping). Coordinates are looked up per sprite in `EYE_COORDS`. If sprite not in the table, defaults to bulbasaur coords.
- **Hit animation:** class `enemy-hit` (applied for 550 ms on damage) — flashes white/translucent.
- **Faint animation:** class `enemy-faint` — fades/drops the sprite.

### 6.7 Player Zone (`.battle-player-zone`)
Flex row, z-index 5, bottom portion of screen.

**Player sprite wrap** (absolute positioned):
- `left: calc(50% - 80px)`, `transform: translateX(-50%)`, `bottom: calc(28% + 10px)`.
- 80 × 80 px.
- `slideInRight` animation on render.
- Contains:
  - `.player-shadow`: oval dark blurred ellipse at the feet.
  - `#player-sprite`: 75 × 75 px `<img>`, back-facing Showdown GIF: `https://play.pokemonshowdown.com/sprites/ani-back/{pokemonName.toLowerCase()}.gif`. Falls back to PokéAPI back sprite.
- `player-hit` class: red flash animation for 550 ms when taking damage.
- `player-faint` class: faint/drop animation.

**Player Info Card (right, flex 1):**
- Dark bg, gold border, blur backdrop, slides in from right.
- Pokémon name (Cinzel 13 px 700, gold-light) + Level.
- HP bar: green gradient fill (`#22cc66 → #44ffaa`). Turns red when < 25%.
- HP text.
- **Party Queue** (`#party-queue`): Small row of circular icons for every Pokémon in `playerParty`:
  - Active Pokémon: gold border + gold glow.
  - Fainted: grayscale, 0.4 opacity, red-ish border.
  - Non-active, alive: normal gold-dim border.
  - Each icon is 24 × 24 px circle with the PokéAPI sprite inside.

### 6.8 Dialogue Box (`.battle-dialogue-box`)
Dark nearly-opaque box, gold border, blur. Minimum height 52 px. A horizontal gold gradient line decorates the top edge.

`#dialogue-text`: Crimson Pro 15 px, text-main. Supports HTML (bold move names with `<strong>`).

When `showNext = true`: a blinking gold cursor `|` appears after the text. The `#battle-next-wrap` button (animated bouncing `▶`) is shown. Clicking it calls `advanceBattle()` which fires the stored `dialogueCallback`.

When `showNext = false`: the callback fires automatically after 1200 ms.

### 6.9 Action Menu (`.battle-action-menu`)
Shown during `phase === 'player'`. Flex row: a 2×2 move grid on the left and side buttons on the right.

**Move grid (`.move-grid`):**
Each of the 4 `.move-btn` buttons shows:
- Move name (Cinzel 10 px 600).
- Type badge with colored background (from `.type-{type}` CSS class — each type has its own color defined in CSS).
- PWR: XX | ACC: XX% stats row.
- If PP = 0: button is `disabled` and `opacity: 0.4`.

Clicking a move button calls `playerMove(moveIdx)`.

**Side buttons (`.action-side-btns`):**
- **Bag** 🎒 button: "BAG" label. *(Not fully implemented — should show items or display "No items available.")*
- **Swap** 🔄 button: "SWAP" label. Calls `openSwapMenu()`.

### 6.10 Swap Menu (`.battle-swap-menu`)
Replaces the action menu when swap is requested (also triggers automatically when current Pokémon faints).

A 2-column grid of swap buttons, one per Pokémon in `playerParty`:
- Shows PokéAPI sprite (32 × 32 px), name, and a mini HP bar (40 px wide, 4 px tall, green fill).
- **Active Pokémon:** highlighted gold border, disabled.
- **Fainted Pokémon:** `opacity: 0.35`, disabled.
- Clicking a valid Pokémon calls `swapTo(idx)`.

**Swap logic (`swapTo`):**
- If the swap is voluntary (mid-battle, not because of a faint): the enemy gets a **free attack turn** after the swap dialogue.
- If swapping because current Pokémon fainted: no free enemy turn.
- Dialogue: "Go, {name}!" appears, then the appropriate next step.

A "Cancel" button at the bottom (only shown for voluntary swaps) calls `closeSwapMenu()` returning to the action menu.

### 6.11 Damage Floater (`#dmg-floater`)
A single absolutely-positioned `<div>` used for all damage numbers.
- Cinzel 26 px 800.
- Player attacking enemy: red (`#ff4466`), appears at `left: 55%, top: 28%`.
- Enemy attacking player: yellow (`#ffcc44`), appears at `left: 25%, top: 52%`.
- Animation `dmg-float`: scales from 1.2 → 0.8, translates up 50 px, fades from 1 → 0, over 1.2 s. Applied by toggling class `.show` (uses `offsetWidth` trick to force reflow for re-triggering).

---

## 7. Combat System

### 7.1 HP Calculation
Player Pokémon HP is calculated from their level:
```js
maxHp = Math.floor(30 + level * 3.5)
```
Enemy Pokémon have explicit `maxHp` values in `CHAMBER_1_ENEMIES`.

### 7.2 Damage Formula
```js
function calcDamage(power, attackerLv, defenderLv, typeBonus = 1) {
  const base = Math.floor((attackerLv * 2 / 5 + 2) * power / 50 + 2);
  const variance = 0.85 + Math.random() * 0.15;   // 85%–100% roll
  return Math.max(1, Math.floor(base * typeBonus * variance));
}
```
This is a simplified Gen 1-style formula. Status moves (`power = 0`) skip this and go straight to effect logic.

### 7.3 Type Effectiveness Chart
```js
const chart = {
  fire:     { grass:2, ice:2, water:0.5, fire:0.5, dragon:0.5 },
  water:    { fire:2, ground:2, rock:2, water:0.5, grass:0.5, dragon:0.5 },
  grass:    { water:2, ground:2, rock:2, grass:0.5, fire:0.5, dragon:0.5, flying:0.5 },
  electric: { water:2, flying:2, ground:0, electric:0.5, dragon:0.5 },
  psychic:  { fighting:2, poison:2, dark:0, psychic:0.5 },
  shadow:   { normal:1.5, grass:1.5, fire:1.5, water:1.5 },  // Corrupted type bonus
  ghost:    { ghost:2, psychic:2, normal:0, dark:0.5 },
  ice:      { dragon:2, grass:2, flying:2, ground:2, fire:0.5, water:0.5, ice:0.5 },
  dragon:   { dragon:2, electric:0.5, fire:0.5, water:0.5, grass:0.5 },
  dark:     { psychic:2, ghost:2, dark:0.5, fighting:0.5, fairy:0.5 },
};
// Unspecified matchups return 1× (neutral)
```
Effectiveness messages:
- `≥ 2×` → "It's super effective!"
- `≤ 0.5×` → "It's not very effective..."
- `= 0` → "It had no effect!"

### 7.4 Turn Flow
**Player turn:**
1. `battle.phase` must be `'player'` or the move button click is ignored.
2. Phase set to `'animating'`.
3. Action menu hides.
4. PP decremented by 1.
5. If `power > 0` (damage move):
   - Dialogue: "{name} used **{move}**! [effectiveness text]" (no next button, auto-advances after 900 ms).
   - After 900 ms: `shakeScreen()` + `showDamageNumber()` + `enemy-hit` class for 550 ms + `updateEnemyHp()`.
   - After additional 700 ms: check `enemy.hp <= 0` → `enemyFainted()`, else `enemyTurn()` after 600 ms.
6. If `power = 0` (status move):
   - Apply effect immediately, show dialogue with next button, advance to `enemyTurn()`.

**Status effects (player moves):**
- `heal`: restore 50% of player's `maxHp`.
- `sleep`: set `enemy.status = 'sleep'`.
- `atkDown`: display message (stat reduction is display-only, not currently applied to damage formula — Replit AI should implement the actual stat modifier).
- `accDown`: display message (same note).

**Enemy turn (`enemyTurn()`):**
1. **Sleep check:** if `enemy.status === 'sleep'`, display "X is fast asleep..." with next button. 40% chance to wake up (`enemy.status = null`). Turn increments, return to player.
2. **Move selection:** prefer attack moves; 25% chance to use a status move if available. Pick randomly from eligible moves. Decrement PP.
3. Dialogue: "{enemy} used **{move}**!" (auto-advances after 900 ms).
4. If damage move: calculate damage → `shakeScreen()` + `showDamageNumber()` + `player-hit` for 550 ms + `updatePlayerHp()`.
5. After 700 ms: check `pl.hp <= 0` → `playerFainted()`, else increment turn, set phase to `'player'`, show action menu.
6. If status move: apply effect:
   - `heal`: enemy recovers 30% of `maxHp`.
   - `leech`: set `pl.status = 'leech'` (display-only).
   - `sleep`: set `pl.status = 'sleep'` (display-only; Replit AI should implement: on player's next turn, display "X is asleep!" with 40% wake chance, skip player action).
   - Other: generic message.

**Enemy status moves against player (in current code):**
- `leech`: "X was seeded!" — sets `pl.status = 'leech'` (leech damage per turn not yet implemented).
- `sleep`: "X fell asleep!" — sets `pl.status = 'sleep'` (sleep skip not yet implemented for player).

> **Replit AI task:** Implement leech (drain HP each enemy turn), player sleep (skip turn with wake chance), and stat modifiers for atkDown/accDown/accDown.

### 7.5 Screen Shake (`shakeScreen()`)
Removes and re-adds `.shake` class on `#battle-screen`. CSS: `@keyframes shake` (rapid translateX oscillation ±6 px, 0.5 s). Uses `offsetWidth` trick to force reflow.

### 7.6 Enemy Wave System
`CHAMBER_1_ENEMIES` is an array of 3 enemies: Bulbasaur (Lv35, 110 HP), Ivysaur (Lv42, 140 HP), Venusaur (Lv50, 200 HP).

When `enemyFainted()`:
- Sprite plays faint animation.
- Dialogue: "The Corrupted {name} was defeated!"
- `battle.enemyIdx++`
- If `enemyIdx >= enemies.length` → all enemies cleared → `showVictory()`.
- Else → dialogue "A Corrupted {nextName} appeared!" → `renderEnemy()` → show actions.

### 7.7 Player Faint & Forced Swap
When `playerFainted()`:
- Sprite plays faint animation.
- Mark `pl.fainted = true`.
- Re-render party queue (icon becomes gray).
- Check for any surviving Pokémon:
  - **None left** → `showDefeat()`.
  - **Survivors exist** → `openSwapMenu()` (cancel button hidden, only valid Pokémon selectable).

### 7.8 Victory (`showVictory()`)
Shows `#battle-result-overlay` (absolute inset, dark blurred overlay, z-index 60). Contents:
- Icon: ✨
- Title: "Victory!" (Cinzel 22 px 800, gold-light, glowing text-shadow)
- Subtitle: "Floor X · Chamber 1 Cleared"
- Reward chips: one chip per reward in `FLOOR_DATA[floorIdx].rewards` — shows icon + name + qty.
- A "CONTINUE" button: calls `closeBattle()` and should update the floor's star count / status.

### 7.9 Defeat (`showDefeat()`)
- Icon: 💀
- Title: "Defeated"
- Subtitle: "All Pokémon fainted..."
- Message: "Try again with a different team."
- A "RETREAT" button: calls `closeBattle()`.

### 7.10 Flee (`fleeBattle()`)
- Icon: 🏃
- Title: "Fled!"
- Subtitle: "You escaped the Rift."
- No rewards.
- A close button: calls `closeBattle()`.

### 7.11 `closeBattle()`
Removes `.open` from `#modal-battle`, hides it, hides the result overlay. Returns user to the Tower screen.

---

## 8. Data Definitions

### 8.1 FLOOR_DATA (12 entries)
Each floor has:
```js
{
  id: 1–12,
  name: 'string',                // Thematic name, e.g. "Meadow Trial"
  status: 'cleared'|'active'|'locked',
  stars: 0–3,                    // Total stars for the whole floor (0–9 possible? Currently 0–3 stored)
  disorder: 'HTML string',       // Uses <span class="first"> and <span class="second">
  chambers: [
    { name: 'Chamber 1', stars: 0–3 },
    { name: 'Chamber 2', stars: 0–3 },
    { name: 'Chamber 3', stars: 0–3 },
  ],
  rewards: [
    { icon: 'emoji', name: 'string', qty: '×N' },
    ...
  ]
}
```

### 8.2 POKEMON_ROSTER (24 Pokémon)
```js
{ id: <pokedex number>, name: 'string', level: number, type: 'string' }
```
Types present: Fire, Water, Grass, Electric, Dragon, Ghost, Ice, Psychic, Dark, Normal, Fighting, Rock, Ground.

### 8.3 Player Moves (`PLAYER_MOVES_BY_TYPE`)
Keyed by type string. Each type has 4 moves:
```js
{ name, type, power, pp, maxPp, effect? }
```
`effect` is optional; values: `'heal'`, `'sleep'`, `'accDown'`. Power 0 = status move.

### 8.4 Enemy Moves
Same structure. Enemy-specific effects also include `'leech'` and `'atkDown'`.

### 8.5 CHAMBER_IMAGES
```js
{ [floorId]: { [chamberIndex_0based]: 'imageUrl' } }
```
Override per-chamber background. Falls back to `FLOOR_IMAGES[floorId]`.

### 8.6 FLOOR_IMAGES
`{ [floorId]: 'imageUrl' }` — hosted on ibb.co CDN.

### 8.7 TYPE_COLORS
`{ TypeName: '#hexColor' }` — used to color Pokémon names in the roster and type badges on move buttons.

---

## 9. Missing / Incomplete Features (Replit AI TODO)

The following features are referenced in the UI but not yet implemented:

1. **Party tab, Ranks tab, Rewards tab:** Currently placeholder nav buttons. Each needs its own screen/view.
2. **Auto Fill (Preset) button:** In team select, should auto-fill both halves with top Pokémon by level.
3. **Locked floor enforcement:** Floors with `status: 'locked'` should have a disabled Enter button and cannot be challenged.
4. **Star persistence:** After winning a chamber, update `FLOOR_DATA[floorIdx].chambers[chamberIdx].stars` and the floor's total stars. Persist to `localStorage`.
5. **Multi-chamber progression:** Currently only Chamber 1 is implemented. After clearing Chamber 1, transition to Chamber 2 with different enemies, then Chamber 3, then award the floor reward.
6. **Floor unlock logic:** When all 3 chambers of a floor are cleared (≥ 6 total stars), mark the next floor as `'active'`.
7. **Player sleep status:** When `pl.status === 'sleep'`, on player's turn show "X is asleep!" and skip the action, with 40% wake chance.
8. **Leech seed damage:** Each enemy turn where `pl.status === 'leech'`, drain 1/8 of player's maxHp and add to enemy's HP (capped at maxHp).
9. **Stat modifiers (atkDown, accDown):** Track attack and accuracy multipliers per combatant; apply in damage and hit-chance calculations.
10. **Accuracy miss:** Use the `acc` field on moves and apply random miss rolls.
11. **Bag / Items:** Either implement usable items or show "No items" when the Bag button is tapped.
12. **Season timer:** The season bar shows static text; hook it up to a real or simulated countdown to the 16th of the next month.
13. **Result screen → floor update:** `closeBattle()` on victory should re-render the floor banners with updated stars.
14. **Multiple floors' enemy data:** Currently only Floor 1 Chamber 1 has enemy data (`CHAMBER_1_ENEMIES`). Each floor/chamber needs its own enemy arrays.

---

## 10. Animation Summary

| Name | Target | Effect |
|------|--------|--------|
| `pulse-glow` | Header emblem | Drop-shadow 8→20 px gold, 3 s infinite |
| `fadeUp` | Floor banners on load | translateY 20→0, opacity 0→1, 0.5 s |
| `slideInLeft` | Enemy info card | translateX -20→0, opacity 0→1, 0.4 s |
| `slideInRight` | Player info card + sprite | translateX 20→0, opacity 0→1, 0.4–0.5 s |
| `cp-float` | Corruption particles | Float up 140 px, fade in/out, 3–8 s |
| `vortex-ring-spin` | Vortex `::before` | `rotate(360deg)`, 1.6–1.9 s linear |
| `vortex-ring-rev` | Vortex `::after` | `rotate(-360deg)`, 2.4–2.8 s linear |
| `vortex-pulse` | Vortex base ellipse | Opacity + scale pulse, 2–2.5 s |
| `cursor-blink` | Dialogue cursor | Step-end blink, 0.7 s |
| `next-bounce` | ▶ next button | translateX 0→4 px, 0.6 s alternate |
| `dmg-float` | Damage number | Scale 1.2→0.8, translateY -50 px, fade, 1.2 s |
| `shake` | `#battle-screen` | translateX ±6 px oscillation, 0.5 s |
| `bubbleRise` | Corrupted eye orbs | Float up 70 px, fade, 1.5–2.5 s |
| `enemy-hit` / `player-hit` | Sprites on damage | Flash (white or red translucent), 550 ms |
| `enemy-faint` / `player-faint` | Sprites on faint | Drop + fade |
| `resultPop` | Result card | scale 0.7→1 + opacity 0→1, cubic-bezier spring |
| `fadeIn` | Result overlay | opacity 0→1, 0.5 s |

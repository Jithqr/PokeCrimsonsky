# Pokémon Crimson Rift — Replit Feature Prompt
## "Make it exactly like Genshin Impact's Spiral Abyss"

---

## CONTEXT: What the game already has

This is a single-file HTML/CSS/JS Pokémon game called **Pokémon Crimson Rift** — a Genshin Impact Spiral Abyss clone. It currently has:

- A floor grid (12 floors split into Outer Halls, Inner Sanctum, Celestial Spire, Apex Realm)
- Floor banners with cleared/active/locked states and star ratings
- A floor detail modal showing chamber info and a "Field Effect" (like Genshin's Ley Line Disorders)
- A team select screen where you pick 6 Pokémon split into 1st Half (3 slots) and 2nd Half (3 slots)
- A turn-based battle screen with HP bars, move buttons (4 moves), enemy corrupted sprites with purple flame effects
- Dialogue box, damage floaters, hit/faint animations, screen shake
- Swap menu when a Pokémon faints
- Victory/Defeat/Flee result screens with reward chips
- Season bar showing season name and reset timer
- Bottom navigation bar

---

## FEATURES TO ADD — Detailed Specifications

---

### 1. REAL COUNTDOWN RESET TIMER

**What Genshin does:** The Abyss resets every 1st and 16th of the month at 4:00 AM server time. The season bar shows a live countdown like "Resets in 11d 14h 32m".

**What to build:**
- Calculate the next reset date: whichever comes first — the 1st or 16th of the current/next month at 04:00 UTC
- Display a live countdown in the format: `Resets in Xd Xh Xm` that ticks down every minute (update with `setInterval`)
- When the timer hits 0, trigger a **Season Reset**:
  - All floor star progress resets to 0
  - All floors revert to locked/active states (Floor 1 stays active, Floors 2+ locked)
  - Increment the season number (Season I → Season II → etc.)
  - Show a brief full-screen overlay: `"Season III — Legendary Ascent — Begins Now"` that fades out after 3 seconds
- Save the season number and last-reset timestamp to `localStorage` so it persists on page refresh

---

### 2. SPLIT PARTY SYSTEM (1st Half / 2nd Half) — EXACTLY LIKE GENSHIN

**What Genshin does:** Before entering, you split your roster into two teams of up to 4 characters. Team 1 fights Chamber 1 first half and Chamber 2 first half and Chamber 3 first half. Team 2 fights all second halves. Each character can only be on ONE team. HP/cooldowns carry over between chambers.

**What to build:**

**Team Select Screen changes:**
- Increase party slots from 3 per half to **4 per half** (so 8 total Pokémon selected, 4 for 1st half, 4 for 2nd half)
- Each half section should be visually labeled: `"FIRST HALF TEAM"` (gold border) and `"SECOND HALF TEAM"` (blue border)
- When a Pokémon is assigned to the 1st half team, it becomes greyed out and unselectable for the 2nd half team (and vice versa) — the `.in-other-half` CSS class already exists, just enforce this logic properly
- Add a visual counter under each half: `"3 / 4 selected"` that updates as you pick
- The `START` button should be disabled and show `"Select 4 for each half"` until both halves have exactly 4 Pokémon

**Battle flow changes:**
- Each floor has 3 chambers. Each chamber has a 1st half and a 2nd half.
- **Chamber structure:**
  - Chamber 1, 1st half → use Team 1 → fight 1 corrupted Pokémon boss
  - Chamber 1, 2nd half → use Team 2 → fight 1 corrupted Pokémon boss
  - Chamber 2, 1st half → use Team 1 (same HP they had after Chamber 1!) → fight 1 corrupted boss
  - Chamber 2, 2nd half → use Team 2 (same HP) → fight 1 corrupted boss
  - Chamber 3, 1st half → use Team 1 → fight 1 corrupted boss
  - Chamber 3, 2nd half → use Team 2 → fight 1 corrupted boss
- **HP carries over** — Pokémon HP does NOT restore between chambers. Only the current active Pokémon changes when one faints. Show a clear "Chamber X Complete — proceeding to next chamber" transition screen between chambers.
- Add a **Chamber Progress HUD** at the top of the battle screen: `Floor 9 · Chamber 2 · 1st Half` (currently it just shows floor)

---

### 3. STAR RATING SYSTEM PER CHAMBER — EXACTLY LIKE GENSHIN

**What Genshin does:** Each chamber awards 0–3 stars based on how fast you clear it (measured by a timer). Each half awards 0–3 stars. So each chamber = max 6 stars, each floor = max 18 stars (3 chambers × 6 stars). The floor banner shows total stars earned out of 9 (displayed as 3 pairs of ★★★).

**What to build:**

**Timer system:**
- When a half begins (enemy appears), start a hidden countdown timer
- Each half has a time limit (suggested: 90 seconds for early floors, 75s for mid, 60s for late floors — store in the floor data)
- Star award per half based on time remaining when enemy is defeated:
  - 3 stars: cleared in top third of time limit (e.g. within 30s for a 90s timer)
  - 2 stars: cleared in middle third
  - 1 star: cleared in bottom third (barely made it)
  - 0 stars: time ran out → auto-defeat that half

**Timer UI:**
- Show a thin progress bar at the very top of the battle screen that drains from full to empty in the time limit
- Color it: green → yellow → red as time runs low
- At 10 seconds remaining, make it pulse red and add a tick sound effect (use Web Audio API beep — no external files needed)
- When time expires: dialogue says `"Time's up!"`, force-defeat all remaining player Pokémon, show 0 stars for that half

**Star display:**
- After each half ends (victory or time-out), show a star award animation: 3 empty stars, then fill them one by one with a glow effect and a rising animation
- Stars are gold ★ when earned, dark ☆ when not earned
- Store stars per half in localStorage: `floor_9_chamber_2_half_1_stars = 2`
- On the floor detail modal, show each chamber's stars: `Chamber 1: ★★★ ★★☆` (first half 3 stars, second half 2 stars)
- On the floor banner, show total floor stars out of 9 (e.g. `7 / 9 ★`)

---

### 4. DIVERGENCE / LEY LINE DISORDER EFFECTS (ACTIVE IN BATTLE)

**What Genshin does:** Each floor has a "Ley Line Disorder" — a passive effect that changes battle rules. E.g. "All characters deal 75% less Hydro DMG" or "Shielded enemies take 50% increased DMG". These actually affect gameplay.

**What to build:**
- Each floor in the `FLOOR_DATA` array already has a disorder/field effect description. Now make it **actually affect the battle calculations**.
- Add a `disorder` object to each floor with:
  ```js
  disorder: {
    label: "Corrupted Ground",
    description: "Grass-type moves deal 50% bonus damage",
    effect: { type: "type_boost", moveType: "grass", multiplier: 1.5 }
  }
  ```
- Supported disorder effect types to implement:
  - `type_boost` — a Pokémon type deals X% more/less damage
  - `regen` — all Pokémon (player or enemy) recover X HP at the start of each turn
  - `residual` — all Pokémon take X damage at end of each turn (like burn for everyone)
  - `speed_boost` — player moves always go first regardless of speed (or enemy always goes first)
  - `shield` — enemy starts with a damage shield that must be broken before HP can drop
- Show the active disorder as a small banner at the top of the battle screen (e.g. a gold ribbon saying "⟡ Corrupted Ground: Grass +50%")
- Apply the disorder effect in the damage calculation function

---

### 5. INTER-FLOOR PROGRESSION & UNLOCK SYSTEM

**What Genshin does:** Floors unlock sequentially. You must earn at least 1 star on Floor N to unlock Floor N+1. The first few floors (1–8) are always unlocked if you've beaten the story.

**What to build:**
- Floors 1–3 (Outer Halls) are always unlocked from the start
- Floor 4 unlocks when Floor 3 has at least 1 star total
- Floor 5 unlocks when Floor 4 has at least 1 star
- Continue this chain all the way to Floor 12
- When a floor is locked, the banner shows a padlock icon in the center instead of the floor number, and clicking it shows a toast: `"Clear Floor X to unlock"`
- When a floor first becomes unlocked (you just earned the needed stars), play a brief unlock animation: the banner glows gold, the padlock dissolves, and the floor number fades in

---

### 6. FLOOR COMPLETION REWARDS & INVENTORY

**What Genshin does:** First-time full clear (9/9 stars) of each floor gives a one-time reward of Primogems (premium currency). Partial stars give lesser rewards. Rewards reset with the season.

**What to build:**

**Currency system:**
- Add a currency called **Rift Shards** (Primogem equivalent) — show it in the top right of the main screen with a crystal icon 💎 and a number
- Reward table per floor:
  - 3 stars total (out of 9): 50 Rift Shards
  - 6 stars: 100 Rift Shards
  - 9 stars (full clear): 150 Rift Shards + a special badge icon on the floor banner
- Rewards are given once per season per star milestone (tracked in localStorage)
- When a reward is earned, show an animated pop-up: crystal icon rains from the top of the screen, counter increments with a satisfying tick animation

**Simple inventory:**
- Add an "Inventory" tab in the bottom nav (bag icon)
- Show: current Rift Shards balance, season badges earned, total stars across all floors
- Show a history list: "Floor 9 — Full Clear — 150 💎 — Season II"

---

### 7. CORRUPTED BOSS ROSTER — MULTIPLE ENEMIES PER HALF

**What Genshin does:** Some chambers have a wave of enemies (2–3 monsters), not just 1. You fight them sequentially. Later floors might have 2 strong enemies instead of 1.

**What to build:**
- Update the floor data so some chambers have 2 corrupted enemies per half (especially Floors 7–12)
- Add a **wave indicator** in the battle HUD: `Enemy 1 / 2` shown near the enemy HP bar
- When the first enemy faints, do a brief "Next enemy incoming!" dialogue, spawn particles, then bring in the second enemy at full HP
- The second enemy should be visually different (different Pokémon sprite) and have its own moves
- Example for Floor 9, Chamber 3, 2nd Half: `[Corrupted Dragonite, Corrupted Garchomp]`

---

### 8. STATUS EFFECT ICONS & VISUAL INDICATORS

**What Genshin does:** Characters show small icons for status effects (frozen, burning, electro-charged, etc.) near their HP bar.

**What to build:**
- Currently the battle system has status values (sleep, leech, burn, etc.) stored in `pl.status` and `enemy.status` but they're only shown in dialogue text
- Add status effect icon badges that appear next to the name on the HP card:
  - 💤 Sleep, 🔥 Burn, 🌿 Leech Seed, ❄️ Freeze, ⚡ Paralysis, ☠️ Poison
- Icons should pulse/animate while the status is active
- When a status is cured or wears off, the icon fades out with a small "poof" animation

---

### 9. BATTLE SPEED SETTING

**What Genshin does:** No explicit speed setting, but battles are snappy. Add this as a QoL feature.

**What to build:**
- Add a gear icon ⚙️ button inside the battle HUD top bar
- Tapping it cycles through: `1× → 1.5× → 2× → back to 1×`
- At 2×: all `setTimeout` delays are halved, dialogue auto-advances faster, animations play at double speed (use CSS `animation-duration` multiplier via a CSS variable `--speed-mult`)
- Show current speed as a small badge: `2×` next to the gear icon
- Save preference to localStorage

---

### 10. POST-BATTLE SUMMARY SCREEN

**What Genshin does:** After clearing a full floor (all 3 chambers both halves), it shows a summary screen with stars earned per chamber, total stars, rewards received, and options to "Retry" or "Return".

**What to build:**
- After the final half of Chamber 3 is cleared (or failed), show a full **Floor Summary Screen** that slides up over the battle screen:
  - Floor name and number at the top
  - A table showing: Chamber 1 Half 1 ★★★ | Chamber 1 Half 2 ★★☆ | etc. for all 6 halves
  - Total stars: `X / 9` with animated fill (stars pop in one by one)
  - Rewards earned this run (Rift Shards)
  - New best score highlight if it improved from last attempt
  - Two buttons: `"RETRY"` (go back to team select for same floor) and `"RETURN"` (go back to floor grid)
- If the total stars improved since last attempt, show: `"New Record! +X ★"`

---

### 11. BACKGROUND MUSIC TOGGLE

**What Genshin does:** Each Abyss floor has atmospheric music.

**What to build:**
- Use the Web Audio API to procedurally generate a simple looping ambient track (no external files):
  - Dark drone: two sine oscillators detuned slightly, volume low, filtered through a biquad lowpass
  - Occasional high chime: random bell-like tones every 8–15 seconds (a short sine burst with fast attack, slow decay)
- Add a 🔇/🔊 toggle button in the main header that mutes/unmutes
- Music starts muted by default (respect user preference), save toggle state to localStorage
- During battle, shift the drone frequency slightly up to create tension

---

### 12. HAPTIC FEEDBACK (MOBILE)

**What to build:**
- On any button tap, call `navigator.vibrate(10)` (10ms light buzz)
- On taking damage (player hit), call `navigator.vibrate([15, 10, 15])` (double buzz)
- On victory, call `navigator.vibrate([30, 20, 30, 20, 60])` (victory pattern)
- On defeat, call `navigator.vibrate(200)` (long buzz)
- Wrap all calls in `if (navigator.vibrate)` for browser compatibility

---

## DATA STRUCTURE CHANGES NEEDED

Update `FLOOR_DATA` entries to include:

```js
{
  id: 9,
  name: "Forsaken Rift",
  section: "celestial",         // outer / inner / celestial / apex
  unlockStars: 1,               // stars needed on previous floor to unlock
  timeLimit: 75,                // seconds per half
  disorder: {
    label: "Void Surge",
    description: "Dragon-type moves deal 60% bonus damage to all enemies",
    effect: { type: "type_boost", moveType: "dragon", multiplier: 1.6 }
  },
  rewards: [
    { icon: "💎", name: "Rift Shards", qty: 50, starThreshold: 3 },
    { icon: "💎", name: "Rift Shards", qty: 100, starThreshold: 6 },
    { icon: "💎", name: "Rift Shards", qty: 150, starThreshold: 9 },
  ],
  chambers: [
    {
      id: 1,
      name: "The Shattered Gate",
      half1Enemies: [
        { pokeId: 149, name: "Dragonite", level: 85, hp: 280, moves: [...] }
      ],
      half2Enemies: [
        { pokeId: 445, name: "Garchomp", level: 88, hp: 310, moves: [...] },
        { pokeId: 373, name: "Salamence", level: 90, hp: 290, moves: [...] }
      ]
    },
    { id: 2, ... },
    { id: 3, ... }
  ]
}
```

---

## localStorage KEYS TO USE

```
crimson_rift_season          → current season number (integer)
crimson_rift_last_reset      → ISO timestamp of last reset
crimson_rift_rift_shards     → integer currency balance
crimson_rift_floor_{N}_stars → object: { c1h1, c1h2, c2h1, c2h2, c3h1, c3h2 } each 0-3
crimson_rift_floor_{N}_rewards_claimed → object: { stars3, stars6, stars9 } booleans
crimson_rift_speed           → "1" | "1.5" | "2"
crimson_rift_music           → "on" | "off"
```

---

## PRIORITY ORDER (build in this order)

1. Split party system (4+4, HP carry-over between chambers) — core mechanic
2. Star rating system with timer — core scoring
3. Inter-floor unlock chain — core progression
4. Real reset countdown timer — season feel
5. Floor summary screen — polish
6. Disorder effects active in battle — depth
7. Multiple enemies per half wave — variety
8. Status effect icons — visual clarity
9. Post-battle reward pop-up with Rift Shards — reward loop
10. Battle speed toggle — QoL
11. Haptic feedback — mobile feel
12. Background music — atmosphere

---

## STYLE NOTES (keep the existing aesthetic)

- Keep ALL existing CSS variables (`--gold`, `--corrupt`, `--deep`, etc.)
- Keep Cinzel + Crimson Pro fonts
- All new UI elements should use `background: rgba(...)` with `backdrop-filter: blur()`, gold borders `rgba(201,149,42,0.3)`, dark backgrounds `#0a0812`
- New modals follow the same pattern as `.detail-card` and `.team-card`
- Animations should use the same keyframe style (fadeUp, slideInLeft, resultPop)
- All new screens should work at max-width 480px (mobile-first)

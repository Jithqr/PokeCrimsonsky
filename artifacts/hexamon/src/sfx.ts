// Sound system. Plays real PokeRogue assets from /audio/* when available,
// and falls back to a small Web Audio synth so behavior is preserved if a
// file fails to load. Existing call sites (sfx.click, sfx.hit, ...) keep
// the same shape — only the implementations changed.

import {
  playFile,
  playMoveByName,
  _setMuted as assetsSetMuted,
  playCry as assetsPlayCry,
  playMusic as assetsPlayMusic,
  stopMusic as assetsStopMusic,
} from "./audio-assets";

let ctx: AudioContext | null = null;
let muted = false;

function ac(): AudioContext {
  if (!ctx) {
    const W = window as unknown as { AudioContext: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    ctx = new (W.AudioContext || W.webkitAudioContext!)();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = "square", vol = 0.08, when = 0) {
  if (muted) return;
  const a = ac();
  const t0 = a.currentTime + when;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(a.destination);
  o.start(t0); o.stop(t0 + dur);
}

function slide(f1: number, f2: number, dur: number, type: OscillatorType = "square", vol = 0.08) {
  if (muted) return;
  const a = ac();
  const t0 = a.currentTime;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f1, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(a.destination);
  o.start(t0); o.stop(t0 + dur);
}

function noise(dur: number, vol = 0.08, filterFreq = 2000) {
  if (muted) return;
  const a = ac();
  const t0 = a.currentTime;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const filt = a.createBiquadFilter();
  filt.type = "lowpass"; filt.frequency.value = filterFreq;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(filt); filt.connect(g); g.connect(a.destination);
  src.start(t0);
}

function seq(notes: { f: number; d: number; t?: OscillatorType; v?: number; gap?: number }[]) {
  let delay = 0;
  for (const n of notes) {
    const f = n.f, d = n.d, t = n.t ?? "square", v = n.v ?? 0.08;
    setTimeout(() => tone(f, d, t, v), delay);
    delay += (n.gap ?? d * 1000);
  }
}

// Tries the real asset first; if asset playback fails, runs the synth fallback.
function asset(file: string, fallback: () => void, vol = 1) {
  if (muted) return;
  if (!playFile(file, vol)) fallback();
}

export const sfx = {
  setMuted(m: boolean) {
    muted = m;
    assetsSetMuted(m);
  },
  isMuted() { return muted; },

  // UI
  click: () => { /* button click sounds disabled */ },
  menuOpen: () => asset("/audio/ui/menu_open.wav", () => seq([{ f: 660, d: 0.05 }, { f: 990, d: 0.05 }]), 0.6),
  menuBack: () => { /* back-button sounds disabled */ },

  // Combat
  hit: () => asset("/audio/se/hit.wav", () => { noise(0.08, 0.06, 1500); slide(220, 110, 0.1, "square", 0.05); }),
  hurt: () => asset("/audio/se/hit_weak.wav", () => slide(330, 130, 0.18, "square", 0.07)),
  faint: () => asset("/audio/se/faint.wav", () => slide(440, 60, 0.7, "sawtooth", 0.09)),

  // Poké Balls
  ballThrow: () => asset("/audio/se/pb_throw.wav", () => slide(220, 660, 0.15, "triangle", 0.06)),
  ballWobble: () => asset("/audio/se/pb_bounce_1.wav", () => tone(440, 0.08, "square", 0.05)),
  catchSuccess: () => asset("/audio/se/pb_catch.wav", () => seq([{ f: 523, d: 0.12 }, { f: 659, d: 0.12 }, { f: 784, d: 0.12 }, { f: 1047, d: 0.2 }])),
  catchFail: () => asset("/audio/se/pb_rel.wav", () => seq([{ f: 440, d: 0.1 }, { f: 220, d: 0.2, t: "sawtooth" }])),

  // Progress
  levelUp: () => asset("/audio/se/level_up.wav", () => seq([{ f: 523, d: 0.1, t: "triangle", v: 0.1 }, { f: 659, d: 0.1, t: "triangle", v: 0.1 }, { f: 784, d: 0.1, t: "triangle", v: 0.1 }, { f: 1047, d: 0.18, t: "triangle", v: 0.1 }])),
  victory: () => asset("/audio/se/exp.wav", () => seq([{ f: 523, d: 0.12 }, { f: 659, d: 0.12 }, { f: 784, d: 0.12 }, { f: 1047, d: 0.12 }, { f: 1319, d: 0.25 }])),
  trainerVictory: () => asset("/audio/se/shing.wav", () => seq([{ f: 659, d: 0.1, t: "triangle", v: 0.1 }, { f: 784, d: 0.1, t: "triangle", v: 0.1 }, { f: 988, d: 0.1, t: "triangle", v: 0.1 }, { f: 1319, d: 0.25, t: "triangle", v: 0.1 }]), 0.8),
  evolve: () => asset("/audio/se/shine.wav", () => { for (let i = 0; i < 10; i++) setTimeout(() => tone(330 + i * 50, 0.08, "triangle", 0.06), i * 90); }, 0.7),

  // Battle feedback
  superEffective: () => asset("/audio/se/hit_strong.wav", () => { noise(0.12, 0.08, 1800); slide(330, 110, 0.15, "sawtooth", 0.07); }, 0.85),
  notVeryEffective: () => asset("/audio/se/hit_weak.wav", () => { noise(0.05, 0.04, 800); }, 0.6),
  crit: () => asset("/audio/se/sparkle.wav", () => seq([{ f: 1760, d: 0.05, t: "square", v: 0.07 }, { f: 2200, d: 0.07, t: "square", v: 0.07 }]), 0.85),

  // Stat changes
  statUp: () => asset("/audio/se/stat_up.wav", () => seq([{ f: 523, d: 0.06, t: "triangle", v: 0.07 }, { f: 784, d: 0.08, t: "triangle", v: 0.07 }]), 0.7),
  statDown: () => asset("/audio/se/stat_down.wav", () => seq([{ f: 523, d: 0.06, t: "sawtooth", v: 0.07 }, { f: 330, d: 0.1, t: "sawtooth", v: 0.07 }]), 0.7),

  // Health & rewards
  lowHp: () => asset("/audio/se/low_hp.wav", () => { for (let i = 0; i < 3; i++) setTimeout(() => tone(880, 0.08, "square", 0.06), i * 120); }, 0.5),
  heal: () => asset("/audio/se/restore.wav", () => seq([{ f: 660, d: 0.08, t: "triangle", v: 0.07 }, { f: 880, d: 0.08, t: "triangle", v: 0.07 }, { f: 1100, d: 0.12, t: "triangle", v: 0.07 }]), 0.8),
  itemPickup: () => asset("/audio/se/buy.wav", () => seq([{ f: 880, d: 0.06, t: "square", v: 0.06 }, { f: 1320, d: 0.08, t: "square", v: 0.06 }]), 0.7),
  alert: () => asset("/audio/se/danger.wav", () => seq([{ f: 1760, d: 0.06, t: "square", v: 0.07 }, { f: 1320, d: 0.06, t: "square", v: 0.07 }]), 0.7),

  // Move-type generic SFX (kept for older call sites — playMoveSfx below
  // is the preferred entry point because it can use real per-move assets).
  moveNormal: () => { noise(0.05, 0.05, 2500); tone(440, 0.04, "square", 0.05); },
  moveFire: () => { noise(0.25, 0.07, 1200); slide(110, 55, 0.25, "sawtooth", 0.05); },
  moveWater: () => slide(880, 220, 0.3, "sine", 0.07),
  moveGrass: () => { noise(0.15, 0.05, 800); tone(660, 0.1, "triangle", 0.05); },
  moveElectric: () => { for (let i = 0; i < 4; i++) setTimeout(() => tone(1500 + Math.random() * 500, 0.04, "square", 0.06), i * 40); },
  moveIce: () => seq([{ f: 1320, d: 0.06, t: "sine" }, { f: 1760, d: 0.06, t: "sine" }, { f: 2200, d: 0.1, t: "sine" }]),
  movePsychic: () => slide(330, 1320, 0.4, "sine", 0.06),
  moveFlying: () => { noise(0.2, 0.05, 3000); slide(660, 1100, 0.2, "triangle", 0.05); },
  moveGround: () => { noise(0.35, 0.1, 200); slide(110, 40, 0.35, "sawtooth", 0.07); },
  movePoison: () => slide(220, 110, 0.3, "sawtooth", 0.05),
  moveBug: () => { for (let i = 0; i < 5; i++) setTimeout(() => tone(800 + i * 80, 0.03, "square", 0.04), i * 30); },
  moveDragon: () => { noise(0.3, 0.08, 600); slide(220, 660, 0.3, "sawtooth", 0.06); },

  // New helpers for cries and music — re-exported from audio-assets so
  // App.tsx only needs to import from `sfx`.
  playCry: (dexId: number, volMult = 1) => { if (!muted) assetsPlayCry(dexId, volMult); },
  playMusic: (track: string, opts?: { loop?: boolean; volume?: number }) => assetsPlayMusic(track, opts),
  stopMusic: () => assetsStopMusic(),
};

// Move-type lookup + 18-type color palette live in their own module so the
// table can be shared without bloating this file. We re-export them here
// so existing imports from "./sfx" keep working unchanged.
import { TYPE_COLOR, moveTypeOf } from "./lib/move-types";
export { TYPE_COLOR, moveTypeOf };

// Tries to play the real PokeRogue per-move SFX (or a type-grouped one);
// falls back to the synth move sound if no asset is mapped.
export function playMoveSfx(move: string) {
  if (sfx.isMuted()) return;
  const t = moveTypeOf(move);
  if (playMoveByName(move, t)) return;
  const map: Record<string, () => void> = {
    fire: sfx.moveFire, water: sfx.moveWater, grass: sfx.moveGrass,
    electric: sfx.moveElectric, ice: sfx.moveIce, psychic: sfx.movePsychic,
    flying: sfx.moveFlying, ground: sfx.moveGround, poison: sfx.movePoison,
    bug: sfx.moveBug, dragon: sfx.moveDragon, normal: sfx.moveNormal,
  };
  (map[t] ?? sfx.moveNormal)();
}

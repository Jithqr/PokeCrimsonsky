import { useEffect, useRef, useState } from "react";
import logoUrl from "@assets/Adobe_Express_-_file_1777079516654.png";
import bgUrl from "@assets/43_1777079516677.webp";
import { sfx } from "../sfx";

export function SplashLoader({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"loading" | "ready" | "fading">("loading");
  const startedRef = useRef(false);

  useEffect(() => {
    const start = performance.now();
    const duration = 3200;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setPhase("ready");
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  function handleStart() {
    if (startedRef.current) return;
    startedRef.current = true;
    sfx.click();
    setPhase("fading");
    setTimeout(onDone, 500);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase === "ready" && (e.key === "Enter" || e.key === " ")) handleStart();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  return (
    <div
      onClick={phase === "ready" ? handleStart : undefined}
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        zIndex: 9999,
        overflow: "hidden",
        cursor: phase === "ready" ? "pointer" : "default",
        opacity: phase === "fading" ? 0 : 1,
        transition: "opacity 0.5s ease-out",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <style>{CSS}</style>

      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${bgUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          animation: "splashKenBurns 12s ease-in-out infinite alternate",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      <div className="splash-particles" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {Array.from({ length: 22 }).map((_, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${(i * 47) % 100}%`,
              bottom: -10,
              width: 3,
              height: 3,
              background: i % 3 === 0 ? "#ff5566" : i % 3 === 1 ? "#ffbf66" : "#66aaff",
              borderRadius: "50%",
              boxShadow: "0 0 8px currentColor",
              animation: `splashFloat ${6 + (i % 5)}s linear ${i * 0.3}s infinite`,
              opacity: 0.7,
            }}
          />
        ))}
      </div>

      <div
        style={{
          position: "relative",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
        }}
      >
        <img
          src={logoUrl}
          alt="Pokémon Crimson Sky"
          style={{
            maxWidth: "82%",
            maxHeight: "46%",
            imageRendering: "pixelated",
            filter: "drop-shadow(0 6px 16px rgba(255,40,80,0.55))",
            animation: "splashLogoIn 1.1s cubic-bezier(0.2, 1.2, 0.4, 1) both, splashLogoBob 3s ease-in-out 1.1s infinite",
          }}
        />

        <div style={{ flex: 1 }} />

        <div
          style={{
            color: "#fff",
            fontSize: 14,
            letterSpacing: 4,
            textShadow: "2px 2px 0 #1a0010, 0 0 12px rgba(255,80,100,0.5)",
            marginBottom: 14,
            animation: "splashFadeUp 0.8s 0.4s both",
          }}
        >
          {phase === "ready" ? (
            <span className="splash-blink">TAP TO START</span>
          ) : (
            <>
              LOADING<span className="splash-dots">...</span>
            </>
          )}
        </div>

        <div
          style={{
            width: "min(320px, 78%)",
            height: 18,
            background: "rgba(0,0,0,0.55)",
            border: "3px solid #fff",
            borderRadius: 2,
            padding: 2,
            boxShadow: "0 0 16px rgba(255,80,100,0.4), inset 0 0 0 1px rgba(0,0,0,0.7)",
            animation: "splashFadeUp 0.8s 0.5s both",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress * 100}%`,
              height: "100%",
              background: "repeating-linear-gradient(90deg, #ff3b3b 0 8px, #ff5252 8px 12px)",
              transition: "width 0.15s linear",
              boxShadow: "0 0 10px rgba(255,80,80,0.7)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 45%, transparent 55%, rgba(0,0,0,0.25) 100%)",
              pointerEvents: "none",
            }}
          />
        </div>

      </div>
    </div>
  );
}

const CSS = `
@keyframes splashLogoIn {
  0%   { opacity: 0; transform: translateY(-30px) scale(0.6); filter: drop-shadow(0 0 0 transparent) blur(4px); }
  60%  { opacity: 1; transform: translateY(8px) scale(1.06); filter: drop-shadow(0 6px 16px rgba(255,40,80,0.55)) blur(0); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes splashLogoBob {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-6px); }
}
@keyframes splashFadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes splashKenBurns {
  0%   { transform: scale(1.06) translate(0, 0); }
  100% { transform: scale(1.16) translate(-1.5%, -1%); }
}
@keyframes splashFloat {
  0%   { transform: translateY(0) translateX(0); opacity: 0; }
  10%  { opacity: 0.9; }
  100% { transform: translateY(-110vh) translateX(30px); opacity: 0; }
}
.splash-blink { animation: splashBlink 1s steps(2, end) infinite; }
@keyframes splashBlink { 50% { opacity: 0.25; } }
.splash-dots::after {
  content: "";
  display: inline-block;
  animation: splashDots 1.4s steps(4, end) infinite;
  width: 24px;
  text-align: left;
}
@keyframes splashDots {
  0%   { content: ""; }
  25%  { content: "."; }
  50%  { content: ".."; }
  75%  { content: "..."; }
}
`;

import { useEffect, useRef, useState } from "react";
import logoUrl from "@assets/Adobe_Express_-_file_1777079516654.png";
import bgUrl from "@assets/43_1777079516677.webp";
import { sfx } from "../sfx";

export function SplashLoader({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"loading" | "fading">("loading");
  const doneRef = useRef(false);

  useEffect(() => {
    const start = performance.now();
    const duration = 2400;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setProgress(p);
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        if (!doneRef.current) {
          doneRef.current = true;
          setPhase("fading");
          setTimeout(onDone, 600);
        }
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        zIndex: 9999,
        overflow: "hidden",
        cursor: "default",
        opacity: phase === "fading" ? 0 : 1,
        transition: "opacity 0.6s ease-out",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <style>{CSS}</style>

      {/* Background */}
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
          background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)",
        }}
      />

      {/* Floating particles */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {Array.from({ length: 18 }).map((_, i) => (
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

      {/* Content */}
      <div
        style={{
          position: "relative",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
          gap: 0,
        }}
      >
        {/* Logo */}
        <img
          src={logoUrl}
          alt="Pokémon Crimson Sky"
          style={{
            maxWidth: "82%",
            maxHeight: "38%",
            imageRendering: "pixelated",
            filter: "drop-shadow(0 6px 16px rgba(255,40,80,0.55))",
            animation: "splashLogoIn 1.1s cubic-bezier(0.2, 1.2, 0.4, 1) both, splashLogoBob 3s ease-in-out 1.1s infinite",
          }}
        />

        {/* Spinning Pokéball */}
        <div
          style={{
            marginTop: 32,
            marginBottom: 20,
            animation: "splashFadeUp 0.7s 0.5s both",
          }}
        >
          <img
            src="/pokeball-loading.gif"
            alt="Loading"
            style={{
              width: 72,
              height: 72,
              objectFit: "contain",
              animation: "pokeballSpin 1.1s linear infinite",
              filter: "drop-shadow(0 0 12px rgba(255,60,80,0.7))",
            }}
          />
        </div>

        {/* Loading label */}
        <div
          style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: 11,
            letterSpacing: 4,
            textTransform: "uppercase",
            marginBottom: 14,
            animation: "splashFadeUp 0.7s 0.6s both",
          }}
        >
          LOADING<span className="splash-dots" />
        </div>

        {/* Thin progress bar */}
        <div
          style={{
            width: "min(240px, 65%)",
            height: 3,
            background: "rgba(255,255,255,0.12)",
            borderRadius: 2,
            overflow: "hidden",
            animation: "splashFadeUp 0.7s 0.7s both",
          }}
        >
          <div
            style={{
              width: `${progress * 100}%`,
              height: "100%",
              background: "linear-gradient(90deg, #ff3b3b, #ff8c42)",
              transition: "width 0.12s linear",
              boxShadow: "0 0 8px rgba(255,80,80,0.8)",
              borderRadius: 2,
            }}
          />
        </div>
      </div>
    </div>
  );
}

const CSS = `
@keyframes pokeballSpin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
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

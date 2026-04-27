import { GYM_LEADERS, ELITE_FOUR, type NpcTrainer } from "../lib/league-data";

type Props = {
  badges: string[];
  e4Cleared: boolean;
  e4Streak: number;
  onPickGym: (gym: NpcTrainer) => void;
  onStartElite4: () => void;
  onBack: () => void;
};

export default function LeagueScreen({ badges, e4Cleared, e4Streak, onPickGym, onStartElite4, onBack }: Props) {
  const allBadges = badges.length === GYM_LEADERS.length;
  return (
    <div style={pageStyle}>
      <div style={{ position: "sticky", top: 0, zIndex: 1, padding: "12px 14px", background: "#0a0a0a", borderBottom: "1px solid #27272a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} style={backBtn}>← Back</button>
        <div style={{ fontWeight: 800, fontSize: 16 }}>🏆 League</div>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Champion banner */}
        {e4Cleared && (
          <div style={{ ...card, background: "linear-gradient(135deg, #FFD54F, #FF9800)", color: "#000" }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>👑 Champion!</div>
            <div style={{ fontSize: 12 }}>You have cleared the Elite 4 — bask in the glory.</div>
          </div>
        )}

        {/* Badges row */}
        <div style={card}>
          <div style={cardTitle}>Badges Earned: {badges.length} / {GYM_LEADERS.length}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6, marginTop: 6 }}>
            {GYM_LEADERS.map((g, i) => {
              const got = badges.includes(g.id);
              const badgeUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/${i + 1}.png`;
              return (
                <div key={g.id} title={`${g.name}'s Badge`}
                  style={{
                    background: got ? `${g.color}22` : "#0a0a0a",
                    border: "1px solid " + (got ? g.color : "#27272a"),
                    borderRadius: 8, padding: "6px 0",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    minHeight: 44, opacity: got ? 1 : 0.4,
                  }}>
                  <img
                    src={badgeUrl}
                    alt={`${g.name}'s Badge`}
                    style={{
                      width: 32, height: 32, objectFit: "contain",
                      // Grayscale until the badge is earned, then pop in colour.
                      filter: got ? "drop-shadow(0 0 4px rgba(255,255,255,0.5))" : "grayscale(1) brightness(0.6)",
                      imageRendering: "pixelated",
                    }}
                    onError={(e) => {
                      // Fallback to the leader's emoji if the PokeAPI image fails to load.
                      const img = e.currentTarget as HTMLImageElement;
                      img.style.display = "none";
                      const parent = img.parentElement;
                      if (parent && !parent.querySelector(".badge-fallback")) {
                        const span = document.createElement("span");
                        span.className = "badge-fallback";
                        span.textContent = got ? g.emoji : "·";
                        span.style.fontSize = "18px";
                        parent.appendChild(span);
                      }
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Gym list */}
        <div style={card}>
          <div style={cardTitle}>Gym Leaders</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
            {GYM_LEADERS.map((g, i) => {
              const prevDone = i === 0 || badges.includes(GYM_LEADERS[i - 1].id);
              const beaten = badges.includes(g.id);
              const locked = !prevDone;
              return (
                <button key={g.id} disabled={locked}
                  onClick={() => onPickGym(g)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: locked ? "#0a0a0a" : beaten ? "#0a0a0a" : `linear-gradient(90deg, ${g.color}22, ${g.color}08)`,
                    border: "1px solid " + (beaten ? "#4CAF50" : locked ? "#27272a" : g.color),
                    color: "#fff", borderRadius: 12, padding: "10px 12px", cursor: locked ? "not-allowed" : "pointer",
                    opacity: locked ? 0.5 : 1, textAlign: "left",
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 28 }}>{g.emoji}</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>Gym {i + 1} — {g.name}</div>
                      <div style={{ fontSize: 11, opacity: 0.8 }}>{g.title} · Type: {g.type} · {g.team.length} mons</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>
                    {beaten ? "✓ Cleared" : locked ? "🔒" : "Challenge →"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Elite 4 entry */}
        <div style={{ ...card, borderColor: allBadges ? "#FFD54F" : "#27272a" }}>
          <div style={cardTitle}>Elite 4 Gauntlet</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 8 }}>
            4 sequential battles. <strong>No healing or items between matches.</strong> Lose your last Pokémon and the run resets.
            Best streak: <strong>{e4Streak}</strong>{e4Cleared && " · Champion"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 8 }}>
            {ELITE_FOUR.map((e) => (
              <div key={e.id} style={{
                background: "#0a0a0a",
                border: "1px solid " + e.color, borderRadius: 10, padding: 8, textAlign: "center",
              }}>
                <div style={{ fontSize: 22 }}>{e.emoji}</div>
                <div style={{ fontWeight: 700, fontSize: 12 }}>{e.name}</div>
                <div style={{ fontSize: 10, opacity: 0.85 }}>{e.type}</div>
              </div>
            ))}
          </div>
          <button disabled={!allBadges} onClick={onStartElite4}
            style={{
              width: "100%", padding: "12px 14px", border: 0, borderRadius: 12,
              background: allBadges ? "linear-gradient(135deg, #FFD54F, #FF9800)" : "#18181b",
              color: allBadges ? "#000" : "#71717a",
              fontWeight: 800, fontSize: 14, cursor: allBadges ? "pointer" : "not-allowed",
            }}>
            {allBadges ? "Begin Elite 4 Run →" : "Earn all 8 badges to unlock"}
          </button>
        </div>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  position: "fixed", inset: 0, overflowY: "auto",
  background: "#09090b",
  color: "#f4f4f5", fontFamily: "system-ui", zIndex: 8500,
};
const card: React.CSSProperties = {
  background: "#18181b", border: "1px solid #27272a",
  borderRadius: 16, padding: 12,
};
const cardTitle: React.CSSProperties = { fontWeight: 800, fontSize: 14, marginBottom: 4 };
const backBtn: React.CSSProperties = {
  background: "#18181b", color: "#f4f4f5", border: "1px solid #27272a",
  borderRadius: 8, padding: "6px 10px", cursor: "pointer",
};

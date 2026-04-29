import { useState, useEffect, useRef } from "react";

type ChoiceAction = "ASK_NAME" | "CHOOSE_STARTER" | "RESTART";
type Choice = {
  label: string;
  next?: SceneId;
  action?: ChoiceAction;
  path?: "oak" | "gio";
  starter?: string;
  starterId?: number;
};
type Scene = { text: string; image: string; choices: Choice[] };

type SceneId =
  | "intro1" | "intro2" | "wakeup" | "crossroads"
  | "meet_oak" | "meet_gio"
  | "explain_oak" | "explain_gio"
  | "giratina_oak" | "giratina_gio"
  | "choose_oak" | "choose_gio"
  | "epilogue";

const STORY: Record<SceneId, Scene> = {
  intro1: {
    text: "You were crossing the road, minding your own business, when suddenly blinding headlights illuminated the asphalt. A massive truck hurtled toward you at full speed. There was a deafening crash, and then... nothing.",
    image: "/plot/scene-1.jpg",
    choices: [{ label: "Continue", next: "intro2" }],
  },
  intro2: {
    text: "You are floating in an endless, dark void. A strange, echoing voice reverberates in your mind...\n\n\"Human... you shall bring change to this world. Serve your purpose. Fulfill your destiny.\"",
    image: "/plot/scene-2.jpg",
    choices: [{ label: "Wake up", next: "wakeup" }],
  },
  wakeup: {
    text: "You gasp for air and sit up rapidly. You're lying in a lush, green field under a bright sky. You look down at your hands and realize you have been reincarnated into the body of a 17-year-old boy.\n\nThe world around you feels different... vibrant, almost animated. You are in the world of Pokémon.",
    image: "/plot/scene-3.jpg",
    choices: [{ label: "Stand up and look around", next: "crossroads" }],
  },
  crossroads: {
    text: "You walk along a dirt trail and soon come across a fork in the road. Two distinct paths lie before you.",
    image: "/plot/scene-4.jpg",
    choices: [
      { label: "Take the left path towards a peaceful town", next: "meet_oak" },
      { label: "Take the right path descending towards a shadowy facility", next: "meet_gio" },
    ],
  },
  meet_oak: {
    text: "You take the left path and soon bump into an older man wearing a white lab coat.\n\n\"Hello there! Welcome to the world of Pokémon! I am Professor Oak. I haven't seen you around these parts before. What is your name?\"",
    image: "/plot/scene-5.jpg",
    choices: [{ label: "Tell him your name", action: "ASK_NAME", path: "oak" }],
  },
  meet_gio: {
    text: "You take the right path. Suddenly, you are surrounded by grunts in black uniforms bearing a red 'R'. A man in a sharp suit steps forward from the shadows.\n\n\"I am Giovanni. You look lost, kid. Who exactly are you?\"",
    image: "/plot/scene-6.jpg",
    choices: [{ label: "Tell him your name", action: "ASK_NAME", path: "gio" }],
  },
  explain_oak: {
    text: "\"Nice to meet you, {name},\" Professor Oak says warmly.\n\nYou explain to him that you don't remember anything from your past life—only a strange voice echoing in the void telling you to serve your purpose.",
    image: "/plot/scene-7.jpg",
    choices: [{ label: "Continue", next: "giratina_oak" }],
  },
  explain_gio: {
    text: "Giovanni narrows his eyes calculatingly. \"{name}...\"\n\nYou explain that you have no memories of your past life—only a mysterious voice in the void speaking of a grand purpose and destiny.",
    image: "/plot/scene-8.jpg",
    choices: [{ label: "Continue", next: "giratina_gio" }],
  },
  giratina_oak: {
    text: "Professor Oak rubs his chin in deep thought.\n\n\"A voice from the void? Destiny? That sounds remarkably like Giratina, the legendary Pokémon that governs dimensions. Fascinating... Well, you are welcome here. Come to my lab in the Kanto region. You'll need a partner for your journey.\"",
    image: "/plot/scene-9.jpg",
    choices: [{ label: "Go to Professor Oak's Lab", next: "choose_oak" }],
  },
  giratina_gio: {
    text: "Giovanni smirks, a glint of ambition flashing in his eyes.\n\n\"A voice from the void? Governing dimensions? That is undoubtedly Giratina, a legendary Pokémon of immense power. You are an interesting anomaly, {name}. Come to our Kanto region base. If you have a destiny, Team Rocket will help you seize it.\"",
    image: "/plot/scene-10.jpg",
    choices: [{ label: "Go to the Team Rocket Base", next: "choose_gio" }],
  },
  choose_oak: {
    text: "You arrive at Professor Oak's lab. Three Pokéballs sit neatly on a high-tech table.\n\n\"Choose your first Pokémon, {name}!\"",
    image: "/plot/scene-11.jpg",
    choices: [
      { label: "Bulbasaur (Grass/Poison)", action: "CHOOSE_STARTER", starter: "Bulbasaur", starterId: 1 },
      { label: "Charmander (Fire)", action: "CHOOSE_STARTER", starter: "Charmander", starterId: 4 },
      { label: "Squirtle (Water)", action: "CHOOSE_STARTER", starter: "Squirtle", starterId: 7 },
    ],
  },
  choose_gio: {
    text: "You arrive at Team Rocket's underground Kanto base. Three dark Pokéballs are presented to you in a metallic case.\n\n\"Choose your first Pokémon, {name}. Make it count.\"",
    image: "/plot/scene-12.jpg",
    choices: [
      { label: "Zubat (Poison/Flying)", action: "CHOOSE_STARTER", starter: "Zubat", starterId: 41 },
      { label: "Koffing (Poison)", action: "CHOOSE_STARTER", starter: "Koffing", starterId: 109 },
      { label: "Ekans (Poison)", action: "CHOOSE_STARTER", starter: "Ekans", starterId: 23 },
    ],
  },
  epilogue: {
    text: "With your new partner, {starter}, by your side, you look out at the vast, untamed world of Kanto.\n\nThe strange voice of Giratina still lingers in the back of your mind. You step forward, officially beginning your journey to find your origins, fulfill your purpose, and gain back the memories of your past life.",
    image: "/plot/scene-13.jpg",
    choices: [{ label: "Begin your Journey", action: "RESTART" }],
  },
};

export type StoryResult = { name: string; starterId: number; mentor: "oak" | "gio" };

export function StoryIntro({ onComplete }: { onComplete: (r: StoryResult) => void }) {
  const [scene, setScene] = useState<SceneId>("intro1");
  const [playerName, setPlayerName] = useState("");
  const [playerStarter, setPlayerStarter] = useState("");
  const [starterId, setStarterId] = useState<number>(0);
  const [mentorPath, setMentorPath] = useState<"oak" | "gio">("oak");

  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [tempName, setTempName] = useState("");

  const intervalRef = useRef<number | null>(null);

  const getFullText = () => {
    let text = STORY[scene].text;
    text = text.replace(/\{name\}/g, playerName || "you");
    text = text.replace(/\{starter\}/g, playerStarter || "your Pokémon");
    return text;
  };

  useEffect(() => {
    const fullText = getFullText();
    setDisplayedText("");
    setIsTyping(true);
    let i = 0;
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      i++;
      setDisplayedText(fullText.slice(0, i));
      if (i >= fullText.length) {
        if (intervalRef.current) window.clearInterval(intervalRef.current);
        setIsTyping(false);
      }
    }, 25);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  const handleSkipTyping = () => {
    if (isTyping) {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      setDisplayedText(getFullText());
      setIsTyping(false);
    }
  };

  const handleChoice = (choice: Choice) => {
    if (choice.action === "ASK_NAME") {
      if (choice.path) setMentorPath(choice.path);
      setShowNameModal(true);
    } else if (choice.action === "CHOOSE_STARTER") {
      setPlayerStarter(choice.starter || "");
      setStarterId(choice.starterId || 0);
      setScene("epilogue");
    } else if (choice.action === "RESTART") {
      // Finish and hand control back to App so the player enters the world
      onComplete({
        name: playerName.trim() || "Trainer",
        starterId: starterId || 1,
        mentor: mentorPath,
      });
    } else if (choice.next) {
      setScene(choice.next);
    }
  };

  const handleNameSubmit = () => {
    const v = tempName.trim();
    if (!v) return;
    setPlayerName(v);
    setShowNameModal(false);
    setTempName("");
    setScene(mentorPath === "oak" ? "explain_oak" : "explain_gio");
  };

  const currentSceneData = STORY[scene];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#d4d4d4",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          maxWidth: 672,
          width: "100%",
          background: "#0a0a0a",
          border: "1px solid #262626",
          borderRadius: 16,
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8)",
          padding: 24,
          position: "relative",
          overflow: "hidden",
          transition: "all 0.3s",
        }}
      >
        {/* Decorative top accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: 4,
            background:
              "linear-gradient(to right, #171717, #737373, #171717)",
            opacity: 0.3,
          }}
        />

        {/* Scene image */}
        {currentSceneData.image && (
          <div
            style={{
              width: "100%",
              height: 224,
              marginBottom: 24,
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid #262626",
              background: "#171717",
              position: "relative",
            }}
          >
            <img
              src={currentSceneData.image}
              alt="Scene"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transition: "all 0.7s",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to top, #0a0a0a, transparent, transparent)",
                pointerEvents: "none",
              }}
            />
          </div>
        )}

        {/* Text Display */}
        <div
          style={{
            minHeight: 120,
            marginBottom: 32,
            cursor: isTyping ? "pointer" : "default",
            position: "relative",
          }}
          onClick={handleSkipTyping}
        >
          <p
            style={{
              fontSize: 18,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              color: "#e5e5e5",
              margin: 0,
            }}
          >
            {displayedText}
            {isTyping && (
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 20,
                  background: "#a3a3a3",
                  marginLeft: 4,
                  transform: "translateY(4px)",
                  animation: "siPulse 1s infinite",
                }}
              />
            )}
          </p>

          {isTyping && (
            <div
              style={{
                position: "absolute",
                bottom: -22,
                right: 0,
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                color: "#525252",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 19 22 12 13 5 13 19" />
                <polygon points="2 19 11 12 2 5 2 19" />
              </svg>
              <span>Click to skip</span>
            </div>
          )}
        </div>

        {/* Choices */}
        <div style={{ minHeight: 160, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          {!isTyping && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                animation: "siFadeUp 0.5s ease-out",
              }}
            >
              {currentSceneData.choices.map((choice, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChoice(choice)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    textAlign: "left",
                    background: "#171717",
                    border: "1px solid #262626",
                    color: "#d4d4d4",
                    padding: "16px 24px",
                    borderRadius: 12,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: 16,
                    fontWeight: 500,
                    letterSpacing: 0.3,
                    transition: "all 0.3s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#262626";
                    e.currentTarget.style.borderColor = "#737373";
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#171717";
                    e.currentTarget.style.borderColor = "#262626";
                    e.currentTarget.style.color = "#d4d4d4";
                  }}
                >
                  <span>{choice.label}</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: "#525252" }}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Name modal */}
      {showNameModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.9)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#0a0a0a",
              border: "1px solid #404040",
              padding: 32,
              borderRadius: 16,
              width: "100%",
              maxWidth: 384,
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8)",
              animation: "siZoomIn 0.2s ease-out",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div
                style={{
                  padding: 8,
                  background: "#171717",
                  borderRadius: 9999,
                  border: "1px solid #262626",
                  display: "inline-flex",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 500, color: "#f5f5f5", margin: 0 }}>
                Enter your name
              </h2>
            </div>

            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && tempName.trim()) handleNameSubmit();
              }}
              placeholder="Your name..."
              autoFocus
              maxLength={15}
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "#000",
                border: "1px solid #262626",
                color: "#e5e5e5",
                padding: "12px 16px",
                borderRadius: 12,
                marginBottom: 32,
                outline: "none",
                fontSize: 18,
                fontFamily: "inherit",
                transition: "all 0.2s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#737373";
                e.currentTarget.style.boxShadow = "0 0 0 1px #737373";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#262626";
                e.currentTarget.style.boxShadow = "none";
              }}
            />

            <button
              onClick={handleNameSubmit}
              disabled={!tempName.trim()}
              style={{
                width: "100%",
                background: "#e5e5e5",
                color: "#000",
                fontWeight: 600,
                padding: "14px 0",
                borderRadius: 12,
                border: "none",
                cursor: tempName.trim() ? "pointer" : "not-allowed",
                opacity: tempName.trim() ? 1 : 0.3,
                fontSize: 16,
                fontFamily: "inherit",
                boxShadow: "0 0 15px rgba(255,255,255,0.1)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (tempName.trim()) {
                  e.currentTarget.style.background = "#fff";
                  e.currentTarget.style.boxShadow = "0 0 20px rgba(255,255,255,0.2)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#e5e5e5";
                e.currentTarget.style.boxShadow = "0 0 15px rgba(255,255,255,0.1)";
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes siPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes siFadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes siZoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}

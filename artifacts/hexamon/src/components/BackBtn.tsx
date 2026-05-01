import React from "react";

export const BACK_BTN_STYLE: React.CSSProperties = {
  background: "#1c1c1e",
  border: "1px solid #2a2a2d",
  color: "#ffffff",
  padding: "8px 14px",
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 1,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  flexShrink: 0,
};

export function BackBtn({
  onClick,
  label = "BACK",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button type="button" style={BACK_BTN_STYLE} onClick={onClick} aria-label={label}>
      <span style={{ fontSize: 10, lineHeight: 1 }}>◀</span>
      {label}
    </button>
  );
}

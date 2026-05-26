import { useState } from "react";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", boxSizing: "border-box",
  background: "var(--td-surface)", color: "var(--td-text)",
  border: "1px solid var(--td-surface-2)", borderRadius: "6px", fontSize: "0.9rem",
};

const btnStyle = (variant: "danger" | "primary" | "ghost" | "accent"): React.CSSProperties => ({
  padding: "5px 12px", borderRadius: "6px", border: "none",
  fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
  background:
    variant === "danger" ? "rgba(239,68,68,0.12)" :
    variant === "primary" ? "#34d399" :
    variant === "accent" ? "rgba(52,211,153,0.15)" :
    "var(--td-surface-2)",
  color:
    variant === "danger" ? "#f87171" :
    variant === "primary" ? "#0f1117" :
    variant === "accent" ? "#34d399" :
    "var(--td-text)",
  transition: "opacity 0.15s",
});

function InlineEditField({ value, onSave, onCancel, multiline = false }: {
  value: string; onSave: (v: string) => void; onCancel: () => void; multiline?: boolean;
}) {
  const [val, setVal] = useState(value);
  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", flex: 1 }}>
      {multiline ? (
        <textarea value={val} onChange={e => setVal(e.target.value)} autoFocus rows={3}
          style={{ ...inputStyle, resize: "vertical", flex: 1 }} />
      ) : (
        <input value={val} onChange={e => setVal(e.target.value)} autoFocus style={{ ...inputStyle, flex: 1 }} />
      )}
      <button style={btnStyle("primary")} onClick={() => onSave(val)}>✓</button>
      <button style={btnStyle("ghost")} onClick={onCancel}>✕</button>
    </div>
  );
}

export default InlineEditField
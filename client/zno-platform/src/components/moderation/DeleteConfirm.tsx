import { Trash2 } from "lucide-react";

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

function DeleteConfirm({ label, onConfirm, onCancel }: { label: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div style={{
        background: "var(--td-surface)", borderRadius: "12px", padding: "28px 32px",
        maxWidth: "380px", width: "90%", border: "1px solid #ef4444", textAlign: "center",
      }}>
        <div style={{ marginBottom: "10px", color: "#f87171" }}><Trash2 size={36} /></div>
        <h3 style={{ marginBottom: "8px" }}>Видалити?</h3>
        <p style={{ color: "var(--td-text-muted)", fontSize: "0.88rem", marginBottom: "20px" }}>
          «{label}» — цю дію <strong>неможливо скасувати</strong>.
        </p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button style={{ ...btnStyle("ghost"), flex: 1 }} onClick={onCancel}>Скасувати</button>
          <button style={{ ...btnStyle("danger"), flex: 1, background: "#ef4444", color: "#fff" }} onClick={onConfirm}>Видалити</button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirm
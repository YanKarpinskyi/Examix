import { createPortal } from "react-dom";

interface UserProfile {
  id: string;
  email: string;
  username: string | null;
}

interface BanConfirmModalProps {
  user: UserProfile;
  action: "ban" | "unban";
  onConfirm: () => void;
  onCancel: () => void;
}

export function BanConfirmModal({ user, action, onConfirm, onCancel }: BanConfirmModalProps) {
  return createPortal(
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div style={{
        background: "var(--td-surface)", borderRadius: "12px", padding: "32px",
        maxWidth: "420px", width: "90%",
        border: action === "ban" ? "1px solid #ef4444" : "1px solid #34d399",
      }}>
        <div style={{ fontSize: "2.5rem", textAlign: "center", marginBottom: "12px" }}>
          {action === "ban" ? "🚫" : "🔓"}
        </div>
        <h3 style={{ textAlign: "center", marginBottom: "12px" }}>
          {action === "ban" ? "Заблокувати користувача?" : "Розблокувати користувача?"}
        </h3>
        <div style={{
          background: "var(--td-surface-2)", borderRadius: "8px", padding: "12px 16px",
          marginBottom: "16px", textAlign: "center",
        }}>
          <div style={{ fontWeight: "600" }}>{user.username || "—"}</div>
          <div style={{ fontSize: "0.85rem", color: "var(--td-text-muted)" }}>{user.email}</div>
        </div>
        <p style={{ color: "var(--td-text-muted)", fontSize: "0.9rem", textAlign: "center", marginBottom: "20px" }}>
          {action === "ban"
            ? <>Користувач <strong>негайно втратить доступ</strong> до платформи. При наступній спробі входу він побачить повідомлення про блокування.</>
            : "Користувач знову зможе увійти до платформи."
          }
        </p>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            className="td-btn-new cancel"
            style={{ flex: 1 }}
            onClick={onCancel}
          >
            Скасувати
          </button>
          <button
            className="td-btn-new"
            style={{
              flex: 1,
              background: action === "ban" ? "#ef4444" : "#34d399",
              color: "#0f1117",
            }}
            onClick={onConfirm}
          >
            {action === "ban" ? "Заблокувати" : "Розблокувати"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
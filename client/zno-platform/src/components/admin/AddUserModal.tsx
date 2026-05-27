import { createPortal } from "react-dom";
import { useState } from "react";
import { apiClient } from "../../services/apiClient";

interface AddUserModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AddUserModal({ onClose, onSuccess }: AddUserModalProps) {
  const [form, setForm] = useState({
    email: "",
    password: "",
    username: "",
    role: "student" as "student" | "teacher" | "admin",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async () => {
    if (!form.email || !form.password || !form.username) {
      setError("Заповніть всі поля");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiClient.request("/admin/users", {
        method: "POST",
        body: JSON.stringify(form),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Помилка при створенні");
    } finally {
      setLoading(false);
    }
  };

  const field = (label: string, key: keyof typeof form, type = "text") => (
    <div style={{ marginBottom: "14px" }}>
      <label style={{ display: "block", fontSize: "0.85rem", color: "var(--td-text-muted)", marginBottom: "6px" }}>
        {label}
      </label>
      <input
        type={type}
        autoComplete="off"
        value={form[key] as string}
        onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
        style={{
          width: "100%", padding: "8px 12px", boxSizing: "border-box",
          background: "var(--td-surface-2)", color: "var(--td-text)",
          border: "1px solid var(--td-surface-2)", borderRadius: "6px", fontSize: "0.9rem",
        }}
      />
    </div>
  );

  const copyPassword = () => {
    if (!form.password) return;
    navigator.clipboard.writeText(form.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div style={{
        background: "var(--td-surface)", borderRadius: "12px", padding: "32px",
        maxWidth: "440px", width: "90%", border: "1px solid var(--td-surface-2)",
      }}>
        <h3 style={{ margin: "0 0 20px 0", textAlign: "center" }}>➕ Додати користувача</h3>

        {field("Username", "username")}
        {field("Email", "email", "email")}
        <div style={{ marginBottom: "14px" }}>
          <label htmlFor="password-input" style={{ display: "block", fontSize: "0.85rem", color: "var(--td-text-muted)", marginBottom: "6px" }}>
            Пароль
          </label>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type={showPassword ? "text" : "password"}
              value={form.password}
              autoComplete="new-password"
              onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
              style={{
                flex: 1, padding: "8px 12px",
                background: "var(--td-surface-2)", color: "var(--td-text)",
                border: "1px solid var(--td-surface-2)", borderRadius: "6px", fontSize: "0.9rem",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              title={showPassword ? "Сховати" : "Показати"}
              style={{
                padding: "8px 10px", borderRadius: "6px", border: "none",
                background: "var(--td-surface-2)", color: "var(--td-text)",
                cursor: "pointer", fontSize: "1rem", flexShrink: 0,
              }}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
            <button
              type="button"
              onClick={copyPassword}
              title="Копіювати пароль"
              style={{
                padding: "8px 10px", borderRadius: "6px", border: "none",
                background: copied ? "rgba(52,211,153,0.15)" : "var(--td-surface-2)",
                color: copied ? "#34d399" : "var(--td-text)",
                cursor: "pointer", fontSize: "1rem", flexShrink: 0,
                transition: "all 0.2s",
              }}
            >
              {copied ? "✓" : "📋"}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label htmlFor="role-select" style={{ display: "block", fontSize: "0.85rem", color: "var(--td-text-muted)", marginBottom: "6px" }}>
            Роль
          </label>
          <select
            value={form.role}
            onChange={e => setForm(prev => ({ ...prev, role: e.target.value as typeof form.role }))}
            style={{
              width: "100%", padding: "8px 12px",
              background: "var(--td-surface-2)", color: "var(--td-text)",
              border: "1px solid var(--td-surface-2)", borderRadius: "6px", fontSize: "0.9rem",
            }}
          >
            <option value="student">Студент</option>
            <option value="teacher">Викладач</option>
            <option value="admin">Адмін</option>
          </select>
        </div>

        {error && (
          <div style={{
            background: "rgba(239,68,68,0.1)", color: "#f87171", borderRadius: "6px",
            padding: "10px 14px", marginBottom: "16px", fontSize: "0.88rem",
          }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: "12px" }}>
          <button className="td-btn-new cancel" style={{ flex: 1 }} onClick={onClose} disabled={loading}>
            Скасувати
          </button>
          <button
            className="td-btn-new" style={{ flex: 1 }}
            onClick={handleSubmit} disabled={loading}
          >
            {loading ? "Створення..." : "Створити"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
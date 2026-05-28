import { useState, useEffect, useRef } from "react";
import { apiClient } from "../../services/apiClient";
import {
  LockOpen, Lock, Plus, Trash2, Pencil, UserPlus, XCircle,
  Ban, ClipboardList, FileText, ClipboardList as ClipboardListIcon,
} from "lucide-react";
import { useTheme } from '../../context/ThemeContext';

function AdminLogsTab() {
  const { isDark, toggleTheme } = useTheme();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { loadLogs(); }, []);

  const handleUserFilterChange = (value: string) => {
    setUserFilter(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { loadLogs(value); }, 350);
  };

  const loadLogs = async (search = userFilter) => {
    setLoading(true);
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const data = await apiClient.request<{ logs: any[] }>(`/admin/logs${params}`);
      setLogs(data.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const actionLabel: Record<string, { icon: React.ReactNode; text: string; emoji: string }> = {
    login:             { icon: <LockOpen size={14} />,          text: "Вхід",                   emoji: "🔓" },
    logout:            { icon: <Lock size={14} />,              text: "Вихід",                  emoji: "🔐" },
    create_question:   { icon: <Plus size={14} />,              text: "Створення питання",       emoji: "➕" },
    delete_question:   { icon: <Trash2 size={14} />,            text: "Видалення питання",       emoji: "🗑️" },
    edit_question:     { icon: <Pencil size={14} />,            text: "Редагування питання",     emoji: "✏️" },
    create_user:       { icon: <UserPlus size={14} />,          text: "Створення користувача",   emoji: "👤" },
    delete_user:       { icon: <XCircle size={14} />,           text: "Видалення користувача",   emoji: "❌" },
    ban_user:          { icon: <Ban size={14} />,               text: "Заблокував користувача",  emoji: "🚫" },
    create_assignment: { icon: <ClipboardListIcon size={14} />, text: "Створення завдання",      emoji: "📋" },
    delete_assignment: { icon: <Trash2 size={14} />,            text: "Видалення завдання",      emoji: "🗑️" },
    submit_test:       { icon: <FileText size={14} />,          text: "Здача тесту",             emoji: "📝" },
  };

  const uniqueActions = ["all", ...Object.keys(actionLabel)];
  const filtered = logs.filter(l => actionFilter === "all" || l.action === actionFilter);

  return (
    <div className="td-form">
      <h2 style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: 'center', color: isDark ? "#dbdbdb" : undefined }}>
        <ClipboardList size={20} /> Логування дій користувачів
      </h2>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", margin: "16px 0" }}>
        <input
          type="text"
          placeholder="Ім'я або email..."
          value={userFilter}
          onChange={e => handleUserFilterChange(e.target.value)}
          onKeyDown={e => e.key === "Enter" && loadLogs()}
          style={{
            flex: 1, minWidth: "200px", padding: "8px 12px",
            background: "var(--td-surface)", color: "var(--td-text)",
            border: "1px solid var(--td-surface-2)", borderRadius: "6px",
          }}
        />
        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          style={{
            padding: "8px 12px", background: "var(--td-surface)",
            color: "var(--td-text)", border: "1px solid var(--td-surface-2)",
            borderRadius: "6px",
          }}
        >
          {uniqueActions.map(a => (
            <option key={a} value={a}>
              {a === "all" ? "Всі дії" : `${actionLabel[a]?.emoji} ${actionLabel[a]?.text}` ?? a}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--td-text-muted)" }}>
          Завантаження...
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "var(--td-surface)", borderRadius: "8px" }}>
            <thead>
              <tr style={{ background: "var(--td-surface-2)", textAlign: "center" }}>
                <th style={{ padding: "12px" }}>Час</th>
                <th style={{ padding: "12px" }}>Користувач</th>
                <th style={{ padding: "12px" }}>Дія</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: "40px", textAlign: "center", color: "var(--td-text-muted)" }}>
                    Логів не знайдено
                  </td>
                </tr>
              ) : filtered.map(l => (
                <tr key={l.id} style={{ borderBottom: "1px solid var(--td-surface-2)" }}>
                  <td style={{ padding: "12px", fontSize: "0.82rem", color: "var(--td-text-muted)", whiteSpace: "nowrap" }}>
                    {new Date(l.created_at).toLocaleString("uk-UA")}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{l.profiles?.username || "—"}</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--td-text-muted)" }}>{l.profiles?.email}</div>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <span style={{
                      padding: "3px 10px", borderRadius: "999px", fontSize: "0.8rem",
                      background: "var(--td-surface-2)", color: "var(--td-text)",
                      display: "inline-flex", alignItems: "center", gap: "5px",
                    }}>
                      {actionLabel[l.action]?.icon}
                      {actionLabel[l.action]?.text ?? l.action}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminLogsTab;
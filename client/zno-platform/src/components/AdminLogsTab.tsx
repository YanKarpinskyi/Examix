import { useState, useEffect, useRef } from "react";
import { apiClient } from "../services/apiClient";

function AdminLogsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { loadLogs(); }, []);

  const handleUserFilterChange = (value: string) => {
    setUserFilter(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadLogs(value);
    }, 350);
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

  useEffect(() => { loadLogs(); }, []);

  const actionLabel: Record<string, string> = {
    login: "🔓 Вхід",
    logout: "🔐 Вихід",
    create_question: "➕ Створив питання",
    delete_question: "🗑️ Видалив питання",
    edit_question: "✏️ Редагував питання",
    create_user: "👤 Створив користувача",
    ban_user: "🚫 Заблокував користувача",
    create_assignment: "📋 Створив завдання",
    delete_assignment: "🗑️ Видалив завдання",
    submit_test: "📝 Здав тест",
  };

  const uniqueActions = ["all", ...Object.keys(actionLabel)];

  const filtered = logs.filter(l =>
    actionFilter === "all" || l.action === actionFilter
  );

  return (
    <div className="td-form">
      <h2>📋 Логування дій користувачів</h2>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", margin: "16px 0" }}>
        <input
          type="text"
          placeholder="🔍 Ім'я або email..."
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
            <option key={a} value={a}>{a === "all" ? "Всі дії" : actionLabel[a] ?? a}</option>
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
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                        {l.profiles?.username || "—"}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--td-text-muted)" }}>
                        {l.profiles?.email}
                    </div>
                    </td>
                    <td style={{ padding: "12px" }}>
                    <span style={{
                        padding: "3px 10px", borderRadius: "999px", fontSize: "0.8rem",
                        background: "var(--td-surface-2)", color: "var(--td-text)",
                    }}>
                        {actionLabel[l.action] ?? l.action}
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

export default AdminLogsTab
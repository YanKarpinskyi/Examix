import { useState, useEffect } from "react";
import { apiClient } from "../../services/apiClient";

interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  role: string;
}

const ROLES = ["student", "teacher", "admin"] as const;
type Role = typeof ROLES[number];

const roleBadgeColor: Record<string, string> = {
  admin: "#818cf8",
  teacher: "#34d399",
  student: "#94a3b8",
};

export default function AdminRolesTab() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [pendingRoles, setPendingRoles] = useState<Record<string, Role>>({});
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await apiClient.request<{ users: UserProfile[] }>("/admin/users");
      setUsers(data.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getRole = (u: UserProfile): Role =>
    (pendingRoles[u.id] ?? u.role) as Role;

  const handleRoleChange = (userId: string, newRole: Role) => {
    setPendingRoles(prev => ({ ...prev, [userId]: newRole }));
  };

  const handleSave = async (u: UserProfile) => {
    const newRole = pendingRoles[u.id];
    if (!newRole || newRole === u.role) return;

    setSavingId(u.id);
    try {
      await apiClient.request(`/admin/users/${u.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      });
      setUsers(prev => prev.map(user =>
        user.id === u.id ? { ...user, role: newRole } : user
      ));
      setPendingRoles(prev => {
        const next = { ...prev };
        delete next[u.id];
        return next;
      });
      setSavedId(u.id);
      setTimeout(() => setSavedId(null), 2000);
    } catch (err: any) {
      alert("Помилка збереження: " + err.message);
    } finally {
      setSavingId(null);
    }
  };

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.username ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const hasChange = (u: UserProfile) =>
    pendingRoles[u.id] !== undefined && pendingRoles[u.id] !== u.role;

  return (
    <div className="td-form">
      <h2>🔐 Ролі та права доступу</h2>

      <div style={{ marginBottom: "16px" }}>
        <input
          type="text"
          placeholder="🔍 Пошук за ім'ям або email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%", padding: "8px 12px", boxSizing: "border-box",
            background: "var(--td-surface)", color: "var(--td-text)",
            border: "1px solid var(--td-surface-2)", borderRadius: "6px", fontSize: "0.9rem",
          }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--td-text-muted)" }}>
          Завантаження...
        </div>
      ) : (
        <>
          <div className="au-table-wrap" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", background: "var(--td-surface)", borderRadius: "8px" }}>
              <thead>
                <tr style={{ background: "var(--td-surface-2)", textAlign: "left" }}>
                  <th style={{ padding: "12px" }}>Користувач</th>
                  <th style={{ padding: "12px" }}>Email</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>Роль</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>Зберегти</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: "40px", textAlign: "center", color: "var(--td-text-muted)" }}>
                      Користувачів не знайдено
                    </td>
                  </tr>
                ) : filtered.map(u => (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--td-surface-2)" }}>
                    <td style={{ padding: "12px", fontWeight: 500 }}>
                      {u.username || <span style={{ color: "var(--td-text-muted)" }}>—</span>}
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.88rem", color: "var(--td-text-muted)" }}>
                      {u.email}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <RoleSelect
                        value={getRole(u)}
                        onChange={role => handleRoleChange(u.id, role)}
                        roleBadgeColor={roleBadgeColor}
                      />
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <SaveButton
                        hasChange={hasChange(u)}
                        saving={savingId === u.id}
                        saved={savedId === u.id}
                        onClick={() => handleSave(u)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="au-cards">
            {filtered.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--td-text-muted)" }}>
                Користувачів не знайдено
              </div>
            ) : filtered.map(u => (
              <div key={u.id} style={{
                background: "var(--td-surface)", border: "1px solid var(--td-surface-2)",
                borderRadius: "10px", padding: "14px 16px",
              }}>
                <div style={{ marginBottom: "10px" }}>
                  <div style={{ fontWeight: 500, fontSize: "0.95rem" }}>
                    {u.username || <span style={{ color: "var(--td-text-muted)" }}>—</span>}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--td-text-muted)", marginTop: "2px" }}>
                    {u.email}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <RoleSelect
                    value={getRole(u)}
                    onChange={role => handleRoleChange(u.id, role)}
                    roleBadgeColor={roleBadgeColor}
                  />
                  <SaveButton
                    hasChange={hasChange(u)}
                    saving={savingId === u.id}
                    saved={savedId === u.id}
                    onClick={() => handleSave(u)}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RoleSelect({ value, onChange, roleBadgeColor }: {
  value: Role;
  onChange: (r: Role) => void;
  roleBadgeColor: Record<string, string>;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as Role)}
      style={{
        padding: "5px 10px",
        borderRadius: "6px",
        border: `1px solid ${roleBadgeColor[value]}55`,
        background: `${roleBadgeColor[value]}18`,
        color: roleBadgeColor[value],
        fontWeight: 600,
        fontSize: "0.82rem",
        cursor: "pointer",
        outline: "none",
        appearance: "auto",
        minWidth: "110px",
      }}
    >
      {ROLES.map(r => (
        <option 
          key={r} 
          value={r}
          style={{
            background: "var(--td-surface)",
            color: roleBadgeColor[r],
            fontWeight: 600,
          }}
        >
          {r}
        </option>
      ))}
    </select>
  );
}

function SaveButton({ hasChange, saving, saved, onClick }: {
  hasChange: boolean;
  saving: boolean;
  saved: boolean;
  onClick: () => void;
}) {
  if (saved) {
    return (
      <span style={{ fontSize: "0.82rem", color: "#34d399", fontWeight: 600 }}>
        ✓ Збережено
      </span>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={!hasChange || saving}
      style={{
        padding: "5px 14px", borderRadius: "6px", border: "none",
        fontSize: "0.82rem", fontWeight: 600, cursor: hasChange ? "pointer" : "default",
        background: hasChange ? "rgba(110,207,160,0.2)" : "var(--td-surface-2)",
        color: hasChange ? "#34d399" : "var(--td-text-muted)",
        transition: "all 0.2s",
      }}
    >
      {saving ? "..." : "Зберегти"}
    </button>
  );
}
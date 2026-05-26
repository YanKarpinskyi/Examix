import { useState, useEffect } from "react";
import { apiClient } from "../services/apiClient";
import { BanConfirmModal } from "../components/BanConfirmModal";
import { AddUserModal } from "../components/AddUserModal";
import './AdminUsersTab.scss';

interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  role: string;
  is_banned: boolean;
  created_at: string;
}

function AdminUsersTab() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "teacher" | "admin">("all");
  const [banModal, setBanModal] = useState<{ open: boolean; user: UserProfile | null; action: "ban" | "unban" }>({
    open: false, user: null, action: "ban",
  });
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; user: UserProfile | null }>({
    open: false, user: null,
  });

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

  const handleBanToggle = (user: UserProfile) => {
    setBanModal({ open: true, user, action: user.is_banned ? "unban" : "ban" });
  };

  const confirmBan = async () => {
    if (!banModal.user) return;
    setProcessingId(banModal.user.id);
    setBanModal(prev => ({ ...prev, open: false }));
    try {
      await apiClient.request(`/admin/users/${banModal.user!.id}/ban`, {
        method: "PATCH",
        body: JSON.stringify({ banned: banModal.action === "ban" }),
      });
      setUsers(prev =>
        prev.map(u =>
          u.id === banModal.user!.id ? { ...u, is_banned: banModal.action === "ban" } : u
        )
      );
    } catch (err: any) {
      alert("Помилка: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal.user) return;
    setProcessingId(deleteModal.user.id);
    setDeleteModal({ open: false, user: null });
    try {
      await apiClient.request(`/admin/users/${deleteModal.user.id}`, {
        method: "DELETE",
      });
      setUsers(prev => prev.filter(u => u.id !== deleteModal.user!.id));
    } catch (err: any) {
      alert("Помилка видалення: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = users.filter(u => {
    const matchesSearch =
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.username ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleBadgeColor: Record<string, string> = {
    admin: "#818cf8",
    teacher: "#34d399",
    student: "#94a3b8",
  };

  const actionBtnStyle = (isBan: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "7px 10px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.82rem",
    fontWeight: 600,
    background: isBan ? "rgba(239,68,68,0.15)" : "rgba(52,211,153,0.15)",
    color: isBan ? "#f87171" : "#34d399",
    transition: "all 0.2s",
  });

  const deleteBtnStyle: React.CSSProperties = {
    padding: "7px 10px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.82rem",
    fontWeight: 600,
    background: "rgba(239,68,68,0.08)",
    color: "#f87171",
    transition: "all 0.2s",
  };

  return (
    <div className="td-form">
      <h2>👥 Управління користувачами</h2>

      <div className="au-toolbar" style={{
        display: "flex", gap: "12px", flexWrap: "wrap", margin: "16px 0",
      }}>
        <input
          type="text"
          placeholder="🔍 Пошук за ім'ям або email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: "200px", padding: "8px 12px",
            background: "var(--td-surface)", color: "var(--td-text)",
            border: "1px solid var(--td-surface-2)", borderRadius: "6px",
          }}
        />
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {(["all", "student", "teacher", "admin"] as const).map(r => (
            <button
              key={r}
              className="td-btn-new"
              onClick={() => setRoleFilter(r)}
              style={{
                background: roleFilter === r ? "var(--td-accent)" : "var(--td-surface-2)",
                color: roleFilter === r ? "#0f1117" : "var(--td-text)",
              }}
            >
              {r === "all" ? "Всі" : r === "student" ? "Студенти" : r === "teacher" ? "Викладачі" : "Адміни"}
              <span style={{ marginLeft: "6px", fontSize: "0.8rem", opacity: 0.7 }}>
                ({r === "all" ? users.length : users.filter(u => u.role === r).length})
              </span>
            </button>
          ))}
        </div>
        <button className="td-btn-new" onClick={() => setAddModalOpen(true)}>
          ➕ Додати
        </button>
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
                  <th style={{ padding: "12px", textAlign: "center" }}>Статус</th>
                  <th style={{ padding: "12px" }}>Зареєстрований</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>Дії</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "var(--td-text-muted)" }}>
                      Користувачів не знайдено
                    </td>
                  </tr>
                ) : (
                  filtered.map(u => (
                    <tr key={u.id} style={{
                      borderBottom: "1px solid var(--td-surface-2)",
                      opacity: u.is_banned ? 0.6 : 1,
                      background: u.is_banned ? "rgba(239,68,68,0.04)" : "transparent",
                    }}>
                      <td style={{ padding: "12px", fontWeight: "500" }}>
                        {u.username || <span style={{ color: "var(--td-text-muted)" }}>—</span>}
                      </td>
                      <td style={{ padding: "12px", fontSize: "0.88rem", color: "var(--td-text-muted)" }}>
                        {u.email}
                      </td>
                      <td style={{ padding: "12px", textAlign: "center" }}>
                        <span style={{
                          padding: "3px 10px", borderRadius: "999px", fontSize: "0.8rem", fontWeight: "600",
                          background: `${roleBadgeColor[u.role]}22`, color: roleBadgeColor[u.role],
                        }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: "12px", textAlign: "center" }}>
                        {u.is_banned ? (
                          <span style={{ padding: "3px 10px", borderRadius: "999px", fontSize: "0.8rem", background: "rgba(239,68,68,0.15)", color: "#f87171", fontWeight: "600" }}>
                            🚫 Заблокований
                          </span>
                        ) : (
                          <span style={{ padding: "3px 10px", borderRadius: "999px", fontSize: "0.8rem", background: "rgba(52,211,153,0.12)", color: "#34d399", fontWeight: "600" }}>
                            ✓ Активний
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px", fontSize: "0.85rem", color: "var(--td-text-muted)" }}>
                        {new Date(u.created_at).toLocaleDateString("uk-UA")}
                      </td>
                      <td style={{ padding: "12px", textAlign: "center" }}>
                        {u.role !== "admin" && (
                          <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                            <button
                              disabled={processingId === u.id}
                              onClick={() => handleBanToggle(u)}
                              style={{
                                padding: "5px 12px", borderRadius: "6px", border: "none",
                                cursor: processingId === u.id ? "not-allowed" : "pointer",
                                fontSize: "0.82rem", fontWeight: 600,
                                background: u.is_banned ? "rgba(52,211,153,0.15)" : "rgba(239,68,68,0.15)",
                                color: u.is_banned ? "#34d399" : "#f87171",
                                transition: "all 0.2s",
                              }}
                            >
                              {processingId === u.id ? "..." : u.is_banned ? "🔓 Розблокувати" : "🚫 Заблокувати"}
                            </button>
                            <button
                              disabled={processingId === u.id}
                              onClick={() => setDeleteModal({ open: true, user: u })}
                              style={{
                                padding: "5px 10px", borderRadius: "6px", border: "none",
                                cursor: processingId === u.id ? "not-allowed" : "pointer",
                                fontSize: "0.82rem", fontWeight: 600,
                                background: "rgba(239,68,68,0.08)", color: "#f87171",
                                transition: "all 0.2s",
                              }}
                              title="Видалити користувача"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="au-cards">
            {filtered.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--td-text-muted)" }}>
                Користувачів не знайдено
              </div>
            ) : (
              filtered.map(u => (
                <div
                  key={u.id}
                  className={`au-card${u.is_banned ? " banned" : ""}`}
                  style={{
                    background: u.is_banned ? "rgba(239,68,68,0.04)" : "var(--td-surface)",
                    border: `1px solid ${u.is_banned ? "rgba(239,68,68,0.3)" : "var(--td-surface-2)"}`,
                    borderRadius: "10px",
                    padding: "14px 16px",
                    opacity: u.is_banned ? 0.75 : 1,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: "0.95rem" }}>
                        {u.username || <span style={{ color: "var(--td-text-muted)" }}>—</span>}
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "var(--td-text-muted)", marginTop: "2px" }}>
                        {u.email}
                      </div>
                    </div>
                    {u.is_banned ? (
                      <span style={{ padding: "3px 8px", borderRadius: "999px", fontSize: "0.75rem", background: "rgba(239,68,68,0.15)", color: "#f87171", fontWeight: 600, whiteSpace: "nowrap" }}>
                        🚫 Заблокований
                      </span>
                    ) : (
                      <span style={{ padding: "3px 8px", borderRadius: "999px", fontSize: "0.75rem", background: "rgba(52,211,153,0.12)", color: "#34d399", fontWeight: 600, whiteSpace: "nowrap" }}>
                        ✓ Активний
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px", flexWrap: "wrap" }}>
                    <span style={{
                      padding: "3px 10px", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 600,
                      background: `${roleBadgeColor[u.role]}22`, color: roleBadgeColor[u.role],
                    }}>
                      {u.role}
                    </span>
                    <span style={{ fontSize: "0.78rem", color: "var(--td-text-muted)" }}>
                      📅 {new Date(u.created_at).toLocaleDateString("uk-UA")}
                    </span>
                  </div>

                  {u.role !== "admin" && (
                    <div style={{ display: "flex", gap: "8px", paddingTop: "10px", borderTop: "1px solid var(--td-surface-2)" }}>
                      <button
                        disabled={processingId === u.id}
                        onClick={() => handleBanToggle(u)}
                        style={actionBtnStyle(u.is_banned ? false : true)}
                      >
                        {processingId === u.id ? "..." : u.is_banned ? "🔓 Розблокувати" : "🚫 Заблокувати"}
                      </button>
                      <button
                        disabled={processingId === u.id}
                        onClick={() => setDeleteModal({ open: true, user: u })}
                        style={deleteBtnStyle}
                      >
                        🗑️ Видалити
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {banModal.open && banModal.user && (
        <BanConfirmModal
          user={banModal.user}
          action={banModal.action}
          onConfirm={confirmBan}
          onCancel={() => setBanModal({ open: false, user: null, action: "ban" })}
        />
      )}

      {addModalOpen && (
        <AddUserModal onClose={() => setAddModalOpen(false)} onSuccess={loadUsers} />
      )}

      {deleteModal.open && deleteModal.user && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div style={{
            background: "var(--td-surface)", borderRadius: "12px", padding: "32px",
            maxWidth: "420px", width: "90%", border: "1px solid #ef4444",
          }}>
            <div style={{ fontSize: "2.5rem", textAlign: "center", marginBottom: "12px" }}>🗑️</div>
            <h3 style={{ textAlign: "center", marginBottom: "12px" }}>Видалити користувача?</h3>
            <div style={{
              background: "var(--td-surface-2)", borderRadius: "8px", padding: "12px 16px",
              marginBottom: "16px", textAlign: "center",
            }}>
              <div style={{ fontWeight: "600" }}>{deleteModal.user.username || "—"}</div>
              <div style={{ fontSize: "0.85rem", color: "var(--td-text-muted)" }}>{deleteModal.user.email}</div>
            </div>
            <p style={{ color: "var(--td-text-muted)", fontSize: "0.9rem", textAlign: "center", marginBottom: "20px" }}>
              Цю дію <strong>неможливо скасувати</strong>. Усі дані користувача будуть видалені назавжди.
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button className="td-btn-new cancel" style={{ flex: 1 }}
                onClick={() => setDeleteModal({ open: false, user: null })}>
                Скасувати
              </button>
              <button className="td-btn-new" style={{ flex: 1, background: "#ef4444", color: "#fff" }}
                onClick={confirmDelete}>
                Видалити
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsersTab;
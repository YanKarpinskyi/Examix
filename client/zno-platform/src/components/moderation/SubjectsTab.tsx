import { useState, useEffect } from "react";
import { apiClient } from "../../services/apiClient";
import LoadingSpinner from "../LoadingSpinner";
import DeleteConfirm from "./DeleteConfirm";
import InlineEditField from "./InlineEditField";

interface Subject { id: string; name: string; description?: string }

const cardStyle: React.CSSProperties = {
  background: "var(--td-surface)", border: "1px solid var(--td-surface-2)",
  borderRadius: "8px", padding: "14px 16px",
  display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px",
};

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

function SubjectsTab() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiClient.request<{ subjects: Subject[] }>("/public/subjects");
      setSubjects(data.subjects || []);
    } finally { setLoading(false); }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      const data = await apiClient.request<{ subject: Subject }>("/admin/subjects", {
        method: "POST", body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || null }),
      });
      setSubjects(prev => [...prev, data.subject]);
      setNewName(""); setNewDesc(""); setAdding(false);
    } catch (e: any) { alert(e.message); }
  };

  const handleEdit = async (s: Subject, newNameVal: string) => {
    try {
      const data = await apiClient.request<{ subject: Subject }>(`/admin/subjects/${s.id}`, {
        method: "PATCH", body: JSON.stringify({ name: newNameVal, description: s.description }),
      });
      setSubjects(prev => prev.map(x => x.id === s.id ? data.subject : x));
      setEditingId(null);
    } catch (e: any) { alert(e.message); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiClient.request(`/admin/subjects/${deleteTarget.id}`, { method: "DELETE" });
      setSubjects(prev => prev.filter(x => x.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e: any) { alert(e.message); }
  };

  const filtered = subjects.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input placeholder="🔍 Пошук предметів..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: "180px" }} />
        <button style={btnStyle("primary")} onClick={() => setAdding(true)}>➕ Додати предмет</button>
      </div>
      {adding && (
        <div style={{ ...cardStyle, flexDirection: "column", marginBottom: "12px", border: "1px solid #34d399" }}>
          <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "8px" }}>Новий предмет</div>
          <input placeholder="Назва *" value={newName} onChange={e => setNewName(e.target.value)} style={{ ...inputStyle, marginBottom: "8px" }} />
          <input placeholder="Опис (необов'язково)" value={newDesc} onChange={e => setNewDesc(e.target.value)} style={{ ...inputStyle, marginBottom: "10px" }} />
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={btnStyle("primary")} onClick={handleAdd}>Зберегти</button>
            <button style={btnStyle("ghost")} onClick={() => { setAdding(false); setNewName(""); setNewDesc(""); }}>Скасувати</button>
          </div>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {filtered.length === 0 && <div style={{ color: "var(--td-text-muted)", textAlign: "center", padding: "30px" }}>Предметів не знайдено</div>}
        {filtered.map(s => (
          <div key={s.id} style={cardStyle}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {editingId === s.id ? (
                <InlineEditField value={s.name} onSave={v => handleEdit(s, v)} onCancel={() => setEditingId(null)} />
              ) : (
                <>
                  <div style={{ fontWeight: 500 }}>{s.name}</div>
                  {s.description && <div style={{ fontSize: "0.8rem", color: "var(--td-text-muted)", marginTop: "3px" }}>{s.description}</div>}
                </>
              )}
            </div>
            {editingId !== s.id && (
              <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                <button style={btnStyle("ghost")} onClick={() => setEditingId(s.id)}>✏️</button>
                <button style={btnStyle("danger")} onClick={() => setDeleteTarget(s)}>🗑️</button>
              </div>
            )}
          </div>
        ))}
      </div>
      {deleteTarget && <DeleteConfirm label={deleteTarget.name} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />}
    </div>
  );
}

export default SubjectsTab
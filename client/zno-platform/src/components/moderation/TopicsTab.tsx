import { useState, useEffect } from "react";
import { apiClient } from "../../services/apiClient";
import LoadingSpinner from "../LoadingSpinner";
import InlineEditField from "./InlineEditField";
import DeleteConfirm from "./DeleteConfirm";

interface Subject { id: string; name: string; description?: string }
interface Topic { id: string; name: string; description?: string; subject_id: string; subjects?: { name: string } }

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

function TopicsTab() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Topic | null>(null);
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSubjectId, setNewSubjectId] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [tData, sData] = await Promise.all([
        apiClient.request<{ topics: Topic[] }>("/teacher/topics"),
        apiClient.request<{ subjects: Subject[] }>("/public/subjects"),
      ]);
      setTopics(tData.topics || []);
      setSubjects(sData.subjects || []);
      if (sData.subjects?.length) setNewSubjectId(sData.subjects[0].id);
    } finally { setLoading(false); }
  };

  const handleAdd = async () => {
    if (!newName.trim() || !newSubjectId) return;
    try {
      const data = await apiClient.request<{ topic: Topic }>("/admin/topics", {
        method: "POST", body: JSON.stringify({ name: newName.trim(), subject_id: newSubjectId }),
      });
      setTopics(prev => [...prev, data.topic]);
      setNewName(""); setAdding(false);
    } catch (e: any) { alert(e.message); }
  };

  const handleEdit = async (t: Topic, newNameVal: string) => {
    try {
      const data = await apiClient.request<{ topic: Topic }>(`/admin/topics/${t.id}`, {
        method: "PATCH", body: JSON.stringify({ name: newNameVal, subject_id: t.subject_id }),
      });
      setTopics(prev => prev.map(x => x.id === t.id ? { ...x, ...data.topic } : x));
      setEditingId(null);
    } catch (e: any) { alert(e.message); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiClient.request(`/admin/topics/${deleteTarget.id}`, { method: "DELETE" });
      setTopics(prev => prev.filter(x => x.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e: any) { alert(e.message); }
  };

  const filtered = topics.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) &&
    (filterSubject === "all" || t.subject_id === filterSubject)
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input placeholder="🔍 Пошук тем..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: "160px" }} />
        <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
          <option value="all">Всі предмети</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button style={btnStyle("primary")} onClick={() => setAdding(true)}>➕ Додати тему</button>
      </div>
      {adding && (
        <div style={{ ...cardStyle, flexDirection: "column", marginBottom: "12px", border: "1px solid #34d399" }}>
          <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "8px" }}>Нова тема</div>
          <input placeholder="Назва *" value={newName} onChange={e => setNewName(e.target.value)} style={{ ...inputStyle, marginBottom: "8px" }} />
          <select value={newSubjectId} onChange={e => setNewSubjectId(e.target.value)} style={{ ...inputStyle, marginBottom: "10px" }}>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={btnStyle("primary")} onClick={handleAdd}>Зберегти</button>
            <button style={btnStyle("ghost")} onClick={() => { setAdding(false); setNewName(""); }}>Скасувати</button>
          </div>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {filtered.length === 0 && <div style={{ color: "var(--td-text-muted)", textAlign: "center", padding: "30px" }}>Тем не знайдено</div>}
        {filtered.map(t => (
          <div key={t.id} style={cardStyle}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {editingId === t.id ? (
                <InlineEditField value={t.name} onSave={v => handleEdit(t, v)} onCancel={() => setEditingId(null)} />
              ) : (
                <>
                  <div style={{ fontWeight: 500 }}>{t.name}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--td-text-muted)", marginTop: "3px" }}>
                    {(t.subjects as any)?.name ?? subjects.find(s => s.id === t.subject_id)?.name ?? "—"}
                  </div>
                </>
              )}
            </div>
            {editingId !== t.id && (
              <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                <button style={btnStyle("ghost")} onClick={() => setEditingId(t.id)}>✏️</button>
                <button style={btnStyle("danger")} onClick={() => setDeleteTarget(t)}>🗑️</button>
              </div>
            )}
          </div>
        ))}
      </div>
      {deleteTarget && <DeleteConfirm label={deleteTarget.name} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />}
    </div>
  );
}

export default TopicsTab
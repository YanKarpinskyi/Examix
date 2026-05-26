import { useState, useEffect } from "react";
import { apiClient } from "../../services/apiClient";
import LoadingSpinner from "../LoadingSpinner";
import DeleteConfirm from "./DeleteConfirm";
import QuestionEditor from "./QuestionEditor";
import AddQuestionForm from "./AddQuestionForm";

interface Subject { id: string; name: string; description?: string }
interface Topic { id: string; name: string; description?: string; subject_id: string; subjects?: { name: string } }
interface Question {
  id: string; content: string; type: string; points: number;
  topic_id: string; created_at: string; options?: any[]; correct_answer?: any;
  topics?: { id: string; name: string; subjects?: { name: string } }
}

const QUESTION_TYPES = [
  { value: "single", label: "Одна відповідь" },
  { value: "multiple", label: "Декілька правильних" },
  { value: "sequence", label: "Послідовність" },
  { value: "matching", label: "Відповідність" },
  { value: "short", label: "Коротка відповідь" },
  { value: "open", label: "Відкрита відповідь" },
];

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  QUESTION_TYPES.map(t => [t.value, t.label])
);

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

function QuestionsTab() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterTopic, setFilterTopic] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [qData, tData, sData] = await Promise.all([
        apiClient.request<{ questions: Question[] }>("/teacher/questions"),
        apiClient.request<{ topics: Topic[] }>("/teacher/topics"),
        apiClient.request<{ subjects: Subject[] }>("/public/subjects"),
      ]);
      setQuestions(qData.questions || []);
      setTopics(tData.topics || []);
      setSubjects(sData.subjects || []);
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiClient.request(`/admin/questions/${deleteTarget.id}`, { method: "DELETE" });
      setQuestions(prev => prev.filter(x => x.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e: any) { alert(e.message); }
  };

  const handleEdit = async (q: Question, updated: { content: string; options: any[] }) => {
    try {
      const data = await apiClient.request<{ question: Question }>(`/admin/questions/${q.id}`, {
        method: "PATCH",
        body: JSON.stringify({ content: updated.content, options: updated.options }),
      });
      setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, ...data.question } : x));
      setEditingId(null);
      setExpanded(null);
    } catch (e: any) { alert(e.message); }
  };

  const handleAdded = (newQ: Question) => {
    setQuestions(prev => [newQ, ...prev]);
    setAdding(false);
  };

  const visibleTopics = filterSubject === "all"
    ? topics
    : topics.filter(t => t.subject_id === filterSubject);

  const handleSubjectChange = (sid: string) => {
    setFilterSubject(sid);
    const stillValid = sid === "all" || topics.find(t => t.id === filterTopic && t.subject_id === sid);
    if (!stillValid) setFilterTopic("all");
  };

  const filtered = questions.filter(q => {
    const matchSearch = q.content.toLowerCase().includes(search.toLowerCase());
    const matchTopic = filterTopic === "all" || q.topic_id === filterTopic;
    const matchType = filterType === "all" || q.type === filterType;
    const matchSubject = filterSubject === "all" || (() => {
      const topic = topics.find(t => t.id === q.topic_id);
      return topic?.subject_id === filterSubject;
    })();
    return matchSearch && matchTopic && matchType && matchSubject;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input placeholder="🔍 Пошук питань..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: "180px" }} />
        <select value={filterSubject} onChange={e => handleSubjectChange(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
          <option value="all">Всі предмети</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterTopic} onChange={e => setFilterTopic(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
          <option value="all">Всі теми</option>
          {visibleTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
          <option value="all">Всі типи</option>
          {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button style={btnStyle("primary")} onClick={() => { setAdding(true); setExpanded(null); setEditingId(null); }}>
          ➕ Додати питання
        </button>
      </div>

      {adding && (
        <AddQuestionForm
          topics={topics}
          subjects={subjects}
          onSave={handleAdded}
          onCancel={() => setAdding(false)}
        />
      )}

      <div style={{ fontSize: "0.82rem", color: "var(--td-text-muted)", marginBottom: "10px" }}>
        Знайдено: {filtered.length} з {questions.length}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {filtered.length === 0 && (
          <div style={{ color: "var(--td-text-muted)", textAlign: "center", padding: "30px" }}>Питань не знайдено</div>
        )}
        {filtered.map(q => {
          const topicName = q.topics?.name ?? topics.find(t => t.id === q.topic_id)?.name ?? "—";
          const subjectName = (q.topics?.subjects as any)?.name ?? "—";
          const isExpanded = expanded === q.id;
          const isEditing = editingId === q.id;

          return (
            <div key={q.id} style={{
              ...cardStyle, flexDirection: "column", cursor: isEditing ? "default" : "pointer",
              borderColor: isEditing ? "#34d399" : isExpanded ? "var(--td-accent)" : "var(--td-surface-2)",
            }}>
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", width: "100%" }}
                onClick={() => { if (!isEditing) setExpanded(isExpanded ? null : q.id); }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: "0.88rem", fontWeight: 500,
                    overflow: "hidden", textOverflow: "ellipsis",
                    whiteSpace: (isExpanded || isEditing) ? "normal" : "nowrap",
                  }}>
                    {q.content}
                  </div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "5px", flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: "0.72rem", padding: "2px 8px", borderRadius: "999px",
                      background: "rgba(129,140,248,0.15)", color: "#818cf8", fontWeight: 600,
                    }}>{TYPE_LABELS[q.type] ?? q.type}</span>
                    <span style={{ fontSize: "0.72rem", color: "var(--td-text-muted)" }}>
                      {subjectName} → {topicName}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "var(--td-text-muted)" }}>{q.points} б.</span>
                  </div>
                </div>
                {!isEditing && (
                  <div style={{ display: "flex", gap: "6px", flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button style={btnStyle("ghost")} onClick={() => { setEditingId(q.id); setExpanded(q.id); }}>✏️</button>
                    <button style={btnStyle("danger")} onClick={() => setDeleteTarget(q)}>🗑️</button>
                  </div>
                )}
              </div>

              {isEditing && (
                <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--td-surface-2)", width: "100%" }}>
                  <QuestionEditor question={q} onSave={updated => handleEdit(q, updated)} onCancel={() => setEditingId(null)} />
                </div>
              )}

              {isExpanded && !isEditing && q.options && q.options.length > 0 && (
                <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--td-surface-2)", width: "100%" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--td-text-muted)", marginBottom: "6px" }}>Варіанти відповідей:</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {q.options.map((opt: any, i: number) => {
                      const text = typeof opt === "string" ? opt : opt.text;
                      const isCorrect = typeof opt === "object" && opt.isCorrect;
                      return (
                        <div key={i} style={{
                          padding: "5px 10px", borderRadius: "5px", fontSize: "0.83rem",
                          background: isCorrect ? "rgba(52,211,153,0.12)" : "var(--td-surface-2)",
                          color: isCorrect ? "#34d399" : "var(--td-text)",
                          display: "flex", alignItems: "center", gap: "6px",
                        }}>
                          {isCorrect && <span>✓</span>}
                          {text}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {deleteTarget && (
        <DeleteConfirm
          label={deleteTarget.content.substring(0, 60) + (deleteTarget.content.length > 60 ? "..." : "")}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

export default QuestionsTab
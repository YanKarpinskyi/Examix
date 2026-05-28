import { useState } from "react";
import { apiClient } from "../../services/apiClient";
import OptionsEditor from "./OptionsEditor";
import { Save, AlertTriangle, Plus } from "lucide-react";

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

function AddQuestionForm({ topics, subjects, onSave, onCancel }: {
  topics: Topic[];
  subjects: Subject[];
  onSave: (q: Question) => void;
  onCancel: () => void;
}) {
  const [content, setContent] = useState("");
  const [type, setType] = useState("single");
  const [points, setPoints] = useState(1);
  const [filterSubjectId, setFilterSubjectId] = useState(subjects[0]?.id ?? "");
  const [topicId, setTopicId] = useState("");
  const [options, setOptions] = useState<{ text: string; isCorrect: boolean }[]>([
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const visibleTopics = topics.filter(t => t.subject_id === filterSubjectId);

  const handleSubjectChange = (sid: string) => {
    setFilterSubjectId(sid);
    setTopicId("");
  };

  const handleTypeChange = (newType: string) => {
    setType(newType);
    if (newType === "short" || newType === "open") {
      setOptions([]);
    } else if (newType === "sequence") {
      setOptions([{ text: "", isCorrect: true }, { text: "", isCorrect: true }]);
    } else {
      setOptions([{ text: "", isCorrect: false }, { text: "", isCorrect: false }]);
    }
  };

  const validate = (): string => {
    if (!content.trim()) return "Введіть текст питання";
    if (!topicId) return "Оберіть тему";
    if (type !== "short" && type !== "open") {
      if (options.some(o => !o.text.trim())) return "Заповніть усі варіанти відповідей";
      if (type === "single" && !options.some(o => o.isCorrect)) return "Позначте правильну відповідь";
      if (type === "multiple" && !options.some(o => o.isCorrect)) return "Позначте хоча б одну правильну відповідь";
      if (options.length < 2) return "Додайте мінімум 2 варіанти";
    }
    return "";
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    setError("");
    try {
      const data = await apiClient.request<{ question: Question }>("/teacher/questions", {
        method: "POST",
        body: JSON.stringify({
          text: content.trim(),
          type,
          topicId,
          points,
          options: type === "short" || type === "open" ? [] : options,
        }),
      });
      onSave(data.question);
    } catch (e: any) {
      setError(e.message ?? "Помилка збереження");
    } finally {
      setSaving(false);
    }
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.78rem", color: "var(--td-text-muted)", marginBottom: "4px", display: "block",
  };

  return (
    <div style={{
      ...cardStyle, flexDirection: "column", marginBottom: "16px",
      border: "1px solid #34d399", gap: "14px",
    }}>
      <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#34d399", display: "flex", alignItems: "center", gap: "6px" }}>
        <Plus size={16} /> Нове питання
      </div>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <div style={{ flex: 2, minWidth: "160px" }}>
          <label style={labelStyle}>Тип питання</label>
          <select value={type} onChange={e => handleTypeChange(e.target.value)} style={inputStyle}>
            {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div style={{ flex: "0 0 90px" }}>
          <label style={labelStyle}>Балів</label>
          <input type="number" min={1} max={100} value={points}
            onChange={e => setPoints(Number(e.target.value))}
            style={inputStyle} />
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "160px" }}>
          <label style={labelStyle}>Предмет</label>
          <select value={filterSubjectId} onChange={e => handleSubjectChange(e.target.value)} style={inputStyle}>
            <option value="">— Оберіть предмет —</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: "160px" }}>
          <label style={labelStyle}>Тема *</label>
          <select value={topicId} onChange={e => setTopicId(e.target.value)} style={inputStyle}
            disabled={!filterSubjectId}>
            <option value="">— Оберіть тему —</option>
            {visibleTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Текст питання *</label>
        <textarea value={content} onChange={e => setContent(e.target.value)} rows={3}
          style={{ ...inputStyle, resize: "vertical" }} placeholder="Введіть текст питання..." />
      </div>

      {type !== "short" && type !== "open" && (
        <div>
          <label style={labelStyle}>Варіанти відповідей</label>
          <OptionsEditor type={type} options={options} onUpdate={setOptions} />
        </div>
      )}

      {error && (
        <div style={{
          padding: "8px 12px", borderRadius: "6px",
          background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: "0.83rem",
        }}>
          <AlertTriangle size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "8px" }}>
        <button style={{ ...btnStyle("primary"), display: "flex", alignItems: "center", gap: "5px" }}
          onClick={handleSave} disabled={saving}>
          {saving ? "Збереження..." : <><Save size={13} /> Зберегти питання</>}
        </button>
        <button style={btnStyle("ghost")} onClick={onCancel} disabled={saving}>Скасувати</button>
      </div>
    </div>
  );
}

export default AddQuestionForm
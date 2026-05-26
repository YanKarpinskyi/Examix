import { useState } from "react";
import OptionsEditor from "./OptionsEditor";

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

interface Question {
  id: string; content: string; type: string; points: number;
  topic_id: string; created_at: string; options?: any[]; correct_answer?: any;
  topics?: { id: string; name: string; subjects?: { name: string } }
}

function QuestionEditor({ question, onSave, onCancel }: {
  question: Question;
  onSave: (updated: { content: string; options: any[] }) => void;
  onCancel: () => void;
}) {
  const [content, setContent] = useState(question.content);
  const [options, setOptions] = useState<{ text: string; isCorrect: boolean }[]>(
    (question.options || []).map((o: any) =>
      typeof o === "string" ? { text: o, isCorrect: false } : { text: o.text ?? o, isCorrect: !!o.isCorrect }
    )
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
      <textarea value={content} onChange={e => setContent(e.target.value)} rows={3} autoFocus
        style={{ ...inputStyle, resize: "vertical" }} placeholder="Текст питання" />
      <OptionsEditor type={question.type} options={options} onUpdate={setOptions} />
      <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
        <button style={btnStyle("primary")} onClick={() => onSave({ content, options })}>💾 Зберегти</button>
        <button style={btnStyle("ghost")} onClick={onCancel}>Скасувати</button>
      </div>
    </div>
  );
}

export default QuestionEditor
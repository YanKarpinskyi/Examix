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

function OptionsEditor({
  type, options, onUpdate,
}: {
  type: string;
  options: { text: string; isCorrect: boolean }[];
  onUpdate: (opts: { text: string; isCorrect: boolean }[]) => void;
}) {
  const updateOption = (i: number, field: "text" | "isCorrect", value: any) => {
    const next = options.map((o, idx) => idx === i ? { ...o, [field]: value } : o);
    if (field === "isCorrect" && value && type === "single") {
      onUpdate(next.map((o, idx) => ({ ...o, isCorrect: idx === i })));
    } else {
      onUpdate(next);
    }
  };
  const addOption = () => onUpdate([...options, { text: "", isCorrect: false }]);
  const removeOption = (i: number) => onUpdate(options.filter((_, idx) => idx !== i));

  if (type === "short" || type === "open") {
    return (
      <div style={{ fontSize: "0.8rem", color: "var(--td-text-muted)", padding: "8px 0" }}>
        Для цього типу питань правильна відповідь задається текстом — студент вводить відповідь вручну.
      </div>
    );
  }

  if (type === "matching") {
    return (
      <div>
        <div style={{ fontSize: "0.78rem", color: "var(--td-text-muted)", marginBottom: "8px" }}>
          Пари «ліво → право» (кожен варіант — це ліва частина, поле isCorrect не використовується):
        </div>
        {options.map((opt, i) => (
          <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--td-text-muted)", minWidth: "20px" }}>{i + 1}.</span>
            <input value={opt.text} onChange={e => updateOption(i, "text", e.target.value)}
              style={{ ...inputStyle, flex: 1 }} placeholder={`Елемент ${i + 1}`} />
            <button onClick={() => removeOption(i)} style={{ ...btnStyle("danger"), padding: "5px 8px" }}>✕</button>
          </div>
        ))}
        <button style={{ ...btnStyle("ghost"), marginTop: "4px" }} onClick={addOption}>➕ Додати пару</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: "0.78rem", color: "var(--td-text-muted)", marginBottom: "8px" }}>
        {type === "single" && "Позначте одну правильну відповідь (✓):"}
        {type === "multiple" && "Позначте всі правильні відповіді (✓):"}
        {type === "sequence" && "Додайте елементи в правильному порядку (порядок = правильна послідовність):"}
      </div>
      {options.map((opt, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          {type !== "sequence" && (
            <button
              onClick={() => updateOption(i, "isCorrect", !opt.isCorrect)}
              title="Правильна відповідь"
              style={{
                width: "28px", height: "28px", borderRadius: "6px", border: "none",
                cursor: "pointer", flexShrink: 0, fontSize: "0.85rem", fontWeight: 700,
                background: opt.isCorrect ? "rgba(52,211,153,0.2)" : "var(--td-surface-2)",
                color: opt.isCorrect ? "#34d399" : "var(--td-text-muted)",
              }}
            >✓</button>
          )}
          {type === "sequence" && (
            <span style={{
              width: "28px", height: "28px", borderRadius: "6px", background: "rgba(129,140,248,0.15)",
              color: "#818cf8", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.78rem", fontWeight: 700, flexShrink: 0,
            }}>{i + 1}</span>
          )}
          <input value={opt.text} onChange={e => updateOption(i, "text", e.target.value)}
            style={{ ...inputStyle, flex: 1 }} placeholder={`Варіант ${i + 1}`} />
          <button onClick={() => removeOption(i)} style={{ ...btnStyle("danger"), padding: "5px 8px" }}>✕</button>
        </div>
      ))}
      <button style={{ ...btnStyle("ghost"), marginTop: "4px" }} onClick={addOption}>➕ Додати варіант</button>
    </div>
  );
}

export default OptionsEditor
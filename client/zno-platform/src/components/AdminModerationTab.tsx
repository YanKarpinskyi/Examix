import { useState } from "react";
import QuestionsTab from "./moderation/QuestionsTab";
import SubjectsTab from "./moderation/SubjectsTab";
import TopicsTab from "./moderation/TopicsTab";

type ModerationTab = "questions" | "topics" | "subjects";

export default function AdminModerationTab() {
  const [tab, setTab] = useState<ModerationTab>("questions");

  const tabs: { id: ModerationTab; label: string; icon: string }[] = [
    { id: "questions", label: "Питання", icon: "❓" },
    { id: "topics", label: "Теми", icon: "📚" },
    { id: "subjects", label: "Предмети", icon: "🎓" },
  ];

  return (
    <div className="td-form">
      <h2>✏️ Модерація контенту</h2>
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", borderBottom: "1px solid var(--td-surface-2)", paddingBottom: "0" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "8px 18px", border: "none", cursor: "pointer",
            background: "transparent", fontSize: "0.9rem", fontWeight: 600,
            color: tab === t.id ? "var(--td-accent)" : "var(--td-text-muted)",
            borderBottom: tab === t.id ? "2px solid var(--td-accent)" : "2px solid transparent",
            transition: "all 0.15s", marginBottom: "-1px",
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {tab === "questions" && <QuestionsTab />}
      {tab === "topics" && <TopicsTab />}
      {tab === "subjects" && <SubjectsTab />}
    </div>
  );
}
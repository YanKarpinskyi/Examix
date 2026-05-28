import { useState } from "react";
import { HelpCircle, BookOpen, GraduationCap, Pencil } from "lucide-react";
import QuestionsTab from "../moderation/QuestionsTab";
import SubjectsTab from "../moderation/SubjectsTab";
import TopicsTab from "../moderation/TopicsTab";
import { useTheme } from '../../context/ThemeContext';

type ModerationTab = "questions" | "topics" | "subjects";

export default function AdminModerationTab() {
  const { isDark, toggleTheme } = useTheme();
  const h2Style: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "8px",
    justifyContent: "center", color: isDark ? "#dbdbdb" : undefined,
  };
  const [tab, setTab] = useState<ModerationTab>("questions");

  const tabs: { id: ModerationTab; label: string; icon: React.ReactNode }[] = [
    { id: "questions", label: "Питання",  icon: <HelpCircle size={15} /> },
    { id: "topics",    label: "Теми",     icon: <BookOpen size={15} /> },
    { id: "subjects",  label: "Предмети", icon: <GraduationCap size={15} /> },
  ];

  return (
    <div className="td-form">
      <h2 style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: 'center', color: isDark ? "#dbdbdb" : undefined }}>
        <Pencil size={20} /> Модерація контенту
      </h2>
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", borderBottom: "1px solid var(--td-surface-2)", paddingBottom: "0" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "8px 18px", border: "none", cursor: "pointer",
            background: "transparent", fontSize: "0.9rem", fontWeight: 600,
            color: tab === t.id ? "var(--td-accent)" : "var(--td-text-muted)",
            borderBottom: tab === t.id ? "2px solid var(--td-accent)" : "2px solid transparent",
            transition: "all 0.15s", marginBottom: "-1px",
            display: "flex", alignItems: "center", gap: "6px",
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
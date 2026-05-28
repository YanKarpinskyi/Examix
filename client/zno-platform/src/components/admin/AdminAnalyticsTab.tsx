import { useEffect, useState } from "react";
import { apiClient } from "../../services/apiClient";
import LoadingSpinner from "../LoadingSpinner";
import {
  GraduationCap, BookUser, FileText, Target, CheckCircle,
  TrendingUp, Puzzle, XCircle, BarChart2,
} from "lucide-react";
import { useTheme } from '../../context/ThemeContext';

interface WeekPoint { label: string; count: number; avgPercent: number }
interface HardTopic { id: string; name: string; subjectName: string; avgPercent: number; attempts: number }
interface Analytics {
  totalStudents: number;
  totalTeachers: number;
  avgScore: number;
  avgPercent: number;
  totalAttempts: number;
  weeklyDynamics: WeekPoint[];
  hardestTopics: HardTopic[];
}

const statCard = (icon: React.ReactNode, label: string, value: string | number, sub?: string) => (
  <div style={{
    background: "var(--td-surface)", border: "1px solid var(--td-surface-2)",
    borderRadius: "10px", padding: "18px 20px", flex: "1 1 160px",
  }}>
    <div style={{ marginBottom: "8px", color: "var(--td-accent)" }}>{icon}</div>
    <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--td-text)", lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: "0.8rem", color: "var(--td-text-muted)", marginTop: "6px" }}>{label}</div>
    {sub && <div style={{ fontSize: "0.75rem", color: "var(--td-accent)", marginTop: "4px" }}>{sub}</div>}
  </div>
);

function MiniBarChart({ data }: { data: WeekPoint[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "80px" }}>
        {data.map((d) => (
          <div key={d.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", height: "100%" }}>
            <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
              <div
                title={`${d.count} спроб, ${d.avgPercent}% середній`}
                style={{
                  width: "100%",
                  height: `${Math.max((d.count / max) * 100, d.count > 0 ? 8 : 2)}%`,
                  background: d.count > 0 ? "var(--td-accent)" : "var(--td-surface-2)",
                  borderRadius: "3px 3px 0 0",
                  opacity: 0.85,
                  transition: "height 0.3s",
                  cursor: "default",
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
        {data.map((d) => (
          <div key={d.label} style={{ flex: 1, textAlign: "center", fontSize: "0.65rem", color: "var(--td-text-muted)", overflow: "hidden" }}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function PercentBar({ percent, color = "var(--td-accent)" }: { percent: number; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div style={{ flex: 1, height: "6px", background: "var(--td-surface-2)", borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ width: `${percent}%`, height: "100%", background: color, borderRadius: "3px", transition: "width 0.4s" }} />
      </div>
      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--td-text-muted)", minWidth: "36px", textAlign: "right" }}>
        {percent}%
      </span>
    </div>
  );
}

function difficultyColor(p: number) {
  if (p < 40) return "#f87171";
  if (p < 60) return "#fbbf24";
  return "#34d399";
}

export default function AdminAnalyticsTab() {
  const { isDark, toggleTheme } = useTheme();
  const h2Style: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "8px",
    justifyContent: "center", color: isDark ? "#dbdbdb" : undefined,
  };
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.request<Analytics>("/admin/analytics")
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="td-form">
      <h2 style={h2Style}><BarChart2 size={20} /> Загальна аналітика платформи</h2>
      <LoadingSpinner />
    </div>
  );

  if (error || !data) return (
    <div className="td-form">
      <h2 style={h2Style}><BarChart2 size={20} /> Загальна аналітика платформи</h2>
      <div style={{ textAlign: "center", padding: "40px", color: "#f87171", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
        <XCircle size={18} /> Помилка завантаження: {error}
      </div>
    </div>
  );

  return (
    <div className="td-form">
      <h2 style={h2Style}><BarChart2 size={20} /> Загальна аналітика платформи</h2>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "24px" }}>
        {statCard(<GraduationCap size={28} />, "Студентів", data.totalStudents)}
        {statCard(<BookUser size={28} />, "Викладачів", data.totalTeachers)}
        {statCard(<FileText size={28} />, "Спроб тестів", data.totalAttempts)}
        {statCard(<Target size={28} />, "Середній бал", data.avgScore)}
        {statCard(<CheckCircle size={28} />, "Середній %", `${data.avgPercent}%`, "правильних відповідей")}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
        <div style={{
          flex: "1 1 280px", background: "var(--td-surface)",
          border: "1px solid var(--td-surface-2)", borderRadius: "10px", padding: "18px 20px",
        }}>
          <div style={{ fontWeight: 600, marginBottom: "14px", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "6px" }}>
            <TrendingUp size={16} /> Динаміка активності (спроби по тижнях)
          </div>
          <MiniBarChart data={data.weeklyDynamics} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px" }}>
            {data.weeklyDynamics.map((w) => w.count > 0 && (
              <div key={w.label} style={{ fontSize: "0.7rem", color: "var(--td-text-muted)", textAlign: "center", flex: 1 }}>
                {w.avgPercent > 0 && <span style={{ color: difficultyColor(w.avgPercent) }}>{w.avgPercent}%</span>}
              </div>
            ))}
          </div>
        </div>

        <div style={{
          flex: "1 1 280px", background: "var(--td-surface)",
          border: "1px solid var(--td-surface-2)", borderRadius: "10px", padding: "18px 20px",
        }}>
          <div style={{ fontWeight: 600, marginBottom: "16px", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "6px" }}>
            <Puzzle size={16} /> Найскладніші теми
          </div>
          {data.hardestTopics.length === 0 ? (
            <div style={{ color: "var(--td-text-muted)", fontSize: "0.85rem" }}>Недостатньо даних</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {data.hardestTopics.map(t => (
                <div key={t.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <div>
                      <span style={{ fontSize: "0.88rem", fontWeight: 500 }}>{t.name}</span>
                      <span style={{ fontSize: "0.78rem", color: "var(--td-text-muted)", marginLeft: "8px" }}>{t.subjectName}</span>
                    </div>
                    <span style={{ fontSize: "0.78rem", color: "var(--td-text-muted)" }}>{t.attempts} спроб</span>
                  </div>
                  <PercentBar percent={t.avgPercent} color={difficultyColor(t.avgPercent)} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { apiClient } from "../services/apiClient";
import LoadingSpinner from "../components/LoadingSpinner";

interface WeekPoint { label: string; count: number; avgPercent: number }
interface HardTopic { id: string; name: string; subjectName: string; attempts: number; avgPercent: number }
interface RecentUser { id: string; username: string | null; email: string; role: string; created_at: string; group_students: { groups: { name: string } | null }[] }

interface Analytics {
  totalStudents: number;
  totalTeachers: number;
  recentUsers: RecentUser[];
  avgScore: number;
  avgPercent: number;
  totalAttempts: number;
  weeklyDynamics: WeekPoint[];
  hardestTopics: HardTopic[];
}

const statCard = (icon: string, label: string, value: string | number, sub?: string) => (
  <div style={{
    background: "var(--td-surface)", border: "1px solid var(--td-surface-2)",
    borderRadius: "10px", padding: "18px 20px", flex: "1 1 160px",
  }}>
    <div style={{ fontSize: "1.6rem", marginBottom: "8px" }}>{icon}</div>
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
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", height: "100%" }}>
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
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center", fontSize: "0.65rem", color: "var(--td-text-muted)", overflow: "hidden" }}>
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
      <div style={{
        flex: 1, height: "6px", background: "var(--td-surface-2)", borderRadius: "3px", overflow: "hidden",
      }}>
        <div style={{
          width: `${percent}%`, height: "100%", background: color,
          borderRadius: "3px", transition: "width 0.4s",
        }} />
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
        <h2>📊 Загальна аналітика платформи</h2>
        <LoadingSpinner />
    </div>
    );

  if (error || !data) return (
    <div className="td-form">
      <h2>📊 Загальна аналітика платформи</h2>
      <div style={{ textAlign: "center", padding: "40px", color: "#f87171" }}>
        ❌ Помилка завантаження: {error}
      </div>
    </div>
  );

  return (
    <div className="td-form">
      <h2>📊 Загальна аналітика платформи</h2>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "24px" }}>
        {statCard("👨‍🎓", "Студентів", data.totalStudents)}
        {statCard("👩‍🏫", "Викладачів", data.totalTeachers)}
        {statCard("📝", "Спроб тестів", data.totalAttempts)}
        {statCard("🎯", "Середній бал", data.avgScore)}
        {statCard("✅", "Середній %", `${data.avgPercent}%`, "правильних відповідей")}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>

        <div style={{
          flex: "1 1 280px", background: "var(--td-surface)",
          border: "1px solid var(--td-surface-2)", borderRadius: "10px", padding: "18px 20px",
        }}>
          <div style={{ fontWeight: 600, marginBottom: "14px", fontSize: "0.95rem" }}>
            📈 Динаміка активності (спроби по тижнях)
          </div>
          <MiniBarChart data={data.weeklyDynamics} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px" }}>
            {data.weeklyDynamics.map((w, i) => w.count > 0 && (
              <div key={i} style={{ fontSize: "0.7rem", color: "var(--td-text-muted)", textAlign: "center", flex: 1 }}>
                {w.avgPercent > 0 && <span style={{ color: difficultyColor(w.avgPercent) }}>{w.avgPercent}%</span>}
              </div>
            ))}
          </div>
        </div>

        <div style={{
          flex: "1 1 280px", background: "var(--td-surface)",
          border: "1px solid var(--td-surface-2)", borderRadius: "10px", padding: "18px 20px",
        }}>
          <div style={{ fontWeight: 600, marginBottom: "14px", fontSize: "0.95rem" }}>
            🆕 Нові реєстрації
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "220px", overflowY: "auto" }}>
            {data.recentUsers.length === 0 && (
              <div style={{ color: "var(--td-text-muted)", fontSize: "0.85rem" }}>Немає даних</div>
            )}
            {data.recentUsers.map(u => {
              const groups = (u.group_students || [])
                .map((gs: any) => gs.groups?.name)
                .filter(Boolean)
                .join(", ");
              return (
                <div key={u.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                  padding: "8px 10px", background: "var(--td-surface-2)", borderRadius: "6px", gap: "8px",
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {u.username || u.email}
                    </div>
                    {groups && (
                      <div style={{ fontSize: "0.75rem", color: "var(--td-accent)", marginTop: "2px" }}>
                        📚 {groups}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{
                      fontSize: "0.72rem", padding: "2px 7px", borderRadius: "999px",
                      background: u.role === "teacher" ? "rgba(52,211,153,0.15)" : "rgba(148,163,184,0.15)",
                      color: u.role === "teacher" ? "#34d399" : "#94a3b8",
                      fontWeight: 600,
                    }}>
                      {u.role}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--td-text-muted)", marginTop: "3px" }}>
                      {new Date(u.created_at).toLocaleDateString("uk-UA")}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{
        background: "var(--td-surface)", border: "1px solid var(--td-surface-2)",
        borderRadius: "10px", padding: "18px 20px",
      }}>
        <div style={{ fontWeight: 600, marginBottom: "16px", fontSize: "0.95rem" }}>
          🧩 Найскладніші теми
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
                    <span style={{ fontSize: "0.78rem", color: "var(--td-text-muted)", marginLeft: "8px" }}>
                      {t.subjectName}
                    </span>
                  </div>
                  <span style={{ fontSize: "0.78rem", color: "var(--td-text-muted)" }}>
                    {t.attempts} спроб
                  </span>
                </div>
                <PercentBar percent={t.avgPercent} color={difficultyColor(t.avgPercent)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
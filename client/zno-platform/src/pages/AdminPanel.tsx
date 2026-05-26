import { useState } from "react";
import AdminLogsTab from '../components/AdminLogsTab';
import AdminUsersTab from "../components/AdminUsersTab";
import AdminRolesTab from "../components/AdminRolesTab";
import "./TeacherDashboard.scss";

function AdminAnalyticsTab() {
  return (
    <div className="td-form" style={{width: '100vw', margin: '0 auto'}}>
      <h2>📊 Загальна аналітика платформи</h2>
      <div style={{ background: "var(--td-surface-2)", padding: "20px", borderRadius: "8px", textAlign: "center" }}>
        🚧 В розробці
      </div>
    </div>
  );
}

function AdminModerationTab() {
  return (
    <div className="td-form">
      <h2>✏️ Модерація контенту</h2>
      <div style={{ background: "var(--td-surface-2)", padding: "20px", borderRadius: "8px", textAlign: "center" }}>
        🚧 В розробці
      </div>
    </div>
  );
}

type AdminTab = "users" | "logs" | "analytics" | "moderation" | "roles";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<AdminTab>("users");

  const menuItems = [
    { id: "users" as const, icon: "👥", title: "Користувачі" },
    { id: "logs" as const, icon: "📋", title: "Активність" },
    { id: "analytics" as const, icon: "📊", title: "Аналітика" },
    { id: "moderation" as const, icon: "✏️", title: "Модерація" },
    { id: "roles" as const, icon: "🔐", title: "Ролі та права" },
  ];

  return (
    <div className="teacher-dashboard">
      <div className="td-inner">
        <div className="td-header">
          <h1>🛡️ Адмін-панель</h1>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "16px", marginTop: "30px" }}>
          {menuItems.map(item => (
            <div
              key={item.id}
              className="td-q-card"
              onClick={() => setActiveTab(item.id)}
              style={{
                cursor: "pointer",
                border: activeTab === item.id ? "2px solid var(--td-accent)" : "1px solid var(--td-surface-2)",
                background: activeTab === item.id ? "rgba(110, 207, 160, 0.1)" : "var(--td-surface)",
                padding: "20px 18px", display: "flex", flexDirection: "column",
                alignItems: "center", textAlign: "center", transition: "all 0.2s ease",
                minHeight: "160px", width: "200px", flexShrink: 0, justifyContent: "center", flexGrow: 1,
              }}
            >
              <div style={{ fontSize: "2.1rem", marginBottom: "12px", lineHeight: 1 }}>{item.icon}</div>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "1.1rem", fontWeight: 600 }}>{item.title}</h3>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "30px" }}>
          {activeTab === "users" && <AdminUsersTab />}
          {activeTab === "logs" && <AdminLogsTab />}
          {activeTab === "analytics" && <AdminAnalyticsTab />}
          {activeTab === "moderation" && <AdminModerationTab />}
          {activeTab === "roles" && <AdminRolesTab />}
        </div>
      </div>
    </div>
  );
}
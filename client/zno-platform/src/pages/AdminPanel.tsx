import { useState } from "react";
// import { useAuth } from "../hooks/useAuth";
import "./TeacherDashboard.scss";

// Компоненти для адмін-функцій (поки що заглушки)
function AdminUsersTab() { 
    return (
        <div className="td-form">
            <h2>👥 Управління користувачами</h2>
            <p style={{ color: "var(--td-text-muted)" }}>
                TODO: Заблокувати користувача, модалка користувачу про це
            </p>
            <div style={{ background: "var(--td-surface-2)", padding: "20px", borderRadius: "8px", textAlign: "center" }}>
                🚧 В розробці: CRUD, блокування, додавання/видалення користувачів
            </div>
        </div>
    );
}

function AdminLogsTab() { 
    return (
        <div className="td-form">
            <h2>📋 Логування дій користувачів</h2>
            <p style={{ color: "var(--td-text-muted)" }}>
                TODO: Логування всіх дій певного користувача
            </p>
            <div style={{ background: "var(--td-surface-2)", padding: "20px", borderRadius: "8px", textAlign: "center" }}>
                🚧 В розробці: Історія дій користувачів
            </div>
        </div>
    );
}

function AdminAnalyticsTab() { 
    return (
        <div className="td-form">
            <h2>📊 Загальна аналітика платформи</h2>
            <p style={{ color: "var(--td-text-muted)" }}>
                TODO: Переглядати загальну аналітику платформи
            </p>
            <div style={{ background: "var(--td-surface-2)", padding: "20px", borderRadius: "8px", textAlign: "center" }}>
                🚧 В розробці: Статистика використання, популярні теми, тощо
            </div>
        </div>
    );
}

function AdminModerationTab() { 
    return (
        <div className="td-form">
            <h2>✏️ Модерація контенту</h2>
            <p style={{ color: "var(--td-text-muted)" }}>
                TODO: Модерувати контент (редагувати, створювати, видаляти)
            </p>
            <div style={{ background: "var(--td-surface-2)", padding: "20px", borderRadius: "8px", textAlign: "center" }}>
                🚧 В розробці: Управління питаннями, темами, предметами
            </div>
        </div>
    );
}

function AdminRolesTab() { 
    return (
        <div className="td-form">
            <h2>🔐 Налаштування ролей та прав доступу</h2>
            <p style={{ color: "var(--td-text-muted)" }}>
                TODO: Налаштовувати ролі та права доступу
            </p>
            <div style={{ background: "var(--td-surface-2)", padding: "20px", borderRadius: "8px", textAlign: "center" }}>
                🚧 В розробці: Керування ролями, створення нових ролей, права
            </div>
        </div>
    );
}

type AdminTab = "users" | "logs" | "analytics" | "moderation" | "roles";

export default function AdminPanel() {
    const [activeTab, setActiveTab] = useState<AdminTab>("users");

    const menuItems = [
        { id: "users" as const, icon: "👥", title: "Користувачі", desc: "CRUD, блокування, додавання" },
        { id: "logs" as const, icon: "📋", title: "Логи дій", desc: "Перегляд активності користувачів" },
        { id: "analytics" as const, icon: "📊", title: "Аналітика", desc: "Загальна статистика платформи" },
        { id: "moderation" as const, icon: "✏️", title: "Модерація", desc: "Управління контентом" },
        { id: "roles" as const, icon: "🔐", title: "Ролі та права", desc: "Налаштування доступу" },
    ];

    return (
        <div className="teacher-dashboard">
            <div className="td-inner">
                <div className="td-header">
                    <h1>🛡️ Адмін панель</h1>
                    <p style={{ color: "var(--td-text-muted)" }}>
                        Керування платформою: користувачі, логування, аналітика, модерація, ролі
                    </p>
                </div>

                <div style={{ 
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    gap: "16px", 
                    marginTop: "30px" 
                }}>
                    {menuItems.map((item) => (
                        <div 
                            key={item.id}
                            className="td-q-card" 
                            onClick={() => setActiveTab(item.id)} 
                            style={{ 
                                cursor: "pointer",
                                border: activeTab === item.id ? "2px solid var(--td-accent)" : "1px solid var(--td-surface-2)",
                                background: activeTab === item.id ? "rgba(110, 207, 160, 0.1)" : "var(--td-surface)",
                                padding: "20px 18px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                textAlign: "center",
                                transition: "all 0.2s ease",
                                minHeight: "160px",
                                width: "260px",     
                                flexShrink: 0
                            }}
                        >
                            <div style={{ fontSize: "2.1rem", marginBottom: "12px", lineHeight: 1 }}>
                                {item.icon}
                            </div>
                            
                            <h3 style={{ margin: "0 0 8px 0", fontSize: "1.1rem", fontWeight: 600 }}>
                                {item.title}
                            </h3>
                            
                            <p style={{ 
                                color: "var(--td-text-muted)", 
                                fontSize: "0.85rem",
                                lineHeight: "1.4",
                                margin: 0,
                                flexGrow: 1
                            }}>
                                {item.desc}
                            </p>
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
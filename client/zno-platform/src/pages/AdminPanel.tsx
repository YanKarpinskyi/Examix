import { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";
import { apiClient } from "../services/apiClient";
import type { Role } from "@zno/shared";

interface Subject { id: string; name: string; }
interface Topic { id: string; name: string; subject_id: string; }
interface Group { id: string; name: string; }
interface AdminUser { id: string; username: string; email: string; role: Role; created_at: string; }

interface Assignment {
  id: string;
  group: { name: string } | null;
  subject: { name: string } | null;
  topic: { name: string } | null;
  due_date?: string;
  created_at: string;
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<"assignments" | "groups" | "questions" | "analytics" | "review" | "users">("assignments");

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);

  const [newGroupName, setNewGroupName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  
  const [assignSubjectId, setAssignSubjectId] = useState("");
  const [assignTopicId, setAssignTopicId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignmentType, setAssignmentType] = useState<"subject" | "topic">("subject");

  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubjects();
    fetchTopics();
    fetchGroups();
    fetchAssignments();
  }, []);

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    }
  }, [activeTab]);

  useEffect(() => {
    console.log("📋 Assignments from server:", assignments);
  }, [assignments]);

  const fetchSubjects = async () => {
    const response = await apiClient.request<{ subjects: Subject[] }>("/public/subjects", { 
      method: "GET" 
    });
    
    setSubjects(response.subjects || []);
  };

  const fetchTopics = async () => {
    try {
      const response = await apiClient.request<{ topics: Topic[] }>("/teacher/topics", { 
        method: "GET" 
      });
      setTopics(response.topics || []);
    } catch (err) {
      console.error("Помилка отримання тем через API:", err);
    }
  };

  const fetchGroups = async () => {
    const data = await apiClient.request<{ groups: Group[] }>("/public/groups", { 
      method: "GET" 
    });
    setGroups(data.groups || []);
  };

  const fetchAssignments = async () => {
    const data = await apiClient.request<{ assignments: Assignment[] }>("/assignments", { 
      method: "GET" 
    });
    setAssignments(data.assignments || []);
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const data = await apiClient.request<{ users: AdminUser[] }>("/admin/users", {
        method: "GET"
      });
      
      setUsers(data.users);
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : "Помилка завантаження користувачів");
    } finally {
      setUsersLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("http://localhost:5002/api/groups", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ name: newGroupName }),
    });

    if (res.ok) {
      setNewGroupName("");
      fetchGroups();
      alert("Групу успішно створено!");
    } else {
      alert("Помилка створення групи");
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !studentEmail) return;

    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`http://localhost:5002/api/groups/${selectedGroup}/students`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ email: studentEmail }),
    });

    const result = await res.json();
    if (res.ok) {
      alert("Студента додано до групи!");
      setStudentEmail("");
    } else {
      alert(result.error || "Помилка додавання студента");
    }
  };

  const handleRoleChange = async (userId: string, newRole: Role) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`http://localhost:5002/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) throw new Error("Не вдалося оновити роль");
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      alert("Роль успішно змінено!");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Помилка зміни ролі");
    }
  };

  const handleAssignTest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedGroup) return alert("Оберіть групу!");
    if (!assignSubjectId) return alert("Оберіть предмет!");
    if (assignmentType === "topic" && !assignTopicId) {
      return alert("Оберіть тему!");
    }

    const payload = {
      groupId: selectedGroup,
      subjectId: assignSubjectId,
      topicId: assignmentType === "topic" ? assignTopicId : null,
      dueDate: dueDate || null,
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("http://localhost:5002/api/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (res.ok) {
        alert("Тест успішно призначено групі!");
        setDueDate("");
        fetchAssignments();       
      } else {
        alert(result.error || "Помилка призначення");
        console.error(result);
      }
    } catch (err: any) {
      alert("Помилка з'єднання з сервером");
      console.error(err);
    }
  };

  return (
    <div className="admin-panel" style={{ padding: "24px" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "24px" }}>
        🛡️ Панель викладача / адміністратора
      </h1>
      
      <div className="tabs" style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
        <button onClick={() => setActiveTab("assignments")} className={activeTab === "assignments" ? "active" : ""}>
          Призначення тестів
        </button>
        <button onClick={() => setActiveTab("groups")} className={activeTab === "groups" ? "active" : ""}>
          Навчальні групи
        </button>
        <button onClick={() => setActiveTab("users")} className={activeTab === "users" ? "active" : ""}>
          Користувачі & Ролі
        </button>
        <button onClick={() => setActiveTab("questions")} className={activeTab === "questions" ? "active" : ""}>
          Питання
        </button>
        <button onClick={() => setActiveTab("analytics")} className={activeTab === "analytics" ? "active" : ""}>
          Статистика
        </button>
        <button onClick={() => setActiveTab("review")} className={activeTab === "review" ? "active" : ""}>
          Пере記ирка відповідей
        </button>
      </div>

      {activeTab === "assignments" && (
        <div className="td-form">
          <h2>Призначити тест групі</h2>
          <form onSubmit={handleAssignTest} style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "500px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px" }}>Група</label>
              <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} required style={{ width: "100%", padding: "8px" }}>
                <option value="">— Оберіть групу —</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ display: "block", marginBottom: "6px" }}>Тип призначення</label>
              <div style={{ display: "flex", gap: "15px" }}>
                <label>
                  <input type="radio" checked={assignmentType === "subject"} onChange={() => setAssignmentType("subject")} /> Весь предмет
                </label>
                <label>
                  <input type="radio" checked={assignmentType === "topic"} onChange={() => setAssignmentType("topic")} /> Конкретна тема
                </label>
              </div>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "6px" }}>Предмет</label>
              <select value={assignSubjectId} onChange={(e) => setAssignSubjectId(e.target.value)} required style={{ width: "100%", padding: "8px" }}>
                <option value="">— Оберіть предмет —</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {assignmentType === "topic" && (
              <div>
                <label style={{ display: "block", marginBottom: "6px" }}>Тема</label>
                <select value={assignTopicId} onChange={(e) => setAssignTopicId(e.target.value)} required style={{ width: "100%", padding: "8px" }}>
                  <option value="">— Оберіть тему —</option>
                  {topics
                    .filter(t => t.subject_id === assignSubjectId)
                    .map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
              </div>
            )}

            <div>
              <label style={{ display: "block", marginBottom: "6px" }}>Дедлайн (необов’язково)</label>
              <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ width: "100%", padding: "8px" }} />
            </div>

            <button type="submit" className="td-btn-submit" style={{ padding: "10px", cursor: "pointer" }}>Призначити тест</button>
          </form>

          <hr style={{ margin: "30px 0" }} />
          <h3>Активні призначення</h3>
          {assignments.length === 0 ? (
            <p>Ще немає призначених тестів.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {assignments.map(a => (
                <div key={a.id} style={{ padding: "12px", background: "#1f2937", color: "#fff", borderRadius: "8px" }}>
                  <strong>{a.group?.name}</strong> — {a.topic ? a.topic.name : a.subject?.name || "Весь предмет"}
                  {a.due_date && ( 
                    <span style={{ marginLeft: "10px", fontSize: "0.9rem", color: "#9ca3af" }}> 
                      до {a.due_date.replace("T", " ").substring(0, 16)} 
                    </span> 
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "groups" && (
        <div className="td-form">
          <h2>Керування навчальними групами</h2>
          <form onSubmit={handleCreateGroup} style={{ marginBottom: "24px", display: "flex", gap: "10px" }}>
            <input type="text" placeholder="Назва нової групи" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} style={{ padding: "8px" }} />
            <button type="submit">Створити групу</button>
          </form>

          <h2>Додати студента до групи</h2>
          <form onSubmit={handleAddStudent} style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "400px" }}>
            <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} required style={{ padding: "8px" }}>
              <option value="">— Оберіть групу —</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <input type="email" placeholder="Email студента" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} required style={{ padding: "8px" }} />
            <button type="submit">Додати в групу</button>
          </form>
        </div>
      )}

      {activeTab === "users" && (
        <div>
          <h2>Керування ролями користувачів</h2>
          {usersError && <div style={{ color: "red", marginBottom: "10px" }}>{usersError}</div>}
          {usersLoading ? (
            <div>Завантаження користувачів...</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "15px" }} border={1}>
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  <th style={{ padding: "10px" }}>Користувач</th>
                  <th style={{ padding: "10px" }}>Email</th>
                  <th style={{ padding: "10px" }}>Роль</th>
                  <th style={{ padding: "10px" }}>Дата реєстрації</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ textAlign: "center" }}>
                    <td style={{ padding: "10px" }}>{u.username}</td>
                    <td style={{ padding: "10px" }}>{u.email}</td>
                    <td style={{ padding: "10px" }}>
                      <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value as Role)} style={{ padding: "4px" }}>
                        <option value="student">student</option>
                        <option value="teacher">teacher</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td style={{ padding: "10px" }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

    </div>
  );
}
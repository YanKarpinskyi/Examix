import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import { apiClient } from '../services/apiClient';
import './Dashboard.scss';

interface Subject {
  id: string;
  name: string;
  description: string;
}

interface AssignedTest {
  id: string;
  due_date: string | null;
  subject: { id: string; name: string } | null;
  topic: { id: string; name: string } | null;
  group: { name: string } | null;
}

const formatDateTime = (dateString: string | null | undefined) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleString('uk-UA', {
    timeZone: 'Europe/Kyiv',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<AssignedTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [myGroups, setMyGroups] = useState<any[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      if (!user?.id) return;

      try {
        setLoading(true);

        const data = await apiClient.request<{
          groups: any[];
          subjects: Subject[];
          assignments: AssignedTest[];
        }>("/student/dashboard");

        setMyGroups(data.groups || []);
        setSubjects(data.subjects || []);
        setAssignments(data.assignments || []);

      } catch (err: any) {
        console.error("Помилка ініціалізації дашборду:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [user?.id]);

  return (
    <div className="dashboard-page">
      <header className="dashboard-header" style={{ marginBottom: '30px' }}>
        <div className="user-info">
          <h1>З поверненням, {user?.username || 'Студенте'}!</h1>
          <p>Твій шлях до успішного складання НМТ продовжується тут.</p>
          <div 
            style={{ 
              marginTop: "10px", 
              padding: "6px 12px", 
              background: "#e0f2fe", 
              color: "#0369a1", 
              borderRadius: "20px", 
              display: "inline-block", 
              fontSize: "0.85rem", 
              fontWeight: "bold" 
            }}
          >
            {myGroups.length > 0 
              ? `Група: ${myGroups.map(g => g.name).join(', ')}` 
              : "Ви ще не приєднані до жодної групи"}
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <LoadingSpinner />
            <p>Завантажуємо дані вашого кабінету...</p>
          </div>
        ) : (
          <>
            <section className="assignments-section" style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "16px" }}>
                🎯 Призначені тести від викладачів
              </h2>
              {assignments.length === 0 ? (
                <p style={{ color: "#6b7280", fontStyle: "italic" }}>
                  Наразі у вас немає обов'язкових чи призначених тестів.
                </p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                  {assignments.map((a) => (
                    <div key={a.id} className="subject-card" style={{ border: "2px solid #3b82f6", cursor: "default" }}>
                      <div className="subject-icon">📝</div>
                      <h3 style={{ marginTop: "10px" }}>{a.topic?.name || a.subject?.name || "Тест"}</h3>
                      <p style={{ fontSize: "0.9rem", color: "#4b5563" }}>Група: {a.group?.name}</p>
                      <p style={{ fontSize: "0.85rem", marginTop: "6px", fontWeight: "500" }}>
                        {a.due_date ? (
                          <span style={{color: "#ef4444"}}>Дедлайн: {formatDateTime(a.due_date)}</span>
                        ) : (
                          <span style={{ color: "#3b82f6", fontStyle: "italic" }}>без дедлайну</span>
                        )}
                      </p>
                      <button 
                        className="select-subject-btn" 
                        style={{ marginTop: "12px", width: "100%" }} 
                        onClick={() => {
                          if (a.topic?.id) {
                            navigate(`/topic/${a.topic.id}/quiz?assignmentId=${a.id}`);
                          } else if (a.subject?.id) {
                            navigate(`/quiz/nmt/${a.subject.id}?assignmentId=${a.id}`);
                          }
                        }}
                      >
                        Почати виконання
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="subjects-section">
              <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "16px" }}>
                📚 Самостійна підготовка (за предметами)
              </h2>
              <div className="subjects-grid">
                {subjects.map((subject) => (
                  <div key={subject.id} className="subject-card" onClick={() => navigate(`/subject/${subject.id}`)}>
                    <div className="subject-icon">📚</div>
                    <h3>{subject.name}</h3>
                    <p>{subject.description}</p>
                    <button className="select-subject-btn">Переглянути теми</button>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
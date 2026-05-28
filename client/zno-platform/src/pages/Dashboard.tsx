import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
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
  const { isDark } = useTheme();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<AssignedTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [myGroups, setMyGroups] = useState<any[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      if (!user?.id) return;
      try {
        setLoading(true);
        const data = await apiClient.request<{ groups: any[]; subjects: Subject[]; assignments: AssignedTest[]; }>("/student/dashboard");
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
    <div className={`dashboard-page${isDark ? " dark" : ""}`}>
      <header className="dashboard-header">
        <div className="user-info">
          <h1>З поверненням, {user?.username || 'Студенте'}!</h1>
          <p className="welcome-text">Твій шлях до успішного складання НМТ продовжується тут.</p>
          <div className="group-badge">
            {myGroups.length > 0 
              ? `Група: ${myGroups.map(g => g.name).join(', ')}` 
              : "Ви ще не приєднані до жодної групи"}
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {loading ? (
          <div className="dashboard-loading">
            <LoadingSpinner />
            <p>Завантажуємо дані вашого кабінету...</p>
          </div>
        ) : (
          <>
            <section className="assignments-section">
              <h2 className="section-title">🎯 Призначені тести від викладачів</h2>
              {assignments.length === 0 ? (
                <p className="no-assignments">
                  Наразі у вас немає обов'язкових чи призначених тестів.
                </p>
              ) : (
                <div className="assignments-grid">
                  {assignments.map((a) => (
                    <div key={a.id} className="subject-card assigned-card">
                      <div className="subject-icon">📝</div>
                      <h3>{a.topic?.name || a.subject?.name || "Тест"}</h3>
                      <p className="group-info">Група: {a.group?.name}</p>
                      <p className="deadline-info">
                        {a.due_date ? (
                          <span className="has-deadline">Дедлайн: {formatDateTime(a.due_date)}</span>
                        ) : (
                          <span className="no-deadline">без дедлайну</span>
                        )}
                      </p>
                      <button 
                        className="select-subject-btn" 
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
              <h2 className="section-title">📚 Самостійна підготовка (за предметами)</h2>
              <div className="subjects-grid">
                {subjects.map((subject) => (
                  <div key={subject.id} className="subject-card" onClick={() => navigate(`/subject/${subject.id}`)}>
                    <div className="subject-icon">📚</div>
                    <h3>{subject.name}</h3>
                    <p className="subject-desc">{subject.description}</p>
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
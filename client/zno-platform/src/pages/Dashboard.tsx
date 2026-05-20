import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';
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

        const { data: studentGroups, error: groupError } = await supabase
          .from("group_students")
          .select(`
            group:group_id (
              id,
              name
            )
          `)
          .eq("student_id", user.id);

        if (!groupError && studentGroups) {
          setMyGroups(studentGroups.map((g: any) => g.group).filter(Boolean));
        } else if (groupError) {
          console.error("Помилка завантаження груп студента:", groupError.message);
        }

        const { data: subjectsData, error: subError } = await supabase
          .from('subjects')
          .select('*');
        if (subError) throw subError;
        setSubjects(subjectsData || []);

        const { data: assignData, error: assignError } = await supabase
          .from("group_assignments")
          .select(`
            id,
            due_date,
            subject:subject_id (id, name),
            topic:topic_id (id, name),
            group:groups!inner (
              name,
              group_students!inner (student_id)
            )
          `)
          .eq("group.group_students.student_id", user.id);

        if (!assignError && assignData) {
          setAssignments(assignData as any[]);
        } else if (assignError) {
          console.error("Помилка завантаження призначень:", assignError.message);
        }
      } catch (err) {
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
            {/* СЕКЦІЯ ПРИЗНАЧЕНИХ ТЕСТІВ ВІД ВИКЛАДАЧА */}
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
                      {a.due_date && (
                        <p style={{ fontSize: "0.85rem", color: "#ef4444", fontWeight: "500" }}>
                          Дедлайн: {new Date(a.due_date).toLocaleString()}
                        </p>
                      )}
                      <button 
                        className="select-subject-btn" 
                        style={{ marginTop: "12px", width: "100%" }} 
                        onClick={() => {
                          if (a.topic?.id) {
                            navigate(`/topic/${a.topic.id}/quiz`);
                          } else if (a.subject?.id) {
                            navigate(`/subject/${a.subject.id}`);
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

            {/* СЕКЦІЯ ЗАГАЛЬНИХ ПРЕДМЕТІВ */}
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
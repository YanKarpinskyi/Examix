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

function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuth(); // Залишаємо user, щоб знати, як звати студента
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSubjects() {
            try {
                const { data, error } = await supabase
                    .from('subjects')
                    .select('*');

                if (error) {
                    console.error("Supabase error:", error.message);
                    return;
                }
                setSubjects(data || []);
            } catch (err) {
                console.error("Помилка завантаження предметів:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchSubjects();
    }, []);

    return (
        <div className="dashboard-page">
            {/* Оновлений заголовок без кнопки Вийти */}
            <header className="dashboard-header" style={{ marginBottom: '30px' }}>
                <div className="user-info">
                    <h1>З поверненням, {user?.username || 'Студенте'}!</h1>
                    <p>Твій шлях до успішного складання НМТ продовжується тут.</p>
                </div>
            </header>

            <main className="subjects-container">
                {loading ? (
                    <div style={{ textAlign: 'center', marginTop: '50px' }}>
                        <LoadingSpinner />
                        <p>Завантажуємо предмети...</p>
                    </div>
                ) : (
                    <div className="subjects-grid">
                        {subjects.map((subject) => (
                            <div 
                                key={subject.id} 
                                className="subject-card" 
                                onClick={() => navigate(`/subject/${subject.id}`)}
                            >
                                <div className="subject-icon">📚</div>
                                <h3>{subject.name}</h3>
                                <p>{subject.description}</p>
                                <button className="select-subject-btn">Почати тест</button>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

export default Dashboard;
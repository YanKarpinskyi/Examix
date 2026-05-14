import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';
import "./QuizResultPage.scss";

export default function QuizResultPage() {
    const { attemptId } = useParams();
    const navigate = useNavigate();
    const [attemptData, setAttemptData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAttempt() {
            setLoading(true);
            
            // 1. Отримуємо дані спроби та назву теми (якщо вона є)
            const { data: attempt, error: attemptError } = await supabase
                .from('test_attempts')
                .select(`
                    *,
                    topics (name)
                `)
                .eq('id', attemptId)
                .single();

            if (attemptError || !attempt) {
                console.error("Error fetching attempt:", attemptError);
                setLoading(false);
                return;
            }

            // 2. Отримуємо питання. 
            // Ключова зміна: ми беремо питання за списком ID з відповідей користувача, 
            // щоб це працювало і для НМТ (де різні теми), і для звичайного тесту.
            const questionIds = Object.keys(attempt.answers);

            const { data: questions, error: questionsError } = await supabase
                .from('questions')
                .select('id, content, correct_answer, options, type')
                .in('id', questionIds);

            if (questionsError) {
                console.error("Error fetching questions:", questionsError);
                setAttemptData(attempt);
            } else {
                // Сортуємо питання у тому ж порядку, в якому вони були в тесті (за ID з відповідей)
                const sortedQuestions = questions.sort((a, b) => 
                    questionIds.indexOf(a.id) - questionIds.indexOf(b.id)
                );
                setAttemptData({ ...attempt, questions: sortedQuestions });
            }
            
            setLoading(false);
        }
        fetchAttempt();
    }, [attemptId]);

    if (loading) return <LoadingSpinner />;
    if (!attemptData) return <div className="error-msg">Спробу не знайдено.</div>;

    const percentage = Math.round((attemptData.score / attemptData.total_questions) * 100);

    const renderAnswer = (ans: any) => {
        if (ans === undefined || ans === null || ans === "") return "Немає відповіді";

        // Якщо прийшов рядок, який схожий на JSON об'єкт (буває при імпорті з CSV)
        let parsedAns = ans;
        if (typeof ans === 'string' && ans.startsWith('{')) {
            try {
                parsedAns = JSON.parse(ans);
            } catch (e) {
                parsedAns = ans;
            }
        }

        if (Array.isArray(parsedAns)) return parsedAns.join(', ');

        if (typeof parsedAns === 'object') {
            return Object.entries(parsedAns)
                .map(([key, val]) => {
                    // Виправляємо NaN: перевіряємо чи ключ є числом
                    const isNumericKey = !isNaN(Number(key));
                    const displayKey = isNumericKey ? Number(key) + 1 : key;
                    return `${displayKey}—${val}`;
                })
                .join(', ');
        }

        return String(parsedAns);
    };

    return (
        <div className="result-page">
            <div className="result-card">
                <h1>
                    {attemptData.topics?.name ? `Результати: ${attemptData.topics.name}` : 'Результати НМТ симуляції'}
                </h1>

                <div className="score-container">
                    <div className="score-circle">
                        <span className="score-num">{attemptData.score}/{attemptData.total_questions}</span>
                    </div>
                    <p className="percentage-text">Успішність: {percentage}%</p>
                </div>

                <div className="review-section">
                    <h3>Детальний розгляд питань:</h3>
                    {attemptData.questions?.map((q: any) => {
                        // УСЯ ЛОГІКА МАЄ БУТИ ВСЕРЕДИНІ ЦЬОГО БЛОКУ
                        const userAns = attemptData.answers[q.id];
                        const correctAns = q.correct_answer;

                        const checkIsCorrect = () => {
                            if (!userAns) return false;
                            
                            // Нормалізація для порівняння рядків
                            const normalize = (val: any) => String(val).trim().toLowerCase();
                            
                            if (typeof userAns === 'object' || typeof correctAns === 'object' || (typeof correctAns === 'string' && correctAns.startsWith('{'))) {
                                // Для складних типів (matching) порівнюємо рядкові представлення
                                // Попередньо парсимо, якщо це JSON-рядок
                                const s1 = typeof userAns === 'string' ? userAns : JSON.stringify(userAns);
                                const s2 = typeof correctAns === 'string' ? correctAns : JSON.stringify(correctAns);
                                return s1 === s2;
                            }
                            
                            return normalize(userAns) === normalize(correctAns);
                        };

                        const isCorrect = checkIsCorrect();

                        return (
                            <div key={q.id} className={`review-item ${isCorrect ? 'correct' : 'incorrect'}`}>
                                <p><strong>Питання:</strong> {q.content}</p>
                                <div className="ans-details">
                                    <p className="user-ans">
                                        <strong>Ваша відповідь:</strong> {renderAnswer(userAns)}
                                    </p>
                                    {!isCorrect && (
                                        <p className="correct-ans">
                                            <strong>Правильна відповідь:</strong> {renderAnswer(correctAns)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <button className="dashboard-btn" onClick={() => navigate('/dashboard')}>
                    До кабінету
                </button>
            </div>
        </div>
    );
}
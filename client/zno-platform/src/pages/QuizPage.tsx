import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import QuestionRenderer from '../components/QuestionRenderer';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSpinner from '../components/LoadingSpinner';
import './QuizPage.scss';
import 'katex/dist/katex.min.css';

interface QuizPageProps {
    mode?: 'default' | 'nmt';
}

export default function QuizPage({ mode = 'default' }: QuizPageProps) {
    const { topicId, subjectId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const isErrorMode = searchParams.get('mode') === 'errors';
    const urlTime = Number(searchParams.get('time')) || 0;
    
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [unansweredCount, setUnansweredCount] = useState(0);
    const [timeLeft, setTimeLeft] = useState(mode === 'nmt' ? 3600 : urlTime * 60);

    const NMT_CONFIGS: Record<string, any> = {
    // Назва ключа має збігатися з назвою предмета в БД або його ID
    'Історія України': {
        single: 20,
        matching: 4,
        sequence: 3,
        multiple: 3,
    },
    'Українська мова': {
        matching: 5,
        single: 25,
    },
    'Математика': {
        single: 15,
        matching: 3,
        short: 4,
    },
    'default': {
        single: 30
    }
    };

    useEffect(() => {
    const fetchQuestions = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        try {
        if (mode === 'nmt') {
            // 1. Отримуємо назву предмета та всі його теми
            const { data: subjectData } = await supabase
            .from('subjects')
            .select('name')
            .eq('id', subjectId)
            .single();

            const { data: topics } = await supabase
            .from('topics')
            .select('id')
            .eq('subject_id', subjectId);

            const topicIds = topics?.map(t => t.id) || [];
            const subjectName = subjectData?.name.trim() || 'default';

            const { data: allQuestions, error } = await supabase
            .from('questions')
            .select('*')
            .in('topic_id', topicIds);

            if (error) throw error;

            console.log("Subject Name:", subjectName)

            // 3. Фільтрація за типами згідно з конфігурацією
            const config = NMT_CONFIGS[subjectName] || NMT_CONFIGS['default'];
            let finalPool: any[] = [];

            Object.keys(config).forEach(type => {
            const countNeeded = config[type];
            
            // Вибираємо питання потрібного типу, перемішуємо їх
            const typeQuestions = allQuestions
                ?.filter(q => q.type === type)
                .sort(() => Math.random() - 0.5)
                .slice(0, countNeeded);

            if (typeQuestions) {
                finalPool = [...finalPool, ...typeQuestions];
            }
            });

            // Сортуємо фінальний тест: спочатку всі single, потім matching і т.д. 
            // (Або можна ще раз перемішати все разом)
            setQuestions(finalPool);

        } else if (isErrorMode) {
            // Ваша існуюча логіка для роботи над помилками
            const { data } = await supabase
            .from('user_errors')
            .select(`question_id, questions (*)`)
            .eq('user_id', user.id)
            .eq('topic_id', topicId);
            
            setQuestions(data?.map(item => item.questions) || []);

        } else {
            // Звичайний тест по темі
            const { data } = await supabase
            .from('questions')
            .select('*')
            .eq('topic_id', topicId)
            .limit(12);
            
            setQuestions(data || []);
        }
        } catch (err) {
        console.error("Fetch error:", err);
        } finally {
        setLoading(false);
        }
    };

    fetchQuestions();
    }, [topicId, subjectId, isErrorMode, mode]);

    useEffect(() => {
        if (loading) return;
        if (timeLeft === 0) return; 
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    processFinish();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [loading]);

    const handleAnswer = (questionId: string, answer: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
    };

    const handleFinish = () => {
        const unanswered = questions.filter(q => !answers[q.id]);
        if (unanswered.length > 0) {
            setUnansweredCount(unanswered.length);
            setIsModalOpen(true);
            return;
        }
        processFinish();
    };

    const processFinish = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const isCorrect = (question: any) => {
                const uAns = answers[question.id];
                const cAns = question.correct_answer;
                if (uAns === undefined || uAns === null) return false;
                return JSON.stringify(uAns) === JSON.stringify(cAns);
            };

            const correctQuestions = questions.filter(q => isCorrect(q));
            const wrongQuestions = questions.filter(q => !isCorrect(q));

            const { data: attempt, error: attemptError } = await supabase
                .from('test_attempts')
                .insert({
                    user_id: user.id,
                    topic_id: mode === 'nmt' ? null : topicId, // null для НМТ
                    subject_id: subjectId,                     // тепер ми знаємо предмет
                    mode: mode,
                    score: correctQuestions.length,
                    total_questions: questions.length,
                    answers: answers,
                })
                .select()
                .single();

            if (attemptError) {
                console.error("Error saving attempt:", attemptError.message);
                return;
            }

            if (isErrorMode && correctQuestions.length > 0) {
                const correctIds = correctQuestions.map(q => q.id);
                await supabase.from('user_errors').delete().in('question_id', correctIds);
            }

            if (!isErrorMode && mode !== 'nmt' && wrongQuestions.length > 0) {
                const errorsToSave = wrongQuestions.map(q => ({
                    user_id: user.id,
                    question_id: q.id,
                    topic_id: topicId
                }));
                await supabase.from('user_errors').upsert(errorsToSave);
            }

            setIsModalOpen(false);
            if (attempt) navigate(`/quiz-result/${attempt.id}`);
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <LoadingSpinner />;

    if (!loading && questions.length === 0) {
        return (
            <div className="quiz-container error-state">
                <header className="quiz-header">
                    <button className="back-btn" onClick={() => navigate(-1)}>← Назад</button>
                </header>
                <div className="error-content">
                    <h2>Тест поки порожній</h2>
                    <p>Для цього режиму ще не додано жодного питання.</p>
                </div>
            </div>
        );
    }

    const currentQ = questions[currentIndex];

    return (
        <div className="quiz-container">
            <header className="quiz-header">
                <button className="back-btn" onClick={() => navigate(-1)}>← Залишити</button>
                <div className="progress-info">
                    <span className="q-counter">
                        {mode === 'nmt' ? 'НМТ-режим: ' : isErrorMode ? '📌 Помилки: ' : ''}
                        Питання {currentIndex + 1} з {questions.length}
                    </span>
                    <div className="bar-bg">
                        <div className="bar-fill" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}></div>
                    </div>
                </div>
                {(timeLeft > 0 || mode === 'nmt') && (
                    <div className={`timer ${timeLeft < 300 ? 'critical' : ''}`}>
                        ⏱️ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </div>
                )}
            </header>

            <main className="question-card">
                {currentQ.image_url && <img src={currentQ.image_url} alt="Завдання" className="q-image" />}
                <QuestionRenderer 
                    question={currentQ} 
                    onAnswer={(val: any) => handleAnswer(currentQ.id, val)} 
                    savedAnswer={answers[currentQ.id]} 
                    showResult={false} 
                />
            </main>

            <footer className="quiz-footer">
                <button className="nav-btn" disabled={currentIndex === 0} onClick={() => setCurrentIndex(i => i - 1)}>
                    Назад
                </button>
                <button className="nav-btn next" onClick={() => {
                    if (currentIndex < questions.length - 1) {
                        setCurrentIndex(i => i + 1);
                    } else {
                        handleFinish();
                    }
                }}>
                    {currentIndex === questions.length - 1 ? 'Завершити' : 'Далі'}
                </button>
            </footer>

            <ConfirmModal 
                isOpen={isModalOpen} 
                title="Не всі питання заповнені" 
                message={`Ви пропустили ${unansweredCount} питань. Все одно завершити?`} 
                // Кнопка "Повернутися" (onConfirm в модалці)
                onConfirm={() => setIsModalOpen(false)} 
                // Кнопка "Завершити зараз" (onCancel в модалці)
                onCancel={processFinish} 
            />
        </div>
    );
}